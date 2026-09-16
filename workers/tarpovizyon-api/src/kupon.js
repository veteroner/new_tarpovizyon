/**
 * Bedava Pro kuponları — kod üretimi, doğrulama ve harcama.
 *
 * ─── NEDEN iyzico'YA UĞRAMIYOR ──────────────────────────────────────────────
 * Kupon %100 bedava erişim veriyor: ortada tahsilat yok, kart yok, plan yok.
 * Kuponu iyzico abonelik akışından geçirmek, olmayan bir ödemeyi taklit etmek
 * olurdu — hem de iyzico'da her kupon için ayrı bir ödeme planı tanımlamayı
 * gerektirirdi. Kupon doğrudan `abonelik` satırı yazıyor; erişimi zaten
 * `proMu()` o satırdan hesaplıyor, yani ikinci bir yetki yolu açılmıyor.
 *
 * ─── HARCAMA YARIŞA KARŞI KORUMALI ──────────────────────────────────────────
 * "Önce oku, kontrol et, sonra yaz" yazılsaydı, aynı kodu aynı anda gönderen
 * iki istek de sayacı aynı değerde görür ve tek kullanımlık bir kupon iki kez
 * harcanırdı. Bunun yerine iki KOŞULLU yazma kullanılıyor ve kararı
 * veritabanı veriyor:
 *
 *   1. `INSERT OR IGNORE INTO kupon_kullanim` → birincil anahtar (kod,
 *      kullanıcı) aynı kişinin ikinci kez kullanmasını engelliyor. Değişen
 *      satır 0 ise bu kullanıcı o kuponu zaten kullanmış.
 *   2. `UPDATE ... WHERE kullanilan < azami` → sayacı ancak kontenjan varken
 *      artırıyor. Değişen satır 0 ise kupon tükenmiş; bu durumda 1. adımda
 *      yazılan kullanım satırı geri alınıyor.
 *
 * ─── KABA KUVVETE KARŞI ─────────────────────────────────────────────────────
 * Kod yöneticinin elinden de geçebiliyor (akılda kalsın diye "TARIM2026"
 * gibi), yani her zaman yüksek entropili değil. Bu yüzden hem üretilen
 * kodlar 10 karakterlik karışık alfabeden seçiliyor hem de kullanıcı başına
 * deneme sayısı sınırlı: sınırsız denemede kısa bir kod tahmin edilebilirdi.
 */

import { yetkili } from './upload.js';
import { oturumCoz } from './auth.js';

const simdi = () => Math.floor(Date.now() / 1000);

/** Karışabilen harf/rakamlar (0/O, 1/I/L) alfabede YOK — kod elle yazılıyor. */
const ALFABE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const KOD_UZUNLUK = 10;

const DENEME_SINIRI = 10;          // kullanıcı başına başarısız deneme
const DENEME_PENCERE_SN = 60 * 60; // bir saatte

/** Kod yazımını tekilleştirir: boşluk/tire atılır, büyük harfe çevrilir. */
export const kodNormal = (ham) =>
  String(ham ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function kodUret() {
  const b = new Uint8Array(KOD_UZUNLUK);
  crypto.getRandomValues(b);
  return [...b].map((x) => ALFABE[x % ALFABE.length]).join('');
}

export async function semaHazirla(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS kupon (
      kod TEXT PRIMARY KEY,
      gun INTEGER NOT NULL,
      azami INTEGER NOT NULL,
      kullanilan INTEGER NOT NULL DEFAULT 0,
      gecerlilik INTEGER,
      aciklama TEXT,
      aktif INTEGER NOT NULL DEFAULT 1,
      olusma INTEGER NOT NULL
    )`),
    /* Kimin hangi kuponu kullandığı: hem tekrar kullanımı engelliyor hem de
       "bu kampanya işe yaradı mı" sorusunun tek kaynağı. */
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS kupon_kullanim (
      kod TEXT NOT NULL,
      kullanici_id TEXT NOT NULL,
      zaman INTEGER NOT NULL,
      PRIMARY KEY (kod, kullanici_id)
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS kupon_deneme (
      kullanici_id TEXT PRIMARY KEY,
      sayi INTEGER NOT NULL DEFAULT 0,
      pencere INTEGER NOT NULL
    )`),
  ]);
}

/* ── Kullanıcı tarafı ─────────────────────────────────────────────────────── */

/** Başarısız deneme sayacı. Sınır aşıldıysa `true` döner. */
async function cokFazlaDeneme(env, kullaniciId) {
  const t = simdi();
  const r = await env.DB.prepare(
    'SELECT sayi, pencere FROM kupon_deneme WHERE kullanici_id = ?').bind(kullaniciId).first();
  if (!r || t - Number(r.pencere) > DENEME_PENCERE_SN) return false;
  return Number(r.sayi) >= DENEME_SINIRI;
}

async function denemeSay(env, kullaniciId) {
  const t = simdi();
  const r = await env.DB.prepare(
    'SELECT pencere FROM kupon_deneme WHERE kullanici_id = ?').bind(kullaniciId).first();
  const yeniPencere = !r || t - Number(r.pencere) > DENEME_PENCERE_SN;
  await env.DB.prepare(
    `INSERT INTO kupon_deneme (kullanici_id, sayi, pencere) VALUES (?, 1, ?)
     ON CONFLICT(kullanici_id) DO UPDATE SET
       sayi = CASE WHEN ? THEN 1 ELSE kupon_deneme.sayi + 1 END,
       pencere = CASE WHEN ? THEN ? ELSE kupon_deneme.pencere END`,
  ).bind(kullaniciId, t, yeniPencere ? 1 : 0, yeniPencere ? 1 : 0, t).run();
}

/**
 * POST kupon/kullan — { kod }. Oturum ZORUNLU.
 *
 * Erişimin kime yazılacağı jetondan geliyor; gövdeden bir kullanıcı kimliği
 * kabul edilmiyor (kabul edilseydi herkes kuponu başkasına yazabilirdi).
 */
export async function handleKuponKullan(request, env) {
  const oturum = await oturumCoz(request, env);
  if (!oturum) return { status: 401, body: { hata: 'giris_gerekli' } };

  const { kod: ham } = await request.json().catch(() => ({}));
  const kod = kodNormal(ham);
  if (!kod) return { status: 400, body: { hata: 'kod_yok' } };

  await semaHazirla(env);
  const t = simdi();

  if (await cokFazlaDeneme(env, oturum.kullaniciId)) {
    return { status: 429, body: { hata: 'cok_fazla_deneme', dakika: Math.ceil(DENEME_PENCERE_SN / 60) } };
  }

  const k = await env.DB.prepare(
    'SELECT kod, gun, azami, kullanilan, gecerlilik, aktif FROM kupon WHERE kod = ?',
  ).bind(kod).first();

  /*
   * Geçersiz kod ile kapatılmış/süresi dolmuş kod AYNI cevabı alıyor. Ayrı
   * cevaplar, deneyen birine "bu kod vardı ama doldu" bilgisini verir ve
   * geçerli kod biçimini keşfetmeyi kolaylaştırırdı.
   */
  const gecersiz = !k || !Number(k.aktif)
    || (k.gecerlilik != null && Number(k.gecerlilik) < t);
  if (gecersiz) {
    await denemeSay(env, oturum.kullaniciId);
    return { status: 404, body: { hata: 'kupon_gecersiz' } };
  }

  /* 1. adım: bu kullanıcı bu kuponu daha önce kullandı mı? */
  const kullanim = await env.DB.prepare(
    'INSERT OR IGNORE INTO kupon_kullanim (kod, kullanici_id, zaman) VALUES (?, ?, ?)',
  ).bind(kod, oturum.kullaniciId, t).run();
  if ((kullanim.meta?.changes ?? 0) === 0) {
    return { status: 409, body: { hata: 'kupon_zaten_kullanildi' } };
  }

  /* 2. adım: kontenjan. Kararı WHERE veriyor, biz değil. */
  const sayac = await env.DB.prepare(
    'UPDATE kupon SET kullanilan = kullanilan + 1 WHERE kod = ? AND aktif = 1 AND kullanilan < azami',
  ).bind(kod).run();
  if ((sayac.meta?.changes ?? 0) === 0) {
    // Kontenjan dolmuş: 1. adımda yazdığımız satırı geri al.
    await env.DB.prepare(
      'DELETE FROM kupon_kullanim WHERE kod = ? AND kullanici_id = ?',
    ).bind(kod, oturum.kullaniciId).run();
    return { status: 409, body: { hata: 'kupon_tukendi' } };
  }

  /*
   * Erişim MEVCUT BİTİŞTEN uzuyor: aboneliği ya da denemesi sürerken kupon
   * kullanan kalan günlerini kaybetmemeli.
   *
   * `saglayici` yalnızca yeni satırda 'kupon' oluyor; var olan satırda
   * DOKUNULMUYOR. Dokunulsaydı iyzico aboneliği olan birinde `saglayici_ref`
   * bağı kopar ve yenileme bildirimi eşleşmezdi.
   */
  const mevcut = await env.DB.prepare(
    'SELECT baslangic, bitis FROM abonelik WHERE kullanici_id = ?').bind(oturum.kullaniciId).first();
  const taban = mevcut?.bitis && Number(mevcut.bitis) > t ? Number(mevcut.bitis) : t;
  const bitis = taban + Number(k.gun) * 86400;

  await env.DB.prepare(
    `INSERT INTO abonelik (kullanici_id, durum, baslangic, bitis, saglayici, guncelleme)
     VALUES (?, 'aktif', ?, ?, 'kupon', ?)
     ON CONFLICT(kullanici_id) DO UPDATE SET
       durum = 'aktif', bitis = excluded.bitis, guncelleme = excluded.guncelleme`,
  ).bind(oturum.kullaniciId, mevcut?.baslangic ?? t, bitis, t).run();

  return { status: 200, body: { basarili: true, gun: Number(k.gun), bitis } };
}

/* ── Yönetici tarafı ──────────────────────────────────────────────────────── */

/** GET admin/kuponlar — liste, yenisi üstte. */
export async function handleKuponlar(request, env) {
  if (!(await yetkili(request, env))) return { status: 401, body: { hata: 'yetkisiz' } };
  await semaHazirla(env);
  const r = await env.DB.prepare(
    `SELECT kod, gun, azami, kullanilan, gecerlilik, aciklama, aktif, olusma
       FROM kupon ORDER BY olusma DESC LIMIT 500`,
  ).all();

  /*
   * `durum` SUNUCUDA hesaplanıyor, saklanmıyor. Tabloda duran `aktif` tek
   * başına yetmiyor: kontenjanı dolmuş ya da süresi geçmiş bir kupon hâlâ
   * `aktif = 1` yazıyor. Panelin kendi saatinden hesaplaması ise iki soruna
   * yol açardı — ziyaretçinin saati yanlışsa rozet yanlış çıkar, ve React
   * render'ı içinde `Date.now()` çağırmak saf olmayan bir işlem olurdu.
   */
  const t = simdi();
  const kuponlar = (r.results ?? []).map((k) => ({
    ...k,
    durum: !Number(k.aktif) ? 'kapali'
      : (k.gecerlilik != null && Number(k.gecerlilik) < t) ? 'suresi_doldu'
        : Number(k.kullanilan) >= Number(k.azami) ? 'tukendi'
          : 'acik',
  }));
  return { status: 200, body: { kuponlar } };
}

/**
 * POST admin/kupon — { islem: 'olustur'|'kapat'|'ac', kod?, gun?, azami?,
 *                      gecerlilikGun?, aciklama? }
 *
 * Kupon SİLİNMİYOR, kapatılıyor: silinen bir kuponun kullanım kayıtları
 * öksüz kalır ve "bu erişim nereden geldi" sorusu cevapsız kalırdı.
 */
export async function handleKuponYaz(request, env) {
  if (!(await yetkili(request, env))) return { status: 401, body: { hata: 'yetkisiz' } };
  const g = await request.json().catch(() => ({}));
  const islem = String(g.islem ?? '');
  await semaHazirla(env);
  const t = simdi();

  if (islem === 'kapat' || islem === 'ac') {
    const kod = kodNormal(g.kod);
    if (!kod) return { status: 400, body: { hata: 'kod_yok' } };
    const r = await env.DB.prepare(
      'UPDATE kupon SET aktif = ? WHERE kod = ?',
    ).bind(islem === 'ac' ? 1 : 0, kod).run();
    if ((r.meta?.changes ?? 0) === 0) return { status: 404, body: { hata: 'kupon_yok' } };
    return { status: 200, body: { kod, aktif: islem === 'ac' } };
  }

  if (islem !== 'olustur') return { status: 400, body: { hata: 'gecersiz_istek' } };

  const gun = Number(g.gun);
  if (!Number.isFinite(gun) || gun <= 0 || gun > 3650) {
    return { status: 400, body: { hata: 'gecersiz_gun', beklenen: '1–3650' } };
  }
  const azami = g.azami === undefined || g.azami === '' ? 1 : Number(g.azami);
  if (!Number.isFinite(azami) || azami <= 0 || azami > 100000) {
    return { status: 400, body: { hata: 'gecersiz_azami', beklenen: '1–100000' } };
  }
  const gecerlilikGun = g.gecerlilikGun === undefined || g.gecerlilikGun === ''
    ? null : Number(g.gecerlilikGun);
  if (gecerlilikGun != null && (!Number.isFinite(gecerlilikGun) || gecerlilikGun <= 0)) {
    return { status: 400, body: { hata: 'gecersiz_gecerlilik' } };
  }

  /* Kod verilmediyse üretiliyor. Elle verilen kod da normalleştiriliyor ki
     kullanıcı küçük harfle ya da tireli yazdığında da tutsun. */
  const kod = g.kod ? kodNormal(g.kod) : kodUret();
  if (kod.length < 4) return { status: 400, body: { hata: 'kod_kisa', beklenen: 'en az 4 karakter' } };

  const r = await env.DB.prepare(
    `INSERT OR IGNORE INTO kupon (kod, gun, azami, kullanilan, gecerlilik, aciklama, aktif, olusma)
     VALUES (?, ?, ?, 0, ?, ?, 1, ?)`,
  ).bind(
    kod, gun, azami,
    gecerlilikGun == null ? null : t + gecerlilikGun * 86400,
    String(g.aciklama ?? '').slice(0, 200) || null,
    t,
  ).run();

  /* Var olan bir kodun üzerine yazmak, kullanılmış bir kuponun sayacını
     sıfırlamak olurdu. */
  if ((r.meta?.changes ?? 0) === 0) return { status: 409, body: { hata: 'kod_zaten_var' } };

  return { status: 200, body: { kod, gun, azami } };
}
