/**
 * Yönetim uçları — ayarlar ve abone listesi.
 *
 * ─── OKUMA AÇIK, YAZMA KORUMALI ─────────────────────────────────────────────
 * Fiyat bilgisi kamuya açık: abonelik sayfası onu giriş yapmamış ziyaretçiye
 * de göstermek zorunda, yoksa kimse ne ödeyeceğini bilmeden karar veremez.
 * Bu yüzden `GET ayar` herkese açık ama YALNIZCA açık işaretli anahtarları
 * döndürüyor — ileride eklenecek bir iç ayar (ör. bir sağlayıcı kimliği)
 * sessizce sızmasın.
 *
 * Yazma ve abone listesi `yetkili()` ile korunuyor: TOTP tercih ediliyor,
 * sabit anahtar geçiş için yedek (upload.js'teki denetimin aynısı, kopyası
 * değil).
 *
 * ─── ABONE LİSTESİ NEDEN AYRI DÜŞÜNÜLDÜ ─────────────────────────────────────
 * Bu uç e-posta adresi döndürüyor, yani kişisel veri. Bir istatistik
 * tablosunun sızması ile abone listesinin sızması aynı sorumluluk değil;
 * o yüzden `yetkili()` denetimi olmadan tek satır bile dönmüyor ve
 * `Cache-Control: no-store` ile hiçbir yerde saklanmıyor.
 */

import { yetkili } from './upload.js';

const simdi = () => Math.floor(Date.now() / 1000);

/**
 * Kamuya açık ayar anahtarları.
 *
 * Beyaz liste, kara liste DEĞİL: yeni bir ayar eklendiğinde varsayılan
 * davranış GİZLİ olmalı. Kara listede unutulan bir anahtar kendiliğinden
 * herkese açık olurdu.
 */
const ACIK_AYARLAR = new Set(['fiyat_aylik', 'fiyat_yillik', 'deneme_gun']);

/** Ayarın kabul edilebilir aralığı — panelden gelen değer de doğrulanıyor. */
const AYAR_KURALI = {
  fiyat_aylik: { min: 0, max: 100000, ad: 'Aylık fiyat' },
  fiyat_yillik: { min: 0, max: 1000000, ad: 'Yıllık fiyat' },
  deneme_gun: { min: 0, max: 365, ad: 'Deneme gün sayısı' },
};

export async function semaHazirla(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ayar (
    anahtar TEXT PRIMARY KEY,
    deger TEXT NOT NULL,
    guncelleme INTEGER NOT NULL
  )`).run();
}

/** GET ayar — kamuya açık ayarlar. */
export async function handleAyarOku(env) {
  await semaHazirla(env);
  const r = await env.DB.prepare('SELECT anahtar, deger FROM ayar').all();
  const cikti = {};
  const hepsi = {};
  for (const s of r.results ?? []) {
    hepsi[s.anahtar] = s.deger;
    if (ACIK_AYARLAR.has(s.anahtar)) cikti[s.anahtar] = s.deger;
  }

  /*
   * Ödeme kurulmuş mu — TÜRETİLMİŞ bilgi, plan kodlarının kendisi DEĞİL.
   * Sayfa "ödemeye geç" düğmesini gösterip göstermeyeceğini bilmek zorunda;
   * ama plan referans kodları iyzico hesabına ait iç bilgi ve dışarı
   * çıkmamalı. O yüzden yalnız "var mı yok mu" dönüyor.
   *
   * Bu bayrak ABONELİK AÇMIYOR: ödeme akışı kapalıyken bile sunucu
   * `plan_tanimsiz` döndürmeye devam ediyor, yani "hazır" görünen bir arayüz
   * gerçek bir abonelik üretemez.
   */
  cikti.odeme_hazir = (hepsi.iyzico_plan_aylik || hepsi.iyzico_plan_yillik) ? '1' : '0';

  return { status: 200, body: cikti };
}

/** POST admin/ayar — { fiyat_aylik: "199", … }. Yetki ister. */
export async function handleAyarYaz(request, env) {
  if (!(await yetkili(request, env))) {
    return { status: 401, body: { hata: 'yetkisiz' } };
  }
  const govde = await request.json().catch(() => ({}));
  await semaHazirla(env);

  const yazilacak = [];
  for (const [anahtar, ham] of Object.entries(govde)) {
    const kural = AYAR_KURALI[anahtar];
    if (!kural) return { status: 400, body: { hata: 'bilinmeyen_ayar', anahtar } };
    /*
     * Sayı doğrulaması SUNUCUDA da yapılıyor. Panelin kendi denetimi
     * yeterli değil: uç doğrudan çağrılabilir ve bu tablodan okunan değer
     * kullanıcıya gösterilen fiyat oluyor. Negatif ya da saçma bir tutarın
     * veritabanına girmesi, sayfada saçma bir fiyat görünmesi demek.
     */
    const sayi = Number(ham);
    if (!Number.isFinite(sayi) || sayi < kural.min || sayi > kural.max) {
      return {
        status: 400,
        body: { hata: 'gecersiz_deger', anahtar, beklenen: `${kural.min}–${kural.max}` },
      };
    }
    yazilacak.push({ anahtar, deger: String(sayi) });
  }
  if (!yazilacak.length) return { status: 400, body: { hata: 'bos_istek' } };

  const t = simdi();
  await env.DB.batch(yazilacak.map((y) => env.DB.prepare(
    `INSERT INTO ayar (anahtar, deger, guncelleme) VALUES (?, ?, ?)
     ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger, guncelleme = excluded.guncelleme`,
  ).bind(y.anahtar, y.deger, t)));

  return { status: 200, body: { kaydedildi: yazilacak.length } };
}

/**
 * GET admin/aboneler — kayıtlı kullanıcılar ve abonelik durumları.
 *
 * "Aktif mi" burada da HESAPLANIYOR, saklanmıyor: bitiş tarihi geçmiş bir
 * kaydın durumu hâlâ 'aktif' yazıyor olabilir ve onu düzeltmek için
 * zamanlanmış bir iş gerekirdi. Tarihten hesaplamak o işi gereksiz kılıyor
 * (auth.js'teki `kullaniciDurumu` ile aynı kural).
 */
export async function handleAboneler(request, env) {
  if (!(await yetkili(request, env))) {
    return { status: 401, body: { hata: 'yetkisiz' } };
  }
  const t = simdi();
  const r = await env.DB.prepare(`
    SELECT k.id, k.eposta, k.olusma, k.son_giris,
           a.durum, a.baslangic, a.bitis,
           (SELECT COUNT(*) FROM oturum o WHERE o.kullanici_id = k.id AND o.gecerlilik > ?) acik_oturum
      FROM kullanici k
      LEFT JOIN abonelik a ON a.kullanici_id = k.id
     ORDER BY k.olusma DESC
     LIMIT 500`).bind(t).all();

  const satirlar = (r.results ?? []).map((s) => {
    const bitis = s.bitis == null ? null : Number(s.bitis);
    const aktif = (s.durum === 'deneme' || s.durum === 'aktif')
      && (bitis == null || bitis > t);
    return {
      id: s.id,
      eposta: s.eposta,
      olusma: Number(s.olusma),
      sonGiris: s.son_giris == null ? null : Number(s.son_giris),
      durum: s.durum ?? 'yok',
      bitis,
      aktif,
      kalanGun: bitis ? Math.max(0, Math.ceil((bitis - t) / 86400)) : null,
      acikOturum: Number(s.acik_oturum ?? 0),
    };
  });

  return {
    status: 200,
    body: {
      toplam: satirlar.length,
      aktifSayisi: satirlar.filter((s) => s.aktif).length,
      aboneler: satirlar,
    },
  };
}

/**
 * POST admin/abonelik — bir kullanıcının aboneliğini uzat ya da iptal et.
 * Gövde: { kullaniciId, islem: 'uzat'|'iptal', gun?: number }
 */
export async function handleAbonelikDegistir(request, env) {
  if (!(await yetkili(request, env))) {
    return { status: 401, body: { hata: 'yetkisiz' } };
  }
  const { kullaniciId, islem, gun } = await request.json().catch(() => ({}));
  if (!kullaniciId || !['uzat', 'iptal'].includes(islem)) {
    return { status: 400, body: { hata: 'gecersiz_istek' } };
  }

  const t = simdi();
  const mevcut = await env.DB.prepare(
    'SELECT durum, bitis FROM abonelik WHERE kullanici_id = ?').bind(kullaniciId).first();
  if (!mevcut) return { status: 404, body: { hata: 'abonelik_yok' } };

  if (islem === 'iptal') {
    await env.DB.prepare(
      `UPDATE abonelik SET durum = 'iptal', bitis = ?, guncelleme = ? WHERE kullanici_id = ?`,
    ).bind(t, t, kullaniciId).run();
    return { status: 200, body: { durum: 'iptal' } };
  }

  const ekle = Number(gun);
  if (!Number.isFinite(ekle) || ekle <= 0 || ekle > 3650) {
    return { status: 400, body: { hata: 'gecersiz_gun', beklenen: '1–3650' } };
  }
  /* Uzatma MEVCUT BİTİŞTEN başlıyor, bugünden değil — süresi dolmamış bir
     aboneliği uzatmak kalan günleri yakmamalı. Süresi dolmuşsa bugünden. */
  const taban = mevcut.bitis && Number(mevcut.bitis) > t ? Number(mevcut.bitis) : t;
  const yeniBitis = taban + ekle * 86400;
  await env.DB.prepare(
    `UPDATE abonelik SET durum = 'aktif', bitis = ?, guncelleme = ? WHERE kullanici_id = ?`,
  ).bind(yeniBitis, t, kullaniciId).run();

  return { status: 200, body: { durum: 'aktif', bitis: yeniBitis } };
}
