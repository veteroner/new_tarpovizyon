import type { RegionTotal } from '../../components/TurkeyHeatMap';

export type YearPoint = {
  year: number;
  poultryTon: number;
};

export type TuikTab = 'overview' | 'production' | 'hatch' | 'projection';

export type PoultryEconomicData = {
  tarih: string;
  etlik_pilic_maliyet_tl_kg: number;
  uretici_fiyati_tl_kg: number;
  etlik_pilic_yemi_tl_kg: number;
  tuketici_fiyati_tl_kg: number;
  karlilik: number;
  uretici_fiyati_maliyet_farki_tl_kg: number;
  parite_etlik_pilic_yem_paritesi: number;
};

export type TuikChickenData = {
  year: string;
  slaughtered: number;
  meatProduction: number;
  hatchedEggs: number;
  producedChicks: number;
  hatchRate: number;
  yieldPerBird: number;
};

export type MonthlyData = {
  month: string;
  value: number;
};

export type TuikTurkeyMeatData = {
  year: string;
  production: number;
};

export type PoultryMapType = 'total' | 'broiler' | 'layer';

export type WhiteMeatData = {
  loading: boolean;
  series: YearPoint[];
  economicData: PoultryEconomicData[];
  econStartDate: string;
  setEconStartDate: (v: string) => void;
  econEndDate: string;
  setEconEndDate: (v: string) => void;
  worldRanking: { world: number; eu: number } | null;
  provincialPoultry: RegionTotal[];
  provincialBroilers: RegionTotal[];
  provincialLayers: RegionTotal[];
  poultryMapType: PoultryMapType;
  setPoultryMapType: (v: PoultryMapType) => void;
  activeTuikTab: TuikTab;
  setActiveTuikTab: (v: TuikTab) => void;
  tuikData: TuikChickenData[];
  monthlySlaughter: MonthlyData[];
  monthlyMeat: MonthlyData[];
  turkeyMeatData: TuikTurkeyMeatData[];
  monthlyTurkeyMeat: MonthlyData[];
  quailMeatData: TuikTurkeyMeatData[];
  monthlyQuailMeat: MonthlyData[];
  quailSlaughterData: TuikTurkeyMeatData[];
  latest: YearPoint | undefined;
  prev: YearPoint | undefined;
  yoy: number;
};

export function formatTon(value: number): string {
  if (value >= 1e6) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value / 1e6) + ' M ton';
  if (value >= 1e3) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value) + ' ton';
}

export function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}
