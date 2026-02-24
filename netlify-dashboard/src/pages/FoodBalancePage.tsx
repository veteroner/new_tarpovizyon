/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, AreaChart, Area, ComposedChart, Line,
  Scatter
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Target, Award, AlertTriangle, Activity, Zap, Shield, Heart, Scale, Wheat } from 'lucide-react';
import { fetchQuery } from '../services/api';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { Insight } from '../components/InsightCard';
import { translateCountry } from '../utils/countryTranslations';
import {
  calculateCAGR, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend
} from '../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../utils/intelligenceCalculations';

type Tab = 'overview' | 'security' | 'trade' | 'turkey' | 'forecast' | 'alerts';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍' },
  { id: 'security', label: 'Gida Guvenligi', icon: '🛡️' },
  { id: 'trade', label: 'Ticaret Akisi', icon: '⚖️' },
  { id: 'turkey', label: 'Turkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'Intelligence', icon: '🧠' },
];

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

const FOOD_ITEMS: { id: string; name: string; nameTR: string }[] = [
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

const MAIN_ITEMS = ['2511', '2514', '2515', '2513', '2731', '2734', '2848'];

function getProductName(id: string): string {
  return FOOD_ITEMS.find(f => f.id === id)?.nameTR || id;
}

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(0) + ' ton';
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

function formatPercent(value: number): string {
  return `%${value.toFixed(1)}`;
}

function getSufficiencyColor(ratio: number): string {
  if (ratio >= 100) return '#22c55e';
  if (ratio >= 80) return '#f59e0b';
  if (ratio >= 50) return '#f97316';
  return '#ef4444';
}

function getSufficiencyLabel(ratio: number): string {
  if (ratio >= 120) return 'Fazla Uretim';
  if (ratio >= 100) return 'Kendine Yeterli';
  if (ratio >= 80) return 'Yakin Yeterli';
  if (ratio >= 50) return 'Kismi Bagimli';
  return 'Yuksek Bagimlilik';
}

export default function FoodBalancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Overview
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewByProduct, setOverviewByProduct] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Security
  const [securityData, setSecurityData] = useState<any[]>([]);
  const [securityKPIs, setSecurityKPIs] = useState<any>(null);
  const [securityInsights, setSecurityInsights] = useState<Insight[]>([]);

  // Trade
  const [tradeData, setTradeData] = useState<any[]>([]);
  const [tradeTrend, setTradeTrend] = useState<any[]>([]);
  const [tradeInsights, setTradeInsights] = useState<Insight[]>([]);

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

  const itemList = MAIN_ITEMS.join(',');

  // ==================== OVERVIEW ====================
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [byProductRes, topCountriesRes, trendRes, prevYearRes] = await Promise.all([
        fetchQuery(`SELECT b.urun, SUM(CAST(b.uretim_v AS DECIMAL(20,2))) as uretim, SUM(CAST(b.imp_v AS DECIMAL(20,2))) as ithalat, SUM(CAST(b.exp_v AS DECIMAL(20,2))) as ihracat, AVG(CAST(b.kbgtcal_v AS DECIMAL(10,2))) as kalori FROM fao_balans b WHERE b.yil='2022' AND b.urun IN (${itemList}) GROUP BY b.urun ORDER BY uretim DESC`),
        fetchQuery(`SELECT b.ulke, n.area, SUM(CAST(b.uretim_v AS DECIMAL(20,2))) as toplam FROM fao_balans b LEFT JOIN (SELECT DISTINCT areacode, area FROM fao_nufus) n ON b.ulke = n.areacode WHERE b.yil='2022' AND b.urun IN (${itemList}) GROUP BY b.ulke, n.area ORDER BY toplam DESC LIMIT 20`),
        fetchQuery(`SELECT yil, SUM(CAST(uretim_v AS DECIMAL(20,2))) as uretim FROM fao_balans WHERE urun IN (${itemList}) GROUP BY yil ORDER BY yil`),
        fetchQuery(`SELECT SUM(CAST(uretim_v AS DECIMAL(20,2))) as total FROM fao_balans WHERE yil='2021' AND urun IN (${itemList})`)
      ]);

      const byProduct = (byProductRes.data || []).map((r: any, i: number) => ({
        name: getProductName(String(r.urun)), id: String(r.urun),
        production: Number(r.uretim) || 0, imports: Number(r.ithalat) || 0, exports: Number(r.ihracat) || 0,
        calories: Number(r.kalori) || 0, fill: CHART_COLORS[i % CHART_COLORS.length]
      }));
      setOverviewByProduct(byProduct);

      const topCountries = (topCountriesRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name) || `Ulke ${r.ulke}`, value: Number(r.toplam) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);

      const worldProd = byProduct.reduce((s: number, p: any) => s + p.production, 0);
      const worldImp = byProduct.reduce((s: number, p: any) => s + p.imports, 0);
      const worldExp = byProduct.reduce((s: number, p: any) => s + p.exports, 0);
      const avgCal = byProduct.length > 0 ? byProduct.reduce((s: number, p: any) => s + p.calories, 0) / byProduct.length : 0;
      const prevTotal = Number(prevYearRes.data?.[0]?.total) || 0;
      const yoy = calculateYoY(worldProd, prevTotal);

      const trendData = (trendRes.data || []).map((r: any) => ({ year: String(r.yil), value: Number(r.uretim) || 0 }));
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
  }, [itemList]);

  // ==================== FOOD SECURITY ====================
  const loadSecurity = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyBalanceRes, worldAvgCalRes] = await Promise.all([
        fetchQuery(`SELECT b.urun, CAST(b.uretim_v AS DECIMAL(20,2)) as uretim, CAST(b.imp_v AS DECIMAL(20,2)) as ithalat, CAST(b.exp_v AS DECIMAL(20,2)) as ihracat, CAST(b.gida_v AS DECIMAL(20,2)) as gida, CAST(b.kbgtcal_v AS DECIMAL(10,2)) as kalori FROM fao_balans b WHERE b.yil='2022' AND (b.ulke='223' OR b.ulke='351') AND b.urun IN (${FOOD_ITEMS.map(f => f.id).join(',')})`),
        fetchQuery(`SELECT AVG(CAST(kbgtcal_v AS DECIMAL(10,2))) as avg_cal FROM fao_balans WHERE yil='2022' AND kbgtcal_v > 0 AND urun='2511'`)
      ]);

      const products = (turkeyBalanceRes.data || []).map((r: any) => {
        const prod = Number(r.uretim) || 0;
        const imp = Number(r.ithalat) || 0;
        const exp = Number(r.ihracat) || 0;
        const food = Number(r.gida) || 0;
        const domestic = prod + imp - exp;
        const sufficiency = domestic > 0 ? (prod / domestic * 100) : 0;
        return {
          name: getProductName(String(r.urun)), id: String(r.urun),
          production: prod, imports: imp, exports: exp, food, calories: Number(r.kalori) || 0,
          sufficiency, sufficiencyColor: getSufficiencyColor(sufficiency),
          label: getSufficiencyLabel(sufficiency), dependency: Math.max(0, 100 - sufficiency)
        };
      }).sort((a: any, b: any) => b.sufficiency - a.sufficiency);
      setSecurityData(products);

      const avgSufficiency = products.length > 0 ? products.reduce((s: number, p: any) => s + p.sufficiency, 0) / products.length : 0;
      const selfSufficient = products.filter((p: any) => p.sufficiency >= 100).length;
      const dependent = products.filter((p: any) => p.sufficiency < 80).length;
      const worldAvgCal = Number(worldAvgCalRes.data?.[0]?.avg_cal) || 0;

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

  // ==================== TRADE ====================
  const loadTrade = useCallback(async () => {
    setLoading(true);
    try {
      const [tradeByProductRes, tradeTrendRes] = await Promise.all([
        fetchQuery(`SELECT b.urun, SUM(CAST(b.imp_v AS DECIMAL(20,2))) as ithalat, SUM(CAST(b.exp_v AS DECIMAL(20,2))) as ihracat FROM fao_balans b WHERE b.yil='2022' AND b.urun IN (${itemList}) GROUP BY b.urun ORDER BY ithalat DESC`),
        fetchQuery(`SELECT yil, SUM(CAST(imp_v AS DECIMAL(20,2))) as ithalat, SUM(CAST(exp_v AS DECIMAL(20,2))) as ihracat, SUM(CAST(uretim_v AS DECIMAL(20,2))) as uretim FROM fao_balans WHERE urun IN (${itemList}) GROUP BY yil ORDER BY yil`)
      ]);

      const tradeByProduct = (tradeByProductRes.data || []).map((r: any) => {
        const imp = Number(r.ithalat) || 0;
        const exp = Number(r.ihracat) || 0;
        return { name: getProductName(String(r.urun)), imports: imp, exports: exp, balance: imp - exp, netExporter: exp > imp };
      });
      setTradeData(tradeByProduct);

      const trendData = (tradeTrendRes.data || []).map((r: any) => ({
        year: String(r.yil), imports: Number(r.ithalat) || 0, exports: Number(r.ihracat) || 0,
        production: Number(r.uretim) || 0
      }));
      setTradeTrend(trendData);

      const totalImp = tradeByProduct.reduce((s: number, t: any) => s + t.imports, 0);
      const totalExp = tradeByProduct.reduce((s: number, t: any) => s + t.exports, 0);
      const ins: Insight[] = [];
      ins.push({ id: 'tr1', type: totalImp > totalExp ? 'warning' : 'achievement', message: `Dunya net ithalat: ${formatTon(totalImp)} vs ihracat: ${formatTon(totalExp)}`, severity: 'medium', category: 'Denge' });
      const biggestDeficit = tradeByProduct.sort((a: any, b: any) => b.balance - a.balance)[0];
      if (biggestDeficit) ins.push({ id: 'tr2', type: 'info', message: `En yuksek ithalat acigi: ${biggestDeficit.name} (${formatTon(biggestDeficit.balance)})`, severity: 'low', category: 'Ticaret' });
      setTradeInsights(ins);
    } catch (e) { console.error('Trade hatasi:', e); }
    finally { setLoading(false); }
  }, [itemList]);

  // ==================== TURKEY PROFILE ====================
  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const allItemIds = FOOD_ITEMS.map(f => f.id).join(',');
      const [turkeyRes, turkeyTrendRes, worldRankRes] = await Promise.all([
        fetchQuery(`SELECT b.urun, CAST(b.uretim_v AS DECIMAL(20,2)) as uretim, CAST(b.imp_v AS DECIMAL(20,2)) as ithalat, CAST(b.exp_v AS DECIMAL(20,2)) as ihracat, CAST(b.gida_v AS DECIMAL(20,2)) as gida, CAST(b.kbgtcal_v AS DECIMAL(10,2)) as kalori FROM fao_balans b WHERE b.yil='2022' AND (b.ulke='223' OR b.ulke='351') AND b.urun IN (${allItemIds})`),
        fetchQuery(`SELECT yil, SUM(CAST(uretim_v AS DECIMAL(20,2))) as uretim, SUM(CAST(imp_v AS DECIMAL(20,2))) as ithalat, SUM(CAST(exp_v AS DECIMAL(20,2))) as ihracat, AVG(CAST(kbgtcal_v AS DECIMAL(10,2))) as kalori FROM fao_balans WHERE (ulke='223' OR ulke='351') AND urun IN (${allItemIds}) AND CAST(yil AS SIGNED) >= 2000 GROUP BY yil ORDER BY yil`),
        fetchQuery(`SELECT b.ulke, n.area, SUM(CAST(b.uretim_v AS DECIMAL(20,2))) as toplam FROM fao_balans b LEFT JOIN (SELECT DISTINCT areacode, area FROM fao_nufus) n ON b.ulke = n.areacode WHERE b.yil='2022' AND b.urun IN (${allItemIds}) GROUP BY b.ulke, n.area ORDER BY toplam DESC LIMIT 30`)
      ]);

      const products = (turkeyRes.data || []).map((r: any) => {
        const prod = Number(r.uretim) || 0;
        const imp = Number(r.ithalat) || 0;
        const exp = Number(r.ihracat) || 0;
        const sufficiency = (prod + imp - exp) > 0 ? (prod / (prod + imp - exp) * 100) : 0;
        return {
          name: getProductName(String(r.urun)), production: prod, imports: imp, exports: exp,
          food: Number(r.gida) || 0, calories: Number(r.kalori) || 0, sufficiency
        };
      }).sort((a: any, b: any) => b.production - a.production);

      const totalProd = products.reduce((s: number, p: any) => s + p.production, 0);
      const totalImp = products.reduce((s: number, p: any) => s + p.imports, 0);
      const totalExp = products.reduce((s: number, p: any) => s + p.exports, 0);
      const avgCal = products.length > 0 ? products.reduce((s: number, p: any) => s + p.calories, 0) / products.length : 0;

      const trendData = (turkeyTrendRes.data || []).map((r: any) => ({
        year: String(r.yil), production: Number(r.uretim) || 0, imports: Number(r.ithalat) || 0,
        exports: Number(r.ihracat) || 0, calories: Number(r.kalori) || 0
      }));
      setTurkeyTrends(trendData);

      const prodTrend: YearValue[] = trendData.map(t => ({ year: t.year, value: t.production }));
      const prodCAGR = calculateCAGR(prodTrend);

      // Turkey rank
      const allCountries = (worldRankRes.data || []).map((r: any) => String(r.area || ''));
      const turkeyIdx = allCountries.findIndex(n => n.includes('T\u00FCrkiye') || n.includes('Turkey'));

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

  // ==================== FORECAST ====================
  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT yil, SUM(CAST(uretim_v AS DECIMAL(20,2))) as total FROM fao_balans WHERE urun IN (${itemList}) AND CAST(yil AS SIGNED) >= 1990 GROUP BY yil ORDER BY yil`),
        fetchQuery(`SELECT yil, SUM(CAST(uretim_v AS DECIMAL(20,2))) as total FROM fao_balans WHERE urun IN (${itemList}) AND (ulke='223' OR ulke='351') AND CAST(yil AS SIGNED) >= 1990 GROUP BY yil ORDER BY yil`)
      ]);

      const worldData: YearValue[] = (worldTrendRes.data || []).map((r: any) => ({ year: String(r.yil), value: Number(r.total) || 0 }));
      const turkeyData: YearValue[] = (turkeyTrendRes.data || []).map((r: any) => ({ year: String(r.yil), value: Number(r.total) || 0 }));

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
  }, [itemList]);

  // ==================== INTELLIGENCE ====================
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const allItemIds = FOOD_ITEMS.map(f => f.id).join(',');
      const [turkeyNowRes, turkeyBeforeRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT b.urun, CAST(b.uretim_v AS DECIMAL(20,2)) as uretim, CAST(b.imp_v AS DECIMAL(20,2)) as ithalat, CAST(b.exp_v AS DECIMAL(20,2)) as ihracat, CAST(b.kbgtcal_v AS DECIMAL(10,2)) as kalori FROM fao_balans b WHERE b.yil='2022' AND (b.ulke='223' OR b.ulke='351') AND b.urun IN (${allItemIds})`),
        fetchQuery(`SELECT b.urun, CAST(b.uretim_v AS DECIMAL(20,2)) as uretim, CAST(b.imp_v AS DECIMAL(20,2)) as ithalat FROM fao_balans b WHERE b.yil='2015' AND (b.ulke='223' OR b.ulke='351') AND b.urun IN (${allItemIds})`),
        fetchQuery(`SELECT AVG(CAST(kbgtcal_v AS DECIMAL(10,2))) as avg_cal FROM fao_balans WHERE yil='2022' AND kbgtcal_v > 0 AND urun='2511'`)
      ]);

      const now: Record<string, any> = {};
      (turkeyNowRes.data || []).forEach((r: any) => {
        now[String(r.urun)] = { prod: Number(r.uretim) || 0, imp: Number(r.ithalat) || 0, exp: Number(r.ihracat) || 0, cal: Number(r.kalori) || 0 };
      });
      const before: Record<string, any> = {};
      (turkeyBeforeRes.data || []).forEach((r: any) => {
        before[String(r.urun)] = { prod: Number(r.uretim) || 0, imp: Number(r.ithalat) || 0 };
      });
      const worldAvgCal = Number(worldAvgRes.data?.[0]?.avg_cal) || 0;

      const alerts: IntelligenceAlert[] = [];

      // Self-sufficiency alerts per product
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

      // Production change alerts
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

      // Calorie alert
      const wheatCal = now['2511']?.cal || 0;
      if (wheatCal > 0 && worldAvgCal > 0) {
        const ratio = wheatCal / worldAvgCal;
        alerts.push({ id: 'cal-wheat', severity: ratio < 0.8 ? 'warning' : 'positive', title: 'Kalori Guvenligi', message: `Turkiye bugday kalori katki: ${wheatCal.toFixed(0)} kcal (Dunya ort: ${worldAvgCal.toFixed(0)})`, metric: 'Kalori', value: ratio });
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
      case 'security': loadSecurity(); break;
      case 'trade': loadTrade(); break;
      case 'turkey': loadTurkeyProfile(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadSecurity, loadTrade, loadTurkeyProfile, loadForecast, loadAlerts]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gida Dengesi Intelligence Dashboard</h1>
        <p className="page-subtitle">FAO gida dengesi & guvenlik analizi - akilli karar destek motoru</p>
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
                <KPICard title="DUNYA GIDA URETIMI" value={formatTon(overviewKPIs.worldProd)} subtitle={`YoY: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | CAGR: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="EN BUYUK URETICI" value={overviewKPIs.topProducer} subtitle="2022" icon={Award} color="blue" />
                <KPICard title="ORT KALORI" value={`${overviewKPIs.avgCal.toFixed(0)} kcal`} subtitle="kisi/gun" icon={Heart} color="orange" />
                <KPICard title="IZLENEN URUN" value={String(overviewKPIs.productCount)} subtitle="Temel gida" icon={Wheat} color="green" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Gida Bazinda Uretim</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewByProduct} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Uretim']} />
                      <Bar dataKey="production" radius={[0, 4, 4, 0]}>
                        {overviewByProduct.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 Uretici Ulke</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Uretim']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dunya Gida Uretim Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Uretim']} />
                      <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* FOOD SECURITY */}
          {activeTab === 'security' && securityKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="ORT YETERLILIK" value={formatPercent(securityKPIs.avgSufficiency)} subtitle="Turkiye ortalama" icon={Shield} color={securityKPIs.avgSufficiency >= 80 ? 'green' : 'orange'} large />
                <KPICard title="KENDINE YETERLI" value={`${securityKPIs.selfSufficient}/${securityKPIs.productCount}`} subtitle="Fazla uretim" icon={Award} color="green" />
                <KPICard title="BAGIMLI URUN" value={String(securityKPIs.dependent)} subtitle="%80 altinda" icon={AlertTriangle} color="red" />
                <KPICard title="IZLENEN" value={String(securityKPIs.productCount)} subtitle="Gida urunu" icon={Target} color="blue" />
              </div>
              {securityData.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Turkiye Gida Kendine Yeterlilik Orani (%)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={securityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" domain={[0, 'dataMax']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                        <Tooltip formatter={(v: number) => [`%${Number(v).toFixed(1)}`, 'Yeterlilik']} />
                        <Bar dataKey="sufficiency" radius={[0, 4, 4, 0]}>
                          {securityData.map((d: any, i: number) => <Cell key={i} fill={d.sufficiencyColor} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                      {[{ color: '#22c55e', label: 'Kendine Yeterli (>%100)' }, { color: '#f59e0b', label: 'Yakin (%80-100)' }, { color: '#f97316', label: 'Kismi (%50-80)' }, { color: '#ef4444', label: 'Bagimli (<%50)' }].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color }}></div>{l.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {securityData.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Uretim vs Ithalat vs Ihracat (Turkiye)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={securityData.filter((d: any) => d.production > 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Bar dataKey="production" name="Uretim" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="imports" name="Ithalat" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="exports" name="Ihracat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={securityInsights} />
            </>
          )}

          {/* TRADE */}
          {activeTab === 'trade' && (
            <>
              {tradeData.length > 0 && (
                <div className="kpi-grid">
                  <KPICard title="TOPLAM ITHALAT" value={formatTon(tradeData.reduce((s: number, t: any) => s + t.imports, 0))} subtitle="2022" icon={TrendingDown} color="red" large />
                  <KPICard title="TOPLAM IHRACAT" value={formatTon(tradeData.reduce((s: number, t: any) => s + t.exports, 0))} subtitle="2022" icon={TrendingUp} color="green" />
                  <KPICard title="NET IHRACATCI" value={String(tradeData.filter((t: any) => t.netExporter).length)} subtitle="urunde" icon={Award} color="blue" />
                  <KPICard title="NET ITHALATCI" value={String(tradeData.filter((t: any) => !t.netExporter).length)} subtitle="urunde" icon={Scale} color="orange" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Gida Bazinda Ithalat vs Ihracat</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={tradeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="imports" name="Ithalat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="exports" name="Ihracat" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {tradeTrend.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Dunya Gida Ticareti Trendi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={tradeTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Area type="monotone" dataKey="production" name="Uretim" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Line type="monotone" dataKey="imports" name="Ithalat" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="exports" name="Ihracat" stroke="#ef4444" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={tradeInsights} />
            </>
          )}

          {/* TURKEY PROFILE */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE URETIMI" value={formatTon(turkeyProfile.totalProd)} subtitle={`CAGR: %${turkeyProfile.cagr.toFixed(2)} | Dunya #${turkeyProfile.worldRank}`} icon={MapPin} color="orange" large />
                <KPICard title="ITHALAT" value={formatTon(turkeyProfile.totalImp)} subtitle="2022" icon={TrendingDown} color="red" />
                <KPICard title="IHRACAT" value={formatTon(turkeyProfile.totalExp)} subtitle="2022" icon={TrendingUp} color="green" />
                <KPICard title="ORT KALORI" value={`${turkeyProfile.avgCal.toFixed(0)} kcal`} subtitle="kisi/gun" icon={Heart} color="purple" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye Urun Bazli Uretim</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={turkeyProfile.products} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="production" name="Uretim" fill="#22c55e" />
                      <Bar dataKey="imports" name="Ithalat" fill="#3b82f6" />
                      <Bar dataKey="exports" name="Ihracat" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye Gida Uretim Trendi (2000+)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="production" name="Uretim" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                      <Line type="monotone" dataKey="imports" name="Ithalat" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="exports" name="Ihracat" stroke="#ef4444" strokeWidth={2} />
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
                  <h3 className="chart-title">Turkiye Gida Uretimi - Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatTon(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gercek" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                      <Scatter dataKey="anomaly" name="Anomali" fill="#ef4444" />
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
                <KPICard title="TOPLAM ALERT" value={String(intelligenceAlerts.length)} subtitle="Otomatik tespit" icon={Zap} color="purple" large />
                <KPICard title="KRITIK" value={String(intelligenceAlerts.filter(a => a.severity === 'critical').length)} subtitle="Gida Guvenligi" icon={AlertTriangle} color="red" />
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
