import { SERIES } from '../../utils/chartColors';
import { kisa, eksen } from '../../utils/sayi';
/* ─── renk paleti ─── */
export const COLORS = SERIES;  // merkezî palet; döngü YOK, 8'den sonra seriyi katla

/* ─── TÜİK 12 istatistiki bölge ─── */
export const TURKEY_REGIONS: Record<string, string[]> = {
  'Akdeniz': ['ADANA', 'ANTALYA', 'BURDUR', 'HATAY', 'ISPARTA', 'K.MARAŞ', 'KARAMAN', 'MERSİN', 'OSMANİYE'],
  'Batı Anadolu': ['AFYON', 'ANKARA', 'ESKİŞEHİR', 'KARAMAN', 'KONYA', 'KÜTAHYA', 'UŞAK'],
  'Batı Karadeniz': ['AMASYA', 'BARTIN', 'ÇANKIRI', 'ÇORUM', 'KARABÜK', 'KASTAMONU', 'SAMSUN', 'SİNOP', 'TOKAT', 'ZONGULDAK'],
  'Batı Marmara': ['BALIKESİR', 'ÇANAKKALE', 'EDİRNE', 'KIRKLARELİ', 'TEKİRDAĞ'],
  'Doğu Karadeniz': ['ARTVİN', 'GİRESUN', 'GÜMÜŞHANE', 'ORDU', 'RİZE', 'TRABZON'],
  'Doğu Marmara': ['BİLECİK', 'BOLU', 'BURSA', 'DÜZCE', 'ESKİŞEHİR', 'KOCAELİ', 'SAKARYA', 'YALOVA'],
  'Ege': ['AYDIN', 'DENİZLİ', 'İZMİR', 'MANISA', 'MUĞLA'],
  'Güneydoğu Anadolu': ['ADIYAMAN', 'BATMAN', 'DİYARBAKIR', 'GAZİANTEP', 'KİLİS', 'MARDİN', 'SİİRT', 'ŞANLIURFA', 'ŞIRNAK'],
  'İstanbul': ['İSTANBUL'],
  'Kuzeydoğu Anadolu': ['AĞRI', 'ARDAHAN', 'BAYBURT', 'ERZURUM', 'ERZURUM', 'IĞDIR', 'KARS'],
  'Orta Anadolu': ['AKSARAY', 'KAYSERİ', 'KIRIKKALE', 'KIRŞEHİR', 'NEVŞEHİR', 'NİĞDE', 'SİVAS', 'YOZGAT'],
  'Ortadoğu Anadolu': ['BİNGÖL', 'BİTLİS', 'ELAZIĞ', 'HAKKARİ', 'MALATYA', 'MUŞ', 'TUNCELİ', 'VAN'],
};

/**
 * Yıl listesi.
 *
 * ─── ELLE YAZILI SON YIL SORUNU ────────────────────────────────────────────
 * Burada `2024 - i` yazıyordu ve uzunluk 21'e sabitti. TÜİK 2025'i yayımlayıp
 * veri D1'e girdiğinde bile filtre 2024'te kalıyordu — sayfa taze veriyi
 * ÇEKEMİYORDU, çünkü sorgu `SUM(y2004)…SUM(y2024)` diye YEARS'tan üretiliyor.
 * Yani tek bir sabit, on bir bitkisel sayfayı birden eskitiyordu.
 *
 * ─── 2025 İL ÜRETİMİ ARTIK VAR ─────────────────────────────────────────────
 * Bir süre y2025 yalnızca Türkiye satırlarında (duzeykod=1) doluydu: TÜİK'in
 * indirilebilir tablolarında il×üretim yok, il kırılımı MEDAS'ın dinamik
 * veritabanında. O kırılım pivot dışa aktarımından yüklendi — 7.683 il satırı,
 * bkz. scripts/medas-pivot-il-yukle.mjs. Artık 2025 hem ülke hem il düzeyinde
 * tam ve varsayılan olabiliyor.
 */
export const ILK_YIL = 2004;

export const SON_YIL = 2025;

/*
 * ─── O YIL YAYIMLANMAMIŞ GÖSTERGELER ───────────────────────────────────────
 * ŞU AN BOŞ — ama mekanizma duruyor.
 *
 * 2025 üretimi il düzeyinde MEDAS pivot dışa aktarımından yüklendi
 * (scripts/medas-pivot-il-yukle.mjs), yani artık kapatılacak bir gösterge-yıl
 * çifti yok. Liste silinmedi çünkü durum her yıl tekrarlıyor: TÜİK ekim
 * alanını ilkbaharda, ÜRETİMİ hasat sonrası yayımlıyor. 2026 ilkbaharında
 * y2026 ekilen alanla dolunca üretim yine aylarca boş kalacak; o zaman buraya
 * `2026: ['Üretim']` yazmak yeterli.
 */
export const YIL_DISI_UNSURLAR: Record<number, string[]> = {};

/**
 * Kısıt GÖSTERGEDE değil YILDA.
 *
 * İlk denemede yayımlanmamış göstergeyi listeden düşürmüştüm; o zaman 2025'te
 * "Üretim" seçeneği tamamen kayboluyordu ve sayfanın asıl ölçütü yokmuş gibi
 * duruyordu. Doğrusu tersi: gösterge listesi TAM kalıyor, yayımlanmamış YIL
 * o gösterge için kapatılıyor. Eksik olan yıl, gösterge değil.
 */
export const yayimlandiMi = (unsur: string, yil: number): boolean =>
  !(YIL_DISI_UNSURLAR[yil] ?? []).includes(unsur);

/** O gösterge için veri bulunan en son yıl. */
export function sonYayimYili(unsur: string): number {
  let y = SON_YIL;
  while (y > ILK_YIL && !yayimlandiMi(unsur, y)) y -= 1;
  return y;
}

/** Açılışta seçilecek gösterge: EN TAZE yılda yayımlanmış ilk seçenek. */
export function acilisGostergesi(secenekler: { id: string }[], yil: number): string {
  return (secenekler.find((o) => yayimlandiMi(o.id, yil)) ?? secenekler[0])?.id;
}

/** Açılışta seçili yıl. */
export const VARSAYILAN_YIL = SON_YIL;

export const YEARS = Array.from(
  { length: SON_YIL - ILK_YIL + 1 },
  (_, i) => SON_YIL - i,
);

export const UNSUR_OPTIONS = [
  { id: 'Üretim', label: 'Üretim (Ton)', birim: 'ton' },
  { id: 'Ekilen Alan', label: 'Ekilen Alan (Dekar)', birim: 'dekar' },
  { id: 'Hasat Edilen Alan', label: 'Hasat Edilen Alan (Dekar)', birim: 'dekar' },
  { id: 'Verim', label: 'Verim (Kg/Dekar)', birim: 'kg/dek' },
  { id: 'Meyve Veren Yaşta Ağaç Sayısı', label: 'Meyve Veren Ağaç (Adet)', birim: 'adet' },
  { id: 'Meyve Vermeyen Yaşta Ağaç Sayısı', label: 'Meyve Vermeyen Ağaç (Adet)', birim: 'adet' },
  { id: 'Toplu Meyveliklerin Alanı', label: 'Meyvelik Alanı (Dekar)', birim: 'dekar' },
];

/* ─── yardımcı fonksiyonlar ─── */
export function fmt(value: number): string {
  return kisa(value);
}
export function fmtShort(value: number): string {
  return eksen(value);
}
export function pct(a: number, b: number): number {
  return b !== 0 ? ((a - b) / b) * 100 : 0;
}
export const buildSumCols = () =>
  YEARS.map(y => `SUM(CAST(y${y} AS DECIMAL(20,2))) as v${y}`).join(',');

/* ─── types ─── */
export interface CityRow { name: string; value: number; share: string; fill: string; [key: string]: string | number }
export interface YearRow { year: string; value: number; change?: number }
export interface RegionRow { name: string; value: number }
export interface ProductRow { name: string; value: number; fill: string }
export interface ScatterRow { name: string; area: number; production: number; verim: number }
export interface DistrictRow { name: string; value: number; fill: string }
export interface YieldTrendRow {
  year: string;
  uretim: number;
  alan: number;
  verim: number;
  alanEtkisi?: number;
  verimEtkisi?: number;
  etkilesim?: number;
  uretimDegisimi?: number;
}

/* ─── Props ─── */
export interface TuikPlantCategoryPageProps {
  title: string;
  subtitle: string;
  /* Emoji DEĞİL: lucide bileşeni. Emoji glifi işletim sistemine göre
     değişiyor ve ekran okuyucuda ad olarak okunuyor. */
  icon: React.ReactNode;
  urunGrup: string;
  urunFilter?: string[];
  defaultProducts?: string[];
  showTreeMetrics?: boolean;
  extraSection?: React.ReactNode;
}
