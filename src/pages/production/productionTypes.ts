import type { Insight } from '../../components/InsightCard';

// ─── TYPES ──────────────────────────────────────────────────
export type Tab = 'overview' | 'primary' | 'processed' | 'yield' | 'competition' | 'predictions';

export const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍', desc: 'Dünya bitkisel üretim özeti' },
  { id: 'primary', label: 'Birincil Üretim', icon: '🌾', desc: 'FAO birincil ürün analizi' },
  { id: 'processed', label: 'İşlenmiş Üretim', icon: '🏭', desc: 'İşlenmiş tarım ürünleri' },
  { id: 'yield', label: 'Verim Analizi', icon: '📊', desc: 'Verim ve açık analizi' },
  { id: 'competition', label: 'Rekabet Analizi', icon: '⚔️', desc: 'Küresel rekabet matrisi' },
  { id: 'predictions', label: 'Tahminler', icon: '🔮', desc: 'Üretim & verim projeksiyonları' },
];

export const EXCLUDED_AREAS = "('World','WORLD','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";

export const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
  '#8b5cf6', '#f43f5e', '#22d3ee', '#eab308', '#6366f1'
];

export const TURKEY_COLOR = '#ff6b35';

export const CROP_CATEGORIES: Record<string, { name: string; color: string; keywords: string[] }> = {
  CEREALS: { name: 'Tahıllar', color: '#f59e0b', keywords: ['Wheat', 'Barley', 'Maize', 'Rice', 'Oats', 'Rye', 'Sorghum', 'Millet', 'Buckwheat', 'Triticale', 'Fonio', 'Canary seed', 'Quinoa', 'Cereals'] },
  FRUITS: { name: 'Meyveler', color: '#ef4444', keywords: ['Apple', 'Grape', 'Orange', 'Banana', 'Watermelon', 'Tangerine', 'Lemon', 'Fig', 'Apricot', 'Cherry', 'Peach', 'Pear', 'Plum', 'Strawberr', 'Blueberr', 'Cranberr', 'Raspberry', 'Kiwi', 'Mango', 'Pineapple', 'Avocado', 'Papaya', 'Date', 'Cantaloupe', 'Pomelo', 'Grapefruit', 'Persimmon', 'Quince'] },
  VEGETABLES: { name: 'Sebzeler', color: '#10b981', keywords: ['Tomato', 'Potato', 'Onion', 'Cucumber', 'Cabbage', 'Eggplant', 'Chilli', 'Pepper', 'Lettuce', 'Spinach', 'Carrot', 'Turnip', 'Cauliflower', 'Broccoli', 'Artichoke', 'Asparagus', 'Bean', 'Pea', 'Garlic', 'Leek', 'Mushroom', 'Pumpkin', 'Squash', 'Okra', 'Green corn'] },
  OILSEEDS: { name: 'Yağlı Tohumlar', color: '#8b5cf6', keywords: ['Sunflower', 'Soybean', 'Rapeseed', 'Groundnut', 'Sesame', 'Linseed', 'Castor', 'Safflower', 'Mustard', 'Poppy', 'Hempseed', 'Karite', 'Tung'] },
  INDUSTRIAL: { name: 'Endüstriyel', color: '#06b6d4', keywords: ['Sugar beet', 'Sugar cane', 'Cotton', 'Tea', 'Tobacco', 'Coffee', 'Cocoa', 'Rubber', 'Jute', 'Flax', 'Hemp', 'Sisal', 'Agave', 'Abaca', 'Coir', 'Chicory'] },
  PULSES: { name: 'Baklagiller', color: '#f97316', keywords: ['Chick pea', 'Lentil', 'Beans, dry', 'Broad bean', 'Cow pea', 'Pigeon pea', 'Bambara', 'Lupins', 'Vetches'] },
  NUTS: { name: 'Sert Kabuklular', color: '#92400e', keywords: ['Hazelnut', 'Almond', 'Walnut', 'Pistachio', 'Chestnut', 'Cashew', 'Brazil nut', 'Areca', 'Kola'] },
  TUBERS: { name: 'Yumrular', color: '#84cc16', keywords: ['Cassava', 'Yam', 'Taro', 'Sweet potato', 'Edible roots'] },
  SPICES: { name: 'Baharatlar', color: '#ec4899', keywords: ['Anise', 'Cinnamon', 'Clove', 'Ginger', 'Nutmeg', 'Vanilla', 'Saffron'] },
};

export function getCropCategory(product: string): { key: string; name: string; color: string } {
  for (const [key, cat] of Object.entries(CROP_CATEGORIES)) {
    if (cat.keywords.some(kw => product.toLowerCase().includes(kw.toLowerCase()))) {
      return { key, name: cat.name, color: cat.color };
    }
  }
  return { key: 'OTHER', name: 'Diğer', color: '#6b7280' };
}

export const DEVELOPED_COUNTRIES = ['United States of America', 'Germany', 'France', 'United Kingdom', 'Japan', 'Canada', 'Italy', 'Netherlands', 'Australia', 'Spain', 'Belgium', 'Austria', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Switzerland', 'Ireland', 'New Zealand', 'Israel', 'Republic of Korea', 'Czechia', 'Poland'];

export function formatValue(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar Ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon Ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin Ton';
  return value.toFixed(0) + ' Ton';
}

export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export function formatHa(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M ha';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K ha';
  return value.toFixed(0) + ' ha';
}

export function formatYield(value: number): string {
  if (value >= 10000) return (value / 1000).toFixed(1) + ' t/ha';
  return value.toFixed(0) + ' kg/ha';
}

// ─── DATA INTERFACES ─────────────────────────────────────────
export interface OverviewKPIs {
  worldTotal: number; worldArea: number; worldYield: number; worldYoY: number;
  turkeyTotal: number; turkeyArea: number; turkeyYield: number; turkeyYoY: number;
  turkeyRank: number; turkeyShare: number;
  processedTotal: number; turkeyProcessedTotal: number; processingRatio: number;
  countryCount: number; productCount: number; turkeyProductCount: number;
}

export interface SupplyChainData {
  primaryTotal: number; processedTotal: number; processingRatio: number;
  turkeyPrimary: number; turkeyProcessed: number; turkeyProcessingRatio: number;
}

export interface CountryProduction {
  rank: number; country: string; production: number; area: number;
  yieldVal: number; isTurkey: boolean; share: number;
}

export interface TrendPoint { year: string; world: number; turkey: number; }
export interface OverviewTrendPoint { year: string; worldProduction: number; worldArea: number; worldYield: number; }
export interface CategoryData { name: string; value: number; color: string; }

export interface PrimaryKPIs {
  worldTotal: number; turkeyProduction: number; turkeyRank: number;
  turkeyShare: number; worldCAGR: number; turkeyCAGR: number;
  turkeyVolatility: number; producerCount: number;
  leader: string; leaderProduction: number; leaderShare: number;
}

export interface ProcessedKPIs {
  worldTotal: number; turkeyProduction: number; turkeyRank: number;
  turkeyShare: number; worldCAGR: number; turkeyCAGR: number;
  leader: string; leaderShare: number;
}

export interface YieldKPIs {
  turkeyYield: number; worldAvgYield: number; leaderYield: number; leader: string;
  turkeyRank: number; totalRanked: number;
  gapToLeader: number; gapToWorld: number; catchUpYears: number | null;
  turkeyCAGR: number;
}

export interface CompKPIs {
  turkeyRank: number; turkeyShare: number;
  leader: string; leaderShare: number;
  totalProducers: number; latestHHI: number;
}

export interface PredKPIs {
  currentProduction: number; forecastProduction: number; prodChange: number;
  currentYield: number; forecastYield: number;
  r2Production: number; r2Yield: number; trend: string;
}

export interface AnomalyPoint { year: string; type: string; zScore: number; }
export interface GapPoint { name: string; value: number; fill: string; }
export interface ScatterPoint { name: string; x: number; y: number; z?: number; isTurkey: boolean; }
export interface HHITimelinePoint { year: string; hhi: number; concentration: string; }
export interface TopMoverPoint { country: string; production: number; growth: number; isTurkey: boolean; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ForecastData = { historical: any[]; forecast: any[]; r2: number; trend: string };

export type { Insight };
