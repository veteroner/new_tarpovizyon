/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line,
  Scatter
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, Users, Award, AlertTriangle, Activity, Zap, MapPin, Target, BarChart2, UserCheck } from 'lucide-react';
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

type Tab = 'overview' | 'gender' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍' },
  { id: 'gender', label: 'Cinsiyet Analizi', icon: '⚧️' },
  { id: 'concentration', label: 'Yogunlasma', icon: '📊' },
  { id: 'turkey', label: 'Turkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'Intelligence', icon: '🧠' },
];

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

function formatPop(value: number): string {
  const actual = value * 1000;
  if (actual >= 1e9) return (actual / 1e9).toFixed(2) + ' Milyar';
  if (actual >= 1e6) return (actual / 1e6).toFixed(2) + ' Milyon';
  if (actual >= 1e3) return (actual / 1e3).toFixed(0) + ' Bin';
  return actual.toFixed(0);
}

function formatShort(value: number): string {
  const actual = value * 1000;
  if (actual >= 1e9) return (actual / 1e9).toFixed(1) + 'B';
  if (actual >= 1e6) return (actual / 1e6).toFixed(1) + 'M';
  if (actual >= 1e3) return (actual / 1e3).toFixed(0) + 'K';
  return actual.toFixed(0);
}

function formatPercent(v: number): string { return `%${v.toFixed(1)}`; }

export default function AgriculturalEmploymentPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Overview
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [topCountries, setTopCountries] = useState<any[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Gender
  const [genderByCountry, setGenderByCountry] = useState<any[]>([]);
  const [genderTrend, setGenderTrend] = useState<any[]>([]);
  const [genderKPIs, setGenderKPIs] = useState<any>(null);
  const [genderInsights, setGenderInsights] = useState<Insight[]>([]);

  // Concentration
  const [concentrationData, setConcentrationData] = useState<any>(null);
  const [concentrationInsights, setConcentrationInsights] = useState<Insight[]>([]);

  // Turkey
  const [turkeyProfile, setTurkeyProfile] = useState<any>(null);
  const [turkeyTrend, setTurkeyTrend] = useState<any[]>([]);
  const [turkeyInsights, setTurkeyInsights] = useState<Insight[]>([]);

  // Forecast
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<Insight[]>([]);

  // Intelligence
  const [intelligenceAlerts, setIntelligenceAlerts] = useState<IntelligenceAlert[]>([]);
  const [allInsights, setAllInsights] = useState<Insight[]>([]);

  const excludeFilter = [...EXCLUDED_AREAS].map(a => `'${a}'`).join(',');

  // ==================== OVERVIEW ====================
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [countriesRes, trendRes, prevRes] = await Promise.all([
        fetchQuery(`SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam, SUM(CAST(e.male AS DECIMAL(20,2))) as erkek, SUM(CAST(e.female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND e.area NOT IN (${excludeFilter}) GROUP BY e.area ORDER BY toplam DESC LIMIT 25`),
        fetchQuery(`SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam, SUM(CAST(male AS DECIMAL(20,2))) as erkek, SUM(CAST(female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim GROUP BY yearcode ORDER BY yearcode`),
        fetchQuery(`SELECT SUM(CAST(total AS DECIMAL(20,2))) as total FROM fao_nufus_istihdam_tarim WHERE yearcode='2023' AND indicatorcode='21066'`)
      ]);

      const countries = (countriesRes.data || []).map((r: any, i: number) => {
        const name = translateCountry(String(r.area || ''));
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkiye') || name.toLowerCase().includes('turkey');
        return { name, total: Number(r.toplam) || 0, male: Number(r.erkek) || 0, female: Number(r.kadin) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setTopCountries(countries);

      const trend = (trendRes.data || []).map((r: any) => ({
        year: String(r.year), total: Number(r.toplam) || 0, male: Number(r.erkek) || 0, female: Number(r.kadin) || 0
      }));
      setYearlyTrend(trend);

      const worldTotal = countries.reduce((s: number, c: any) => s + c.total, 0);
      const worldMale = countries.reduce((s: number, c: any) => s + c.male, 0);
      const worldFemale = countries.reduce((s: number, c: any) => s + c.female, 0);
      const prevTotal = Number(prevRes.data?.[0]?.total) || 0;
      const yoy = calculateYoY(worldTotal, prevTotal);
      const trendYV: YearValue[] = trend.map(t => ({ year: t.year, value: t.total }));
      const cagr = calculateCAGR(trendYV);
      const femaleShare = worldTotal > 0 ? (worldFemale / worldTotal * 100) : 0;

      setOverviewKPIs({ worldTotal, worldMale, worldFemale, femaleShare, yoy, cagr: cagr?.cagr || 0, topCountry: countries[0]?.name || '-', topCountryValue: countries[0]?.total || 0 });

      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dunya tarim istihdami: ${formatPop(worldTotal)} (Top 25 ulke)`, severity: 'low', category: 'Genel' });
      ins.push({ id: 'ov2', type: femaleShare > 40 ? 'achievement' : 'warning', message: `Kadin istihdam payi: %${femaleShare.toFixed(1)}`, severity: femaleShare < 30 ? 'high' : 'medium', category: 'Cinsiyet' });
      if (cagr) ins.push({ id: 'ov3', type: cagr.cagr > 0 ? 'growth' : 'decline', message: `Tarim istihdami CAGR: %${cagr.cagr.toFixed(2)} — ${cagr.cagr > 0 ? 'buyuyor' : 'daraliyor'}`, severity: 'high', category: 'Trend' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Overview hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== GENDER ====================
  const loadGender = useCallback(async () => {
    setLoading(true);
    try {
      const [byCountryRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT e.area, SUM(CAST(e.male AS DECIMAL(20,2))) as erkek, SUM(CAST(e.female AS DECIMAL(20,2))) as kadin, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND e.area NOT IN (${excludeFilter}) GROUP BY e.area HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`),
        fetchQuery(`SELECT yearcode as year, SUM(CAST(male AS DECIMAL(20,2))) as erkek, SUM(CAST(female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim GROUP BY yearcode ORDER BY yearcode`)
      ]);

      const byCountry = (byCountryRes.data || []).map((r: any) => {
        const m = Number(r.erkek) || 0;
        const f = Number(r.kadin) || 0;
        const t = Number(r.toplam) || 0;
        return { name: translateCountry(String(r.area || '')), male: m, female: f, total: t, femaleRatio: t > 0 ? (f / t * 100) : 0 };
      });
      setGenderByCountry(byCountry);

      const trend = (trendRes.data || []).map((r: any) => {
        const m = Number(r.erkek) || 0;
        const f = Number(r.kadin) || 0;
        return { year: String(r.year), male: m, female: f, femaleRatio: (m + f) > 0 ? (f / (m + f) * 100) : 0 };
      });
      setGenderTrend(trend);

      const totalM = byCountry.reduce((s: number, c: any) => s + c.male, 0);
      const totalF = byCountry.reduce((s: number, c: any) => s + c.female, 0);
      const avgFemaleRatio = byCountry.length > 0 ? byCountry.reduce((s: number, c: any) => s + c.femaleRatio, 0) / byCountry.length : 0;
      const highestFemale = [...byCountry].sort((a, b) => b.femaleRatio - a.femaleRatio)[0];
      const lowestFemale = [...byCountry].sort((a, b) => a.femaleRatio - b.femaleRatio)[0];
      const recentTrend = trend.length >= 2 ? trend[trend.length - 1].femaleRatio - trend[trend.length - 10]?.femaleRatio : 0;

      setGenderKPIs({ totalM, totalF, avgFemaleRatio, highestFemale: highestFemale?.name || '-', lowestFemale: lowestFemale?.name || '-', recentTrend });

      const ins: Insight[] = [];
      ins.push({ id: 'gn1', type: 'info', message: `Ortalama kadin tarim istihdam orani: %${avgFemaleRatio.toFixed(1)}`, severity: 'medium', category: 'Cinsiyet' });
      if (highestFemale) ins.push({ id: 'gn2', type: 'achievement', message: `En yuksek kadin payi: ${highestFemale.name} (%${highestFemale.femaleRatio.toFixed(1)})`, severity: 'low', category: 'Esitlik' });
      if (recentTrend > 0) ins.push({ id: 'gn3', type: 'growth', message: `Kadin payi son 10 yilda +${recentTrend.toFixed(1)} puan artti`, severity: 'medium', category: 'Trend' });
      else if (recentTrend < 0) ins.push({ id: 'gn3', type: 'decline', message: `Kadin payi son 10 yilda ${recentTrend.toFixed(1)} puan dustu`, severity: 'high', category: 'Trend' });
      setGenderInsights(ins);
    } catch (e) { console.error('Gender hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== CONCENTRATION ====================
  const loadConcentration = useCallback(async () => {
    setLoading(true);
    try {
      const [shareRes, historicRes] = await Promise.all([
        fetchQuery(`SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND e.area NOT IN (${excludeFilter}) GROUP BY e.area HAVING toplam > 0 ORDER BY toplam DESC`),
        fetchQuery(`SELECT e.year, e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.indicatorcode='21066' AND e.area NOT IN (${excludeFilter}) AND e.yearcode IN ('2000','2005','2010','2015','2024') GROUP BY e.yearcode, e.area HAVING toplam > 0`)
      ]);

      const countries = (shareRes.data || []).map((r: any) => ({ name: translateCountry(String(r.area || '')), value: Number(r.toplam) || 0 }));
      const worldTotal = countries.reduce((s: number, c: any) => s + c.value, 0);
      const shares = countries.map((c: any) => c.value / worldTotal);
      const hhiResult = calculateHHI(shares);
      const hhi = typeof hhiResult === 'number' ? hhiResult : (hhiResult as any).value ?? (hhiResult as any).hhi ?? 0;
      const top5Share = countries.slice(0, 5).reduce((s: number, c: any) => s + c.value, 0) / worldTotal * 100;
      const top10Share = countries.slice(0, 10).reduce((s: number, c: any) => s + c.value, 0) / worldTotal * 100;

      // HHI by year
      const byYear: Record<string, any[]> = {};
      (historicRes.data || []).forEach((r: any) => {
        const y = String(r.year);
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push({ name: String(r.area || ''), value: Number(r.toplam) || 0 });
      });
      const hhiHistory = Object.entries(byYear).map(([year, items]) => {
        const t = items.reduce((s: number, i: any) => s + i.value, 0);
        const sh = items.map((i: any) => i.value / t);
        return { year, hhi: calculateHHI(sh), top5: items.sort((a: any, b: any) => b.value - a.value).slice(0, 5).reduce((s: number, i: any) => s + i.value, 0) / t * 100 };
      }).sort((a, b) => a.year.localeCompare(b.year));

      const pieData = countries.slice(0, 8).map((c: any, i: number) => ({ ...c, share: (c.value / worldTotal * 100).toFixed(1), fill: CHART_COLORS[i % CHART_COLORS.length] }));
      const restShare = countries.slice(8).reduce((s: number, c: any) => s + c.value, 0);
      if (restShare > 0) pieData.push({ name: 'Diger', value: restShare, share: (restShare / worldTotal * 100).toFixed(1), fill: '#94a3b8' });

      setConcentrationData({ hhi, top5Share, top10Share, countryCount: countries.length, pieData, hhiHistory });

      const ins: Insight[] = [];
      ins.push({ id: 'cn1', type: hhi > 0.25 ? 'warning' : 'info', message: `HHI Endeksi: ${(hhi * 10000).toFixed(0)} — ${hhi > 0.25 ? 'Yuksek yogunlasma' : hhi > 0.15 ? 'Orta yogunlasma' : 'Dusuk yogunlasma'}`, severity: hhi > 0.25 ? 'high' : 'medium', category: 'Yogunlasma' });
      ins.push({ id: 'cn2', type: 'info', message: `Top 5 ulke: %${top5Share.toFixed(1)} pay | Top 10: %${top10Share.toFixed(1)}`, severity: 'medium', category: 'Dagılım' });
      setConcentrationInsights(ins);
    } catch (e) { console.error('Concentration hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== TURKEY ====================
  const loadTurkey = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, worldRankRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT e.year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')`),
        fetchQuery(`SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND e.area NOT IN (${excludeFilter}) GROUP BY e.area HAVING toplam > 0 ORDER BY toplam DESC`),
        fetchQuery(`SELECT e.year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%') AND CAST(e.yearcode AS SIGNED) >= 1990 ORDER BY e.yearcode`)
      ]);

      const now = turkeyNowRes.data?.[0];
      const totalNow = Number(now?.toplam) || 0;
      const maleNow = Number(now?.erkek) || 0;
      const femaleNow = Number(now?.kadin) || 0;
      const femaleRatio = totalNow > 0 ? (femaleNow / totalNow * 100) : 0;

      const allCountries = (worldRankRes.data || []).map((r: any) => String(r.area || ''));
      const turkeyIdx = allCountries.findIndex(n => n.includes('T\u00FCrkiye') || n.includes('Turkey'));

      const trend = (turkeyTrendRes.data || []).map((r: any) => ({
        year: String(r.year), total: Number(r.toplam) || 0, male: Number(r.erkek) || 0, female: Number(r.kadin) || 0,
        femaleRatio: (Number(r.toplam) || 0) > 0 ? (Number(r.kadin) || 0) / (Number(r.toplam) || 0) * 100 : 0
      }));
      setTurkeyTrend(trend);

      const trendYV: YearValue[] = trend.map(t => ({ year: t.year, value: t.total }));
      const cagr = calculateCAGR(trendYV);

      setTurkeyProfile({ totalNow, maleNow, femaleNow, femaleRatio, rank: turkeyIdx >= 0 ? turkeyIdx + 1 : 'N/A', cagr: cagr?.cagr || 0 });

      const ins: Insight[] = [];
      ins.push({ id: 'tk1', type: 'info', message: `Turkiye tarim istihdami: ${formatPop(totalNow)} (Dunya #${turkeyIdx >= 0 ? turkeyIdx + 1 : '?'})`, severity: 'medium', category: 'Konum' });
      ins.push({ id: 'tk2', type: femaleRatio > 35 ? 'achievement' : 'warning', message: `Kadin payi: %${femaleRatio.toFixed(1)} ${femaleRatio > 40 ? '(Dunya ortalamasinin ustunde)' : ''}`, severity: 'medium', category: 'Cinsiyet' });
      if (cagr) ins.push({ id: 'tk3', type: cagr.cagr > 0 ? 'growth' : 'decline', message: `Istihdam CAGR: %${cagr.cagr.toFixed(2)}`, severity: 'high', category: 'Trend' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Turkey hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== FORECAST ====================
  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066' AND CAST(yearcode AS SIGNED) >= 1990 GROUP BY yearcode ORDER BY yearcode`),
        fetchQuery(`SELECT e.year, CAST(e.total AS DECIMAL(20,2)) as toplam FROM fao_nufus_istihdam_tarim e WHERE (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%') AND CAST(e.yearcode AS SIGNED) >= 1990 ORDER BY e.yearcode`)
      ]);

      const worldData: YearValue[] = (worldTrendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.toplam) || 0 }));
      const turkeyData: YearValue[] = (turkeyTrendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.toplam) || 0 }));

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
        anomalyCount: anomalies.filter(a => a.isAnomaly).length
      });

      const ins: Insight[] = [];
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Turkiye istihdam trendi: CAGR %${turkeyTrend.cagr.toFixed(2)}, volatilite %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: worldTrend.direction === 'up' ? 'growth' : 'decline', message: `Dunya istihdam trendi: CAGR %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dunya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== INTELLIGENCE ====================
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, turkeyBeforeRes, worldGenderRes, worldTotalRes] = await Promise.all([
        fetchQuery(`SELECT e.year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')`),
        fetchQuery(`SELECT e.year, CAST(e.total AS DECIMAL(20,2)) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2010' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')`),
        fetchQuery(`SELECT SUM(CAST(male AS DECIMAL(20,2))) as erkek, SUM(CAST(female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim WHERE yearcode='2024' AND indicatorcode='21066'`),
        fetchQuery(`SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066' AND yearcode IN ('2024','2010') GROUP BY yearcode`)
      ]);

      const alerts: IntelligenceAlert[] = [];

      const now = turkeyNowRes.data?.[0];
      const before = turkeyBeforeRes.data?.[0];
      const totalNow = Number(now?.toplam) || 0;
      const femaleNow = Number(now?.kadin) || 0;
      const totalBefore = Number(before?.toplam) || 0;

      // Turkey employment change
      if (totalBefore > 0) {
        const change = ((totalNow - totalBefore) / totalBefore) * 100;
        alerts.push({ id: 'emp-change', severity: Math.abs(change) > 15 ? (change < 0 ? 'critical' : 'positive') : 'info', title: `Turkiye Istihdam ${change > 0 ? 'Artisi' : 'Dususu'}`, message: `2010-2022 doneminde %${change.toFixed(1)} degisim (${formatPop(totalNow)})`, metric: 'Istihdam Degisimi', value: change });
      }

      // Gender gap
      const femaleRatio = totalNow > 0 ? (femaleNow / totalNow * 100) : 0;
      const worldM = Number(worldGenderRes.data?.[0]?.erkek) || 0;
      const worldF = Number(worldGenderRes.data?.[0]?.kadin) || 0;
      const worldFemaleRatio = (worldM + worldF) > 0 ? (worldF / (worldM + worldF) * 100) : 0;
      alerts.push({ id: 'gender-gap', severity: femaleRatio < worldFemaleRatio * 0.8 ? 'warning' : 'positive', title: 'Cinsiyet Esitligi', message: `Turkiye kadin payi: %${femaleRatio.toFixed(1)} vs Dunya: %${worldFemaleRatio.toFixed(1)}`, metric: 'Kadin Orani', value: femaleRatio });

      // Global employment trend
      const worldData = (worldTotalRes.data || []);
      const world2022 = Number(worldData.find((r: any) => r.year === '2022')?.toplam) || 0;
      const world2010 = Number(worldData.find((r: any) => r.year === '2010')?.toplam) || 0;
      if (world2010 > 0) {
        const globalChange = ((world2022 - world2010) / world2010) * 100;
        alerts.push({ id: 'global-emp', severity: globalChange < -5 ? 'warning' : 'info', title: 'Dunya Tarim Istihdami', message: `2010-2022 doneminde %${globalChange.toFixed(1)} degisim`, metric: 'Global Trend', value: globalChange });
      }

      // Structural shift alert
      if (totalBefore > 0 && totalNow < totalBefore * 0.7) {
        alerts.push({ id: 'structural', severity: 'critical', title: 'Yapisal Donusum', message: 'Turkiye tarim istihdaminda hizli cozulme — sanayilesme sinyali', metric: 'Yapisal', value: ((totalNow - totalBefore) / totalBefore) * 100 });
      }

      setIntelligenceAlerts(alerts);
      setAllInsights(alerts.map(a => ({
        id: a.id, type: a.severity === 'critical' ? 'decline' as const : a.severity === 'warning' ? 'warning' as const : a.severity === 'positive' ? 'achievement' as const : 'info' as const,
        message: a.title + ': ' + a.message,
        severity: a.severity === 'critical' ? 'high' as const : a.severity === 'warning' ? 'medium' as const : 'low' as const,
        category: a.metric || 'Intelligence'
      })));
    } catch (e) { console.error('Intelligence hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    switch (activeTab) {
      case 'overview': loadOverview(); break;
      case 'gender': loadGender(); break;
      case 'concentration': loadConcentration(); break;
      case 'turkey': loadTurkey(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadGender, loadConcentration, loadTurkey, loadForecast, loadAlerts]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tarim Istihdami Intelligence Dashboard</h1>
        <p className="page-subtitle">FAO tarim istihdami & cinsiyet analizi - akilli karar destek motoru</p>
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
        <div className="loading"><div className="loading-spinner"></div><p>Intelligence analizi yukleniyor...</p></div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === 'overview' && overviewKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="DUNYA TARIM ISTIHDAMI" value={formatPop(overviewKPIs.worldTotal)} subtitle={`YoY: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | CAGR: %${overviewKPIs.cagr.toFixed(2)}`} icon={Users} color="purple" large />
                <KPICard title="EN BUYUK" value={overviewKPIs.topCountry} subtitle={formatPop(overviewKPIs.topCountryValue)} icon={Award} color="blue" />
                <KPICard title="KADIN PAYI" value={formatPercent(overviewKPIs.femaleShare)} subtitle="Dunya ortalama" icon={UserCheck} color="teal" />
                <KPICard title="ERKEK" value={formatPop(overviewKPIs.worldMale)} subtitle={`Kadin: ${formatPop(overviewKPIs.worldFemale)}`} icon={BarChart2} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Top 20 Ulke - Tarim Istihdami</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topCountries.slice(0, 20)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={110} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="male" name="Erkek" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="female" name="Kadin" stackId="a" fill="#ec4899" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Yillik Istihdam Trendi</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="total" name="Toplam" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="female" name="Kadin" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* GENDER */}
          {activeTab === 'gender' && genderKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="ORT KADIN ORANI" value={formatPercent(genderKPIs.avgFemaleRatio)} subtitle="Top 20 ulke" icon={UserCheck} color="teal" large />
                <KPICard title="EN YUKSEK" value={genderKPIs.highestFemale} subtitle="Kadin payi" icon={TrendingUp} color="green" />
                <KPICard title="EN DUSUK" value={genderKPIs.lowestFemale} subtitle="Kadin payi" icon={TrendingDown} color="red" />
                <KPICard title="SON 10 YIL" value={`${genderKPIs.recentTrend > 0 ? '+' : ''}${genderKPIs.recentTrend.toFixed(1)}pp`} subtitle="Kadin payi degisimi" icon={Activity} color="purple" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Ulke Bazli Erkek-Kadin Istihdami</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={genderByCountry.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="male" name="Erkek" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="female" name="Kadin" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Kadin Istihdam Orani Trendi (%)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={genderTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="female" name="Kadin" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="femaleRatio" name="Kadin Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={genderInsights} />
            </>
          )}

          {/* CONCENTRATION */}
          {activeTab === 'concentration' && concentrationData && (
            <>
              <div className="kpi-grid">
                <KPICard title="HHI ENDEKSI" value={String((concentrationData.hhi * 10000).toFixed(0))} subtitle={concentrationData.hhi > 0.25 ? 'Yuksek yogunlasma' : concentrationData.hhi > 0.15 ? 'Orta yogunlasma' : 'Dusuk yogunlasma'} icon={Target} color={concentrationData.hhi > 0.25 ? 'red' : 'blue'} large />
                <KPICard title="TOP 5 PAYI" value={formatPercent(concentrationData.top5Share)} subtitle="Ilk 5 ulke" icon={Award} color="purple" />
                <KPICard title="TOP 10 PAYI" value={formatPercent(concentrationData.top10Share)} subtitle="Ilk 10 ulke" icon={BarChart2} color="orange" />
                <KPICard title="ULKE SAYISI" value={String(concentrationData.countryCount)} subtitle="Aktif istihdam" icon={Globe} color="green" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Istihdam Pazar Payi Dagilimi</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={concentrationData.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} dataKey="value" label={({ name, share }: any) => `${name} ${share}%`} labelLine={false}>
                        {concentrationData.pieData.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatPop(v), 'Istihdam']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">HHI & Top 5 Payi Tarihsel</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={concentrationData.hhiHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="hhi" name="HHI" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="top5" name="Top 5 Pay (%)" stroke="#f59e0b" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={concentrationInsights} />
            </>
          )}

          {/* TURKEY */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE ISTIHDAMI" value={formatPop(turkeyProfile.totalNow)} subtitle={`Dunya #${turkeyProfile.rank} | CAGR: %${turkeyProfile.cagr.toFixed(2)}`} icon={MapPin} color="orange" large />
                <KPICard title="ERKEK" value={formatPop(turkeyProfile.maleNow)} subtitle="2022" icon={Users} color="blue" />
                <KPICard title="KADIN" value={formatPop(turkeyProfile.femaleNow)} subtitle={`%${turkeyProfile.femaleRatio.toFixed(1)}`} icon={UserCheck} color="teal" />
                <KPICard title="DUNYA SIRASI" value={`#${turkeyProfile.rank}`} subtitle="Tarim istihdami" icon={Award} color="purple" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Tarim Istihdami Trendi</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={turkeyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => [name.includes('Oran') ? `%${Number(v).toFixed(1)}` : formatPop(v), name]} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="total" name="Toplam" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} />
                      <Bar yAxisId="left" dataKey="male" name="Erkek" fill="#3b82f6" opacity={0.6} />
                      <Bar yAxisId="left" dataKey="female" name="Kadin" fill="#ec4899" opacity={0.6} />
                      <Line yAxisId="right" type="monotone" dataKey="femaleRatio" name="Kadin Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
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
                <KPICard title="TURKIYE CAGR" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.turkeyR2?.toFixed(3) || '0'}`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'green' : 'red'} large />
                <KPICard title="DUNYA CAGR" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="VOLATILITE" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Turkiye" icon={Activity} color="purple" />
                <KPICard title="ANOMALI" value={String(forecastData.anomalyCount || 0)} subtitle="Sapma sayisi" icon={AlertTriangle} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Istihdam - Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatPop(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gercek" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#ff6b35" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                      <Scatter dataKey="anomaly" name="Anomali" fill="#ef4444" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={forecastInsights} />
            </>
          )}

          {/* INTELLIGENCE */}
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
