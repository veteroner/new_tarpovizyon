import { kisa, eksen } from '../../utils/sayi';
import type { RegionTotal } from '../../components/TurkeyHeatMap';

// Constants
export const TABLE_NAME = 'tuik_hayvancilik_canlihayvan';
/*
 * Yıl listesi VERİYE göre, takvime göre değil.
 *
 * `tuik_hayvancilik_canlihayvan` tablosunda y2004…y2025 sütunları var ve
 * 2025 il düzeyinde DOLU (ölçüldü: Sığır 17,5 M · Koyun 46,5 M · Keçi 11,2 M).
 * Liste 21'de kalınca 2025 verisi yüklü olmasına rağmen sayfada seçilemiyordu.
 *
 * Bilinçli olarak `new Date().getFullYear()` KULLANILMIYOR: TÜİK verisi bir
 * yıl gecikmeli geliyor, takvimden türetmek henüz veri olmayan boş yıllar
 * gösterirdi. Yeni yıl tabloya düştüğünde bu sayı elle artırılır.
 */
export const YEARS = Array.from({ length: 22 }, (_, i) => 2004 + i); // 2004-2025
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
  return kisa(value);
}

export function formatShort(value: number): string {
  return eksen(value);
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
