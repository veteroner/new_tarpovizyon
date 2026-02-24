/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line,
  LineChart, Scatter
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, Users, Award, AlertTriangle, Activity, Zap, MapPin, Target, BarChart2, Home, Building2 } from 'lucide-react';
import { fetchQuery } from '../services/api';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { Insight } from '../components/InsightCard';
import { translateCountry } from '../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, calculateVolatility, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend, EXCLUDED_AREAS
} from '../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../utils/intelligenceCalculations';

type Tab = 'overview' | 'urbanization' | 'demographics' | 'turkey' | 'forecast' | 'alerts';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍' },
  { id: 'urbanization', label: 'Kentlesme', icon: '🏙️' },
  { id: 'demographics', label: 'Demografi', icon: '⚧️' },
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

export default function PopulationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Overview
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [topCountries, setTopCountries] = useState<any[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Urbanization
  const [urbanData, setUrbanData] = useState<any[]>([]);
  const [urbanTrend, setUrbanTrend] = useState<any[]>([]);
  const [urbanKPIs, setUrbanKPIs] = useState<any>(null);
  const [urbanInsights, setUrbanInsights] = useState<Insight[]>([]);

  // Demographics
  const [demoByCountry, setDemoByCountry] = useState<any[]>([]);
  const [demoTrend, setDemoTrend] = useState<any[]>([]);
  const [demoKPIs, setDemoKPIs] = useState<any>(null);
  const [demoInsights, setDemoInsights] = useState<Insight[]>([]);

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

  const excludeFilter = EXCLUDED_AREAS.map(a => `'${a}'`).join(',');

  // ==================== OVERVIEW ====================
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [countriesRes, trendRes, prevRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam, SUM(CAST(kirsal_v AS DECIMAL(20,2))) as kirsal, SUM(CAST(sehir_v AS DECIMAL(20,2))) as sehir, SUM(CAST(male_v AS DECIMAL(20,2))) as erkek, SUM(CAST(female_v AS DECIMAL(20,2))) as kadin FROM fao_nufus WHERE year='2023' AND area NOT IN (${excludeFilter}) GROUP BY area ORDER BY toplam DESC LIMIT 25`),
        fetchQuery(`SELECT year, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam, SUM(CAST(kirsal_v AS DECIMAL(20,2))) as kirsal, SUM(CAST(sehir_v AS DECIMAL(20,2))) as sehir FROM fao_nufus WHERE area NOT IN (${excludeFilter}) GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT SUM(CAST(total_v AS DECIMAL(20,2))) as total FROM fao_nufus WHERE year='2022' AND area NOT IN (${excludeFilter})`)
      ]);

      const countries = (countriesRes.data || []).map((r: any, i: number) => {
        const name = translateCountry(String(r.area || ''));
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkiye') || name.toLowerCase().includes('turkey');
        return { name, total: Number(r.toplam) || 0, rural: Number(r.kirsal) || 0, urban: Number(r.sehir) || 0, male: Number(r.erkek) || 0, female: Number(r.kadin) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setTopCountries(countries);

      const trend = (trendRes.data || []).map((r: any) => ({
        year: String(r.year), total: Number(r.toplam) || 0, rural: Number(r.kirsal) || 0, urban: Number(r.sehir) || 0
      }));
      setYearlyTrend(trend);

      const worldTotal = countries.reduce((s: number, c: any) => s + c.total, 0);
      const worldUrban = countries.reduce((s: number, c: any) => s + c.urban, 0);
      const worldRural = countries.reduce((s: number, c: any) => s + c.rural, 0);
      const prevTotal = Number(prevRes.data?.[0]?.total) || 0;
      const yoy = calculateYoY(worldTotal, prevTotal);
      const urbanRate = worldTotal > 0 ? (worldUrban / worldTotal * 100) : 0;
      const trendYV: YearValue[] = trend.map(t => ({ year: t.year, value: t.total }));
      const cagr = calculateCAGR(trendYV);

      setOverviewKPIs({ worldTotal, worldUrban, worldRural, urbanRate, yoy, cagr: cagr?.cagr || 0, topCountry: countries[0]?.name || '-', topCountryValue: countries[0]?.total || 0 });

      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dunya nufusu: ${formatPop(worldTotal)} (Top 25 ulke)`, severity: 'low', category: 'Genel' });
      ins.push({ id: 'ov2', type: urbanRate > 55 ? 'achievement' : 'info', message: `Kentlesme orani: %${urbanRate.toFixed(1)} — ${urbanRate > 55 ? 'Dunya cogunlugu sehirlerde' : 'Kirsal agirlikli'}`, severity: 'medium', category: 'Kentlesme' });
      if (cagr) ins.push({ id: 'ov3', type: 'growth', message: `Nufus artis CAGR: %${cagr.cagr.toFixed(2)}`, severity: 'medium', category: 'Buyume' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Overview hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== URBANIZATION ====================
  const loadUrbanization = useCallback(async () => {
    setLoading(true);
    try {
      const [byCountryRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam, SUM(CAST(kirsal_v AS DECIMAL(20,2))) as kirsal, SUM(CAST(sehir_v AS DECIMAL(20,2))) as sehir FROM fao_nufus WHERE year='2023' AND area NOT IN (${excludeFilter}) GROUP BY area HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(sehir_v AS DECIMAL(20,2))) as sehir, SUM(CAST(kirsal_v AS DECIMAL(20,2))) as kirsal, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE area NOT IN (${excludeFilter}) GROUP BY year ORDER BY year`)
      ]);

      const byCountry = (byCountryRes.data || []).map((r: any) => {
        const t = Number(r.toplam) || 0;
        const u = Number(r.sehir) || 0;
        const ru = Number(r.kirsal) || 0;
        return { name: translateCountry(String(r.area || '')), total: t, urban: u, rural: ru, urbanRate: t > 0 ? (u / t * 100) : 0 };
      });
      setUrbanData(byCountry);

      const trend = (trendRes.data || []).map((r: any) => {
        const t = Number(r.toplam) || 0;
        const u = Number(r.sehir) || 0;
        return { year: String(r.year), urban: u, rural: Number(r.kirsal) || 0, total: t, urbanRate: t > 0 ? (u / t * 100) : 0 };
      });
      setUrbanTrend(trend);

      const avgUrban = byCountry.length > 0 ? byCountry.reduce((s: number, c: any) => s + c.urbanRate, 0) / byCountry.length : 0;
      const mostUrban = [...byCountry].sort((a, b) => b.urbanRate - a.urbanRate)[0];
      const leastUrban = [...byCountry].sort((a, b) => a.urbanRate - b.urbanRate)[0];
      const trendStart = trend.find(t => t.urbanRate > 0);
      const trendEnd = trend[trend.length - 1];
      const urbanShift = trendStart && trendEnd ? trendEnd.urbanRate - trendStart.urbanRate : 0;

      setUrbanKPIs({ avgUrban, mostUrban: mostUrban?.name || '-', mostUrbanRate: mostUrban?.urbanRate || 0, leastUrban: leastUrban?.name || '-', leastUrbanRate: leastUrban?.urbanRate || 0, urbanShift });

      const ins: Insight[] = [];
      ins.push({ id: 'ur1', type: 'info', message: `Ortalama kentlesme orani: %${avgUrban.toFixed(1)}`, severity: 'medium', category: 'Kentlesme' });
      if (mostUrban) ins.push({ id: 'ur2', type: 'achievement', message: `En kentsel: ${mostUrban.name} %${mostUrban.urbanRate.toFixed(1)}`, severity: 'low', category: 'Kentsel' });
      if (urbanShift > 10) ins.push({ id: 'ur3', type: 'growth', message: `Kentlesme ${urbanShift.toFixed(1)} puan artti — hizli kentes donusumu`, severity: 'high', category: 'Trend' });
      setUrbanInsights(ins);
    } catch (e) { console.error('Urbanization hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== DEMOGRAPHICS ====================
  const loadDemographics = useCallback(async () => {
    setLoading(true);
    try {
      const [byCountryRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(male_v AS DECIMAL(20,2))) as erkek, SUM(CAST(female_v AS DECIMAL(20,2))) as kadin, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE year='2023' AND area NOT IN (${excludeFilter}) GROUP BY area HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(male_v AS DECIMAL(20,2))) as erkek, SUM(CAST(female_v AS DECIMAL(20,2))) as kadin, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE area NOT IN (${excludeFilter}) GROUP BY year ORDER BY year`)
      ]);

      const byCountry = (byCountryRes.data || []).map((r: any) => {
        const m = Number(r.erkek) || 0;
        const f = Number(r.kadin) || 0;
        const t = Number(r.toplam) || 0;
        return { name: translateCountry(String(r.area || '')), male: m, female: f, total: t, sexRatio: f > 0 ? (m / f * 100) : 0, femaleShare: t > 0 ? (f / t * 100) : 0 };
      });
      setDemoByCountry(byCountry);

      const trend = (trendRes.data || []).map((r: any) => {
        const m = Number(r.erkek) || 0;
        const f = Number(r.kadin) || 0;
        const t = Number(r.toplam) || 0;
        return { year: String(r.year), male: m, female: f, total: t, sexRatio: f > 0 ? (m / f * 100) : 0 };
      });
      setDemoTrend(trend);

      const totalM = byCountry.reduce((s: number, c: any) => s + c.male, 0);
      const totalF = byCountry.reduce((s: number, c: any) => s + c.female, 0);
      const worldSexRatio = totalF > 0 ? (totalM / totalF * 100) : 0;
      const highestRatio = [...byCountry].sort((a, b) => b.sexRatio - a.sexRatio)[0];
      const lowestRatio = [...byCountry].sort((a, b) => a.sexRatio - b.sexRatio)[0];

      setDemoKPIs({ totalM, totalF, worldSexRatio, highestRatio: highestRatio?.name || '-', highestRatioVal: highestRatio?.sexRatio || 0, lowestRatio: lowestRatio?.name || '-', lowestRatioVal: lowestRatio?.sexRatio || 0 });

      const ins: Insight[] = [];
      ins.push({ id: 'dm1', type: Math.abs(worldSexRatio - 100) < 5 ? 'achievement' : 'warning', message: `Dunya cinsiyet orani: ${worldSexRatio.toFixed(1)} erkek/100 kadin`, severity: 'medium', category: 'Cinsiyet' });
      if (highestRatio && highestRatio.sexRatio > 110) ins.push({ id: 'dm2', type: 'warning', message: `En yuksek erkek/kadin: ${highestRatio.name} (${highestRatio.sexRatio.toFixed(0)}/100)`, severity: 'high', category: 'Cinsiyet Dengesizligi' });
      setDemoInsights(ins);
    } catch (e) { console.error('Demographics hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== TURKEY ====================
  const loadTurkey = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, worldRankRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT area, CAST(total_v AS DECIMAL(20,2)) as toplam, CAST(kirsal_v AS DECIMAL(20,2)) as kirsal, CAST(sehir_v AS DECIMAL(20,2)) as sehir, CAST(male_v AS DECIMAL(20,2)) as erkek, CAST(female_v AS DECIMAL(20,2)) as kadin FROM fao_nufus WHERE year='2023' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')`),
        fetchQuery(`SELECT area, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE year='2023' AND area NOT IN (${excludeFilter}) GROUP BY area HAVING toplam > 0 ORDER BY toplam DESC`),
        fetchQuery(`SELECT year, CAST(total_v AS DECIMAL(20,2)) as toplam, CAST(kirsal_v AS DECIMAL(20,2)) as kirsal, CAST(sehir_v AS DECIMAL(20,2)) as sehir FROM fao_nufus WHERE (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%') AND CAST(year AS SIGNED) >= 1960 ORDER BY year`)
      ]);

      const now = turkeyNowRes.data?.[0];
      const totalNow = Number(now?.toplam) || 0;
      const ruralNow = Number(now?.kirsal) || 0;
      const urbanNow = Number(now?.sehir) || 0;
      const maleNow = Number(now?.erkek) || 0;
      const femaleNow = Number(now?.kadin) || 0;
      const urbanRate = totalNow > 0 ? (urbanNow / totalNow * 100) : 0;

      const allCountries = (worldRankRes.data || []).map((r: any) => String(r.area || ''));
      const turkeyIdx = allCountries.findIndex(n => n.includes('T\u00FCrkiye') || n.includes('Turkey'));

      const trend = (turkeyTrendRes.data || []).map((r: any) => {
        const t = Number(r.toplam) || 0;
        const u = Number(r.sehir) || 0;
        return { year: String(r.year), total: t, rural: Number(r.kirsal) || 0, urban: u, urbanRate: t > 0 ? (u / t * 100) : 0 };
      });
      setTurkeyTrend(trend);

      const trendYV: YearValue[] = trend.map(t => ({ year: t.year, value: t.total }));
      const cagr = calculateCAGR(trendYV);

      setTurkeyProfile({ totalNow, ruralNow, urbanNow, maleNow, femaleNow, urbanRate, rank: turkeyIdx >= 0 ? turkeyIdx + 1 : 'N/A', cagr: cagr?.cagr || 0 });

      const ins: Insight[] = [];
      ins.push({ id: 'tk1', type: 'info', message: `Turkiye nufusu: ${formatPop(totalNow)} (Dunya #${turkeyIdx >= 0 ? turkeyIdx + 1 : '?'})`, severity: 'medium', category: 'Konum' });
      ins.push({ id: 'tk2', type: urbanRate > 75 ? 'achievement' : 'info', message: `Kentlesme orani: %${urbanRate.toFixed(1)} ${urbanRate > 75 ? '— yuksek kentsel toplum' : ''}`, severity: 'medium', category: 'Kentlesme' });
      if (cagr) ins.push({ id: 'tk3', type: 'growth', message: `Nufus CAGR: %${cagr.cagr.toFixed(2)}`, severity: 'medium', category: 'Buyume' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Turkey hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== FORECAST ====================
  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT year, SUM(CAST(total_v AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE area NOT IN (${excludeFilter}) AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, CAST(total_v AS DECIMAL(20,2)) as toplam FROM fao_nufus WHERE (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%') AND CAST(year AS SIGNED) >= 1990 ORDER BY year`)
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
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : 'decline', message: `Turkiye nufus trendi: CAGR %${turkeyTrend.cagr.toFixed(2)}, volatilite %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: 'growth', message: `Dunya nufus trendi: CAGR %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dunya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, [excludeFilter]);

  // ==================== INTELLIGENCE ====================
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, turkeyBeforeRes, urbanTrendRes] = await Promise.all([
        fetchQuery(`SELECT area, CAST(total_v AS DECIMAL(20,2)) as toplam, CAST(kirsal_v AS DECIMAL(20,2)) as kirsal, CAST(sehir_v AS DECIMAL(20,2)) as sehir FROM fao_nufus WHERE year='2023' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')`),
        fetchQuery(`SELECT area, CAST(total_v AS DECIMAL(20,2)) as toplam, CAST(kirsal_v AS DECIMAL(20,2)) as kirsal FROM fao_nufus WHERE year='2000' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')`),
        fetchQuery(`SELECT year, CAST(sehir_v AS DECIMAL(20,2)) as sehir, CAST(total_v AS DECIMAL(20,2)) as toplam FROM fao_nufus WHERE (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%') AND year IN ('1960','1980','2000','2023') ORDER BY year`)
      ]);

      const alerts: IntelligenceAlert[] = [];

      const now = turkeyNowRes.data?.[0];
      const before = turkeyBeforeRes.data?.[0];
      const totalNow = Number(now?.toplam) || 0;
      const urbanNow = Number(now?.sehir) || 0;
      const ruralNow = Number(now?.kirsal) || 0;
      const totalBefore = Number(before?.toplam) || 0;
      const ruralBefore = Number(before?.kirsal) || 0;
      const urbanRate = totalNow > 0 ? (urbanNow / totalNow * 100) : 0;

      // Population growth
      if (totalBefore > 0) {
        const growth = ((totalNow - totalBefore) / totalBefore) * 100;
        alerts.push({ id: 'pop-growth', severity: growth > 30 ? 'warning' : 'info', title: `Turkiye Nufus Artisi`, message: `2000-2023 doneminde %${growth.toFixed(1)} artis (${formatPop(totalNow)})`, metric: 'Nufus Buyumesi', value: growth });
      }

      // Urbanization alert
      alerts.push({ id: 'urban-rate', severity: urbanRate > 80 ? 'warning' : 'positive', title: 'Kentlesme Seviyesi', message: `Turkiye kentlesme: %${urbanRate.toFixed(1)} — ${urbanRate > 80 ? 'asiri kentsel yogunluk riski' : 'dengeli'}`, metric: 'Kentlesme', value: urbanRate });

      // Rural decline
      if (ruralBefore > 0) {
        const ruralChange = ((ruralNow - ruralBefore) / ruralBefore) * 100;
        if (ruralChange < -20) {
          alerts.push({ id: 'rural-decline', severity: 'critical', title: 'Kirsal Nufus Erimesi', message: `Kirsal nufus 2000'den bu yana %${Math.abs(ruralChange).toFixed(0)} azaldi — tarim iscisi kriteri`, metric: 'Kirsal Goc', value: ruralChange });
        }
      }

      // Urbanization speed (historical)
      const urbanHistory = (urbanTrendRes.data || []).map((r: any) => ({ year: String(r.year), rate: Number(r.toplam) > 0 ? (Number(r.sehir) / Number(r.toplam) * 100) : 0 }));
      if (urbanHistory.length >= 2) {
        const first = urbanHistory[0];
        const last = urbanHistory[urbanHistory.length - 1];
        const shift = last.rate - first.rate;
        alerts.push({ id: 'urban-shift', severity: shift > 40 ? 'warning' : 'info', title: 'Tarihsel Kentlesme Donusumu', message: `${first.year}-${last.year} arasi kentlesme %${first.rate.toFixed(0)} → %${last.rate.toFixed(0)} (+${shift.toFixed(0)} puan)`, metric: 'Kentsel Donusum', value: shift });
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
      case 'urbanization': loadUrbanization(); break;
      case 'demographics': loadDemographics(); break;
      case 'turkey': loadTurkey(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadUrbanization, loadDemographics, loadTurkey, loadForecast, loadAlerts]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dunya Nufus Intelligence Dashboard</h1>
        <p className="page-subtitle">FAO nufus & kentlesme analizi - akilli karar destek motoru</p>
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
                <KPICard title="DUNYA NUFUSU" value={formatPop(overviewKPIs.worldTotal)} subtitle={`YoY: +${overviewKPIs.yoy.toFixed(1)}% | CAGR: %${overviewKPIs.cagr.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="EN KALABALIK" value={overviewKPIs.topCountry} subtitle={formatPop(overviewKPIs.topCountryValue)} icon={Award} color="blue" />
                <KPICard title="KENTLESME" value={formatPercent(overviewKPIs.urbanRate)} subtitle="Sehirde yasayan" icon={Building2} color="teal" />
                <KPICard title="KIRSAL" value={formatPop(overviewKPIs.worldRural)} subtitle={`Kentsel: ${formatPop(overviewKPIs.worldUrban)}`} icon={Home} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Top 25 Ulke Nufusu</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={topCountries} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={100} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="urban" name="Kentsel" stackId="a" fill="#8b5cf6" />
                      <Bar dataKey="rural" name="Kirsal" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Nufus Buyume Trendi</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <AreaChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="total" name="Toplam" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="urban" name="Kentsel" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="rural" name="Kirsal" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* URBANIZATION */}
          {activeTab === 'urbanization' && urbanKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="ORT KENTLESME" value={formatPercent(urbanKPIs.avgUrban)} subtitle="Top 20 ulke" icon={Building2} color="purple" large />
                <KPICard title="EN KENTSEL" value={urbanKPIs.mostUrban} subtitle={formatPercent(urbanKPIs.mostUrbanRate)} icon={TrendingUp} color="blue" />
                <KPICard title="EN KIRSAL" value={urbanKPIs.leastUrban} subtitle={formatPercent(urbanKPIs.leastUrbanRate)} icon={Home} color="green" />
                <KPICard title="KENTLESME ARTISI" value={`+${urbanKPIs.urbanShift.toFixed(1)}pp`} subtitle="Tarihsel trend" icon={Activity} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Ulke Bazli Kentsel vs Kirsal</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={urbanData.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="urban" name="Kentsel" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rural" name="Kirsal" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Kentlesme Orani Trendi (%)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={urbanTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="urban" name="Kentsel" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="rural" name="Kirsal" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="urbanRate" name="Kentlesme Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={urbanInsights} />
            </>
          )}

          {/* DEMOGRAPHICS */}
          {activeTab === 'demographics' && demoKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="CINSIYET ORANI" value={`${demoKPIs.worldSexRatio.toFixed(1)}`} subtitle="Erkek/100 kadin" icon={Users} color="purple" large />
                <KPICard title="EN YUKSEK E/K" value={demoKPIs.highestRatio} subtitle={`${demoKPIs.highestRatioVal.toFixed(0)}/100`} icon={TrendingUp} color="red" />
                <KPICard title="EN DUSUK E/K" value={demoKPIs.lowestRatio} subtitle={`${demoKPIs.lowestRatioVal.toFixed(0)}/100`} icon={TrendingDown} color="green" />
                <KPICard title="TOPLAM" value={formatPop(demoKPIs.totalM + demoKPIs.totalF)} subtitle={`E: ${formatPop(demoKPIs.totalM)} | K: ${formatPop(demoKPIs.totalF)}`} icon={BarChart2} color="blue" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Ulke Bazli Erkek-Kadin Nufusu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={demoByCountry.slice(0, 15)}>
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
                  <h3 className="chart-title">Cinsiyet Orani Trendi (Erkek/100 Kadin)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={demoTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[90, 110]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="female" name="Kadin" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="sexRatio" name="Cinsiyet Orani" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={demoInsights} />
            </>
          )}

          {/* TURKEY */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE NUFUSU" value={formatPop(turkeyProfile.totalNow)} subtitle={`Dunya #${turkeyProfile.rank} | CAGR: %${turkeyProfile.cagr.toFixed(2)}`} icon={MapPin} color="orange" large />
                <KPICard title="KENTSEL" value={formatPop(turkeyProfile.urbanNow)} subtitle={formatPercent(turkeyProfile.urbanRate)} icon={Building2} color="purple" />
                <KPICard title="KIRSAL" value={formatPop(turkeyProfile.ruralNow)} subtitle={formatPercent(100 - turkeyProfile.urbanRate)} icon={Home} color="green" />
                <KPICard title="DUNYA SIRASI" value={`#${turkeyProfile.rank}`} subtitle="Nufus" icon={Award} color="blue" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Nufus & Kentlesme Trendi (1960+)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={turkeyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => [name.includes('Oran') ? `%${Number(v).toFixed(1)}` : formatPop(v), name]} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="total" name="Toplam" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="urban" name="Kentsel" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="rural" name="Kirsal" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="urbanRate" name="Kentlesme Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
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
                  <h3 className="chart-title">Turkiye Nufus - Tahmin Projeksiyonu</h3>
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
                <KPICard title="KRITIK" value={String(intelligenceAlerts.filter(a => a.severity === 'critical').length)} subtitle="Acil" icon={AlertTriangle} color="red" />
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
