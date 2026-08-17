/**
 * Sektör fiyat tablolarının form tanımı — ham girdiler ve TÜRETİLEN sütunlar.
 *
 * ─── NEDEN BU DOSYA VAR ─────────────────────────────────────────────────────
 * Bu dört tabloda sütunların bir kısmı elle girilen ÖLÇÜM (yem fiyatı, USK
 * tavsiye fiyatı, maliyet), bir kısmı ise onlardan HESAPLANAN oran (parite,
 * fiyat-maliyet farkı, kârlılık). Izgara ekranında ikisi yan yana ve aynı
 * görünüyordu; sonuç: ham alanlar güncellenirken hesaplananlar elle
 * güncellenmedi ve DONDU.
 *
 * 2026-08 denetimi (98–134 satır tarandı):
 *   çiğ süt      → 8 ay bozuk (2025-07 … 2026-02)
 *   kırmızı et   → 5 ay bozuk
 *   yumurta      → 2 ay bozuk
 *   kanatlı      → temiz
 *
 * Hata küçük değil: çiğ sütte 2026-01'de kayıtlı kârlılık %−1,82 iken doğrusu
 * %+3,54 — işaret bile ters, yani sayfa "zarar" gösterirken gerçekte kâr var.
 *
 * Formüller veriden çıkarıldı ve 90+/98 satırda doğrulandı; hesaplananlar
 * artık burada tanımlı ve ekran onları KENDİ hesaplıyor — elle girilemiyorlar.
 */

export type Girdi = {
  alan: string;
  etiket: string;
  birim?: string;
  /** Zorunlu girdi: boşsa kaydetmeye izin verilmiyor. */
  zorunlu?: boolean;
};

export type Turetilen = {
  alan: string;
  etiket: string;
  birim?: string;
  /** Kullanıcıya gösterilen formül — sayının nereden geldiği görünsün. */
  formul: string;
  hesapla: (g: Record<string, number | null>) => number | null;
};

export type SektorFormu = {
  tablo: string;
  ad: string;
  aciklama: string;
  /** Dönem sütunu; hepsinde aylık `tarih` (ayın 1'i). */
  donemAlani: 'tarih';
  girdiler: Girdi[];
  turetilenler: Turetilen[];
};

/** Bölme koruması: payda 0/boşsa sonuç yok, 0 değil. */
const bol = (a: number | null, b: number | null): number | null =>
  a == null || b == null || b === 0 ? null : a / b;

const fark = (fiyat: number | null, maliyet: number | null): number | null =>
  fiyat == null || maliyet == null ? null : fiyat - maliyet;

const karlilik = (fiyat: number | null, maliyet: number | null): number | null => {
  const f = fark(fiyat, maliyet);
  return f == null || maliyet == null || maliyet === 0 ? null : (f / maliyet) * 100;
};

export const SEKTOR_FORMLARI: SektorFormu[] = [
  {
    tablo: 'cig_sut_ekonomik_gostergeler',
    ad: 'Çiğ Süt — Ekonomik Göstergeler',
    aciklama: 'USK tavsiye fiyatı, üretim maliyeti ve yem fiyatları',
    donemAlani: 'tarih',
    girdiler: [
      { alan: 'usk_tavsiye_fiyat_tl_lt', etiket: 'USK tavsiye fiyatı', birim: '₺/lt', zorunlu: true },
      { alan: 'uretim_maliyeti_tl_lt', etiket: 'Üretim maliyeti', birim: '₺/lt', zorunlu: true },
      { alan: 'sut_yemi_19hp', etiket: 'Süt yemi (%19 HP)', birim: '₺/kg', zorunlu: true },
      { alan: 'misir_silaji', etiket: 'Mısır silajı', birim: '₺/kg' },
      { alan: 'yonca', etiket: 'Yonca (kuru ot)', birim: '₺/kg' },
      { alan: 'saman', etiket: 'Saman', birim: '₺/kg' },
      { alan: 'litre_basina_destek_tl', etiket: 'Litre başına destek', birim: '₺' },
    ],
    turetilenler: [
      {
        alan: 'sut_yem_paritesi', etiket: 'Süt/Yem paritesi',
        formul: 'USK fiyatı ÷ süt yemi',
        hesapla: (g) => bol(g.usk_tavsiye_fiyat_tl_lt, g.sut_yemi_19hp),
      },
      {
        alan: 'sut_yem_paritesi_destek_dahil', etiket: 'Süt/Yem paritesi (destek dâhil)',
        formul: '(USK fiyatı + destek) ÷ süt yemi',
        hesapla: (g) => bol(
          g.usk_tavsiye_fiyat_tl_lt == null ? null : g.usk_tavsiye_fiyat_tl_lt + (g.litre_basina_destek_tl ?? 0),
          g.sut_yemi_19hp,
        ),
      },
      {
        alan: 'fiyat_maliyet_farki_tl_lt', etiket: 'Fiyat − maliyet farkı', birim: '₺/lt',
        formul: 'USK fiyatı − üretim maliyeti',
        hesapla: (g) => fark(g.usk_tavsiye_fiyat_tl_lt, g.uretim_maliyeti_tl_lt),
      },
      {
        alan: 'fiyat_maliyet_farki_destek_dahil_tl_lt', etiket: 'Fark (destek dâhil)', birim: '₺/lt',
        formul: 'fark + destek',
        hesapla: (g) => {
          const f = fark(g.usk_tavsiye_fiyat_tl_lt, g.uretim_maliyeti_tl_lt);
          return f == null ? null : f + (g.litre_basina_destek_tl ?? 0);
        },
      },
      {
        alan: 'karlilik', etiket: 'Kârlılık', birim: '%',
        formul: 'fark ÷ maliyet × 100',
        hesapla: (g) => karlilik(g.usk_tavsiye_fiyat_tl_lt, g.uretim_maliyeti_tl_lt),
      },
    ],
  },
  {
    tablo: 'kirmizi_et_ekonomik_gostergeler',
    ad: 'Kırmızı Et — Ekonomik Göstergeler',
    aciklama: 'Dana karkas fiyat/maliyeti, besilik ve yem fiyatları',
    donemAlani: 'tarih',
    girdiler: [
      { alan: 'dana_karkas_fiyati_tl_kg', etiket: 'Dana karkas fiyatı', birim: '₺/kg', zorunlu: true },
      { alan: 'dana_karkas_maliyet_tl_kg', etiket: 'Dana karkas maliyeti', birim: '₺/kg', zorunlu: true },
      { alan: 'besi_yemi_fiyati_tl_kg', etiket: 'Besi yemi fiyatı', birim: '₺/kg', zorunlu: true },
      { alan: 'besilik_dana_fiyati_tl_kg', etiket: 'Besilik dana fiyatı', birim: '₺/kg' },
      { alan: 'kuzu_karkas_fiyati_tl_kg', etiket: 'Kuzu karkas fiyatı', birim: '₺/kg' },
      { alan: 'besilik_kucukbas_fiyati_tl_kg', etiket: 'Besilik küçükbaş fiyatı', birim: '₺/kg' },
      { alan: 'dolar_kuru_tl', etiket: 'Dolar kuru', birim: '₺' },
    ],
    turetilenler: [
      {
        alan: 'karkas_paritesi', etiket: 'Karkas paritesi',
        formul: 'dana karkas fiyatı ÷ besi yemi',
        hesapla: (g) => bol(g.dana_karkas_fiyati_tl_kg, g.besi_yemi_fiyati_tl_kg),
      },
      {
        alan: 'dana_karkas_fiyat_maliyet_farki_tl_kg', etiket: 'Fiyat − maliyet farkı', birim: '₺/kg',
        formul: 'karkas fiyatı − karkas maliyeti',
        hesapla: (g) => fark(g.dana_karkas_fiyati_tl_kg, g.dana_karkas_maliyet_tl_kg),
      },
      {
        alan: 'karlilik', etiket: 'Kârlılık', birim: '%',
        formul: 'fark ÷ maliyet × 100',
        hesapla: (g) => karlilik(g.dana_karkas_fiyati_tl_kg, g.dana_karkas_maliyet_tl_kg),
      },
    ],
  },
  {
    tablo: 'kanatli_eti_maliyet_fiyat',
    ad: 'Kanatlı Eti — Maliyet ve Fiyat',
    aciklama: 'Piliç eti üretici/tüketici fiyatı, maliyet ve yem',
    donemAlani: 'tarih',
    girdiler: [
      { alan: 'uretici_fiyati_tl_kg', etiket: 'Üretici fiyatı', birim: '₺/kg', zorunlu: true },
      { alan: 'maliyet_tl_kg', etiket: 'Maliyet', birim: '₺/kg', zorunlu: true },
      { alan: 'yem_fiyati_tl_kg', etiket: 'Yem fiyatı', birim: '₺/kg', zorunlu: true },
      { alan: 'tuketici_fiyati_tl_kg', etiket: 'Tüketici fiyatı', birim: '₺/kg' },
    ],
    turetilenler: [
      {
        alan: 'yem_paritesi', etiket: 'Yem paritesi',
        formul: 'üretici fiyatı ÷ yem fiyatı',
        hesapla: (g) => bol(g.uretici_fiyati_tl_kg, g.yem_fiyati_tl_kg),
      },
      {
        alan: 'fiyat_maliyet_farki_tl_kg', etiket: 'Fiyat − maliyet farkı', birim: '₺/kg',
        formul: 'üretici fiyatı − maliyet',
        hesapla: (g) => fark(g.uretici_fiyati_tl_kg, g.maliyet_tl_kg),
      },
      {
        alan: 'karlilik', etiket: 'Kârlılık', birim: '%',
        formul: 'fark ÷ maliyet × 100',
        hesapla: (g) => karlilik(g.uretici_fiyati_tl_kg, g.maliyet_tl_kg),
      },
    ],
  },
  {
    tablo: 'yumurta_maliyet_fiyat',
    ad: 'Yumurta — Maliyet ve Fiyat',
    aciklama: 'Yumurta üretici/tüketici fiyatı, maliyet, yem ve ihracat',
    donemAlani: 'tarih',
    girdiler: [
      { alan: 'uretici_fiyati_tl_kg', etiket: 'Üretici fiyatı', birim: '₺/adet', zorunlu: true },
      { alan: 'maliyet_tl_kg', etiket: 'Maliyet', birim: '₺/adet', zorunlu: true },
      { alan: 'yem_fiyati_tl_kg', etiket: 'Yem fiyatı', birim: '₺/kg', zorunlu: true },
      { alan: 'tuketici_fiyati_tl', etiket: 'Tüketici fiyatı', birim: '₺' },
      { alan: 'sofralik_ihracat_miktari_bin_adet', etiket: 'Sofralık ihracat', birim: 'bin adet' },
      { alan: 'sofralik_ihracat_dolar', etiket: 'Sofralık ihracat', birim: '$' },
      { alan: 'kuluckalik_ihracat_miktari_bin_adet', etiket: 'Kuluçkalık ihracat', birim: 'bin adet' },
      { alan: 'kuluckalik_ihracat_dolar', etiket: 'Kuluçkalık ihracat', birim: '$' },
    ],
    turetilenler: [
      {
        alan: 'yem_paritesi', etiket: 'Yem paritesi',
        formul: 'üretici fiyatı ÷ yem fiyatı',
        hesapla: (g) => bol(g.uretici_fiyati_tl_kg, g.yem_fiyati_tl_kg),
      },
      {
        alan: 'uretici_fiyati_maliyet_farki_tl_kg', etiket: 'Fiyat − maliyet farkı', birim: '₺',
        formul: 'üretici fiyatı − maliyet',
        hesapla: (g) => fark(g.uretici_fiyati_tl_kg, g.maliyet_tl_kg),
      },
      {
        alan: 'karlilik', etiket: 'Kârlılık', birim: '%',
        formul: 'fark ÷ maliyet × 100',
        hesapla: (g) => karlilik(g.uretici_fiyati_tl_kg, g.maliyet_tl_kg),
      },
      {
        alan: 'toplam_ihracat_miktari_bin_adet', etiket: 'Toplam ihracat', birim: 'bin adet',
        formul: 'sofralık + kuluçkalık',
        hesapla: (g) => (g.sofralik_ihracat_miktari_bin_adet == null && g.kuluckalik_ihracat_miktari_bin_adet == null)
          ? null
          : (g.sofralik_ihracat_miktari_bin_adet ?? 0) + (g.kuluckalik_ihracat_miktari_bin_adet ?? 0),
      },
      {
        alan: 'toplam_ihracat_dolar', etiket: 'Toplam ihracat', birim: '$',
        formul: 'sofralık + kuluçkalık',
        hesapla: (g) => (g.sofralik_ihracat_dolar == null && g.kuluckalik_ihracat_dolar == null)
          ? null
          : (g.sofralik_ihracat_dolar ?? 0) + (g.kuluckalik_ihracat_dolar ?? 0),
      },
      {
        alan: 'sofralik_birim_fiyat_dolar', etiket: 'Sofralık birim fiyat', birim: '$/bin adet',
        formul: 'sofralık $ ÷ sofralık miktar',
        hesapla: (g) => bol(g.sofralik_ihracat_dolar, g.sofralik_ihracat_miktari_bin_adet),
      },
      {
        alan: 'kuluckalik_birim_fiyat_dolar', etiket: 'Kuluçkalık birim fiyat', birim: '$/bin adet',
        formul: 'kuluçkalık $ ÷ kuluçkalık miktar',
        hesapla: (g) => bol(g.kuluckalik_ihracat_dolar, g.kuluckalik_ihracat_miktari_bin_adet),
      },
    ],
  },
];
