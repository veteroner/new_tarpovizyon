/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { fetchQuery } from '../../services/api';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend, EXCLUDED_AREAS
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';
import type { Insight } from '../../components/InsightCard';

export type Tab = 'overview' | 'trade' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

export const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

export const FERTILIZER_ITEMS = [
  'Üre', 'Diamonyum fosfat (DAP)', 'NPK gübreleri', 'Amonyum nitrat (AN)',
  'Amonyum sülfat', 'Potasyum klorür (MOP)', 'Monoamonyum fosfat (MAP)', 'Kalsiyum amonyum nitrat (CAN)',
];

export function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(0) + ' ton';
}

export function formatUSD(value: number): string {
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'K';
  return '$' + value.toFixed(0);
}

export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

export function useFertilizerData(activeTab: Tab) {
  const [loading, setLoading] = useState(true);

  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewByType, setOverviewByType] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  const [tradeBalance, setTradeBalance] = useState<any[]>([]);
  const [tradeTimeSeries, setTradeTimeSeries] = useState<any[]>([]);
  const [tradeInsights, setTradeInsights] = useState<Insight[]>([]);

  const [concData, setConcData] = useState<any[]>([]);
  const [concHHI, setConcHHI] = useState<any>(null);
  const [concInsights, setConcInsights] = useState<Insight[]>([]);

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
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [byTypeRes, topImportersRes, topExportersRes, trendRes, prevYearRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) GROUP BY item_tr ORDER BY total DESC`),
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY total DESC LIMIT 20`),
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İhracat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} GROUP BY area ORDER BY total DESC LIMIT 10`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2022' AND element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS}`),
      ]);

      const byType = (byTypeRes.data || []).map((r: any, i: number) => ({
        name: String(r.item_tr), value: Number(r.total) || 0, fill: CHART_COLORS[i % CHART_COLORS.length],
      }));
      setOverviewByType(byType);

      const topCountries = (topImportersRes.data || []).map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey') || name.includes('Turkiye');
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
        worldCAGR: worldCAGR?.cagr || 0,
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

  const loadTrade = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [tradeByTypeRes, turkeyTradeRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) GROUP BY item_tr, element_tr`),
        fetchQuery(`SELECT year, element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) AND CAST(year AS SIGNED) >= 2000 GROUP BY year, element_tr ORDER BY year`),
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
        selfSufficiency: vals.imp > 0 ? (vals.exp / vals.imp * 100) : 0,
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
        year, import: vals.imp, export: vals.exp, balance: vals.imp - vals.exp,
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

  const loadConcentration = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [countryShareRes] = await Promise.all([
        fetchQuery(`SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İhracat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY area ORDER BY total DESC LIMIT 50`),
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
        ins.push({ id: 'cn1', type: hhi.concentration === 'HIGH' ? 'warning' : 'info', message: `Gübre ihracatı konsantrasyonu: HHI ${hhi.hhi.toFixed(0)} (${label}) — İlk 3 pay %${hhi.top3Share.toFixed(1)}`, severity: hhi.concentration === 'HIGH' ? 'high' : 'medium', category: 'HHI' });
      }
      const turkeyInList = data.find((c: any) => c.isTurkey);
      if (turkeyInList) ins.push({ id: 'cn2', type: 'info', message: `Türkiye gübre ihracatında dünya ${turkeyInList.rank}. (${formatTon(turkeyInList.value)})`, severity: 'medium', category: 'Sıralama' });
      setConcInsights(ins);
    } catch (e) { console.error('Concentration hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [turkeyByTypeRes, turkeyTrendRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT item_tr, element_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_input_gubre_ticari WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı','İthalat Değeri','İhracat Değeri') AND item_tr IN (${itemList})`),
        fetchQuery(`SELECT year, SUM(CASE WHEN element_tr='İthalat Miktarı' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as imp, SUM(CASE WHEN element_tr='İhracat Miktarı' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as exp FROM fao_input_gubre_ticari WHERE (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND item_tr IN (${itemList}) AND CAST(year AS SIGNED) >= 2000 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT element_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_input_gubre_ticari WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY element_tr`),
      ]);
      const turkeyData: Record<string, Record<string, number>> = {};
      (turkeyByTypeRes.data || []).forEach((r: any) => {
        const item = String(r.item_tr); const elem = String(r.element_tr);
        if (!turkeyData[item]) turkeyData[item] = {};
        turkeyData[item][elem] = Number(r.val) || 0;
      });
      const worldAvgs: Record<string, number> = {};
      (worldAvgRes.data || []).forEach((r: any) => { worldAvgs[String(r.element_tr)] = Number(r.avg_val) || 0; });
      let totalImp = 0, totalExp = 0, totalImpVal = 0, totalExpVal = 0;
      const byProduct = Object.entries(turkeyData).map(([name, vals]) => {
        const imp = vals['İthalat Miktarı'] || 0; const exp = vals['İhracat Miktarı'] || 0;
        const impVal = vals['İthalat Değeri'] || 0; const expVal = vals['İhracat Değeri'] || 0;
        totalImp += imp; totalExp += exp; totalImpVal += impVal; totalExpVal += expVal;
        return { name, import: imp, export: exp, importValue: impVal, exportValue: expVal, balance: imp - exp };
      }).sort((a, b) => b.import - a.import);
      const trendData = (turkeyTrendRes.data || []).map((r: any) => ({ year: String(r.year), import: Number(r.imp) || 0, export: Number(r.exp) || 0 }));
      setTurkeyTrends(trendData);
      const impTrend: YearValue[] = trendData.map(t => ({ year: t.year, value: t.import }));
      const impCAGR = calculateCAGR(impTrend);
      setTurkeyProfile({
        totalImp, totalExp, totalImpVal, totalExpVal, byProduct,
        tradeRatio: totalExp > 0 ? totalImp / totalExp : Infinity,
        impCAGR: impCAGR?.cagr || 0, worldAvgImp: worldAvgs['İthalat Miktarı'] || 0,
        worldAvgExp: worldAvgs['İhracat Miktarı'] || 0,
      });
      const ins: Insight[] = [];
      ins.push({ id: 'tp1', type: totalImp > totalExp * 3 ? 'warning' : 'info', message: `Türkiye gübre ticareti: İthalat ${formatTon(totalImp)} — İhracat ${formatTon(totalExp)} (oran: ${(totalImp / (totalExp || 1)).toFixed(1)}x)`, severity: 'high', category: 'Denge' });
      if (impCAGR) ins.push({ id: 'tp2', type: impCAGR.cagr > 0 ? 'growth' : 'decline', message: `Gübre ithalatı yıllık %${Math.abs(impCAGR.cagr).toFixed(2)} bileşik büyüme oranıyla ${impCAGR.cagr > 0 ? 'artıyor' : 'azalıyor'}`, severity: 'medium', category: 'Trend' });
      if (byProduct.length > 0) ins.push({ id: 'tp3', type: 'info', message: `En çok ithal edilen: ${byProduct[0].name} (${formatTon(byProduct[0].import)})`, severity: 'low', category: 'Ürün' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Turkey hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND area NOT IN ${EXCLUDED_AREAS} AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE element_tr='İthalat Miktarı' AND item_tr IN (${itemList}) AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND CAST(year AS SIGNED) >= 1990 GROUP BY year ORDER BY year`),
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
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Türkiye gübre ithalatı trendi: BBO %${turkeyTrend.cagr.toFixed(2)}, oynaklık %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: worldTrend.direction === 'up' ? 'growth' : 'info', message: `Dünya gübre ticareti trendi: BBO %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dünya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const itemList = FERTILIZER_ITEMS.map(i => `'${i}'`).join(',');
      const [turkeyNowRes, turkeyBeforeRes, worldAvgRes] = await Promise.all([
        fetchQuery(`SELECT element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı','İthalat Değeri','İhracat Değeri') AND item_tr IN (${itemList}) GROUP BY element_tr`),
        fetchQuery(`SELECT element_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2015' AND (area='Turkiye' OR area='Turkey' OR area='Türkiye') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı','İthalat Değeri','İhracat Değeri') AND item_tr IN (${itemList}) GROUP BY element_tr`),
        fetchQuery(`SELECT element_tr, AVG(CAST(value AS DECIMAL(20,2))) as avg_val FROM fao_input_gubre_ticari WHERE year='2023' AND area NOT IN ${EXCLUDED_AREAS} AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') AND item_tr IN (${itemList}) AND CAST(value AS DECIMAL(20,2)) > 0 GROUP BY element_tr`),
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
        category: a.metric || 'İçgörü',
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

  return {
    loading,
    overviewKPIs, overviewByType, overviewTopCountries, overviewTrend, overviewInsights,
    tradeBalance, tradeTimeSeries, tradeInsights,
    concData, concHHI, concInsights,
    turkeyProfile, turkeyTrends, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
