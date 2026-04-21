import type { RegionTotal } from '../../components/TurkeyHeatMap';

// Constants
export const TABLE_NAME = 'tuik_hayvancilik_canlihayvan';
export const YEARS = Array.from({ length: 21 }, (_, i) => 2004 + i); // 2004-2024
export const YEAR_COLUMNS = YEARS.map(y => `y${y}`);

export const ANIMAL_GROUPS = [
  { id: 'Sığır', name: 'Sığır (Büyükbaş)', icon: '🐄', color: '#22c55e' },
  { id: 'Manda', name: 'Manda', icon: '🐃', color: '#14b8a6' },
  { id: 'Koyun', name: 'Koyun', icon: '🐑', color: '#3b82f6' },
  { id: 'Keçi', name: 'Keçi', icon: '🐐', color: '#8b5cf6' },
  { id: 'Tavuk', name: 'Tavuk', icon: '🐔', color: '#f59e0b' },
  { id: 'Hindi', name: 'Hindi', icon: '🦃', color: '#ef4444' },
  { id: 'Ördek', name: 'Ördek', icon: '🦆', color: '#06b6d4' },
  { id: 'Kaz', name: 'Kaz', icon: '🪿', color: '#84cc16' },
  { id: 'At', name: 'At', icon: '🐴', color: '#f97316' },
  { id: 'Eşek', name: 'Eşek', icon: '🫏', color: '#6366f1' },
  { id: 'Katır', name: 'Katır', icon: '🐴', color: '#a3e635' },
  { id: 'Deve', name: 'Deve', icon: '🐪', color: '#d946ef' },
  { id: 'Domuz', name: 'Domuz', icon: '🐷', color: '#ec4899' },
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

export type TabId = 'overview' | 'districts' | 'trends' | 'comparison' | 'correlation' | 'forecast';

// Types
export interface ProvincialData {
  province: string;
  region: string;
  totalPopulation: number;
  growthRate: number;
  dominantAnimal: string;
  animalCounts: Record<string, number>;
  marketShare: number;
  rank: number;
}

export interface DistrictData {
  district: string;
  province: string;
  totalPopulation: number;
  provinceShare: number;
  dominantAnimal: string;
  growthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  maxAnimalCount?: number;
}

export interface YearlyTrendData {
  year: number;
  value: number;
}

export interface RegionalSummary {
  region: string;
  totalPopulation: number;
  provinceCount: number;
  averagePerProvince: number;
  topAnimal: string;
  growthRate: number;
  color: string;
}

export interface AggregatedMetrics {
  totalPopulation: number;
  provinceCount: number;
  districtCount: number;
  animalTypeCount: number;
  avgGrowthRate: number;
  topProvince: string;
  fastestGrowingProvince: string;
  diversityScore: number;
}

// Utility Functions
export function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + ' Mly';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + ' Mln';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + ' Bin';
  return value.toFixed(0);
}

export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export function getAnimalColor(animalName: string): string {
  const animal = ANIMAL_GROUPS.find(a => a.id === animalName);
  return animal?.color || '#64748b';
}

export function getAnimalIcon(animalName: string): string {
  const animal = ANIMAL_GROUPS.find(a => a.id === animalName);
  return animal?.icon || '🐾';
}

export const DEFAULT_METRICS: AggregatedMetrics = {
  totalPopulation: 0,
  provinceCount: 0,
  districtCount: 0,
  animalTypeCount: 0,
  avgGrowthRate: 0,
  topProvince: '',
  fastestGrowingProvince: '',
  diversityScore: 0
};

export type { RegionTotal };
