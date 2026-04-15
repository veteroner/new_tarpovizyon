import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  Cell
} from 'recharts';
import { fetchQuery } from '../services/api';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, BarChart3, Thermometer } from 'lucide-react';

// ---------- CONSTANTS ----------
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#10b981', '#d946ef', '#0ea5e9'];

type DatasetId = 'TUFE' | 'T-UFE' | 'T-GFE' | 'FAO';
interface DatasetConfig {
  title: string;
  subtitle: string;
  color: string;
}
const DATASETS: Record<DatasetId, DatasetConfig> = {
  'TUFE':  { title: 'Tüketici Fiyat Endeksi (TÜFE)',           subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#ef4444' },
  'T-UFE': { title: 'Tarım Üretici Fiyat Endeksi (Tarım-ÜFE)', subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#f59e0b' },
  'T-GFE': { title: 'Girdi Fiyat Endeksi (GFE)',               subtitle: 'TÜİK · Baz Yılı 2025=100', color: '#22c55e' },
  'FAO':   { title: 'FAO Gıda Fiyat Endeksi',                  subtitle: 'FAO Global Endeks',         color: '#3b82f6' },
};

interface MonthlyItem { month: string; value: number; monthIdx: number }
interface YearlyItem { year: string; value: number }
interface ProductItem { name: string; value: number; change: number; fill: string }
interface HeatmapCell { product: string; month: string; value: number; monthIdx: number }

// ---------- HELPERS ----------
function formatIndex(v: number): string {
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

/* Monthly column SELECT fragment – backtick-escaped Turkish months */
const MONTH_COLS = `Ocak, \`Şubat\`, Mart, Nisan, \`Mayıs\`, Haziran, Temmuz, \`Ağustos\`, \`Eylül\`, Ekim, \`Kasım\`, \`Aralık\``;

/* Average of 12 months SQL expression */
const AVG12 = `(CAST(Ocak AS DECIMAL(10,4))+CAST(\`Şubat\` AS DECIMAL(10,4))+CAST(Mart AS DECIMAL(10,4))+CAST(Nisan AS DECIMAL(10,4))+CAST(\`Mayıs\` AS DECIMAL(10,4))+CAST(Haziran AS DECIMAL(10,4))+CAST(Temmuz AS DECIMAL(10,4))+CAST(\`Ağustos\` AS DECIMAL(10,4))+CAST(\`Eylül\` AS DECIMAL(10,4))+CAST(Ekim AS DECIMAL(10,4))+CAST(\`Kasım\` AS DECIMAL(10,4))+CAST(\`Aralık\` AS DECIMAL(10,4)))/12`;

export default function PriceIndexPage() {
  const [dataset, setDataset] = useState<DatasetId>('TUFE');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productOptions, setProductOptions] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [monthlyData, setMonthlyData] = useState<MonthlyItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyItem[]>([]);
  const [topProducts, setTopProducts] = useState<ProductItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [scissorData, setScissorData] = useState<{ year: string; tufe: number; gfe: number; gap: number }[]>([]);
  // Intelligence
  const [anomalies, setAnomalies] = useState<{ month: string; value: number; zScore: number }[]>([]);

  const config = DATASETS[dataset];

  // ========== LOAD META (years + products) ==========
  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      /* Build product query by dataset */
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

      const years = (yearRes.data || []).map((r: Record<string, string | number>) => String(r.yil)).filter(Boolean);
      setYearOptions(years);
      if (years.length > 0 && !years.includes(selectedYear)) setSelectedYear(years[0]);

      const prods = (prodRes.data || []).map((r: Record<string, string | number>) => ({
        code: String(r.code),
        name: String(r.urun)
      }));
      setProductOptions(prods);

      // Default selection: TÜFE genel (d1=0) or first item
      if (prods.length > 0) {
        const general = prods.find((p: { code: string; name: string }) => p.code.startsWith('0.'));
        setSelectedProduct(general ? general.code : prods[0].code);
      }
    } catch (e) {
      console.error('Meta load error:', e);
      setError('Veri kaynağı yüklenemedi');
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset]);

  // ========== LOAD DATA ==========
  const loadData = useCallback(async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setError('');
    try {
      const yr = selectedYear;
      const parts = selectedProduct.split('.');
      const [d1, d2, d3, d4] = parts;

      /* Build WHERE for this product */
      const prodWhere = `endeks='${dataset}' AND d1='${d1}' AND d2='${d2}' AND d3='${d3}' AND d4='${d4}'`;

      /* 1. Monthly data for selected year */
      const monthlyQuery = `SELECT ${MONTH_COLS}
        FROM tuik_fiyatendex WHERE ${prodWhere} AND yil='${yr}' LIMIT 1`;

      /* 2. Yearly averages (all years) */
      const yearlyQuery = `SELECT yil, ${AVG12} as avg_val
        FROM tuik_fiyatendex WHERE ${prodWhere}
        ORDER BY CAST(yil AS UNSIGNED)`;

      /* 3. Top categories ranking (TUFE main categories, d1>0, d2=d3=d4=0) */
      const topProdQuery = dataset === 'TUFE'
        ? `SELECT urun, d1, ${AVG12} as curr_avg
           FROM tuik_fiyatendex WHERE endeks='TUFE' AND d2=0 AND d3=0 AND d4=0 AND d1>0 AND yil='${yr}'
           ORDER BY ${AVG12} DESC LIMIT 13`
        : '';

      /* 4. Heatmap (TUFE only): categories × months */
      const heatmapQuery = dataset === 'TUFE'
        ? `SELECT urun, d1, ${MONTH_COLS}
           FROM tuik_fiyatendex WHERE endeks='TUFE' AND d2=0 AND d3=0 AND d4=0 AND d1>0 AND yil='${yr}'
           ORDER BY CAST(d1 AS UNSIGNED) LIMIT 13`
        : '';

      /* 5. GFE-TÜFE Fiyat Makası (only show for TUFE or T-GFE) */
      const scissorQuery = (dataset === 'TUFE' || dataset === 'T-GFE')
        ? `SELECT a.yil,
             ${AVG12.replace(/Ocak/g, 'a.Ocak').replace(/`Şubat`/g, 'a.`Şubat`').replace(/Mart/g, 'a.Mart').replace(/Nisan/g, 'a.Nisan').replace(/`Mayıs`/g, 'a.`Mayıs`').replace(/Haziran/g, 'a.Haziran').replace(/Temmuz/g, 'a.Temmuz').replace(/`Ağustos`/g, 'a.`Ağustos`').replace(/`Eylül`/g, 'a.`Eylül`').replace(/Ekim/g, 'a.Ekim').replace(/`Kasım`/g, 'a.`Kasım`').replace(/`Aralık`/g, 'a.`Aralık`')} as tufe_avg,
             (CAST(b.Ocak AS DECIMAL(10,4))+CAST(b.\`Şubat\` AS DECIMAL(10,4))+CAST(b.Mart AS DECIMAL(10,4))+CAST(b.Nisan AS DECIMAL(10,4))+CAST(b.\`Mayıs\` AS DECIMAL(10,4))+CAST(b.Haziran AS DECIMAL(10,4))+CAST(b.Temmuz AS DECIMAL(10,4))+CAST(b.\`Ağustos\` AS DECIMAL(10,4))+CAST(b.\`Eylül\` AS DECIMAL(10,4))+CAST(b.Ekim AS DECIMAL(10,4))+CAST(b.\`Kasım\` AS DECIMAL(10,4))+CAST(b.\`Aralık\` AS DECIMAL(10,4)))/12 as gfe_avg
           FROM tuik_fiyatendex a
           INNER JOIN tuik_fiyatendex b ON a.yil=b.yil AND b.endeks='T-GFE' AND b.d1='0' AND b.d2='0' AND b.d3='0' AND b.d4='0'
           WHERE a.endeks='TUFE' AND a.d1='1' AND a.d2='0' AND a.d3='0' AND a.d4='0'
           ORDER BY CAST(a.yil AS UNSIGNED)`
        : '';

      // Fire all queries
      const promises: Promise<{ data?: Record<string, string | number>[] }>[] = [
        fetchQuery(monthlyQuery),
        fetchQuery(yearlyQuery),
      ];
      if (topProdQuery) promises.push(fetchQuery(topProdQuery));
      if (heatmapQuery) promises.push(fetchQuery(heatmapQuery));
      if (scissorQuery) promises.push(fetchQuery(scissorQuery));

      const results = await Promise.all(promises);
      let idx = 0;
      const monthlyRes = results[idx++];
      const yearlyRes = results[idx++];
      const topProdRes = topProdQuery ? results[idx++] : null;
      const heatmapRes = heatmapQuery ? results[idx++] : null;
      const scissorRes = scissorQuery ? results[idx++] : null;

      // --- Parse monthly ---
      const row = monthlyRes.data?.[0];
      if (row) {
        const monthly: MonthlyItem[] = MONTHS_TR.map((m, i) => ({
          month: MONTHS_SHORT[i],
          monthIdx: i,
          value: Number(row[m]) || 0,
        }));
        setMonthlyData(monthly);

        // Anomaly detection (Z-score)
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

      // --- Parse yearly ---
      setYearlyData((yearlyRes.data || []).map((r: Record<string, string | number>) => ({
        year: String(r.yil),
        value: Number(r.avg_val) || 0,
      })).filter((r: YearlyItem) => r.value > 0));

      // --- Parse top products (with prev year change) ---
      if (topProdRes?.data?.length) {
        const prevYr = String(Number(selectedYear) - 1);
        const prevRes = await fetchQuery(
          `SELECT d1, ${AVG12} as prev_avg
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

      // --- Parse heatmap ---
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

      // --- Parse scissor data ---
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

  // ---------- COMPUTED ----------
  const avgIndex = useMemo(() => {
    const vals = monthlyData.filter(m => m.value > 0);
    return vals.length ? vals.reduce((s, m) => s + m.value, 0) / vals.length : 0;
  }, [monthlyData]);

  const maxMonth = useMemo(() => monthlyData.reduce((max, m) => m.value > max.value ? m : max, { month: '-', value: 0, monthIdx: -1 }), [monthlyData]);

  const minMonth = useMemo(() => {
    const valid = monthlyData.filter(m => m.value > 0);
    return valid.length ? valid.reduce((min, m) => m.value < min.value ? m : min, valid[0]) : { month: '-', value: 0, monthIdx: -1 };
  }, [monthlyData]);

  const yearChange = useMemo(() => {
    const curr = yearlyData.find(y => y.year === selectedYear);
    const prev = yearlyData.find(y => y.year === String(Number(selectedYear) - 1));
    return curr && prev && prev.value > 0 ? ((curr.value - prev.value) / prev.value * 100) : 0;
  }, [yearlyData, selectedYear]);

  const cagr5 = useMemo(() => {
    const currIdx = yearlyData.findIndex(y => y.year === selectedYear);
    if (currIdx < 5) return 0;
    return calcCAGR(yearlyData[currIdx - 5].value, yearlyData[currIdx].value, 5);
  }, [yearlyData, selectedYear]);

  const volatility = useMemo(() => {
    const vals = monthlyData.map(m => m.value).filter(v => v > 0);
    return calcStdDev(vals);
  }, [monthlyData]);

  const selectedProductName = useMemo(() => {
    return productOptions.find(p => p.code === selectedProduct)?.name || '';
  }, [productOptions, selectedProduct]);

  const heatmapProducts = useMemo(() => {
    const seen = new Set<string>();
    return heatmapData.filter(c => { if (seen.has(c.product)) return false; seen.add(c.product); return true; }).map(c => c.product);
  }, [heatmapData]);

  // ========== RENDER ==========
  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-title">{config.title}</h1>
        <p className="page-subtitle">{config.subtitle}</p>
      </div>

      {/* FILTER BAR */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Endeks Tipi</label>
          <select className="filter-select" value={dataset} onChange={e => { setDataset(e.target.value as DatasetId); setSelectedProduct(''); }}>
            <option value="TUFE">TÜFE — Tüketici Fiyat Endeksi</option>
            <option value="T-UFE">Tarım-ÜFE — Üretici Fiyat Endeksi</option>
            <option value="T-GFE">GFE — Girdi Fiyat Endeksi</option>
            <option value="FAO">FAO — Gıda Fiyat Endeksi</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Kategori / Ürün</label>
          <select className="filter-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
            {productOptions.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {/* ==================== KPI CARDS ==================== */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">YIL ORTALAMASI</span>
                <div className="kpi-icon" style={{ color: config.color }}><Activity size={18} /></div>
              </div>
              <div className="kpi-value" style={{ color: config.color }}>{formatIndex(avgIndex)}</div>
              <div className="kpi-subtitle">{selectedProductName} · {selectedYear}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">YILLIK DEĞİŞİM</span>
                <div className={`kpi-icon ${yearChange >= 0 ? 'red' : 'green'}`}>
                  {yearChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
              </div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#ef4444' : '#22c55e' }}>
                %{yearChange >= 0 ? '+' : ''}{yearChange.toFixed(1)}
              </div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">EN YÜKSEK AY</span>
                <div className="kpi-icon orange"><Thermometer size={18} /></div>
              </div>
              <div className="kpi-value">{maxMonth.month}</div>
              <div className="kpi-subtitle">{formatIndex(maxMonth.value)} endeks</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">EN DÜŞÜK AY</span>
                <div className="kpi-icon green"><TrendingDown size={18} /></div>
              </div>
              <div className="kpi-value">{minMonth.month}</div>
              <div className="kpi-subtitle">{formatIndex(minMonth.value)} endeks</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">5 YIL BBO</span>
                <div className="kpi-icon purple"><BarChart3 size={18} /></div>
              </div>
              <div className="kpi-value" style={{ color: cagr5 >= 0 ? '#ef4444' : '#22c55e' }}>
                %{cagr5 >= 0 ? '+' : ''}{cagr5.toFixed(1)}
              </div>
              <div className="kpi-subtitle">5 yıllık bileşik büyüme</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">DALGALANMA</span>
                <div className="kpi-icon blue"><Activity size={18} /></div>
              </div>
              <div className="kpi-value">{volatility.toFixed(2)}</div>
              <div className="kpi-subtitle">Aylık std. sapma</div>
            </div>
          </div>

          {/* ==================== ANOMALY ALERT ==================== */}
          {anomalies.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 12, padding: 16, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>
                  Anomali Tespiti — {anomalies.length} ay normalin dışında (|Z| &gt; 1.5)
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {anomalies.map((a, i) => (
                  <span key={i} style={{
                    background: a.zScore > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    color: a.zScore > 0 ? '#ef4444' : '#22c55e',
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>
                    {a.month}: {formatIndex(a.value)} (Z={a.zScore > 0 ? '+' : ''}{a.zScore.toFixed(1)})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ==================== MONTHLY CHARTS ==================== */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Aylık Endeks ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatIndex(v), 'Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" name="Endeks" fill={config.color} radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, i) => {
                      const isAnomaly = anomalies.some(a => a.month === entry.month);
                      return <Cell key={i} fill={isAnomaly ? '#f59e0b' : config.color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Aylık Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatIndex(v), 'Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={3} dot={{ fill: config.color, r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================== YEARLY TREND (FULL SPAN) ==================== */}
          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📅 Yıllık Endeks Trendi ({yearlyData[0]?.year || '…'}–{yearlyData[yearlyData.length - 1]?.year || '…'})</h3>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={Math.max(0, Math.floor(yearlyData.length / 12))} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatIndex(v), 'Ortalama Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="value" stroke={config.color} fill={config.color} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================== GFE vs TÜFE — FİYAT MAKASI ==================== */}
          {scissorData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">✂️ Fiyat Makası — Gıda TÜFE vs GFE (Girdi Fiyat)</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>
                  Pozitif fark = Girdi fiyatları tüketici fiyatlarından yüksek → Çiftçi sıkışması
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={scissorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={Math.max(0, Math.floor(scissorData.length / 12))} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="tufe" name="Gıda TÜFE" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="gfe" name="GFE" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Scissor intelligence signal */}
                {(() => {
                  const recent = scissorData.slice(-3);
                  const avgGap = recent.reduce((s, d) => s + d.gap, 0) / (recent.length || 1);
                  const signal = avgGap > 5 ? { text: 'Çiftçi Sıkışması: Girdi fiyatları tüketici fiyatlarının üzerinde', color: '#ef4444', icon: '🔴' }
                    : avgGap < -5 ? { text: 'Çiftçi Avantajı: Tüketici fiyatları girdi fiyatlarının üzerinde', color: '#22c55e', icon: '🟢' }
                    : { text: 'Dengeli: Girdi ve tüketici fiyatları yakın seyirde', color: '#f59e0b', icon: '🟡' };
                  return (
                    <div style={{
                      marginTop: 12, padding: '10px 16px', borderRadius: 8,
                      background: `${signal.color}15`, border: `1px solid ${signal.color}30`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: 18 }}>{signal.icon}</span>
                      <span style={{ color: signal.color, fontWeight: 600, fontSize: 13 }}>{signal.text}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 'auto' }}>
                        Son 3 yıl fark: {avgGap >= 0 ? '+' : ''}{avgGap.toFixed(1)} puan
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ==================== CATEGORY RANKING (TUFE only) ==================== */}
          {topProducts.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card">
                <h3 className="chart-title">🏆 Kategori Endeks Sıralaması ({selectedYear})</h3>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={170} />
                    <Tooltip formatter={(v: number) => [formatIndex(v), 'Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="value" name="Endeks" radius={[0, 4, 4, 0]}>
                      {topProducts.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">📊 Yıllık Değişim Oranı (%)</h3>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={[...topProducts].sort((a, b) => b.change - a.change)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v: number) => `%${v.toFixed(0)}`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={170} />
                    <Tooltip formatter={(v: number) => [`%${Number(v).toFixed(1)}`, 'Değişim']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="change" name="Değişim" radius={[0, 4, 4, 0]}>
                      {[...topProducts].sort((a, b) => b.change - a.change).map((entry, i) => (
                        <Cell key={i} fill={entry.change >= 0 ? '#ef4444' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ==================== HEATMAP (TUFE only) ==================== */}
          {heatmapProducts.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 20 }}>
              <h3 className="chart-title">🌡️ Enflasyon Heatmap — Kategori × Ay ({selectedYear})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)', minWidth: 180 }}>Kategori</th>
                      {MONTHS_SHORT.map(m => (
                        <th key={m} style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)', minWidth: 50 }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapProducts.map(prod => {
                      const cells = heatmapData.filter(c => c.product === prod);
                      const vals = cells.map(c => c.value).filter(v => v > 0);
                      const min = vals.length ? Math.min(...vals) : 0;
                      const max = vals.length ? Math.max(...vals) : 0;
                      const range = max - min || 1;
                      return (
                        <tr key={prod} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: 500, fontSize: 10 }}>
                            {prod.length > 35 ? prod.substring(0, 35) + '…' : prod}
                          </td>
                          {MONTHS_SHORT.map((m, i) => {
                            const cell = cells.find(c => c.monthIdx === i);
                            const v = cell?.value || 0;
                            const intensity = v > 0 ? (v - min) / range : 0;
                            const bg = v > 0
                              ? `rgba(239, 68, 68, ${0.08 + intensity * 0.55})`
                              : 'transparent';
                            return (
                              <td key={m} style={{
                                padding: '4px 2px', textAlign: 'center', fontWeight: 600, fontSize: 10,
                                background: bg, color: intensity > 0.5 ? '#fff' : 'var(--text-primary)',
                                borderRadius: 2,
                              }}>
                                {v > 0 ? v.toFixed(1) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== DATA TABLE ==================== */}
          {topProducts.length > 0 && (
            <div className="data-table">
              <h3 className="data-table-title">📋 Kategori Detay Tablosu ({selectedYear})</h3>
              {topProducts.map((p, index) => (
                <div className="table-row" key={p.name}>
                  <div className={`table-rank ${index < 3 ? 'red' : ''}`}>{index + 1}</div>
                  <div className="table-info">
                    <div className="table-name">{p.name}</div>
                    <div className="table-subtext">Ortalama endeks: {formatIndex(p.value)}</div>
                  </div>
                  <div className="table-value" style={{ color: p.change >= 0 ? '#ef4444' : '#22c55e' }}>
                    {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
