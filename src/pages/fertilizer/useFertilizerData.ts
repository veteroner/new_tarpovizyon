import { kisa, eksen, yuzde } from '../../utils/sayi';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { fetchAgg, num } from '../../services/d1';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';
import type { Insight } from '../../components/InsightCard';

export type Tab = 'overview' | 'trade' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

export const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

// D1 toplama rotası — sayfanın tüm sorguları tek tabloya dayanıyor.
const R = 'fao/input-gubre-ticari';
const EX = { preset: 'v1' as const, col: 'area' };
const ITHALAT = 'İthalat Miktarı';
const IHRACAT = 'İhracat Miktarı';
const DEGER_ELEMENTLERI = [ITHALAT, IHRACAT, 'İthalat Değeri', 'İhracat Değeri'];
// area alanında Türkiye TEK bir değerle geçiyor; eski OR zincirine gerek yok.
const TR = 'Türkiye';

export const FERTILIZER_ITEMS = [
  'Üre', 'Diamonyum fosfat (DAP)', 'NPK gübreleri', 'Amonyum nitrat (AN)',
  'Amonyum sülfat', 'Potasyum klorür (MOP)', 'Monoamonyum fosfat (MAP)', 'Kalsiyum amonyum nitrat (CAN)',
];

export function formatTon(value: number): string {
  return kisa(value, { birim: 'ton' });
}

export function formatUSD(value: number): string {
  return kisa(value);
}

export function formatShort(value: number): string {
  return eksen(value);
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
      const [byTypeRes, topImportersRes, topExportersRes, trendRes, prevYearRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: 2023, element_tr: ITHALAT }, whereIn: { item_tr: FERTILIZER_ITEMS }, orderBy: 'sum_value', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: 2023, element_tr: ITHALAT }, whereIn: { item_tr: FERTILIZER_ITEMS }, exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 20 }),
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: 2023, element_tr: IHRACAT }, whereIn: { item_tr: FERTILIZER_ITEMS }, exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 10 }),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { element_tr: ITHALAT }, whereIn: { item_tr: FERTILIZER_ITEMS }, exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { sum: ['value'], where: { year: 2022, element_tr: ITHALAT }, whereIn: { item_tr: FERTILIZER_ITEMS }, exclude: EX }),
      ]);

      const byType = byTypeRes.map((r: any, i: number) => ({
        name: String(r.item_tr), value: num(r.sum_value), fill: CHART_COLORS[i % CHART_COLORS.length],
      }));
      setOverviewByType(byType);

      const topCountries = topImportersRes.map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name), value: num(r.sum_value), isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);

      const worldTotal = byType.reduce((s: number, b: any) => s + b.value, 0);
      const prevTotal = num(prevYearRes[0]?.sum_value);
      const yoy = calculateYoY(worldTotal, prevTotal);
      const turkeyData = topCountries.find((c: any) => c.isTurkey);
      const turkeyRank = topCountries.findIndex((c: any) => c.isTurkey) + 1;
      const trendData = trendRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));
      setOverviewTrend(trendData);
      const worldCAGR = calculateCAGR(trendData as YearValue[]);
      const topExporter = topExportersRes[0];

      setOverviewKPIs({
        worldTotal, yoy, turkeyImport: turkeyData?.value || 0, turkeyRank: turkeyRank || 'N/A',
        fertCount: byType.length, topImporter: topCountries[0]?.name || '-',
        topExporter: topExporter ? translateCountry(String(topExporter.area || '')) : '-',
        worldCAGR: worldCAGR?.cagr || 0,
      });

      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dünya gübre ithalatı ${formatTon(worldTotal)} (${byType.length} ana gübre türü)`, severity: 'low', category: 'Kapsam' });
      if (yoy > 5) ins.push({ id: 'ov2', type: 'growth', message: `Gübre ithalatı önceki yıla göre ${yuzde(yoy, 1)} arttı — talep artışı`, severity: 'high', category: 'Trend' });
      else if (yoy < -5) ins.push({ id: 'ov2', type: 'decline', message: `Gübre ithalatı ${yuzde(Math.abs(yoy), 1)} azaldı`, severity: 'high', category: 'Trend' });
      if (turkeyData) ins.push({ id: 'ov3', type: turkeyRank <= 10 ? 'achievement' : 'info', message: `Türkiye gübre ithalatında dünya ${turkeyRank}. — ${formatTon(turkeyData.value)}`, severity: 'medium', category: 'Türkiye' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Overview hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadTrade = useCallback(async () => {
    setLoading(true);
    try {
      const [tradeByTypeRes, turkeyTradeRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['item_tr', 'element_tr'], sum: ['value'], where: { year: 2023, area: TR }, whereIn: { element_tr: [ITHALAT, IHRACAT], item_tr: FERTILIZER_ITEMS } }),
        fetchAgg(R, { groupBy: ['year', 'element_tr'], sum: ['value'], where: { area: TR }, whereIn: { element_tr: [ITHALAT, IHRACAT], item_tr: FERTILIZER_ITEMS }, whereGte: { year: 2000 }, orderBy: 'year', dir: 'asc' }),
      ]);

      const tradeByType: Record<string, { imp: number; exp: number }> = {};
      tradeByTypeRes.forEach((r: any) => {
        const item = String(r.item_tr);
        if (!tradeByType[item]) tradeByType[item] = { imp: 0, exp: 0 };
        if (String(r.element_tr).includes('thalat')) tradeByType[item].imp = num(r.sum_value);
        else tradeByType[item].exp = num(r.sum_value);
      });
      const balanceData = Object.entries(tradeByType).map(([name, vals]) => ({
        name, import: vals.imp, export: vals.exp, balance: vals.imp - vals.exp,
        selfSufficiency: vals.imp > 0 ? (vals.exp / vals.imp * 100) : 0,
      })).sort((a, b) => b.import - a.import);
      setTradeBalance(balanceData);

      const timeByYear: Record<string, { imp: number; exp: number }> = {};
      turkeyTradeRes.forEach((r: any) => {
        const yr = String(r.year);
        if (!timeByYear[yr]) timeByYear[yr] = { imp: 0, exp: 0 };
        if (String(r.element_tr).includes('thalat')) timeByYear[yr].imp = num(r.sum_value);
        else timeByYear[yr].exp = num(r.sum_value);
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
      const [countryShareRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: 2023, element_tr: IHRACAT }, whereIn: { item_tr: FERTILIZER_ITEMS }, positive: ['value'], exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 50 }),
      ]);
      const data = countryShareRes.map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey');
        return { rank: i + 1, country: translateCountry(name), rawName: name, value: num(r.sum_value), isTurkey };
      });
      setConcData(data);
      const shares = data.map((c: any) => c.value);
      const hhi = calculateHHI(shares);
      setConcHHI(hhi);
      const ins: Insight[] = [];
      if (hhi) {
        const label = hhi.concentration === 'LOW' ? 'düşük' : hhi.concentration === 'MODERATE' ? 'orta' : 'yüksek';
        ins.push({ id: 'cn1', type: hhi.concentration === 'HIGH' ? 'warning' : 'info', message: `Gübre ihracatı konsantrasyonu: HHI ${hhi.hhi.toFixed(0)} (${label}) — İlk 3 pay ${yuzde(hhi.top3Share, 1)}`, severity: hhi.concentration === 'HIGH' ? 'high' : 'medium', category: 'HHI' });
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
      const [turkeyByTypeRes, turkeyTrendRes, worldAvgRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['item_tr', 'element_tr'], sum: ['value'], where: { year: 2023, area: TR }, whereIn: { element_tr: DEGER_ELEMENTLERI, item_tr: FERTILIZER_ITEMS } }),
        fetchAgg(R, { groupBy: ['year', 'element_tr'], sum: ['value'], where: { area: TR }, whereIn: { item_tr: FERTILIZER_ITEMS }, whereGte: { year: 2000 }, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['element_tr'], avg: ['value'], where: { year: 2023 }, whereIn: { element_tr: [ITHALAT, IHRACAT], item_tr: FERTILIZER_ITEMS }, positive: ['value'], exclude: EX }),
      ]);
      const turkeyData: Record<string, Record<string, number>> = {};
      turkeyByTypeRes.forEach((r: any) => {
        const item = String(r.item_tr); const elem = String(r.element_tr);
        if (!turkeyData[item]) turkeyData[item] = {};
        turkeyData[item][elem] = num(r.sum_value);
      });
      const worldAvgs: Record<string, number> = {};
      worldAvgRes.forEach((r: any) => { worldAvgs[String(r.element_tr)] = num(r.avg_value); });
      let totalImp = 0, totalExp = 0, totalImpVal = 0, totalExpVal = 0;
      const byProduct = Object.entries(turkeyData).map(([name, vals]) => {
        const imp = vals['İthalat Miktarı'] || 0; const exp = vals['İhracat Miktarı'] || 0;
        const impVal = vals['İthalat Değeri'] || 0; const expVal = vals['İhracat Değeri'] || 0;
        totalImp += imp; totalExp += exp; totalImpVal += impVal; totalExpVal += expVal;
        return { name, import: imp, export: exp, importValue: impVal, exportValue: expVal, balance: imp - exp };
      }).sort((a, b) => b.import - a.import);
      // Eski sorgudaki SUM(CASE WHEN element_tr=…) koşullu toplaması burada
      // yapılıyor: uç yıl × element_tr döndürüyor, ithalat/ihracat pivotlanıyor.
      const trendByYear: Record<string, { import: number; export: number }> = {};
      turkeyTrendRes.forEach((r: any) => {
        const y = String(r.year);
        if (!trendByYear[y]) trendByYear[y] = { import: 0, export: 0 };
        if (String(r.element_tr).includes('thalat')) trendByYear[y].import += num(r.sum_value);
        else if (String(r.element_tr).includes('hracat')) trendByYear[y].export += num(r.sum_value);
      });
      const trendData = Object.keys(trendByYear).sort().map((year) => ({ year, ...trendByYear[year] }));
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
      if (impCAGR) ins.push({ id: 'tp2', type: impCAGR.cagr > 0 ? 'growth' : 'decline', message: `Gübre ithalatı yıllık ${yuzde(Math.abs(impCAGR.cagr), 2)} bileşik büyüme oranıyla ${impCAGR.cagr > 0 ? 'artıyor' : 'azalıyor'}`, severity: 'medium', category: 'Trend' });
      if (byProduct.length > 0) ins.push({ id: 'tp3', type: 'info', message: `En çok ithal edilen: ${byProduct[0].name} (${formatTon(byProduct[0].import)})`, severity: 'low', category: 'Ürün' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Turkey hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { element_tr: ITHALAT }, whereIn: { item_tr: FERTILIZER_ITEMS }, whereGte: { year: 1990 }, exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { element_tr: ITHALAT, area: TR }, whereIn: { item_tr: FERTILIZER_ITEMS }, whereGte: { year: 1990 }, orderBy: 'year', dir: 'asc' }),
      ]);
      const worldData: YearValue[] = worldTrendRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));
      const turkeyData: YearValue[] = turkeyTrendRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));
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
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Türkiye gübre ithalatı trendi: BBO ${yuzde(turkeyTrend.cagr, 2)}, oynaklık ${yuzde(turkeyTrend.volatility, 1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: worldTrend.direction === 'up' ? 'growth' : 'info', message: `Dünya gübre ticareti trendi: BBO ${yuzde(worldTrend.cagr, 2)}`, severity: 'medium', category: 'Dünya' });
      setForecastInsights(ins);
    } catch (e) { console.error('Forecast hatasi:', e); }
    finally { setLoading(false); }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyNowRes, turkeyBeforeRes, worldAvgRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['element_tr'], sum: ['value'], where: { year: 2023, area: TR }, whereIn: { element_tr: DEGER_ELEMENTLERI, item_tr: FERTILIZER_ITEMS } }),
        fetchAgg(R, { groupBy: ['element_tr'], sum: ['value'], where: { year: 2015, area: TR }, whereIn: { element_tr: DEGER_ELEMENTLERI, item_tr: FERTILIZER_ITEMS } }),
        fetchAgg(R, { groupBy: ['element_tr'], avg: ['value'], where: { year: 2023 }, whereIn: { element_tr: [ITHALAT, IHRACAT], item_tr: FERTILIZER_ITEMS }, positive: ['value'], exclude: EX }),
      ]);
      const now: Record<string, number> = {};
      turkeyNowRes.forEach((r: any) => now[String(r.element_tr)] = num(r.sum_value));
      const before: Record<string, number> = {};
      turkeyBeforeRes.forEach((r: any) => before[String(r.element_tr)] = num(r.sum_value));
      const worldAvg: Record<string, number> = {};
      worldAvgRes.forEach((r: any) => worldAvg[String(r.element_tr)] = num(r.avg_value));

      const alerts: IntelligenceAlert[] = [];
      const impNow = now['İthalat Miktarı'] || 0;
      const impBefore = before['İthalat Miktarı'] || 0;
      if (impBefore > 0) {
        const change = ((impNow - impBefore) / impBefore) * 100;
        alerts.push({ id: 'int-imp-change', severity: change > 30 ? 'warning' : change > 0 ? 'info' : 'positive', title: 'İthalat Değişimi (2015-2022)', message: `Gübre ithalatı ${yuzde(change, 1)} ${change > 0 ? 'arttı' : 'azaldı'} (${formatTon(impBefore)} → ${formatTon(impNow)})`, metric: 'İthalat trendi', value: change });
      }
      const expNow = now['İhracat Miktarı'] || 0;
      const expBefore = before['İhracat Miktarı'] || 0;
      if (expBefore > 0) {
        const change = ((expNow - expBefore) / expBefore) * 100;
        alerts.push({ id: 'int-exp-change', severity: change > 20 ? 'positive' : 'info', title: 'İhracat Performansı', message: `Gübre ihracatı ${yuzde(change, 1)} ${change > 0 ? 'arttı' : 'azaldı'}`, metric: 'İhracat trendi', value: change });
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
