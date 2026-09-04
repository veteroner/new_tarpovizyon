import { kisa, eksen } from '../../utils/sayi';
import { ILK_YIL, SON_YIL } from '../plant/plantTypes';
import { BAR_COLOR } from '../../utils/chartColors';
import type { RegionTotal } from '../../components/TurkeyHeatMap';

// Re-export for section files
export type { RegionTotal };

// ─── Constants ───
export const TABLE_NAME = 'tuik_bitkisel_uretim';
/* Yıllar plantTypes'tan; burada 21/2004 elle yazılıydı ve sayfa 2025'i hiç
   listelemiyordu — il bazlı 2025 üretimi D1'de olmasına rağmen. */
export const YEARS = Array.from(
  { length: SON_YIL - ILK_YIL + 1 },
  (_, i) => ILK_YIL + i,
);

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
export const formatNumber = (value: number): string => kisa(value);

export const formatShort = (value: number): string => eksen(value);

export const calculateCAGR = (startValue: number, endValue: number, years: number): number => {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

/**
 * Ürün rozetinin rengi — TEK RENK.
 *
 * Eskiden ürün adının karakter toplamından bir "hash" üretilip palete
 * bindiriliyordu. İki sorun: (a) ~50 farklı ürün 8 renkli palete sığmıyor,
 * çarpışmalar rastgele; (b) rozet zaten ÜRÜN ADINI yazıyor, renk hiçbir şey
 * eklemiyordu. Kimlik etikette, renk yalnızca vurgu.
 *
 * (Palet merkezîleştirilirken bu fonksiyon hash'i doğrudan `seriesColor`a
 * veriyordu; hash 8'den büyük olduğu için bütün rozetler griye düşmüştü.)
 */
export const getProductColor = (_ad?: string): string => BAR_COLOR;

/**
 * Ürün ikonu — ARTIK BOŞ.
 *
 * 200+ ürünün 190'ı `🌾` dönüyordu, yani ikon ayırt etmiyordu; üstelik emoji
 * glifi platforma göre değişiyor ve ekran okuyucu onu adıyla okuyor
 * ("buğday başağı Buğday"). Ürün adı zaten yanında. Çağrı yerleri bozulmasın
 * diye fonksiyon duruyor, boş dönüyor.
 */
export const getProductIcon = (_ad?: string): string => '';