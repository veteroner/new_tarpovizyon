/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchRows, num, type Row } from '../../services/d1';
import { SERIES } from '../../utils/chartColors';

const R = 'tuik/fiyatendex';

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
export const COLORS = SERIES;  // tek kaynak: utils/chartColors (doğrulanmış kategorik sıra)

export const DATASETS: Record<DatasetId, DatasetConfig> = {
  'TUFE':  { title: 'Tüketici Fiyat Endeksi (TÜFE)',           subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#ef4444' },
  'T-UFE': { title: 'Tarım Üretici Fiyat Endeksi (Tarım-ÜFE)', subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#f59e0b' },
  'T-GFE': { title: 'Girdi Fiyat Endeksi (GFE)',               subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#22c55e' },
  'FAO':   { title: 'FAO Gıda Fiyat Endeksi',                  subtitle: 'FAO Global Endeks',         color: '#3b82f6' },
};

/**
 * Yalnızca DOLU ayların ortalaması — yarım kalan yıllar için doğrusu bu.
 * Eskiden dev bir SQL CASE WHEN ifadesiyle hesaplanıyordu.
 */
function ortalamaDoluAylar(satir: Row, aylar: string[] = MONTHS_TR): number {
  const degerler = aylar.map((m) => num(satir[m])).filter((v) => v > 0);
  return degerler.length ? degerler.reduce((a, b) => a + b, 0) / degerler.length : 0;
}
/** d1.d2.d3.d4 → tek kod dizisi (eski CONCAT karşılığı). */
/*
 * Ürün anahtarı.
 *
 * TÜİK aileleri (TUFE/T-UFE/T-GFE) hiyerarşiyi d1..d4 alanlarında taşıyor.
 * FAO ise TAŞIMIYOR — 12 satırın (6 endeks × nominal/real) hepsinde d1..d4
 * sıfır. Aynı anahtarı kullanınca hepsi tek girdiye çöküyor, seçicide tek
 * "0.0.0.0" seçeneği kalıyor ve sayfa hangi satır önce gelirse onu
 * gösteriyordu. FAO'da anahtar maddekod (nominal/real) + ürün adı.
 */
const urunKodu = (r: Row, dataset: DatasetId) =>
  dataset === 'FAO'
    ? `${r.maddekod}|${r.urun}`
    : `${r.d1}.${r.d2}.${r.d3}.${r.d4}`;

/** Ürün anahtarını API filtresine çevirir. */
const urunFiltresi = (kod: string, dataset: DatasetId): Record<string, string | number> => {
  if (dataset === 'FAO') {
    const [maddekod, urun] = kod.split('|');
    return { maddekod, urun };
  }
  const [d1, d2, d3, d4] = kod.split('.');
  return { d1, d2, d3, d4 };
};

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
  /*
   * Serinin gerçekten dolu olan son ayı. Her veri seti farklı hızda
   * yayımlanıyor (TÜİK tarım ÜFE'yi FAO'dan önce, TÜFE'yi portalda) ve
   * sayfa bunu göstermeyince "neden nisanda kalmış?" sorusu ekranda
   * cevapsız kalıyordu.
   */
  const [sonDonem, setSonDonem] = useState<string>('');
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
      // Ürün listesi ve yıllar tek okumadan çıkarılıyor; DISTINCT/CONCAT
      // karşılıkları istemcide.
      const tumSatirlar = await fetchRows(R, { endeks: dataset, limit: 10000 });
      if (reqId !== metaRequestId.current) return; // stale response, discard
      const years = [...new Set(tumSatirlar.map((r) => String(r.yil)))]
        .filter(Boolean).sort((a, b) => Number(b) - Number(a));
      const prodRes = { data: (() => {
        const secilenler = dataset === 'TUFE'
          ? tumSatirlar.filter((r) => Number(r.d2) === 0 && Number(r.d3) === 0 && Number(r.d4) === 0)
          : tumSatirlar;
        const harita = new Map<string, { code: string; urun: string }>();
        for (const r of secilenler) {
          const code = urunKodu(r, dataset);
          // FAO'da aynı ürünün nominal ve reel serisi var; ad tek başına
          // ikisini ayırmadığı için etikete yazılıyor.
          const ad = dataset === 'FAO'
            ? `${r.urun} (${r.maddekod === 'real' ? 'reel' : 'nominal'})`
            : String(r.urun ?? '');
          if (!harita.has(code)) harita.set(code, { code, urun: ad });
        }
        const liste = [...harita.values()];
        return dataset === 'TUFE'
          ? liste.sort((a, b) => Number(a.code.split('.')[0]) - Number(b.code.split('.')[0]))
          : liste.sort((a, b) => a.urun.localeCompare(b.urun, 'tr'));
      })() };
      setYearOptions(years);
      if (years.length > 0) setSelectedYear(prev => (!prev || !years.includes(prev)) ? years[0] : prev);
      const prods = (prodRes.data || []).map((r) => ({
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
      const prevYr = String(Number(yr) - 1);
      const urunF = { endeks: dataset, ...urunFiltresi(selectedProduct, dataset) };

      // Tüm hesaplar (dolu-ay ortalaması, aylık seri, ısı haritası, makas)
      // eskiden dev SQL ifadeleriyle yapılıyordu; satırlar çekilip istemcide.
      const [urunSatirlari, tufeAnaYil, tufeOncekiYil, gfeSatirlari] = await Promise.all([
        fetchRows(R, { ...urunF, limit: 200 }),
        dataset === 'TUFE'
          ? fetchRows(R, { endeks: 'TUFE', d2: 0, d3: 0, d4: 0, yil: yr, limit: 500 })
          : Promise.resolve([]),
        dataset === 'TUFE'
          ? fetchRows(R, { endeks: 'TUFE', d2: 0, d3: 0, d4: 0, yil: prevYr, limit: 500 })
          : Promise.resolve([]),
        (dataset === 'TUFE' || dataset === 'T-GFE')
          ? Promise.all([
              fetchRows(R, { endeks: 'TUFE', d1: 1, d2: 0, d3: 0, d4: 0, limit: 200 }),
              fetchRows(R, { endeks: 'T-GFE', d1: 0, d2: 0, d3: 0, d4: 0, limit: 200 }),
            ])
          : Promise.resolve([[], []] as [Row[], Row[]]),
      ]);

      const monthlyRes = { data: urunSatirlari.filter((r) => String(r.yil) === yr).slice(0, 1) };
      const prevYearMonthlyRes = { data: urunSatirlari.filter((r) => String(r.yil) === prevYr).slice(0, 1) };
      const yearlyRes = { data: [...urunSatirlari]
        .sort((a, b) => Number(a.yil) - Number(b.yil))
        .map((r) => ({ yil: r.yil, avg_val: ortalamaDoluAylar(r) })) };

      // d1 > 0: '0.x' genel endeks satırını dışla.
      const anaGruplar = tufeAnaYil.filter((r) => Number(r.d1) > 0);
      const topProdRes = dataset === 'TUFE'
        ? { data: [...anaGruplar]
            .map((r) => ({ urun: r.urun, d1: r.d1, curr_avg: ortalamaDoluAylar(r) }))
            .sort((a, b) => b.curr_avg - a.curr_avg).slice(0, 13) }
        : null;
      const heatmapRes = dataset === 'TUFE'
        ? { data: [...anaGruplar].sort((a, b) => Number(a.d1) - Number(b.d1)).slice(0, 13) }
        : null;

      const [tufeSeri, gfeSeri] = gfeSatirlari as [Row[], Row[]];
      const gfeYilHaritasi = new Map(gfeSeri.map((r) => [String(r.yil), r]));
      const scissorRes = (dataset === 'TUFE' || dataset === 'T-GFE')
        ? { data: tufeSeri
            .filter((r) => gfeYilHaritasi.has(String(r.yil)))
            .sort((a, b) => Number(a.yil) - Number(b.yil))
            .map((r) => ({ yil: r.yil, tufe_avg: ortalamaDoluAylar(r),
              gfe_avg: ortalamaDoluAylar(gfeYilHaritasi.get(String(r.yil))!) })) }
        : null;

      const row = monthlyRes.data?.[0];
      let availableMonthIndices: number[] = [];
      if (row) {
        const monthly: MonthlyItem[] = MONTHS_TR.map((m, i) => ({
          month: MONTHS_SHORT[i],
          monthIdx: i,
          value: Number(row[m]) || 0,
        }));
        availableMonthIndices = monthly.filter(m => m.value > 0).map(m => m.monthIdx);
        const sonAy = availableMonthIndices.at(-1);
        setSonDonem(sonAy === undefined ? '' : `${MONTHS_TR[sonAy]} ${yr}`);
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

      setYearlyData((yearlyRes.data || []).map((r) => ({
        year: String(r.yil),
        value: Number(r.avg_val) || 0,
      })).filter((r: YearlyItem) => r.value > 0));

      if (topProdRes?.data?.length) {
        // Use same-period expression for fair YoY comparison
        // Adil YoY için önceki yılın AYNI aylarının ortalaması.
        const ayAdlari = availableMonthIndices.length > 0
          ? availableMonthIndices.map((i) => MONTHS_TR[i])
          : MONTHS_TR;
        const prevMap = new Map(tufeOncekiYil
          .filter((r) => Number(r.d1) > 0)
          .map((r) => [String(r.d1), ortalamaDoluAylar(r, ayAdlari)]));
        setTopProducts(topProdRes.data.map((r, i) => {
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
        heatmapRes.data.forEach((r) => {
          MONTHS_TR.forEach((m, i) => {
            cells.push({ product: String(r.urun), month: MONTHS_SHORT[i], value: Number(r[m]) || 0, monthIdx: i });
          });
        });
        setHeatmapData(cells);
      } else {
        setHeatmapData([]);
      }

      if (scissorRes?.data?.length) {
        setScissorData(scissorRes.data.map((r) => ({
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
    selectedProductName, heatmapProducts, config, prevSamePeriodAvg, sonDonem,
  };
}
