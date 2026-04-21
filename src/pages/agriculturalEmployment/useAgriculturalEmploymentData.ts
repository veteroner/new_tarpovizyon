/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { fetchQuery } from '../../services/api';
import type { Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend, EXCLUDED_AREAS
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';

export type Tab = 'overview' | 'gender' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍' },
  { id: 'gender', label: 'Cinsiyet Analizi', icon: '⚧️' },
  { id: 'concentration', label: 'Yogunlasma', icon: '📊' },
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

export function useAgriculturalEmploymentData(activeTab: Tab) {
  const [loading, setLoading] = useState(true);

  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [topCountries, setTopCountries] = useState<any[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  const [genderByCountry, setGenderByCountry] = useState<any[]>([]);
  const [genderTrend, setGenderTrend] = useState<any[]>([]);
  const [genderKPIs, setGenderKPIs] = useState<any>(null);
  const [genderInsights, setGenderInsights] = useState<Insight[]>([]);

  const [concentrationData, setConcentrationData] = useState<any>(null);
  const [concentrationInsights, setConcentrationInsights] = useState<Insight[]>([]);

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
        fetchQuery(`SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam, SUM(CAST(e.male AS DECIMAL(20,2))) as erkek, SUM(CAST(e.female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND e.area NOT IN ${EXCLUDED_AREAS} GROUP BY e.area ORDER BY toplam DESC LIMIT 25`),
        fetchQuery(`SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam, SUM(CAST(male AS DECIMAL(20,2))) as erkek, SUM(CAST(female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim GROUP BY yearcode ORDER BY yearcode`),
        fetchQuery(`SELECT SUM(CAST(total AS DECIMAL(20,2))) as total FROM fao_nufus_istihdam_tarim WHERE yearcode='2022' AND indicatorcode='21066'`)
      ]);
      const countries = (countriesRes.data || []).map((r: any, i: number) => {
        const name = translateCountry(String(r.area || ''));
        const isTurkey = name.includes('Türkiye') || name.includes('Turkiye') || name.toLowerCase().includes('turkey');
        return { name, total: Number(r.toplam) || 0, male: Number(r.erkek) || 0, female: Number(r.kadin) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setTopCountries(countries);
      const trend = (trendRes.data || []).map((r: any) => ({ year: String(r.year), total: Number(r.toplam) || 0, male: Number(r.erkek) || 0, female: Number(r.kadin) || 0 }));
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
  }, []);

  const loadGender = useCallback(async () => {
    setLoading(true);
    try {
      const [byCountryRes, trendRes] = await Promise.all([
        fetchQuery(`SELECT e.area, SUM(CAST(e.male AS DECIMAL(20,2))) as erkek, SUM(CAST(e.female AS DECIMAL(20,2))) as kadin, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND e.area NOT IN ${EXCLUDED_AREAS} GROUP BY e.area HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`),
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
      const recentTrend = trend.length >= 2 ? trend[trend.length - 1].femaleRatio - (trend[trend.length - 10]?.femaleRatio || 0) : 0;
      setGenderKPIs({ totalM, totalF, avgFemaleRatio, highestFemale: highestFemale?.name || '-', lowestFemale: lowestFemale?.name || '-', recentTrend });
      const ins: Insight[] = [];
      ins.push({ id: 'gn1', type: 'info', message: `Ortalama kadin tarim istihdam orani: %${avgFemaleRatio.toFixed(1)}`, severity: 'medium', category: 'Cinsiyet' });
      if (highestFemale) ins.push({ id: 'gn2', type: 'achievement', message: `En yuksek kadin payi: ${highestFemale.name} (%${highestFemale.femaleRatio.toFixed(1)})`, severity: 'low', category: 'Esitlik' });
      if (recentTrend > 0) ins.push({ id: 'gn3', type: 'growth', message: `Kadin payi son 10 yilda +${recentTrend.toFixed(1)} puan artti`, severity: 'medium', category: 'Trend' });
      else if (recentTrend < 0) ins.push({ id: 'gn3', type: 'decline', message: `Kadin payi son 10 yilda ${recentTrend.toFixed(1)} puan dustu`, severity: 'high', category: 'Trend' });
      setGenderInsights(ins);
    } catch (e) { console.error('Gender hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadConcentration = useCallback(async () => {
    setLoading(true);
    try {
      const [shareRes, historicRes] = await Promise.all([
        fetchQuery(`SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND e.area NOT IN ${EXCLUDED_AREAS} GROUP BY e.area HAVING toplam > 0 ORDER BY toplam DESC`),
        fetchQuery(`SELECT e.yearcode as year, e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.indicatorcode='21066' AND e.area NOT IN ${EXCLUDED_AREAS} AND e.yearcode IN ('2000','2005','2010','2015','2023') GROUP BY e.yearcode, e.area HAVING toplam > 0`)
      ]);
      const countries = (shareRes.data || []).map((r: any) => ({ name: translateCountry(String(r.area || '')), value: Number(r.toplam) || 0 }));
      const worldTotal = countries.reduce((s: number, c: any) => s + c.value, 0);
      const shares = countries.map((c: any) => c.value / worldTotal);
      const hhiResult = calculateHHI(shares);
      const hhi = typeof hhiResult === 'number' ? hhiResult : (hhiResult as any).value ?? (hhiResult as any).hhi ?? 0;
      const top5Share = countries.slice(0, 5).reduce((s: number, c: any) => s + c.value, 0) / worldTotal * 100;
      const top10Share = countries.slice(0, 10).reduce((s: number, c: any) => s + c.value, 0) / worldTotal * 100;
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
  }, []);

  const loadTurkey = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, worldRankRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')`),
        fetchQuery(`SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND e.area NOT IN ${EXCLUDED_AREAS} GROUP BY e.area HAVING toplam > 0 ORDER BY toplam DESC`),
        fetchQuery(`SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%') AND CAST(e.yearcode AS SIGNED) >= 1990 ORDER BY e.yearcode`)
      ]);
      const now = turkeyNowRes.data?.[0];
      const totalNow = Number(now?.toplam) || 0;
      const maleNow = Number(now?.erkek) || 0;
      const femaleNow = Number(now?.kadin) || 0;
      const femaleRatio = totalNow > 0 ? (femaleNow / totalNow * 100) : 0;
      const allCountries = (worldRankRes.data || []).map((r: any) => String(r.area || ''));
      const turkeyIdx = allCountries.findIndex(n => n.includes('Türkiye') || n.includes('Turkey'));
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
  }, []);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066' AND CAST(yearcode AS SIGNED) >= 1990 GROUP BY yearcode ORDER BY yearcode`),
        fetchQuery(`SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam FROM fao_nufus_istihdam_tarim e WHERE (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%') AND CAST(e.yearcode AS SIGNED) >= 1990 ORDER BY e.yearcode`)
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
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Turkiye istihdam trendi: CAGR %${turkeyTrend.cagr.toFixed(2)}, volatilite %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: worldTrend.direction === 'up' ? 'growth' : 'decline', message: `Dunya istihdam trendi: CAGR %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dunya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, turkeyBeforeRes, worldGenderRes, worldTotalRes] = await Promise.all([
        fetchQuery(`SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')`),
        fetchQuery(`SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2010' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')`),
        fetchQuery(`SELECT SUM(CAST(male AS DECIMAL(20,2))) as erkek, SUM(CAST(female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim WHERE yearcode='2023' AND indicatorcode='21066'`),
        fetchQuery(`SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066' AND yearcode IN ('2023','2010') GROUP BY yearcode`)
      ]);
      const alerts: IntelligenceAlert[] = [];
      const now = turkeyNowRes.data?.[0];
      const before = turkeyBeforeRes.data?.[0];
      const totalNow = Number(now?.toplam) || 0;
      const femaleNow = Number(now?.kadin) || 0;
      const totalBefore = Number(before?.toplam) || 0;
      if (totalBefore > 0) {
        const change = ((totalNow - totalBefore) / totalBefore) * 100;
        alerts.push({ id: 'emp-change', severity: Math.abs(change) > 15 ? (change < 0 ? 'critical' : 'positive') : 'info', title: `Turkiye Istihdam ${change > 0 ? 'Artisi' : 'Dususu'}`, message: `2010-2022 doneminde %${change.toFixed(1)} degisim (${formatPop(totalNow)})`, metric: 'Istihdam Degisimi', value: change });
      }
      const femaleRatio = totalNow > 0 ? (femaleNow / totalNow * 100) : 0;
      const worldM = Number(worldGenderRes.data?.[0]?.erkek) || 0;
      const worldF = Number(worldGenderRes.data?.[0]?.kadin) || 0;
      const worldFemaleRatio = (worldM + worldF) > 0 ? (worldF / (worldM + worldF) * 100) : 0;
      alerts.push({ id: 'gender-gap', severity: femaleRatio < worldFemaleRatio * 0.8 ? 'warning' : 'positive', title: 'Cinsiyet Esitligi', message: `Turkiye kadin payi: %${femaleRatio.toFixed(1)} vs Dunya: %${worldFemaleRatio.toFixed(1)}`, metric: 'Kadin Orani', value: femaleRatio });
      const worldData = (worldTotalRes.data || []);
      const world2022 = Number(worldData.find((r: any) => r.year === '2022')?.toplam) || 0;
      const world2010 = Number(worldData.find((r: any) => r.year === '2010')?.toplam) || 0;
      if (world2010 > 0) {
        const globalChange = ((world2022 - world2010) / world2010) * 100;
        alerts.push({ id: 'global-emp', severity: globalChange < -5 ? 'warning' : 'info', title: 'Dunya Tarim Istihdami', message: `2010-2022 doneminde %${globalChange.toFixed(1)} degisim`, metric: 'Global Trend', value: globalChange });
      }
      if (totalBefore > 0 && totalNow < totalBefore * 0.7) {
        alerts.push({ id: 'structural', severity: 'critical', title: 'Yapisal Donusum', message: 'Turkiye tarim istihdaminda hizli cozulme — sanayilesme sinyali', metric: 'Yapisal', value: ((totalNow - totalBefore) / totalBefore) * 100 });
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
      case 'gender': loadGender(); break;
      case 'concentration': loadConcentration(); break;
      case 'turkey': loadTurkey(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadGender, loadConcentration, loadTurkey, loadForecast, loadAlerts]);

  return {
    loading,
    overviewKPIs, topCountries, yearlyTrend, overviewInsights,
    genderByCountry, genderTrend, genderKPIs, genderInsights,
    concentrationData, concentrationInsights,
    turkeyProfile, turkeyTrend, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
