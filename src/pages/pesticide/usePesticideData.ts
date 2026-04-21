/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { fetchQuery } from '../../services/api';
import type { Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend, EXCLUDED_AREAS,
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';

// ---------- TYPES ----------
export type Tab = 'overview' | 'composition' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

// ---------- CONSTANTS ----------
export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍' },
  { id: 'composition', label: 'Kullanım Profili', icon: '🧪' },
  { id: 'concentration', label: 'Pazar Yoğunluğu', icon: '🏆' },
  { id: 'turkey', label: 'Türkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'Akıllı Analiz', icon: '🧠' },
];

export const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

// ---------- HELPERS ----------
export function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(1) + ' ton';
}
export function formatKgHa(value: number): string {
  return value.toFixed(2) + ' kg/ha';
}
export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(1);
}

// ---------- HOOK ----------
export function usePesticideData(activeTab: Tab) {
  const [loading, setLoading] = useState(true);

  // Overview
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewByType, setOverviewByType] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Composition
  const [compData, setCompData] = useState<any[]>([]);
  const [compTrends, setCompTrends] = useState<any[]>([]);
  const [compInsights, setCompInsights] = useState<Insight[]>([]);

  // Concentration
  const [concData, setConcData] = useState<any[]>([]);
  const [concHHI, setConcHHI] = useState<any>(null);
  const [concInsights, setConcInsights] = useState<Insight[]>([]);

  // Turkey
  const [turkeyProfile, setTurkeyProfile] = useState<any>(null);
  const [turkeyTrends, setTurkeyTrends] = useState<any[]>([]);
  const [turkeyInsights, setTurkeyInsights] = useState<Insight[]>([]);

  // Forecast
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<Insight[]>([]);

  // Intelligence
  const [intelligenceAlerts, setIntelligenceAlerts] = useState<IntelligenceAlert[]>([]);
  const [allInsights, setAllInsights] = useState<Insight[]>([]);

  // ==================== OVERVIEW ====================
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [byTypeRes, topCountriesRes, trendRes, prevYearRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler','Rodentisitler') GROUP BY item_tr ORDER BY total DESC`),
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY total DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2020' AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS}`),
      ]);

      const byType = (byTypeRes.data || []).map((r: any, i: number) => ({
        name: String(r.item_tr), value: Number(r.total) || 0, fill: CHART_COLORS[i % CHART_COLORS.length],
      }));
      setOverviewByType(byType);

      const topCountries = (topCountriesRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name), value: Number(r.total) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);

      const worldTotal = topCountries.reduce((s: number, c: any) => s + c.value, 0);
      const prevTotal = Number(prevYearRes.data?.[0]?.total) || 0;
      const yoy = calculateYoY(worldTotal, prevTotal);
      const turkeyData = topCountries.find((c: any) => c.isTurkey);
      const turkeyRank = topCountries.findIndex((c: any) => c.isTurkey) + 1;

      const trendData = (trendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.total) || 0 }));
      setOverviewTrend(trendData);
      const worldCAGR = calculateCAGR(trendData as YearValue[]);

      setOverviewKPIs({
        worldTotal, yoy, turkeyUsage: turkeyData?.value || 0, turkeyRank: turkeyRank || 'N/A',
        topUser: topCountries[0]?.name || '-', typeCount: byType.filter((b: any) => b.value > 0).length,
        worldCAGR: worldCAGR?.cagr || 0,
      });

      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dünya toplam pestisit kullanımı ${formatTon(worldTotal)} (${byType.length} tür)`, severity: 'low', category: 'Genel' });
      if (yoy > 5) ins.push({ id: 'ov2', type: 'growth', message: `Pestisit kullanımı önceki yıla göre %${yoy.toFixed(1)} arttı — risk artışı`, severity: 'high', category: 'Trend' });
      else if (yoy < -5) ins.push({ id: 'ov2', type: 'decline', message: `Pestisit kullanımı %${Math.abs(yoy).toFixed(1)} azaldı`, severity: 'medium', category: 'Trend' });
      if (turkeyData) ins.push({ id: 'ov3', type: turkeyRank <= 10 ? 'warning' : 'info', message: `Türkiye pestisit kullanımında dünya ${turkeyRank}. — ${formatTon(turkeyData.value)}${turkeyRank <= 10 ? ' (yüksek kullanım riski)' : ''}`, severity: turkeyRank <= 10 ? 'high' : 'medium', category: 'Türkiye' });
      const herbicide = byType.find((b: any) => b.name.includes('Herbisit'));
      const total = byType.reduce((s: number, b: any) => s + b.value, 0);
      if (herbicide && total > 0) ins.push({ id: 'ov4', type: 'info', message: `Herbisitler toplam pestisitin %${(herbicide.value / total * 100).toFixed(1)}'ini oluşturuyor`, severity: 'low', category: 'Kompozisyon' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Genel Bakış hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== COMPOSITION ====================
  const loadComposition = useCallback(async () => {
    setLoading(true);
    try {
      const [typeByCountryRes, typeTrendRes, intensityRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, area, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler','Rodentisitler') AND area NOT IN ${EXCLUDED_AREAS} GROUP BY item_tr, area ORDER BY total DESC`),
        fetchQuery(`SELECT year, item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE element_tr='Tarımsal Kullanım' AND item_tr IN ('Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler','Rodentisitler') AND area NOT IN ${EXCLUDED_AREAS} AND CAST(year AS SIGNED) >= 2000 GROUP BY year, item_tr ORDER BY year`),
        fetchQuery(`SELECT area, AVG(CAST(value AS DECIMAL(20,4))) as avg_intensity FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Ekili alan başına kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,4)) > 0 GROUP BY area ORDER BY avg_intensity DESC LIMIT 20`),
      ]);

      const typeMap: Record<string, { name: string; countries: { country: string; value: number }[] }> = {};
      (typeByCountryRes.data || []).forEach((r: any) => {
        const type = String(r.item_tr);
        if (!typeMap[type]) typeMap[type] = { name: type, countries: [] };
        if (typeMap[type].countries.length < 5) {
          typeMap[type].countries.push({ country: translateCountry(String(r.area || '')), value: Number(r.total) || 0 });
        }
      });
      setCompData(Object.values(typeMap));

      const yearMap: Record<string, Record<string, number>> = {};
      (typeTrendRes.data || []).forEach((r: any) => {
        const yr = String(r.year);
        if (!yearMap[yr]) yearMap[yr] = {};
        yearMap[yr][String(r.item_tr)] = Number(r.total) || 0;
      });
      const trendData = Object.entries(yearMap).sort(([a], [b]) => a.localeCompare(b)).map(([year, types]) => ({ year, ...types }));
      setCompTrends(trendData);

      const intensityData = (intensityRes.data || []).map((r: any) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey');
        return { name: translateCountry(name), value: Number(r.avg_intensity) || 0, isTurkey };
      });

      const ins: Insight[] = [];
      const types = Object.values(typeMap);
      if (types.length > 0) {
        const dominant = types.sort((a, b) => b.countries.reduce((s, c) => s + c.value, 0) - a.countries.reduce((s, c) => s + c.value, 0))[0];
        ins.push({ id: 'cp1', type: 'info', message: `En çok kullanılan alt tür: ${dominant.name} — Lider: ${dominant.countries[0]?.country || '-'}`, severity: 'medium', category: 'Kompozisyon' });
      }
      const turkeyIntensity = intensityData.find(c => c.isTurkey);
      const worldAvgIntensity = intensityData.length > 0 ? intensityData.reduce((s, c) => s + c.value, 0) / intensityData.length : 0;
      if (turkeyIntensity) ins.push({ id: 'cp2', type: turkeyIntensity.value > worldAvgIntensity * 1.5 ? 'warning' : 'achievement', message: `Türkiye pestisit yoğunluğu: ${formatKgHa(turkeyIntensity.value)} (Dünya ort: ${formatKgHa(worldAvgIntensity)})`, severity: turkeyIntensity.value > worldAvgIntensity * 1.5 ? 'high' : 'medium', category: 'Yoğunluk' });
      setCompInsights(ins);
    } catch (e) { console.error('Kullanım Profili hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== CONCENTRATION ====================
  const loadConcentration = useCallback(async () => {
    setLoading(true);
    try {
      const [countryShareRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,4)) > 0 GROUP BY area ORDER BY total DESC LIMIT 50`),
      ]);

      const data = (countryShareRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey');
        return { rank: i + 1, country: translateCountry(name), rawName: name, value: Number(r.total) || 0, isTurkey };
      });
      setConcData(data);

      const shares = data.map((c: any) => c.value);
      const hhi = calculateHHI(shares);
      setConcHHI(hhi);

      const ins: Insight[] = [];
      if (hhi) {
        const label = hhi.concentration === 'LOW' ? 'düşük' : hhi.concentration === 'MODERATE' ? 'orta' : 'yüksek';
        ins.push({ id: 'cn1', type: hhi.concentration === 'HIGH' ? 'warning' : 'info', message: `Pestisit kullanım konsantrasyonu: HHI ${hhi.hhi.toFixed(0)} (${label}) — Top 3 pay %${hhi.top3Share.toFixed(1)}`, severity: hhi.concentration === 'HIGH' ? 'high' : 'medium', category: 'HHI' });
      }
      if (data.length >= 2) {
        const top1Share = (data[0].value / shares.reduce((s: number, v: number) => s + v, 0)) * 100;
        ins.push({ id: 'cn2', type: top1Share > 30 ? 'warning' : 'info', message: `${data[0].country} tek başına dünya kullanımının %${top1Share.toFixed(1)}'ini oluşturuyor`, severity: top1Share > 30 ? 'high' : 'medium', category: 'Hakimiyet' });
      }
      setConcInsights(ins);
    } catch (e) { console.error('Pazar Yoğunluğu hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== TURKEY PROFILE ====================
  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyByTypeRes, turkeyTrendRes, turkeyIntensityRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, element_tr, CAST(value AS DECIMAL(20,4)) as val FROM fao_input_pestisit_use WHERE year='2022' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr IN ('Tarımsal Kullanım','Ekili alan başına kullanım','Kişi başına kullanım') AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler','Rodentisitler')`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND CAST(year AS SIGNED) >= 2000 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT CAST(value AS DECIMAL(20,4)) as val FROM fao_input_pestisit_use WHERE year='2022' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr='Ekili alan başına kullanım' AND item_tr='Pestisitler (toplam)'`),
        fetchQuery(`SELECT AVG(CAST(value AS DECIMAL(20,4))) as avg_val FROM fao_input_pestisit_use WHERE year='2022' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND CAST(value AS DECIMAL(20,4)) > 0`),
      ]);

      const byType: Record<string, Record<string, number>> = {};
      (turkeyByTypeRes.data || []).forEach((r: any) => {
        const item = String(r.item_tr);
        const elem = String(r.element_tr);
        if (!byType[item]) byType[item] = {};
        byType[item][elem] = Number(r.val) || 0;
      });

      const totalUsage = byType['Pestisitler (toplam)']?.['Tarımsal Kullanım'] || 0;
      const kgHa = Number(turkeyIntensityRes.data?.[0]?.val) || 0;
      const worldAvg = Number(worldAvgRes.data?.[0]?.avg_val) || 0;

      const composition = Object.entries(byType).filter(([name]) => name !== 'Pestisitler (toplam)').map(([name, vals]) => ({
        name, tonaj: vals['Tarımsal Kullanım'] || 0,
        kgHa: vals['Ekili alan başına kullanım'] || 0,
        kgKisi: vals['Kişi başına kullanım'] || 0,
        share: totalUsage > 0 ? ((vals['Tarımsal Kullanım'] || 0) / totalUsage * 100) : 0,
      })).sort((a, b) => b.tonaj - a.tonaj);

      const trendData = (turkeyTrendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.total) || 0 }));
      setTurkeyTrends(trendData);
      const trendAnalysis = analyzeTrend(trendData as YearValue[]);

      setTurkeyProfile({
        totalUsage, kgHa, worldAvg, composition,
        cagr: trendAnalysis?.cagr || 0,
        vsWorldAvg: worldAvg > 0 ? ((totalUsage - worldAvg) / worldAvg * 100) : 0,
        direction: trendAnalysis?.direction || 'stable',
      });

      const ins: Insight[] = [];
      ins.push({ id: 'tp1', type: 'info', message: `Türkiye toplam pestisit kullanımı: ${formatTon(totalUsage)} (Yoğunluk: ${formatKgHa(kgHa)})`, severity: 'medium', category: 'Kullanım' });
      if (kgHa > 3) ins.push({ id: 'tp2', type: 'warning', message: `Pestisit yoğunluğu ${formatKgHa(kgHa)} — AB ortalamasının üzerinde olabilir`, severity: 'high', category: 'Yoğunluk' });
      if (composition.length > 0) {
        const dominant = composition[0];
        ins.push({ id: 'tp3', type: 'info', message: `En çok kullanılan: ${dominant.name} (%${dominant.share.toFixed(1)} pay, ${formatTon(dominant.tonaj)})`, severity: 'low', category: 'Kompozisyon' });
      }
      if (trendAnalysis) ins.push({ id: 'tp4', type: trendAnalysis.direction === 'up' ? 'growth' : 'decline', message: `Türkiye pestisit trendi: BBO %${trendAnalysis.cagr.toFixed(2)} (${trendAnalysis.direction === 'up' ? 'artıyor' : 'azalıyor'})`, severity: 'medium', category: 'Trend' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Türkiye Profili hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== FORECAST ====================
  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
      ]);

      const worldData: YearValue[] = (worldTrendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.total) || 0 }));
      const turkeyData: YearValue[] = (turkeyTrendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.total) || 0 }));

      const worldForecast = forecastLinear(worldData, 5);
      const turkeyForecast = forecastLinear(turkeyData, 5);
      const worldTrend = analyzeTrend(worldData);
      const turkeyTrend = analyzeTrend(turkeyData);
      const anomalies = detectAnomalies(turkeyData, 2.0);

      const allYears = new Set<string>();
      turkeyData.forEach(d => allYears.add(d.year));
      turkeyForecast.forecast.forEach(d => allYears.add(d.year));
      const chartData = Array.from(allYears).sort().map(year => {
        const hist = turkeyData.find(d => d.year === year);
        const fc = turkeyForecast.forecast.find(d => d.year === year);
        return { year, historical: hist?.value || null, forecast: fc?.value || null, anomaly: anomalies.find(a => a.year === year && a.isAnomaly)?.value || null };
      });

      setForecastData({
        chartData, worldTrend, turkeyTrend,
        turkeyR2: turkeyForecast.r2, worldR2: worldForecast.r2,
        turkeySlope: turkeyForecast.slope, anomalyCount: anomalies.filter(a => a.isAnomaly).length,
      });

      const ins: Insight[] = [];
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Türkiye pestisit trendi: BBO %${turkeyTrend.cagr.toFixed(2)}, oynaklık %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: worldTrend.direction === 'up' ? 'growth' : 'info', message: `Dünya pestisit trendi: BBO %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dünya' });
      if (turkeyTrend && worldTrend && turkeyTrend.cagr > worldTrend.cagr * 1.5) ins.push({ id: 'fc3', type: 'warning', message: `Türkiye pestisit artış hızı dünya ortalamasının ${(turkeyTrend.cagr / (worldTrend.cagr || 1)).toFixed(1)}x katı`, severity: 'high', category: 'Uyarı' });
      setForecastInsights(ins);
    } catch (e) { console.error('Trend & Tahmin hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== INTELLIGENCE ALERTS ====================
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, turkeyBeforeRes, worldAvgRes, intensityRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler') GROUP BY item_tr`),
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2015' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler') GROUP BY item_tr`),
        fetchQuery(`SELECT AVG(CAST(value AS DECIMAL(20,4))) as avg_val FROM fao_input_pestisit_use WHERE year='2022' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND CAST(value AS DECIMAL(20,4)) > 0`),
        fetchQuery(`SELECT area, CAST(value AS DECIMAL(20,4)) as val FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Ekili alan başına kullanım' AND item_tr='Pestisitler (toplam)' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye')`),
      ]);

      const now: Record<string, number> = {};
      (turkeyNowRes.data || []).forEach((r: any) => now[String(r.item_tr)] = Number(r.total) || 0);
      const before: Record<string, number> = {};
      (turkeyBeforeRes.data || []).forEach((r: any) => before[String(r.item_tr)] = Number(r.total) || 0);
      const worldAvg = Number(worldAvgRes.data?.[0]?.avg_val) || 0;
      const turkeyIntensity = Number(intensityRes.data?.[0]?.val) || 0;

      const alerts: IntelligenceAlert[] = [];
      const totalNow = now['Pestisitler (toplam)'] || 0;
      const totalBefore = before['Pestisitler (toplam)'] || 0;
      if (totalBefore > 0) {
        const change = ((totalNow - totalBefore) / totalBefore) * 100;
        alerts.push({ id: 'int-pest-change', severity: change > 30 ? 'critical' : change > 10 ? 'warning' : change > 0 ? 'info' : 'positive', title: 'Pestisit Kullanım Değişimi (2015-2021)', message: `Toplam pestisit kullanımı %${change.toFixed(1)} ${change > 0 ? 'arttı' : 'azaldı'} (${formatTon(totalBefore)} -> ${formatTon(totalNow)})`, metric: 'Kullanım trendi', value: change });
      }
      if (worldAvg > 0 && totalNow > 0) {
        const vsAvg = totalNow / worldAvg;
        alerts.push({ id: 'int-vs-world', severity: vsAvg > 3 ? 'warning' : 'info', title: 'Dünya Ortalamasına Göre', message: `Türkiye pestisit kullanımı dünya ülke ortalamasının ${vsAvg.toFixed(1)}x katı`, metric: 'Kıyaslama', value: vsAvg });
      }
      if (turkeyIntensity > 0) {
        alerts.push({ id: 'int-intensity', severity: turkeyIntensity > 5 ? 'critical' : turkeyIntensity > 2 ? 'warning' : 'positive', title: 'Pestisit Yoğunluğu', message: `Hektar başına ${formatKgHa(turkeyIntensity)} pestisit kullanılıyor${turkeyIntensity > 3 ? ' — AB sürdürülebilirlik hedeflerinin üzerinde' : ''}`, metric: 'kg/ha', value: turkeyIntensity });
      }
      ['Herbisitler', 'İnsektisitler', 'Fungisitler ve Bakterisitler'].forEach(type => {
        const n = now[type] || 0; const b = before[type] || 0;
        if (b > 0) {
          const ch = ((n - b) / b) * 100;
          if (Math.abs(ch) > 20) {
            alerts.push({ id: `int-${type}`, severity: ch > 30 ? 'warning' : ch < -20 ? 'positive' : 'info', title: `${type} Degisimi`, message: `${type}: %${ch.toFixed(1)} ${ch > 0 ? 'artis' : 'azalis'} (2015-2021)`, metric: type, value: ch });
          }
        }
      });

      setIntelligenceAlerts(alerts);
      setAllInsights(alerts.map(a => ({
        id: a.id,
        type: a.severity === 'critical' ? 'decline' as const : a.severity === 'warning' ? 'warning' as const : a.severity === 'positive' ? 'achievement' as const : 'info' as const,
        message: a.title + ': ' + a.message,
        severity: a.severity === 'critical' ? 'high' as const : a.severity === 'warning' ? 'medium' as const : 'low' as const,
        category: a.metric || 'İçgörü',
      })));
    } catch (e) { console.error('Intelligence hatası:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    switch (activeTab) {
      case 'overview': loadOverview(); break;
      case 'composition': loadComposition(); break;
      case 'concentration': loadConcentration(); break;
      case 'turkey': loadTurkeyProfile(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadComposition, loadConcentration, loadTurkeyProfile, loadForecast, loadAlerts]);

  return {
    loading,
    overviewKPIs, overviewByType, overviewTopCountries, overviewTrend, overviewInsights,
    compData, compTrends, compInsights,
    concData, concHHI, concInsights,
    turkeyProfile, turkeyTrends, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
