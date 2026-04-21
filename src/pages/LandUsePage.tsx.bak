/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line,
  Scatter, LineChart
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Target, Award, AlertTriangle, Layers, BarChart2, Activity, Zap } from 'lucide-react';
import { fetchQuery } from '../services/api';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { Insight } from '../components/InsightCard';
import { translateCountry } from '../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend, EXCLUDED_AREAS
} from '../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../utils/intelligenceCalculations';

type Tab = 'overview' | 'transformation' | 'benchmark' | 'turkey' | 'forecast' | 'alerts';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍', desc: 'Dunya arazi kullanimi ozeti' },
  { id: 'transformation', label: 'Arazi Donusumu', icon: '🔄', desc: 'Arazi tipi degisim analizi' },
  { id: 'benchmark', label: 'Ulke Siralamasi', icon: '🏆', desc: 'Arazi verimliligi karsilastirma' },
  { id: 'turkey', label: 'Turkiye Profili', icon: '🇹🇷', desc: 'Turkiye arazi intelligence' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮', desc: 'Zaman serisi projeksiyonlari' },
  { id: 'alerts', label: 'İçgörüler', icon: '🧠', desc: 'Otomatik uyarılar ve içgörüler' },
];

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

function formatArea(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyar ha';
  if (value >= 1e3) return (value / 1e3).toFixed(2) + ' Milyon ha';
  return value.toFixed(0) + ' Bin ha';
}

function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'B';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'M';
  return value.toFixed(0) + 'K';
}

function formatPercent(value: number): string {
  return '%' + value.toFixed(1);
}

export default function LandUsePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Overview state
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewLandTypes, setOverviewLandTypes] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Transformation state
  const [transformData, setTransformData] = useState<any[]>([]);
  const [transformComparison, setTransformComparison] = useState<any[]>([]);
  const [transformInsights, setTransformInsights] = useState<Insight[]>([]);

  // Benchmark state
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);
  const [benchmarkHHI, setBenchmarkHHI] = useState<any>(null);
  const [benchmarkInsights, setBenchmarkInsights] = useState<Insight[]>([]);

  // Turkey state
  const [turkeyProfile, setTurkeyProfile] = useState<any>(null);
  const [turkeyTrends, setTurkeyTrends] = useState<any[]>([]);
  const [turkeyRadar, setTurkeyRadar] = useState<any[]>([]);
  const [turkeyInsights, setTurkeyInsights] = useState<Insight[]>([]);

  // Forecast state
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<Insight[]>([]);

  // Intelligence alerts state
  const [intelligenceAlerts, setIntelligenceAlerts] = useState<IntelligenceAlert[]>([]);
  const [allInsights, setAllInsights] = useState<Insight[]>([]);

  // ==================== OVERVIEW LOADER ====================
  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const latestYear = '2023';
      const prevYear = '2021';

      const [worldLandRes, turkeyLandRes, prevWorldRes, topCountriesRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='${latestYear}' AND area NOT IN ${EXCLUDED_AREAS} AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Geçici nadas alanı','Sulama altyapısı bulunan arazi','Ekili alan','Çok yıllık ürünler') GROUP BY item_tr ORDER BY total DESC`),
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='${latestYear}' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Geçici nadas alanı','Sulama altyapısı bulunan arazi','Ekili alan','Çok yıllık ürünler')`),
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='${prevYear}' AND area NOT IN ${EXCLUDED_AREAS} AND item_tr='Tarım arazisi' GROUP BY item_tr`),
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='${latestYear}' AND item_tr='Tarım arazisi' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY total DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE item_tr='Tarım arazisi' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`)
      ]);

      const landTypes = (worldLandRes.data || []).map((r: any, i: number) => ({
        name: String(r.item_tr), value: Number(r.total) || 0,
        fill: CHART_COLORS[i % CHART_COLORS.length]
      }));
      setOverviewLandTypes(landTypes);

      const turkeyMap: Record<string, number> = {};
      (turkeyLandRes.data || []).forEach((r: any) => { turkeyMap[String(r.item_tr)] = Number(r.val) || 0; });

      const worldAg = landTypes.find((l: any) => l.name === 'Tarım arazisi')?.value || 0;
      const prevWorldAg = Number(prevWorldRes.data?.[0]?.total) || 0;
      const turkeyAg = turkeyMap['Tarım arazisi'] || 0;
      const turkeyArable = turkeyMap['İşlenebilir arazi'] || 0;
      const turkeyIrrigation = turkeyMap['Sulama altyapısı bulunan arazi'] || 0;
      const turkeyFallow = turkeyMap['Geçici nadas alanı'] || 0;

      const worldYoY = calculateYoY(worldAg, prevWorldAg);
      const turkeyShare = worldAg > 0 ? (turkeyAg / worldAg) * 100 : 0;
      const irrigationRate = turkeyAg > 0 ? (turkeyIrrigation / turkeyAg) * 100 : 0;
      const fallowRate = turkeyArable > 0 ? (turkeyFallow / turkeyArable) * 100 : 0;

      const topCountries = (topCountriesRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name), rawName: name, value: Number(r.total) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);
      const turkeyRank = topCountries.findIndex((c: any) => c.isTurkey) + 1;

      const trendData = (trendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.total) || 0 }));
      setOverviewTrend(trendData);

      const worldTrendYV: YearValue[] = trendData.map((t: any) => ({ year: t.year, value: t.value }));
      const worldCAGR = calculateCAGR(worldTrendYV);

      setOverviewKPIs({
        worldAg, turkeyAg, turkeyArable, turkeyIrrigation, turkeyFallow,
        worldYoY, turkeyShare, irrigationRate, fallowRate,
        turkeyRank: turkeyRank || 'N/A', countryCount: topCountries.length,
        worldCAGR: worldCAGR?.cagr || 0
      });

      const insights: Insight[] = [];
      insights.push({ id: 'ov1', type: 'info', message: `Dunya toplam tarim arazisi ${formatArea(worldAg)} - ${topCountries.length} buyuk uretici ulke`, severity: 'low', category: 'Kapsam' });
      if (worldYoY < -0.5) insights.push({ id: 'ov2', type: 'decline', message: `Dunya tarim arazisi onceki yila gore %${Math.abs(worldYoY).toFixed(2)} azaldi`, severity: 'high', category: 'Trend' });
      else if (worldYoY > 0.5) insights.push({ id: 'ov2', type: 'growth', message: `Dunya tarim arazisi onceki yila gore %${worldYoY.toFixed(2)} artti`, severity: 'medium', category: 'Trend' });
      if (turkeyRank > 0 && turkeyRank <= 15) insights.push({ id: 'ov3', type: 'achievement', message: `Turkiye tarim arazisinde dunya ${turkeyRank}. sirada - toplam ${formatArea(turkeyAg)} (dunya payi %${turkeyShare.toFixed(2)})`, severity: 'high', category: 'Turkiye' });
      if (irrigationRate < 30) insights.push({ id: 'ov4', type: 'warning', message: `Turkiye sulama orani sadece %${irrigationRate.toFixed(1)} - sulama altyapisi yatirim potansiyeli yuksek`, severity: 'high', category: 'Sulama' });
      else insights.push({ id: 'ov4', type: 'achievement', message: `Turkiye sulama orani %${irrigationRate.toFixed(1)} - guclu altyapi`, severity: 'medium', category: 'Sulama' });
      if (fallowRate > 15) insights.push({ id: 'ov5', type: 'warning', message: `Nadas orani %${fallowRate.toFixed(1)} - islenebilir arazinin onemli kismi atil durumda`, severity: 'medium', category: 'Verimlilik' });
      if (worldCAGR && worldCAGR.cagr < 0) insights.push({ id: 'ov6', type: 'decline', message: `Dunya tarim arazisi uzun vadede yillik %${Math.abs(worldCAGR.cagr).toFixed(2)} CAGR ile azaliyor`, severity: 'high', category: 'Uzun Vade' });
      setOverviewInsights(insights);
    } catch (error) { console.error('Overview veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  // ==================== TRANSFORMATION LOADER ====================
  const loadTransformationData = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyTimeRes] = await Promise.all([
        fetchQuery(`SELECT year, item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı') AND CAST(year AS SIGNED) >= 2000 ORDER BY year`)
      ]);

      const turkeyByType: Record<string, YearValue[]> = {};
      (turkeyTimeRes.data || []).forEach((r: any) => {
        const type = String(r.item_tr);
        if (!turkeyByType[type]) turkeyByType[type] = [];
        turkeyByType[type].push({ year: String(r.year), value: Number(r.val) || 0 });
      });

      const transformComp: any[] = [];
      for (const [type, values] of Object.entries(turkeyByType)) {
        if (values.length >= 2) {
          const first = values[0]; const last = values[values.length - 1];
          const change = last.value - first.value;
          const changePct = first.value > 0 ? (change / first.value) * 100 : 0;
          const cagr = calculateCAGR(values);
          transformComp.push({ name: type, startValue: first.value, endValue: last.value, change, changePct, cagr: cagr?.cagr || 0, startYear: first.year, endYear: last.year });
        }
      }
      setTransformComparison(transformComp);

      const yearSet = new Set<string>();
      Object.values(turkeyByType).forEach(arr => arr.forEach(v => yearSet.add(v.year)));
      const years = Array.from(yearSet).sort();
      const multiLine = years.map(year => {
        const row: any = { year };
        for (const [type, values] of Object.entries(turkeyByType)) {
          const match = values.find(v => v.year === year);
          row[type] = match?.value || 0;
        }
        return row;
      });
      setTransformData(multiLine);

      const ins: Insight[] = [];
      const agChange = transformComp.find(t => t.name === 'Tarım arazisi');
      if (agChange && agChange.change < 0) ins.push({ id: 'tr1', type: 'decline', message: `Turkiye tarim arazisi ${agChange.startYear}-${agChange.endYear} doneminde ${formatArea(Math.abs(agChange.change))} azaldi (%${Math.abs(agChange.changePct).toFixed(1)} kayip)`, severity: 'high', category: 'Arazi Kaybi' });
      const forestChange = transformComp.find(t => t.name === 'Orman alanı');
      if (forestChange && forestChange.change > 0) ins.push({ id: 'tr2', type: 'growth', message: `Ormanlik alan ${forestChange.startYear}-${forestChange.endYear} doneminde ${formatArea(forestChange.change)} artti - agaclandirma basarisi`, severity: 'medium', category: 'Orman' });
      const irrigChange = transformComp.find(t => t.name.includes('Sulama'));
      if (irrigChange && irrigChange.change > 0) ins.push({ id: 'tr3', type: 'growth', message: `Sulama altyapisi %${irrigChange.changePct.toFixed(1)} buyudu - yillik CAGR %${irrigChange.cagr.toFixed(2)}`, severity: 'medium', category: 'Sulama' });
      const pastureChange = transformComp.find(t => t.name === 'Sürekli çayırlar ve meralar');
      if (pastureChange && pastureChange.change < 0) ins.push({ id: 'tr4', type: 'warning', message: `Cayir-mera alani %${Math.abs(pastureChange.changePct).toFixed(1)} azaldi - hayvancilik kapasite riski`, severity: 'medium', category: 'Mera' });
      setTransformInsights(ins);
    } catch (error) { console.error('Transform veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  // ==================== BENCHMARK LOADER ====================
  const loadBenchmarkData = useCallback(async () => {
    setLoading(true);
    try {
      const [agCountryRes] = await Promise.all([
        fetchQuery(`SELECT area, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND item_tr='Tarım arazisi' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 100 ORDER BY val DESC LIMIT 50`)
      ]);

      const agData = (agCountryRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey');
        return { rank: i + 1, country: translateCountry(name), rawName: name, agLand: Number(r.val) || 0, isTurkey };
      });
      setBenchmarkData(agData);

      const shares = agData.map((c: any) => c.agLand);
      const hhi = calculateHHI(shares);
      setBenchmarkHHI(hhi);

      const ins: Insight[] = [];
      const turkeyInBench = agData.find((c: any) => c.isTurkey);
      if (turkeyInBench) ins.push({ id: 'bm1', type: turkeyInBench.rank <= 15 ? 'achievement' : 'info', message: `Turkiye tarim arazisi buyuklugunde dunya ${turkeyInBench.rank}. - ${formatArea(turkeyInBench.agLand)}`, severity: turkeyInBench.rank <= 10 ? 'high' : 'medium', category: 'Siralama' });
      if (hhi) {
        const concLabel = hhi.concentration === 'LOW' ? 'dusuk konsantrasyon' : hhi.concentration === 'MODERATE' ? 'orta konsantrasyon' : 'yuksek konsantrasyon';
        ins.push({ id: 'bm2', type: hhi.concentration === 'LOW' ? 'info' : 'warning', message: `Tarim arazisi dagilimi: HHI ${hhi.hhi.toFixed(0)} (${concLabel}) - Top 3 ulke payi %${hhi.top3Share.toFixed(1)}`, severity: 'medium', category: 'Konsantrasyon' });
      }
      setBenchmarkInsights(ins);
    } catch (error) { console.error('Benchmark veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  // ==================== TURKEY PROFILE LOADER ====================
  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyAllRes, turkeyTrendRes, worldAvgRes, topIrrigRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye')`),
        fetchQuery(`SELECT year, item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Orman alanı','Sulama altyapısı bulunan arazi') AND CAST(year AS SIGNED) >= 2000 ORDER BY year`),
        fetchQuery(`SELECT item_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_land_use WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı') AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY item_tr`),
        fetchQuery(`SELECT area, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND item_tr='Sulama altyapısı bulunan arazi' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 0 ORDER BY val DESC LIMIT 20`)
      ]);

      const turkeyData: Record<string, number> = {};
      (turkeyAllRes.data || []).forEach((r: any) => { turkeyData[String(r.item_tr)] = Number(r.val) || 0; });
      const worldAvgs: Record<string, number> = {};
      (worldAvgRes.data || []).forEach((r: any) => { worldAvgs[String(r.item_tr)] = Number(r.avg_val) || 0; });

      const turkeyByType: Record<string, YearValue[]> = {};
      (turkeyTrendRes.data || []).forEach((r: any) => {
        const type = String(r.item_tr);
        if (!turkeyByType[type]) turkeyByType[type] = [];
        turkeyByType[type].push({ year: String(r.year), value: Number(r.val) || 0 });
      });

      const irrigData = (topIrrigRes.data || []).map((r: any) => ({
        country: translateCountry(String(r.area || '')), value: Number(r.val) || 0,
        isTurkey: String(r.area).includes('T\u00FCrkiye') || String(r.area).includes('Turkey')
      }));

      const radarItems = ['Tarım arazisi', 'İşlenebilir arazi', 'Sürekli çayırlar ve meralar', 'Orman alanı', 'Sulama altyapısı bulunan arazi'];
      const radarData = radarItems.map(item => {
        const trVal = turkeyData[item] || 0;
        const wAvg = worldAvgs[item] || 1;
        return { subject: item.replace('Sulama altyapısı bulunan arazi', 'Sulama').substring(0, 15), turkey: trVal, worldAvg: wAvg };
      });
      setTurkeyRadar(radarData);

      const irrigRank = irrigData.findIndex(d => d.isTurkey) + 1;
      setTurkeyProfile({
        ...turkeyData, worldAvgs, irrigationRank: irrigRank || 'N/A',
        irrigationRate: turkeyData['Tarım arazisi'] > 0 ? (turkeyData['Sulama altyapısı bulunan arazi'] || 0) / turkeyData['Tarım arazisi'] * 100 : 0,
        fallowRate: turkeyData['İşlenebilir arazi'] > 0 ? (turkeyData['Geçici nadas alanı'] || 0) / turkeyData['İşlenebilir arazi'] * 100 : 0,
        arablePct: turkeyData['Tarım arazisi'] > 0 ? (turkeyData['İşlenebilir arazi'] || 0) / turkeyData['Tarım arazisi'] * 100 : 0,
        pasturePct: turkeyData['Tarım arazisi'] > 0 ? (turkeyData['Sürekli çayırlar ve meralar'] || 0) / turkeyData['Tarım arazisi'] * 100 : 0,
      });

      const yearSet = new Set<string>();
      Object.values(turkeyByType).forEach(arr => arr.forEach(v => yearSet.add(v.year)));
      const trendLines = Array.from(yearSet).sort().map(year => {
        const row: any = { year };
        for (const [type, values] of Object.entries(turkeyByType)) {
          const match = values.find(v => v.year === year);
          const shortName = type.replace('Sulama altyapısı bulunan arazi', 'Sulama').replace('İşlenebilir arazi', 'Islenebilir');
          row[shortName] = match?.value || null;
        }
        return row;
      });
      setTurkeyTrends(trendLines);

      const ins: Insight[] = [];
      const agCagr = calculateCAGR(turkeyByType['Tarım arazisi'] || []);
      if (agCagr) ins.push({ id: 'tp1', type: agCagr.cagr > 0 ? 'growth' : 'decline', message: `Turkiye tarim arazisi 2000den bu yana yillik %${Math.abs(agCagr.cagr).toFixed(2)} CAGR ile ${agCagr.cagr > 0 ? 'buyudu' : 'kuculdu'}`, severity: 'high', category: 'Trend' });
      const irrigCagr = calculateCAGR(turkeyByType['Sulama altyapısı bulunan arazi'] || []);
      if (irrigCagr && irrigCagr.cagr > 0) ins.push({ id: 'tp2', type: 'growth', message: `Sulama altyapisi yillik %${irrigCagr.cagr.toFixed(2)} CAGR ile buyuyor${irrigRank > 0 ? ' - dunya ' + irrigRank + '. sirada' : ''}`, severity: 'medium', category: 'Sulama' });
      if (turkeyData['Tarım arazisi'] && worldAvgs['Tarım arazisi']) {
        const ratio = turkeyData['Tarım arazisi'] / worldAvgs['Tarım arazisi'];
        ins.push({ id: 'tp3', type: ratio > 1 ? 'achievement' : 'info', message: `Turkiye tarim arazisi dunya ulke ortalamasinin ${ratio.toFixed(1)}x ${ratio > 1 ? 'uzerinde' : 'altinda'} (${formatArea(turkeyData['Tarım arazisi'])} vs ${formatArea(worldAvgs['Tarım arazisi'])})`, severity: 'medium', category: 'Benchmark' });
      }
      setTurkeyInsights(ins);
    } catch (error) { console.error('Turkey veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  // ==================== FORECAST LOADER ====================
  const loadForecastData = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyForecastRes, worldForecastRes] = await Promise.all([
        fetchQuery(`SELECT year, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND item_tr='Tarım arazisi' AND CAST(year AS SIGNED) >= 1990 ORDER BY year`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as val FROM fao_land_use WHERE area NOT IN ${EXCLUDED_AREAS} AND item_tr='Tarım arazisi' AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`)
      ]);

      const turkeyData: YearValue[] = (turkeyForecastRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.val) || 0 }));
      const worldData: YearValue[] = (worldForecastRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.val) || 0 }));

      const turkeyForecast = forecastLinear(turkeyData, 5);
      const worldForecast = forecastLinear(worldData, 5);
      const turkeyTrend = analyzeTrend(turkeyData);
      const worldTrend = analyzeTrend(worldData);
      const turkeyAnomalies = detectAnomalies(turkeyData, 2.0);

      const allYears = new Set<string>();
      turkeyData.forEach(d => allYears.add(d.year));
      turkeyForecast.forecast.forEach(d => allYears.add(d.year));

      const chartData = Array.from(allYears).sort().map(year => {
        const histTR = turkeyData.find(d => d.year === year);
        const fcTR = turkeyForecast.forecast.find(d => d.year === year);
        return { year, turkeyHistorical: histTR?.value || null, turkeyForecast: fcTR?.value || null, anomaly: turkeyAnomalies.find(a => a.year === year && a.isAnomaly)?.value || null };
      });

      setForecastData({
        chartData, turkeyTrend, worldTrend,
        turkeyR2: turkeyForecast.r2, worldR2: worldForecast.r2,
        turkeySlope: turkeyForecast.slope, worldSlope: worldForecast.slope,
        anomalyCount: turkeyAnomalies.filter(a => a.isAnomaly).length
      });

      const ins: Insight[] = [];
      if (turkeyTrend) {
        ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Turkiye tarim arazisi trendi: CAGR %${turkeyTrend.cagr.toFixed(2)}, R2 ${turkeyForecast.r2.toFixed(3)}, ${turkeyTrend.acceleration > 0 ? 'hizlaniyor' : 'yavasliyor'}`, severity: 'high', category: 'Tahmin' });
        if (turkeyTrend.forecast3y > 0) ins.push({ id: 'fc2', type: 'info', message: `3 yillik projeksiyon: ${formatArea(turkeyTrend.forecast3y)} (lineer model)`, severity: 'medium', category: 'Projeksiyon' });
      }
      if (worldTrend) ins.push({ id: 'fc3', type: worldTrend.direction === 'down' ? 'warning' : 'info', message: `Dunya tarim arazisi trendi: CAGR %${worldTrend.cagr.toFixed(2)}, volatilite %${worldTrend.volatility.toFixed(1)}`, severity: 'medium', category: 'Dunya' });
      setForecastInsights(ins);
    } catch (error) { console.error('Forecast veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  // ==================== INTELLIGENCE ALERTS LOADER ====================
  const loadIntelligenceAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyLatestRes, turkeyOlderRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı','Ekili alan')`),
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2010' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı','Ekili alan')`),
        fetchQuery(`SELECT item_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_land_use WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 0 AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı') GROUP BY item_tr`)
      ]);

      const turkeyNow: Record<string, number> = {};
      (turkeyLatestRes.data || []).forEach((r: any) => turkeyNow[String(r.item_tr)] = Number(r.val) || 0);
      const turkeyBefore: Record<string, number> = {};
      (turkeyOlderRes.data || []).forEach((r: any) => turkeyBefore[String(r.item_tr)] = Number(r.val) || 0);
      const worldAvg: Record<string, number> = {};
      (worldAvgRes.data || []).forEach((r: any) => worldAvg[String(r.item_tr)] = Number(r.avg_val) || 0);

      const alerts: IntelligenceAlert[] = [];
      const agNow = turkeyNow['Tarım arazisi'] || 0;
      const agBefore = turkeyBefore['Tarım arazisi'] || 0;
      if (agBefore > 0 && agNow < agBefore) {
        const loss = agBefore - agNow;
        const lossPct = (loss / agBefore) * 100;
        alerts.push({ id: 'int-ag-loss', severity: lossPct > 5 ? 'critical' : 'warning', title: 'Tarim Arazisi Kaybi', message: `2010-2022 doneminde ${formatArea(loss)} tarim arazisi kaybedildi (%${lossPct.toFixed(1)})`, metric: 'Arazi kaybi', value: loss });
      }
      const irrigNow = turkeyNow['Sulama altyapısı bulunan arazi'] || 0;
      const irrigBefore = turkeyBefore['Sulama altyapısı bulunan arazi'] || 0;
      if (irrigBefore > 0 && irrigNow > irrigBefore) {
        const growth = irrigNow - irrigBefore;
        const growthPct = (growth / irrigBefore) * 100;
        alerts.push({ id: 'int-irrig-growth', severity: 'positive', title: 'Sulama Altyapisi Buyumesi', message: `2010-2022 doneminde ${formatArea(growth)} yeni sulama alani (%${growthPct.toFixed(1)} artis)`, metric: 'Sulama artisi', value: growth });
      }
      const fallowNow = turkeyNow['Geçici nadas alanı'] || 0;
      const arableNow = turkeyNow['İşlenebilir arazi'] || 0;
      if (arableNow > 0) {
        const fallowRate = (fallowNow / arableNow) * 100;
        if (fallowRate > 15) alerts.push({ id: 'int-fallow-high', severity: 'warning', title: 'Yuksek Nadas Orani', message: `Islenebilir arazinin %${fallowRate.toFixed(1)} nadas - modern tarim yontemleriyle azaltilabilir`, metric: 'Nadas orani', value: fallowRate });
      }
      const forestNow = turkeyNow['Orman alanı'] || 0;
      const forestBefore = turkeyBefore['Orman alanı'] || 0;
      if (forestBefore > 0) {
        const forestChange = forestNow - forestBefore;
        const forestPct = (forestChange / forestBefore) * 100;
        alerts.push({ id: 'int-forest', severity: forestChange > 0 ? 'positive' : 'critical', title: forestChange > 0 ? 'Ormanlik Alan Artisi' : 'Ormansizlasma', message: `2010-2022: ${forestChange > 0 ? '+' : ''}${formatArea(forestChange)} (${forestPct > 0 ? '+' : ''}%${forestPct.toFixed(1)})`, metric: 'Orman degisimi', value: forestChange });
      }
      if (agNow > 0 && worldAvg['Tarım arazisi'] > 0 && worldAvg['Sulama altyapısı bulunan arazi'] > 0) {
        const trIrrigRate = irrigNow / agNow * 100;
        const worldIrrigRate = worldAvg['Sulama altyapısı bulunan arazi'] / worldAvg['Tarım arazisi'] * 100;
        alerts.push({ id: 'int-irrig-bench', severity: trIrrigRate > worldIrrigRate ? 'positive' : 'info', title: 'Sulama Orani Karsilastirma', message: `Turkiye: %${trIrrigRate.toFixed(1)} vs Dunya ort.: %${worldIrrigRate.toFixed(1)}`, metric: 'Sulama orani', value: trIrrigRate });
      }

      setIntelligenceAlerts(alerts);
      const allIns: Insight[] = alerts.map(a => ({
        id: a.id,
        type: a.severity === 'critical' ? 'decline' as const : a.severity === 'warning' ? 'warning' as const : a.severity === 'positive' ? 'achievement' as const : 'info' as const,
        message: a.title + ': ' + a.message,
        severity: a.severity === 'critical' ? 'high' as const : a.severity === 'warning' ? 'medium' as const : 'low' as const,
        category: a.metric || 'İçgörü'
      }));
      setAllInsights(allIns);
    } catch (error) { console.error('Intelligence alerts hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    switch (activeTab) {
      case 'overview': loadOverviewData(); break;
      case 'transformation': loadTransformationData(); break;
      case 'benchmark': loadBenchmarkData(); break;
      case 'turkey': loadTurkeyProfile(); break;
      case 'forecast': loadForecastData(); break;
      case 'alerts': loadIntelligenceAlerts(); break;
    }
  }, [activeTab, loadOverviewData, loadTransformationData, loadBenchmarkData, loadTurkeyProfile, loadForecastData, loadIntelligenceAlerts]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Arazi İçgörü Paneli</h1>
        <p className="page-subtitle">FAO arazi kullanimi - akilli analiz motoru</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
            fontWeight: activeTab === tab.id ? '700' : '500',
            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>İçgörü analizi yükleniyor...</p></div>
      ) : (
        <>
          {/* ==================== OVERVIEW TAB ==================== */}
          {activeTab === 'overview' && overviewKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="DUNYA TARIM ARAZISI" value={formatArea(overviewKPIs.worldAg)} subtitle={`Yıllık: ${overviewKPIs.worldYoY > 0 ? '+' : ''}${overviewKPIs.worldYoY.toFixed(2)}% | BBO: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="green" large />
                <KPICard title="TURKIYE ARAZISI" value={formatArea(overviewKPIs.turkeyAg)} subtitle={`Dunya payi: %${overviewKPIs.turkeyShare.toFixed(2)} | Sira: #${overviewKPIs.turkeyRank}`} icon={MapPin} color="orange" />
                <KPICard title="SULAMA ORANI" value={formatPercent(overviewKPIs.irrigationRate)} subtitle={`${formatArea(overviewKPIs.turkeyIrrigation)} sulanan`} icon={Target} color="blue" />
                <KPICard title="NADAS ORANI" value={formatPercent(overviewKPIs.fallowRate)} subtitle={`${formatArea(overviewKPIs.turkeyFallow)} nadas`} icon={AlertTriangle} color={overviewKPIs.fallowRate > 15 ? 'red' : 'green'} />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Dunya Arazi Turu Dagilimi (1000 ha)</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={overviewLandTypes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Alan']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {overviewLandTypes.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 Ulke - Tarim Arazisi</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Tarim Arazisi']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dunya Tarim Arazisi Trendi (1000 ha)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Tarim Arazisi']} />
                      <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* ==================== TRANSFORMATION TAB ==================== */}
          {activeTab === 'transformation' && (
            <>
              {transformComparison.length > 0 && (
                <div className="kpi-grid">
                  {transformComparison.slice(0, 4).map((tc: any, i: number) => (
                    <KPICard key={tc.name} title={tc.name.substring(0, 20).toUpperCase()} value={`${tc.changePct > 0 ? '+' : ''}${tc.changePct.toFixed(1)}%`} subtitle={`${tc.startYear} -> ${tc.endYear} | CAGR: %${tc.cagr.toFixed(2)}`} icon={tc.changePct > 0 ? TrendingUp : TrendingDown} color={tc.changePct > 0 ? 'green' : 'red'} large={i === 0} />
                  ))}
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Arazi Tipi Degisimi (2000-2022)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={transformData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatArea(v), '']} />
                      <Legend />
                      {Object.keys(transformData[0] || {}).filter(k => k !== 'year').map((key, i) => (
                        <Line key={key} type="monotone" dataKey={key} name={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {transformComparison.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Donemsel Degisim Karsilastirmasi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={transformComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                        <YAxis tickFormatter={(v) => '%' + v} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => ['%' + (v as number).toFixed(1), '']} />
                        <Bar dataKey="changePct" name="Degisim %" radius={[4, 4, 0, 0]}>
                          {transformComparison.map((tc: any, i: number) => <Cell key={i} fill={tc.changePct > 0 ? '#22c55e' : '#ef4444'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={transformInsights} />
            </>
          )}

          {/* ==================== BENCHMARK TAB ==================== */}
          {activeTab === 'benchmark' && (
            <>
              {benchmarkHHI && (
                <div className="kpi-grid">
                  <KPICard title="HHI ENDEKSI" value={benchmarkHHI.hhi.toFixed(0)} subtitle={`Konsantrasyon: ${benchmarkHHI.concentration}`} icon={BarChart2} color="purple" large />
                  <KPICard title="TOP 1 PAY" value={formatPercent(benchmarkHHI.top1Share)} subtitle="En buyuk ulke" icon={Award} color="orange" />
                  <KPICard title="TOP 3 PAY" value={formatPercent(benchmarkHHI.top3Share)} subtitle="Ilk 3 ulke toplam" icon={Layers} color="blue" />
                  <KPICard title="ETKIN REKABET" value={benchmarkHHI.effectiveCompetitors.toFixed(1)} subtitle="Efektif rakip sayisi" icon={Activity} color="green" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Tarim Arazisi - Ulke Siralamasi</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={benchmarkData.slice(0, 30)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Tarim Arazisi']} />
                      <Bar dataKey="agLand" radius={[0, 4, 4, 0]}>
                        {benchmarkData.slice(0, 30).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={benchmarkInsights} />
              <div className="data-table">
                <h3 className="data-table-title">Detayli Ulke Siralamasi</h3>
                {benchmarkData.slice(0, 30).map((c: any) => (
                  <div className="table-row" key={c.country} style={c.isTurkey ? { background: 'rgba(255, 107, 53, 0.1)', borderLeft: '3px solid #ff6b35' } : {}}>
                    <div className={'table-rank' + (c.rank <= 3 ? ' green' : '')}>{c.rank}</div>
                    <div className="table-info">
                      <div className="table-name">{c.isTurkey ? 'TR ' + c.country : c.country}</div>
                      <div className="table-subtext">{c.rawName}</div>
                    </div>
                    <div className="table-value green">{formatArea(c.agLand)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ==================== TURKEY PROFILE TAB ==================== */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TARIM ARAZISI" value={formatArea(turkeyProfile['Tarım arazisi'] || 0)} subtitle={`Islenebilir: %${(turkeyProfile.arablePct || 0).toFixed(1)} | Mera: %${(turkeyProfile.pasturePct || 0).toFixed(1)}`} icon={Globe} color="green" large />
                <KPICard title="SULAMA ORANI" value={formatPercent(turkeyProfile.irrigationRate || 0)} subtitle={`Dunya sirasi: #${turkeyProfile.irrigationRank}`} icon={Target} color="blue" />
                <KPICard title="NADAS ORANI" value={formatPercent(turkeyProfile.fallowRate || 0)} subtitle={`${formatArea(turkeyProfile['Geçici nadas alanı'] || 0)} nadas`} icon={AlertTriangle} color={turkeyProfile.fallowRate > 15 ? 'red' : 'green'} />
                <KPICard title="ORMANLIK ALAN" value={formatArea(turkeyProfile['Orman alanı'] || 0)} subtitle="Agaclandirma trendi" icon={Layers} color="teal" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye Arazi Trendleri (2000+)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatArea(v) : 'N/A', '']} />
                      <Legend />
                      {Object.keys(turkeyTrends[0] || {}).filter(k => k !== 'year').map((key, i) => (
                        <Line key={key} type="monotone" dataKey={key} name={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye vs Dunya Ortalamasi</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={turkeyRadar} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                      <Tooltip formatter={(v: number) => [formatArea(v), '']} />
                      <Legend />
                      <Bar dataKey="turkey" name="Turkiye" fill="#ff6b35" />
                      <Bar dataKey="worldAvg" name="Dunya Ort." fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Arazi Yapisi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={[
                        { name: 'Islenebilir Arazi', value: turkeyProfile['İşlenebilir arazi'] || 0 },
                        { name: 'Sürekli çayırlar ve meralar', value: turkeyProfile['Sürekli çayırlar ve meralar'] || 0 },
                        { name: 'Cok Yillik', value: turkeyProfile['Çok yıllık ürünler'] || 0 },
                        { name: 'Nadas', value: turkeyProfile['Geçici nadas alanı'] || 0 },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => name + ' ' + ((percent || 0) * 100).toFixed(0) + '%'}>
                        {[0, 1, 2, 3].map(i => <Cell key={i} fill={CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Alan']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={turkeyInsights} />
            </>
          )}

          {/* ==================== FORECAST TAB ==================== */}
          {activeTab === 'forecast' && forecastData && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE CAGR" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.turkeyR2?.toFixed(3) || '0'} | Yillik ${forecastData.turkeySlope > 0 ? '+' : ''}${forecastData.turkeySlope?.toFixed(1) || '0'} bin ha`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'green' : 'red'} large />
                <KPICard title="DUNYA CAGR" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="VOLATILITE" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Turkiye tarim arazisi" icon={Activity} color="purple" />
                <KPICard title="ANOMALI" value={String(forecastData.anomalyCount || 0)} subtitle="Istatistiksel sapma" icon={AlertTriangle} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Tarim Arazisi - Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatArea(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="turkeyHistorical" name="Turkiye (Gercek)" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="turkeyForecast" name="Turkiye (Tahmin)" stroke="#ff6b35" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                      <Scatter dataKey="anomaly" name="Anomali" fill="#ef4444" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={forecastInsights} />
            </>
          )}

          {/* ==================== INTELLIGENCE ALERTS TAB ==================== */}
          {activeTab === 'alerts' && (
            <>
              <div className="kpi-grid">
                <KPICard title="TOPLAM ALERT" value={String(intelligenceAlerts.length)} subtitle="Otomatik tespit" icon={Zap} color="purple" large />
                <KPICard title="KRITIK" value={String(intelligenceAlerts.filter(a => a.severity === 'critical').length)} subtitle="Acil dikkat" icon={AlertTriangle} color="red" />
                <KPICard title="UYARI" value={String(intelligenceAlerts.filter(a => a.severity === 'warning').length)} subtitle="Izlenmeli" icon={Activity} color="orange" />
                <KPICard title="POZITIF" value={String(intelligenceAlerts.filter(a => a.severity === 'positive').length)} subtitle="Gelisim" icon={TrendingUp} color="green" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {intelligenceAlerts.map((alert: IntelligenceAlert) => {
                  const severityColors: Record<string, { bg: string; border: string; icon: string }> = {
                    critical: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '🔴' },
                    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '⚠️' },
                    positive: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', icon: '🟢' },
                    info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: '💡' }
                  };
                  const colors = severityColors[alert.severity] || severityColors.info;
                  return (
                    <div key={alert.id} style={{ padding: '16px 20px', borderRadius: '12px', background: colors.bg, border: '1px solid ' + colors.border, display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.5rem' }}>{colors.icon}</span>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{alert.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{alert.message}</div>
                        {alert.metric && <div style={{ marginTop: '6px', fontSize: '0.8rem', color: colors.border, fontWeight: '600' }}>{alert.metric}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <InsightCard insights={allInsights} />
            </>
          )}
        </>
      )}
    </div>
  );
}
