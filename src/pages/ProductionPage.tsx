/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import {
  Leaf, TrendingUp, TrendingDown, MapPin, BarChart2,
  Globe, Factory, Target, Zap, Award, Activity, AlertTriangle,
  ChevronRight, Layers, Sprout, Wheat
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { Insight } from '../components/InsightCard';
import { BackToHome } from '../components/BackToHome';
import { Loading } from '../components/Loading';
import { fetchQuery } from '../services/api';
import { translateProduct } from '../utils/productTranslations';
import {
  calculateCAGR, calculateHHI, calculateYoY, calculateVolatility,
  detectAnomalies, forecastLinear,
  formatMetric
} from '../utils/livestockCalculations';
import type { YearValue, HHIResult } from '../utils/livestockCalculations';

// ─── TYPES ──────────────────────────────────────────────────
type Tab = 'overview' | 'primary' | 'processed' | 'yield' | 'competition' | 'predictions';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍', desc: 'Dünya bitkisel üretim özeti' },
  { id: 'primary', label: 'Birincil Üretim', icon: '🌾', desc: 'FAO birincil ürün analizi' },
  { id: 'processed', label: 'İşlenmiş Üretim', icon: '🏭', desc: 'İşlenmiş tarım ürünleri' },
  { id: 'yield', label: 'Verim Analizi', icon: '📊', desc: 'Verim ve açık analizi' },
  { id: 'competition', label: 'Rekabet Analizi', icon: '⚔️', desc: 'Küresel rekabet matrisi' },
  { id: 'predictions', label: 'Tahminler', icon: '🔮', desc: 'Üretim & verim projeksiyonları' },
];

const EXCLUDED_AREAS = "('World','WORLD','Africa','Americas','Asia','Europe','Oceania','Northern Africa','Eastern Africa','Middle Africa','Southern Africa','Western Africa','Northern America','Central America','Caribbean','South America','Central Asia','Eastern Asia','South-eastern Asia','Southern Asia','Western Asia','Eastern Europe','Northern Europe','Southern Europe','Western Europe','Australia and New Zealand','Melanesia','Micronesia','Polynesia','Least Developed Countries','Land Locked Developing Countries','Small Island Developing States','Low Income Food Deficit Countries','Net Food Importing Developing Countries','European Union (27)','China, mainland','China, Taiwan Province of')";

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
  '#8b5cf6', '#f43f5e', '#22d3ee', '#eab308', '#6366f1'
];

const TURKEY_COLOR = '#ff6b35';

const CROP_CATEGORIES: Record<string, { name: string; color: string; keywords: string[] }> = {
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

function getCropCategory(product: string): { key: string; name: string; color: string } {
  for (const [key, cat] of Object.entries(CROP_CATEGORIES)) {
    if (cat.keywords.some(kw => product.toLowerCase().includes(kw.toLowerCase()))) {
      return { key, name: cat.name, color: cat.color };
    }
  }
  return { key: 'OTHER', name: 'Diğer', color: '#6b7280' };
}

const DEVELOPED_COUNTRIES = ['United States of America', 'Germany', 'France', 'United Kingdom', 'Japan', 'Canada', 'Italy', 'Netherlands', 'Australia', 'Spain', 'Belgium', 'Austria', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Switzerland', 'Ireland', 'New Zealand', 'Israel', 'Republic of Korea', 'Czechia', 'Poland'];

function formatValue(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar Ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon Ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin Ton';
  return value.toFixed(0) + ' Ton';
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

function formatHa(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M ha';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K ha';
  return value.toFixed(0) + ' ha';
}

function formatYield(value: number): string {
  if (value >= 10000) return (value / 1000).toFixed(1) + ' t/ha';
  return value.toFixed(0) + ' kg/ha';
}

// ─── COMPONENT ──────────────────────────────────────────────
interface ProductionPageProps {
  categoryFilter?: string; // CROP_CATEGORIES key: CEREALS, FRUITS, VEGETABLES, etc.
  categoryTitle?: string;  // e.g. 'Tahıl Üretimi'
  categoryIcon?: string;   // e.g. '🌾'
}
export function ProductionPage({ categoryFilter, categoryTitle, categoryIcon }: ProductionPageProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>(categoryFilter ? 'primary' : 'overview');
  const [loading, setLoading] = useState(true);

  // ─── OVERVIEW STATE ─────────────────────────────────────
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewTrends, setOverviewTrends] = useState<any[]>([]);
  const [overviewCategoryData, setOverviewCategoryData] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);
  const [overviewSupplyChain, setOverviewSupplyChain] = useState<any>(null);

  // ─── PRIMARY STATE ──────────────────────────────────────
  const [primaryProduct, setPrimaryProduct] = useState<string>('Wheat');
  const [primaryProducts, setPrimaryProducts] = useState<string[]>([]);
  const [primaryTopCountries, setPrimaryTopCountries] = useState<any[]>([]);
  const [primaryTrends, setPrimaryTrends] = useState<any[]>([]);
  const [primaryKPIs, setPrimaryKPIs] = useState<any>(null);
  const [primaryHHI, setPrimaryHHI] = useState<HHIResult | null>(null);
  const [primaryInsights, setPrimaryInsights] = useState<Insight[]>([]);
  const [primaryAnomalies, setPrimaryAnomalies] = useState<any[]>([]);

  // ─── PROCESSED STATE ────────────────────────────────────
  const [processedProduct, setProcessedProduct] = useState<string>('Raw cane or beet sugar (centrifugal only)');
  const [processedProducts, setProcessedProducts] = useState<string[]>([]);
  const [processedTopCountries, setProcessedTopCountries] = useState<any[]>([]);
  const [processedTrends, setProcessedTrends] = useState<any[]>([]);
  const [processedKPIs, setProcessedKPIs] = useState<any>(null);
  const [processedInsights, setProcessedInsights] = useState<Insight[]>([]);

  // ─── YIELD STATE ────────────────────────────────────────
  const [yieldProduct, setYieldProduct] = useState<string>('Wheat');
  const [yieldKPIs, setYieldKPIs] = useState<any>(null);
  const [yieldGapData, setYieldGapData] = useState<any[]>([]);
  const [yieldScatter, setYieldScatter] = useState<any[]>([]);
  const [yieldTrends, setYieldTrends] = useState<any[]>([]);
  const [yieldBestPractices, setYieldBestPractices] = useState<any[]>([]);
  const [yieldInsights, setYieldInsights] = useState<Insight[]>([]);
  const [yieldSegmented, setYieldSegmented] = useState<any[]>([]);

  // ─── COMPETITION STATE ──────────────────────────────────
  const [compProduct, setCompProduct] = useState<string>('Wheat');
  const [compTopMovers, setCompTopMovers] = useState<any>(null);
  const [compBubbleData, setCompBubbleData] = useState<any[]>([]);
  const [compMatrix, setCompMatrix] = useState<any[]>([]);
  const [compHHITimeline, setCompHHITimeline] = useState<any[]>([]);
  const [compKPIs, setCompKPIs] = useState<any>(null);
  const [compInsights, setCompInsights] = useState<Insight[]>([]);

  // ─── PREDICTIONS STATE ──────────────────────────────────
  const [predProduct, setPredProduct] = useState<string>('Wheat');
  const [predProductionForecast, setPredProductionForecast] = useState<any>(null);
  const [predYieldForecast, setPredYieldForecast] = useState<any>(null);
  const [predAreaForecast, setPredAreaForecast] = useState<any>(null);
  const [predWorldForecast, setPredWorldForecast] = useState<any>(null);
  const [predKPIs, setPredKPIs] = useState<any>(null);
  const [predInsights, setPredInsights] = useState<Insight[]>([]);

  // ═══════════════════════════════════════════════════════════
  // OVERVIEW DATA LOADER
  // ═══════════════════════════════════════════════════════════
  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const latestYear = '2023';
      const prevYear = '2022';

      const [worldTotalRes, turkeyRes, trendRes, categoryRes, processedTotalRes] = await Promise.all([
        fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_production, SUM(CAST(miktar_deger AS DECIMAL(20,2))) as total_area, AVG(CAST(verim_deger AS DECIMAL(20,2))) as avg_yield, COUNT(DISTINCT ulkead) as country_count, COUNT(DISTINCT urunad) as product_count FROM fao_uretim_bitkisel_birincil WHERE year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0`),
        fetchQuery(`SELECT b.total_production, b.total_area, b.avg_yield, b.product_count, (SELECT COUNT(DISTINCT a.ulkead) + 1 FROM (SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as tot FROM fao_uretim_bitkisel_birincil WHERE year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 GROUP BY ulkead HAVING tot > (SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) FROM fao_uretim_bitkisel_birincil WHERE year='${latestYear}' AND ulkead='Türkiye')) a) as turkey_rank FROM (SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_production, SUM(CAST(miktar_deger AS DECIMAL(20,2))) as total_area, AVG(CAST(verim_deger AS DECIMAL(20,2))) as avg_yield, COUNT(DISTINCT urunad) as product_count FROM fao_uretim_bitkisel_birincil WHERE year='${latestYear}' AND ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0) b`),
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as world_production, SUM(CAST(miktar_deger AS DECIMAL(20,2))) as world_area, AVG(CAST(verim_deger AS DECIMAL(20,2))) as world_yield FROM fao_uretim_bitkisel_birincil WHERE ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT urunad, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as production, SUM(CAST(miktar_deger AS DECIMAL(20,2))) as area, AVG(CAST(verim_deger AS DECIMAL(20,2))) as yield_val FROM fao_uretim_bitkisel_birincil WHERE year='${latestYear}' AND ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 GROUP BY urunad ORDER BY production DESC`),
        fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_processed, COUNT(DISTINCT urunad) as product_count, COUNT(DISTINCT ulkead) as country_count FROM fao_uretim_bitkisel_islenmis WHERE year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0`)
      ]);

      const [prevWorldRes, prevTurkeyRes, topCountriesRes, turkeyProcessedRes] = await Promise.all([
        fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_production FROM fao_uretim_bitkisel_birincil WHERE year='${prevYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0`),
        fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_production FROM fao_uretim_bitkisel_birincil WHERE year='${prevYear}' AND ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0`),
        fetchQuery(`SELECT ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_production FROM fao_uretim_bitkisel_birincil WHERE year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 GROUP BY ulkead ORDER BY total_production DESC LIMIT 15`),
        fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as total_processed FROM fao_uretim_bitkisel_islenmis WHERE year='${latestYear}' AND ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0`)
      ]);

      const worldRow = worldTotalRes.data?.[0];
      const turkeyRow = turkeyRes.data?.[0];
      const prevWorldRow = prevWorldRes.data?.[0];
      const prevTurkeyRow = prevTurkeyRes.data?.[0];
      const processedRow = processedTotalRes.data?.[0];
      const turkeyProcessedRow = turkeyProcessedRes.data?.[0];

      const worldTotal = parseFloat(String(worldRow?.total_production ?? 0)) || 0;
      const worldArea = parseFloat(String(worldRow?.total_area ?? 0)) || 0;
      const worldYield = parseFloat(String(worldRow?.avg_yield ?? 0)) || 0;
      const turkeyTotal = parseFloat(String(turkeyRow?.total_production ?? 0)) || 0;
      const turkeyArea = parseFloat(String(turkeyRow?.total_area ?? 0)) || 0;
      const turkeyYield = parseFloat(String(turkeyRow?.avg_yield ?? 0)) || 0;
      const turkeyRank = parseInt(String(turkeyRow?.turkey_rank ?? 0)) || 0;
      const processedTotal = parseFloat(String(processedRow?.total_processed ?? 0)) || 0;
      const turkeyProcessedTotal = parseFloat(String(turkeyProcessedRow?.total_processed ?? 0)) || 0;
      const prevWorldTotal = parseFloat(String(prevWorldRow?.total_production ?? 0)) || 0;
      const prevTurkeyTotal = parseFloat(String(prevTurkeyRow?.total_production ?? 0)) || 0;

      const worldYoY = calculateYoY(worldTotal, prevWorldTotal);
      const turkeyYoY = calculateYoY(turkeyTotal, prevTurkeyTotal);
      const turkeyShare = worldTotal > 0 ? (turkeyTotal / worldTotal) * 100 : 0;
      const processingRatio = worldTotal > 0 ? (processedTotal / worldTotal) * 100 : 0;

      setOverviewKPIs({
        worldTotal, worldArea, worldYield, worldYoY,
        turkeyTotal, turkeyArea, turkeyYield, turkeyYoY, turkeyRank, turkeyShare,
        processedTotal, turkeyProcessedTotal, processingRatio,
        countryCount: parseInt(String(worldRow?.country_count ?? 0)) || 0,
        productCount: parseInt(String(worldRow?.product_count ?? 0)) || 0,
        turkeyProductCount: parseInt(String(turkeyRow?.product_count ?? 0)) || 0,
      });

      const trends = (trendRes.data || []).map((r: any) => ({
        year: r.year,
        worldProduction: parseFloat(String(r.world_production ?? 0)) || 0,
        worldArea: parseFloat(String(r.world_area ?? 0)) || 0,
        worldYield: parseFloat(String(r.world_yield ?? 0)) || 0,
      }));
      setOverviewTrends(trends);

      const catMap = new Map<string, { name: string; value: number; color: string }>();
      (categoryRes.data || []).forEach((r: any) => {
        const cat = getCropCategory(r.urunad);
        const val = parseFloat(String(r.production ?? 0)) || 0;
        if (catMap.has(cat.key)) { catMap.get(cat.key)!.value += val; }
        else { catMap.set(cat.key, { name: cat.name, value: val, color: cat.color }); }
      });
      setOverviewCategoryData(Array.from(catMap.values()).sort((a, b) => b.value - a.value));

      setOverviewTopCountries((topCountriesRes.data || []).map((r: any) => ({
        name: r.ulkead, value: parseFloat(String(r.total_production ?? 0)) || 0, isTurkey: r.ulkead === 'Türkiye',
      })));

      setOverviewSupplyChain({
        primaryTotal: worldTotal, processedTotal, processingRatio,
        turkeyPrimary: turkeyTotal, turkeyProcessed: turkeyProcessedTotal,
        turkeyProcessingRatio: turkeyTotal > 0 ? (turkeyProcessedTotal / turkeyTotal) * 100 : 0,
      });

      const insights: Insight[] = [];
      if (turkeyRank <= 10) insights.push({ id: 'ov1', type: 'achievement', message: `Türkiye dünya bitkisel üretiminde ${turkeyRank}. sırada — ${formatValue(turkeyTotal)} ile dünya üretiminin %${turkeyShare.toFixed(1)}'ini karşılıyor`, severity: 'high', category: 'Genel' });
      if (worldYoY > 2) insights.push({ id: 'ov2', type: 'growth', message: `Dünya bitkisel üretimi yıllık %${worldYoY.toFixed(1)} büyüdü — ${latestYear} yılı rekor üretim`, severity: 'medium', category: 'Trend' });
      else if (worldYoY < -2) insights.push({ id: 'ov2', type: 'decline', message: `Dünya bitkisel üretimi yıllık %${Math.abs(worldYoY).toFixed(1)} geriledi`, severity: 'high', category: 'Risk' });
      if (turkeyYoY > 3) insights.push({ id: 'ov3', type: 'growth', message: `Türkiye üretimi %${turkeyYoY.toFixed(1)} arttı — dünya ortalamasının ${(turkeyYoY / Math.max(worldYoY, 0.1)).toFixed(1)}x üzerinde`, severity: 'high', category: 'Türkiye' });
      else if (turkeyYoY < -3) insights.push({ id: 'ov3', type: 'warning', message: `Türkiye üretimi %${Math.abs(turkeyYoY).toFixed(1)} azaldı — ciddi düşüş`, severity: 'high', category: 'Risk' });
      if (turkeyYield > worldYield) insights.push({ id: 'ov4', type: 'achievement', message: `Türkiye ortalama verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldYield)}) %${((turkeyYield / worldYield - 1) * 100).toFixed(0)} üzerinde`, severity: 'medium', category: 'Verim' });
      else { const gap = ((worldYield - turkeyYield) / worldYield * 100).toFixed(0); insights.push({ id: 'ov4', type: 'warning', message: `Türkiye ortalama verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldYield)}) %${gap} altında — verim artışı potansiyeli`, severity: 'medium', category: 'Verim' }); }
      const turkeyProcRatio = turkeyTotal > 0 ? (turkeyProcessedTotal / turkeyTotal) * 100 : 0;
      if (turkeyProcRatio < processingRatio) insights.push({ id: 'ov6', type: 'warning', message: `Türkiye işleme oranı (%${turkeyProcRatio.toFixed(1)}) dünya ortalamasının (%${processingRatio.toFixed(1)}) altında — gıda sanayii yatırım fırsatı`, severity: 'medium', category: 'İşleme' });
      if (trends.length >= 5) {
        const worldTrendData: YearValue[] = trends.map((t: any) => ({ year: t.year, value: t.worldProduction }));
        const worldCAGR = calculateCAGR(worldTrendData);
        if (worldCAGR) insights.push({ id: 'ov7', type: worldCAGR.cagr > 0 ? 'growth' : 'decline', message: `Dünya bitkisel üretimi ${trends[0].year}-${trends[trends.length - 1].year} döneminde yıllık %${worldCAGR.cagr.toFixed(2)} CAGR ile ${worldCAGR.trend === 'GROWTH' ? 'büyüdü' : 'geriledi'}`, severity: 'medium', category: 'Uzun Vadeli' });
      }
      insights.push({ id: 'ov8', type: 'info', message: `FAO veritabanında ${parseInt(String(worldRow?.country_count ?? 0)) || 0} ülke, ${parseInt(String(worldRow?.product_count ?? 0)) || 0} birincil ürün takip ediliyor — Türkiye ${parseInt(String(turkeyRow?.product_count ?? 0)) || 0} üründe üretim yapıyor`, severity: 'low', category: 'Kapsam' });
      setOverviewInsights(insights);
    } catch (error) {
      console.error('Overview veri yüklenirken hata:', error);
    } finally { setLoading(false); }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // PRIMARY DATA LOADER
  // ═══════════════════════════════════════════════════════════
  const loadPrimaryData = useCallback(async () => {
    setLoading(true);
    try {
      if (primaryProducts.length === 0) {
        const prodRes = await fetchQuery(`SELECT DISTINCT urunad FROM fao_uretim_bitkisel_birincil WHERE ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY urunad`);
        let prods = (prodRes.data || []).map((r: any) => r.urunad);
        if (categoryFilter && CROP_CATEGORIES[categoryFilter]) {
          const kws = CROP_CATEGORIES[categoryFilter].keywords;
          prods = prods.filter((p: string) => kws.some(kw => p.toLowerCase().includes(kw.toLowerCase())));
        }
        setPrimaryProducts(prods);
        if (prods.length > 0 && !prods.includes(primaryProduct)) setPrimaryProduct(prods[0]);
      }
      const product = primaryProduct;
      const latestYear = '2023';
      const safeProduct = product.replace(/'/g, "''");

      const [topRes, trendRes, turkeyTrendRes, worldTotalRes] = await Promise.all([
        fetchQuery(`SELECT ulkead, CAST(uretim_deger AS DECIMAL(20,2)) as production, CAST(miktar_deger AS DECIMAL(20,2)) as area, CAST(verim_deger AS DECIMAL(20,2)) as yield_val FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY production DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as world_total, COUNT(DISTINCT ulkead) as producer_count FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, CAST(uretim_deger AS DECIMAL(20,2)) as production, CAST(miktar_deger AS DECIMAL(20,2)) as area, CAST(verim_deger AS DECIMAL(20,2)) as yield_val FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY year`),
        fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as world_total FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0`)
      ]);

      const worldTotal = parseFloat(String(worldTotalRes.data?.[0]?.world_total ?? 0)) || 0;
      const topCountries = (topRes.data || []).map((r: any, i: number) => ({
        rank: i + 1, country: r.ulkead, production: parseFloat(String(r.production ?? 0)) || 0,
        area: parseFloat(String(r.area ?? 0)) || 0, yieldVal: parseFloat(String(r.yield_val ?? 0)) || 0,
        isTurkey: r.ulkead === 'Türkiye',
        share: worldTotal > 0 ? ((parseFloat(String(r.production ?? 0)) || 0) / worldTotal) * 100 : 0,
      }));
      setPrimaryTopCountries(topCountries);

      const turkeyInTop = topCountries.find((c: any) => c.isTurkey);
      const worldTrend = (trendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.world_total ?? 0)) || 0 }));
      const turkeyTrend = (turkeyTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.production ?? 0)) || 0 }));
      const mergedTrends = worldTrend.map((w: any) => { const t = turkeyTrend.find((t: any) => t.year === w.year); return { year: w.year, world: w.value, turkey: t?.value || 0 }; });
      setPrimaryTrends(mergedTrends);

      const worldCAGR = calculateCAGR(worldTrend);
      const turkeyCAGR = calculateCAGR(turkeyTrend);
      const shares = topCountries.map((c: any) => c.share);
      const hhi = calculateHHI(shares);
      setPrimaryHHI(hhi);
      const turkeyVol = calculateVolatility(turkeyTrend);
      const anomalies = detectAnomalies(turkeyTrend, 2.0);
      const realAnomalies = anomalies.filter(a => a.isAnomaly);
      setPrimaryAnomalies(realAnomalies);

      setPrimaryKPIs({
        worldTotal, turkeyProduction: turkeyInTop?.production || 0, turkeyRank: turkeyInTop?.rank || topCountries.length + 1,
        turkeyShare: turkeyInTop?.share || 0, worldCAGR: worldCAGR?.cagr || 0, turkeyCAGR: turkeyCAGR?.cagr || 0,
        turkeyVolatility: turkeyVol, producerCount: parseInt(String(trendRes.data?.[trendRes.data.length - 1]?.producer_count ?? 0)) || 0,
        leader: topCountries[0]?.country || '-', leaderProduction: topCountries[0]?.production || 0, leaderShare: topCountries[0]?.share || 0,
      });

      const ins: Insight[] = [];
      const productTR = translateProduct(product);
      if (turkeyInTop && turkeyInTop.rank <= 5) ins.push({ id: 'pr1', type: 'achievement', message: `Türkiye ${productTR} üretiminde dünya ${turkeyInTop.rank}. sırası — %${turkeyInTop.share.toFixed(1)} pazar payı`, severity: 'high', category: productTR });
      else if (turkeyInTop && turkeyInTop.rank <= 15) ins.push({ id: 'pr1', type: 'info', message: `Türkiye ${productTR} üretiminde dünya ${turkeyInTop.rank}. sırası`, severity: 'medium', category: productTR });
      if (turkeyCAGR && turkeyCAGR.cagr > 2) ins.push({ id: 'pr2', type: 'growth', message: `Türkiye ${productTR} üretimi yıllık %${turkeyCAGR.cagr.toFixed(1)} CAGR ile büyüyor`, severity: 'medium', category: 'Trend' });
      else if (turkeyCAGR && turkeyCAGR.cagr < -1) ins.push({ id: 'pr2', type: 'decline', message: `Türkiye ${productTR} üretimi yıllık %${Math.abs(turkeyCAGR.cagr).toFixed(1)} CAGR ile geriliyor`, severity: 'high', category: 'Risk' });
      if (hhi && hhi.concentration === 'VERY_HIGH') ins.push({ id: 'pr3', type: 'warning', message: `${productTR} pazarı çok yoğun (HHI: ${hhi.hhi.toFixed(0)}) — ${topCountries[0]?.country} %${topCountries[0]?.share.toFixed(1)} ile dominant`, severity: 'high', category: 'Pazar' });
      if (turkeyVol > 15) ins.push({ id: 'pr4', type: 'warning', message: `Türkiye ${productTR} üretimi yüksek volatilite gösteriyor (%${turkeyVol.toFixed(1)})`, severity: 'high', category: 'Risk' });
      if (realAnomalies.length > 0) { const la = realAnomalies[realAnomalies.length - 1]; ins.push({ id: 'pr5', type: la.type === 'SPIKE' ? 'growth' : 'warning', message: `${la.year} yılında ${productTR} üretiminde ${la.type === 'SPIKE' ? 'ani artış' : 'ani düşüş'} (z-score: ${la.zScore.toFixed(1)})`, severity: 'medium', category: 'Anomali' }); }
      if (worldCAGR && turkeyCAGR && turkeyCAGR.cagr > worldCAGR.cagr) ins.push({ id: 'pr6', type: 'growth', message: `Türkiye ${productTR} büyüme hızı (%${turkeyCAGR.cagr.toFixed(1)}) dünya ortalamasının (%${worldCAGR.cagr.toFixed(1)}) üzerinde`, severity: 'medium', category: 'Rekabet' });
      setPrimaryInsights(ins);
    } catch (error) { console.error('Primary veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, [primaryProduct, primaryProducts.length, categoryFilter]);

  // ═══════════════════════════════════════════════════════════
  // PROCESSED DATA LOADER
  // ═══════════════════════════════════════════════════════════
  const loadProcessedData = useCallback(async () => {
    setLoading(true);
    try {
      if (processedProducts.length === 0) {
        const prodRes = await fetchQuery(`SELECT DISTINCT urunad FROM fao_uretim_bitkisel_islenmis WHERE CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY urunad`);
        setProcessedProducts((prodRes.data || []).map((r: any) => r.urunad));
      }
      const product = processedProduct;
      const safeProduct = product.replace(/'/g, "''");
      const latestYear = '2023';

      const [topRes, trendRes, turkeyTrendRes, worldTotalRes] = await Promise.all([
        fetchQuery(`SELECT ulkead, CAST(uretim_deger AS DECIMAL(20,2)) as production FROM fao_uretim_bitkisel_islenmis WHERE urunad='${safeProduct}' AND year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY production DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as world_total FROM fao_uretim_bitkisel_islenmis WHERE urunad='${safeProduct}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, CAST(uretim_deger AS DECIMAL(20,2)) as production FROM fao_uretim_bitkisel_islenmis WHERE urunad='${safeProduct}' AND ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY year`),
        fetchQuery(`SELECT SUM(CAST(uretim_deger AS DECIMAL(20,2))) as world_total FROM fao_uretim_bitkisel_islenmis WHERE urunad='${safeProduct}' AND year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0`)
      ]);

      const worldTotal = parseFloat(String(worldTotalRes.data?.[0]?.world_total ?? 0)) || 0;
      const topCountries = (topRes.data || []).map((r: any, i: number) => ({
        rank: i + 1, country: r.ulkead, production: parseFloat(String(r.production ?? 0)) || 0,
        share: worldTotal > 0 ? (parseFloat(String(r.production ?? 0)) / worldTotal) * 100 : 0,
        isTurkey: r.ulkead === 'Türkiye',
      }));
      setProcessedTopCountries(topCountries);

      const worldTrend = (trendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.world_total ?? 0)) || 0 }));
      const turkeyTrend = (turkeyTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.production ?? 0)) || 0 }));
      const mergedTrends = worldTrend.map((w: any) => { const t = turkeyTrend.find((t: any) => t.year === w.year); return { year: w.year, world: w.value, turkey: t?.value || 0 }; });
      setProcessedTrends(mergedTrends);

      const turkeyInTop = topCountries.find((c: any) => c.isTurkey);
      const worldCAGR = calculateCAGR(worldTrend);
      const turkeyCAGR = calculateCAGR(turkeyTrend);

      setProcessedKPIs({
        worldTotal, turkeyProduction: turkeyInTop?.production || 0, turkeyRank: turkeyInTop?.rank || 0,
        turkeyShare: turkeyInTop?.share || 0, worldCAGR: worldCAGR?.cagr || 0, turkeyCAGR: turkeyCAGR?.cagr || 0,
        leader: topCountries[0]?.country || '-', leaderShare: topCountries[0]?.share || 0,
      });

      const ins: Insight[] = [];
      const productTR = translateProduct(product);
      if (turkeyInTop && turkeyInTop.rank <= 10) ins.push({ id: 'pc1', type: 'achievement', message: `Türkiye ${productTR} üretiminde dünya ${turkeyInTop.rank}. — %${turkeyInTop.share.toFixed(1)} pazar payı`, severity: 'high', category: 'Sıralama' });
      if (turkeyCAGR && turkeyCAGR.cagr > 3) ins.push({ id: 'pc2', type: 'growth', message: `Türkiye ${productTR} üretimi yıllık %${turkeyCAGR.cagr.toFixed(1)} CAGR ile hızla büyüyor`, severity: 'medium', category: 'Büyüme' });
      if (worldCAGR && worldCAGR.cagr < 0) ins.push({ id: 'pc3', type: 'decline', message: `Dünya ${productTR} üretimi yıllık %${Math.abs(worldCAGR.cagr).toFixed(1)} CAGR ile geriliyor`, severity: 'medium', category: 'Trend' });
      if (topCountries[0]?.share > 40) ins.push({ id: 'pc4', type: 'warning', message: `${productTR} pazarında ${topCountries[0]?.country} %${topCountries[0]?.share.toFixed(1)} ile baskın — tedarik riski`, severity: 'high', category: 'Konsantrasyon' });
      setProcessedInsights(ins);
    } catch (error) { console.error('Processed veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, [processedProduct, processedProducts.length]);

  // ═══════════════════════════════════════════════════════════
  // YIELD DATA LOADER
  // ═══════════════════════════════════════════════════════════
  const loadYieldData = useCallback(async () => {
    setLoading(true);
    try {
      const product = yieldProduct;
      const safeProduct = product.replace(/'/g, "''");
      const latestYear = '2023';

      const [yieldRankRes, yieldTrendRes, turkeyYieldTrendRes, scatterRes] = await Promise.all([
        fetchQuery(`SELECT ulkead, CAST(verim_deger AS DECIMAL(20,2)) as yield_val, CAST(uretim_deger AS DECIMAL(20,2)) as production, CAST(miktar_deger AS DECIMAL(20,2)) as area FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(verim_deger AS DECIMAL(20,2)) > 0 AND CAST(miktar_deger AS DECIMAL(20,2)) > 1000 ORDER BY yield_val DESC LIMIT 30`),
        fetchQuery(`SELECT year, AVG(CAST(verim_deger AS DECIMAL(20,2))) as avg_yield FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(verim_deger AS DECIMAL(20,2)) > 0 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, CAST(verim_deger AS DECIMAL(20,2)) as yield_val, CAST(uretim_deger AS DECIMAL(20,2)) as production, CAST(miktar_deger AS DECIMAL(20,2)) as area FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead='Türkiye' AND CAST(verim_deger AS DECIMAL(20,2)) > 0 ORDER BY year`),
        fetchQuery(`SELECT ulkead, CAST(verim_deger AS DECIMAL(20,2)) as yield_val, CAST(miktar_deger AS DECIMAL(20,2)) as area, CAST(uretim_deger AS DECIMAL(20,2)) as production FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(verim_deger AS DECIMAL(20,2)) > 0 AND CAST(miktar_deger AS DECIMAL(20,2)) > 500 ORDER BY production DESC LIMIT 50`)
      ]);

      const yieldRanking = (yieldRankRes.data || []).map((r: any, i: number) => ({
        rank: i + 1, country: r.ulkead, yieldVal: parseFloat(String(r.yield_val ?? 0)) || 0,
        production: parseFloat(String(r.production ?? 0)) || 0, area: parseFloat(String(r.area ?? 0)) || 0, isTurkey: r.ulkead === 'Türkiye',
      }));
      setYieldBestPractices(yieldRanking.slice(0, 10));

      const turkeyInRank = yieldRanking.find((r: any) => r.isTurkey);
      const leader = yieldRanking[0];
      const worldAvgYield = yieldRanking.reduce((s: number, r: any) => s + r.yieldVal, 0) / Math.max(yieldRanking.length, 1);
      const turkeyYield = turkeyInRank?.yieldVal || 0;
      const leaderYield = leader?.yieldVal || 0;
      const gapToLeader = leaderYield > 0 ? ((leaderYield - turkeyYield) / leaderYield * 100) : 0;
      const gapToWorld = worldAvgYield > 0 ? ((worldAvgYield - turkeyYield) / worldAvgYield * 100) : 0;

      setYieldGapData([
        { name: leader?.country || 'Lider', value: leaderYield, fill: '#10b981' },
        { name: 'Dünya Ort.', value: worldAvgYield, fill: '#3b82f6' },
        { name: 'Türkiye', value: turkeyYield, fill: TURKEY_COLOR },
      ]);

      const scatter = (scatterRes.data || []).map((r: any) => ({
        name: r.ulkead, x: parseFloat(String(r.area ?? 0)) || 0, y: parseFloat(String(r.yield_val ?? 0)) || 0,
        z: parseFloat(String(r.production ?? 0)) || 0, isTurkey: r.ulkead === 'Türkiye',
      }));
      setYieldScatter(scatter);

      const worldYieldTrend = (yieldTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.avg_yield ?? 0)) || 0 }));
      const turkeyYieldTrend = (turkeyYieldTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.yield_val ?? 0)) || 0 }));
      const mergedYieldTrends = worldYieldTrend.map((w: any) => { const t = turkeyYieldTrend.find((t: any) => t.year === w.year); return { year: w.year, world: w.value, turkey: t?.value || 0 }; });
      setYieldTrends(mergedYieldTrends);

      const turkeyYieldCAGR = calculateCAGR(turkeyYieldTrend);
      let catchUpYears = Infinity;
      if (turkeyYieldCAGR && turkeyYieldCAGR.cagr > 0 && turkeyYield < leaderYield) {
        catchUpYears = Math.ceil(Math.log(leaderYield / turkeyYield) / Math.log(1 + turkeyYieldCAGR.cagr / 100));
      }

      const developed = yieldRanking.filter((r: any) => DEVELOPED_COUNTRIES.includes(r.country));
      const developing = yieldRanking.filter((r: any) => !DEVELOPED_COUNTRIES.includes(r.country) && !r.isTurkey);
      const devAvg = developed.length > 0 ? developed.reduce((s: number, r: any) => s + r.yieldVal, 0) / developed.length : 0;
      const devingAvg = developing.length > 0 ? developing.reduce((s: number, r: any) => s + r.yieldVal, 0) / developing.length : 0;
      setYieldSegmented([
        { name: 'Gelişmiş', value: devAvg, fill: '#3b82f6' },
        { name: 'Gelişmekte', value: devingAvg, fill: '#f59e0b' },
        { name: 'Türkiye', value: turkeyYield, fill: TURKEY_COLOR },
      ]);

      setYieldKPIs({
        turkeyYield, worldAvgYield, leaderYield, leader: leader?.country || '-',
        turkeyRank: yieldRanking.findIndex((r: any) => r.isTurkey) + 1 || 0, totalRanked: yieldRanking.length,
        gapToLeader, gapToWorld, catchUpYears: catchUpYears === Infinity ? null : catchUpYears,
        turkeyCAGR: turkeyYieldCAGR?.cagr || 0,
      });

      const yIns: Insight[] = [];
      const productTR = translateProduct(product);
      if (turkeyYield > worldAvgYield) yIns.push({ id: 'y1', type: 'achievement', message: `Türkiye ${productTR} verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldAvgYield)}) %${((turkeyYield / worldAvgYield - 1) * 100).toFixed(0)} üzerinde`, severity: 'high', category: 'Verim' });
      else yIns.push({ id: 'y1', type: 'warning', message: `Türkiye ${productTR} verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldAvgYield)}) %${Math.abs(gapToWorld).toFixed(0)} altında`, severity: 'high', category: 'Verim' });
      if (gapToLeader > 50) yIns.push({ id: 'y2', type: 'warning', message: `${leader?.country} (${formatYield(leaderYield)}) lider — Türkiye'nin verim açığı %${gapToLeader.toFixed(0)}`, severity: 'high', category: 'Gap' });
      if (catchUpYears !== Infinity && catchUpYears < 50) yIns.push({ id: 'y3', type: 'info', message: `Mevcut CAGR (%${turkeyYieldCAGR?.cagr.toFixed(1)}) ile lidere tahmini ${catchUpYears} yılda yetişilir`, severity: 'medium', category: 'Projeksiyon' });
      if (turkeyYieldCAGR && turkeyYieldCAGR.cagr > 2) yIns.push({ id: 'y4', type: 'growth', message: `Türkiye ${productTR} verimi yıllık %${turkeyYieldCAGR.cagr.toFixed(1)} CAGR ile artıyor`, severity: 'medium', category: 'Trend' });
      setYieldInsights(yIns);
    } catch (error) { console.error('Yield veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, [yieldProduct]);

  // ═══════════════════════════════════════════════════════════
  // COMPETITION DATA LOADER
  // ═══════════════════════════════════════════════════════════
  const loadCompetitionData = useCallback(async () => {
    setLoading(true);
    try {
      const product = compProduct;
      const safeProduct = product.replace(/'/g, "''");
      const latestYear = '2023';

      const [topRes, cagrRes, hhiTimelineRes] = await Promise.all([
        fetchQuery(`SELECT ulkead, CAST(uretim_deger AS DECIMAL(20,2)) as production, CAST(miktar_deger AS DECIMAL(20,2)) as area, CAST(verim_deger AS DECIMAL(20,2)) as yield_val FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND year='${latestYear}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY production DESC LIMIT 20`),
        fetchQuery(`SELECT a.ulkead, CAST(a.uretim_deger AS DECIMAL(20,2)) as prod_now, CAST(b.uretim_deger AS DECIMAL(20,2)) as prod_5y FROM fao_uretim_bitkisel_birincil a JOIN fao_uretim_bitkisel_birincil b ON a.ulkead=b.ulkead AND a.urunad=b.urunad AND b.year='2018' WHERE a.urunad='${safeProduct}' AND a.year='${latestYear}' AND a.ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(a.uretim_deger AS DECIMAL(20,2)) > 10000 AND CAST(b.uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY (CAST(a.uretim_deger AS DECIMAL(20,2)) - CAST(b.uretim_deger AS DECIMAL(20,2))) / CAST(b.uretim_deger AS DECIMAL(20,2)) DESC LIMIT 30`),
        fetchQuery(`SELECT year, GROUP_CONCAT(CONCAT(ulkead,':',uretim_deger) SEPARATOR '|') as data_str FROM (SELECT year, ulkead, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as uretim_deger FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 AND year >= '2005' GROUP BY year, ulkead) sub GROUP BY year ORDER BY year`)
      ]);

      const worldTotal = (topRes.data || []).reduce((s: number, r: any) => s + (parseFloat(String(r.production ?? 0)) || 0), 0);
      const topCountries = (topRes.data || []).map((r: any, i: number) => ({
        rank: i + 1, country: r.ulkead, production: parseFloat(String(r.production ?? 0)) || 0,
        area: parseFloat(String(r.area ?? 0)) || 0, yieldVal: parseFloat(String(r.yield_val ?? 0)) || 0,
        share: worldTotal > 0 ? (parseFloat(String(r.production ?? 0)) / worldTotal) * 100 : 0,
        isTurkey: r.ulkead === 'Türkiye',
      }));

      const movers = (cagrRes.data || []).map((r: any) => {
        const now = parseFloat(String(r.prod_now ?? 0)) || 0;
        const prev = parseFloat(String(r.prod_5y ?? 0)) || 0;
        return { country: r.ulkead, production: now, growth: prev > 0 ? ((now - prev) / prev) * 100 : 0, isTurkey: r.ulkead === 'Türkiye' };
      });
      const topGainers = [...movers].sort((a, b) => b.growth - a.growth).slice(0, 8);
      const topDecliners = [...movers].sort((a, b) => a.growth - b.growth).slice(0, 8);
      setCompTopMovers({ gainers: topGainers, decliners: topDecliners });

      setCompBubbleData(movers.slice(0, 25).map((m: any) => ({ name: m.country, x: m.growth, y: m.production, isTurkey: m.isTurkey })));

      const turkeyData = topCountries.find((c: any) => c.isTurkey);
      const rivals = topCountries.filter((c: any) => !c.isTurkey).slice(0, 5);
      setCompMatrix([...(turkeyData ? [turkeyData] : []), ...rivals]);

      const hhiTimeline = (hhiTimelineRes.data || []).map((r: any) => {
        const pairs = (r.data_str || '').split('|').map((p: string) => { const parts = p.split(':'); return parseFloat(parts[parts.length - 1]) || 0; });
        const total = pairs.reduce((s: number, v: number) => s + v, 0);
        const shares = total > 0 ? pairs.map((v: number) => (v / total) * 100) : [];
        const hhi = calculateHHI(shares);
        return { year: r.year, hhi: hhi.hhi, concentration: hhi.concentration };
      });
      setCompHHITimeline(hhiTimeline);

      const turkeyInComp = topCountries.find((c: any) => c.isTurkey);
      setCompKPIs({
        turkeyRank: turkeyInComp?.rank || 0, turkeyShare: turkeyInComp?.share || 0,
        leader: topCountries[0]?.country || '-', leaderShare: topCountries[0]?.share || 0,
        totalProducers: topCountries.length,
        latestHHI: hhiTimeline.length > 0 ? hhiTimeline[hhiTimeline.length - 1].hhi : 0,
      });

      const cIns: Insight[] = [];
      const productTR = translateProduct(product);
      const turkeyMover = movers.find((m: any) => m.isTurkey);
      if (turkeyMover && turkeyMover.growth > 10) cIns.push({ id: 'c1', type: 'growth', message: `Türkiye ${productTR} üretimi son 5 yılda %${turkeyMover.growth.toFixed(1)} büyüdü`, severity: 'high', category: 'Büyüme' });
      else if (turkeyMover && turkeyMover.growth < -10) cIns.push({ id: 'c1', type: 'decline', message: `Türkiye ${productTR} üretimi son 5 yılda %${Math.abs(turkeyMover.growth).toFixed(1)} geriledi`, severity: 'high', category: 'Gerileme' });
      if (topGainers.length > 0 && !topGainers[0].isTurkey) cIns.push({ id: 'c2', type: 'info', message: `En hızlı büyüyen: ${topGainers[0].country} (%${topGainers[0].growth.toFixed(1)})`, severity: 'medium', category: 'Rekabet' });
      if (topCountries[0]?.share > 30) cIns.push({ id: 'c3', type: 'warning', message: `${productTR} pazarında ${topCountries[0]?.country} %${topCountries[0]?.share.toFixed(1)} ile dominant`, severity: 'medium', category: 'Konsantrasyon' });
      setCompInsights(cIns);
    } catch (error) { console.error('Competition veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, [compProduct]);

  // ═══════════════════════════════════════════════════════════
  // PREDICTIONS DATA LOADER
  // ═══════════════════════════════════════════════════════════
  const loadPredictionsData = useCallback(async () => {
    setLoading(true);
    try {
      const product = predProduct;
      const safeProduct = product.replace(/'/g, "''");

      const [turkeyProdRes, turkeyYieldRes, turkeyAreaRes, worldProdRes] = await Promise.all([
        fetchQuery(`SELECT year, CAST(uretim_deger AS DECIMAL(20,2)) as production FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead='Türkiye' AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 ORDER BY year`),
        fetchQuery(`SELECT year, CAST(verim_deger AS DECIMAL(20,2)) as yield_val FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead='Türkiye' AND CAST(verim_deger AS DECIMAL(20,2)) > 0 ORDER BY year`),
        fetchQuery(`SELECT year, CAST(miktar_deger AS DECIMAL(20,2)) as area FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead='Türkiye' AND CAST(miktar_deger AS DECIMAL(20,2)) > 0 ORDER BY year`),
        fetchQuery(`SELECT year, SUM(CAST(uretim_deger AS DECIMAL(20,2))) as world_total FROM fao_uretim_bitkisel_birincil WHERE urunad='${safeProduct}' AND ulkead NOT IN ${EXCLUDED_AREAS} AND CAST(uretim_deger AS DECIMAL(20,2)) > 0 GROUP BY year ORDER BY year`)
      ]);

      const turkeyProd: YearValue[] = (turkeyProdRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.production ?? 0)) || 0 }));
      const turkeyYieldArr: YearValue[] = (turkeyYieldRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.yield_val ?? 0)) || 0 }));
      const turkeyAreaArr: YearValue[] = (turkeyAreaRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.area ?? 0)) || 0 }));
      const worldProd: YearValue[] = (worldProdRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(String(r.world_total ?? 0)) || 0 }));

      const prodForecast = forecastLinear(turkeyProd, 3);
      const yieldForecast = forecastLinear(turkeyYieldArr, 3);
      const areaForecast = forecastLinear(turkeyAreaArr, 3);
      const worldForecast = forecastLinear(worldProd, 3);

      setPredProductionForecast(prodForecast);
      setPredYieldForecast(yieldForecast);
      setPredAreaForecast(areaForecast);
      setPredWorldForecast(worldForecast);

      const lastProd = turkeyProd.length > 0 ? turkeyProd[turkeyProd.length - 1].value : 0;
      const forecastProd = prodForecast.forecast.length > 0 ? prodForecast.forecast[prodForecast.forecast.length - 1].value : 0;
      const prodChange = lastProd > 0 ? ((forecastProd - lastProd) / lastProd) * 100 : 0;
      const lastYield = turkeyYieldArr.length > 0 ? turkeyYieldArr[turkeyYieldArr.length - 1].value : 0;
      const forecastYieldVal = yieldForecast.forecast.length > 0 ? yieldForecast.forecast[yieldForecast.forecast.length - 1].value : 0;

      setPredKPIs({
        currentProduction: lastProd, forecastProduction: forecastProd, prodChange,
        currentYield: lastYield, forecastYield: forecastYieldVal,
        r2Production: prodForecast.r2, r2Yield: yieldForecast.r2, trend: prodForecast.trend,
      });

      const pIns: Insight[] = [];
      const productTR = translateProduct(product);
      if (prodChange > 5) pIns.push({ id: 'pd1', type: 'growth', message: `Türkiye ${productTR} üretimi 3 yıl sonra tahminen %${prodChange.toFixed(1)} artacak — ${formatValue(forecastProd)}`, severity: 'high', category: 'Tahmin' });
      else if (prodChange < -5) pIns.push({ id: 'pd1', type: 'warning', message: `Türkiye ${productTR} üretimi 3 yıl sonra tahminen %${Math.abs(prodChange).toFixed(1)} azalacak`, severity: 'high', category: 'Tahmin' });
      if (prodForecast.r2 > 0.8) pIns.push({ id: 'pd2', type: 'info', message: `Üretim tahmin modeli güvenilir (R²=${prodForecast.r2.toFixed(2)})`, severity: 'medium', category: 'Model' });
      else if (prodForecast.r2 < 0.4) pIns.push({ id: 'pd2', type: 'warning', message: `Üretim tahmin modeli düşük güvenilirlik (R²=${prodForecast.r2.toFixed(2)})`, severity: 'medium', category: 'Model' });
      if (forecastYieldVal > lastYield * 1.1) pIns.push({ id: 'pd3', type: 'growth', message: `Verim artışı bekleniyor: ${formatYield(lastYield)} → ${formatYield(forecastYieldVal)}`, severity: 'medium', category: 'Verim' });
      setPredInsights(pIns);
    } catch (error) { console.error('Predictions veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, [predProduct]);

  // ── Tab switching triggers ──
  useEffect(() => {
    if (activeTab === 'overview') loadOverviewData();
    else if (activeTab === 'primary') loadPrimaryData();
    else if (activeTab === 'processed') loadProcessedData();
    else if (activeTab === 'yield') loadYieldData();
    else if (activeTab === 'competition') loadCompetitionData();
    else if (activeTab === 'predictions') loadPredictionsData();
  }, [activeTab, loadOverviewData, loadPrimaryData, loadProcessedData, loadYieldData, loadCompetitionData, loadPredictionsData]);


  // RENDER
  return (
    <div className="production-page" style={{ animation: 'fadeIn 0.3s ease-in' }}>
      <BackToHome />
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {categoryIcon || '🌾'} {categoryTitle || 'Bitkisel Üretim İçgörüleri'}
        </h1>
        <p className="page-subtitle" style={{ opacity: 0.8 }}>
          {categoryFilter
            ? `FAO dünya verileri — ${CROP_CATEGORIES[categoryFilter]?.name || ''} kategorisi — Tarım İçgörü Aracı`
            : 'FAO dünya verileri — 232 ülke, 161 ürün, 24 işlenmiş ürün — Tarım İçgörü Aracı'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '8px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-primary)',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              border: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: '8px', fontSize: '14px', fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
            }}>
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {/* ═══ TAB 1: OVERVIEW ═══ */}
      {activeTab === 'overview' && !loading && overviewKPIs && (
        <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
          <div className="kpi-grid" style={{ marginBottom: '24px' }}>
            <KPICard title="Dünya Toplam Üretim" value={formatValue(overviewKPIs.worldTotal)} subtitle={`Yıllık: ${overviewKPIs.worldYoY >= 0 ? '+' : ''}${overviewKPIs.worldYoY.toFixed(1)}% | ${overviewKPIs.countryCount} ülke`} icon={Globe} color="blue" large />
            <KPICard title="Dünya Ekim Alanı" value={formatHa(overviewKPIs.worldArea)} subtitle={`${overviewKPIs.productCount} ürün`} icon={Layers} color="green" />
            <KPICard title="Dünya Ort. Verim" value={formatYield(overviewKPIs.worldYield)} subtitle="Tüm ürünler ortalaması" icon={Activity} color="teal" />
            <KPICard title="İşlenmiş Üretim" value={formatValue(overviewKPIs.processedTotal)} subtitle={`İşleme oranı: %${overviewKPIs.processingRatio.toFixed(1)}`} icon={Factory} color="purple" />
          </div>
          <div className="kpi-grid" style={{ marginBottom: '24px' }}>
            <KPICard title="🇹🇷 Türkiye Üretim" value={formatValue(overviewKPIs.turkeyTotal)} subtitle={`Dünya ${overviewKPIs.turkeyRank}. | Pay: %${overviewKPIs.turkeyShare.toFixed(1)} | Yıllık: ${overviewKPIs.turkeyYoY >= 0 ? '+' : ''}${overviewKPIs.turkeyYoY.toFixed(1)}%`} icon={Leaf} color="green" large />
            <KPICard title="🇹🇷 Ekim Alanı" value={formatHa(overviewKPIs.turkeyArea)} subtitle={`${overviewKPIs.turkeyProductCount} ürün`} icon={MapPin} color="teal" />
            <KPICard title="🇹🇷 Ort. Verim" value={formatYield(overviewKPIs.turkeyYield)} subtitle={overviewKPIs.turkeyYield > overviewKPIs.worldYield ? '✅ Dünya üstü' : '⚠️ Dünya altı'} icon={TrendingUp} color={overviewKPIs.turkeyYield > overviewKPIs.worldYield ? 'green' : 'red'} />
            <KPICard title="🇹🇷 İşlenmiş" value={formatValue(overviewKPIs.turkeyProcessedTotal)} subtitle={`İşleme: %${overviewSupplyChain?.turkeyProcessingRatio?.toFixed(1) || '?'}`} icon={Factory} color="orange" />
          </div>

          <div style={{ marginBottom: '24px' }}><InsightCard insights={overviewInsights} maxDisplay={10} /></div>

          {overviewSupplyChain && (
            <div className="chart-card" style={{ marginBottom: '24px', padding: '24px' }}>
              <h3 className="chart-title" style={{ marginBottom: '20px' }}>📦 Tedarik Zinciri — Birincil → İşlenmiş</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '2px solid #10b981' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>🌾 Birincil</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>{formatValue(overviewSupplyChain.primaryTotal)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>🇹🇷 {formatValue(overviewSupplyChain.turkeyPrimary)}</div>
                </div>
                <div style={{ fontSize: '28px', color: 'var(--text-secondary)' }}>→</div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(168,85,247,0.1)', borderRadius: '12px', border: '2px solid #a855f7' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>⚙️ İşleme</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#a855f7' }}>%{overviewSupplyChain.processingRatio.toFixed(1)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>🇹🇷 %{overviewSupplyChain.turkeyProcessingRatio.toFixed(1)}</div>
                </div>
                <div style={{ fontSize: '28px', color: 'var(--text-secondary)' }}>→</div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>🏭 İşlenmiş</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6' }}>{formatValue(overviewSupplyChain.processedTotal)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>🇹🇷 {formatValue(overviewSupplyChain.turkeyProcessed)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="chart-grid" style={{ marginBottom: '24px' }}>
            <div className="chart-card">
              <h3 className="chart-title">🇹🇷 Türkiye Ürün Kategorileri (2023)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={overviewCategoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value"
                    label={(props: any) => { const p = props as unknown as Record<string, unknown>; return `${p.name} ${((Number(p.percent) || 0) * 100).toFixed(0)}%`; }}>
                    {overviewCategoryData.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">🌍 Top 15 Üretici Ülke (2023)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={overviewTopCountries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {overviewTopCountries.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.isTurkey ? TURKEY_COLOR : CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid" style={{ marginBottom: '24px' }}>
            <div className="chart-card">
              <h3 className="chart-title">📈 Dünya Üretim Trendi</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={overviewTrends}>
                  <defs><linearGradient id="ovPG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.1} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                  <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                  <Area type="monotone" dataKey="worldProduction" stroke="#10b981" strokeWidth={2} fill="url(#ovPG)" name="Üretim" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">📊 Verim Trendi (kg/ha)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={overviewTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                  <Tooltip formatter={(v: unknown) => formatYield(Number(v))} />
                  <Line type="monotone" dataKey="worldYield" stroke="#3b82f6" strokeWidth={2} dot={false} name="Verim" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 className="chart-title" style={{ marginBottom: '16px' }}>🧭 Derin Analiz Modülleri</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {TABS.filter(t => t.id !== 'overview').map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ padding: '16px', background: 'var(--bg-primary)', border: '2px solid var(--border)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{tab.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>{tab.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tab.desc}</div>
                  <div style={{ marginTop: '8px', color: 'var(--primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Detaylı Analiz <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong>📊 Metodoloji:</strong> FAO FAOSTAT • {overviewKPIs.countryCount} ülke • {overviewKPIs.productCount} birincil + 24 işlenmiş • CAGR, HHI, Volatilite, Anomali, Forecast
          </div>
        </div>
      )}

      {/* ═══ TAB 2: PRIMARY ═══ */}
      {activeTab === 'primary' && !loading && (
        <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Wheat size={14} /> Ürün Seçin</label>
              <select value={primaryProduct} onChange={(e) => setPrimaryProduct(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
              </select>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>
              📊 {primaryProducts.length} ürün mevcut
            </div>
          </div>

          {primaryKPIs && (<>
            <div className="kpi-grid" style={{ marginBottom: '24px' }}>
              <KPICard title={`Dünya ${translateProduct(primaryProduct).substring(0,20)}`} value={formatValue(primaryKPIs.worldTotal)} subtitle={`${primaryKPIs.producerCount} ülke`} icon={Globe} color="blue" large />
              <KPICard title="🇹🇷 Türkiye" value={formatValue(primaryKPIs.turkeyProduction)} subtitle={`${primaryKPIs.turkeyRank}. | %${primaryKPIs.turkeyShare.toFixed(1)}`} icon={Leaf} color="green" />
              <KPICard title="Dünya CAGR" value={`${primaryKPIs.worldCAGR >= 0 ? '+' : ''}${primaryKPIs.worldCAGR.toFixed(2)}%`} subtitle="2000-2023" icon={TrendingUp} color={primaryKPIs.worldCAGR >= 0 ? 'green' : 'red'} />
              <KPICard title="🇹🇷 CAGR" value={`${primaryKPIs.turkeyCAGR >= 0 ? '+' : ''}${primaryKPIs.turkeyCAGR.toFixed(2)}%`} subtitle={`Vol: %${primaryKPIs.turkeyVolatility.toFixed(1)}`} icon={Activity} color={primaryKPIs.turkeyCAGR >= 0 ? 'green' : 'red'} />
            </div>

            {primaryAnomalies.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="#f59e0b" />
                <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 500 }}>
                  {primaryAnomalies.length} anomali: {primaryAnomalies.map((a: any) => `${a.year} (${a.type === 'SPIKE' ? '📈' : '📉'})`).join(', ')}
                </span>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}><InsightCard insights={primaryInsights} maxDisplay={8} /></div>

            <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
              <h3 className="chart-title" style={{ marginBottom: '16px' }}>🏆 Top Üretici — {translateProduct(primaryProduct)} (2023)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['#','Ülke','Üretim','Pay %','Ekim (ha)','Verim'].map(h => <th key={h} style={{ textAlign: h === '#' || h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {primaryTopCountries.slice(0, 15).map((c: any) => (
                    <tr key={c.country} style={{ borderBottom: '1px solid var(--border)', background: c.isTurkey ? 'rgba(255,107,53,0.1)' : 'transparent', fontWeight: c.isTurkey ? 700 : 400 }}>
                      <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.rank}</td>
                      <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatMetric(c.production)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>%{c.share.toFixed(1)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatHa(c.area)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatYield(c.yieldVal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {primaryHHI && (
              <div className="chart-card" style={{ marginBottom: '24px', padding: '20px' }}>
                <h3 className="chart-title" style={{ marginBottom: '16px' }}>📊 Pazar Konsantrasyonu</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>HHI</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: primaryHHI.hhi > 2500 ? '#ef4444' : primaryHHI.hhi > 1500 ? '#f59e0b' : '#10b981' }}>{primaryHHI.hhi.toFixed(0)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{primaryHHI.concentration === 'VERY_HIGH' ? 'Çok Yoğun' : primaryHHI.concentration === 'HIGH' ? 'Yoğun' : primaryHHI.concentration === 'MODERATE' ? 'Orta' : 'Rekabetçi'}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Top 1</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>%{primaryHHI.top1Share.toFixed(1)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{primaryKPIs.leader}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Top 3</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>%{primaryHHI.top3Share.toFixed(1)}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Etkin Üretici</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{primaryHHI.effectiveCompetitors}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="chart-grid" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <h3 className="chart-title">📈 Trend — Dünya vs Türkiye</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={primaryTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: TURKEY_COLOR, fontSize: 11 }} tickFormatter={formatShort} />
                    <Tooltip formatter={(v: unknown, n: unknown) => [formatValue(Number(v)), n === 'world' ? 'Dünya' : '🇹🇷 Türkiye']} />
                    <Legend formatter={(v) => v === 'world' ? 'Dünya' : '🇹🇷 Türkiye'} />
                    <Line yAxisId="left" type="monotone" dataKey="world" stroke="#3b82f6" strokeWidth={2} dot={false} name="world" />
                    <Line yAxisId="right" type="monotone" dataKey="turkey" stroke={TURKEY_COLOR} strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="turkey" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">🥧 Pazar Payı — Top 10</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={primaryTopCountries.slice(0, 10)} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="production" nameKey="country"
                      label={(props: any) => { const p = props as unknown as Record<string, unknown>; return `${String(p.country).substring(0, 10)} ${((Number(p.percent) || 0) * 100).toFixed(0)}%`; }}>
                      {primaryTopCountries.slice(0, 10).map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.isTurkey ? TURKEY_COLOR : CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>)}
        </div>
      )}

      {/* ═══ TAB 3: PROCESSED ═══ */}
      {activeTab === 'processed' && !loading && (
        <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Factory size={14} /> İşlenmiş Ürün</label>
              <select value={processedProduct} onChange={(e) => setProcessedProduct(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                {processedProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
              </select>
            </div>
          </div>

          {processedKPIs && (<>
            <div className="kpi-grid" style={{ marginBottom: '24px' }}>
              <KPICard title="Dünya Toplam" value={formatValue(processedKPIs.worldTotal)} subtitle={`Lider: ${processedKPIs.leader} (%${processedKPIs.leaderShare.toFixed(1)})`} icon={Globe} color="blue" large />
              <KPICard title="🇹🇷 Türkiye" value={formatValue(processedKPIs.turkeyProduction)} subtitle={processedKPIs.turkeyRank > 0 ? `${processedKPIs.turkeyRank}. | %${processedKPIs.turkeyShare.toFixed(1)}` : 'Sıralama dışı'} icon={Factory} color="green" />
              <KPICard title="Dünya CAGR" value={`${processedKPIs.worldCAGR >= 0 ? '+' : ''}${processedKPIs.worldCAGR.toFixed(2)}%`} subtitle="Bileşik büyüme" icon={TrendingUp} color={processedKPIs.worldCAGR >= 0 ? 'green' : 'red'} />
              <KPICard title="🇹🇷 CAGR" value={`${processedKPIs.turkeyCAGR >= 0 ? '+' : ''}${processedKPIs.turkeyCAGR.toFixed(2)}%`} subtitle="Türkiye büyüme" icon={Activity} color={processedKPIs.turkeyCAGR >= 0 ? 'green' : 'red'} />
            </div>

            <div style={{ marginBottom: '24px' }}><InsightCard insights={processedInsights} maxDisplay={6} /></div>

            <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
              <h3 className="chart-title" style={{ marginBottom: '16px' }}>🏆 Top Üretici — {translateProduct(processedProduct).substring(0, 40)}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['#','Ülke','Üretim','Pay %'].map(h => <th key={h} style={{ textAlign: h === '#' || h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {processedTopCountries.slice(0, 15).map((c: any) => (
                    <tr key={c.country} style={{ borderBottom: '1px solid var(--border)', background: c.isTurkey ? 'rgba(255,107,53,0.1)' : 'transparent', fontWeight: c.isTurkey ? 700 : 400 }}>
                      <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.rank}</td>
                      <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatMetric(c.production)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>%{c.share.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="chart-grid" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <h3 className="chart-title">📈 Trend — Dünya vs Türkiye</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={processedTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: TURKEY_COLOR, fontSize: 11 }} tickFormatter={formatShort} />
                    <Tooltip formatter={(v: unknown, n: unknown) => [formatValue(Number(v)), n === 'world' ? 'Dünya' : '🇹🇷 Türkiye']} />
                    <Legend formatter={(v) => v === 'world' ? 'Dünya' : '🇹🇷 Türkiye'} />
                    <Line yAxisId="left" type="monotone" dataKey="world" stroke="#3b82f6" strokeWidth={2} dot={false} name="world" />
                    <Line yAxisId="right" type="monotone" dataKey="turkey" stroke={TURKEY_COLOR} strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="turkey" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">🥧 Pazar Payı — Top 10</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={processedTopCountries.slice(0, 10)} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="production" nameKey="country"
                      label={(props: any) => { const p = props as unknown as Record<string, unknown>; return `${String(p.country).substring(0, 10)} ${((Number(p.percent) || 0) * 100).toFixed(0)}%`; }}>
                      {processedTopCountries.slice(0, 10).map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.isTurkey ? TURKEY_COLOR : CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>)}
        </div>
      )}

      {/* ═══ TAB 4: YIELD ═══ */}
      {activeTab === 'yield' && !loading && (
        <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Target size={14} /> Verim Analizi</label>
              <select value={yieldProduct} onChange={(e) => setYieldProduct(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
              </select>
            </div>
          </div>

          {yieldKPIs && (<>
            <div className="kpi-grid" style={{ marginBottom: '24px' }}>
              <KPICard title="🇹🇷 Verim" value={formatYield(yieldKPIs.turkeyYield)} subtitle={`${yieldKPIs.turkeyRank}./${yieldKPIs.totalRanked}`} icon={Target} color={yieldKPIs.turkeyYield > yieldKPIs.worldAvgYield ? 'green' : 'red'} large />
              <KPICard title="Dünya Ort." value={formatYield(yieldKPIs.worldAvgYield)} subtitle="Tüm üreticiler" icon={Globe} color="blue" />
              <KPICard title="Lider" value={formatYield(yieldKPIs.leaderYield)} subtitle={yieldKPIs.leader} icon={Award} color="purple" />
              <KPICard title="Gap" value={`%${yieldKPIs.gapToLeader.toFixed(0)}`} subtitle={yieldKPIs.catchUpYears ? `~${yieldKPIs.catchUpYears}y` : 'N/A'} icon={AlertTriangle} color={yieldKPIs.gapToLeader > 50 ? 'red' : 'orange'} />
            </div>

            <div style={{ marginBottom: '24px' }}><InsightCard insights={yieldInsights} maxDisplay={6} /></div>

            <div className="chart-grid" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <h3 className="chart-title">📊 Verim Gap Analizi</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={yieldGapData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => formatYield(Number(v))} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {yieldGapData.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">📊 Segmented — Gelişmiş vs Gelişmekte</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={yieldSegmented}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => formatYield(Number(v))} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {yieldSegmented.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-grid" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <h3 className="chart-title">🔬 Alan vs Verim (Scatter)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="x" name="Alan" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v: number) => formatHa(v)} />
                    <YAxis dataKey="y" name="Verim" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip content={({ active, payload }: any) => {
                      if (active && payload?.[0]) { const d = payload[0].payload; return (
                        <div style={{ padding: '8px 12px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 700, color: d.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{d.isTurkey ? '🇹🇷 ' : ''}{d.name}</div>
                          <div>Alan: {formatHa(d.x)}</div><div>Verim: {formatYield(d.y)}</div><div>Üretim: {formatValue(d.z)}</div>
                        </div>); } return null;
                    }} />
                    <Scatter data={yieldScatter.filter((d: any) => !d.isTurkey)} fill="#3b82f6" fillOpacity={0.6} />
                    <Scatter data={yieldScatter.filter((d: any) => d.isTurkey)} fill={TURKEY_COLOR} fillOpacity={1} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">📈 Verim Trendi — Dünya vs Türkiye</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={yieldTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown, n: unknown) => [formatYield(Number(v)), n === 'world' ? 'Dünya' : '🇹🇷 Türkiye']} />
                    <Legend formatter={(v) => v === 'world' ? 'Dünya' : '🇹🇷 Türkiye'} />
                    <Line type="monotone" dataKey="world" stroke="#3b82f6" strokeWidth={2} dot={false} name="world" />
                    <Line type="monotone" dataKey="turkey" stroke={TURKEY_COLOR} strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="turkey" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
              <h3 className="chart-title" style={{ marginBottom: '16px' }}>🏅 En Verimli 10 Ülke</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['#','Ülke','Verim (kg/ha)','Üretim','Ekim (ha)'].map(h => <th key={h} style={{ textAlign: h === '#' || h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {yieldBestPractices.map((c: any) => (
                    <tr key={c.country} style={{ borderBottom: '1px solid var(--border)', background: c.isTurkey ? 'rgba(255,107,53,0.1)' : 'transparent', fontWeight: c.isTurkey ? 700 : 400 }}>
                      <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.rank}</td>
                      <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{formatYield(c.yieldVal)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatMetric(c.production)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatHa(c.area)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}
        </div>
      )}

      {/* ═══ TAB 5: COMPETITION ═══ */}
      {activeTab === 'competition' && !loading && (
        <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Zap size={14} /> Rekabet Analizi</label>
              <select value={compProduct} onChange={(e) => setCompProduct(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
              </select>
            </div>
          </div>

          {compKPIs && (<>
            <div className="kpi-grid" style={{ marginBottom: '24px' }}>
              <KPICard title="🇹🇷 Sıra" value={compKPIs.turkeyRank > 0 ? `${compKPIs.turkeyRank}.` : 'N/A'} subtitle={`%${compKPIs.turkeyShare.toFixed(1)} pay`} icon={Target} color="green" large />
              <KPICard title="Lider" value={compKPIs.leader} subtitle={`%${compKPIs.leaderShare.toFixed(1)}`} icon={Award} color="blue" />
              <KPICard title="HHI" value={compKPIs.latestHHI.toFixed(0)} subtitle={compKPIs.latestHHI > 2500 ? 'Çok Yoğun' : compKPIs.latestHHI > 1500 ? 'Yoğun' : 'Rekabetçi'} icon={BarChart2} color={compKPIs.latestHHI > 2500 ? 'red' : 'orange'} />
              <KPICard title="Üreticiler" value={String(compKPIs.totalProducers)} subtitle="Top 20" icon={Globe} color="purple" />
            </div>

            <div style={{ marginBottom: '24px' }}><InsightCard insights={compInsights} maxDisplay={6} /></div>

            {compTopMovers && (
              <div className="chart-grid" style={{ marginBottom: '24px' }}>
                <div className="chart-card" style={{ padding: '20px' }}>
                  <h3 className="chart-title" style={{ marginBottom: '16px', color: '#10b981' }}>📈 En Hızlı Büyüyenler (5Y)</h3>
                  {compTopMovers.gainers.slice(0, 6).map((m: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: m.isTurkey ? 700 : 400, color: m.isTurkey ? TURKEY_COLOR : 'var(--text-primary)', fontSize: '13px' }}>{m.isTurkey ? '🇹🇷 ' : ''}{m.country}</span>
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: '13px' }}>+{m.growth.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <div className="chart-card" style={{ padding: '20px' }}>
                  <h3 className="chart-title" style={{ marginBottom: '16px', color: '#ef4444' }}>📉 En Çok Gerileyenler (5Y)</h3>
                  {compTopMovers.decliners.slice(0, 6).map((m: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: m.isTurkey ? 700 : 400, color: m.isTurkey ? TURKEY_COLOR : 'var(--text-primary)', fontSize: '13px' }}>{m.isTurkey ? '🇹🇷 ' : ''}{m.country}</span>
                      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>{m.growth.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {compMatrix.length > 0 && (
              <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
                <h3 className="chart-title" style={{ marginBottom: '16px' }}>⚔️ Rekabet Matrisi</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Ülke','Üretim','Pay %','Ekim','Verim'].map(h => <th key={h} style={{ textAlign: h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {compMatrix.map((c: any) => (
                      <tr key={c.country} style={{ borderBottom: '1px solid var(--border)', background: c.isTurkey ? 'rgba(255,107,53,0.15)' : 'transparent', fontWeight: c.isTurkey ? 700 : 400 }}>
                        <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatMetric(c.production)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>%{c.share.toFixed(1)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatHa(c.area)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatYield(c.yieldVal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="chart-grid" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <h3 className="chart-title">💹 Büyüme vs Üretim</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="x" name="5Y %" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis dataKey="y" name="Üretim" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <Tooltip content={({ active, payload }: any) => {
                      if (active && payload?.[0]) { const d = payload[0].payload; return (
                        <div style={{ padding: '8px 12px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 700, color: d.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{d.isTurkey ? '🇹🇷 ' : ''}{d.name}</div>
                          <div>Büyüme: %{Number(d.x).toFixed(1)}</div><div>Üretim: {formatValue(d.y)}</div>
                        </div>); } return null;
                    }} />
                    <ReferenceLine x={0} stroke="var(--text-secondary)" strokeDasharray="3 3" />
                    <Scatter data={compBubbleData.filter((d: any) => !d.isTurkey)} fill="#3b82f6" fillOpacity={0.6} />
                    <Scatter data={compBubbleData.filter((d: any) => d.isTurkey)} fill={TURKEY_COLOR} fillOpacity={1} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">📊 HHI Trendi (2005-2023)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={compHHITimeline}>
                    <defs><linearGradient id="hhiG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => [`${Number(v).toFixed(0)}`, 'HHI']} />
                    <ReferenceLine y={2500} stroke="#ef4444" strokeDasharray="5 5" />
                    <ReferenceLine y={1500} stroke="#f59e0b" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="hhi" stroke="#a855f7" strokeWidth={2} fill="url(#hhiG)" name="HHI" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>)}
        </div>
      )}

      {/* ═══ TAB 6: PREDICTIONS ═══ */}
      {activeTab === 'predictions' && !loading && (
        <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Sprout size={14} /> Tahmin</label>
              <select value={predProduct} onChange={(e) => setPredProduct(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
              </select>
            </div>
          </div>

          {predKPIs && (<>
            <div className="kpi-grid" style={{ marginBottom: '24px' }}>
              <KPICard title="Mevcut" value={formatValue(predKPIs.currentProduction)} subtitle="Son yıl" icon={Leaf} color="blue" />
              <KPICard title="3Y Tahmin" value={formatValue(predKPIs.forecastProduction)} subtitle={`${predKPIs.prodChange >= 0 ? '+' : ''}${predKPIs.prodChange.toFixed(1)}%`} icon={predKPIs.prodChange >= 0 ? TrendingUp : TrendingDown} color={predKPIs.prodChange >= 0 ? 'green' : 'red'} large />
              <KPICard title="Model" value={`R²=${predKPIs.r2Production.toFixed(2)}`} subtitle={predKPIs.r2Production > 0.7 ? '✅ Güvenilir' : '⚠️ Düşük'} icon={Activity} color={predKPIs.r2Production > 0.7 ? 'green' : 'orange'} />
              <KPICard title="Verim Tahmini" value={formatYield(predKPIs.forecastYield)} subtitle={`Mevcut: ${formatYield(predKPIs.currentYield)}`} icon={Target} color="purple" />
            </div>

            <div style={{ marginBottom: '24px' }}><InsightCard insights={predInsights} maxDisplay={6} /></div>

            <div className="chart-grid" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <h3 className="chart-title">🔮 Türkiye Üretim Tahmin</h3>
                {predProductionForecast && (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={[...predProductionForecast.historical, ...predProductionForecast.forecast.map((f: any) => ({ ...f, isForecast: true }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                      <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                      <Line type="monotone" dataKey="value" stroke={TURKEY_COLOR} strokeWidth={2} dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isForecast) return <circle cx={cx} cy={cy} r={5} fill="white" stroke={TURKEY_COLOR} strokeWidth={2} />;
                        return <circle cx={cx} cy={cy} r={3} fill={TURKEY_COLOR} />;
                      }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="chart-card">
                <h3 className="chart-title">🔮 Dünya Üretim Tahmin</h3>
                {predWorldForecast && (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={[...predWorldForecast.historical, ...predWorldForecast.forecast.map((f: any) => ({ ...f, isForecast: true }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                      <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isForecast) return <circle cx={cx} cy={cy} r={5} fill="white" stroke="#3b82f6" strokeWidth={2} />;
                        return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />;
                      }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="chart-grid" style={{ marginBottom: '24px' }}>
              <div className="chart-card">
                <h3 className="chart-title">📊 Verim Tahmini</h3>
                {predYieldForecast && (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[...predYieldForecast.historical, ...predYieldForecast.forecast.map((f: any) => ({ ...f, isForecast: true }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: unknown) => formatYield(Number(v))} />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isForecast) return <circle cx={cx} cy={cy} r={5} fill="white" stroke="#10b981" strokeWidth={2} />;
                        return <circle cx={cx} cy={cy} r={3} fill="#10b981" />;
                      }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="chart-card">
                <h3 className="chart-title">📊 Ekim Alanı Tahmini</h3>
                {predAreaForecast && (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[...predAreaForecast.historical, ...predAreaForecast.forecast.map((f: any) => ({ ...f, isForecast: true }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v: number) => formatHa(v)} />
                      <Tooltip formatter={(v: unknown) => formatHa(Number(v))} />
                      <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isForecast) return <circle cx={cx} cy={cy} r={5} fill="white" stroke="#a855f7" strokeWidth={2} />;
                        return <circle cx={cx} cy={cy} r={3} fill="#a855f7" />;
                      }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {predProductionForecast && (
              <div className="chart-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <h3 className="chart-title" style={{ marginBottom: '16px' }}>📋 Senaryo Karşılaştırma</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>📉 Kötümser (-20%)</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatValue(predKPIs.forecastProduction * 0.8)}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, marginBottom: '8px' }}>📊 Baz Senaryo</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatValue(predKPIs.forecastProduction)}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>📈 İyimser (+20%)</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatValue(predKPIs.forecastProduction * 1.2)}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <strong>🔬 Model:</strong> Lineer regresyon • R²(üretim): {predKPIs.r2Production.toFixed(3)} • R²(verim): {predKPIs.r2Yield.toFixed(3)} • 3 yıl ileriye • Güven: ±20%
            </div>
          </>)}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
