/* ─── renk paleti ─── */
export const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#6366f1', '#d946ef', '#0ea5e9', '#22d3ee', '#a3e635',
  '#fbbf24', '#fb923c', '#f472b6', '#818cf8', '#2dd4bf'
];

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

export const YEARS = Array.from({ length: 21 }, (_, i) => 2024 - i);

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
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toLocaleString('tr-TR');
}
export function fmtShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
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
  icon: string;
  urunGrup: string;
  urunFilter?: string[];
  defaultProducts?: string[];
  showTreeMetrics?: boolean;
  extraSection?: React.ReactNode;
}
