import { SERIES } from '../../utils/chartColors';
import { kisa, eksen } from '../../utils/sayi';
export const COLORS = SERIES;  // merkezî palet; döngü YOK, 8'den sonra seriyi katla

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

// Çin: üretim tablolarında düz 'China' satırı yok, yalnızca mainland/Taiwan/HK/Macao
// var; mainland'i dışlamak dünyanın en büyük üreticisini siliyordu. Toplamı olan
// tablolarda ise hem 'China' hem bileşenleri kalıp mükerrer sayılıyordu. Doğrusu:
// bileşenleri tut, TOPLAMI ('China') dışla.
export const EXCLUDED_AREAS = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM')";
export const EXCLUDED_FULL = "('World','WORLD','Dünya','DÜNYA','Dunya','Total','TOTAL','Toplam','TOPLAM','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','Sub-Saharan Africa','Latin America and the Caribbean','China')";

export function formatNumber(value: number): string {
  return kisa(value);
}

export function formatShort(value: number): string {
  return eksen(value);
}
