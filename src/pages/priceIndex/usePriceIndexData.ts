/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchQuery } from '../../services/api';

// ---------- TYPES ----------
export type DatasetId = 'TUFE' | 'T-UFE' | 'T-GFE' | 'FAO';
export interface DatasetConfig { title: string; subtitle: string; color: string }
export interface MonthlyItem { month: string; value: number; monthIdx: number }
export interface YearlyItem { year: string; value: number }
export interface ProductItem { name: string; value: number; change: number; fill: string }
export interface HeatmapCell { product: string; month: string; value: number; monthIdx: number }
export interface ScissorItem { year: string; tufe: number; gfe: number; gap: number }
export interface AnomalyItem { month: string; value: number; zScore: number }

// ---------- CONSTANTS ----------
export const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#10b981', '#d946ef', '#0ea5e9'];

export const DATASETS: Record<DatasetId, DatasetConfig> = {
  'TUFE':  { title: 'Tüketici Fiyat Endeksi (TÜFE)',           subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#ef4444' },
  'T-UFE': { title: 'Tarım Üretici Fiyat Endeksi (Tarım-ÜFE)', subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#f59e0b' },
  'T-GFE': { title: 'Girdi Fiyat Endeksi (GFE)',               subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#22c55e' },
  'FAO':   { title: 'FAO Gıda Fiyat Endeksi',                  subtitle: 'FAO Global Endeks',         color: '#3b82f6' },
};

const MONTH_COLS = `Ocak, \`Şubat\`, Mart, Nisan, \`Mayıs\`, Haziran, Temmuz, \`Ağustos\`, \`Eylül\`, Ekim, \`Kasım\`, \`Aralık\``;
// SQL-safe column names (backtick for Turkish special chars)
const MONTHS_SQL = ['Ocak', '`Şubat`', 'Mart', 'Nisan', '`Mayıs`', 'Haziran', 'Temmuz', '`Ağustos`', '`Eylül`', 'Ekim', '`Kasım`', '`Aralık`'];

// Average only non-zero months — correct for incomplete years
function makeAvgNonZero(prefix = ''): string {
  const p = prefix ? `${prefix}.` : '';
  const sum = MONTHS_SQL.map(m => `CASE WHEN CAST(${p}${m} AS DECIMAL(10,4))>0 THEN CAST(${p}${m} AS DECIMAL(10,4)) ELSE 0 END`).join('+');
  const cnt = MONTHS_SQL.map(m => `CASE WHEN CAST(${p}${m} AS DECIMAL(10,4))>0 THEN 1 ELSE 0 END`).join('+');
  return `((${sum})/NULLIF(${cnt},0))`;
}

// ---------- HELPERS ----------
export function formatIndex(v: number): string {
  if (v === 0) return '0.00';
  return v.toFixed(2);
}
function calcCAGR(start: number, end: number, years: number): number {
  if (start <= 0 || end <= 0 || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}
function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ---------- HOOK ----------
export function usePriceIndexData() {
  const [dataset, setDataset] = useState<DatasetId>('TUFE');
  const [selectedYear, setSelectedYear] = useState('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productOptions, setProductOptions] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyData, setMonthlyData] = useState<MonthlyItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyItem[]>([]);
  const [topProducts, setTopProducts] = useState<ProductItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [scissorData, setScissorData] = useState<ScissorItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [prevSamePeriodAvg, setPrevSamePeriodAvg] = useState(0);
  const metaRequestId = useRef(0);

  const config = DATASETS[dataset];

  const loadMeta = useCallback(async () => {
    const reqId = ++metaRequestId.current;
    setLoading(true);
    setError('');
    setProductOptions([]);
    setSelectedProduct('');
    try {
      let prodSql: string;
      if (dataset === 'TUFE') {
        prodSql = `SELECT DISTINCT CONCAT(d1,'.',d2,'.',d3,'.',d4) AS code, urun
                   FROM tuik_fiyatendex WHERE endeks='TUFE' AND d2=0 AND d3=0 AND d4=0
                   ORDER BY CAST(d1 AS UNSIGNED)`;
      } else {
        prodSql = `SELECT DISTINCT CONCAT(d1,'.',d2,'.',d3,'.',d4) AS code, urun
                   FROM tuik_fiyatendex WHERE endeks='${dataset}'
                   GROUP BY urun ORDER BY urun`;
      }
      const [yearRes, prodRes] = await Promise.all([
        fetchQuery(`SELECT DISTINCT yil FROM tuik_fiyatendex WHERE endeks='${dataset}' ORDER BY CAST(yil AS UNSIGNED) DESC`),
        fetchQuery(prodSql),
      ]);
      if (reqId !== metaRequestId.current) return; // stale response, discard
      const years = (yearRes.data || []).map((r: Record<string, string | number>) => String(r.yil)).filter(Boolean);
      setYearOptions(years);
      if (years.length > 0) setSelectedYear(prev => (!prev || !years.includes(prev)) ? years[0] : prev);
      const prods = (prodRes.data || []).map((r: Record<string, string | number>) => ({
        code: String(r.code),
        name: String(r.urun),
      }));
      setProductOptions(prods);
      if (prods.length > 0) {
        const general = prods.find((p: { code: string; name: string }) => p.code.startsWith('0.'));
        setSelectedProduct(general ? general.code : prods[0].code);
      }
    } catch (e) {
      console.error('Meta load error:', e);
      setError('Veri kaynağı yüklenemedi');
      setLoading(false);
    }
  }, [dataset]);

  const loadData = useCallback(async () => {
    if (!selectedProduct || !selectedYear) return;
    setLoading(true);
    setError('');
    try {
      const yr = selectedYear;
      const parts = selectedProduct.split('.');
      const [d1, d2, d3, d4] = parts;
      const prodWhere = `endeks='${dataset}' AND d1='${d1}' AND d2='${d2}' AND d3='${d3}' AND d4='${d4}'`;

      const prevYr = String(Number(yr) - 1);

      const monthlyQuery = `SELECT ${MONTH_COLS}
        FROM tuik_fiyatendex WHERE ${prodWhere} AND yil='${yr}' LIMIT 1`;

      const prevYearMonthlyQuery = `SELECT ${MONTH_COLS}
        FROM tuik_fiyatendex WHERE ${prodWhere} AND yil='${prevYr}' LIMIT 1`;

      const yearlyQuery = `SELECT yil, ${makeAvgNonZero()} as avg_val
        FROM tuik_fiyatendex WHERE ${prodWhere}
        ORDER BY CAST(yil AS UNSIGNED)`;

      const topProdQuery = dataset === 'TUFE'
        ? `SELECT urun, d1, ${makeAvgNonZero()} as curr_avg
           FROM tuik_fiyatendex WHERE endeks='TUFE' AND d2=0 AND d3=0 AND d4=0 AND d1>0 AND yil='${yr}'
           ORDER BY ${makeAvgNonZero()} DESC LIMIT 13`
        : '';

      const heatmapQuery = dataset === 'TUFE'
        ? `SELECT urun, d1, ${MONTH_COLS}
           FROM tuik_fiyatendex WHERE endeks='TUFE' AND d2=0 AND d3=0 AND d4=0 AND d1>0 AND yil='${yr}'
           ORDER BY CAST(d1 AS UNSIGNED) LIMIT 13`
        : '';

      const scissorQuery = (dataset === 'TUFE' || dataset === 'T-GFE')
        ? `SELECT a.yil,
             ${makeAvgNonZero('a')} as tufe_avg,
             ${makeAvgNonZero('b')} as gfe_avg
           FROM tuik_fiyatendex a
           INNER JOIN tuik_fiyatendex b ON a.yil=b.yil AND b.endeks='T-GFE' AND b.d1='0' AND b.d2='0' AND b.d3='0' AND b.d4='0'
           WHERE a.endeks='TUFE' AND a.d1='1' AND a.d2='0' AND a.d3='0' AND a.d4='0'
           ORDER BY CAST(a.yil AS UNSIGNED)`
        : '';

      const promises: Promise<{ data?: Record<string, string | number>[] }>[] = [
        fetchQuery(monthlyQuery),
        fetchQuery(yearlyQuery),
        fetchQuery(prevYearMonthlyQuery),
      ];
      if (topProdQuery) promises.push(fetchQuery(topProdQuery));
      if (heatmapQuery) promises.push(fetchQuery(heatmapQuery));
      if (scissorQuery) promises.push(fetchQuery(scissorQuery));

      const results = await Promise.all(promises);
      let idx = 0;
      const monthlyRes = results[idx++];
      const yearlyRes = results[idx++];
      const prevYearMonthlyRes = results[idx++];
      const topProdRes = topProdQuery ? results[idx++] : null;
      const heatmapRes = heatmapQuery ? results[idx++] : null;
      const scissorRes = scissorQuery ? results[idx++] : null;

      const row = monthlyRes.data?.[0];
      let availableMonthIndices: number[] = [];
      if (row) {
        const monthly: MonthlyItem[] = MONTHS_TR.map((m, i) => ({
          month: MONTHS_SHORT[i],
          monthIdx: i,
          value: Number(row[m]) || 0,
        }));
        availableMonthIndices = monthly.filter(m => m.value > 0).map(m => m.monthIdx);
        setMonthlyData(monthly.filter(m => m.value > 0));
        const vals = monthly.map(m => m.value).filter(v => v > 0);
        if (vals.length >= 3) {
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          const std = calcStdDev(vals);
          if (std > 0) {
            setAnomalies(monthly
              .filter(m => m.value > 0 && Math.abs((m.value - mean) / std) > 1.5)
              .map(m => ({ month: m.month, value: m.value, zScore: (m.value - mean) / std })));
          } else {
            setAnomalies([]);
          }
        } else {
          setAnomalies([]);
        }
      } else {
        setMonthlyData([]);
        setAnomalies([]);
      }

      // Compute previous year same-period average for accurate YoY comparison
      const prevRow = prevYearMonthlyRes.data?.[0];
      if (prevRow && availableMonthIndices.length > 0) {
        const prevVals = availableMonthIndices
          .map(i => Number(prevRow[MONTHS_TR[i]]) || 0)
          .filter(v => v > 0);
        setPrevSamePeriodAvg(prevVals.length > 0 ? prevVals.reduce((a, b) => a + b, 0) / prevVals.length : 0);
      } else {
        setPrevSamePeriodAvg(0);
      }

      setYearlyData((yearlyRes.data || []).map((r: Record<string, string | number>) => ({
        year: String(r.yil),
        value: Number(r.avg_val) || 0,
      })).filter((r: YearlyItem) => r.value > 0));

      if (topProdRes?.data?.length) {
        // Use same-period expression for fair YoY comparison
        const samePeriodExpr = availableMonthIndices.length > 0
          ? `((${availableMonthIndices.map(i => `CAST(${MONTHS_SQL[i]} AS DECIMAL(10,4))`).join('+')})/${availableMonthIndices.length})`
          : makeAvgNonZero();
        const prevRes = await fetchQuery(
          `SELECT d1, ${samePeriodExpr} as prev_avg
           FROM tuik_fiyatendex WHERE endeks='TUFE' AND d2=0 AND d3=0 AND d4=0 AND d1>0 AND yil='${prevYr}'`
        );
        const prevMap = new Map((prevRes.data || []).map((r: Record<string, string | number>) => [String(r.d1), Number(r.prev_avg) || 0]));
        setTopProducts(topProdRes.data.map((r: Record<string, string | number>, i: number) => {
          const curr = Number(r.curr_avg) || 0;
          const prev = prevMap.get(String(r.d1)) || 0;
          const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
          return { name: String(r.urun), value: curr, change, fill: COLORS[i % COLORS.length] };
        }));
      } else {
        setTopProducts([]);
      }

      if (heatmapRes?.data?.length) {
        const cells: HeatmapCell[] = [];
        heatmapRes.data.forEach((r: Record<string, string | number>) => {
          MONTHS_TR.forEach((m, i) => {
            cells.push({ product: String(r.urun), month: MONTHS_SHORT[i], value: Number(r[m]) || 0, monthIdx: i });
          });
        });
        setHeatmapData(cells);
      } else {
        setHeatmapData([]);
      }

      if (scissorRes?.data?.length) {
        setScissorData(scissorRes.data.map((r: Record<string, string | number>) => ({
          year: String(r.yil),
          tufe: Number(r.tufe_avg) || 0,
          gfe: Number(r.gfe_avg) || 0,
          gap: (Number(r.gfe_avg) || 0) - (Number(r.tufe_avg) || 0),
        })));
      } else {
        setScissorData([]);
      }

    } catch (e) {
      console.error('Data load error:', e);
      setError('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [dataset, selectedYear, selectedProduct]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { if (selectedProduct) loadData(); }, [loadData, selectedProduct]);

  const avgIndex = useMemo(() => {
    const vals = monthlyData.filter(m => m.value > 0);
    return vals.length ? vals.reduce((s, m) => s + m.value, 0) / vals.length : 0;
  }, [monthlyData]);

  const maxMonth = useMemo(() =>
    monthlyData.reduce((max, m) => m.value > max.value ? m : max, { month: '-', value: 0, monthIdx: -1 }),
  [monthlyData]);

  const minMonth = useMemo(() => {
    const valid = monthlyData.filter(m => m.value > 0);
    return valid.length ? valid.reduce((min, m) => m.value < min.value ? m : min, valid[0]) : { month: '-', value: 0, monthIdx: -1 };
  }, [monthlyData]);

  const yearChange = useMemo(() => {
    // Use same-period comparison when available (incomplete years)
    if (prevSamePeriodAvg > 0 && avgIndex > 0) {
      return ((avgIndex - prevSamePeriodAvg) / prevSamePeriodAvg) * 100;
    }
    const curr = yearlyData.find(y => y.year === selectedYear);
    const prev = yearlyData.find(y => y.year === String(Number(selectedYear) - 1));
    return curr && prev && prev.value > 0 ? ((curr.value - prev.value) / prev.value * 100) : 0;
  }, [avgIndex, prevSamePeriodAvg, yearlyData, selectedYear]);

  const cagr5 = useMemo(() => {
    const currIdx = yearlyData.findIndex(y => y.year === selectedYear);
    if (currIdx < 5) return 0;
    return calcCAGR(yearlyData[currIdx - 5].value, yearlyData[currIdx].value, 5);
  }, [yearlyData, selectedYear]);

  const volatility = useMemo(() => {
    const vals = monthlyData.map(m => m.value).filter(v => v > 0);
    return calcStdDev(vals);
  }, [monthlyData]);

  const selectedProductName = useMemo(() =>
    productOptions.find(p => p.code === selectedProduct)?.name || '',
  [productOptions, selectedProduct]);

  const heatmapProducts = useMemo(() => {
    const seen = new Set<string>();
    return heatmapData.filter(c => { if (seen.has(c.product)) return false; seen.add(c.product); return true; }).map(c => c.product);
  }, [heatmapData]);

  return {
    dataset, setDataset,
    selectedYear, setSelectedYear,
    selectedProduct, setSelectedProduct,
    yearOptions, productOptions,
    loading, error,
    monthlyData, yearlyData, topProducts, heatmapData, scissorData, anomalies,
    avgIndex, maxMonth, minMonth, yearChange, cagr5, volatility,
    selectedProductName, heatmapProducts, config, prevSamePeriodAvg,
  };
}
