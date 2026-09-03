import { kisa } from '../../utils/sayi';
/**
 * İl × yıl arıcı sayısı.
 *
 * Yıllar 2013…2023 diye TEK TEK YAZILIYDI. Uca 2024 ve 2025 eklendiğinde
 * tip onları tanımıyordu; `row[sonYil]` derlenmiyor, kod da mecburen
 * `row['2023']` gibi sabitlere düşüyordu. Dizin imzasıyla yeni yıl
 * kendiliğinden geçerli oluyor — tipin her yıl elle güncellenmesi gerekmiyor.
 */
export type BeekeeperYearData = {
  il: string;
  /** 'YYYY' → o yılın arıcı sayısı. */
  [yil: string]: number | string;
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
  return kisa(value);
}

export function formatTon(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
}
