/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import { fetchAgg, latestYear, num } from '../../services/d1';
import type { Insight } from '../../components/InsightCard';
import { translateCountry } from '../../utils/countryTranslations';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend,
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';

// ---------- TYPES ----------
// D1 toplama rotası — sayfanın tüm sorguları tek tabloya dayanıyor.
// Kıta/toplam satırları sunucudaki 'v1' hazır listesiyle dışlanıyor.
const R = 'fao/input-pestisit-use';
const EX = { preset: 'v1' as const, col: 'area' };
// Filtreler FAO KODLARINA dayanır, Türkçe etiketlere değil: element_tr yıllar
// arasında kayıyor (2022 'Tarımsal Kullanım' → 2023 'Tarımda kullanım',
// 'Ekili alan başına' → 'Ekim alanı başına'). Kod aynı kaldığı için 2023
// verisi etiketle sorulunca boş dönüyordu. Ekranda gösterilecek adlar
// aşağıdaki sabit sözlükten geliyor.
const EC_KULLANIM = 5157;   // Agricultural Use
const EC_YOGUNLUK = 5159;   // Use per area of cropland
const EC_KISI_BASI = 5172;  // Use per capita
const IC_TOPLAM = 1357;     // Pesticides (total)
const IC_HERBISIT = 1320;
const IC_INSEKTISIT = 1309;
const IC_FUNGISIT = 1331;
const IC_RODENTISIT = 1345;
const ANA_TUR_KODLARI = [IC_HERBISIT, IC_INSEKTISIT, IC_FUNGISIT, IC_RODENTISIT];
const PEST_ADI: Record<number, string> = {
  [IC_TOPLAM]: 'Pestisitler (toplam)',
  [IC_HERBISIT]: 'Herbisitler',
  [IC_INSEKTISIT]: 'İnsektisitler',
  [IC_FUNGISIT]: 'Fungisitler ve Bakterisitler',
  [IC_RODENTISIT]: 'Rodentisitler',
};
const ELEMENT_ADI: Record<number, string> = {
  [EC_KULLANIM]: 'Tarımsal Kullanım',
  [EC_YOGUNLUK]: 'Ekili alan başına kullanım',
  [EC_KISI_BASI]: 'Kişi başına kullanım',
};
const pestAdi = (v: unknown) => PEST_ADI[Number(v)] ?? String(v ?? '');
// area alanında Türkiye TEK bir değerle geçiyor; eski OR listesine gerek yok.
const TR = 'Türkiye';

// Yıl kodda sabit (2022) yazılıydı; FAO 2023'ü yayınlayınca sayfa bir yıl
// geriden geliyordu. Artık son DOLU yıl veriden çözülüyor, sonuç modül
// düzeyinde bir kez önbelleğe alınıp tüm sekmelerde paylaşılıyor.
let sonYilCache: Promise<number> | null = null;
const sonYil = () => (sonYilCache ??= latestYear(R, 'year').then((y) => y ?? 2022));

export type Tab = 'overview' | 'composition' | 'concentration' | 'turkey' | 'forecast' | 'alerts';

// ---------- CONSTANTS ----------
export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍' },
  { id: 'composition', label: 'Kullanım Profili', icon: '🧪' },
  { id: 'concentration', label: 'Pazar Yoğunluğu', icon: '🏆' },
  { id: 'turkey', label: 'Türkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'Akıllı Analiz', icon: '🧠' },
];

export const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

// ---------- HELPERS ----------
export function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(1) + ' ton';
}
export function formatKgHa(value: number): string {
  return value.toFixed(2) + ' kg/ha';
}
export function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(1);
}

// ---------- HOOK ----------
export function usePesticideData(activeTab: Tab) {
  const [loading, setLoading] = useState(true);

  // Overview
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewByType, setOverviewByType] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Composition
  const [compData, setCompData] = useState<any[]>([]);
  const [compTrends, setCompTrends] = useState<any[]>([]);
  const [compInsights, setCompInsights] = useState<Insight[]>([]);

  // Concentration
  const [concData, setConcData] = useState<any[]>([]);
  const [concHHI, setConcHHI] = useState<any>(null);
  const [concInsights, setConcInsights] = useState<Insight[]>([]);

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

  // ==================== OVERVIEW ====================
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const yil = await sonYil();
      const [byTypeRes, topCountriesRes, trendRes, prevYearRes, worldTotalRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['itemcode'], sum: ['value'], where: { year: yil, elementcode: EC_KULLANIM }, whereIn: { itemcode: [IC_TOPLAM, ...ANA_TUR_KODLARI] }, orderBy: 'sum_value', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: yil, elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 20 }),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { sum: ['value'], where: { year: yil - 1, elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, exclude: EX }),
        fetchAgg(R, { sum: ['value'], where: { year: yil, elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, exclude: EX }),
      ]);

      const byType = byTypeRes.map((r: any, i: number) => ({
        name: pestAdi(r.itemcode), value: num(r.sum_value), fill: CHART_COLORS[i % CHART_COLORS.length],
      }));
      setOverviewByType(byType);

      const topCountries = topCountriesRes.map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name), value: num(r.sum_value), isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);

      // Eskiden bu yıl için top-20 toplamı alınıp geçen yılın TÜM dünya
      // toplamıyla kıyaslanıyordu; yıllık değişim bu yüzden uydurma çıkıyordu.
      const worldTotal = num(worldTotalRes[0]?.sum_value);
      const prevTotal = num(prevYearRes[0]?.sum_value);
      const yoy = calculateYoY(worldTotal, prevTotal);
      const turkeyData = topCountries.find((c: any) => c.isTurkey);
      const turkeyRank = topCountries.findIndex((c: any) => c.isTurkey) + 1;

      const trendData = trendRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));
      setOverviewTrend(trendData);
      const worldCAGR = calculateCAGR(trendData as YearValue[]);

      setOverviewKPIs({
        worldTotal, yoy, turkeyUsage: turkeyData?.value || 0, turkeyRank: turkeyRank || 'N/A',
        topUser: topCountries[0]?.name || '-', typeCount: byType.filter((b: any) => b.value > 0).length,
        worldCAGR: worldCAGR?.cagr || 0, yil,
      });

      const ins: Insight[] = [];
      ins.push({ id: 'ov1', type: 'info', message: `Dünya toplam pestisit kullanımı ${formatTon(worldTotal)} (${byType.length} tür)`, severity: 'low', category: 'Genel' });
      if (yoy > 5) ins.push({ id: 'ov2', type: 'growth', message: `Pestisit kullanımı önceki yıla göre %${yoy.toFixed(1)} arttı — risk artışı`, severity: 'high', category: 'Trend' });
      else if (yoy < -5) ins.push({ id: 'ov2', type: 'decline', message: `Pestisit kullanımı %${Math.abs(yoy).toFixed(1)} azaldı`, severity: 'medium', category: 'Trend' });
      if (turkeyData) ins.push({ id: 'ov3', type: turkeyRank <= 10 ? 'warning' : 'info', message: `Türkiye pestisit kullanımında dünya ${turkeyRank}. — ${formatTon(turkeyData.value)}${turkeyRank <= 10 ? ' (yüksek kullanım riski)' : ''}`, severity: turkeyRank <= 10 ? 'high' : 'medium', category: 'Türkiye' });
      const herbicide = byType.find((b: any) => b.name.includes('Herbisit'));
      const total = byType.reduce((s: number, b: any) => s + b.value, 0);
      if (herbicide && total > 0) ins.push({ id: 'ov4', type: 'info', message: `Herbisitler toplam pestisitin %${(herbicide.value / total * 100).toFixed(1)}'ini oluşturuyor`, severity: 'low', category: 'Kompozisyon' });
      setOverviewInsights(ins);
    } catch (e) { console.error('Genel Bakış hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== COMPOSITION ====================
  const loadComposition = useCallback(async () => {
    setLoading(true);
    try {
      const yil = await sonYil();
      const [typeByCountryRes, typeTrendRes, intensityRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['itemcode', 'area'], sum: ['value'], where: { year: yil, elementcode: EC_KULLANIM }, whereIn: { itemcode: ANA_TUR_KODLARI }, exclude: EX, orderBy: 'sum_value', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['year', 'itemcode'], sum: ['value'], where: { elementcode: EC_KULLANIM }, whereIn: { itemcode: ANA_TUR_KODLARI }, whereGte: { year: 2000 }, exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['area'], avg: ['value'], where: { year: yil, elementcode: EC_YOGUNLUK, itemcode: IC_TOPLAM }, positive: ['value'], exclude: EX, orderBy: 'avg_value', dir: 'desc', limit: 20 }),
      ]);

      const typeMap: Record<string, { name: string; countries: { country: string; value: number }[] }> = {};
      typeByCountryRes.forEach((r: any) => {
        const type = pestAdi(r.itemcode);
        if (!typeMap[type]) typeMap[type] = { name: type, countries: [] };
        if (typeMap[type].countries.length < 5) {
          typeMap[type].countries.push({ country: translateCountry(String(r.area || '')), value: num(r.sum_value) });
        }
      });
      setCompData(Object.values(typeMap));

      const yearMap: Record<string, Record<string, number>> = {};
      typeTrendRes.forEach((r: any) => {
        const yr = String(r.year);
        if (!yearMap[yr]) yearMap[yr] = {};
        yearMap[yr][pestAdi(r.itemcode)] = num(r.sum_value);
      });
      const trendData = Object.entries(yearMap).sort(([a], [b]) => a.localeCompare(b)).map(([year, types]) => ({ year, ...types }));
      setCompTrends(trendData);

      const intensityData = intensityRes.map((r: any) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey');
        return { name: translateCountry(name), value: num(r.avg_value), isTurkey };
      });

      const ins: Insight[] = [];
      const types = Object.values(typeMap);
      if (types.length > 0) {
        const dominant = types.sort((a, b) => b.countries.reduce((s, c) => s + c.value, 0) - a.countries.reduce((s, c) => s + c.value, 0))[0];
        ins.push({ id: 'cp1', type: 'info', message: `En çok kullanılan alt tür: ${dominant.name} — Lider: ${dominant.countries[0]?.country || '-'}`, severity: 'medium', category: 'Kompozisyon' });
      }
      const turkeyIntensity = intensityData.find(c => c.isTurkey);
      const worldAvgIntensity = intensityData.length > 0 ? intensityData.reduce((s, c) => s + c.value, 0) / intensityData.length : 0;
      if (turkeyIntensity) ins.push({ id: 'cp2', type: turkeyIntensity.value > worldAvgIntensity * 1.5 ? 'warning' : 'achievement', message: `Türkiye pestisit yoğunluğu: ${formatKgHa(turkeyIntensity.value)} (Dünya ort: ${formatKgHa(worldAvgIntensity)})`, severity: turkeyIntensity.value > worldAvgIntensity * 1.5 ? 'high' : 'medium', category: 'Yoğunluk' });
      setCompInsights(ins);
    } catch (e) { console.error('Kullanım Profili hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== CONCENTRATION ====================
  const loadConcentration = useCallback(async () => {
    setLoading(true);
    try {
      const yil = await sonYil();
      const [countryShareRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: yil, elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, positive: ['value'], exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 50 }),
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
        ins.push({ id: 'cn1', type: hhi.concentration === 'HIGH' ? 'warning' : 'info', message: `Pestisit kullanım konsantrasyonu: HHI ${hhi.hhi.toFixed(0)} (${label}) — Top 3 pay %${hhi.top3Share.toFixed(1)}`, severity: hhi.concentration === 'HIGH' ? 'high' : 'medium', category: 'HHI' });
      }
      if (data.length >= 2) {
        const top1Share = (data[0].value / shares.reduce((s: number, v: number) => s + v, 0)) * 100;
        ins.push({ id: 'cn2', type: top1Share > 30 ? 'warning' : 'info', message: `${data[0].country} tek başına dünya kullanımının %${top1Share.toFixed(1)}'ini oluşturuyor`, severity: top1Share > 30 ? 'high' : 'medium', category: 'Hakimiyet' });
      }
      setConcInsights(ins);
    } catch (e) { console.error('Pazar Yoğunluğu hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== TURKEY PROFILE ====================
  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const yil = await sonYil();
      const [turkeyByTypeRes, turkeyTrendRes, turkeyIntensityRes, worldAvgRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['itemcode', 'elementcode'], sum: ['value'], where: { year: yil, area: TR }, whereIn: { elementcode: [EC_KULLANIM, EC_YOGUNLUK, EC_KISI_BASI], itemcode: [IC_TOPLAM, ...ANA_TUR_KODLARI] } }),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { area: TR, elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, whereGte: { year: 2000 }, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { sum: ['value'], where: { year: yil, area: TR, elementcode: EC_YOGUNLUK, itemcode: IC_TOPLAM } }),
        fetchAgg(R, { avg: ['value'], where: { year: yil, elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, positive: ['value'], exclude: EX }),
      ]);

      const byType: Record<string, Record<string, number>> = {};
      turkeyByTypeRes.forEach((r: any) => {
        const item = pestAdi(r.itemcode);
        const elem = (ELEMENT_ADI[Number(r.elementcode)] ?? '');
        if (!byType[item]) byType[item] = {};
        byType[item][elem] = num(r.sum_value);
      });

      const totalUsage = byType['Pestisitler (toplam)']?.['Tarımsal Kullanım'] || 0;
      const kgHa = num(turkeyIntensityRes[0]?.sum_value);
      const worldAvg = num(worldAvgRes[0]?.avg_value);

      const composition = Object.entries(byType).filter(([name]) => name !== 'Pestisitler (toplam)').map(([name, vals]) => ({
        name, tonaj: vals['Tarımsal Kullanım'] || 0,
        kgHa: vals['Ekili alan başına kullanım'] || 0,
        kgKisi: vals['Kişi başına kullanım'] || 0,
        share: totalUsage > 0 ? ((vals['Tarımsal Kullanım'] || 0) / totalUsage * 100) : 0,
      })).sort((a, b) => b.tonaj - a.tonaj);

      const trendData = turkeyTrendRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));
      setTurkeyTrends(trendData);
      const trendAnalysis = analyzeTrend(trendData as YearValue[]);

      setTurkeyProfile({
        totalUsage, kgHa, worldAvg, composition,
        cagr: trendAnalysis?.cagr || 0,
        vsWorldAvg: worldAvg > 0 ? ((totalUsage - worldAvg) / worldAvg * 100) : 0,
        direction: trendAnalysis?.direction || 'stable',
      });

      const ins: Insight[] = [];
      ins.push({ id: 'tp1', type: 'info', message: `Türkiye toplam pestisit kullanımı: ${formatTon(totalUsage)} (Yoğunluk: ${formatKgHa(kgHa)})`, severity: 'medium', category: 'Kullanım' });
      if (kgHa > 3) ins.push({ id: 'tp2', type: 'warning', message: `Pestisit yoğunluğu ${formatKgHa(kgHa)} — AB ortalamasının üzerinde olabilir`, severity: 'high', category: 'Yoğunluk' });
      if (composition.length > 0) {
        const dominant = composition[0];
        ins.push({ id: 'tp3', type: 'info', message: `En çok kullanılan: ${dominant.name} (%${dominant.share.toFixed(1)} pay, ${formatTon(dominant.tonaj)})`, severity: 'low', category: 'Kompozisyon' });
      }
      if (trendAnalysis) ins.push({ id: 'tp4', type: trendAnalysis.direction === 'up' ? 'growth' : 'decline', message: `Türkiye pestisit trendi: BBO %${trendAnalysis.cagr.toFixed(2)} (${trendAnalysis.direction === 'up' ? 'artıyor' : 'azalıyor'})`, severity: 'medium', category: 'Trend' });
      setTurkeyInsights(ins);
    } catch (e) { console.error('Türkiye Profili hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== FORECAST ====================
  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const [worldTrendRes, turkeyTrendRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, whereGte: { year: 1990 }, exclude: EX, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { elementcode: EC_KULLANIM, itemcode: IC_TOPLAM, area: TR }, whereGte: { year: 1990 }, orderBy: 'year', dir: 'asc' }),
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
      if (turkeyTrend) ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Türkiye pestisit trendi: BBO %${turkeyTrend.cagr.toFixed(2)}, oynaklık %${turkeyTrend.volatility.toFixed(1)}`, severity: 'high', category: 'Tahmin' });
      if (worldTrend) ins.push({ id: 'fc2', type: worldTrend.direction === 'up' ? 'growth' : 'info', message: `Dünya pestisit trendi: BBO %${worldTrend.cagr.toFixed(2)}`, severity: 'medium', category: 'Dünya' });
      if (turkeyTrend && worldTrend && turkeyTrend.cagr > worldTrend.cagr * 1.5) ins.push({ id: 'fc3', type: 'warning', message: `Türkiye pestisit artış hızı dünya ortalamasının ${(turkeyTrend.cagr / (worldTrend.cagr || 1)).toFixed(1)}x katı`, severity: 'high', category: 'Uyarı' });
      setForecastInsights(ins);
    } catch (e) { console.error('Trend & Tahmin hatası:', e); }
    finally { setLoading(false); }
  }, []);

  // ==================== INTELLIGENCE ALERTS ====================
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const yil = await sonYil();
      const [turkeyNowRes, turkeyBeforeRes, worldAvgRes, intensityRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['itemcode'], sum: ['value'], where: { year: yil, area: TR, elementcode: EC_KULLANIM }, whereIn: { itemcode: [IC_TOPLAM, IC_HERBISIT, IC_INSEKTISIT, IC_FUNGISIT] } }),
        fetchAgg(R, { groupBy: ['itemcode'], sum: ['value'], where: { year: 2015, area: TR, elementcode: EC_KULLANIM }, whereIn: { itemcode: [IC_TOPLAM, IC_HERBISIT, IC_INSEKTISIT, IC_FUNGISIT] } }),
        fetchAgg(R, { avg: ['value'], where: { year: yil, elementcode: EC_KULLANIM, itemcode: IC_TOPLAM }, positive: ['value'], exclude: EX }),
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: yil, elementcode: EC_YOGUNLUK, itemcode: IC_TOPLAM, area: TR } }),
      ]);

      const now: Record<string, number> = {};
      turkeyNowRes.forEach((r: any) => now[pestAdi(r.itemcode)] = num(r.sum_value));
      const before: Record<string, number> = {};
      turkeyBeforeRes.forEach((r: any) => before[pestAdi(r.itemcode)] = num(r.sum_value));
      const worldAvg = num(worldAvgRes[0]?.avg_value);
      const turkeyIntensity = num(intensityRes[0]?.sum_value);

      const alerts: IntelligenceAlert[] = [];
      const totalNow = now['Pestisitler (toplam)'] || 0;
      const totalBefore = before['Pestisitler (toplam)'] || 0;
      if (totalBefore > 0) {
        const change = ((totalNow - totalBefore) / totalBefore) * 100;
        alerts.push({ id: 'int-pest-change', severity: change > 30 ? 'critical' : change > 10 ? 'warning' : change > 0 ? 'info' : 'positive', title: `Pestisit Kullanım Değişimi (2015-${yil})`, message: `Toplam pestisit kullanımı %${change.toFixed(1)} ${change > 0 ? 'arttı' : 'azaldı'} (${formatTon(totalBefore)} -> ${formatTon(totalNow)})`, metric: 'Kullanım trendi', value: change });
      }
      if (worldAvg > 0 && totalNow > 0) {
        const vsAvg = totalNow / worldAvg;
        alerts.push({ id: 'int-vs-world', severity: vsAvg > 3 ? 'warning' : 'info', title: 'Dünya Ortalamasına Göre', message: `Türkiye pestisit kullanımı dünya ülke ortalamasının ${vsAvg.toFixed(1)}x katı`, metric: 'Kıyaslama', value: vsAvg });
      }
      if (turkeyIntensity > 0) {
        alerts.push({ id: 'int-intensity', severity: turkeyIntensity > 5 ? 'critical' : turkeyIntensity > 2 ? 'warning' : 'positive', title: 'Pestisit Yoğunluğu', message: `Hektar başına ${formatKgHa(turkeyIntensity)} pestisit kullanılıyor${turkeyIntensity > 3 ? ' — AB sürdürülebilirlik hedeflerinin üzerinde' : ''}`, metric: 'kg/ha', value: turkeyIntensity });
      }
      ['Herbisitler', 'İnsektisitler', 'Fungisitler ve Bakterisitler'].forEach(type => {
        const n = now[type] || 0; const b = before[type] || 0;
        if (b > 0) {
          const ch = ((n - b) / b) * 100;
          if (Math.abs(ch) > 20) {
            alerts.push({ id: `int-${type}`, severity: ch > 30 ? 'warning' : ch < -20 ? 'positive' : 'info', title: `${type} Degisimi`, message: `${type}: %${ch.toFixed(1)} ${ch > 0 ? 'artis' : 'azalis'} (2015-${yil})`, metric: type, value: ch });
          }
        }
      });

      setIntelligenceAlerts(alerts);
      setAllInsights(alerts.map(a => ({
        id: a.id,
        type: a.severity === 'critical' ? 'decline' as const : a.severity === 'warning' ? 'warning' as const : a.severity === 'positive' ? 'achievement' as const : 'info' as const,
        message: a.title + ': ' + a.message,
        severity: a.severity === 'critical' ? 'high' as const : a.severity === 'warning' ? 'medium' as const : 'low' as const,
        category: a.metric || 'İçgörü',
      })));
    } catch (e) { console.error('Intelligence hatası:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    switch (activeTab) {
      case 'overview': loadOverview(); break;
      case 'composition': loadComposition(); break;
      case 'concentration': loadConcentration(); break;
      case 'turkey': loadTurkeyProfile(); break;
      case 'forecast': loadForecast(); break;
      case 'alerts': loadAlerts(); break;
    }
  }, [activeTab, loadOverview, loadComposition, loadConcentration, loadTurkeyProfile, loadForecast, loadAlerts]);

  return {
    loading,
    overviewKPIs, overviewByType, overviewTopCountries, overviewTrend, overviewInsights,
    compData, compTrends, compInsights,
    concData, concHHI, concInsights,
    turkeyProfile, turkeyTrends, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
