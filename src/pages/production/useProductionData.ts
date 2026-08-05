/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import type { Insight } from '../../components/InsightCard';
import { fetchAgg, latestYear, num } from '../../services/d1';
import { translateProduct } from '../../utils/productTranslations';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, calculateYoY, calculateVolatility,
  detectAnomalies, forecastLinear,
} from '../../utils/livestockCalculations';
import type { YearValue, HHIResult } from '../../utils/livestockCalculations';
import {
  CROP_CATEGORIES, TURKEY_COLOR, DEVELOPED_COUNTRIES,
  getCropCategory, formatValue, formatYield,
  type Tab,
} from './productionTypes';

// D1 toplama rotaları. Kıta/toplam satırları sunucudaki 'v1' hazır listesiyle
// dışlanıyor — frontend'deki EXCLUDED_AREAS ile aynı içerik.
const R_BIR = 'fao/uretim-bitkisel-birincil';
const R_ISL = 'fao/uretim-bitkisel-islenmis';
const EX = { preset: 'v1' as const, col: 'ulkead' };
const TR = 'Türkiye';

export interface UseProductionDataReturn {
  // core
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  loading: boolean;
  // overview
  overviewKPIs: any;
  overviewTrends: any[];
  overviewCategoryData: any[];
  overviewTopCountries: any[];
  overviewInsights: Insight[];
  overviewSupplyChain: any;
  // primary
  primaryProduct: string;
  setPrimaryProduct: (v: string) => void;
  primaryProducts: string[];
  primaryTopCountries: any[];
  primaryTrends: any[];
  primaryKPIs: any;
  primaryHHI: HHIResult | null;
  primaryInsights: Insight[];
  primaryAnomalies: any[];
  // processed
  processedProduct: string;
  setProcessedProduct: (v: string) => void;
  processedProducts: string[];
  processedTopCountries: any[];
  processedTrends: any[];
  processedKPIs: any;
  processedInsights: Insight[];
  // yield
  yieldProduct: string;
  setYieldProduct: (v: string) => void;
  yieldKPIs: any;
  yieldGapData: any[];
  yieldScatter: any[];
  yieldTrends: any[];
  yieldBestPractices: any[];
  yieldInsights: Insight[];
  yieldSegmented: any[];
  // competition
  compProduct: string;
  setCompProduct: (v: string) => void;
  compTopMovers: any;
  compBubbleData: any[];
  compMatrix: any[];
  compHHITimeline: any[];
  compKPIs: any;
  compInsights: Insight[];
  // predictions
  predProduct: string;
  setPredProduct: (v: string) => void;
  predProductionForecast: any;
  predYieldForecast: any;
  predAreaForecast: any;
  predWorldForecast: any;
  predKPIs: any;
  predInsights: Insight[];
}

export function useProductionData(categoryFilter?: string): UseProductionDataReturn {
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
      const [yil, islenmisYil] = await Promise.all([
        latestYear(R_BIR, 'year'), latestYear(R_ISL, 'year'),
      ]);
      const oncekiYil = (yil ?? 0) - 1;

      const [worldTotalRes, turkeyRes, trendRes, categoryRes, processedTotalRes] = await Promise.all([
        fetchAgg(R_BIR, { sum: ['uretim_deger', 'miktar_deger'], avg: ['verim_deger'], countDistinct: ['ulkead', 'urunad'], where: { year: yil }, positive: ['uretim_deger'], exclude: EX }),
        fetchAgg(R_BIR, { sum: ['uretim_deger', 'miktar_deger'], avg: ['verim_deger'], countDistinct: ['urunad'], where: { year: yil, ulkead: TR }, positive: ['uretim_deger'] }),
        fetchAgg(R_BIR, { groupBy: ['year'], sum: ['uretim_deger', 'miktar_deger'], avg: ['verim_deger'], positive: ['uretim_deger'], exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { groupBy: ['urunad'], sum: ['uretim_deger', 'miktar_deger'], avg: ['verim_deger'], where: { year: yil, ulkead: TR }, positive: ['uretim_deger'], orderBy: 'sum_uretim_deger', dir: 'desc' }),
        fetchAgg(R_ISL, { sum: ['uretim_deger'], countDistinct: ['urunad', 'ulkead'], where: { year: islenmisYil }, positive: ['uretim_deger'], exclude: EX }),
      ]);

      const [prevWorldRes, prevTurkeyRes, siralamaRes, turkeyProcessedRes] = await Promise.all([
        fetchAgg(R_BIR, { sum: ['uretim_deger'], where: { year: oncekiYil }, positive: ['uretim_deger'], exclude: EX }),
        fetchAgg(R_BIR, { sum: ['uretim_deger'], where: { year: oncekiYil, ulkead: TR }, positive: ['uretim_deger'] }),
        // Türkiye'nin sırası eskiden iç içe alt sorgu + HAVING ile bulunuyordu.
        // Tam ülke listesi tek seferde çekilip hem sıra hem ilk 15 buradan.
        fetchAgg(R_BIR, { groupBy: ['ulkead'], sum: ['uretim_deger'], where: { year: yil }, positive: ['uretim_deger'], exclude: EX, orderBy: 'sum_uretim_deger', dir: 'desc' }),
        fetchAgg(R_ISL, { sum: ['uretim_deger'], where: { year: islenmisYil, ulkead: TR }, positive: ['uretim_deger'] }),
      ]);

      const worldRow = worldTotalRes[0];
      const turkeyRow = turkeyRes[0];
      const worldTotal = num(worldRow?.sum_uretim_deger);
      const worldArea = num(worldRow?.sum_miktar_deger);
      const worldYield = num(worldRow?.avg_verim_deger);
      const turkeyTotal = num(turkeyRow?.sum_uretim_deger);
      const turkeyArea = num(turkeyRow?.sum_miktar_deger);
      const turkeyYield = num(turkeyRow?.avg_verim_deger);
      const turkeyRank = siralamaRes.findIndex((r) => r.ulkead === TR) + 1;
      const processedTotal = num(processedTotalRes[0]?.sum_uretim_deger);
      const turkeyProcessedTotal = num(turkeyProcessedRes[0]?.sum_uretim_deger);
      const prevWorldTotal = num(prevWorldRes[0]?.sum_uretim_deger);
      const prevTurkeyTotal = num(prevTurkeyRes[0]?.sum_uretim_deger);

      const worldYoY = calculateYoY(worldTotal, prevWorldTotal);
      const turkeyYoY = calculateYoY(turkeyTotal, prevTurkeyTotal);
      const turkeyShare = worldTotal > 0 ? (turkeyTotal / worldTotal) * 100 : 0;
      const processingRatio = worldTotal > 0 ? (processedTotal / worldTotal) * 100 : 0;

      setOverviewKPIs({
        worldTotal, worldArea, worldYield, worldYoY,
        turkeyTotal, turkeyArea, turkeyYield, turkeyYoY, turkeyRank, turkeyShare,
        processedTotal, turkeyProcessedTotal, processingRatio,
        countryCount: num(worldRow?.cd_ulkead),
        productCount: num(worldRow?.cd_urunad),
        turkeyProductCount: num(turkeyRow?.cd_urunad),
        yil,
      });

      const trends = trendRes.map((r) => ({
        year: String(r.year),
        worldProduction: num(r.sum_uretim_deger),
        worldArea: num(r.sum_miktar_deger),
        worldYield: num(r.avg_verim_deger),
      }));
      setOverviewTrends(trends);

      const catMap = new Map<string, { name: string; value: number; color: string }>();
      categoryRes.forEach((r) => {
        const cat = getCropCategory(String(r.urunad ?? ''));
        const val = num(r.sum_uretim_deger);
        if (catMap.has(cat.key)) { catMap.get(cat.key)!.value += val; }
        else { catMap.set(cat.key, { name: cat.name, value: val, color: cat.color }); }
      });
      setOverviewCategoryData(Array.from(catMap.values()).sort((a, b) => b.value - a.value));

      setOverviewTopCountries(siralamaRes.slice(0, 15).map((r) => ({
        name: translateCountry(String(r.ulkead ?? '')), value: num(r.sum_uretim_deger), isTurkey: r.ulkead === TR,
      })));

      setOverviewSupplyChain({
        primaryTotal: worldTotal, processedTotal, processingRatio,
        turkeyPrimary: turkeyTotal, turkeyProcessed: turkeyProcessedTotal,
        turkeyProcessingRatio: turkeyTotal > 0 ? (turkeyProcessedTotal / turkeyTotal) * 100 : 0,
      });

      const insights: Insight[] = [];
      if (turkeyRank <= 10) insights.push({ id: 'ov1', type: 'achievement', message: `Türkiye dünya bitkisel üretiminde ${turkeyRank}. sırada — ${formatValue(turkeyTotal)} ile dünya üretiminin %${turkeyShare.toFixed(1)}'ini karşılıyor`, severity: 'high', category: 'Genel' });
      if (worldYoY > 2) insights.push({ id: 'ov2', type: 'growth', message: `Dünya bitkisel üretimi yıllık %${worldYoY.toFixed(1)} büyüdü — ${yil} yılı rekor üretim`, severity: 'medium', category: 'Trend' });
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
      insights.push({ id: 'ov8', type: 'info', message: `FAO veritabanında ${num(worldRow?.cd_ulkead)} ülke, ${num(worldRow?.cd_urunad)} birincil ürün takip ediliyor — Türkiye ${num(turkeyRow?.cd_urunad)} üründe üretim yapıyor`, severity: 'low', category: 'Kapsam' });
      setOverviewInsights(insights);
    } catch (error) { console.error('Overview veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // PRIMARY DATA LOADER
  // ═══════════════════════════════════════════════════════════
  const loadPrimaryData = useCallback(async () => {
    setLoading(true);
    try {
      if (primaryProducts.length === 0) {
        const prodRes = await fetchAgg(R_BIR, { groupBy: ['urunad'], where: { ulkead: TR }, positive: ['uretim_deger'], orderBy: 'urunad', dir: 'asc' });
        let prods = prodRes.map((r) => String(r.urunad ?? ''));
        if (categoryFilter && CROP_CATEGORIES[categoryFilter]) {
          const kws = CROP_CATEGORIES[categoryFilter].keywords;
          prods = prods.filter((p: string) => kws.some(kw => p.toLowerCase().includes(kw.toLowerCase())));
        }
        setPrimaryProducts(prods);
        if (prods.length > 0 && !prods.includes(primaryProduct)) setPrimaryProduct(prods[0]);
      }
      const product = primaryProduct;
      const yil = await latestYear(R_BIR, 'year', { where: { urunad: product } });

      const [topRes, trendRes, turkeyTrendRes, worldTotalRes] = await Promise.all([
        fetchAgg(R_BIR, { groupBy: ['ulkead'], sum: ['uretim_deger', 'miktar_deger'], avg: ['verim_deger'], where: { urunad: product, year: yil }, positive: ['uretim_deger'], exclude: EX, orderBy: 'sum_uretim_deger', dir: 'desc', limit: 20 }),
        fetchAgg(R_BIR, { groupBy: ['year'], sum: ['uretim_deger'], countDistinct: ['ulkead'], where: { urunad: product }, positive: ['uretim_deger'], exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { groupBy: ['year'], sum: ['uretim_deger', 'miktar_deger'], avg: ['verim_deger'], where: { urunad: product, ulkead: TR }, positive: ['uretim_deger'], orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { sum: ['uretim_deger'], where: { urunad: product, year: yil }, positive: ['uretim_deger'], exclude: EX }),
      ]);

      const worldTotal = num(worldTotalRes[0]?.sum_uretim_deger);
      const topCountries = topRes.map((r, i: number) => ({
        rank: i + 1, country: translateCountry(String(r.ulkead ?? '')), countryRaw: String(r.ulkead ?? ''), production: num(r.sum_uretim_deger),
        area: num(r.sum_miktar_deger), yieldVal: num(r.avg_verim_deger),
        isTurkey: r.ulkead === TR,
        share: worldTotal > 0 ? (num(r.sum_uretim_deger) / worldTotal) * 100 : 0,
      }));
      setPrimaryTopCountries(topCountries);

      const turkeyInTop = topCountries.find((c: any) => c.isTurkey);
      const worldTrend = trendRes.map((r) => ({ year: String(r.year), value: num(r.sum_uretim_deger) }));
      const turkeyTrend = turkeyTrendRes.map((r) => ({ year: String(r.year), value: num(r.sum_uretim_deger) }));
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
        turkeyVolatility: turkeyVol, producerCount: num(trendRes[trendRes.length - 1]?.cd_ulkead), yil,
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
        const prodRes = await fetchAgg(R_ISL, { groupBy: ['urunad'], positive: ['uretim_deger'], orderBy: 'urunad', dir: 'asc' });
        setProcessedProducts(prodRes.map((r) => String(r.urunad ?? '')));
      }
      const product = processedProduct;
      const yil = await latestYear(R_ISL, 'year', { where: { urunad: product } });

      const [topRes, trendRes, turkeyTrendRes, worldTotalRes] = await Promise.all([
        fetchAgg(R_ISL, { groupBy: ['ulkead'], sum: ['uretim_deger'], where: { urunad: product, year: yil }, positive: ['uretim_deger'], exclude: EX, orderBy: 'sum_uretim_deger', dir: 'desc', limit: 20 }),
        fetchAgg(R_ISL, { groupBy: ['year'], sum: ['uretim_deger'], where: { urunad: product }, positive: ['uretim_deger'], exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_ISL, { groupBy: ['year'], sum: ['uretim_deger'], where: { urunad: product, ulkead: TR }, positive: ['uretim_deger'], orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_ISL, { sum: ['uretim_deger'], where: { urunad: product, year: yil }, positive: ['uretim_deger'], exclude: EX }),
      ]);

      const worldTotal = num(worldTotalRes[0]?.sum_uretim_deger);
      const topCountries = topRes.map((r, i: number) => ({
        rank: i + 1, country: translateCountry(String(r.ulkead ?? '')), production: num(r.sum_uretim_deger),
        share: worldTotal > 0 ? (num(r.sum_uretim_deger) / worldTotal) * 100 : 0,
        isTurkey: r.ulkead === TR,
      }));
      setProcessedTopCountries(topCountries);

      const worldTrend = trendRes.map((r) => ({ year: String(r.year), value: num(r.sum_uretim_deger) }));
      const turkeyTrend = turkeyTrendRes.map((r) => ({ year: String(r.year), value: num(r.sum_uretim_deger) }));
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
      const yil = await latestYear(R_BIR, 'year', { where: { urunad: product } });

      const [yieldRankRes, yieldTrendRes, turkeyYieldTrendRes, scatterRes] = await Promise.all([
        fetchAgg(R_BIR, { groupBy: ['ulkead'], avg: ['verim_deger'], sum: ['uretim_deger', 'miktar_deger'], where: { urunad: product, year: yil }, positive: ['verim_deger'], whereGte: { miktar_deger: 1000 }, exclude: EX, orderBy: 'avg_verim_deger', dir: 'desc', limit: 30 }),
        fetchAgg(R_BIR, { groupBy: ['year'], avg: ['verim_deger'], where: { urunad: product }, positive: ['verim_deger'], exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { groupBy: ['year'], avg: ['verim_deger'], sum: ['uretim_deger', 'miktar_deger'], where: { urunad: product, ulkead: TR }, positive: ['verim_deger'], orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { groupBy: ['ulkead'], avg: ['verim_deger'], sum: ['miktar_deger', 'uretim_deger'], where: { urunad: product, year: yil }, positive: ['verim_deger'], whereGte: { miktar_deger: 500 }, exclude: EX, orderBy: 'sum_uretim_deger', dir: 'desc', limit: 50 }),
      ]);

      const yieldRanking = yieldRankRes.map((r, i: number) => ({
        rank: i + 1, country: translateCountry(String(r.ulkead ?? '')), countryRaw: String(r.ulkead ?? ''), yieldVal: num(r.avg_verim_deger),
        production: num(r.sum_uretim_deger), area: num(r.sum_miktar_deger), isTurkey: r.ulkead === TR,
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

      const scatter = scatterRes.map((r) => ({
        name: translateCountry(String(r.ulkead ?? '')), x: num(r.sum_miktar_deger), y: num(r.avg_verim_deger),
        z: num(r.sum_uretim_deger), isTurkey: r.ulkead === TR,
      }));
      setYieldScatter(scatter);

      const worldYieldTrend = yieldTrendRes.map((r) => ({ year: String(r.year), value: num(r.avg_verim_deger) }));
      const turkeyYieldTrend = turkeyYieldTrendRes.map((r) => ({ year: String(r.year), value: num(r.avg_verim_deger) }));
      const mergedYieldTrends = worldYieldTrend.map((w: any) => { const t = turkeyYieldTrend.find((t: any) => t.year === w.year); return { year: w.year, world: w.value, turkey: t?.value || 0 }; });
      setYieldTrends(mergedYieldTrends);

      const turkeyYieldCAGR = calculateCAGR(turkeyYieldTrend);
      let catchUpYears: number | null = null;
      if (turkeyYieldCAGR && turkeyYieldCAGR.cagr > 0 && turkeyYield < leaderYield) {
        const years = Math.ceil(Math.log(leaderYield / turkeyYield) / Math.log(1 + turkeyYieldCAGR.cagr / 100));
        catchUpYears = years < 500 ? years : null;
      }

      const developed = yieldRanking.filter((r: any) => DEVELOPED_COUNTRIES.includes(r.countryRaw));
      const developing = yieldRanking.filter((r: any) => !DEVELOPED_COUNTRIES.includes(r.countryRaw) && !r.isTurkey);
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
        gapToLeader, gapToWorld, catchUpYears,
        turkeyCAGR: turkeyYieldCAGR?.cagr || 0, yil,
      });

      const yIns: Insight[] = [];
      const productTR = translateProduct(product);
      if (turkeyYield > worldAvgYield) yIns.push({ id: 'y1', type: 'achievement', message: `Türkiye ${productTR} verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldAvgYield)}) %${((turkeyYield / worldAvgYield - 1) * 100).toFixed(0)} üzerinde`, severity: 'high', category: 'Verim' });
      else yIns.push({ id: 'y1', type: 'warning', message: `Türkiye ${productTR} verimi (${formatYield(turkeyYield)}) dünya ortalamasının (${formatYield(worldAvgYield)}) %${Math.abs(gapToWorld).toFixed(0)} altında`, severity: 'high', category: 'Verim' });
      if (gapToLeader > 50) yIns.push({ id: 'y2', type: 'warning', message: `${leader?.country} (${formatYield(leaderYield)}) lider — Türkiye'nin verim açığı %${gapToLeader.toFixed(0)}`, severity: 'high', category: 'Gap' });
      if (catchUpYears !== null && catchUpYears < 50) yIns.push({ id: 'y3', type: 'info', message: `Mevcut CAGR (%${turkeyYieldCAGR?.cagr.toFixed(1)}) ile lidere tahmini ${catchUpYears} yılda yetişilir`, severity: 'medium', category: 'Projeksiyon' });
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
      const yil = await latestYear(R_BIR, 'year', { where: { urunad: product } }) ?? 0;
      // HHI zaman çizelgesi eskiden '…2020','2023' diye sabitti; son nokta
      // artık verinin gerçek son yılı.
      const hhiYillari = Array.from(new Set([2005, 2010, 2015, 2020, yil])).filter((y) => y > 0);

      const [topRes, moverRes, hhiRes] = await Promise.all([
        fetchAgg(R_BIR, { groupBy: ['ulkead'], sum: ['uretim_deger', 'miktar_deger'], avg: ['verim_deger'], where: { urunad: product, year: yil }, positive: ['uretim_deger'], exclude: EX, orderBy: 'sum_uretim_deger', dir: 'desc', limit: 20 }),
        // Eski SUM(CASE WHEN…) pivotu + HAVING; iki yıl çekilip JS'te pivotlanıyor.
        fetchAgg(R_BIR, { groupBy: ['ulkead', 'year'], sum: ['uretim_deger'], where: { urunad: product }, whereIn: { year: [yil, yil - 5] }, positive: ['uretim_deger'], exclude: EX }),
        fetchAgg(R_BIR, { groupBy: ['year', 'ulkead'], sum: ['uretim_deger'], where: { urunad: product }, whereIn: { year: hhiYillari }, positive: ['uretim_deger'], exclude: EX }),
      ]);

      const worldTotalComp = topRes.reduce((acc: number, r) => acc + num(r.sum_uretim_deger), 0);
      const topCountries = topRes.map((r, i: number) => ({
        rank: i + 1, country: String(r.ulkead ?? ''), production: num(r.sum_uretim_deger),
        area: num(r.sum_miktar_deger), yieldVal: num(r.avg_verim_deger),
        share: worldTotalComp > 0 ? (num(r.sum_uretim_deger) / worldTotalComp) * 100 : 0,
        isTurkey: r.ulkead === TR,
      }));

      const moverMap = new Map<string, { now: number; prev: number }>();
      moverRes.forEach((r) => {
        const ulke = String(r.ulkead ?? '');
        const kayit = moverMap.get(ulke) ?? { now: 0, prev: 0 };
        if (Number(r.year) === yil) kayit.now += num(r.sum_uretim_deger);
        else kayit.prev += num(r.sum_uretim_deger);
        moverMap.set(ulke, kayit);
      });
      const movers = [...moverMap.entries()]
        .filter(([, v]) => v.now > 0)
        .sort((a, b) => b[1].now - a[1].now)
        .slice(0, 30)
        .map(([country, v]) => ({
          country: translateCountry(country), production: v.now,
          growth: v.prev > 0 ? ((v.now - v.prev) / v.prev) * 100 : 0,
          isTurkey: country === TR,
        }));
      const topGainers = [...movers].sort((a, b) => b.growth - a.growth).slice(0, 8);
      const topDecliners = [...movers].sort((a, b) => a.growth - b.growth).slice(0, 8);
      setCompTopMovers({ gainers: topGainers, decliners: topDecliners });

      setCompBubbleData(movers.slice(0, 25).map((m: any) => ({ name: m.country, x: m.growth, y: m.production, isTurkey: m.isTurkey })));

      const turkeyData = topCountries.find((c: any) => c.isTurkey);
      const rivals = topCountries.filter((c: any) => !c.isTurkey).slice(0, 5);
      setCompMatrix([...(turkeyData ? [turkeyData] : []), ...rivals]);

      // Eskiden GROUP_CONCAT ile tek metne sıkıştırılıp ayrıştırılıyordu.
      const yilBazli = new Map<string, number[]>();
      hhiRes.forEach((r) => {
        const y = String(r.year);
        if (!yilBazli.has(y)) yilBazli.set(y, []);
        yilBazli.get(y)!.push(num(r.sum_uretim_deger));
      });
      const hhiTimeline = [...yilBazli.entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, degerler]) => {
          const total = degerler.reduce((acc, v) => acc + v, 0);
          const shares = total > 0 ? degerler.map((v) => (v / total) * 100) : [];
          const hhi = calculateHHI(shares);
          return { year, hhi: hhi.hhi, concentration: hhi.concentration };
        });
      setCompHHITimeline(hhiTimeline);

      const turkeyInComp = topCountries.find((c: any) => c.isTurkey);
      setCompKPIs({
        turkeyRank: turkeyInComp?.rank || 0, turkeyShare: turkeyInComp?.share || 0,
        leader: topCountries[0]?.country || '-', leaderShare: topCountries[0]?.share || 0,
        totalProducers: topCountries.length,
        latestHHI: hhiTimeline.length > 0 ? hhiTimeline[hhiTimeline.length - 1].hhi : 0, yil,
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
      const trYil = { urunad: product, ulkead: TR };
      const [turkeyProdRes, turkeyYieldRes, turkeyAreaRes, worldProdRes] = await Promise.all([
        fetchAgg(R_BIR, { groupBy: ['year'], sum: ['uretim_deger'], where: trYil, positive: ['uretim_deger'], orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { groupBy: ['year'], avg: ['verim_deger'], where: trYil, positive: ['verim_deger'], orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { groupBy: ['year'], sum: ['miktar_deger'], where: trYil, positive: ['miktar_deger'], orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_BIR, { groupBy: ['year'], sum: ['uretim_deger'], where: { urunad: product }, positive: ['uretim_deger'], exclude: EX, orderBy: 'year', dir: 'asc' }),
      ]);

      const turkeyProd: YearValue[] = turkeyProdRes.map((r) => ({ year: String(r.year), value: num(r.sum_uretim_deger) }));
      const turkeyYieldArr: YearValue[] = turkeyYieldRes.map((r) => ({ year: String(r.year), value: num(r.avg_verim_deger) }));
      const turkeyAreaArr: YearValue[] = turkeyAreaRes.map((r) => ({ year: String(r.year), value: num(r.sum_miktar_deger) }));
      const worldProd: YearValue[] = worldProdRes.map((r) => ({ year: String(r.year), value: num(r.sum_uretim_deger) }));

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

  // ── Tab switching ──
  useEffect(() => {
    if (activeTab === 'overview') loadOverviewData();
    else if (activeTab === 'primary') loadPrimaryData();
    else if (activeTab === 'processed') loadProcessedData();
    else if (activeTab === 'yield') loadYieldData();
    else if (activeTab === 'competition') loadCompetitionData();
    else if (activeTab === 'predictions') loadPredictionsData();
  }, [activeTab, loadOverviewData, loadPrimaryData, loadProcessedData, loadYieldData, loadCompetitionData, loadPredictionsData]);

  return {
    activeTab, setActiveTab, loading,
    overviewKPIs, overviewTrends, overviewCategoryData, overviewTopCountries, overviewInsights, overviewSupplyChain,
    primaryProduct, setPrimaryProduct, primaryProducts, primaryTopCountries, primaryTrends, primaryKPIs, primaryHHI, primaryInsights, primaryAnomalies,
    processedProduct, setProcessedProduct, processedProducts, processedTopCountries, processedTrends, processedKPIs, processedInsights,
    yieldProduct, setYieldProduct, yieldKPIs, yieldGapData, yieldScatter, yieldTrends, yieldBestPractices, yieldInsights, yieldSegmented,
    compProduct, setCompProduct, compTopMovers, compBubbleData, compMatrix, compHHITimeline, compKPIs, compInsights,
    predProduct, setPredProduct, predProductionForecast, predYieldForecast, predAreaForecast, predWorldForecast, predKPIs, predInsights,
  };
}
