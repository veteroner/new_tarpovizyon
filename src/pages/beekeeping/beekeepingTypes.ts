export type BeekeeperYearData = {
  il: string;
  '2013': number;
  '2014': number;
  '2015': number;
  '2016': number;
  '2017': number;
  '2018': number;
  '2019': number;
  '2020': number;
  '2021': number;
  '2022': number;
  '2023': number;
};

export type ProvinceData = {
  il: string;
  balin_cesiti: string;
  aricilik_yapan_isletme_sayisi_adet: number;
  yeni_kovan_sayisi_adet: number;
  eski_kovan_sayisi_adet: number | string;
  toplam_kovan_adet: number;
  bal_uretimi_ton: number;
  balmumu_uretimi_ton: number;
  bal_verimi_kg: number;
};

export type YearTrendData = {
  year: string;
  beekeepers: number;
  totalHives: number;
  newHives: number;
  oldHives: number;
};

export type TuikKovanYearData = {
  year: string;
  eskiTip: number;
  yeniTip: number;
  toplam: number;
  balmumu: number;
};

export type TuikProvinceKovan = {
  il: string;
  eskiTip: number;
  yeniTip: number;
  toplam: number;
  balmumu: number;
};

export type TuikKovanKpi = {
  latest: TuikKovanYearData;
  prev: TuikKovanYearData | null;
  yoy: number;
  balmumuYoy: number;
  cagr: number;
  peak: TuikKovanYearData;
  eskiPay: number;
};

export type KpiMetrics = {
  totalBeekeepers: number;
  beekeeperGrowth: number;
  totalHives: number;
  totalHoneyProduction: number;
  totalBeeswaxProduction: number;
  avgYield: number;
};

export const COLORS = {
  primary: '#f59e0b',
  secondary: '#fbbf24',
  accent: '#d97706',
  success: '#10b981',
  danger: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
  cyan: '#06b6d4',
  emerald: '#10b981',
};

export const HONEY_COLORS = [
  '#f59e0b', '#fbbf24', '#d97706', '#fb923c', '#fdba74',
  '#fed7aa', '#ea580c', '#c2410c', '#92400e', '#78350f',
];

export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const str = String(value || '').trim().replace(/[^\d.,-]/g, '');
  if (!str || str === '-') return 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

export function formatNumber(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}

export function formatTon(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
}
