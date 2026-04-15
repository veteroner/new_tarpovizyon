/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line,
  Scatter
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Target, Award, AlertTriangle, Layers, BarChart2, Activity, Zap, Bug, Leaf, Droplets } from 'lucide-react';
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

type Tab = 'overview' | 'composition' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍' },
  { id: 'composition', label: 'Kullanım Profili', icon: '🧪' },
  { id: 'concentration', label: 'Pazar Yoğunluğu', icon: '🏆' },
  { id: 'turkey', label: 'Türkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'Akıllı Analiz', icon: '🧠' },
];

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(1) + ' ton';
}

function formatKgHa(value: number): string {
  return value.toFixed(2) + ' kg/ha';
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(1);
}

export default function PesticidePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2020' AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS}`)
      ]);

      const byType = (byTypeRes.data || []).map((r: any, i: number) => ({
        name: String(r.item_tr), value: Number(r.total) || 0, fill: CHART_COLORS[i % CHART_COLORS.length]
      }));
      setOverviewByType(byType);

      const topCountries = (topCountriesRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey') || name.includes('Turkiye');
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
        worldCAGR: worldCAGR?.cagr || 0
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
        fetchQuery(`SELECT area, AVG(CAST(value AS DECIMAL(20,4))) as avg_intensity FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Ekili alan başına kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,4)) > 0 GROUP BY area ORDER BY avg_intensity DESC LIMIT 20`)
      ]);

      // Top countries per pesticide type
      const typeMap: Record<string, { name: string; countries: { country: string; value: number }[] }> = {};
      (typeByCountryRes.data || []).forEach((r: any) => {
        const type = String(r.item_tr);
        if (!typeMap[type]) typeMap[type] = { name: type, countries: [] };
        if (typeMap[type].countries.length < 5) {
          typeMap[type].countries.push({ country: translateCountry(String(r.area || '')), value: Number(r.total) || 0 });
        }
      });
      setCompData(Object.values(typeMap));

      // Type trends over time
      const yearMap: Record<string, Record<string, number>> = {};
      (typeTrendRes.data || []).forEach((r: any) => {
        const yr = String(r.year);
        if (!yearMap[yr]) yearMap[yr] = {};
        yearMap[yr][String(r.item_tr)] = Number(r.total) || 0;
      });
      const trendData = Object.entries(yearMap).sort(([a], [b]) => a.localeCompare(b)).map(([year, types]) => ({
        year, ...types
      }));
      setCompTrends(trendData);

      // Intensity rankings
      const intensityData = (intensityRes.data || []).map((r: any) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey');
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
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,4)) > 0 GROUP BY area ORDER BY total DESC LIMIT 50`)
      ]);

      const data = (countryShareRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey');
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
        fetchQuery(`SELECT item_tr, element_tr, CAST(value AS DECIMAL(20,4)) as val FROM fao_input_pestisit_use WHERE year='2022' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr IN ('Tarımsal Kullanım','Ekili alan başına kullanım','Kişi başına kullanım') AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler','Rodentisitler')`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND CAST(year AS SIGNED) >= 2000 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT CAST(value AS DECIMAL(20,4)) as val FROM fao_input_pestisit_use WHERE year='2022' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr='Ekili alan başına kullanım' AND item_tr='Pestisitler (toplam)'`),
        fetchQuery(`SELECT AVG(CAST(value AS DECIMAL(20,4))) as avg_val FROM fao_input_pestisit_use WHERE year='2022' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND CAST(value AS DECIMAL(20,4)) > 0`)
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
        share: totalUsage > 0 ? ((vals['Tarımsal Kullanım'] || 0) / totalUsage * 100) : 0
      })).sort((a, b) => b.tonaj - a.tonaj);

      const trendData = (turkeyTrendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.total) || 0 }));
      setTurkeyTrends(trendData);

      const trendAnalysis = analyzeTrend(trendData as YearValue[]);

      setTurkeyProfile({
        totalUsage, kgHa, worldAvg, composition,
        cagr: trendAnalysis?.cagr || 0,
        vsWorldAvg: worldAvg > 0 ? ((totalUsage - worldAvg) / worldAvg * 100) : 0,
        direction: trendAnalysis?.direction || 'stable'
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
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`)
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
        turkeySlope: turkeyForecast.slope, anomalyCount: anomalies.filter(a => a.isAnomaly).length
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
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler') GROUP BY item_tr`),
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2015' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler') GROUP BY item_tr`),
        fetchQuery(`SELECT AVG(CAST(value AS DECIMAL(20,4))) as avg_val FROM fao_input_pestisit_use WHERE year='2022' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND CAST(value AS DECIMAL(20,4)) > 0`),
        fetchQuery(`SELECT area, CAST(value AS DECIMAL(20,4)) as val FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Ekili alan başına kullanım' AND item_tr='Pestisitler (toplam)' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye')`)
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
      // Sub-type analysis
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
        id: a.id, type: a.severity === 'critical' ? 'decline' as const : a.severity === 'warning' ? 'warning' as const : a.severity === 'positive' ? 'achievement' as const : 'info' as const,
        message: a.title + ': ' + a.message,
        severity: a.severity === 'critical' ? 'high' as const : a.severity === 'warning' ? 'medium' as const : 'low' as const,
        category: a.metric || 'İçgörü'
      })));
    } catch (e) { console.error('Intelligence hatasi:', e); }
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌿 Pestisit Analizi</h1>
        <p className="page-subtitle">FAO pestisit kullanımı — akıllı analiz motoru</p>
      </div>

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
        <div className="loading"><div className="loading-spinner"></div><p>Analiz yükleniyor...</p></div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === 'overview' && overviewKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="DÜNYA PESTİSİT KULLANIMI" value={formatTon(overviewKPIs.worldTotal)} subtitle={`Yıllık: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | BBO: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="TÜRKİYE KULLANIMI" value={formatTon(overviewKPIs.turkeyUsage)} subtitle={`Dünya sırası: #${overviewKPIs.turkeyRank}`} icon={MapPin} color="orange" />
                <KPICard title="EN BÜYÜK KULLANICI" value={overviewKPIs.topUser} subtitle="2021" icon={Award} color="blue" />
                <KPICard title="PESTİSİT TÜRÜ" value={String(overviewKPIs.typeCount)} subtitle="Aktif tür" icon={Bug} color="red" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Pestisit Tür Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={overviewByType} cx="50%" cy="50%" outerRadius={100} innerRadius={40} dataKey="value" label={({ name, percent }) => `${(name || '').substring(0, 12)} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {overviewByType.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 Pestisit Kullanıcısı Ülke</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dünya Pestisit Kullanım Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Toplam']} />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* COMPOSITION */}
          {activeTab === 'composition' && (
            <>
              {compData.length > 0 && (
                <div className="kpi-grid">
                  {compData.slice(0, 4).map((type: any, i: number) => {
                    const total = type.countries.reduce((s: number, c: any) => s + c.value, 0);
                    return (
                      <KPICard key={type.name} title={type.name.toUpperCase()} value={formatTon(total)} subtitle={`Lider: ${type.countries[0]?.country || '-'}`} icon={[Bug, Leaf, Droplets, Target][i] || Bug} color={(['purple', 'green', 'blue', 'orange'] as const)[i % 4]} />
                    );
                  })}
                </div>
              )}
              {compTrends.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Pestisit Alt Tür Trendleri (2000+)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={compTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Area type="monotone" dataKey="Herbisitler" name="Herbisitler" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="İnsektisitler" name="İnsektisitler" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="Fungisitler ve Bakterisitler" name="Fungisitler" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="Rodentisitler" name="Rodentisitler" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={compInsights} />
            </>
          )}

          {/* CONCENTRATION */}
          {activeTab === 'concentration' && (
            <>
              {concHHI && (
                <div className="kpi-grid">
                  <KPICard title="HHI ENDEKSİ" value={concHHI.hhi.toFixed(0)} subtitle={`Konsantrasyon: ${concHHI.concentration === 'HIGH' ? 'Yüksek' : concHHI.concentration === 'MODERATE' ? 'Orta' : 'Düşük'}`} icon={BarChart2} color="purple" large />
                  <KPICard title="İLK 1 PAYI" value={`%${concHHI.top1Share.toFixed(1)}`} subtitle={concData[0]?.country || '-'} icon={Award} color="orange" />
                  <KPICard title="İLK 3 PAYI" value={`%${concHHI.top3Share.toFixed(1)}`} subtitle="İlk 3 ülke" icon={Layers} color="blue" />
                  <KPICard title="ETKİN RAKİP" value={concHHI.effectiveCompetitors.toFixed(1)} subtitle="Efektif sayı" icon={Activity} color="green" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Pestisit Kullanımı — Ülke Sıralaması</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={concData.slice(0, 25)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {concData.slice(0, 25).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={concInsights} />
            </>
          )}

          {/* TURKEY PROFILE */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TOPLAM PESTİSİT" value={formatTon(turkeyProfile.totalUsage)} subtitle={`BBO: %${turkeyProfile.cagr.toFixed(2)}`} icon={Bug} color="red" large />
                <KPICard title="YOĞUNLUK" value={formatKgHa(turkeyProfile.kgHa)} subtitle="kg/ha" icon={Droplets} color="purple" />
                <KPICard title="DÜNYA ORTALAMASI" value={formatTon(turkeyProfile.worldAvg)} subtitle="Ülke ort." icon={Globe} color="blue" />
                <KPICard title="TREND YÖNÜ" value={turkeyProfile.direction === 'up' ? 'Artış' : turkeyProfile.direction === 'down' ? 'Düşüş' : 'Stabil'} subtitle={`%${Math.abs(turkeyProfile.vsWorldAvg).toFixed(0)} ${turkeyProfile.vsWorldAvg > 0 ? 'üzerinde' : 'altında'}`} icon={turkeyProfile.direction === 'up' ? TrendingUp : TrendingDown} color={turkeyProfile.direction === 'up' ? 'orange' : 'green'} />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Pestisit Kompozisyonu</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={turkeyProfile.composition} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={160} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
                      <Bar dataKey="tonaj" radius={[0, 4, 4, 0]}>
                        {turkeyProfile.composition.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Pestisit Trendi (2000+)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Toplam']} />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={turkeyInsights} />
            </>
          )}

          {/* FORECAST */}
          {activeTab === 'forecast' && forecastData && (
            <>
              <div className="kpi-grid">
                <KPICard title="TÜRKİYE BBO" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.turkeyR2?.toFixed(3) || '0'}`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'orange' : 'green'} large />
                <KPICard title="DÜNYA BBO" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="OYNAKLIK" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Türkiye" icon={Activity} color="purple" />
                <KPICard title="ANOMALİ" value={String(forecastData.anomalyCount || 0)} subtitle="Sapma sayısı" icon={AlertTriangle} color="red" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Türkiye Pestisit Kullanımı — Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatTon(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gerçek" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                      <Scatter dataKey="anomaly" name="Anomali" fill="#f59e0b" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={forecastInsights} />
            </>
          )}

          {/* INTELLIGENCE ALERTS */}
          {activeTab === 'alerts' && (
            <>
              <div className="kpi-grid">
                <KPICard title="TOPLAM UYARI" value={String(intelligenceAlerts.length)} subtitle="Otomatik tespit" icon={Zap} color="purple" large />
                <KPICard title="KRİTİK" value={String(intelligenceAlerts.filter(a => a.severity === 'critical').length)} subtitle="Acil" icon={AlertTriangle} color="red" />
                <KPICard title="UYARI" value={String(intelligenceAlerts.filter(a => a.severity === 'warning').length)} subtitle="İzlenmeli" icon={Activity} color="orange" />
                <KPICard title="POZİTİF" value={String(intelligenceAlerts.filter(a => a.severity === 'positive').length)} subtitle="Gelişim" icon={TrendingUp} color="green" />
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
