/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { fetchAgg, num } from '../../services/d1';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';
import type { Insight } from '../../components/InsightCard';

export type Tab = 'overview' | 'security' | 'trade' | 'turkey' | 'forecast' | 'alerts';

export const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

export const FOOD_ITEMS: { id: string; name: string; nameTR: string }[] = [
  { id: '2511', name: 'Wheat', nameTR: 'Bugday' },
  { id: '2514', name: 'Maize', nameTR: 'Misir' },
  { id: '2515', name: 'Rice', nameTR: 'Pirinc' },
  { id: '2513', name: 'Barley', nameTR: 'Arpa' },
  { id: '2536', name: 'Sugar cane', nameTR: 'Seker Kamisi' },
  { id: '2537', name: 'Sugar beet', nameTR: 'Seker Pancari' },
  { id: '2731', name: 'Bovine Meat', nameTR: 'Sigir Eti' },
  { id: '2733', name: 'Pigmeat', nameTR: 'Domuz Eti' },
  { id: '2734', name: 'Poultry Meat', nameTR: 'Kumes Hayvani' },
  { id: '2848', name: 'Milk', nameTR: 'Sut' },
  { id: '2744', name: 'Eggs', nameTR: 'Yumurta' },
  { id: '2532', name: 'Cassava', nameTR: 'Manyok' },
];

// D1 toplama rotası. fao_balans'ta ulkead sütunu dolu olduğu için eski
// fao_nufus JOIN'ine gerek yok — isimlerin birebir aynı olduğu doğrulandı.
const R = 'fao/balans';
// DİKKAT: 223 = Türkiye, 351 = China. Bu ikili filtre göçten ÖNCE de böyleydi;
// "Türkiye" sekmesi aslında Türkiye + Çin toplamını gösteriyor. Davranış
// bilerek korundu (göç saf refactor kalsın diye) — düzeltilmesi ayrı bir karar.
const TR_KODLARI = ['223', '351'];

const MAIN_ITEMS = ['2511', '2514', '2515', '2513', '2731', '2734', '2848'];

export function getProductName(id: string): string {
  return FOOD_ITEMS.find(f => f.id === id)?.nameTR || id;
}

export function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(0) + ' ton';
}

export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export function formatPercent(value: number): string {
  return `%${value.toFixed(1)}`;
}

export function getSufficiencyColor(ratio: number): string {
  if (ratio >= 100) return '#22c55e';
  if (ratio >= 80) return '#f59e0b';
  if (ratio >= 50) return '#f97316';
  return '#ef4444';
}

export function getSufficiencyLabel(ratio: number): string {
  if (ratio >= 120) return 'Fazla Uretim';
  if (ratio >= 100) return 'Kendine Yeterli';
  if (ratio >= 80) return 'Yakin Yeterli';
  if (ratio >= 50) return 'Kismi Bagimli';
  return 'Yuksek Bagimlilik';
}

export function useFoodBalanceData(activeTab: Tab) {
  const [loading, setLoading] = useState(true);

  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewByProduct, setOverviewByProduct] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  const [securityData, setSecurityData] = useState<any[]>([]);
  const [securityKPIs, setSecurityKPIs] = useState<any>(null);
  const [securityInsights, setSecurityInsights] = useState<Insight[]>([]);

  const [tradeData, setTradeData] = useState<any[]>([]);
  const [tradeTrend, setTradeTrend] = useState<any[]>([]);
  const [tradeInsights, setTradeInsights] = useState<Insight[]>([]);

  const [turkeyProfile, setTurkeyProfile] = useState<any>(null);
  const [turkeyTrends, setTurkeyTrends] = useState<any[]>([]);
  const [turkeyInsights, setTurkeyInsights] = useState<Insight[]>([]);

  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<Insight[]>([]);

  const [intelligenceAlerts, setIntelligenceAlerts] = useState<IntelligenceAlert[]>([]);
  const [allInsights, setAllInsights] = useState<Insight[]>([]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [byProductRes, topCountriesRes, trendRes, prevYearRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['urun'], sum: ['uretim_v', 'imp_v', 'exp_v'], avg: ['kbgtcal_v'], where: { yil: 2023 }, whereIn: { urun: MAIN_ITEMS }, orderBy: 'sum_uretim_v', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['ulke', 'ulkead'], sum: ['uretim_v'], where: { yil: 2023 }, whereIn: { urun: MAIN_ITEMS }, orderBy: 'sum_uretim_v', dir: 'desc', limit: 20 }),
        fetchAgg(R, { groupBy: ['yil'], sum: ['uretim_v'], whereIn: { urun: MAIN_ITEMS }, orderBy: 'yil', dir: 'asc' }),
        fetchAgg(R, { sum: ['uretim_v'], where: { yil: 2022 }, whereIn: { urun: MAIN_ITEMS } })
      ]);

      const byProduct = byProductRes.map((r: any, i: number) => ({
        name: getProductName(String(r.urun)), id: String(r.urun),
        production: num(r.sum_uretim_v), imports: num(r.sum_imp_v), exports: num(r.sum_exp_v),
        calories: num(r.avg_kbgtcal_v ?? r.sum_kbgtcal_v), fill: CHART_COLORS[i % CHART_COLORS.length]
      }));
      setOverviewByProduct(byProduct);

      const topCountries = topCountriesRes.map((r: any, i: number) => {
        const name = String(r.ulkead || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name) || `Ulke ${r.ulke}`, value: num(r.sum_uretim_v), isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);

      const worldProd = byProduct.reduce((s: number, p: any) => s + p.production, 0);
      const worldImp = byProduct.reduce((s: number, p: any) => s + p.imports, 0);
      const worldExp = byProduct.reduce((s: number, p: any) => s + p.exports, 0);
      const avgCal = byProduct.length > 0 ? byProduct.reduce((s: number, p: any) => s + p.calories, 0) / byProduct.length : 0;
      const prevTotal = num(prevYearRes[0]?.sum_uretim_v);
      const yoy = calculateYoY(worldProd, prevTotal);

      const trendData = trendRes.map((r: any) => ({ year: String(r.yil), value: num(r.sum_uretim_v) }));
      setOverviewTrend(trendData);
      const worldCAGR = calculateCAGR(trendData as YearValue[]);

      setOverviewKPIs({
        worldProd, worldImp, worldExp, avgCal, yoy, productCount: byProduct.length,
        worldCAGR: worldCAGR?.cagr || 0, topProducer: topCountries[0]?.name || '-'
      });

      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dunya gida uretimi ${formatTon(worldProd)} (${byProduct.length} temel urun)`, severity: 'low', category: 'Genel' });
      if (yoy > 3) ins.push({ id: 'ov2', type: 'growth', message: `Gida uretimi %${yoy.toFixed(1)} artti`, severity: 'medium', category: 'Trend' });
      ins.push({ id: 'ov3', type: 'info', message: `Ortalama kalori: ${avgCal.toFixed(0)} kcal/kisi/gun`, severity: 'low', category: 'Beslenme' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Overview hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadSecurity = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyBalanceRes, worldAvgCalRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['urun'], sum: ['uretim_v', 'imp_v', 'exp_v', 'gida_v', 'kbgtcal_v'], where: { yil: 2023 }, whereIn: { ulke: TR_KODLARI, urun: FOOD_ITEMS.map(f => f.id) } }),
        fetchAgg(R, { avg: ['kbgtcal_v'], where: { yil: 2023, urun: '2511' }, positive: ['kbgtcal_v'] })
      ]);

      const products = turkeyBalanceRes.map((r: any) => {
        const prod = num(r.sum_uretim_v);
        const imp = num(r.sum_imp_v);
        const exp = num(r.sum_exp_v);
        const food = num(r.sum_gida_v);
        const domestic = prod + imp - exp;
        const sufficiency = domestic > 0 ? (prod / domestic * 100) : 0;
        return {
          name: getProductName(String(r.urun)), id: String(r.urun),
          production: prod, imports: imp, exports: exp, food, calories: num(r.avg_kbgtcal_v ?? r.sum_kbgtcal_v),
          sufficiency, sufficiencyColor: getSufficiencyColor(sufficiency),
          label: getSufficiencyLabel(sufficiency), dependency: Math.max(0, 100 - sufficiency)
        };
      }).sort((a: any, b: any) => b.sufficiency - a.sufficiency);
      setSecurityData(products);

      const avgSufficiency = products.length > 0 ? products.reduce((s: number, p: any) => s + p.sufficiency, 0) / products.length : 0;
      const selfSufficient = products.filter((p: any) => p.sufficiency >= 100).length;
      const dependent = products.filter((p: any) => p.sufficiency < 80).length;
      const worldAvgCal = num(worldAvgCalRes[0]?.avg_kbgtcal_v);
      setSecurityKPIs({ avgSufficiency, selfSufficient, dependent, productCount: products.length, worldAvgCal });

      const ins: Insight[] = [];
      ins.push({ id: 'sc1', type: avgSufficiency >= 80 ? 'achievement' : 'warning', message: `Turkiye ortalama gida kendine yeterliligi: %${avgSufficiency.toFixed(1)} (${selfSufficient}/${products.length} urunde fazla)`, severity: avgSufficiency < 80 ? 'high' : 'medium', category: 'Yeterlilik' });
      if (dependent > 0) ins.push({ id: 'sc2', type: 'warning', message: `${dependent} urunde yuksek dis bagimlilik (%80 altinda)`, severity: 'high', category: 'Bagimlilik' });
      const mostDependent = products.filter((p: any) => p.sufficiency < 80).sort((a: any, b: any) => a.sufficiency - b.sufficiency)[0];
      if (mostDependent) ins.push({ id: 'sc3', type: 'decline', message: `En bagimli urun: ${mostDependent.name} (%${mostDependent.sufficiency.toFixed(1)} yeterlilik)`, severity: 'high', category: 'Risk' });
      const bestProduct = products[0];
      if (bestProduct && bestProduct.sufficiency > 100) ins.push({ id: 'sc4', type: 'achievement', message: `${bestProduct.name} urunde %${(bestProduct.sufficiency - 100).toFixed(0)} uretim fazlasi - ihracat potansiyeli`, severity: 'low', category: 'Firsat' });
      setSecurityInsights(ins);
    } catch (e) { console.error('Security hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadTrade = useCallback(async () => {
    setLoading(true);
    try {
      const [tradeByProductRes, tradeTrendRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['urun'], sum: ['imp_v', 'exp_v'], where: { yil: 2023 }, whereIn: { urun: MAIN_ITEMS }, orderBy: 'sum_imp_v', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['yil'], sum: ['imp_v', 'exp_v', 'uretim_v'], whereIn: { urun: MAIN_ITEMS }, orderBy: 'yil', dir: 'asc' })
      ]);

      const tradeByProduct = tradeByProductRes.map((r: any) => {
        const imp = num(r.sum_imp_v);
        const exp = num(r.sum_exp_v);
        return { name: getProductName(String(r.urun)), imports: imp, exports: exp, balance: imp - exp, netExporter: exp > imp };
      });
      setTradeData(tradeByProduct);

      const trendData = tradeTrendRes.map((r: any) => ({
        year: String(r.yil), imports: num(r.sum_imp_v), exports: num(r.sum_exp_v),
        production: num(r.sum_uretim_v)
      }));
      setTradeTrend(trendData);

      const totalImp = tradeByProduct.reduce((s: number, t: any) => s + t.imports, 0);
      const totalExp = tradeByProduct.reduce((s: number, t: any) => s + t.exports, 0);
      const ins: Insight[] = [];
      ins.push({ id: 'tr1', type: totalImp > totalExp ? 'warning' : 'achievement', message: `Dunya net ithalat: ${formatTon(totalImp)} vs ihracat: ${formatTon(totalExp)}`, severity: 'medium', category: 'Denge' });
      const biggestDeficit = [...tradeByProduct].sort((a: any, b: any) => b.balance - a.balance)[0];
      if (biggestDeficit) ins.push({ id: 'tr2', type: 'info', message: `En yuksek ithalat acigi: ${biggestDeficit.name} (${formatTon(biggestDeficit.balance)})`, severity: 'low', category: 'Ticaret' });
      setTradeInsights(ins);
    } catch (e) { console.error('Trade hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyRes, turkeyTrendRes, worldRankRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['urun'], sum: ['uretim_v', 'imp_v', 'exp_v', 'gida_v', 'kbgtcal_v'], where: { yil: 2023 }, whereIn: { ulke: TR_KODLARI, urun: FOOD_ITEMS.map(f => f.id) } }),
        fetchAgg(R, { groupBy: ['yil'], sum: ['uretim_v', 'imp_v', 'exp_v'], avg: ['kbgtcal_v'], whereIn: { ulke: TR_KODLARI, urun: FOOD_ITEMS.map(f => f.id) }, whereGte: { yil: 2000 }, orderBy: 'yil', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['ulke', 'ulkead'], sum: ['uretim_v'], where: { yil: 2023 }, whereIn: { urun: FOOD_ITEMS.map(f => f.id) }, orderBy: 'sum_uretim_v', dir: 'desc', limit: 30 })
      ]);

      const products = turkeyRes.map((r: any) => {
        const prod = num(r.sum_uretim_v);
        const imp = num(r.sum_imp_v);
        const exp = num(r.sum_exp_v);
        const sufficiency = (prod + imp - exp) > 0 ? (prod / (prod + imp - exp) * 100) : 0;
        return {
          name: getProductName(String(r.urun)), production: prod, imports: imp, exports: exp,
          food: num(r.sum_gida_v), calories: num(r.avg_kbgtcal_v ?? r.sum_kbgtcal_v), sufficiency
        };
      }).sort((a: any, b: any) => b.production - a.production);

      const totalProd = products.reduce((s: number, p: any) => s + p.production, 0);
      const totalImp = products.reduce((s: number, p: any) => s + p.imports, 0);
      const totalExp = products.reduce((s: number, p: any) => s + p.exports, 0);
      const avgCal = products.length > 0 ? products.reduce((s: number, p: any) => s + p.calories, 0) / products.length : 0;

      const trendData = turkeyTrendRes.map((r: any) => ({
        year: String(r.yil), production: num(r.sum_uretim_v), imports: num(r.sum_imp_v),
        exports: num(r.sum_exp_v), calories: num(r.avg_kbgtcal_v ?? r.sum_kbgtcal_v)
      }));
      setTurkeyTrends(trendData);

      const prodTrend: YearValue[] = trendData.map((t: any) => ({ year: t.year, value: t.production }));
      const prodCAGR = calculateCAGR(prodTrend);

      const allCountries = worldRankRes.map((r: any) => String(r.ulkead || ''));
      const turkeyIdx = allCountries.findIndex((n: string) => n.includes('T\u00FCrkiye') || n.includes('Turkey'));

      setTurkeyProfile({
        totalProd, totalImp, totalExp, avgCal, products, tradeRatio: totalExp > 0 ? totalImp / totalExp : Infinity,
        cagr: prodCAGR?.cagr || 0, worldRank: turkeyIdx >= 0 ? turkeyIdx + 1 : 'N/A'
      });

      const ins: Insight[] = [];
      ins.push({ id: 'tp1', type: 'info', message: `Turkiye toplam gida uretimi: ${formatTon(totalProd)} (Dunya ${turkeyIdx >= 0 ? turkeyIdx + 1 : '?'}.)`, severity: 'medium', category: 'Uretim' });
      ins.push({ id: 'tp2', type: totalImp > totalExp * 1.5 ? 'warning' : 'achievement', message: `Ticaret dengesi: Ithalat ${formatTon(totalImp)} / Ihracat ${formatTon(totalExp)}`, severity: totalImp > totalExp * 2 ? 'high' : 'medium', category: 'Ticaret' });
      if (prodCAGR) ins.push({ id: 'tp3', type: prodCAGR.cagr > 0 ? 'growth' : 'decline', message: `Uretim CAGR: %${prodCAGR.cagr.toFixed(2)} (${prodCAGR.cagr > 0 ? 'buyume' : 'daralma'})`, severity: 'medium', category: 'Trend' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Turkey hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['yil'], sum: ['uretim_v'], whereIn: { urun: MAIN_ITEMS }, whereGte: { yil: 1990 }, orderBy: 'yil', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['yil'], sum: ['uretim_v'], whereIn: { urun: MAIN_ITEMS, ulke: TR_KODLARI }, whereGte: { yil: 1990 }, orderBy: 'yil', dir: 'asc' })
      ]);

      const worldData: YearValue[] = worldTrendRes.map((r: any) => ({ year: String(r.yil), value: num(r.sum_uretim_v) }));
      const turkeyData: YearValue[] = turkeyTrendRes.map((r: any) => ({ year: String(r.yil), value: num(r.sum_uretim_v) }));

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
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Turkiye gida uretim trendi: CAGR %${turkeyTrend.cagr.toFixed(2)}, volatilite %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: 'info', message: `Dunya gida uretim trendi: CAGR %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dunya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, turkeyBeforeRes, worldAvgRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['urun'], sum: ['uretim_v', 'imp_v', 'exp_v', 'kbgtcal_v'], where: { yil: 2023 }, whereIn: { ulke: TR_KODLARI, urun: FOOD_ITEMS.map(f => f.id) } }),
        fetchAgg(R, { groupBy: ['urun'], sum: ['uretim_v', 'imp_v'], where: { yil: 2015 }, whereIn: { ulke: TR_KODLARI, urun: FOOD_ITEMS.map(f => f.id) } }),
        fetchAgg(R, { avg: ['kbgtcal_v'], where: { yil: 2023, urun: '2511' }, positive: ['kbgtcal_v'] })
      ]);

      const now: Record<string, any> = {};
      turkeyNowRes.forEach((r: any) => {
        now[String(r.urun)] = { prod: num(r.sum_uretim_v), imp: num(r.sum_imp_v), exp: num(r.sum_exp_v), cal: num(r.avg_kbgtcal_v ?? r.sum_kbgtcal_v) };
      });
      const before: Record<string, any> = {};
      turkeyBeforeRes.forEach((r: any) => {
        before[String(r.urun)] = { prod: num(r.sum_uretim_v), imp: num(r.sum_imp_v) };
      });
      const worldAvgCal = num(worldAvgRes[0]?.avg_kbgtcal_v);

      const alerts: IntelligenceAlert[] = [];

      Object.entries(now).forEach(([id, data]) => {
        const domestic = data.prod + data.imp - data.exp;
        const sufficiency = domestic > 0 ? (data.prod / domestic * 100) : 0;
        const name = getProductName(id);
        if (sufficiency < 50) {
          alerts.push({ id: `sec-${id}`, severity: 'critical', title: `${name} Gida Guvenligi Riski`, message: `Kendine yeterlilik %${sufficiency.toFixed(0)} - yuksek dis bagimlilik`, metric: 'Yeterlilik', value: sufficiency });
        } else if (sufficiency < 80) {
          alerts.push({ id: `sec-${id}`, severity: 'warning', title: `${name} Bagimlilik`, message: `Kendine yeterlilik %${sufficiency.toFixed(0)}`, metric: 'Yeterlilik', value: sufficiency });
        }
      });

      MAIN_ITEMS.forEach(id => {
        const n = now[id]; const b = before[id];
        if (n && b && b.prod > 0) {
          const change = ((n.prod - b.prod) / b.prod) * 100;
          const name = getProductName(id);
          if (Math.abs(change) > 20) {
            alerts.push({ id: `prod-${id}`, severity: change > 20 ? 'positive' : 'warning', title: `${name} Uretim ${change > 0 ? 'Artisi' : 'Dususu'}`, message: `2015-2022 doneminde %${change.toFixed(1)} degisim`, metric: 'Uretim', value: change });
          }
        }
      });

      const wheatCal = now['2511']?.cal || 0;
      if (wheatCal > 0 && worldAvgCal > 0) {
        const ratio = wheatCal / worldAvgCal;
        alerts.push({ id: 'cal-wheat', severity: ratio < 0.8 ? 'warning' : 'positive', title: 'Kalori Guvenligi', message: `Turkiye bugday kalori katki: ${wheatCal.toFixed(0)} kcal (Dunya ort: ${worldAvgCal.toFixed(0)})`, metric: 'Kalori', value: ratio });
      }

      setIntelligenceAlerts(alerts);
      setAllInsights(alerts.map(a => ({
        id: a.id,
        type: a.severity === 'critical' ? 'decline' as const : a.severity === 'warning' ? 'warning' as const : a.severity === 'positive' ? 'achievement' as const : 'info' as const,
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
      case 'security': loadSecurity(); break;
      case 'trade': loadTrade(); break;
      case 'turkey': loadTurkeyProfile(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadSecurity, loadTrade, loadTurkeyProfile, loadForecast, loadAlerts]);

  return {
    loading,
    overviewKPIs, overviewByProduct, overviewTopCountries, overviewTrend, overviewInsights,
    securityData, securityKPIs, securityInsights,
    tradeData, tradeTrend, tradeInsights,
    turkeyProfile, turkeyTrends, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
