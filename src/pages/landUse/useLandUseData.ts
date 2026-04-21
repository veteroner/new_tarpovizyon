/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { fetchQuery } from '../../services/api';
import { translateCountry } from '../../utils/countryTranslations';
import type { Insight } from '../../components/InsightCard';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend, EXCLUDED_AREAS
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';

/* ── Types ─────────────────────────────────────────────────── */
export type Tab = 'overview' | 'transformation' | 'benchmark' | 'turkey' | 'forecast' | 'alerts';

/* ── Constants ─────────────────────────────────────────────── */
export const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

/* ── Format helpers ────────────────────────────────────────── */
export function formatArea(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyar ha';
  if (value >= 1e3) return (value / 1e3).toFixed(2) + ' Milyon ha';
  return value.toFixed(0) + ' Bin ha';
}

export function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'B';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'M';
  return value.toFixed(0) + 'K';
}

export function formatPercent(value: number): string {
  return '%' + value.toFixed(1);
}

/* ── Hook ──────────────────────────────────────────────────── */
export function useLandUseData(activeTab: Tab) {
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

  /* ── Overview loader ─────────────────────────────────────── */
  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const latestYear = '2023';
      const prevYear = '2021';
      const ITEMS = "('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Geçici nadas alanı','Sulama altyapısı bulunan arazi','Ekili alan','Çok yıllık ürünler')";

      const [worldLandRes, turkeyLandRes, prevWorldRes, topCountriesRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='${latestYear}' AND area NOT IN ${EXCLUDED_AREAS} AND item_tr IN ${ITEMS} GROUP BY item_tr ORDER BY total DESC`),
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='${latestYear}' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND item_tr IN ${ITEMS}`),
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='${prevYear}' AND area NOT IN ${EXCLUDED_AREAS} AND item_tr='Tarım arazisi' GROUP BY item_tr`),
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='${latestYear}' AND item_tr='Tarım arazisi' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY total DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE item_tr='Tarım arazisi' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`),
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
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey') || name.includes('Turkiye');
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

  /* ── Transformation loader ───────────────────────────────── */
  const loadTransformationData = useCallback(async () => {
    setLoading(true);
    try {
      const ITEMS = "('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı')";
      const [turkeyTimeRes] = await Promise.all([
        fetchQuery(`SELECT year, item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND item_tr IN ${ITEMS} AND CAST(year AS SIGNED) >= 2000 ORDER BY year`),
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

  /* ── Benchmark loader ────────────────────────────────────── */
  const loadBenchmarkData = useCallback(async () => {
    setLoading(true);
    try {
      const [agCountryRes] = await Promise.all([
        fetchQuery(`SELECT area, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND item_tr='Tarım arazisi' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 100 ORDER BY val DESC LIMIT 50`),
      ]);

      const agData = (agCountryRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey');
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

  /* ── Turkey Profile loader ───────────────────────────────── */
  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const TREND_ITEMS = "('Tarım arazisi','İşlenebilir arazi','Orman alanı','Sulama altyapısı bulunan arazi')";
      const RADAR_ITEMS = "('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı')";
      const TR_COND = "(area='Turkiye' OR area='Turkey' OR area='Türkiye')";

      const [turkeyAllRes, turkeyTrendRes, worldAvgRes, topIrrigRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND ${TR_COND}`),
        fetchQuery(`SELECT year, item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE ${TR_COND} AND item_tr IN ${TREND_ITEMS} AND CAST(year AS SIGNED) >= 2000 ORDER BY year`),
        fetchQuery(`SELECT item_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_land_use WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND item_tr IN ${RADAR_ITEMS} AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY item_tr`),
        fetchQuery(`SELECT area, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND item_tr='Sulama altyapısı bulunan arazi' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 0 ORDER BY val DESC LIMIT 20`),
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
        isTurkey: String(r.area).includes('Türkiye') || String(r.area).includes('Turkey')
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

  /* ── Forecast loader ─────────────────────────────────────── */
  const loadForecastData = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyForecastRes, worldForecastRes] = await Promise.all([
        fetchQuery(`SELECT year, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND item_tr='Tarım arazisi' AND CAST(year AS SIGNED) >= 1990 ORDER BY year`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as val FROM fao_land_use WHERE area NOT IN ${EXCLUDED_AREAS} AND item_tr='Tarım arazisi' AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
      ]);

      const turkeyForecastInput: YearValue[] = (turkeyForecastRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.val) || 0 }));
      const worldForecastInput: YearValue[] = (worldForecastRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.val) || 0 }));

      const turkeyForecast = forecastLinear(turkeyForecastInput, 5);
      const worldForecast = forecastLinear(worldForecastInput, 5);
      const turkeyTrend = analyzeTrend(turkeyForecastInput);
      const worldTrend = analyzeTrend(worldForecastInput);
      const turkeyAnomalies = detectAnomalies(turkeyForecastInput, 2.0);

      const allYears = new Set<string>();
      turkeyForecastInput.forEach(d => allYears.add(d.year));
      turkeyForecast.forecast.forEach(d => allYears.add(d.year));

      const chartData = Array.from(allYears).sort().map(year => {
        const histTR = turkeyForecastInput.find(d => d.year === year);
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

  /* ── Intelligence alerts loader ──────────────────────────── */
  const loadIntelligenceAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const ALERT_ITEMS = "('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı','Ekili alan')";
      const TR_COND = "(area='Turkiye' OR area='Turkey' OR area='Türkiye')";

      const [turkeyLatestRes, turkeyOlderRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND ${TR_COND} AND item_tr IN ${ALERT_ITEMS}`),
        fetchQuery(`SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2010' AND ${TR_COND} AND item_tr IN ${ALERT_ITEMS}`),
        fetchQuery(`SELECT item_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_land_use WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 0 AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Sürekli çayırlar ve meralar','Orman alanı','Sulama altyapısı bulunan arazi','Geçici nadas alanı') GROUP BY item_tr`),
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

  /* ── Master effect ───────────────────────────────────────── */
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

  return {
    loading,
    overviewKPIs, overviewLandTypes, overviewTopCountries, overviewTrend, overviewInsights,
    transformData, transformComparison, transformInsights,
    benchmarkData, benchmarkHHI, benchmarkInsights,
    turkeyProfile, turkeyTrends, turkeyRadar, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
