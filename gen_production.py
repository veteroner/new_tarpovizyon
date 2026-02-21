#!/usr/bin/env python3
"""Generate the complete rewritten ProductionPage.tsx"""
import os

content = r'''import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Leaf, TrendingUp, TrendingDown, MapPin, Download, Calendar,
  PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, BarChart2,
  Globe, Factory, Target, Zap, Award, Activity, AlertTriangle,
  ChevronRight, Layers, Sprout, Wheat, Droplets
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { InsightCard, Insight } from '../components/InsightCard';
import { BackToHome } from '../components/BackToHome';
import { Loading } from '../components/Loading';
import { fetchQuery } from '../services/api';
import {
  calculateCAGR, calculateHHI, calculateYoY, calculateVolatility,
  detectAnomalies, forecastLinear, findTopMovers, calculatePercentile,
  formatMetric, YearValue, HHIResult
} from '../utils/livestockCalculations';

// ─── TYPES ──────────────────────────────────────────────────
type Tab = 'overview' | 'primary' | 'processed' | 'yield' | 'competition' | 'predictions';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍', desc: 'Dünya bitkisel üretim özeti' },
  { id: 'primary', label: 'Birincil Üretim', icon: '🌾', desc: 'FAO birincil ürün analizi' },
  { id: 'processed', label: 'İşlenmiş Üretim', icon: '🏭', desc: 'İşlenmiş tarım ürünleri' },
  { id: 'yield', label: 'Verim Analizi', icon: '📊', desc: 'Verim intelligence & gap analizi' },
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
export function ProductionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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

      const worldTotal = parseFloat(worldRow?.total_production) || 0;
      const worldArea = parseFloat(worldRow?.total_area) || 0;
      const worldYield = parseFloat(worldRow?.avg_yield) || 0;
      const turkeyTotal = parseFloat(turkeyRow?.total_production) || 0;
      const turkeyArea = parseFloat(turkeyRow?.total_area) || 0;
      const turkeyYield = parseFloat(turkeyRow?.avg_yield) || 0;
      const turkeyRank = parseInt(turkeyRow?.turkey_rank) || 0;
      const processedTotal = parseFloat(processedRow?.total_processed) || 0;
      const turkeyProcessedTotal = parseFloat(turkeyProcessedRow?.total_processed) || 0;
      const prevWorldTotal = parseFloat(prevWorldRow?.total_production) || 0;
      const prevTurkeyTotal = parseFloat(prevTurkeyRow?.total_production) || 0;

      const worldYoY = calculateYoY(worldTotal, prevWorldTotal);
      const turkeyYoY = calculateYoY(turkeyTotal, prevTurkeyTotal);
      const turkeyShare = worldTotal > 0 ? (turkeyTotal / worldTotal) * 100 : 0;
      const processingRatio = worldTotal > 0 ? (processedTotal / worldTotal) * 100 : 0;

      setOverviewKPIs({
        worldTotal, worldArea, worldYield, worldYoY,
        turkeyTotal, turkeyArea, turkeyYield, turkeyYoY, turkeyRank, turkeyShare,
        processedTotal, turkeyProcessedTotal, processingRatio,
        countryCount: parseInt(worldRow?.country_count) || 0,
        productCount: parseInt(worldRow?.product_count) || 0,
        turkeyProductCount: parseInt(turkeyRow?.product_count) || 0,
      });

      const trends = (trendRes.data || []).map((r: any) => ({
        year: r.year,
        worldProduction: parseFloat(r.world_production) || 0,
        worldArea: parseFloat(r.world_area) || 0,
        worldYield: parseFloat(r.world_yield) || 0,
      }));
      setOverviewTrends(trends);

      const catMap = new Map<string, { name: string; value: number; color: string }>();
      (categoryRes.data || []).forEach((r: any) => {
        const cat = getCropCategory(r.urunad);
        const val = parseFloat(r.production) || 0;
        if (catMap.has(cat.key)) { catMap.get(cat.key)!.value += val; }
        else { catMap.set(cat.key, { name: cat.name, value: val, color: cat.color }); }
      });
      setOverviewCategoryData(Array.from(catMap.values()).sort((a, b) => b.value - a.value));

      setOverviewTopCountries((topCountriesRes.data || []).map((r: any) => ({
        name: r.ulkead, value: parseFloat(r.total_production) || 0, isTurkey: r.ulkead === 'Türkiye',
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
      insights.push({ id: 'ov8', type: 'info', message: `FAO veritabanında ${parseInt(worldRow?.country_count) || 0} ülke, ${parseInt(worldRow?.product_count) || 0} birincil ürün takip ediliyor — Türkiye ${parseInt(turkeyRow?.product_count) || 0} üründe üretim yapıyor`, severity: 'low', category: 'Kapsam' });
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
        setPrimaryProducts((prodRes.data || []).map((r: any) => r.urunad));
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

      const worldTotal = parseFloat(worldTotalRes.data?.[0]?.world_total) || 0;
      const topCountries = (topRes.data || []).map((r: any, i: number) => ({
        rank: i + 1, country: r.ulkead, production: parseFloat(r.production) || 0,
        area: parseFloat(r.area) || 0, yieldVal: parseFloat(r.yield_val) || 0,
        isTurkey: r.ulkead === 'Türkiye',
        share: worldTotal > 0 ? ((parseFloat(r.production) || 0) / worldTotal) * 100 : 0,
      }));
      setPrimaryTopCountries(topCountries);

      const turkeyInTop = topCountries.find((c: any) => c.isTurkey);
      const worldTrend = (trendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.world_total) || 0 }));
      const turkeyTrend = (turkeyTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.production) || 0 }));
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
        turkeyVolatility: turkeyVol, producerCount: parseInt(trendRes.data?.[trendRes.data.length - 1]?.producer_count) || 0,
        leader: topCountries[0]?.country || '-', leaderProduction: topCountries[0]?.production || 0, leaderShare: topCountries[0]?.share || 0,
      });

      const ins: Insight[] = [];
      if (turkeyInTop && turkeyInTop.rank <= 5) ins.push({ id: 'pr1', type: 'achievement', message: `Türkiye ${product} üretiminde dünya ${turkeyInTop.rank}. sırası — %${turkeyInTop.share.toFixed(1)} pazar payı`, severity: 'high', category: product });
      else if (turkeyInTop && turkeyInTop.rank <= 15) ins.push({ id: 'pr1', type: 'info', message: `Türkiye ${product} üretiminde dünya ${turkeyInTop.rank}. sırası`, severity: 'medium', category: product });
      if (turkeyCAGR && turkeyCAGR.cagr > 2) ins.push({ id: 'pr2', type: 'growth', message: `Türkiye ${product} üretimi yıllık %${turkeyCAGR.cagr.toFixed(1)} CAGR ile büyüyor`, severity: 'medium', category: 'Trend' });
      else if (turkeyCAGR && turkeyCAGR.cagr < -1) ins.push({ id: 'pr2', type: 'decline', message: `Türkiye ${product} üretimi yıllık %${Math.abs(turkeyCAGR.cagr).toFixed(1)} CAGR ile geriliyor`, severity: 'high', category: 'Risk' });
      if (hhi && hhi.concentration === 'VERY_HIGH') ins.push({ id: 'pr3', type: 'warning', message: `${product} pazarı çok yoğun (HHI: ${hhi.hhi.toFixed(0)}) — ${topCountries[0]?.country} %${topCountries[0]?.share.toFixed(1)} ile dominant`, severity: 'high', category: 'Pazar' });
      if (turkeyVol > 15) ins.push({ id: 'pr4', type: 'warning', message: `Türkiye ${product} üretimi yüksek volatilite gösteriyor (%${turkeyVol.toFixed(1)})`, severity: 'high', category: 'Risk' });
      if (realAnomalies.length > 0) { const la = realAnomalies[realAnomalies.length - 1]; ins.push({ id: 'pr5', type: la.type === 'SPIKE' ? 'growth' : 'warning', message: `${la.year} yılında ${product} üretiminde ${la.type === 'SPIKE' ? 'ani artış' : 'ani düşüş'} (z-score: ${la.zScore.toFixed(1)})`, severity: 'medium', category: 'Anomali' }); }
      if (worldCAGR && turkeyCAGR && turkeyCAGR.cagr > worldCAGR.cagr) ins.push({ id: 'pr6', type: 'growth', message: `Türkiye ${product} büyüme hızı (%${turkeyCAGR.cagr.toFixed(1)}) dünya ortalamasının (%${worldCAGR.cagr.toFixed(1)}) üzerinde`, severity: 'medium', category: 'Rekabet' });
      setPrimaryInsights(ins);
    } catch (error) { console.error('Primary veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, [primaryProduct, primaryProducts.length]);

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

      const worldTotal = parseFloat(worldTotalRes.data?.[0]?.world_total) || 0;
      const topCountries = (topRes.data || []).map((r: any, i: number) => ({
        rank: i + 1, country: r.ulkead, production: parseFloat(r.production) || 0,
        share: worldTotal > 0 ? (parseFloat(r.production) / worldTotal) * 100 : 0,
        isTurkey: r.ulkead === 'Türkiye',
      }));
      setProcessedTopCountries(topCountries);

      const worldTrend = (trendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.world_total) || 0 }));
      const turkeyTrend = (turkeyTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.production) || 0 }));
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
      if (turkeyInTop && turkeyInTop.rank <= 10) ins.push({ id: 'pc1', type: 'achievement', message: `Türkiye ${product} üretiminde dünya ${turkeyInTop.rank}. — %${turkeyInTop.share.toFixed(1)} pazar payı`, severity: 'high', category: 'Sıralama' });
      if (turkeyCAGR && turkeyCAGR.cagr > 3) ins.push({ id: 'pc2', type: 'growth', message: `Türkiye ${product} üretimi yıllık %${turkeyCAGR.cagr.toFixed(1)} CAGR ile hızla büyüyor`, severity: 'medium', category: 'Büyüme' });
      if (worldCAGR && worldCAGR.cagr < 0) ins.push({ id: 'pc3', type: 'decline', message: `Dünya ${product} üretimi yıllık %${Math.abs(worldCAGR.cagr).toFixed(1)} CAGR ile geriliyor`, severity: 'medium', category: 'Trend' });
      if (topCountries[0]?.share > 40) ins.push({ id: 'pc4', type: 'warning', message: `${product} pazarında ${topCountries[0]?.country} %${topCountries[0]?.share.toFixed(1)} ile baskın — tedarik riski`, severity: 'high', category: 'Konsantrasyon' });
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
        rank: i + 1, country: r.ulkead, yieldVal: parseFloat(r.yield_val) || 0,
        production: parseFloat(r.production) || 0, area: parseFloat(r.area) || 0, isTurkey: r.ulkead === 'Türkiye',
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
        name: r.ulkead, x: parseFloat(r.area) || 0, y: parseFloat(r.yield_val) || 0,
        z: parseFloat(r.production) || 0, isTurkey: r.ulkead === 'Türkiye',
      }));
      setYieldScatter(scatter);

      const worldYieldTrend = (yieldTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.avg_yield) || 0 }));
      const turkeyYieldTrend = (turkeyYieldTrendRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.yield_val) || 0 }));
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
      if (turkeyYield > worldAvgYield) yIns.push({ id: 'y1', type: 'achievement', message: `Türkiye ${product} verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldAvgYield)}) %${((turkeyYield / worldAvgYield - 1) * 100).toFixed(0)} üzerinde`, severity: 'high', category: 'Verim' });
      else yIns.push({ id: 'y1', type: 'warning', message: `Türkiye ${product} verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldAvgYield)}) %${Math.abs(gapToWorld).toFixed(0)} altında`, severity: 'high', category: 'Verim' });
      if (gapToLeader > 50) yIns.push({ id: 'y2', type: 'warning', message: `${leader?.country} (${formatYield(leaderYield)}) lider — Türkiye'nin verim açığı %${gapToLeader.toFixed(0)}`, severity: 'high', category: 'Gap' });
      if (catchUpYears !== Infinity && catchUpYears < 50) yIns.push({ id: 'y3', type: 'info', message: `Mevcut CAGR (%${turkeyYieldCAGR?.cagr.toFixed(1)}) ile lidere tahmini ${catchUpYears} yılda yetişilir`, severity: 'medium', category: 'Projeksiyon' });
      if (turkeyYieldCAGR && turkeyYieldCAGR.cagr > 2) yIns.push({ id: 'y4', type: 'growth', message: `Türkiye ${product} verimi yıllık %${turkeyYieldCAGR.cagr.toFixed(1)} CAGR ile artıyor`, severity: 'medium', category: 'Trend' });
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

      const worldTotal = (topRes.data || []).reduce((s: number, r: any) => s + (parseFloat(r.production) || 0), 0);
      const topCountries = (topRes.data || []).map((r: any, i: number) => ({
        rank: i + 1, country: r.ulkead, production: parseFloat(r.production) || 0,
        area: parseFloat(r.area) || 0, yieldVal: parseFloat(r.yield_val) || 0,
        share: worldTotal > 0 ? (parseFloat(r.production) / worldTotal) * 100 : 0,
        isTurkey: r.ulkead === 'Türkiye',
      }));

      const movers = (cagrRes.data || []).map((r: any) => {
        const now = parseFloat(r.prod_now) || 0;
        const prev = parseFloat(r.prod_5y) || 0;
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
      const turkeyMover = movers.find((m: any) => m.isTurkey);
      if (turkeyMover && turkeyMover.growth > 10) cIns.push({ id: 'c1', type: 'growth', message: `Türkiye ${product} üretimi son 5 yılda %${turkeyMover.growth.toFixed(1)} büyüdü`, severity: 'high', category: 'Büyüme' });
      else if (turkeyMover && turkeyMover.growth < -10) cIns.push({ id: 'c1', type: 'decline', message: `Türkiye ${product} üretimi son 5 yılda %${Math.abs(turkeyMover.growth).toFixed(1)} geriledi`, severity: 'high', category: 'Gerileme' });
      if (topGainers.length > 0 && !topGainers[0].isTurkey) cIns.push({ id: 'c2', type: 'info', message: `En hızlı büyüyen: ${topGainers[0].country} (%${topGainers[0].growth.toFixed(1)})`, severity: 'medium', category: 'Rekabet' });
      if (topCountries[0]?.share > 30) cIns.push({ id: 'c3', type: 'warning', message: `${product} pazarında ${topCountries[0]?.country} %${topCountries[0]?.share.toFixed(1)} ile dominant`, severity: 'medium', category: 'Konsantrasyon' });
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

      const turkeyProd: YearValue[] = (turkeyProdRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.production) || 0 }));
      const turkeyYieldArr: YearValue[] = (turkeyYieldRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.yield_val) || 0 }));
      const turkeyAreaArr: YearValue[] = (turkeyAreaRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.area) || 0 }));
      const worldProd: YearValue[] = (worldProdRes.data || []).map((r: any) => ({ year: r.year, value: parseFloat(r.world_total) || 0 }));

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
      if (prodChange > 5) pIns.push({ id: 'pd1', type: 'growth', message: `Türkiye ${product} üretimi 3 yıl sonra tahminen %${prodChange.toFixed(1)} artacak — ${formatValue(forecastProd)}`, severity: 'high', category: 'Tahmin' });
      else if (prodChange < -5) pIns.push({ id: 'pd1', type: 'warning', message: `Türkiye ${product} üretimi 3 yıl sonra tahminen %${Math.abs(prodChange).toFixed(1)} azalacak`, severity: 'high', category: 'Tahmin' });
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
'''

outpath = '/Volumes/LaCie/dashboard-project/src/pages/ProductionPage.tsx'
with open(outpath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Part 1 written: {len(content)} chars")
