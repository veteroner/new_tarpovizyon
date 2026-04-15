/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, AreaChart, Area, ComposedChart, Line,
  Scatter
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Target, Award, AlertTriangle, Layers, BarChart2, Activity, Zap, Scale } from 'lucide-react';
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

type Tab = 'overview' | 'trade' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍' },
  { id: 'trade', label: 'Ticaret Dengesi', icon: '⚖️' },
  { id: 'concentration', label: 'Pazar Yoğunluğu', icon: '🏆' },
  { id: 'turkey', label: 'Türkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'Akıllı Analiz', icon: '🧠' },
];

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

const FERTILIZER_ITEMS = [
  'Üre', 'Diamonyum fosfat (DAP)', 'NPK gübreleri', 'Amonyum nitrat (AN)',
  'Amonyum sülfat', 'Potasyum klorür (MOP)', 'Monoamonyum fosfat (MAP)', 'Kalsiyum amonyum nitrat (CAN)'
];

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(0) + ' ton';
}

function formatUSD(value: number): string {
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'K';
  return '$' + value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export default function FertilizerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Overview state
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewByType, setOverviewByType] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Trade state
  const [tradeBalance, setTradeBalance] = useState<any[]>([]);
  const [tradeTimeSeries, setTradeTimeSeries] = useState<any[]>([]);
  const [tradeInsights, setTradeInsights] = useState<Insight[]>([]);

  // Concentration state
  const [concData, setConcData] = useState<any[]>([]);
  const [concHHI, setConcHHI] = useState<any>(null);
  const [concInsights, setConcInsights] = useState<Insight[]>([]);

  // Turkey state
  const [turkeyProfile, setTurkeyProfile] = useState<any>(null);
  const [turkeyTrends, setTurkeyTrends] = useState<any[]>([]);
  const [turkeyInsights, setTurkeyInsights] = useState<Insight[]>([]);

  // Forecast state
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<Insight[]>([]);

  // Intelligence state
  const [intelligenceAlerts, setIntelligenceAlerts] = useState<IntelligenceAlert[]>([]);
  const [allInsights, setAllInsights] = useState<Insight[]>([]);

  // ==================== OVERVIEW LOADER ====================
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [byTypeRes, topImportersRes, topExportersRes, trendRes, prevYearRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) GROUP BY item_tr ORDER BY total DESC`),
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY total DESC LIMIT 20`),
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İhracat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY total DESC LIMIT 10`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2022' AND element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS}`)
      ]);

      const byType = (byTypeRes.data || []).map((r: any, i: number) => ({
        name: String(r.item_tr), value: Number(r.total) || 0, fill: CHART_COLORS[i % CHART_COLORS.length]
      }));
      setOverviewByType(byType);

      const topCountries = (topImportersRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('T\u00FCrkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name), value: Number(r.total) || 0, isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);

      const worldTotal = byType.reduce((s: number, b: any) => s + b.value, 0);
      const prevTotal = Number(prevYearRes.data?.[0]?.total) || 0;
      const yoy = calculateYoY(worldTotal, prevTotal);
      const turkeyData = topCountries.find((c: any) => c.isTurkey);
      const turkeyRank = topCountries.findIndex((c: any) => c.isTurkey) + 1;

      const trendData = (trendRes.data || []).map((r: any) => ({ year: String(r.year), value: Number(r.total) || 0 }));
      setOverviewTrend(trendData);
      const worldCAGR = calculateCAGR(trendData as YearValue[]);

      const topExporter = (topExportersRes.data || [])[0];
      setOverviewKPIs({
        worldTotal, yoy, turkeyImport: turkeyData?.value || 0, turkeyRank: turkeyRank || 'N/A',
        fertCount: byType.length, topImporter: topCountries[0]?.name || '-',
        topExporter: topExporter ? translateCountry(String(topExporter.area || '')) : '-',
        worldCAGR: worldCAGR?.cagr || 0
      });

      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dünya gübre ithalatı ${formatTon(worldTotal)} (${byType.length} ana gübre türü)`, severity: 'low', category: 'Kapsam' });
      if (yoy > 5) ins.push({ id: 'ov2', type: 'growth', message: `Gübre ithalatı önceki yıla göre %${yoy.toFixed(1)} arttı — talep artışı`, severity: 'high', category: 'Trend' });
      else if (yoy < -5) ins.push({ id: 'ov2', type: 'decline', message: `Gübre ithalatı %${Math.abs(yoy).toFixed(1)} azaldı`, severity: 'high', category: 'Trend' });
      if (turkeyData) ins.push({ id: 'ov3', type: turkeyRank <= 10 ? 'achievement' : 'info', message: `Türkiye gübre ithalatında dünya ${turkeyRank}. — ${formatTon(turkeyData.value)}`, severity: 'medium', category: 'Türkiye' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Overview hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== TRADE BALANCE LOADER ====================
  const loadTrade = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [tradeByTypeRes, turkeyTradeRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) GROUP BY item_tr, element_tr`),
        fetchQuery(`SELECT year, element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) AND CAST(year AS SIGNED) >= 2000 GROUP BY year, element_tr ORDER BY year`)
      ]);

      const tradeByType: Record<string, { imp: number; exp: number }> = {};
      (tradeByTypeRes.data || []).forEach((r: any) => {
        const item = String(r.item_tr);
        if (!tradeByType[item]) tradeByType[item] = { imp: 0, exp: 0 };
        if (String(r.element_tr).includes('thalat')) tradeByType[item].imp = Number(r.total) || 0;
        else tradeByType[item].exp = Number(r.total) || 0;
      });

      const balanceData = Object.entries(tradeByType).map(([name, vals]) => ({
        name, import: vals.imp, export: vals.exp, balance: vals.imp - vals.exp,
        selfSufficiency: vals.imp > 0 ? (vals.exp / vals.imp * 100) : 0
      })).sort((a, b) => b.import - a.import);
      setTradeBalance(balanceData);

      const timeByYear: Record<string, { imp: number; exp: number }> = {};
      (turkeyTradeRes.data || []).forEach((r: any) => {
        const yr = String(r.year);
        if (!timeByYear[yr]) timeByYear[yr] = { imp: 0, exp: 0 };
        if (String(r.element_tr).includes('thalat')) timeByYear[yr].imp = Number(r.total) || 0;
        else timeByYear[yr].exp = Number(r.total) || 0;
      });
      const timeSeries = Object.entries(timeByYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, vals]) => ({
        year, import: vals.imp, export: vals.exp, balance: vals.imp - vals.exp
      }));
      setTradeTimeSeries(timeSeries);

      const totalImp = balanceData.reduce((s, b) => s + b.import, 0);
      const totalExp = balanceData.reduce((s, b) => s + b.export, 0);
      const ins: Insight[] = [];
      if (totalImp > totalExp * 2) ins.push({ id: 'tr1', type: 'warning', message: `Türkiye gübre ithalatı ihracatının ${(totalImp / (totalExp || 1)).toFixed(1)}x katı — yüksek dış bağımlılık`, severity: 'high', category: 'Ticaret' });
      const topDeficit = balanceData[0];
      if (topDeficit) ins.push({ id: 'tr2', type: 'info', message: `En yüksek ithalat açığı: ${topDeficit.name} (${formatTon(topDeficit.balance)})`, severity: 'medium', category: 'Açık' });
      const surplusItems = balanceData.filter(b => b.export > b.import);
      if (surplusItems.length > 0) ins.push({ id: 'tr3', type: 'achievement', message: `${surplusItems.length} gübre türünde ihracat fazlası`, severity: 'medium', category: 'Fazla' });
      setTradeInsights(ins);
    } catch (e) { console.error('Trade hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== CONCENTRATION LOADER ====================
  const loadConcentration = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [countryShareRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İhracat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY area ORDER BY total DESC LIMIT 50`)
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
        ins.push({ id: 'cn1', type: hhi.concentration === 'HIGH' ? 'warning' : 'info', message: `Gübre ihracatı konsantrasyonu: HHI ${hhi.hhi.toFixed(0)} (${label}) — İlk 3 pay %${hhi.top3Share.toFixed(1)}`, severity: hhi.concentration === 'HIGH' ? 'high' : 'medium', category: 'HHI' });
      }
      const turkeyInList = data.find((c: any) => c.isTurkey);
      if (turkeyInList) ins.push({ id: 'cn2', type: 'info', message: `Türkiye gübre ihracatında dünya ${turkeyInList.rank}. (${formatTon(turkeyInList.value)})`, severity: 'medium', category: 'Sıralama' });
      setConcInsights(ins);
    } catch (e) { console.error('Concentration hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== TURKEY PROFILE LOADER ====================
  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [turkeyByTypeRes, turkeyTrendRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, element_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_input_gubre_ticari WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı','İthalat Değeri','İhracat Değeri') AND item_tr IN (${itemList})`),
        fetchQuery(`SELECT year, SUM(CASE WHEN element_tr='İthalat Miktarı' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as imp, SUM(CASE WHEN element_tr='İhracat Miktarı' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as exp FROM fao_input_gubre_ticari WHERE (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND item_tr IN (${itemList}) AND CAST(year AS SIGNED) >= 2000 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT element_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_input_gubre_ticari WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY element_tr`)
      ]);

      const turkeyData: Record<string, Record<string, number>> = {};
      (turkeyByTypeRes.data || []).forEach((r: any) => {
        const item = String(r.item_tr);
        const elem = String(r.element_tr);
        if (!turkeyData[item]) turkeyData[item] = {};
        turkeyData[item][elem] = Number(r.val) || 0;
      });

      const worldAvgs: Record<string, number> = {};
      (worldAvgRes.data || []).forEach((r: any) => { worldAvgs[String(r.element_tr)] = Number(r.avg_val) || 0; });

      let totalImp = 0, totalExp = 0, totalImpVal = 0, totalExpVal = 0;
      const byProduct = Object.entries(turkeyData).map(([name, vals]) => {
        const imp = vals['İthalat Miktarı'] || 0;
        const exp = vals['İhracat Miktarı'] || 0;
        const impVal = vals['İthalat Değeri'] || 0;
        const expVal = vals['İhracat Değeri'] || 0;
        totalImp += imp; totalExp += exp; totalImpVal += impVal; totalExpVal += expVal;
        return { name, import: imp, export: exp, importValue: impVal, exportValue: expVal, balance: imp - exp };
      }).sort((a, b) => b.import - a.import);

      const trendData = (turkeyTrendRes.data || []).map((r: any) => ({
        year: String(r.year), import: Number(r.imp) || 0, export: Number(r.exp) || 0
      }));
      setTurkeyTrends(trendData);

      const impTrend: YearValue[] = trendData.map(t => ({ year: t.year, value: t.import }));
      const impCAGR = calculateCAGR(impTrend);

      setTurkeyProfile({
        totalImp, totalExp, totalImpVal, totalExpVal, byProduct,
        tradeRatio: totalExp > 0 ? totalImp / totalExp : Infinity,
        impCAGR: impCAGR?.cagr || 0, worldAvgImp: worldAvgs['İthalat Miktarı'] || 0,
        worldAvgExp: worldAvgs['İhracat Miktarı'] || 0
      });

      const ins: Insight[] = [];
      ins.push({ id: 'tp1', type: totalImp > totalExp * 3 ? 'warning' : 'info', message: `Türkiye gübre ticareti: İthalat ${formatTon(totalImp)} — İhracat ${formatTon(totalExp)} (oran: ${(totalImp / (totalExp || 1)).toFixed(1)}x)`, severity: 'high', category: 'Denge' });
      if (impCAGR) ins.push({ id: 'tp2', type: impCAGR.cagr > 0 ? 'growth' : 'decline', message: `Gübre ithalatı yıllık %${Math.abs(impCAGR.cagr).toFixed(2)} bileşik büyüme oranıyla ${impCAGR.cagr > 0 ? 'artıyor' : 'azalıyor'}`, severity: 'medium', category: 'Trend' });
      if (byProduct.length > 0) ins.push({ id: 'tp3', type: 'info', message: `En çok ithal edilen: ${byProduct[0].name} (${formatTon(byProduct[0].import)})`, severity: 'low', category: 'Ürün' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Turkey hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== FORECAST LOADER ====================
  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`)
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
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Türkiye gübre ithalatı trendi: BBO %${turkeyTrend.cagr.toFixed(2)}, oynaklık %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: worldTrend.direction === 'up' ? 'growth' : 'info', message: `Dünya gübre ticareti trendi: BBO %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dünya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== INTELLIGENCE ALERTS LOADER ====================
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [turkeyNowRes, turkeyBeforeRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı','İthalat Değeri','İhracat Değeri') AND item_tr IN (${itemList}) GROUP BY element_tr`),
        fetchQuery(`SELECT element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2015' AND (area='Turkiye' OR area='Turkey' OR area='T\u00FCrkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı','İthalat Değeri','İhracat Değeri') AND item_tr IN (${itemList}) GROUP BY element_tr`),
        fetchQuery(`SELECT element_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_input_gubre_ticari WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY element_tr`)
      ]);

      const now: Record<string, number> = {};
      (turkeyNowRes.data || []).forEach((r: any) => now[String(r.element_tr)] = Number(r.total) || 0);
      const before: Record<string, number> = {};
      (turkeyBeforeRes.data || []).forEach((r: any) => before[String(r.element_tr)] = Number(r.total) || 0);
      const worldAvg: Record<string, number> = {};
      (worldAvgRes.data || []).forEach((r: any) => worldAvg[String(r.element_tr)] = Number(r.avg_val) || 0);

      const alerts: IntelligenceAlert[] = [];
      const impNow = now['İthalat Miktarı'] || 0;
      const impBefore = before['İthalat Miktarı'] || 0;
      if (impBefore > 0) {
        const change = ((impNow - impBefore) / impBefore) * 100;
        alerts.push({ id: 'int-imp-change', severity: change > 30 ? 'warning' : change > 0 ? 'info' : 'positive', title: 'İthalat Değişimi (2015-2022)', message: `Gübre ithalatı %${change.toFixed(1)} ${change > 0 ? 'arttı' : 'azaldı'} (${formatTon(impBefore)} → ${formatTon(impNow)})`, metric: 'İthalat trendi', value: change });
      }
      const expNow = now['İhracat Miktarı'] || 0;
      const expBefore = before['İhracat Miktarı'] || 0;
      if (expBefore > 0) {
        const change = ((expNow - expBefore) / expBefore) * 100;
        alerts.push({ id: 'int-exp-change', severity: change > 20 ? 'positive' : 'info', title: 'İhracat Performansı', message: `Gübre ihracatı %${change.toFixed(1)} ${change > 0 ? 'arttı' : 'azaldı'}`, metric: 'İhracat trendi', value: change });
      }
      if (impNow > 0 && expNow > 0) {
        const ratio = impNow / expNow;
        alerts.push({ id: 'int-trade-ratio', severity: ratio > 5 ? 'critical' : ratio > 2 ? 'warning' : 'positive', title: 'Ticaret Dengesi', message: `İthalat/ihracat oranı: ${ratio.toFixed(1)}x${ratio > 3 ? ' — yüksek dış bağımlılık riski' : ''}`, metric: 'Ticaret oranı', value: ratio });
      }
      const impValueNow = now['İthalat Değeri'] || 0;
      if (impNow > 0 && impValueNow > 0) {
        const unitPrice = impValueNow / impNow;
        alerts.push({ id: 'int-unit-price', severity: 'info', title: 'Birim İthalat Maliyeti', message: `Ortalama gübre ithalat fiyatı: ${formatUSD(unitPrice * 1000)}/ton`, metric: 'Birim fiyat', value: unitPrice });
      }
      if (worldAvg['İthalat Miktarı'] && impNow > worldAvg['İthalat Miktarı'] * 2) {
        alerts.push({ id: 'int-above-avg', severity: 'warning', title: 'Ortalamanın Üzerinde İthalat', message: `Türkiye gübre ithalatı dünya ülke ortalamasının ${(impNow / worldAvg['İthalat Miktarı']).toFixed(1)}x katı`, metric: 'Kıyaslama', value: impNow / worldAvg['İthalat Miktarı'] });
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
      case 'trade': loadTrade(); break;
      case 'concentration': loadConcentration(); break;
      case 'turkey': loadTurkeyProfile(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadTrade, loadConcentration, loadTurkeyProfile, loadForecast, loadAlerts]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌱 Gübre Ticareti Analizi</h1>
        <p className="page-subtitle">FAO gübre ticareti — akıllı analiz motoru</p>
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
                <KPICard title="DÜNYA GÜBRE İTHALATI" value={formatTon(overviewKPIs.worldTotal)} subtitle={`Yıllık: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | BBO: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="TÜRKİYE İTHALATI" value={formatTon(overviewKPIs.turkeyImport)} subtitle={`Dünya sırası: #${overviewKPIs.turkeyRank}`} icon={MapPin} color="orange" />
                <KPICard title="EN BÜYÜK İTHALATÇI" value={overviewKPIs.topImporter} subtitle="2023" icon={Award} color="blue" />
                <KPICard title="EN BÜYÜK İHRACATÇI" value={overviewKPIs.topExporter} subtitle="2023" icon={TrendingUp} color="green" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Gübre Türü Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewByType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={130} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'İthalat']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {overviewByType.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 İthalatçı Ülke</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'İthalat']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dünya Gübre İthalat Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Toplam']} />
                      <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* TRADE BALANCE */}
          {activeTab === 'trade' && (
            <>
              {tradeBalance.length > 0 && (
                <div className="kpi-grid">
                  <KPICard title="TOPLAM İTHALAT" value={formatTon(tradeBalance.reduce((s, b) => s + b.import, 0))} subtitle="Türkiye 2023" icon={TrendingDown} color="red" large />
                  <KPICard title="TOPLAM İHRACAT" value={formatTon(tradeBalance.reduce((s, b) => s + b.export, 0))} subtitle="Türkiye 2023" icon={TrendingUp} color="green" />
                  <KPICard title="TİCARET AÇIĞI" value={formatTon(tradeBalance.reduce((s, b) => s + b.balance, 0))} subtitle="İthalat — İhracat" icon={Scale} color="orange" />
                  <KPICard title="GÜBRE TÜRÜ" value={String(tradeBalance.length)} subtitle="İzlenen" icon={Layers} color="blue" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Türkiye Gübre Ticaret Dengesi (Tür Bazlı)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={tradeBalance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="import" name="İthalat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="export" name="İhracat" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {tradeTimeSeries.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Türkiye Gübre Ticareti Zaman Serisi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={tradeTimeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Area type="monotone" dataKey="import" name="İthalat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="export" name="İhracat" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Line type="monotone" dataKey="balance" name="Açık" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={tradeInsights} />
            </>
          )}

          {/* CONCENTRATION */}
          {activeTab === 'concentration' && (
            <>
              {concHHI && (
                <div className="kpi-grid">
                  <KPICard title="HHI ENDEKSİ" value={concHHI.hhi.toFixed(0)} subtitle={`Konsantrasyon: ${concHHI.concentration === 'HIGH' ? 'Yüksek' : concHHI.concentration === 'MODERATE' ? 'Orta' : 'Düşük'}`} icon={BarChart2} color="purple" large />
                  <KPICard title="İLK 1 PAYI" value={`%${concHHI.top1Share.toFixed(1)}`} subtitle="En büyük ihracatçı" icon={Award} color="orange" />
                  <KPICard title="İLK 3 PAYI" value={`%${concHHI.top3Share.toFixed(1)}`} subtitle="İlk 3 ülke" icon={Layers} color="blue" />
                  <KPICard title="ETKİN RAKİP" value={concHHI.effectiveCompetitors.toFixed(1)} subtitle="Efektif sayı" icon={Activity} color="green" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Gübre İhracatı — Ülke Sıralaması</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={concData.slice(0, 25)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'İhracat']} />
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
                <KPICard title="TOPLAM İTHALAT" value={formatTon(turkeyProfile.totalImp)} subtitle={`BBO: %${turkeyProfile.impCAGR.toFixed(2)}`} icon={TrendingDown} color="red" large />
                <KPICard title="TOPLAM İHRACAT" value={formatTon(turkeyProfile.totalExp)} subtitle="2023" icon={TrendingUp} color="green" />
                <KPICard title="İTHALAT DEĞERİ" value={formatUSD(turkeyProfile.totalImpVal * 1000)} subtitle="2023 USD" icon={Target} color="blue" />
                <KPICard title="TİCARET ORANI" value={`${turkeyProfile.tradeRatio.toFixed(1)}x`} subtitle="İthalat / İhracat" icon={Scale} color={turkeyProfile.tradeRatio > 3 ? 'red' : 'orange'} />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Gübre Ticareti (Ürün Bazlı)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={turkeyProfile.byProduct} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={130} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="import" name="İthalat" fill="#ef4444" />
                      <Bar dataKey="export" name="İhracat" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Gübre Trendi (2000+)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="import" name="İthalat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                      <Line type="monotone" dataKey="export" name="İhracat" stroke="#22c55e" strokeWidth={2} />
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
                <KPICard title="TÜRKİYE BBO" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.turkeyR2?.toFixed(3) || '0'}`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'green' : 'red'} large />
                <KPICard title="DÜNYA BBO" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="OYNAKLIK" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Türkiye" icon={Activity} color="purple" />
                <KPICard title="ANOMALİ" value={String(forecastData.anomalyCount || 0)} subtitle="Sapma sayısı" icon={AlertTriangle} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Türkiye Gübre İthalatı — Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatTon(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gerçek" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#8b5cf6" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
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
