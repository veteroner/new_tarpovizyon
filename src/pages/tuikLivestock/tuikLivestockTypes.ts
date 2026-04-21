import { getRegionByProvince } from '../../utils/productionCategories';

export const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#0ea5e9', '#d946ef', '#a3e635'];

export const REGION_COLORS: Record<string, string> = {
  'Marmara': '#3b82f6',
  'Ege': '#22c55e',
  'Akdeniz': '#f59e0b',
  'İç Anadolu': '#ef4444',
  'Karadeniz': '#8b5cf6',
  'Doğu Anadolu': '#ec4899',
  'Güneydoğu Anadolu': '#14b8a6'
};

export function getRegion(cityName: string): string {
  return getRegionByProvince(cityName);
}

export interface YearlyDataItem {
  year: string;
  value: number;
}

export interface CityDataItem {
  name: string;
  value: number;
  share: string;
  fill: string;
}

export interface CategoryDataItem {
  name: string;
  value: number;
}

export interface RegionalData {
  region: string;
  total: number;
  cities: number;
  average: number;
  share: number;
}

export interface CorrelationData {
  animal: string;
  production?: number;
  correlation?: number;
  link?: string;
}

export const ANIMAL_GROUPS = [
  { id: 'Sığır', name: 'Sığır (Büyükbaş)', icon: '🐄' },
  { id: 'Manda', name: 'Manda', icon: '🐃' },
  { id: 'Koyun', name: 'Koyun', icon: '🐑' },
  { id: 'Keçi', name: 'Keçi', icon: '🐐' },
  { id: 'Tavuk', name: 'Tavuk', icon: '🐔' },
  { id: 'Hindi', name: 'Hindi', icon: '🦃' },
  { id: 'Ördek', name: 'Ördek', icon: '🦆' },
  { id: 'Kaz', name: 'Kaz', icon: '🪿' },
  { id: 'At', name: 'At', icon: '🐴' },
  { id: 'Eşek', name: 'Eşek', icon: '🫏' },
  { id: 'Katır', name: 'Katır', icon: '🐴' },
  { id: 'Deve', name: 'Deve', icon: '🐪' },
  { id: 'Domuz', name: 'Domuz', icon: '🐷' },
];

export const TABLE_NAME = 'tuik_hayvancilik_canlihayvan';
export const YEARS = Array.from({ length: 22 }, (_, i) => 2004 + i); // 2004-2025
export const YEAR_COLUMNS = YEARS.map(y => `y${y}`);

export function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssRes = data.reduce((sum, d) => sum + Math.pow(d.y - (slope * d.x + intercept), 2), 0);
  const ssTot = data.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0);
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  return { slope, intercept, r2 };
}

export function detectAnomalies(data: number[]): { index: number; value: number; deviation: number }[] {
  if (data.length < 3) return [];
  const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
  const stdDev = Math.sqrt(data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length);
  return data.map((value, index) => ({
    index, value,
    deviation: Math.abs(value - mean) / (stdDev || 1)
  })).filter(item => item.deviation > 2);
}
