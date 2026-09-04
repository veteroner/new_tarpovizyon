import { kisa, eksen } from '../../utils/sayi';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { fetchAgg, latestYear, num } from '../../services/d1';
import type { Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend,
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';

// D1 toplama rotası. Kıta/toplam satırları sunucudaki 'v1' listesiyle dışlanıyor.
const R = 'fao/nufus';
const EX = { preset: 'v1' as const, col: 'area' };
// area alanında Türkiye TEK bir değerle geçiyor; eski LIKE '%T_rkiye%' zinciri
// artık tam eşleşme.
const TR = 'Türkiye';
const NUM = ['TOPLAM', 'kirsal', 'sehir'];
const CINSIYET = ['erkek/T', 'kadın/T'];

// Yıl kodda '2023' diye sabitti; veri ilerledikçe bayatlıyordu.
let sonYilCache: Promise<number> | null = null;
const sonYil = () => (sonYilCache ??= latestYear(R, 'year').then((y) => y ?? 2023));

export type Tab = 'overview' | 'urbanization' | 'demographics' | 'turkey' | 'forecast' | 'alerts';

export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '' },
  { id: 'urbanization', label: 'Kentlesme', icon: '' },
  { id: 'demographics', label: 'Demografi', icon: '' },
  { id: 'turkey', label: 'Turkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '' },
  { id: 'alerts', label: 'İçgörüler', icon: '' },
];

export const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

export function formatPop(value: number): string {
  return kisa(value);
}

export function formatShort(value: number): string {
  return eksen(value);
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
      const yil = await sonYil();
      const [countriesRes, trendRes, dunyaRes, prevRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['area'], sum: [...NUM, ...CINSIYET], where: { year: yil }, exclude: EX, orderBy: 'sum_TOPLAM', dir: 'desc', limit: 25 }),
        fetchAgg(R, { groupBy: ['year'], sum: NUM, exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { sum: NUM, where: { year: yil }, exclude: EX }),
        fetchAgg(R, { sum: ['TOPLAM'], where: { year: yil - 1 }, exclude: EX }),
      ]);
      const countries = countriesRes.map((r, i: number) => {
        const ham = String(r.area || '');
        const isTurkey = ham === TR;
        return { name: translateCountry(ham), total: num(r.sum_TOPLAM), rural: num(r.sum_kirsal), urban: num(r.sum_sehir), male: num(r['sum_erkek/T']), female: num(r['sum_kadın/T']), isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setTopCountries(countries);
      const trend = trendRes.map((r) => ({ year: String(r.year), total: num(r.sum_TOPLAM), rural: num(r.sum_kirsal), urban: num(r.sum_sehir) }));
      setYearlyTrend(trend);
      // Eskiden "DÜNYA NÜFUSU" yalnızca ilk 25 ülkenin toplamıydı (5,97 Mr) ve
      // yıllık değişim bunu TÜM dünyanın önceki yıl toplamıyla kıyaslıyordu —
      // her zaman devasa eksi bir oran çıkıyordu. Artık iki taraf da tüm dünya.
      const worldTotal = num(dunyaRes[0]?.sum_TOPLAM);
      const worldUrban = num(dunyaRes[0]?.sum_sehir);
      const worldRural = num(dunyaRes[0]?.sum_kirsal);
      const prevTotal = num(prevRes[0]?.sum_TOPLAM);
      const yoy = calculateYoY(worldTotal, prevTotal);
      const urbanRate = worldTotal > 0 ? (worldUrban / worldTotal * 100) : 0;
      const trendYV: YearValue[] = trend.map((t) => ({ year: t.year, value: t.total }));
      const cagr = calculateCAGR(trendYV);
      setOverviewKPIs({ worldTotal, worldUrban, worldRural, urbanRate, yoy, cagr: cagr?.cagr || 0, topCountry: countries[0]?.name || '-', topCountryValue: countries[0]?.total || 0 });
      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dunya nufusu: ${formatPop(worldTotal)} (${yil})`, severity: 'low', category: 'Genel' });
      ins.push({ id: 'ov2', type: urbanRate > 55 ? 'achievement' : 'info', message: `Kentlesme orani: %${urbanRate.toFixed(1)} — ${urbanRate > 55 ? 'Dunya cogunlugu sehirlerde' : 'Kirsal agirlikli'}`, severity: 'medium', category: 'Kentlesme' });
      if (cagr) ins.push({ id: 'ov3', type: 'growth', message: `Nufus artis CAGR: %${cagr.cagr.toFixed(2)}`, severity: 'medium', category: 'Buyume' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Overview hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadUrbanization = useCallback(async () => {
    setLoading(true);
    try {
      const yil = await sonYil();
      const [byCountryRes, trendRes] = await Promise.all([
        // HAVING toplam > 0 karşılığı: sonuç dizisi istemcide süzülüyor.
        fetchAgg(R, { groupBy: ['area'], sum: NUM, where: { year: yil }, exclude: EX, orderBy: 'sum_TOPLAM', dir: 'desc', limit: 20 }),
        fetchAgg(R, { groupBy: ['year'], sum: NUM, exclude: EX, orderBy: 'year', dir: 'asc' }),
      ]);
      const byCountry = byCountryRes.filter((r) => num(r.sum_TOPLAM) > 0).map((r) => {
        const t = num(r.sum_TOPLAM);
        const u = num(r.sum_sehir);
        return { name: translateCountry(String(r.area || '')), total: t, urban: u, rural: num(r.sum_kirsal), urbanRate: t > 0 ? (u / t * 100) : 0 };
      });
      setUrbanData(byCountry);
      const trend = trendRes.map((r) => {
        const t = num(r.sum_TOPLAM);
        const u = num(r.sum_sehir);
        return { year: String(r.year), urban: u, rural: num(r.sum_kirsal), total: t, urbanRate: t > 0 ? (u / t * 100) : 0 };
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
      const yil = await sonYil();
      const [byCountryRes, trendRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['area'], sum: [...CINSIYET, 'TOPLAM'], where: { year: yil }, exclude: EX, orderBy: 'sum_TOPLAM', dir: 'desc', limit: 20 }),
        fetchAgg(R, { groupBy: ['year'], sum: [...CINSIYET, 'TOPLAM'], exclude: EX, orderBy: 'year', dir: 'asc' }),
      ]);
      const byCountry = byCountryRes.filter((r) => num(r.sum_TOPLAM) > 0).map((r) => {
        const m = num(r['sum_erkek/T']);
        const f = num(r['sum_kadın/T']);
        const t = num(r.sum_TOPLAM);
        return { name: translateCountry(String(r.area || '')), male: m, female: f, total: t, sexRatio: f > 0 ? (m / f * 100) : 0, femaleShare: t > 0 ? (f / t * 100) : 0 };
      });
      setDemoByCountry(byCountry);
      const trend = trendRes.map((r) => {
        const m = num(r['sum_erkek/T']);
        const f = num(r['sum_kadın/T']);
        const t = num(r.sum_TOPLAM);
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
      const yil = await sonYil();
      const [turkeyNowRes, worldRankRes, turkeyTrendRes] = await Promise.all([
        fetchAgg(R, { sum: [...NUM, ...CINSIYET], where: { year: yil, area: TR } }),
        fetchAgg(R, { groupBy: ['area'], sum: ['TOPLAM'], where: { year: yil }, exclude: EX, orderBy: 'sum_TOPLAM', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['year'], sum: NUM, where: { area: TR }, whereGte: { year: 1960 }, orderBy: 'year', dir: 'asc' }),
      ]);
      const now = turkeyNowRes[0];
      const totalNow = num(now?.sum_TOPLAM);
      const ruralNow = num(now?.sum_kirsal);
      const urbanNow = num(now?.sum_sehir);
      const maleNow = num(now?.['sum_erkek/T']);
      const femaleNow = num(now?.['sum_kadın/T']);
      const urbanRate = totalNow > 0 ? (urbanNow / totalNow * 100) : 0;
      const allCountries = worldRankRes.filter((r) => num(r.sum_TOPLAM) > 0).map((r) => String(r.area || ''));
      const turkeyIdx = allCountries.indexOf(TR);
      const trend = turkeyTrendRes.map((r) => {
        const t = num(r.sum_TOPLAM);
        const u = num(r.sum_sehir);
        return { year: String(r.year), total: t, rural: num(r.sum_kirsal), urban: u, urbanRate: t > 0 ? (u / t * 100) : 0 };
      });
      setTurkeyTrend(trend);
      const trendYV: YearValue[] = trend.map((t) => ({ year: t.year, value: t.total }));
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
        fetchAgg(R, { groupBy: ['year'], sum: ['TOPLAM'], whereGte: { year: 1990 }, exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['year'], sum: ['TOPLAM'], where: { area: TR }, whereGte: { year: 1990 }, orderBy: 'year', dir: 'asc' }),
      ]);
      const worldData: YearValue[] = worldTrendRes.map((r) => ({ year: String(r.year), value: num(r.sum_TOPLAM) }));
      const turkeyData: YearValue[] = turkeyTrendRes.map((r) => ({ year: String(r.year), value: num(r.sum_TOPLAM) }));
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
      const yil = await sonYil();
      const [turkeyNowRes, turkeyBeforeRes, urbanTrendRes] = await Promise.all([
        fetchAgg(R, { sum: NUM, where: { year: yil, area: TR } }),
        fetchAgg(R, { sum: ['TOPLAM', 'kirsal'], where: { year: 2000, area: TR } }),
        fetchAgg(R, { groupBy: ['year'], sum: ['sehir', 'TOPLAM'], where: { area: TR }, whereIn: { year: [1960, 1980, 2000, yil] }, orderBy: 'year', dir: 'asc' }),
      ]);
      const alerts: IntelligenceAlert[] = [];
      const now = turkeyNowRes[0];
      const before = turkeyBeforeRes[0];
      const totalNow = num(now?.sum_TOPLAM);
      const urbanNow = num(now?.sum_sehir);
      const ruralNow = num(now?.sum_kirsal);
      const totalBefore = num(before?.sum_TOPLAM);
      const ruralBefore = num(before?.sum_kirsal);
      const urbanRate = totalNow > 0 ? (urbanNow / totalNow * 100) : 0;
      if (totalBefore > 0) {
        const growth = ((totalNow - totalBefore) / totalBefore) * 100;
        alerts.push({ id: 'pop-growth', severity: growth > 30 ? 'warning' : 'info', title: 'Turkiye Nufus Artisi', message: `2000-${yil} doneminde %${growth.toFixed(1)} artis (${formatPop(totalNow)})`, metric: 'Nufus Buyumesi', value: growth });
      }
      alerts.push({ id: 'urban-rate', severity: urbanRate > 80 ? 'warning' : 'positive', title: 'Kentlesme Seviyesi', message: `Turkiye kentlesme: %${urbanRate.toFixed(1)} — ${urbanRate > 80 ? 'asiri kentsel yogunluk riski' : 'dengeli'}`, metric: 'Kentlesme', value: urbanRate });
      if (ruralBefore > 0) {
        const ruralChange = ((ruralNow - ruralBefore) / ruralBefore) * 100;
        if (ruralChange < -20) {
          alerts.push({ id: 'rural-decline', severity: 'critical', title: 'Kirsal Nufus Erimesi', message: `Kirsal nufus 2000'den bu yana %${Math.abs(ruralChange).toFixed(0)} azaldi — tarim iscisi kriteri`, metric: 'Kirsal Goc', value: ruralChange });
        }
      }
      const urbanHistory = urbanTrendRes.map((r) => ({ year: String(r.year), rate: num(r.sum_TOPLAM) > 0 ? (num(r.sum_sehir) / num(r.sum_TOPLAM) * 100) : 0 }));
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
