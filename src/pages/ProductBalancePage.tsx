import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from 'recharts';
import {
  Wheat, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert,
  Scale, ArrowRightLeft, Package, Users, BarChart3, Activity, Search
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { fetchQuery } from '../services/api';

/* ─── Year columns in tuik_urundenge ─── */
const YEAR_KEYS = [
  'y2014/15','y2015/16','y2016/17','y2017/18','y2018/19',
  'y2019/20','y2020/21','y2021/22','y2022/23','y2023/24',
];
const YEAR_COLS_SQL = YEAR_KEYS.map(k => `\`${k}\``).join(', ');
const YEAR_LABELS = YEAR_KEYS.map(k => k.replace('y','').split('/')[0]);

/* ─── Helper ─── */
const fmt = (v: number | null | undefined, decimals = 0): string => {
  if (v == null || isNaN(v)) return '-';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + ' Mln';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + ' Bin';
  return v.toFixed(decimals);
};
const pct = (v: number | null | undefined): string =>
  v == null || isNaN(v) ? '-' : v.toFixed(1) + '%';
const parseNum = (v: unknown): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
const yearVal = (row: Record<string, unknown>, idx: number): number =>
  parseNum(row[YEAR_KEYS[idx]]);

/* ─── Color palette ─── */
const GREEN = '#16a34a';
const GREEN_LIGHT = '#22c55e';
const BLUE = '#2563eb';
const RED = '#dc2626';
const ORANGE = '#f59e0b';
const PURPLE = '#7c3aed';
const CYAN = '#06b6d4';

const HEATMAP_COLORS = [
  { threshold: 50, color: '#dc2626', label: '< 50%' },
  { threshold: 70, color: '#f97316', label: '50-70%' },
  { threshold: 90, color: '#facc15', label: '70-90%' },
  { threshold: 110, color: '#22c55e', label: '90-110%' },
  { threshold: 150, color: '#16a34a', label: '110-150%' },
  { threshold: Infinity, color: '#166534', label: '> 150%' },
];
const getHeatColor = (v: number): string =>
  HEATMAP_COLORS.find(c => v < c.threshold)?.color ?? '#166534';

/* ─── Product categories for grouping ─── */
const PRODUCT_GROUPS: Record<string, string[]> = {
  'Tahıllar': ['Tahıl (toplam)', 'Buğday (toplam)', 'Buğday (durum)', 'Buğday (diğer)', 'Arpa', 'Mısır', 'Çavdar', 'Yulaf', 'Pirinç', 'Diğer tahıllar'],
  'Baklagiller': ['Kuru baklagil (toplam)', 'Kırmızı mercimek', 'Yeşil mercimek', 'Nohut', 'Kuru fasulye'],
  'Sebzeler': ['Sebze (toplam)', 'Domates', 'Biber', 'Hıyar', 'Patlıcan', 'Patates', 'Soğan (kuru)', 'Soğan (taze)', 'Sarımsak (kuru)', 'Lahana', 'Marul', 'Ispanak', 'Havuç', 'Turp', 'Pırasa', 'Semizotu', 'Kabak (sakız)', 'Bamya', 'Fasulye (taze)', 'Bezelye (taze)', 'Bakla (taze)'],
  'Meyveler': ['Elma', 'Armut', 'Kayısı ve zerdali', 'Kiraz', 'Vişne', 'Şeftali ve nektarin', 'Erik', 'Ayva', 'Dut', 'Üzüm', 'İncir', 'Nar', 'Çilek', 'Karpuz', 'Kavun', 'Muz', 'Diğer meyveler'],
  'Turunçgiller': ['Turunçgiller (toplam)', 'Portakal', 'Mandalina', 'Limon', 'Greyfurt'],
  'Sert Kabuklular': ['Sert kabuklular (toplam)', 'Fındık', 'Ceviz', 'Badem', 'Antep fıstığı', 'Kestane'],
  'Endüstriyel': ['Şeker pancarı', 'Şeker', 'Çay', 'Pamuk (çiğit)', 'Ayçiçeği', 'Kolza', 'Soya  (1)', 'Kenevir', 'Keten', 'Şarap'],
};

/* ─── KPI Card Component ─── */
function KPI({ icon: Icon, title, value, sub, color, alert }: {
  icon: typeof Wheat; title: string; value: string; sub?: string; color: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-xl shadow-md p-5 border-l-4 min-h-[140px] flex flex-col ${alert ? 'animate-pulse' : ''}`}
         style={{ background: 'var(--bg-card)', borderLeftColor: color }}>
      <div className="flex justify-between items-start mb-auto">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        </div>
        <Icon size={24} style={{ color }} className="opacity-70 flex-shrink-0" />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold mb-1" style={{ color }}>{value}</p>
        {sub && <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  MAIN COMPONENT                            */
/* ═══════════════════════════════════════════ */
export default function ProductBalancePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState('Tahıllar');

  // Product detail data (19 fasıl rows × 10 years)
  const [detail, setDetail] = useState<Record<string, { birim: string; values: number[] }>>({});
  // Heatmap data: product → year values for yeterlilik
  const [heatmapData, setHeatmapData] = useState<{ urun: string; values: number[] }[]>([]);
  // Import dependency ranking
  const [importRanking, setImportRanking] = useState<{ urun: string; ratio: number }[]>([]);
  // Per capita data
  const [perCapitaData, setPerCapitaData] = useState<{ urun: string; values: number[] }[]>([]);

  /* ─ Load product list ─ */
  useEffect(() => {
    (async () => {
      const res = await fetchQuery(`SELECT DISTINCT TRIM(urun) as urun FROM tuik_urundenge ORDER BY urun`);
      const list = (res.data || []).map((r: Record<string, unknown>) => String(r.urun).trim());
      setProducts(list);
      if (list.length > 0) setSelectedProduct(list.find((p: string) => p.includes('Buğday (toplam)')) || list[0]);
    })();
  }, []);

  /* ─ Load heatmap + import dependency + per capita on mount ─ */
  useEffect(() => {
    (async () => {
      const [yetRes, impDepRes, pcRes] = await Promise.all([
        fetchQuery(`SELECT TRIM(urun) as urun, ${YEAR_COLS_SQL} FROM tuik_urundenge WHERE fasıl='Yeterlilik derecesi' ORDER BY urun`),
        fetchQuery(`
          SELECT a.urun, a.imp, b.arz,
                 CASE WHEN b.arz > 0 THEN (a.imp / b.arz * 100) ELSE 0 END as ratio
          FROM (SELECT TRIM(urun) as urun, \`y2023/24\` as imp FROM tuik_urundenge WHERE fasıl='İthalat') a
          JOIN (SELECT TRIM(urun) as urun, \`y2023/24\` as arz FROM tuik_urundenge WHERE fasıl='Arz= Kullanım') b ON a.urun = b.urun
          WHERE a.imp > 0 ORDER BY ratio DESC LIMIT 20
        `),
        fetchQuery(`SELECT TRIM(urun) as urun, ${YEAR_COLS_SQL} FROM tuik_urundenge WHERE fasıl='Kişi başına tüketim' ORDER BY urun`),
      ]);

      setHeatmapData((yetRes.data || []).map((r: Record<string, unknown>) => ({
        urun: String(r.urun).trim(),
        values: YEAR_KEYS.map((_, i) => yearVal(r, i)),
      })));

      setImportRanking((impDepRes.data || []).map((r: Record<string, unknown>) => ({
        urun: String(r.urun).trim(),
        ratio: parseNum(r.ratio),
      })));

      setPerCapitaData((pcRes.data || []).map((r: Record<string, unknown>) => ({
        urun: String(r.urun).trim(),
        values: YEAR_KEYS.map((_, i) => yearVal(r, i)),
      })));
    })();
  }, []);

  /* ─ Load product detail ─ */
  const loadDetail = useCallback(async (product: string) => {
    if (!product) return;
    setLoading(true);
    setError(false);
    try {
      // Handle products with trailing spaces
      const res = await fetchQuery(`
        SELECT fasıl, birim, ${YEAR_COLS_SQL}
        FROM tuik_urundenge WHERE TRIM(urun)='${product.replace(/'/g, "''")}'
        ORDER BY fasıl
      `);
      const map: Record<string, { birim: string; values: number[] }> = {};
      for (const r of (res.data || [])) {
        const f = String(r['fasıl']);
        map[f] = {
          birim: String(r.birim || ''),
          values: YEAR_KEYS.map((_, i) => yearVal(r as Record<string, unknown>, i)),
        };
      }
      setDetail(map);
    } catch (e) {
      console.error('ProductBalance error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProduct) loadDetail(selectedProduct);
  }, [selectedProduct, loadDetail]);

  /* ─ Derived data ─ */
  const latestIdx = YEAR_KEYS.length - 1;
  const prevIdx = latestIdx - 1;
  const get = (fasil: string, idx = latestIdx) => detail[fasil]?.values[idx] ?? 0;
  const getUnit = (fasil: string) => detail[fasil]?.birim ?? '';

  // KPI values
  const production = get('Üretim');
  const imports = get('İthalat');
  const exports = get('İhracat');
  const selfSufficiency = get('Yeterlilik derecesi');
  const perCapita = get('Kişi başına tüketim');
  const stockChange = get('Stok değişimi');
  const supplyUse = get('Arz= Kullanım');
  const importDep = supplyUse > 0 ? (imports / supplyUse) * 100 : 0;
  const exportRatio = production > 0 ? (exports / production) * 100 : 0;

  // YoY
  const prevProd = get('Üretim', prevIdx);
  const prodYoY = prevProd > 0 ? ((production - prevProd) / prevProd) * 100 : 0;
  const prevSS = get('Yeterlilik derecesi', prevIdx);
  const ssYoY = prevSS > 0 ? selfSufficiency - prevSS : 0;

  // Waterfall chart data
  const waterfallData = useMemo(() => {
    if (!detail['Üretim']) return [];
    return [
      { name: 'Üretim', value: production, fill: GREEN },
      { name: 'Kayıplar', value: -get('Üretim kayıpları') - get('Kayıplar'), fill: '#ef4444' },
      { name: 'İthalat', value: imports, fill: BLUE },
      { name: 'İnsan Tüketimi', value: -get('İnsan tüketimi'), fill: ORANGE },
      { name: 'Yemlik', value: -get('Yemlik kullanım'), fill: PURPLE },
      { name: 'Endüstriyel', value: -get('Endüstriyel kullanım'), fill: CYAN },
      { name: 'Tohum', value: -get('Tohumluk kullanım'), fill: '#64748b' },
      { name: 'İhracat', value: -exports, fill: RED },
      { name: 'Stok', value: -stockChange, fill: '#a855f7' },
    ].filter(d => Math.abs(d.value) > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, production, imports, exports, stockChange]);

  // Multi-year trend for selected product
  const yearlyTrend = useMemo(() => {
    if (!detail['Üretim']) return [];
    return YEAR_LABELS.map((lbl, i) => ({
      year: lbl,
      Üretim: detail['Üretim']?.values[i] ?? 0,
      İthalat: detail['İthalat']?.values[i] ?? 0,
      İhracat: detail['İhracat']?.values[i] ?? 0,
      Tüketim: detail['İnsan tüketimi']?.values[i] ?? 0,
      Yeterlilik: detail['Yeterlilik derecesi']?.values[i] ?? 0,
    }));
  }, [detail]);

  // Food security alerts
  const alerts = useMemo(() => {
    return heatmapData
      .map(h => {
        const latest = h.values[latestIdx];
        const prev = h.values[prevIdx];
        const trend = prev > 0 ? latest - prev : 0;
        let severity: 'critical' | 'warning' | 'watch' | 'ok' = 'ok';
        if (latest < 50) severity = 'critical';
        else if (latest < 70) severity = 'warning';
        else if (latest < 90 || trend < -10) severity = 'watch';
        return { urun: h.urun, value: latest, trend, severity };
      })
      .filter(a => a.severity !== 'ok')
      .sort((a, b) => a.value - b.value);
  }, [heatmapData, latestIdx, prevIdx]);

  // Food Security Score (composite 0-100)
  const foodSecurityScore = useMemo(() => {
    if (!selfSufficiency) return 0;
    const ssScore = Math.min(selfSufficiency, 150) / 150 * 40; // max 40 pts
    const impScore = Math.max(0, 30 - importDep * 0.3); // max 30 pts (lower dep = higher)
    const stockScore = stockChange > 0 ? 15 : stockChange > -production * 0.1 ? 10 : 5; // max 15
    const trendScore = prodYoY > 0 ? 15 : prodYoY > -5 ? 10 : 5; // max 15
    return Math.round(ssScore + impScore + stockScore + trendScore);
  }, [selfSufficiency, importDep, stockChange, prodYoY, production]);

  const filteredProducts = products.filter(p =>
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const groupedProducts = PRODUCT_GROUPS[activeGroup]?.filter(p => products.includes(p)) ?? [];

  // Per capita top products for chart
  const perCapitaChartData = useMemo(() => {
    const topProducts = perCapitaData
      .filter(p => p.values[latestIdx] > 5) // at least 5 kg
      .sort((a, b) => b.values[latestIdx] - a.values[latestIdx])
      .slice(0, 8);
    return YEAR_LABELS.map((lbl, i) => {
      const entry: Record<string, string | number> = { year: lbl };
      topProducts.forEach(p => { entry[p.urun] = p.values[i]; });
      return entry;
    });
  }, [perCapitaData, latestIdx]);

  const perCapitaProducts = perCapitaData
    .filter(p => p.values[latestIdx] > 5)
    .sort((a, b) => b.values[latestIdx] - a.values[latestIdx])
    .slice(0, 8)
    .map(p => p.urun);

  const AREA_COLORS = ['#16a34a','#2563eb','#f59e0b','#dc2626','#7c3aed','#06b6d4','#ec4899','#84cc16'];

  if (error && !loading) return <ErrorState title="Ürün dengesi yüklenemedi" onRetry={() => selectedProduct && loadDetail(selectedProduct)} />;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Header ─── */}
      <div className="rounded-2xl p-6 shadow-lg" style={{ background: 'var(--bg-card)', borderLeft: '4px solid #16a34a' }}>
        <div className="flex items-center gap-3 mb-2">
          <Scale size={28} style={{ color: '#16a34a' }} />
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Ürün Arz-Talep Dengesi</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          TÜİK Ürün Dengesi Tablosu • 75 Ürün • Gıda Güvenliği &amp; Yeterlilik Analizi • 2014-2024
        </p>
      </div>

      {/* ─── Product Selector ─── */}
      <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.keys(PRODUCT_GROUPS).map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeGroup === g ? 'bg-green-600 text-white shadow-sm' : ''
              }`}
              style={activeGroup !== g ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {groupedProducts.map(p => (
            <button key={p} onClick={() => setSelectedProduct(p)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                selectedProduct === p
                  ? 'bg-green-100 text-green-800 font-bold ring-2 ring-green-400'
                  : ''
              }`}
              style={selectedProduct !== p ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}>
              {p}
            </button>
          ))}
        </div>
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-2.5" style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
          <input
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          {searchTerm && (
            <div className="absolute z-20 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto w-full"
                 style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {filteredProducts.slice(0, 15).map(p => (
                <div key={p} onClick={() => { setSelectedProduct(p); setSearchTerm(''); }}
                  className="px-3 py-2 text-sm hover:bg-green-50 cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}>{p}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? <Loading /> : detail['Üretim'] && (
        <>
          {/* ─── Food Security Score + KPIs ─── */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Food Security Score (big) */}
            <div className="col-span-2 md:col-span-2 lg:col-span-1 rounded-xl shadow-md p-4 flex flex-col items-center justify-center border-2 min-h-[140px]"
                 style={{ background: 'var(--bg-card)', borderColor: foodSecurityScore >= 70 ? GREEN : foodSecurityScore >= 40 ? ORANGE : RED }}>
              <Activity size={28} style={{ color: foodSecurityScore >= 70 ? GREEN : foodSecurityScore >= 40 ? ORANGE : RED }} />
              <p className="text-4xl font-black mt-2" style={{ color: foodSecurityScore >= 70 ? GREEN : foodSecurityScore >= 40 ? ORANGE : RED }}>
                {foodSecurityScore}
              </p>
              <p className="text-xs uppercase mt-1" style={{ color: 'var(--text-secondary)' }}>Gıda Güvenlik Skoru</p>
            </div>
            <KPI icon={Wheat} title="Üretim" value={fmt(production) + ' ' + getUnit('Üretim')}
                 sub={`Yıllık: ${prodYoY >= 0 ? '+' : ''}${prodYoY.toFixed(1)}%`} color={GREEN} />
            <KPI icon={selfSufficiency >= 100 ? ShieldCheck : ShieldAlert}
                 title="Yeterlilik" value={pct(selfSufficiency)}
                 sub={`Δ ${ssYoY >= 0 ? '+' : ''}${ssYoY.toFixed(1)} puan`}
                 color={selfSufficiency >= 100 ? GREEN : selfSufficiency >= 70 ? ORANGE : RED}
                 alert={selfSufficiency < 70} />
            <KPI icon={Users} title="Kişi Başı" value={perCapita.toFixed(1) + ' ' + getUnit('Kişi başına tüketim')}
                 sub="Yıllık tüketim" color={BLUE} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPI icon={ArrowRightLeft} title="İthalat Bağımlılığı" value={pct(importDep)}
                 sub={fmt(imports) + ' Ton ithalat'} color={importDep > 30 ? RED : importDep > 15 ? ORANGE : GREEN}
                 alert={importDep > 50} />
            <KPI icon={TrendingUp} title="İhracat/Üretim" value={pct(exportRatio)}
                 sub={fmt(exports) + ' Ton ihracat'} color={exportRatio > 20 ? GREEN_LIGHT : BLUE} />
            <KPI icon={Package} title="Stok Değişimi" value={fmt(stockChange) + ' Ton'}
                 sub={stockChange > 0 ? 'Stok artışı ↑' : 'Stok erimesi ↓'}
                 color={stockChange > 0 ? GREEN : RED} />
          </div>

          {/* ─── Row: Waterfall + Yearly Trend ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waterfall: Arz-Talep Akışı */}
            <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Scale size={16} className="text-green-600" />
                Arz-Talep Akışı — {selectedProduct} ({YEAR_KEYS[latestIdx].replace('y','')})
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={waterfallData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [fmt(v) + ' Ton', '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((d, i) => (
                      <Cell key={i} fill={d.fill} opacity={d.value < 0 ? 0.8 : 1} />
                    ))}
                  </Bar>
                  <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                Pozitif: Arza eklenen • Negatif: Arzdan düşen
              </p>
            </div>

            {/* Yearly ComposedChart: Üretim vs İthalat vs İhracat + Yeterlilik line */}
            <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BarChart3 size={16} className="text-green-600" />
                10 Yıllık Trend — {selectedProduct}
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={yearlyTrend} margin={{ top: 10, right: 40, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']}
                         tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) =>
                    [name === 'Yeterlilik' ? v.toFixed(1) + '%' : fmt(v) + ' Ton', name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="Üretim" fill={GREEN} opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="İthalat" fill={BLUE} opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="İhracat" fill={ORANGE} opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="Yeterlilik" stroke={RED}
                        strokeWidth={2} dot={{ r: 3 }} />
                  <ReferenceLine yAxisId="right" y={100} stroke="#dc2626" strokeDasharray="5 5" label={{ value: '100%', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── Detail Table ─── */}
          <div className="rounded-xl shadow-md p-4 overflow-x-auto" style={{ background: 'var(--bg-card)' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Package size={16} className="text-green-600" />
              Detay Tablosu — {selectedProduct}
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 px-2 font-medium sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Fasıl</th>
                  <th className="text-left py-2 px-1" style={{ color: 'var(--text-secondary)' }}>Birim</th>
                  {YEAR_LABELS.map(y => (
                    <th key={y} className="text-right py-2 px-2" style={{ color: 'var(--text-primary)' }}>{y}</th>
                  ))}
                  <th className="text-right py-2 px-2" style={{ color: 'var(--text-primary)' }}>Δ%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(detail)
                  .sort(([a], [b]) => a.localeCompare(b, 'tr'))
                  .map(([fasil, data]) => {
                    const last = data.values[latestIdx];
                    const prev = data.values[prevIdx];
                    const change = prev > 0 ? ((last - prev) / prev) * 100 : 0;
                    return (
                      <tr key={fasil} className="hover:bg-green-50" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-1.5 px-2 font-medium sticky left-0 whitespace-nowrap" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{fasil}</td>
                        <td className="py-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>{data.birim}</td>
                        {data.values.map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                            {data.birim === '%' ? (v ? v.toFixed(1) + '%' : '-') : fmt(v)}
                          </td>
                        ))}
                        <td className={`py-1.5 px-2 text-right font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : ''}`}
                             style={!change ? { color: 'var(--text-secondary)', opacity: 0.6 } : {}}>
                          {change ? (change > 0 ? '+' : '') + change.toFixed(1) + '%' : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── Self-Sufficiency Heatmap ─── */}
      {heatmapData.length > 0 && (
        <div className="rounded-xl shadow-md p-4 overflow-x-auto" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldCheck size={16} className="text-green-600" />
            Yeterlilik Derecesi Haritası — Tüm Ürünler (%)
          </h3>
          <div className="flex gap-3 mb-3">
            {HEATMAP_COLORS.map(c => (
              <div key={c.label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: c.color }} />
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
              </div>
            ))}
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-1 px-2 sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Ürün</th>
                {YEAR_LABELS.map(y => (
                  <th key={y} className="text-center py-1 px-1" style={{ color: 'var(--text-secondary)' }}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData
                .filter(h => h.values[latestIdx] > 0)
                .sort((a, b) => a.values[latestIdx] - b.values[latestIdx])
                .map(h => (
                  <tr key={h.urun} className={`cursor-pointer ${
                    selectedProduct === h.urun ? 'bg-green-100 font-bold' : ''
                  }`} onClick={() => setSelectedProduct(h.urun)}
                      style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-1 px-2 whitespace-nowrap sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {h.urun}
                    </td>
                    {h.values.map((v, i) => (
                      <td key={i} className="py-1 px-1 text-center">
                        {v > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-white font-bold"
                                style={{ backgroundColor: getHeatColor(v), fontSize: '9px' }}>
                            {v.toFixed(0)}
                          </span>
                        ) : <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Row: Import Dependency + Per Capita ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Dependency Ranking */}
        {importRanking.length > 0 && (
          <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <AlertTriangle size={16} className="text-red-500" />
              İthalat Bağımlılığı Sıralaması (2023/24)
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(300, importRanking.length * 28)}>
              <BarChart data={importRanking} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="urun" tick={{ fontSize: 10 }} width={95} />
                <Tooltip formatter={(v: number) => [v.toFixed(1) + '%', 'İthalat/Arz']} />
                <Bar dataKey="ratio" radius={[0, 4, 4, 0]}>
                  {importRanking.map((d, i) => (
                    <Cell key={i} fill={d.ratio > 50 ? RED : d.ratio > 30 ? ORANGE : GREEN} />
                  ))}
                </Bar>
                <ReferenceLine x={50} stroke={RED} strokeDasharray="5 5" label={{ value: 'Kritik %50', fontSize: 9, fill: RED }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per Capita Consumption Trends */}
        {perCapitaChartData.length > 0 && (
          <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users size={16} className="text-blue-600" />
              Kişi Başı Tüketim Trendleri (Kg/yıl)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={perCapitaChartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => v.toFixed(0)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [v.toFixed(1) + ' Kg', '']} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {perCapitaProducts.map((p, i) => (
                  <Area key={p} type="monotone" dataKey={p}
                        stroke={AREA_COLORS[i % AREA_COLORS.length]}
                        fill={AREA_COLORS[i % AREA_COLORS.length]}
                        fillOpacity={0.1} strokeWidth={2} dot={{ r: 2 }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── Food Security Alerts ─── */}
      {alerts.length > 0 && (
        <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle size={16} className="text-red-500" />
            Gıda Güvenliği Uyarıları — Yeterlilik Derecesi Risk Analizi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map(a => (
              <div key={a.urun}
                className={`rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                  a.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                  a.severity === 'warning' ? 'bg-orange-50 border border-orange-200' :
                  'bg-yellow-50 border border-yellow-200'
                }`}
                onClick={() => setSelectedProduct(a.urun)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{a.urun}</p>
                    <p className={`text-xs mt-0.5 ${
                      a.severity === 'critical' ? 'text-red-600' :
                      a.severity === 'warning' ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {a.severity === 'critical' ? '🔴 KRİTİK' :
                       a.severity === 'warning' ? '🟠 UYARI' : '🟡 İZLEME'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black" style={{ color: getHeatColor(a.value) }}>
                      {a.value.toFixed(0)}%
                    </p>
                    <p className={`text-[10px] ${a.trend < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {a.trend >= 0 ? '↑' : '↓'} {Math.abs(a.trend).toFixed(1)} puan
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Intelligence Summary ─── */}
      {detail['Üretim'] && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '2px solid var(--border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Activity size={16} className="text-green-400" />
            🧠 İçgörü Özeti — {selectedProduct}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-green-300 font-bold mb-1">Arz Durumu</p>
              <p>{selfSufficiency >= 100
                ? `✅ Kendine yeterli (${selfSufficiency.toFixed(0)}%). Üretim iç talebi karşılıyor.`
                : selfSufficiency >= 70
                ? `⚠️ Kısmen yeterli (${selfSufficiency.toFixed(0)}%). İthalata %${importDep.toFixed(0)} bağımlılık.`
                : `🔴 Yetersiz (${selfSufficiency.toFixed(0)}%). Kritik ithalat bağımlılığı: %${importDep.toFixed(0)}.`}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-blue-300 font-bold mb-1">Üretim Trendi</p>
              <p>{prodYoY > 5
                ? `📈 Güçlü artış (+${prodYoY.toFixed(1)}%). Üretim kapasitesi genişliyor.`
                : prodYoY > 0
                ? `📊 Hafif artış (+${prodYoY.toFixed(1)}%). İstikrarlı üretim.`
                : prodYoY > -5
                ? `📉 Hafif düşüş (${prodYoY.toFixed(1)}%). İzlenmeli.`
                : `🔴 Sert düşüş (${prodYoY.toFixed(1)}%). Acil müdahale gerekli.`}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-orange-300 font-bold mb-1">Ticaret Dengesi</p>
              <p>{exports > imports
                ? `🏆 Net ihracatçı. İhracat/ithalat: ${(exports/Math.max(imports,1)).toFixed(1)}x.`
                : `🔻 Net ithalatçı. İthalat/ihracat: ${(imports/Math.max(exports,1)).toFixed(1)}x.`}
                {' '}AB payı: İhracat %{get('İhracat AB 27-28') > 0 ? (get('İhracat AB 27-28') / exports * 100).toFixed(0) : '0'},
                İthalat %{get('İthalat AB 27-28') > 0 ? (get('İthalat AB 27-28') / imports * 100).toFixed(0) : '0'}.</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <p className="text-purple-300 font-bold mb-1">Kullanım Dağılımı</p>
              <p>İnsan: %{supplyUse > 0 ? (get('İnsan tüketimi') / supplyUse * 100).toFixed(0) : '-'}
                {' '}Yem: %{supplyUse > 0 ? (get('Yemlik kullanım') / supplyUse * 100).toFixed(0) : '-'}
                {' '}Sanayi: %{supplyUse > 0 ? (get('Endüstriyel kullanım') / supplyUse * 100).toFixed(0) : '-'}
                {' '}İhracat: %{supplyUse > 0 ? (exports / supplyUse * 100).toFixed(0) : '-'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
