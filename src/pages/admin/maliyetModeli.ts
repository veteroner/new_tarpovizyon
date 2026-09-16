/**
 * Çiğ süt ve dana karkas ÜRETİM MALİYETİ modeli.
 *
 * ─── KAYNAK ─────────────────────────────────────────────────────────────────
 * Kullanıcının Google Sheet'indeki iki sayfanın birebir kopyası:
 *   "Süt Maliyeti Hesaplama"    → `sutMaliyeti`
 *   "Karkas Maliyet Hesaplama"  → `karkasMaliyeti` (yalnız "Yerli" sütunu —
 *                                 D1'e yazılan o; Güney Amerika/Avrupa sütunları
 *                                 ithal besi materyali karşılaştırması)
 *
 * Eylül 2026'da Sheet'teki girdilerle geriye doğru sınandı: süt 21,92792857
 * ve karkas 547,0732249 — D1'deki Ağustos değerleriyle 10⁻⁸ hassasiyette aynı.
 *
 * ─── NEDEN KODDA ────────────────────────────────────────────────────────────
 * Önceden maliyet giriş ekranında ELLE yazılan bir alandı; formül yalnız
 * Sheet'teydi. Önceki aydan taşınan girdilerle bu, yem fiyatı değişse bile
 * maliyetin eski değerde kalması demekti — tam da kârlılığı 14 ay donduran
 * hata. Maliyet artık girdilerden HESAPLANIYOR ve elle girilemiyor.
 *
 * ─── TEKNİK KABULLER ────────────────────────────────────────────────────────
 * Aşağıdaki sabitler Sheet'teki "teknik kabuller" ve rasyon miktarları.
 * Fiyat değil, varsayım: Sheet'te değiştirilirse burada da değiştirilmeli.
 * Tümü bilerek tek yerde.
 */

const SUT = {
  /** kg/gün — Sheet: RASYON tablosu */
  rasyon: { karma: 9, silaj: 18, yonca: 4, saman: 4 },
  yemFiresi: 0.03,
  /** Yem gideri toplam giderin %63'ü; kalan %37 işçilik, su, elektrik, sağlık… */
  yemPayi: 0.63,
  /** Buzağı geliri: 450 günde %90 oranla bir buzağı */
  buzagiOrani: 0.9,
  buzagiAraligiGun: 450,
  /** Gübre geliri: yılda 14 ton */
  gubreTonYil: 14,
  gunlukVerimLt: 20,
} as const;

const KARKAS = {
  /** kg/gün */
  rasyon: { karma: 4, arpa: 3, kepek: 0.5, kuspe: 1, silaj: 12, saman: 1 },
  baslangicKg: 250,
  gunlukArtisKg: 1.25,
  besiSuresiGun: 300,
  /** Diğer maliyetler: (alım + besleme) × %8 */
  digerOran: 0.08,
  randiman: 0.55,
  kesimSogutmaFiresi: 0.05,
} as const;

type N = number | null | undefined;
const sayi = (x: N): number | null => (x != null && Number.isFinite(x) ? x : null);

/** Girdilerden biri eksikse `null` — eksik girdiyle hesaplanmış maliyet, hiç yoktan kötü. */
export function sutMaliyeti(g: {
  sut_yemi_19hp: N; misir_silaji: N; yonca: N; saman: N;
  buzagi_fiyati_tl_bas: N; gubre_fiyati_tl_ton: N;
}): number | null {
  const karma = sayi(g.sut_yemi_19hp), silaj = sayi(g.misir_silaji), yonca = sayi(g.yonca),
    saman = sayi(g.saman), buzagi = sayi(g.buzagi_fiyati_tl_bas), gubre = sayi(g.gubre_fiyati_tl_ton);
  if (karma == null || silaj == null || yonca == null || saman == null || buzagi == null || gubre == null) return null;
  const r = SUT.rasyon;
  const yem = (r.karma * karma + r.silaj * silaj + r.yonca * yonca + r.saman * saman) * (1 + SUT.yemFiresi);
  const gider = yem / SUT.yemPayi;
  const gelir = buzagi * SUT.buzagiOrani / SUT.buzagiAraligiGun + gubre * SUT.gubreTonYil / 365;
  return (gider - gelir) / SUT.gunlukVerimLt;
}

export function karkasMaliyeti(g: {
  besi_yemi_fiyati_tl_kg: N; yemlik_arpa_tl_kg: N; bugday_kepegi_tl_kg: N;
  aycicegi_kuspesi_tl_kg: N; misir_silaji_tl_kg: N; saman_tl_kg: N;
  besilik_dana_fiyati_tl_kg: N;
}): number | null {
  const karma = sayi(g.besi_yemi_fiyati_tl_kg), arpa = sayi(g.yemlik_arpa_tl_kg), kepek = sayi(g.bugday_kepegi_tl_kg),
    kuspe = sayi(g.aycicegi_kuspesi_tl_kg), silaj = sayi(g.misir_silaji_tl_kg), saman = sayi(g.saman_tl_kg),
    alimFiyati = sayi(g.besilik_dana_fiyati_tl_kg);
  if (karma == null || arpa == null || kepek == null || kuspe == null
    || silaj == null || saman == null || alimFiyati == null) return null;
  const k = KARKAS; const r = k.rasyon;
  const gunlukYem = r.karma * karma + r.arpa * arpa + r.kepek * kepek + r.kuspe * kuspe
    + r.silaj * silaj + r.saman * saman;
  const alim = alimFiyati * k.baslangicKg;
  const besleme = k.besiSuresiGun * gunlukYem;
  const toplam = (alim + besleme) * (1 + k.digerOran);
  const karkasKg = (k.gunlukArtisKg * k.besiSuresiGun + k.baslangicKg) * k.randiman * (1 - k.kesimSogutmaFiresi);
  return toplam / karkasKg;
}
