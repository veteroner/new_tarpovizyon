export const COLORS = {
  milk: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  meat: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  egg: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  grain: ['#eab308', '#fde047', '#fef08a', '#fef9c3'],
  fruit: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
  economy: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  land: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'],
  general: ['#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
};

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

export function translateMilkItem(item: string): string {
  const t: Record<string, string> = {
    'Raw milk of cattle': 'İnek Sütü',
    'Raw milk of buffalo': 'Manda Sütü',
    'Raw milk of goats': 'Keçi Sütü',
    'Raw milk of sheep': 'Koyun Sütü',
    'Raw milk of camel': 'Deve Sütü',
  };
  return t[item] || item.split(',')[0];
}

export function translateMeatItem(item: string): string {
  const t: Record<string, string> = {
    'Meat of cattle with the bone, fresh or chilled': 'Sığır Eti',
    'Meat of sheep, fresh or chilled': 'Koyun Eti',
    'Meat of goat, fresh or chilled': 'Keçi Eti',
    'Meat of buffalo, fresh or chilled': 'Manda Eti',
    'Meat of chickens, fresh or chilled': 'Piliç Eti',
    'Meat of turkeys, fresh or chilled': 'Hindi Eti',
  };
  return t[item] || item;
}

export function translateEggItem(item: string): string {
  const t: Record<string, string> = {
    'Hen eggs in shell, fresh': 'Tavuk Yumurtası',
    'Eggs from other birds in shell, fresh, n.e.c.': 'Diğer Kuş Yumurtaları',
  };
  return t[item] || item;
}

export interface DataItem {
  name: string;
  value: number;
  fill: string;
  unit?: string;
  [key: string]: string | number | undefined;
}

export interface YearlyData {
  year: string;
  [key: string]: string | number;
}

export interface OverviewData {
  population: number;
  ruralPopulation: number;
  urbanPopulation: number;
  gdp: number;
  gdpPerCapita: number;
  agriculturalGDP: number;
  agriculturalGDPShare: number;
  agriculturalEmployment: number;
  agriculturalEmploymentShare: number;
  totalEmployment: number;
  agriculturalLand: number;
  totalLand: number;
  landUseData: DataItem[];
  milkProduction: {
    total: number;
    cattle: number;
    sheep: number;
    goat: number;
    buffalo: number;
    breakdown: DataItem[];
    yearly: YearlyData[];
  };
  meatProduction: {
    total: number;
    redMeat: number;
    whiteMeat: number;
    cattle: number;
    sheep: number;
    goat: number;
    buffalo: number;
    chicken: number;
    turkey: number;
    breakdown: DataItem[];
    yearly: YearlyData[];
  };
  eggProduction: {
    total: number;
    chicken: number;
    other: number;
    breakdown: DataItem[];
    yearly: YearlyData[];
  };
  livestockStocks: {
    cattle: number;
    sheep: number;
    goat: number;
    poultry: number;
    breakdown: DataItem[];
    regional: {
      cattle: DataItem[];
      sheep: DataItem[];
      goat: DataItem[];
      poultry: DataItem[];
    };
  };
}
