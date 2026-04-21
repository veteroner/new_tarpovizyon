// Helper function to normalize Turkish characters for matching
export const normalizeTurkish = (str: string) => {
  if (!str) return '';
  return str
    .replace(/\u0130/g, 'i')   // U+0130 Latin Capital Letter I With Dot Above (İ)
    .replace(/I/g, 'i')         // ASCII uppercase I
    .toLowerCase()
    .replace(/\u0307/g, '')    // Remove combining dot above (artifact of İ.toLowerCase())
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/ê/g, 'e')
    .replace(/î/g, 'i')
    .replace(/ô/g, 'o')
    .replace(/û/g, 'u')
    .replace(/\s+/g, ' ')  // Normalize spaces
    .trim();
};

// Havza renkleri - tarpo_bitkisel_harita/data/havza_renkleri.json'dan
export const BASIN_COLORS: Record<string, string> = {
  'BATI GAP HAVZASI': '#e74c3c',
  'BATI KARADENİZ HAVZASI': '#3498db',
  'BÜYÜK AĞRI HAVZASI': '#9b59b6',
  'DOĞU AKDENİZ HAVZASI': '#e67e22',
  'DOĞU KARADENİZ HAVZASI': '#1abc9c',
  'EGE YAYLA HAVZASI': '#f1c40f',
  'ERCİYES HAVZASI': '#e91e63',
  'FIRAT HAVZASI': '#795548',
  'GAP HAVZASI': '#ff5722',
  'GEDİZ HAVZASI': '#8bc34a',
  'GÖLLER HAVZASI': '#00bcd4',
  'GÜNEY MARMARA HAVZASI': '#673ab7',
  'İÇ EGE HAVZASI': '#cddc39',
  'KARACADAĞ HAVZASI': '#ff9800',
  'KARASU – ARAS HAVZASI': '#f44336',
  'KAZ DAĞLARI HAVZASI': '#4caf50',
  'KIYI AKDENİZ HAVZASI': '#2196f3',
  'KIYI EGE HAVZASI': '#9c27b0',
  'KUZEY MARMARA HAVZASI': '#607d8b',
  'KUZEYBATI ANADOLU HAVZASI': '#009688',
  'MERİÇ HAVZASI': '#3f51b5',
  'ORTA ANADOLU HAVZASI': '#ffc107',
  'ORTA KARADENİZ HAVZASI': '#03a9f4',
  'ORTA KIZILIRMAK HAVZASI': '#ff4081',
  'SÖĞÜT HAVZASI': '#8d6e63',
  'VAN GÖLÜ HAVZASI': '#7c4dff',
  'YEŞİLIRMAK HAVZASI': '#00e676',
  'YUKARI FIRAT HAVZASI': '#d500f9',
  'ZAP HAVZASI': '#ff6e40',
  'ÇORUH HAVZASI': '#40c4ff'
};

// Types
export interface BasinData {
  id: string;
  basinId: string;
  basinName: string;
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
}

export interface BasinSummary {
  basinName: string;
  provinceCount: number;
  districtCount: number;
  color: string;
}

export interface ProvinceBasinData {
  province: string;
  dominantBasin: string;
  basinCount: number;
  districtCount: number;
  color: string;
}

export interface DistrictProduct {
  urun: string;
}

export interface DistrictProductionItem {
  urun: string;
  urun_grup: string;
  y2024: string;
}

export interface TopProduct {
  urun: string;
  toplam_ton: string;
}

export interface ProvinceDiversity {
  ili: string;
  cesit_sayisi: string;
}

export interface BasinProduct {
  urun: string;
  toplam_ton: string;
}

export interface ProductLeader {
  ili?: string;
  yer?: string;
  toplam_ton: string;
}

export interface TrendDataPoint {
  year: string;
  [productName: string]: string | number;
}

export interface ProvinceProductDistribution {
  ili: string;
  toplam_ton: string;
}

export interface BasinProductionStats {
  basinName: string;
  toplam_uretim: number;
  urun_cesit: number;
  color: string;
}

export interface MetricsData {
  totalBasins: number;
  totalProvinces: number;
  totalDistricts: number;
  largestBasin: string;
  largestBasinDistricts: number;
}

// Format number with Turkish locale
export const formatNumber = (num: number): string => {
  return num.toLocaleString('tr-TR');
};
