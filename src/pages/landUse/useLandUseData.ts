import { kisa, eksen, yuzde } from '../../utils/sayi';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { fetchAgg, num } from '../../services/d1';
import { translateCountry } from '../../utils/countryTranslations';
import type { Insight } from '../../components/InsightCard';
import {
  calculateCAGR, calculateHHI, forecastLinear, detectAnomalies, calculateYoY,
  analyzeTrend,
} from '../../utils/intelligenceCalculations';
import type { YearValue, IntelligenceAlert } from '../../utils/intelligenceCalculations';

// D1 toplama rotası; kıta/toplam satırları sunucudaki 'v1' listesiyle dışlanır.
const R = 'fao/land-use';
const EX = { preset: 'v1' as const, col: 'area' };
// area alanında Türkiye TEK bir değerle geçiyor; eski OR zincirine gerek yok.
const TR = 'Türkiye';
const TARIM = 'Tarım arazisi';
const SULAMA = 'Sulama altyapısı bulunan arazi';
const ITEMS = ['Tarım arazisi', 'İşlenebilir arazi', 'Sürekli çayırlar ve meralar', 'Orman alanı', 'Geçici nadas alanı', 'Sulama altyapısı bulunan arazi', 'Ekili alan', 'Çok yıllık ürünler'];
const TREND_ITEMS = ['Tarım arazisi', 'İşlenebilir arazi', 'Orman alanı', 'Sulama altyapısı bulunan arazi'];
const RADAR_ITEMS = ['Tarım arazisi', 'İşlenebilir arazi', 'Sürekli çayırlar ve meralar', 'Orman alanı', 'Sulama altyapısı bulunan arazi', 'Geçici nadas alanı'];
const ALERT_ITEMS = ['Tarım arazisi', 'İşlenebilir arazi', 'Sürekli çayırlar ve meralar', 'Orman alanı', 'Sulama altyapısı bulunan arazi', 'Geçici nadas alanı', 'Ekili alan'];

/* ── Types ─────────────────────────────────────────────────── */
export type Tab = 'overview' | 'transformation' | 'benchmark' | 'turkey' | 'forecast' | 'alerts';

/* ── Constants ─────────────────────────────────────────────── */
export const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

interface LandUseCrosswalkTarget {
  target: string;
  weight: number;
  rationale: string;
}

interface LandUseCrosswalkRule {
  source: string;
  targets: LandUseCrosswalkTarget[];
}

interface CsvTransitionRow {
  source_item: string;
  target_item: string;
  weight: number;
  rationale: string;
  source_system?: string;
  target_system?: string;
  valid_from_year?: string;
  valid_to_year?: string;
  notes?: string;
}

export const LAND_USE_CROSSWALK_RULES: LandUseCrosswalkRule[] = [
  {
    source: 'Geçici nadas alanı',
    targets: [
      { target: 'Ekili alan', weight: 0.5, rationale: 'Kısa vadede tekrar üretime dönme olasılığı en yüksek yüzey.' },
      { target: 'İşlenebilir arazi', weight: 0.25, rationale: 'Nadas alanı çoğu zaman işlenebilir stok içinde yeniden emilir.' },
      { target: 'Çok yıllık ürünler', weight: 0.15, rationale: 'Bahçe ve çok yıllık dikim dönüşümü sınırlı ama olası.' },
      { target: 'Sürekli çayırlar ve meralar', weight: 0.1, rationale: 'Kullanım bırakılan parsellerin mera rejimine kayması mümkün.' },
    ],
  },
  {
    source: 'İşlenebilir arazi',
    targets: [
      { target: 'Ekili alan', weight: 0.45, rationale: 'İşlenebilir yüzeyin önemli kısmı fiilen ekili alana dönüşür.' },
      { target: 'Çok yıllık ürünler', weight: 0.2, rationale: 'Meyve-bahçe kurulumları işlenebilir tabandan beslenir.' },
      { target: 'Sürekli çayırlar ve meralar', weight: 0.2, rationale: 'Kullanım yoğunluğu düşen alanlar otlak rejimine kayabilir.' },
      { target: 'Orman alanı', weight: 0.15, rationale: 'Ormanlaştırma veya doğal geri kazanım etkisi sınırlı ama mümkündür.' },
    ],
  },
  {
    source: 'Sürekli çayırlar ve meralar',
    targets: [
      { target: 'Ekili alan', weight: 0.35, rationale: 'Tarımsal genişleme çoğu zaman mera çözülmesinden beslenir.' },
      { target: 'İşlenebilir arazi', weight: 0.25, rationale: 'İlk geçiş çoğu durumda işlenebilir stok olarak görünür.' },
      { target: 'Orman alanı', weight: 0.25, rationale: 'Terk edilen meraların doğal ardıllıkla ormana dönmesi mümkündür.' },
      { target: 'Çok yıllık ürünler', weight: 0.15, rationale: 'Daha yoğun kullanım senaryosunda çok yıllık dikim oluşabilir.' },
    ],
  },
  {
    source: 'Orman alanı',
    targets: [
      { target: 'İşlenebilir arazi', weight: 0.35, rationale: 'Arazi açılması önce işlenebilir sınıfta görünür.' },
      { target: 'Ekili alan', weight: 0.35, rationale: 'Doğrudan tarıma açılan alan etkisi.' },
      { target: 'Sürekli çayırlar ve meralar', weight: 0.2, rationale: 'Orman çözülmesi sonrası düşük yoğunluklu kullanım.' },
      { target: 'Çok yıllık ürünler', weight: 0.1, rationale: 'Sınırlı bağ-bahçe dönüşümleri.' },
    ],
  },
  {
    source: 'Ekili alan',
    targets: [
      { target: 'İşlenebilir arazi', weight: 0.4, rationale: 'Ekim deseninden çıkan yüzey önce işlenebilir stokta görünür.' },
      { target: 'Geçici nadas alanı', weight: 0.25, rationale: 'Dinlendirme ve döngüsel nadas etkisi.' },
      { target: 'Çok yıllık ürünler', weight: 0.2, rationale: 'Bahçe ve kalıcı ürün desenine geçiş.' },
      { target: 'Sürekli çayırlar ve meralar', weight: 0.15, rationale: 'Düşük yoğunluklu kullanıma çekilme.' },
    ],
  },
  {
    source: 'Çok yıllık ürünler',
    targets: [
      { target: 'Ekili alan', weight: 0.35, rationale: 'Bahçeden tarla desenine geri dönüş.' },
      { target: 'İşlenebilir arazi', weight: 0.3, rationale: 'Söküm sonrası işlenebilir stokta iz bırakması.' },
      { target: 'Orman alanı', weight: 0.2, rationale: 'Terk edilen perennial alanların doğal geri kazanımı.' },
      { target: 'Geçici nadas alanı', weight: 0.15, rationale: 'Üretim dışına çıkan alanın geçici bekleme dönemi.' },
    ],
  },
];

const LAND_USE_TRANSITION_MATRIX_PATH = '/data/land-use-transition-matrix.csv';
export const LAND_USE_TRANSITION_OVERRIDE_STORAGE_KEY = 'land-use-transition-matrix-override';

/* ── Format helpers ────────────────────────────────────────── */
export function formatArea(value: number): string {
  return kisa(value, { birim: 'ha' });
}

export function formatShort(value: number): string {
  return eksen(value);
}

export function formatPercent(value: number): string {
  return '%' + value.toFixed(1);
}

function shortLandUseLabel(name: string): string {
  return name
    .replace('Sürekli çayırlar ve meralar', 'Mera')
    .replace('Geçici nadas alanı', 'Nadas')
    .replace('İşlenebilir arazi', 'İşlenebilir')
    .replace('Çok yıllık ürünler', 'Cok Yillik')
    .replace('Ekili alan', 'Ekili')
    .replace('Orman alanı', 'Orman');
}

function buildCrosswalkLinks(
  normalized: Array<any>,
  nodeIndex: Map<string, number>,
  matchedFlow: number,
  totalLoss: number,
  crosswalkRules: LandUseCrosswalkRule[],
) {
  const gainMap = new Map(normalized.map(item => [item.name, item.gain]));
  const ruleMap = new Map(crosswalkRules.map(rule => [rule.source, rule.targets]));
  const links: Array<{ source: number; target: number; value: number }> = [];
  let allocatedMatchedFlow = 0;

  normalized.forEach(item => {
    if (item.loss <= 0 || matchedFlow <= 0) return;
    const preferredTargets = (ruleMap.get(item.name) || [])
      .map(target => ({ ...target, availableGain: gainMap.get(target.target) || 0 }))
      .filter(target => target.availableGain > 0);
    const weightTotal = preferredTargets.reduce((sum, target) => sum + (target.weight * target.availableGain), 0);
    if (weightTotal <= 0) return;

    const matchedLoss = totalLoss > 0 ? matchedFlow * (item.loss / totalLoss) : 0;
    preferredTargets.forEach(target => {
      const value = matchedLoss * ((target.weight * target.availableGain) / weightTotal);
      if (value <= 1) return;
      links.push({
        source: nodeIndex.get(`${item.shortName}-start`)!,
        target: nodeIndex.get(`${shortLandUseLabel(target.target)}-end`)!,
        value,
      });
      allocatedMatchedFlow += value;
    });
  });

  return { links, allocatedMatchedFlow };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values.map(value => value.replace(/^"|"$/g, ''));
}

function parseTransitionMatrixCsv(text: string): CsvTransitionRow[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const columns = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] || '';
    });
    return {
      source_item: row.source_item || '',
      target_item: row.target_item || '',
      weight: Number(row.weight) || 0,
      rationale: row.rationale || '',
      source_system: row.source_system || '',
      target_system: row.target_system || '',
      valid_from_year: row.valid_from_year || '',
      valid_to_year: row.valid_to_year || '',
      notes: row.notes || '',
    };
  });
}

function normalizeTransitionRows(rows: CsvTransitionRow[]): LandUseCrosswalkRule[] {
  const grouped = new Map<string, LandUseCrosswalkTarget[]>();
  rows.forEach(row => {
    if (!row.source_item || !row.target_item || row.weight <= 0) return;
    const targets = grouped.get(row.source_item) || [];
    targets.push({
      target: row.target_item,
      weight: row.weight,
      rationale: row.rationale || row.notes || 'CSV override kuralı',
    });
    grouped.set(row.source_item, targets);
  });

  return Array.from(grouped.entries()).map(([source, targets]) => ({
    source,
    targets,
  }));
}

async function loadTransitionMatrixOverrides(): Promise<{ rules: LandUseCrosswalkRule[]; source: string } | null> {
  try {
    if (typeof window !== 'undefined') {
      const localOverride = window.localStorage.getItem(LAND_USE_TRANSITION_OVERRIDE_STORAGE_KEY);
      if (localOverride) {
        const normalizedLocal = normalizeTransitionRows(parseTransitionMatrixCsv(localOverride));
        if (normalizedLocal.length > 0) {
          return { rules: normalizedLocal, source: 'local-admin-import' };
        }
      }
    }
    const response = await fetch(LAND_USE_TRANSITION_MATRIX_PATH);
    if (!response.ok) return null;
    const text = await response.text();
    const rows = parseTransitionMatrixCsv(text);
    const normalized = normalizeTransitionRows(rows);
    return normalized.length > 0 ? { rules: normalized, source: LAND_USE_TRANSITION_MATRIX_PATH } : null;
  } catch {
    return null;
  }
}

/* ── Hook ──────────────────────────────────────────────────── */
export function useLandUseData(activeTab: Tab, transitionOverrideVersion = 0) {
  const [loading, setLoading] = useState(true);

  // Overview state
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [overviewLandTypes, setOverviewLandTypes] = useState<any[]>([]);
  const [overviewTopCountries, setOverviewTopCountries] = useState<any[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<any[]>([]);
  const [overviewInsights, setOverviewInsights] = useState<Insight[]>([]);

  // Transformation state
  const [transformData, setTransformData] = useState<any[]>([]);
  const [transformComparison, setTransformComparison] = useState<any[]>([]);
  const [transformFlowModel, setTransformFlowModel] = useState<any>(null);
  const [transformInsights, setTransformInsights] = useState<Insight[]>([]);
  const [transitionMatrixMeta, setTransitionMatrixMeta] = useState<any>(null);

  // Benchmark state
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);
  const [benchmarkHHI, setBenchmarkHHI] = useState<any>(null);
  const [benchmarkInsights, setBenchmarkInsights] = useState<Insight[]>([]);

  // Turkey state
  const [turkeyProfile, setTurkeyProfile] = useState<any>(null);
  const [turkeyTrends, setTurkeyTrends] = useState<any[]>([]);
  const [turkeyRadar, setTurkeyRadar] = useState<any[]>([]);
  const [turkeyInsights, setTurkeyInsights] = useState<Insight[]>([]);

  // Forecast state
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<Insight[]>([]);

  // Intelligence alerts state
  const [intelligenceAlerts, setIntelligenceAlerts] = useState<IntelligenceAlert[]>([]);
  const [allInsights, setAllInsights] = useState<Insight[]>([]);

  /* ── Overview loader ─────────────────────────────────────── */
  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      const latestYear = '2023';
      const prevYear = '2021';

      const [worldLandRes, turkeyLandRes, prevWorldRes, topCountriesRes, trendRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: latestYear }, whereIn: { item_tr: ITEMS }, exclude: EX, orderBy: 'sum_value', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: latestYear, area: TR }, whereIn: { item_tr: ITEMS } }),
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: prevYear, item_tr: TARIM }, exclude: EX }),
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: latestYear, item_tr: TARIM }, exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 20 }),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { item_tr: TARIM }, exclude: EX, orderBy: 'year', dir: 'asc' }),
      ]);

      const landTypes = worldLandRes.map((r: any, i: number) => ({
        name: String(r.item_tr), value: num(r.sum_value),
        fill: CHART_COLORS[i % CHART_COLORS.length]
      }));
      setOverviewLandTypes(landTypes);

      const turkeyMap: Record<string, number> = {};
      turkeyLandRes.forEach((r: any) => { turkeyMap[String(r.item_tr)] = num(r.sum_value); });

      const worldAg = landTypes.find((l: any) => l.name === 'Tarım arazisi')?.value || 0;
      const prevWorldAg = num(prevWorldRes[0]?.sum_value);
      const turkeyAg = turkeyMap['Tarım arazisi'] || 0;
      const turkeyArable = turkeyMap['İşlenebilir arazi'] || 0;
      const turkeyIrrigation = turkeyMap['Sulama altyapısı bulunan arazi'] || 0;
      const turkeyFallow = turkeyMap['Geçici nadas alanı'] || 0;

      const worldYoY = calculateYoY(worldAg, prevWorldAg);
      const turkeyShare = worldAg > 0 ? (turkeyAg / worldAg) * 100 : 0;
      const irrigationRate = turkeyAg > 0 ? (turkeyIrrigation / turkeyAg) * 100 : 0;
      const fallowRate = turkeyArable > 0 ? (turkeyFallow / turkeyArable) * 100 : 0;

      const topCountries = topCountriesRes.map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey') || name.includes('Turkiye');
        return { name: translateCountry(name), rawName: name, value: num(r.sum_value), isTurkey, fill: isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length] };
      });
      setOverviewTopCountries(topCountries);
      const turkeyRank = topCountries.findIndex((c: any) => c.isTurkey) + 1;

      const trendData = trendRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));
      setOverviewTrend(trendData);

      const worldTrendYV: YearValue[] = trendData.map((t: any) => ({ year: t.year, value: t.value }));
      const worldCAGR = calculateCAGR(worldTrendYV);

      setOverviewKPIs({
        worldAg, turkeyAg, turkeyArable, turkeyIrrigation, turkeyFallow,
        worldYoY, turkeyShare, irrigationRate, fallowRate,
        turkeyRank: turkeyRank || 'N/A', countryCount: topCountries.length,
        worldCAGR: worldCAGR?.cagr || 0
      });

      const insights: Insight[] = [];
      insights.push({ id: 'ov1', type: 'info', message: `Dunya toplam tarim arazisi ${formatArea(worldAg)} - ${topCountries.length} buyuk uretici ulke`, severity: 'low', category: 'Kapsam' });
      if (worldYoY < -0.5) insights.push({ id: 'ov2', type: 'decline', message: `Dunya tarim arazisi onceki yila gore ${yuzde(Math.abs(worldYoY), 2)} azaldi`, severity: 'high', category: 'Trend' });
      else if (worldYoY > 0.5) insights.push({ id: 'ov2', type: 'growth', message: `Dunya tarim arazisi onceki yila gore ${yuzde(worldYoY, 2)} artti`, severity: 'medium', category: 'Trend' });
      if (turkeyRank > 0 && turkeyRank <= 15) insights.push({ id: 'ov3', type: 'achievement', message: `Turkiye tarim arazisinde dunya ${turkeyRank}. sirada - toplam ${formatArea(turkeyAg)} (dunya payi ${yuzde(turkeyShare, 2)})`, severity: 'high', category: 'Turkiye' });
      if (irrigationRate < 30) insights.push({ id: 'ov4', type: 'warning', message: `Turkiye sulama orani sadece ${yuzde(irrigationRate, 1)} - sulama altyapisi yatirim potansiyeli yuksek`, severity: 'high', category: 'Sulama' });
      else insights.push({ id: 'ov4', type: 'achievement', message: `Turkiye sulama orani ${yuzde(irrigationRate, 1)} - guclu altyapi`, severity: 'medium', category: 'Sulama' });
      if (fallowRate > 15) insights.push({ id: 'ov5', type: 'warning', message: `Nadas orani ${yuzde(fallowRate, 1)} - islenebilir arazinin onemli kismi atil durumda`, severity: 'medium', category: 'Verimlilik' });
      if (worldCAGR && worldCAGR.cagr < 0) insights.push({ id: 'ov6', type: 'decline', message: `Dunya tarim arazisi uzun vadede yillik ${yuzde(Math.abs(worldCAGR.cagr), 2)} CAGR ile azaliyor`, severity: 'high', category: 'Uzun Vade' });
      setOverviewInsights(insights);
    } catch (error) { console.error('Overview veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  /* ── Transformation loader ───────────────────────────────── */
  const loadTransformationData = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyTimeRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['year', 'item_tr'], sum: ['value'], where: { area: TR }, whereIn: { item_tr: ITEMS }, whereGte: { year: 2000 }, orderBy: 'year', dir: 'asc' }),
      ]);
      const overridePayload = await loadTransitionMatrixOverrides();
      const effectiveCrosswalkRules = overridePayload?.rules || LAND_USE_CROSSWALK_RULES;

      const turkeyByType: Record<string, YearValue[]> = {};
      turkeyTimeRes.forEach((r: any) => {
        const type = String(r.item_tr);
        if (!turkeyByType[type]) turkeyByType[type] = [];
        turkeyByType[type].push({ year: String(r.year), value: num(r.sum_value) });
      });

      const transformComp: any[] = [];
      for (const [type, values] of Object.entries(turkeyByType)) {
        if (values.length >= 2) {
          const first = values[0]; const last = values[values.length - 1];
          const change = last.value - first.value;
          const changePct = first.value > 0 ? (change / first.value) * 100 : 0;
          const cagr = calculateCAGR(values);
          transformComp.push({ name: type, startValue: first.value, endValue: last.value, change, changePct, cagr: cagr?.cagr || 0, startYear: first.year, endYear: last.year });
        }
      }
      setTransformComparison(transformComp);

      const flowCandidates = transformComp.filter(item =>
        !['Tarım arazisi', 'Sulama altyapısı bulunan arazi'].includes(item.name),
      );
      const startYear = flowCandidates[0]?.startYear || '2000';
      const endYear = flowCandidates[0]?.endYear || '2023';
      const normalized = flowCandidates.map(item => ({
        ...item,
        shortName: shortLandUseLabel(item.name),
        stable: Math.max(0, Math.min(item.startValue, item.endValue)),
        loss: Math.max(0, item.startValue - item.endValue),
        gain: Math.max(0, item.endValue - item.startValue),
      }));
      const totalLoss = normalized.reduce((sum, item) => sum + item.loss, 0);
      const totalGain = normalized.reduce((sum, item) => sum + item.gain, 0);
      const matchedFlow = Math.min(totalLoss, totalGain);

      const nodeEntries = normalized.flatMap(item => ([
        { key: `${item.shortName}-start`, name: `${item.shortName} (${startYear})`, color: item.loss > 0 ? '#ef4444' : '#94a3b8' },
        { key: `${item.shortName}-end`, name: `${item.shortName} (${endYear})`, color: item.gain > 0 ? '#22c55e' : '#94a3b8' },
      ]));
      if (totalLoss > matchedFlow) {
        nodeEntries.push({ key: 'residual-loss', name: 'Net Kayip / Belirsiz Cikis', color: '#7c3aed' });
      }
      if (totalGain > matchedFlow) {
        nodeEntries.push({ key: 'residual-gain', name: 'Siniflama Farki / Net Kazanim', color: '#06b6d4' });
      }

      const nodeIndex = new Map(nodeEntries.map((node, index) => [node.key, index]));
      const { links: crosswalkLinks, allocatedMatchedFlow } = buildCrosswalkLinks(
        normalized,
        nodeIndex,
        matchedFlow,
        totalLoss,
        effectiveCrosswalkRules,
      );
      const residualMatchedFlow = Math.max(0, matchedFlow - allocatedMatchedFlow);
      const links = normalized.flatMap(item => {
        const stableLinks = item.stable > 0
          ? [{ source: nodeIndex.get(`${item.shortName}-start`)!, target: nodeIndex.get(`${item.shortName}-end`)!, value: item.stable }]
          : [];
        const sourceLossShare = totalLoss > 0 ? item.loss / totalLoss : 0;
        const residualLossLink = totalLoss > matchedFlow && item.loss > 0
          ? [{
              source: nodeIndex.get(`${item.shortName}-start`)!,
              target: nodeIndex.get('residual-loss')!,
              value: (totalLoss - matchedFlow) * sourceLossShare,
            }]
          : [];
        const unmatchedLossLink = residualMatchedFlow > 0 && item.loss > 0
          ? [{
              source: nodeIndex.get(`${item.shortName}-start`)!,
              target: nodeIndex.get('residual-loss')!,
              value: residualMatchedFlow * sourceLossShare,
            }]
          : [];
        return [...stableLinks, ...residualLossLink, ...unmatchedLossLink];
      });

      const residualGainLinks = totalGain > allocatedMatchedFlow
        ? normalized
            .filter(item => item.gain > 0)
            .map(item => ({
              source: nodeIndex.get('residual-gain')!,
              target: nodeIndex.get(`${item.shortName}-end`)!,
              value: (totalGain - allocatedMatchedFlow) * (item.gain / totalGain),
            }))
            .filter(link => link.value > 1)
        : [];

      setTransformFlowModel({
        startYear,
        endYear,
        nodes: nodeEntries.map(({ name, color }) => ({ name, color })),
        links: [...links, ...crosswalkLinks, ...residualGainLinks],
        summary: {
          modeledTypes: normalized.map(item => item.name),
          excludedTypes: ['Tarım arazisi', 'Sulama altyapısı bulunan arazi'],
          matchedFlow,
          crosswalkAllocatedFlow: allocatedMatchedFlow,
          totalLoss,
          totalGain,
          ruleCount: effectiveCrosswalkRules.length,
          methodology: overridePayload ? 'csv-transition-matrix-override' : 'rule-based-crosswalk',
        },
        crosswalkRules: effectiveCrosswalkRules,
      });
      setTransitionMatrixMeta({
        source: overridePayload?.source || 'inline-default-rules',
        overrideActive: Boolean(overridePayload),
        rowCount: effectiveCrosswalkRules.reduce((sum, rule) => sum + rule.targets.length, 0),
      });

      const yearSet = new Set<string>();
      Object.values(turkeyByType).forEach(arr => arr.forEach(v => yearSet.add(v.year)));
      const years = Array.from(yearSet).sort();
      const multiLine = years.map(year => {
        const row: any = { year };
        for (const [type, values] of Object.entries(turkeyByType)) {
          const match = values.find(v => v.year === year);
          row[type] = match?.value || 0;
        }
        return row;
      });
      setTransformData(multiLine);

      const ins: Insight[] = [];
      const agChange = transformComp.find(t => t.name === 'Tarım arazisi');
      if (agChange && agChange.change < 0) ins.push({ id: 'tr1', type: 'decline', message: `Turkiye tarim arazisi ${agChange.startYear}-${agChange.endYear} doneminde ${formatArea(Math.abs(agChange.change))} azaldi (${yuzde(Math.abs(agChange.changePct), 1)} kayip)`, severity: 'high', category: 'Arazi Kaybi' });
      const forestChange = transformComp.find(t => t.name === 'Orman alanı');
      if (forestChange && forestChange.change > 0) ins.push({ id: 'tr2', type: 'growth', message: `Ormanlik alan ${forestChange.startYear}-${forestChange.endYear} doneminde ${formatArea(forestChange.change)} artti - agaclandirma basarisi`, severity: 'medium', category: 'Orman' });
      const irrigChange = transformComp.find(t => t.name.includes('Sulama'));
      if (irrigChange && irrigChange.change > 0) ins.push({ id: 'tr3', type: 'growth', message: `Sulama altyapisi ${yuzde(irrigChange.changePct, 1)} buyudu - yillik CAGR ${yuzde(irrigChange.cagr, 2)}`, severity: 'medium', category: 'Sulama' });
      const pastureChange = transformComp.find(t => t.name === 'Sürekli çayırlar ve meralar');
      if (pastureChange && pastureChange.change < 0) ins.push({ id: 'tr4', type: 'warning', message: `Cayir-mera alani ${yuzde(Math.abs(pastureChange.changePct), 1)} azaldi - hayvancilik kapasite riski`, severity: 'medium', category: 'Mera' });
      setTransformInsights(ins);
    } catch (error) { console.error('Transform veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  /* ── Benchmark loader ────────────────────────────────────── */
  const loadBenchmarkData = useCallback(async () => {
    setLoading(true);
    try {
      const [agCountryRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: 2023, item_tr: TARIM }, exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 200 }),
      ]);

      const agData = agCountryRes.map((r: any, i: number) => {
        const name = String(r.area || '');
        const isTurkey = name.includes('Türkiye') || name.includes('Turkey');
        return { rank: i + 1, country: translateCountry(name), rawName: name, agLand: num(r.sum_value), isTurkey };
      });
      setBenchmarkData(agData);

      const shares = agData.map((c: any) => c.agLand);
      const hhi = calculateHHI(shares);
      setBenchmarkHHI(hhi);

      const ins: Insight[] = [];
      const turkeyInBench = agData.find((c: any) => c.isTurkey);
      if (turkeyInBench) ins.push({ id: 'bm1', type: turkeyInBench.rank <= 15 ? 'achievement' : 'info', message: `Turkiye tarim arazisi buyuklugunde dunya ${turkeyInBench.rank}. - ${formatArea(turkeyInBench.agLand)}`, severity: turkeyInBench.rank <= 10 ? 'high' : 'medium', category: 'Siralama' });
      if (hhi) {
        const concLabel = hhi.concentration === 'LOW' ? 'dusuk konsantrasyon' : hhi.concentration === 'MODERATE' ? 'orta konsantrasyon' : 'yuksek konsantrasyon';
        ins.push({ id: 'bm2', type: hhi.concentration === 'LOW' ? 'info' : 'warning', message: `Tarim arazisi dagilimi: HHI ${hhi.hhi.toFixed(0)} (${concLabel}) - Top 3 ulke payi ${yuzde(hhi.top3Share, 1)}`, severity: 'medium', category: 'Konsantrasyon' });
      }
      setBenchmarkInsights(ins);
    } catch (error) { console.error('Benchmark veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  /* ── Turkey Profile loader ───────────────────────────────── */
  const loadTurkeyProfile = useCallback(async () => {
    setLoading(true);
    try {
      

      const [turkeyAllRes, turkeyTrendRes, worldAvgRes, topIrrigRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: 2023, area: TR } }),
        fetchAgg(R, { groupBy: ['year', 'item_tr'], sum: ['value'], where: { area: TR }, whereIn: { item_tr: TREND_ITEMS }, whereGte: { year: 2000 }, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['item_tr'], avg: ['value'], where: { year: 2023 }, whereIn: { item_tr: RADAR_ITEMS }, positive: ['value'], exclude: EX }),
        fetchAgg(R, { groupBy: ['area'], sum: ['value'], where: { year: 2023, item_tr: SULAMA }, positive: ['value'], exclude: EX, orderBy: 'sum_value', dir: 'desc', limit: 20 }),
      ]);

      const turkeyData: Record<string, number> = {};
      turkeyAllRes.forEach((r: any) => { turkeyData[String(r.item_tr)] = num(r.sum_value); });
      const worldAvgs: Record<string, number> = {};
      worldAvgRes.forEach((r: any) => { worldAvgs[String(r.item_tr)] = num(r.avg_value); });

      const turkeyByType: Record<string, YearValue[]> = {};
      turkeyTrendRes.forEach((r: any) => {
        const type = String(r.item_tr);
        if (!turkeyByType[type]) turkeyByType[type] = [];
        turkeyByType[type].push({ year: String(r.year), value: num(r.sum_value) });
      });

      const irrigData = topIrrigRes.map((r: any) => ({
        country: translateCountry(String(r.area || '')), value: num(r.sum_value),
        isTurkey: String(r.area).includes('Türkiye') || String(r.area).includes('Turkey')
      }));

      const radarItems = ['Tarım arazisi', 'İşlenebilir arazi', 'Sürekli çayırlar ve meralar', 'Orman alanı', 'Sulama altyapısı bulunan arazi'];
      const radarData = radarItems.map(item => {
        const trVal = turkeyData[item] || 0;
        const wAvg = worldAvgs[item] || 1;
        return { subject: item.replace('Sulama altyapısı bulunan arazi', 'Sulama').substring(0, 15), turkey: trVal, worldAvg: wAvg };
      });
      setTurkeyRadar(radarData);

      const irrigRank = irrigData.findIndex(d => d.isTurkey) + 1;
      setTurkeyProfile({
        ...turkeyData, worldAvgs, irrigationRank: irrigRank || 'N/A',
        irrigationRate: turkeyData['Tarım arazisi'] > 0 ? (turkeyData['Sulama altyapısı bulunan arazi'] || 0) / turkeyData['Tarım arazisi'] * 100 : 0,
        fallowRate: turkeyData['İşlenebilir arazi'] > 0 ? (turkeyData['Geçici nadas alanı'] || 0) / turkeyData['İşlenebilir arazi'] * 100 : 0,
        arablePct: turkeyData['Tarım arazisi'] > 0 ? (turkeyData['İşlenebilir arazi'] || 0) / turkeyData['Tarım arazisi'] * 100 : 0,
        pasturePct: turkeyData['Tarım arazisi'] > 0 ? (turkeyData['Sürekli çayırlar ve meralar'] || 0) / turkeyData['Tarım arazisi'] * 100 : 0,
      });

      const yearSet = new Set<string>();
      Object.values(turkeyByType).forEach(arr => arr.forEach(v => yearSet.add(v.year)));
      const trendLines = Array.from(yearSet).sort().map(year => {
        const row: any = { year };
        for (const [type, values] of Object.entries(turkeyByType)) {
          const match = values.find(v => v.year === year);
          const shortName = type.replace('Sulama altyapısı bulunan arazi', 'Sulama').replace('İşlenebilir arazi', 'Islenebilir');
          row[shortName] = match?.value || null;
        }
        return row;
      });
      setTurkeyTrends(trendLines);

      const ins: Insight[] = [];
      const agCagr = calculateCAGR(turkeyByType['Tarım arazisi'] || []);
      if (agCagr) ins.push({ id: 'tp1', type: agCagr.cagr > 0 ? 'growth' : 'decline', message: `Turkiye tarim arazisi 2000den bu yana yillik ${yuzde(Math.abs(agCagr.cagr), 2)} CAGR ile ${agCagr.cagr > 0 ? 'buyudu' : 'kuculdu'}`, severity: 'high', category: 'Trend' });
      const irrigCagr = calculateCAGR(turkeyByType['Sulama altyapısı bulunan arazi'] || []);
      if (irrigCagr && irrigCagr.cagr > 0) ins.push({ id: 'tp2', type: 'growth', message: `Sulama altyapisi yillik ${yuzde(irrigCagr.cagr, 2)} CAGR ile buyuyor${irrigRank > 0 ? ' - dunya ' + irrigRank + '. sirada' : ''}`, severity: 'medium', category: 'Sulama' });
      if (turkeyData['Tarım arazisi'] && worldAvgs['Tarım arazisi']) {
        const ratio = turkeyData['Tarım arazisi'] / worldAvgs['Tarım arazisi'];
        ins.push({ id: 'tp3', type: ratio > 1 ? 'achievement' : 'info', message: `Turkiye tarim arazisi dunya ulke ortalamasinin ${ratio.toFixed(1)}x ${ratio > 1 ? 'uzerinde' : 'altinda'} (${formatArea(turkeyData['Tarım arazisi'])} vs ${formatArea(worldAvgs['Tarım arazisi'])})`, severity: 'medium', category: 'Benchmark' });
      }
      setTurkeyInsights(ins);
    } catch (error) { console.error('Turkey veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  /* ── Forecast loader ─────────────────────────────────────── */
  const loadForecastData = useCallback(async () => {
    setLoading(true);
    try {
      const [turkeyForecastRes, worldForecastRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { area: TR, item_tr: TARIM }, whereGte: { year: 1990 }, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R, { groupBy: ['year'], sum: ['value'], where: { item_tr: TARIM }, whereGte: { year: 1990 }, exclude: EX, orderBy: 'year', dir: 'asc' }),
      ]);

      const turkeyForecastInput: YearValue[] = turkeyForecastRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));
      const worldForecastInput: YearValue[] = worldForecastRes.map((r: any) => ({ year: String(r.year), value: num(r.sum_value) }));

      const turkeyForecast = forecastLinear(turkeyForecastInput, 5);
      const worldForecast = forecastLinear(worldForecastInput, 5);
      const turkeyTrend = analyzeTrend(turkeyForecastInput);
      const worldTrend = analyzeTrend(worldForecastInput);
      const turkeyAnomalies = detectAnomalies(turkeyForecastInput, 2.0);

      const allYears = new Set<string>();
      turkeyForecastInput.forEach(d => allYears.add(d.year));
      turkeyForecast.forecast.forEach(d => allYears.add(d.year));

      const chartData = Array.from(allYears).sort().map(year => {
        const histTR = turkeyForecastInput.find(d => d.year === year);
        const fcTR = turkeyForecast.forecast.find(d => d.year === year);
        return { year, turkeyHistorical: histTR?.value || null, turkeyForecast: fcTR?.value || null, anomaly: turkeyAnomalies.find(a => a.year === year && a.isAnomaly)?.value || null };
      });

      setForecastData({
        chartData, turkeyTrend, worldTrend,
        turkeyR2: turkeyForecast.r2, worldR2: worldForecast.r2,
        turkeySlope: turkeyForecast.slope, worldSlope: worldForecast.slope,
        anomalyCount: turkeyAnomalies.filter(a => a.isAnomaly).length
      });

      const ins: Insight[] = [];
      if (turkeyTrend) {
        ins.push({ id: 'fc1', type: turkeyTrend.direction === 'up' ? 'growth' : turkeyTrend.direction === 'down' ? 'decline' : 'info', message: `Turkiye tarim arazisi trendi: CAGR ${yuzde(turkeyTrend.cagr, 2)}, R2 ${turkeyForecast.r2.toFixed(3)}, ${turkeyTrend.acceleration > 0 ? 'hizlaniyor' : 'yavasliyor'}`, severity: 'high', category: 'Tahmin' });
        if (turkeyTrend.forecast3y > 0) ins.push({ id: 'fc2', type: 'info', message: `3 yillik projeksiyon: ${formatArea(turkeyTrend.forecast3y)} (lineer model)`, severity: 'medium', category: 'Projeksiyon' });
      }
      if (worldTrend) ins.push({ id: 'fc3', type: worldTrend.direction === 'down' ? 'warning' : 'info', message: `Dunya tarim arazisi trendi: CAGR ${yuzde(worldTrend.cagr, 2)}, volatilite ${yuzde(worldTrend.volatility, 1)}`, severity: 'medium', category: 'Dunya' });
      setForecastInsights(ins);
    } catch (error) { console.error('Forecast veri hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  /* ── Intelligence alerts loader ──────────────────────────── */
  const loadIntelligenceAlerts = useCallback(async () => {
    setLoading(true);
    try {
      

      const [turkeyLatestRes, turkeyOlderRes, worldAvgRes] = await Promise.all([
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: 2023, area: TR }, whereIn: { item_tr: ALERT_ITEMS } }),
        fetchAgg(R, { groupBy: ['item_tr'], sum: ['value'], where: { year: 2010, area: TR }, whereIn: { item_tr: ALERT_ITEMS } }),
        fetchAgg(R, { groupBy: ['item_tr'], avg: ['value'], where: { year: 2023 }, whereIn: { item_tr: RADAR_ITEMS }, positive: ['value'], exclude: EX }),
      ]);

      const turkeyNow: Record<string, number> = {};
      turkeyLatestRes.forEach((r: any) => turkeyNow[String(r.item_tr)] = num(r.sum_value));
      const turkeyBefore: Record<string, number> = {};
      turkeyOlderRes.forEach((r: any) => turkeyBefore[String(r.item_tr)] = num(r.sum_value));
      const worldAvg: Record<string, number> = {};
      worldAvgRes.forEach((r: any) => worldAvg[String(r.item_tr)] = num(r.avg_value));

      const alerts: IntelligenceAlert[] = [];
      const agNow = turkeyNow['Tarım arazisi'] || 0;
      const agBefore = turkeyBefore['Tarım arazisi'] || 0;
      if (agBefore > 0 && agNow < agBefore) {
        const loss = agBefore - agNow;
        const lossPct = (loss / agBefore) * 100;
        alerts.push({ id: 'int-ag-loss', severity: lossPct > 5 ? 'critical' : 'warning', title: 'Tarim Arazisi Kaybi', message: `2010-2022 doneminde ${formatArea(loss)} tarim arazisi kaybedildi (${yuzde(lossPct, 1)})`, metric: 'Arazi kaybi', value: loss });
      }
      const irrigNow = turkeyNow['Sulama altyapısı bulunan arazi'] || 0;
      const irrigBefore = turkeyBefore['Sulama altyapısı bulunan arazi'] || 0;
      if (irrigBefore > 0 && irrigNow > irrigBefore) {
        const growth = irrigNow - irrigBefore;
        const growthPct = (growth / irrigBefore) * 100;
        alerts.push({ id: 'int-irrig-growth', severity: 'positive', title: 'Sulama Altyapisi Buyumesi', message: `2010-2022 doneminde ${formatArea(growth)} yeni sulama alani (${yuzde(growthPct, 1)} artis)`, metric: 'Sulama artisi', value: growth });
      }
      const fallowNow = turkeyNow['Geçici nadas alanı'] || 0;
      const arableNow = turkeyNow['İşlenebilir arazi'] || 0;
      if (arableNow > 0) {
        const fallowRate = (fallowNow / arableNow) * 100;
        if (fallowRate > 15) alerts.push({ id: 'int-fallow-high', severity: 'warning', title: 'Yuksek Nadas Orani', message: `Islenebilir arazinin ${yuzde(fallowRate, 1)} nadas - modern tarim yontemleriyle azaltilabilir`, metric: 'Nadas orani', value: fallowRate });
      }
      const forestNow = turkeyNow['Orman alanı'] || 0;
      const forestBefore = turkeyBefore['Orman alanı'] || 0;
      if (forestBefore > 0) {
        const forestChange = forestNow - forestBefore;
        const forestPct = (forestChange / forestBefore) * 100;
        alerts.push({ id: 'int-forest', severity: forestChange > 0 ? 'positive' : 'critical', title: forestChange > 0 ? 'Ormanlik Alan Artisi' : 'Ormansizlasma', message: `2010-2022: ${forestChange > 0 ? '+' : ''}${formatArea(forestChange)} (${forestPct > 0 ? '+' : ''}${yuzde(forestPct, 1)})`, metric: 'Orman degisimi', value: forestChange });
      }
      if (agNow > 0 && worldAvg['Tarım arazisi'] > 0 && worldAvg['Sulama altyapısı bulunan arazi'] > 0) {
        const trIrrigRate = irrigNow / agNow * 100;
        const worldIrrigRate = worldAvg['Sulama altyapısı bulunan arazi'] / worldAvg['Tarım arazisi'] * 100;
        alerts.push({ id: 'int-irrig-bench', severity: trIrrigRate > worldIrrigRate ? 'positive' : 'info', title: 'Sulama Orani Karsilastirma', message: `Turkiye: ${yuzde(trIrrigRate, 1)} vs Dunya ort.: ${yuzde(worldIrrigRate, 1)}`, metric: 'Sulama orani', value: trIrrigRate });
      }
      setIntelligenceAlerts(alerts);

      const allIns: Insight[] = alerts.map(a => ({
        id: a.id,
        type: a.severity === 'critical' ? 'decline' as const : a.severity === 'warning' ? 'warning' as const : a.severity === 'positive' ? 'achievement' as const : 'info' as const,
        message: a.title + ': ' + a.message,
        severity: a.severity === 'critical' ? 'high' as const : a.severity === 'warning' ? 'medium' as const : 'low' as const,
        category: a.metric || 'İçgörü'
      }));
      setAllInsights(allIns);
    } catch (error) { console.error('Intelligence alerts hatasi:', error); }
    finally { setLoading(false); }
  }, []);

  /* ── Master effect ───────────────────────────────────────── */
  useEffect(() => {
    switch (activeTab) {
      case 'overview': loadOverviewData(); break;
      case 'transformation': loadTransformationData(); break;
      case 'benchmark': loadBenchmarkData(); break;
      case 'turkey': loadTurkeyProfile(); break;
      case 'forecast': loadForecastData(); break;
      case 'alerts': loadIntelligenceAlerts(); break;
    }
  }, [activeTab, transitionOverrideVersion, loadOverviewData, loadTransformationData, loadBenchmarkData, loadTurkeyProfile, loadForecastData, loadIntelligenceAlerts]);

  return {
    loading,
    overviewKPIs, overviewLandTypes, overviewTopCountries, overviewTrend, overviewInsights,
    transformData, transformComparison, transformFlowModel, transitionMatrixMeta, transformInsights,
    benchmarkData, benchmarkHHI, benchmarkInsights,
    turkeyProfile, turkeyTrends, turkeyRadar, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  };
}
