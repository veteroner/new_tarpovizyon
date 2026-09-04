import { SERIES } from '../../utils/chartColors';
// Types
export interface GIProduct {
  id: string;
  name: string;
  fileNumber: string;
  applicationDate: string;
  registrationNumber: string;
  registrationDate: string;
  type: string;
  productGroup: string;
  province: string;
  applicant: string;
  status: string;
}

export interface ProvinceData {
  province: string;
  totalProducts: number;
  registered: number;
  pending: number;
  region: string;
}

export interface ProductGroupData {
  group: string;
  count: number;
  registered: number;
  pending: number;
}

export interface YearlyTrend {
  year: string;
  registered: number;
  applications: number;
}

export interface GIMetrics {
  total: number;
  registered: number;
  pending: number;
  provinceCount: number;
  productGroupCount: number;
  typeCount: number;
}

// Constants
export const COLORS = SERIES;  // merkezî palet; döngü YOK, 8'den sonra seriyi katla

export const REGION_COLORS: Record<string, string> = {
  'Marmara': '#3b82f6',
  'Ege': '#22c55e',
  'Akdeniz': '#f59e0b',
  'İç Anadolu': '#ef4444',
  'Karadeniz': '#8b5cf6',
  'Doğu Anadolu': '#ec4899',
  'Güneydoğu Anadolu': '#14b8a6'
};

// Utility
export const formatNumber = (num: number): string => {
  return num.toLocaleString('tr-TR');
};
