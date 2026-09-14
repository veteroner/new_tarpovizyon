import { eksen } from '../../utils/sayi';
import type { RegionTotal } from '../../components/TurkeyHeatMap';

export type YearPoint = {
  year: number;
  poultryTon: number;
};

export type TuikTab = 'overview' | 'production' | 'hatch' | 'projection';

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

export type PoultryTradeData = {
  yil: number;
  ihracat_musd: number;
  ithalat_musd: number;
};

export type WhiteMeatData = {
  loading: boolean;
  series: YearPoint[];
  worldRanking: { world: number; eu: number } | null;
  provincialPoultry: RegionTotal[];
  /** İl verisinin yılı — TÜİK API'sinde olmadığı için tazelenemiyor, başlıkta gösteriliyor. */
  provincialYear: string;
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
  tradeData: PoultryTradeData[];
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
  return eksen(value);
}
