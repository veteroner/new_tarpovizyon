import type { RegionTotal } from '../../components/TurkeyHeatMap';

// Re-export for section files
export type { RegionTotal };

// ─── Constants ───
export const TABLE_NAME = 'tuik_bitkisel_uretim';
export const YEARS = Array.from({ length: 21 }, (_, i) => 2004 + i); // 2004-2024

export const DEFAULT_PRODUCTS = [
  'Buğday, Durum Buğdayı Hariç',
  'Mısır',
  'Ayçiçeği Tohumu (Yağlık)'
];

export const UNSUR_OPTIONS = [
  { id: 'Üretim', label: 'Üretim', unit: 'ton' },
  { id: 'Ekilen Alan', label: 'Ekilen Alan', unit: 'dekar' },
  { id: 'Verim', label: 'Verim', unit: 'kg/dekar' },
];

export const REGION_COLORS: Record<string, string> = {
  'Marmara': '#3b82f6',
  'Ege': '#22c55e',
  'Akdeniz': '#f59e0b',
  'İç Anadolu': '#ef4444',
  'Karadeniz': '#8b5cf6',
  'Doğu Anadolu': '#ec4899',
  'Güneydoğu Anadolu': '#14b8a6'
};

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

// ─── Types ───
export interface ProvincialData {
  province: string;
  region: string;
  totalProduction: number;
  growthRate: number;
  dominantProduct: string;
  productAmounts: Record<string, number>;
  marketShare: number;
  rank: number;
}

export interface DistrictData {
  district: string;
  province: string;
  totalProduction: number;
  provinceShare: number;
  dominantProduct: string;
  growthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface YearlyTrendData {
  year: number;
  value: number;
}

export interface RegionalSummary {
  region: string;
  totalProduction: number;
  provinceCount: number;
  averagePerProvince: number;
  growthRate: number;
  color: string;
}

export interface AggregatedMetrics {
  totalProduction: number;
  leaderProvince: string;
  fastestGrowing: string;
  activeProvinces: number;
  avgGrowthRate: number;
}

export const DEFAULT_METRICS: AggregatedMetrics = {
  totalProduction: 0,
  leaderProvince: '',
  fastestGrowing: '',
  activeProvinces: 0,
  avgGrowthRate: 0
};

// ─── Utility Functions ───
export const formatNumber = (value: number): string => {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
};

export const formatShort = (value: number): string => {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
};

export const calculateCAGR = (startValue: number, endValue: number, years: number): number => {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

export const getProductColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
};

export const getProductIcon = (name: string): string => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('buğday')) return '🌾';
  if (nameLower.includes('arpa')) return '🌾';
  if (nameLower.includes('mısır')) return '🌽';
  if (nameLower.includes('çeltik')) return '🌾';
  if (nameLower.includes('ayçiçeği')) return '🌻';
  if (nameLower.includes('pamuk')) return '☁️';
  if (nameLower.includes('domates')) return '🍅';
  if (nameLower.includes('patates')) return '🥔';
  if (nameLower.includes('soğan')) return '🧅';
  if (nameLower.includes('pancar')) return '🥕';
  if (nameLower.includes('elma')) return '🍎';
  if (nameLower.includes('portakal')) return '🍊';
  if (nameLower.includes('üzüm')) return '🍇';
  if (nameLower.includes('meyve')) return '🍎';
  if (nameLower.includes('sebze')) return '🥬';
  return '🌾';
};
