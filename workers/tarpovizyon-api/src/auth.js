/**
 * Kimlik — e-posta + tek kullanımlık kod.
 *
 * ─── NEDEN ŞİFRESİZ ─────────────────────────────────────────────────────────
 * Şifre saklamak, sıfırlama akışı kurmak ve sızıntı riskini taşımak bu ürün
 * için gereksiz bir yük: kullanıcı zaten ayda bir giriyor. Tek kullanımlık kod
 * hem o yükü kaldırıyor hem de "şifremi unuttum" akışını gereksizleştiriyor —
 * her giriş zaten aynı akış.
 *
 * ─── NE HAM SAKLANMIYOR ─────────────────────────────────────────────────────
 * Ne giriş kodu ne oturum jetonu veritabanında ham duruyor; ikisi de SHA-256
 * özetiyle saklanıyor. Gerekçe somut: D1'in içeriği bir yedekten, bir hata
 * kaydından ya da yanlış yapılandırılmış bir uçtan sızarsa, ham jeton demek
 * doğrudan oturum ele geçirmek demektir. Özet sızarsa saldırganın elinde
 * kullanılamayan bir dizi kalır.
 *
 * ─── KOD NEDEN 6 HANE VE 10 DAKİKA ──────────────────────────────────────────
 * 6 hane = 1.000.000 olasılık. Deneme sınırı 5 olduğu için kaba kuvvetle
 * tutturma olasılığı 5/1.000.000; kod ömrü 10 dakika olduğu için o beş deneme
 * de dar bir pencerede sıkışıyor. Sınırsız denemede 6 hane yetmezdi — koruma
 * hane sayısında değil, deneme sayacında.
 *
 * ─── OTURUM: ÇEREZ DEĞİL JETON ──────────────────────────────────────────────
 * Bearer jeton kullanılıyor, HttpOnly çerez değil. Sebep Capacitor: mobil
 * uygulama `capacitor://localhost` kaynağından çalışıyor ve API başka bir
 * alan adında; üçüncü taraf çerezleri iOS'ta varsayılan olarak engelli. Aynı
 * kodun hem webde hem uygulamada çalışması için jeton tek seçenek.
 *
 * ─── E-POSTA ────────────────────────────────────────────────────────────────
 * `RESEND_KEY` secret'ı gerekiyor (`wrangler secret put RESEND_KEY`). Anahtar
 * yoksa uç 503 dönüyor ve kod ÜRETİLMİYOR — yarım kurulumda sessizce
 * "gönderildi" demek, kullanıcıyı gelmeyecek bir e-postayı beklemeye
 * bırakırdı.
 */

const KOD_OMRU_SN = 10 * 60;
const KOD_DENEME_SINIRI = 5;
/** Aynı e-postaya iki kod arasında geçmesi gereken en kısa süre. */
const KOD_ARALIK_SN = 60;
const OTURUM_OMRU_GUN = 30;
const DENEME_SURESI_GUN = 7;

const simdi = () => Math.floor(Date.now() / 1000);

/** SHA-256 → onaltılık. Kod ve jeton bununla saklanıyor. */
async function ozet(metin) {
  const veri = new TextEncoder().encode(metin);
  const buf = await crypto.subtle.digest('SHA-256', veri);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * E-posta normalizasyonu.
 *
 * Yalnız kırpma ve küçük harf. Gmail'in nokta/artı kurallarını uygulamak
 * cazip ama YANLIŞ olurdu: aynı kuralı uygulamayan sağlayıcılarda iki farklı
 * kişiyi tek hesapta birleştirir.
 */
const epostaNormal = (e) => String(e ?? '').trim().toLowerCase();

const epostaGecerli = (e) => /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(e);

/** Kriptografik rastgele 6 haneli kod. Math.random() tahmin edilebilir. */
function kodUret() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return String(b[0] % 1000000).padStart(6, '0');
}

/** 32 baytlık oturum jetonu (base64url). */
function jetonUret() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ── Şema ────────────────────────────────────────────────────────────────── */

/**
 * Tabloları ilk çağrıda oluşturur.
 *
 * Ayrı bir göç dosyası yerine burada: bu dört tablo yalnız bu modüle ait ve
 * `IF NOT EXISTS` ile her çağrıda güvenli. Şema büyürse göç dosyasına
 * taşınmalı — o eşik, tabloların BAŞKA bir modül tarafından da yazılmaya
 * başladığı gün.
 */
export async function semaHazirla(env) {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS kullanici (
      id TEXT PRIMARY KEY,
      eposta TEXT NOT NULL UNIQUE,
      olusma INTEGER NOT NULL,
      son_giris INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS giris_kodu (
      eposta TEXT PRIMARY KEY,
      kod_ozet TEXT NOT NULL,
      gecerlilik INTEGER NOT NULL,
      deneme INTEGER NOT NULL DEFAULT 0,
      olusma INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS oturum (
      jeton_ozet TEXT PRIMARY KEY,
      kullanici_id TEXT NOT NULL,
      olusma INTEGER NOT NULL,
      gecerlilik INTEGER NOT NULL,
      son_kullanim INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS abonelik (
      kullanici_id TEXT PRIMARY KEY,
      durum TEXT NOT NULL,
      baslangic INTEGER NOT NULL,
      bitis INTEGER,
      saglayici TEXT,
      saglayici_ref TEXT,
      guncelleme INTEGER NOT NULL
    )`),
  ]);
}

/* ── E-posta ─────────────────────────────────────────────────────────────── */

async function kodGonder(env, eposta, kod) {
  if (!env.RESEND_KEY) {
    return { ok: false, sebep: 'eposta_yapilandirilmamis' };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.AUTH_GONDEREN || 'TarpoVizyon <giris@tarpovizyon.com>',
      to: [eposta],
      subject: `TarpoVizyon giriş kodunuz: ${kod}`,
      text: `Giriş kodunuz: ${kod}\n\n`
        + `Kod 10 dakika geçerli. Bu isteği siz yapmadıysanız yok sayın.`,
    }),
  });
  if (!r.ok) {
    console.error('Resend hatası', r.status, (await r.text()).slice(0, 200));
    return { ok: false, sebep: 'eposta_gonderilemedi' };
  }
  return { ok: true };
}

/* ── Uçlar ───────────────────────────────────────────────────────────────── */

/** POST /auth/kod-iste  { eposta } */
export async function handleKodIste(request, env) {
  const govde = await request.json().catch(() => ({}));
  const eposta = epostaNormal(govde.eposta);
  if (!epostaGecerli(eposta)) {
    return { status: 400, body: { hata: 'gecersiz_eposta' } };
  }

  await semaHazirla(env);
  const t = simdi();

  /*
   * Hız sınırı ÜRETMEDEN önce: aynı e-postaya dakikada bir koddan fazlası,
   * hem posta kutusunu doldurur hem de gönderim maliyetini saldırıya açar.
   */
  const mevcut = await env.DB.prepare(
    'SELECT olusma FROM giris_kodu WHERE eposta = ?').bind(eposta).first();
  if (mevcut && t - Number(mevcut.olusma) < KOD_ARALIK_SN) {
    return { status: 429, body: { hata: 'cok_sik', saniye: KOD_ARALIK_SN - (t - Number(mevcut.olusma)) } };
  }

  const kod = kodUret();
  const gonderim = await kodGonder(env, eposta, kod);
  if (!gonderim.ok) {
    // Kod KAYDEDİLMİYOR: gönderilemeyen bir kodu geçerli saymak, kullanıcıyı
    // asla gelmeyecek bir e-postayı beklemeye bırakır.
    return { status: 503, body: { hata: gonderim.sebep } };
  }

  await env.DB.prepare(
    `INSERT INTO giris_kodu (eposta, kod_ozet, gecerlilik, deneme, olusma)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(eposta) DO UPDATE SET
       kod_ozet = excluded.kod_ozet, gecerlilik = excluded.gecerlilik,
       deneme = 0, olusma = excluded.olusma`,
  ).bind(eposta, await ozet(kod), t + KOD_OMRU_SN, t).run();

  return { status: 200, body: { gonderildi: true } };
}

/** POST /auth/kod-dogrula  { eposta, kod } → { jeton, kullanici, abonelik } */
export async function handleKodDogrula(request, env) {
  const govde = await request.json().catch(() => ({}));
  const eposta = epostaNormal(govde.eposta);
  const kod = String(govde.kod ?? '').trim();
  if (!epostaGecerli(eposta) || !/^\d{6}$/.test(kod)) {
    return { status: 400, body: { hata: 'gecersiz_istek' } };
  }

  await semaHazirla(env);
  const t = simdi();
  const kayit = await env.DB.prepare(
    'SELECT kod_ozet, gecerlilik, deneme FROM giris_kodu WHERE eposta = ?').bind(eposta).first();

  if (!kayit) return { status: 400, body: { hata: 'kod_yok' } };
  if (Number(kayit.gecerlilik) < t) {
    await env.DB.prepare('DELETE FROM giris_kodu WHERE eposta = ?').bind(eposta).run();
    return { status: 400, body: { hata: 'kod_suresi_doldu' } };
  }
  if (Number(kayit.deneme) >= KOD_DENEME_SINIRI) {
    return { status: 429, body: { hata: 'cok_fazla_deneme' } };
  }

  if (kayit.kod_ozet !== await ozet(kod)) {
    await env.DB.prepare(
      'UPDATE giris_kodu SET deneme = deneme + 1 WHERE eposta = ?').bind(eposta).run();
    return { status: 400, body: { hata: 'kod_yanlis' } };
  }

  // Kod tek kullanımlık: doğrulanır doğrulanmaz siliniyor.
  await env.DB.prepare('DELETE FROM giris_kodu WHERE eposta = ?').bind(eposta).run();

  let kullanici = await env.DB.prepare(
    'SELECT id FROM kullanici WHERE eposta = ?').bind(eposta).first();
  let yeni = false;
  if (!kullanici) {
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO kullanici (id, eposta, olusma, son_giris) VALUES (?, ?, ?, ?)',
    ).bind(id, eposta, t, t).run();
    kullanici = { id };
    yeni = true;
    /*
     * Deneme İLK GİRİŞTE başlıyor, kayıtta değil — ikisi burada aynı an, ama
     * ayrımı korumak önemli: ileride davetle hesap açılırsa denemenin
     * kullanıcı gerçekten girdiğinde başlaması gerekiyor.
     */
    await env.DB.prepare(
      `INSERT INTO abonelik (kullanici_id, durum, baslangic, bitis, guncelleme)
       VALUES (?, 'deneme', ?, ?, ?)`,
    ).bind(kullanici.id, t, t + DENEME_SURESI_GUN * 86400, t).run();
  } else {
    await env.DB.prepare(
      'UPDATE kullanici SET son_giris = ? WHERE id = ?').bind(t, kullanici.id).run();
  }

  const jeton = jetonUret();
  await env.DB.prepare(
    `INSERT INTO oturum (jeton_ozet, kullanici_id, olusma, gecerlilik, son_kullanim)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(await ozet(jeton), kullanici.id, t, t + OTURUM_OMRU_GUN * 86400, t).run();

  return {
    status: 200,
    body: { jeton, yeniKullanici: yeni, ...(await kullaniciDurumu(env, kullanici.id, eposta)) },
  };
}

/** Kullanıcının kimlik + abonelik özeti. */
async function kullaniciDurumu(env, kullaniciId, eposta) {
  const ab = await env.DB.prepare(
    'SELECT durum, baslangic, bitis FROM abonelik WHERE kullanici_id = ?',
  ).bind(kullaniciId).first();
  const t = simdi();
  const bitis = ab?.bitis == null ? null : Number(ab.bitis);
  /*
   * "Aktif mi" HESAPLANIYOR, saklanmıyor. Saklanan durum, bitiş tarihi geçince
   * kendiliğinden yanlışa dönerdi ve onu düzeltmek için bir zamanlanmış iş
   * gerekirdi. Tarihten hesaplamak o işi gereksiz kılıyor.
   */
  const aktif = ab != null
    && (ab.durum === 'deneme' || ab.durum === 'aktif')
    && (bitis == null || bitis > t);
  return {
    kullanici: { id: kullaniciId, eposta },
    abonelik: ab
      ? { durum: ab.durum, bitis, aktif, kalanGun: bitis ? Math.max(0, Math.ceil((bitis - t) / 86400)) : null }
      : { durum: 'yok', bitis: null, aktif: false, kalanGun: null },
  };
}

/**
 * Bearer jetonundan oturumu çözer.
 *
 * `null` dönerse istek kimliksiz sayılıyor — çağıran taraf buna göre karar
 * veriyor. Burada 401 fırlatılmıyor çünkü bazı uçlar kimliği ZORUNLU değil
 * İSTEĞE BAĞLI kullanacak (girişliye fazladan veri gösteren uçlar).
 */
export async function oturumCoz(request, env) {
  const bas = request.headers.get('Authorization') || '';
  const m = bas.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const t = simdi();
  const o = await env.DB.prepare(
    `SELECT o.kullanici_id, o.gecerlilik, k.eposta
       FROM oturum o JOIN kullanici k ON k.id = o.kullanici_id
      WHERE o.jeton_ozet = ?`,
  ).bind(await ozet(m[1])).first().catch(() => null);
  if (!o || Number(o.gecerlilik) < t) return null;
  return { kullaniciId: o.kullanici_id, eposta: o.eposta };
}

/** GET /auth/ben — oturumun sahibi ve abonelik durumu. */
export async function handleBen(request, env) {
  const o = await oturumCoz(request, env);
  if (!o) return { status: 401, body: { hata: 'oturum_yok' } };
  // Son kullanım: "hangi oturumlar canlı" sorusunu ileride cevaplayabilmek için.
  await env.DB.prepare('UPDATE oturum SET son_kullanim = ? WHERE jeton_ozet = ?')
    .bind(simdi(), await ozet((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')))
    .run().catch(() => {});
  return { status: 200, body: await kullaniciDurumu(env, o.kullaniciId, o.eposta) };
}

/** POST /auth/cikis — bu jetonu geçersiz kılar. */
export async function handleCikis(request, env) {
  const bas = request.headers.get('Authorization') || '';
  const m = bas.match(/^Bearer\s+(.+)$/i);
  if (m) {
    await env.DB.prepare('DELETE FROM oturum WHERE jeton_ozet = ?')
      .bind(await ozet(m[1])).run().catch(() => {});
  }
  return { status: 200, body: { cikildi: true } };
}

/** Aboneliği aktif mi — yetki kapısı bunu kullanacak. */
export async function proMu(env, kullaniciId) {
  const ab = await env.DB.prepare(
    'SELECT durum, bitis FROM abonelik WHERE kullanici_id = ?').bind(kullaniciId).first();
  if (!ab) return false;
  const bitis = ab.bitis == null ? null : Number(ab.bitis);
  return (ab.durum === 'deneme' || ab.durum === 'aktif') && (bitis == null || bitis > simdi());
}
