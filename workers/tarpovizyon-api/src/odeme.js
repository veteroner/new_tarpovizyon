/**
 * Ödeme uçları — abonelik başlatma, sonuç doğrulama, webhook.
 *
 * ─── GÜVENİLİR KAYNAK KİM ───────────────────────────────────────────────────
 * Abonelik yalnız İKİ yoldan aktifleşiyor: iyzico'ya sorulan sonuç
 * (`sonucSorgula`) ve imzası doğrulanmış webhook. Kullanıcının tarayıcısından
 * gelen hiçbir şey — callback parametreleri dahil — abonelik açmıyor.
 *
 * Sebep somut: callback adresi kullanıcının tarayıcısında açılıyor, yani
 * herkes elle çağırabilir. "başarılı=1" parametresine güvenen bir akış,
 * adresi bir kez gören herkese bedava abonelik verirdi.
 *
 * ─── AYNI BİLDİRİM İKİ KEZ GELEBİLİR ────────────────────────────────────────
 * iyzico webhook'u yeniden gönderiyor (yanıt gecikirse ya da 2xx dönmezse).
 * `odeme` tablosu bunu emiyor: her olay `iyzi_referans` ile bir kez
 * kaydediliyor, ikinci gelişte işlenmeden 200 dönülüyor. 200 dönmek şart —
 * hata dönersek iyzico saatlerce tekrar dener.
 */

import { abonelikBaslat, sonucSorgula, webhookImzasiGecerli, canliMi } from './iyzico.js';
import { oturumCoz } from './auth.js';

const simdi = () => Math.floor(Date.now() / 1000);

export async function semaHazirla(env) {
  const db = env.DB;
  /*
   * `abonelik.plan` sonradan eklendi: yenileme bildirimi geldiğinde kaç gün
   * ekleneceği plana bağlı ve webhook plan bilgisi taşımıyor. Plan
   * saklanmasaydı yıllık abonelikte yenileme 30 gün eklerdi — yani yılda bir
   * ödeyen kullanıcının erişimi bir ay sonra kesilirdi.
   * `ALTER TABLE` hatası yutuluyor çünkü sütun ikinci çalıştırmada zaten var.
   */
  await db.prepare('ALTER TABLE abonelik ADD COLUMN plan TEXT').run().catch(() => {});
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS odeme (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_id TEXT,
      iyzi_referans TEXT UNIQUE,
      abonelik_referans TEXT,
      musteri_referans TEXT,
      olay TEXT,
      durum TEXT NOT NULL,
      tutar TEXT,
      ham TEXT,
      olusma INTEGER NOT NULL
    )`),
    /* Başlatılan ama henüz tamamlanmamış ödemeler. Token → kullanıcı
       eşlemesi burada tutuluyor: iyzico sonucu token ile dönüyor ve o
       tokenin KİME ait olduğunu yalnız biz biliyoruz. */
    db.prepare(`CREATE TABLE IF NOT EXISTS odeme_oturumu (
      token TEXT PRIMARY KEY,
      kullanici_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      olusma INTEGER NOT NULL
    )`),
  ]);
}

/** Ayar tablosundan tek değer. */
async function ayar(env, anahtar) {
  const r = await env.DB.prepare('SELECT deger FROM ayar WHERE anahtar = ?')
    .bind(anahtar).first().catch(() => null);
  return r?.deger ?? null;
}

/**
 * POST odeme/baslat — { plan: 'aylik'|'yillik', ad, soyad, gsm, adres, sehir, tckn }
 *
 * Oturum ZORUNLU: aboneliğin kime yazılacağı jetondan geliyor, gövdeden değil.
 * Gövdeden kullanıcı kimliği almak, başkasının hesabına abonelik açmaya
 * (ya da başkasının kartıyla kendine açmaya) kapı olurdu.
 */
export async function handleOdemeBaslat(request, env) {
  const oturum = await oturumCoz(request, env);
  if (!oturum) return { status: 401, body: { hata: 'giris_gerekli' } };

  const g = await request.json().catch(() => ({}));
  const plan = g.plan === 'yillik' ? 'yillik' : 'aylik';

  const planKodu = await ayar(env, plan === 'yillik' ? 'iyzico_plan_yillik' : 'iyzico_plan_aylik');
  if (!planKodu) {
    return { status: 503, body: { hata: 'plan_tanimsiz', plan } };
  }

  await semaHazirla(env);

  /*
   * iyzico fatura alanlarını ZORUNLU tutuyor. Boş gönderirsek istek
   * reddediliyor ve hata mesajı hangi alanın eksik olduğunu net söylemiyor;
   * o yüzden eksikler burada, kullanıcıya anlaşılır biçimde bildiriliyor.
   */
  const gerekli = ['ad', 'soyad', 'gsm', 'adres', 'sehir'];
  const eksik = gerekli.filter((a) => !String(g[a] ?? '').trim());
  if (eksik.length) return { status: 400, body: { hata: 'eksik_alan', alanlar: eksik } };

  const istek = {
    locale: 'tr',
    conversationId: oturum.kullaniciId,
    callbackUrl: g.callbackUrl || `${new URL(request.url).origin}/api/odeme/donus`,
    pricingPlanReferenceCode: planKodu,
    subscriptionInitialStatus: 'ACTIVE',
    customer: {
      name: String(g.ad).trim(),
      surname: String(g.soyad).trim(),
      email: oturum.eposta,
      gsmNumber: String(g.gsm).trim(),
      identityNumber: String(g.tckn ?? '11111111111').trim(),
      billingAddress: {
        contactName: `${String(g.ad).trim()} ${String(g.soyad).trim()}`,
        city: String(g.sehir).trim(),
        country: 'Turkey',
        address: String(g.adres).trim(),
      },
      shippingAddress: {
        contactName: `${String(g.ad).trim()} ${String(g.soyad).trim()}`,
        city: String(g.sehir).trim(),
        country: 'Turkey',
        address: String(g.adres).trim(),
      },
    },
  };

  const s = await abonelikBaslat(env, istek);
  if (!s.ok) {
    console.error('iyzico başlatma', s.hata, s.kod, s.mesaj);
    return { status: 502, body: { hata: s.hata, kod: s.kod ?? null, mesaj: s.mesaj ?? null } };
  }

  const token = s.veri?.data?.token ?? s.veri?.token;
  if (!token) return { status: 502, body: { hata: 'token_yok' } };

  await env.DB.prepare(
    `INSERT INTO odeme_oturumu (token, kullanici_id, plan, olusma) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET kullanici_id = excluded.kullanici_id`,
  ).bind(token, oturum.kullaniciId, plan, simdi()).run();

  return {
    status: 200,
    body: {
      token,
      /* Formun kendisi iyzico'dan geliyor; biz kart alanı çizmiyoruz — kart
         verisi hiçbir zaman bizim sunucumuza uğramıyor (PCI kapsamı dışı). */
      checkoutFormContent: s.veri?.data?.checkoutFormContent ?? s.veri?.checkoutFormContent ?? null,
      sandbox: !canliMi(env),
    },
  };
}

/**
 * POST odeme/dogrula — { token }
 * Kullanıcı formdan döndüğünde çağrılıyor; sonucu İYZİCO'YA soruyor.
 */
export async function handleOdemeDogrula(request, env) {
  const oturum = await oturumCoz(request, env);
  if (!oturum) return { status: 401, body: { hata: 'giris_gerekli' } };

  const { token } = await request.json().catch(() => ({}));
  if (!token) return { status: 400, body: { hata: 'token_yok' } };

  await semaHazirla(env);
  const sahip = await env.DB.prepare(
    'SELECT kullanici_id, plan FROM odeme_oturumu WHERE token = ?').bind(token).first();

  /* Token BAŞKASININ olabilir: kendi jetonuyla girip başkasının tokenini
     doğrulatmaya çalışan biri, onun aboneliğini kendine yazdıramamalı. */
  if (!sahip || sahip.kullanici_id !== oturum.kullaniciId) {
    return { status: 403, body: { hata: 'token_size_ait_degil' } };
  }

  const s = await sonucSorgula(env, token);
  if (!s.ok) return { status: 502, body: { hata: s.hata, mesaj: s.mesaj ?? null } };

  const d = s.veri?.data ?? s.veri ?? {};
  const durum = String(d.subscriptionStatus ?? d.status ?? '').toUpperCase();
  const basarili = durum === 'ACTIVE' || durum === 'SUCCESS';

  if (basarili) {
    await abonelikAktiflestir(env, oturum.kullaniciId, sahip.plan, d.referenceCode ?? null);
  }

  return { status: 200, body: { basarili, durum, plan: sahip.plan } };
}

/**
 * Aboneliği aktifleştirir / uzatır.
 *
 * Uzatma MEVCUT BİTİŞTEN başlıyor: deneme süresi dolmadan ödeyen kullanıcı
 * kalan günlerini kaybetmemeli.
 */
async function abonelikAktiflestir(env, kullaniciId, plan, referans) {
  const t = simdi();
  const gun = plan === 'yillik' ? 365 : 30;
  const mevcut = await env.DB.prepare(
    'SELECT bitis FROM abonelik WHERE kullanici_id = ?').bind(kullaniciId).first();
  const taban = mevcut?.bitis && Number(mevcut.bitis) > t ? Number(mevcut.bitis) : t;

  await env.DB.prepare(
    `INSERT INTO abonelik (kullanici_id, durum, baslangic, bitis, saglayici, saglayici_ref, plan, guncelleme)
     VALUES (?, 'aktif', ?, ?, 'iyzico', ?, ?, ?)
     ON CONFLICT(kullanici_id) DO UPDATE SET
       durum = 'aktif', bitis = excluded.bitis,
       saglayici = 'iyzico', saglayici_ref = COALESCE(excluded.saglayici_ref, abonelik.saglayici_ref),
       plan = excluded.plan, guncelleme = excluded.guncelleme`,
  ).bind(kullaniciId, t, taban + gun * 86400, referans, plan, t).run();
}

/**
 * POST odeme/webhook — iyzico bildirimi.
 *
 * İmza doğrulanmadan HİÇBİR ŞEY yapılmıyor. Yanıt her durumda 200: iyzico
 * 2xx almazsa saatlerce tekrar dener ve bizim tarafımızdaki bir hata,
 * kuyruğu tıkayan bir tekrar fırtınasına dönüşür. Reddedilen bildirim
 * loglanıyor ama 200 dönüyor.
 */
export async function handleOdemeWebhook(request, env) {
  const ham = await request.text();
  let govde;
  try { govde = JSON.parse(ham); } catch { govde = null; }
  if (!govde) return { status: 200, body: { alindi: false, sebep: 'gecersiz_govde' } };

  const imza = request.headers.get('X-IYZ-SIGNATURE-V3');
  if (!await webhookImzasiGecerli(env, govde, imza)) {
    console.error('webhook imzası geçersiz', govde?.iyziEventType);
    return { status: 200, body: { alindi: false, sebep: 'imza_gecersiz' } };
  }

  await semaHazirla(env);
  const referans = String(govde.iyziReferenceCode ?? `${govde.subscriptionReferenceCode}-${govde.iyziEventTime}`);

  /* Idempotency: aynı referans ikinci kez gelirse hiçbir şey yapılmıyor. */
  const varMi = await env.DB.prepare(
    'SELECT 1 FROM odeme WHERE iyzi_referans = ?').bind(referans).first();
  if (varMi) return { status: 200, body: { alindi: true, tekrar: true } };

  const olay = String(govde.iyziEventType ?? '');
  const basarili = olay === 'subscription.order.success';

  /*
   * Kullanıcı, ödeme oturumundaki abonelik referansından bulunuyor. Webhook
   * e-posta taşımıyor ve taşısaydı bile ona göre eşleştirmek yanlış olurdu:
   * e-posta değiştirilebilir bir alan, referans değil.
   */
  const eslesme = await env.DB.prepare(
    'SELECT kullanici_id FROM abonelik WHERE saglayici_ref = ?',
  ).bind(String(govde.subscriptionReferenceCode ?? '')).first().catch(() => null);

  await env.DB.prepare(
    `INSERT INTO odeme (kullanici_id, iyzi_referans, abonelik_referans, musteri_referans, olay, durum, ham, olusma)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    eslesme?.kullanici_id ?? null, referans,
    String(govde.subscriptionReferenceCode ?? ''), String(govde.customerReferenceCode ?? ''),
    olay, basarili ? 'basarili' : 'basarisiz', ham.slice(0, 2000), simdi(),
  ).run();

  if (basarili && eslesme?.kullanici_id) {
    const ab = await env.DB.prepare(
      'SELECT saglayici_ref, plan FROM abonelik WHERE kullanici_id = ?').bind(eslesme.kullanici_id).first();
    /* Plan İLK ödemede kaydedildi; yenileme bildirimi plan taşımıyor. Buradan
       okumak yerine sabit 30 gün eklemek, yıllık abonenin erişimini bir ay
       sonra keserdi. */
    await abonelikAktiflestir(
      env, eslesme.kullanici_id, ab?.plan === 'yillik' ? 'yillik' : 'aylik',
      ab?.saglayici_ref ?? null,
    );
  }

  return { status: 200, body: { alindi: true } };
}
