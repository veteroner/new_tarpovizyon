/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { fetchQuery } from '../../services/api';
import type { Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend, EXCLUDED_AREAS
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';

export type Tab = 'overview' | 'urbanization' | 'demographics' | 'turkey' | 'forecast' | 'alerts';

export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍' },
  { id: 'urbanization', label: 'Kentlesme', icon: '🏙️' },
  { id: 'demographics', label: 'Demografi', icon: '⚧️' },
  { id: 'turkey', label: 'Turkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'İçgörüler', icon: '🧠' },
];

export const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

export function formatPop(value: number): string {
  const actual = value * 1000;
  if (actual >= 1e9) return (actual / 1e9).toFixed(2) + ' Milyar';
  if (actual >= 1e6) return (actual / 1e6).toFixed(2) + ' Milyon';
  if (actual >= 1e3) return (actual / 1e3).toFixed(0) + ' Bin';
  return actual.toFixed(0);
}

export function formatShort(value: number): string {
  const actual = value * 1000;
  if (actual >= 1e9) return (actual / 1e9).toFixed(1) + 'B';
  if (actual >= 1e6) return (actual / 1e6).toFixed(1) + 'M';
  if (actual >= 1e3) return (actual / 1e3).toFixed(0) + 'K';
  return actual.toFixed(0);
}

export function formatPercent(v: number): string { return `%${v.toFixed(1)}`; }

export function usePopulationData(activeTab: Tab) {
  const [loading, setLoading] = useState(true);

  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [topCountries, setTopCountries] = useState<any[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  const [urbanData, setUrbanData] = useState<any[]>([]);
  const [urbanTrend, setUrbanTrend] = useState<any[]>([]);
  const [urbanKPIs, setUrbanKPIs] = useState<any>(null);
  const [urbanInsights, setUrbanInsights] = useState<Insight[]>([]);

  const [demoByCountry, setDemoByCountry] = useState<any[]>([]);
  const [demoTrend, setDemoTrend] = useState<any[]>([]);
  const [demoKPIs, setDemoKPIs] = useState<any>(null);
  const [demoInsights, setDemoInsights] = useState<Insight[]>([]);

  const [turkeyProfile, setTurkeyProfile] = useState<any>(null);
  const [turkeyTrend, setTurkeyTrend] = useState<any[]>([]);
  const [turkeyInsights, setTurkeyInsights] = useState<Insight[]>([]);

  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<Insight[]>([]);

  const [intelligenceAlerts, setIntelligenceAlerts] = useState<IntelligenceAlert[]>([]);
  const [allInsights, setAllInsights] = useState<Insight[]>([]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [countriesRes, trendRes, prevRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam, SUM(CAST(kirsal AS DECIMAL(20,2))) as kirsal, SUM(CAST(sehir AS DECIMAL(20,2))) as sehir, SUM(CAST(\`erkek/T\` AS DECIMAL(20,2))) as erkek, SUM(CAST(\`kadın/T\` AS DECIMAL(20,2))) as kadin FROM fao_nufus WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY toplam DESC LIMIT 25`),
        fetchQuery(`SELECT year, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam, SUM(CAST(kirsal AS DECIMAL(20,2))) as kirsal, SUM(CAST(sehir AS DECIMAL(20,2))) as sehir FROM fao_nufus WHERE area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT SUM(CAST(TOPLAM AS DECIMAL(20,2))) as total FROM fao_nufus WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS}`)
      ]);
      const countries = (countriesRes.data || []).map((r: any, i: number) => {
        const name = translateCountry(String(r.area || ''));
        const isTurkey = name.includes('Türkiye') || name.includes('Turkiye') || name.toLowerCase().includes('turkey');
        return { name, total: Number(r.toplam) || 0, rural: Number(r.kirsal) || 0, urban: Number(r.sehir) || 0, male: Number(r.erkek) || 0, female: Number(r.kadin) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setTopCountries(countries);
      const trend = (trendRes.data || []).map((r: any) => ({ year: String(r.year), total: Number(r.toplam) || 0, rural: Number(r.kirsal) || 0, urban: Number(r.sehir) || 0 }));
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
  }, []);

  const loadUrbanization = useCallback(async () => {
    setLoading(true);
    try {
      const [byCountryRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam, SUM(CAST(kirsal AS DECIMAL(20,2))) as kirsal, SUM(CAST(sehir AS DECIMAL(20,2))) as sehir FROM fao_nufus WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(sehir AS DECIMAL(20,2))) as sehir, SUM(CAST(kirsal AS DECIMAL(20,2))) as kirsal, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`)
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
  }, []);

  const loadDemographics = useCallback(async () => {
    setLoading(true);
    try {
      const [byCountryRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(\`erkek/T\` AS DECIMAL(20,2))) as erkek, SUM(CAST(\`kadın/T\` AS DECIMAL(20,2))) as kadin, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`),
        fetchQuery(`SELECT year, SUM(CAST(\`erkek/T\` AS DECIMAL(20,2))) as erkek, SUM(CAST(\`kadın/T\` AS DECIMAL(20,2))) as kadin, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`)
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
  }, []);

  const loadTurkey = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, worldRankRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT area, CAST(TOPLAM AS DECIMAL(20,2)) as toplam, CAST(kirsal AS DECIMAL(20,2)) as kirsal, CAST(sehir AS DECIMAL(20,2)) as sehir, CAST(\`erkek/T\` AS DECIMAL(20,2)) as erkek, CAST(\`kadın/T\` AS DECIMAL(20,2)) as kadin FROM fao_nufus WHERE year='2023' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')`),
        fetchQuery(`SELECT area, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area HAVING toplam > 0 ORDER BY toplam DESC`),
        fetchQuery(`SELECT year, CAST(TOPLAM AS DECIMAL(20,2)) as toplam, CAST(kirsal AS DECIMAL(20,2)) as kirsal, CAST(sehir AS DECIMAL(20,2)) as sehir FROM fao_nufus WHERE (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%') AND CAST(year AS SIGNED) >= 1960 ORDER BY year`)
      ]);
      const now = turkeyNowRes.data?.[0];
      const totalNow = Number(now?.toplam) || 0;
      const ruralNow = Number(now?.kirsal) || 0;
      const urbanNow = Number(now?.sehir) || 0;
      const maleNow = Number(now?.erkek) || 0;
      const femaleNow = Number(now?.kadin) || 0;
      const urbanRate = totalNow > 0 ? (urbanNow / totalNow * 100) : 0;
      const allCountries = (worldRankRes.data || []).map((r: any) => String(r.area || ''));
      const turkeyIdx = allCountries.findIndex(n => n.includes('Türkiye') || n.includes('Turkey'));
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
  }, []);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT year, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE area NOT IN ${EXCLUDED_AREAS} AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, CAST(TOPLAM AS DECIMAL(20,2)) as toplam FROM fao_nufus WHERE (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%') AND CAST(year AS SIGNED) >= 1990 ORDER BY year`)
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
      setForecastData({ chartData, worldTrend, turkeyTrend, turkeyR2: turkeyForecast.r2, worldR2: worldForecast.r2, anomalyCount: anomalies.filter(a => a.isAnomaly).length });
      const ins: Insight[] = [];
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : 'decline', message: `Turkiye nufus trendi: CAGR %${turkeyTrend.cagr.toFixed(2)}, volatilite %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: 'growth', message: `Dunya nufus trendi: CAGR %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dunya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, turkeyBeforeRes, urbanTrendRes] = await Promise.all([
        fetchQuery(`SELECT area, CAST(TOPLAM AS DECIMAL(20,2)) as toplam, CAST(kirsal AS DECIMAL(20,2)) as kirsal, CAST(sehir AS DECIMAL(20,2)) as sehir FROM fao_nufus WHERE year='2023' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')`),
        fetchQuery(`SELECT area, CAST(TOPLAM AS DECIMAL(20,2)) as toplam, CAST(kirsal AS DECIMAL(20,2)) as kirsal FROM fao_nufus WHERE year='2000' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')`),
        fetchQuery(`SELECT year, CAST(sehir AS DECIMAL(20,2)) as sehir, CAST(TOPLAM AS DECIMAL(20,2)) as toplam FROM fao_nufus WHERE (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%') AND year IN ('1960','1980','2000','2023') ORDER BY year`)
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
      if (totalBefore > 0) {
        const growth = ((totalNow - totalBefore) / totalBefore) * 100;
        alerts.push({ id: 'pop-growth', severity: growth > 30 ? 'warning' : 'info', title: 'Turkiye Nufus Artisi', message: `2000-2023 doneminde %${growth.toFixed(1)} artis (${formatPop(totalNow)})`, metric: 'Nufus Buyumesi', value: growth });
      }
      alerts.push({ id: 'urban-rate', severity: urbanRate > 80 ? 'warning' : 'positive', title: 'Kentlesme Seviyesi', message: `Turkiye kentlesme: %${urbanRate.toFixed(1)} — ${urbanRate > 80 ? 'asiri kentsel yogunluk riski' : 'dengeli'}`, metric: 'Kentlesme', value: urbanRate });
      if (ruralBefore > 0) {
        const ruralChange = ((ruralNow - ruralBefore) / ruralBefore) * 100;
        if (ruralChange < -20) {
          alerts.push({ id: 'rural-decline', severity: 'critical', title: 'Kirsal Nufus Erimesi', message: `Kirsal nufus 2000'den bu yana %${Math.abs(ruralChange).toFixed(0)} azaldi — tarim iscisi kriteri`, metric: 'Kirsal Goc', value: ruralChange });
        }
      }
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
        category: a.metric || 'İçgörü'
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

  return {
    loading,
    overviewKPIs, topCountries, yearlyTrend, overviewInsights,
    urbanData, urbanTrend, urbanKPIs, urbanInsights,
    demoByCountry, demoTrend, demoKPIs, demoInsights,
    turkeyProfile, turkeyTrend, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
