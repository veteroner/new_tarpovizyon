/**
 * Panel girişi — TOTP ile kısa ömürlü yönetim oturumu.
 *
 * ─── NEDEN GEREKTİ ──────────────────────────────────────────────────────────
 * Panel yolu açıktı: kimlik sorulmadan başlık, dört sekme adı ve form yapısı
 * çiziliyordu. Veri gelmiyordu (uçlar anahtar istiyor) ama yapının kendisi
 * dışarıya görünüyordu — hangi tabloların yönetildiği, hangi işlemlerin
 * bulunduğu, panelin var olduğu. Bunların hiçbirinin dışarıdan görünmesi
 * gerekmiyor.
 *
 * ─── SABİT ANAHTAR NEDEN YETMİYOR ───────────────────────────────────────────
 * `ADMIN_KEY` kalıcı bir kimlik bilgisi ve tarayıcının `localStorage`'ında
 * duruyor: bir kez sızarsa değiştirilene kadar geçerli. TOTP'de paylaşılan sır
 * sunucuda kalıyor, ağdan yalnız 30 saniyelik kod geçiyor.
 *
 * ─── GEÇİŞ DÖNEMİ ───────────────────────────────────────────────────────────
 * `ADMIN_TOTP_SECRET` sunucuda TANIMLI DEĞİL. Bu uç kurulurken sabit anahtarı
 * tek geçerli yol yapmak, TOTP kurulana kadar paneli tümüyle kilitlerdi.
 * O yüzden ikisi de kabul ediliyor — TOTP tanımlıysa kod, değilse anahtar.
 * TOTP kurulduktan sonra `wrangler secret delete ADMIN_KEY` ile sabit anahtar
 * kapatılabilir ve geriye yalnız kod kalır.
 *
 * ─── OTURUM NEDEN KISA ──────────────────────────────────────────────────────
 * Sekiz saat: bir çalışma günü. Uzun tutmak, TOTP'nin sağladığı "kod geçici"
 * güvencesini ortadan kaldırırdı — bir kez girilen kodla haftalarca açık kalan
 * bir oturum, kalıcı anahtardan farksız olurdu.
 */

import { totpDogrula } from './totp.js';

const OTURUM_OMRU_SN = 8 * 60 * 60;
/** Aynı pencerede izin verilen başarısız deneme sayısı. */
const DENEME_SINIRI = 8;
const DENEME_PENCERESI_SN = 10 * 60;

const simdi = () => Math.floor(Date.now() / 1000);

async function ozet(metin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(metin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function jetonUret() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function semaHazirla(env) {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS panel_oturumu (
      jeton_ozet TEXT PRIMARY KEY,
      gecerlilik INTEGER NOT NULL,
      olusma INTEGER NOT NULL,
      kaynak TEXT
    )`),
    /* Kaba kuvvet sayacı. TOTP 6 hane = 1.000.000 olasılık ama kod 30 saniye
       geçerli; sınırsız denemede o pencere içinde tarama yapılabilirdi. */
    db.prepare(`CREATE TABLE IF NOT EXISTS panel_deneme (
      anahtar TEXT PRIMARY KEY,
      sayi INTEGER NOT NULL,
      pencere INTEGER NOT NULL
    )`),
  ]);
}

/** İstemciyi ayırt eden anahtar — IP yoksa sabit bir değere düşüyor. */
const istemciAnahtari = (request) =>
  request.headers.get('CF-Connecting-IP') || 'bilinmeyen';

async function denemeSayaci(env, anahtar) {
  const t = simdi();
  const r = await env.DB.prepare(
    'SELECT sayi, pencere FROM panel_deneme WHERE anahtar = ?').bind(anahtar).first();
  if (!r || t - Number(r.pencere) > DENEME_PENCERESI_SN) return { sayi: 0, yeni: true };
  return { sayi: Number(r.sayi), yeni: false };
}

async function denemeArtir(env, anahtar, yeni) {
  const t = simdi();
  if (yeni) {
    await env.DB.prepare(
      `INSERT INTO panel_deneme (anahtar, sayi, pencere) VALUES (?, 1, ?)
       ON CONFLICT(anahtar) DO UPDATE SET sayi = 1, pencere = excluded.pencere`,
    ).bind(anahtar, t).run();
  } else {
    await env.DB.prepare(
      'UPDATE panel_deneme SET sayi = sayi + 1 WHERE anahtar = ?').bind(anahtar).run();
  }
}

/**
 * POST admin/panel-giris — { kod } ya da { anahtar }
 *
 * Başarılıysa kısa ömürlü panel jetonu döner. Jeton D1'de HAM DEĞİL özetiyle
 * saklanıyor: veritabanı sızarsa ham jeton doğrudan panel erişimi demektir.
 */
export async function handlePanelGiris(request, env) {
  await semaHazirla(env);
  const istemci = istemciAnahtari(request);
  const { sayi, yeni } = await denemeSayaci(env, istemci);
  if (sayi >= DENEME_SINIRI) {
    return { status: 429, body: { hata: 'cok_fazla_deneme', dakika: Math.ceil(DENEME_PENCERESI_SN / 60) } };
  }

  const g = await request.json().catch(() => ({}));
  const kod = String(g.kod ?? '').trim();
  const anahtar = String(g.anahtar ?? '');

  let kaynak = null;
  const sir = env.ADMIN_TOTP_SECRET ?? '';
  if (sir && /^\d{6}$/.test(kod) && await totpDogrula(sir, kod)) {
    kaynak = 'totp';
  } else if (env.ADMIN_KEY && anahtar && anahtar === env.ADMIN_KEY) {
    /* Geçiş yolu: TOTP kurulana kadar. `ADMIN_KEY` silindiğinde bu dal
       kendiliğinden kapanıyor. */
    kaynak = 'anahtar';
  }

  if (!kaynak) {
    await denemeArtir(env, istemci, yeni);
    return { status: 401, body: { hata: 'gecersiz', totpKurulu: Boolean(sir) } };
  }

  /* Başarılı girişte sayaç sıfırlanıyor — meşru kullanıcı önceki hatalı
     denemeleri yüzünden kilitlenmemeli. */
  await env.DB.prepare('DELETE FROM panel_deneme WHERE anahtar = ?').bind(istemci).run().catch(() => {});

  const jeton = jetonUret();
  const t = simdi();
  await env.DB.prepare(
    'INSERT INTO panel_oturumu (jeton_ozet, gecerlilik, olusma, kaynak) VALUES (?, ?, ?, ?)',
  ).bind(await ozet(jeton), t + OTURUM_OMRU_SN, t, kaynak).run();

  return { status: 200, body: { jeton, gecerlilikSn: OTURUM_OMRU_SN, kaynak } };
}

/** POST admin/panel-cikis — jetonu geçersiz kılar. */
export async function handlePanelCikis(request, env) {
  const j = request.headers.get('x-panel-oturum') ?? '';
  if (j) {
    await env.DB.prepare('DELETE FROM panel_oturumu WHERE jeton_ozet = ?')
      .bind(await ozet(j)).run().catch(() => {});
  }
  return { status: 200, body: { cikildi: true } };
}

/**
 * Panel jetonu geçerli mi — yönetim uçlarının yeni yetki yolu.
 *
 * Süresi dolmuş kayıtlar burada temizleniyor: ayrı bir zamanlanmış iş
 * kurmak yerine, zaten dokunulan satırda yapılıyor.
 */
export async function panelOturumuGecerli(request, env) {
  const j = request.headers.get('x-panel-oturum') ?? '';
  if (!j) return false;
  const t = simdi();
  const r = await env.DB.prepare(
    'SELECT gecerlilik FROM panel_oturumu WHERE jeton_ozet = ?',
  ).bind(await ozet(j)).first().catch(() => null);
  if (!r) return false;
  if (Number(r.gecerlilik) < t) {
    await env.DB.prepare('DELETE FROM panel_oturumu WHERE jeton_ozet = ?')
      .bind(await ozet(j)).run().catch(() => {});
    return false;
  }
  return true;
}
