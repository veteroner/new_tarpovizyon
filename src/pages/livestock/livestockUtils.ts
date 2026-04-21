export const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

export type Tab = 'overview' | 'stocks' | 'primary' | 'processed' | 'efficiency' | 'predictions';
export type PrimaryTab = 'meat' | 'milk' | 'eggs' | 'other';

export interface DataItem {
  [key: string]: string | number;
}

export const ANIMAL_ITEMS = [
  { id: 'Sığır', name: 'Cattle', nameTR: 'Sığır' },
  { id: 'Koyun', name: 'Sheep', nameTR: 'Koyun' },
  { id: 'Keçi', name: 'Goats', nameTR: 'Keçi' },
  { id: 'Domuz', name: 'Swine / pigs', nameTR: 'Domuz' },
  { id: 'Tavuk', name: 'Chickens', nameTR: 'Tavuk' },
  { id: 'Manda', name: 'Buffalo', nameTR: 'Manda' },
  { id: 'At', name: 'Horses', nameTR: 'At' },
  { id: 'Hindi', name: 'Turkeys', nameTR: 'Hindi' },
  { id: 'Ördek', name: 'Ducks', nameTR: 'Ördek' },
];

export const EXCLUDED_AREAS = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM')";
export const EXCLUDED_FULL = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";

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
