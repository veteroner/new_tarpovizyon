import { useCallback, useEffect, useState } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Scatter, ScatterChart, ZAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRightLeft, BarChart3, Brain, Crosshair, FileWarning,
  Lightbulb, Shield, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { fetchQuery } from '../services/api';

/* ------------------------------------------------------------------ */
/*  SABİTLER                                                          */
/* ------------------------------------------------------------------ */
const YEAR_COLS = [
  'y2015/16', 'y2016/17', 'y2017/18', 'y2018/19', 'y2019/20',
  'y2020/21', 'y2021/22', 'y2022/23', 'y2023/24',
];
const YEAR_LABELS = YEAR_COLS.map(c => c.replace('y', '').split('/')[0]);
const YEAR_SQL = YEAR_COLS.map(c => `\`${c}\``).join(', ');

const MONTH_COLS = [
  '`Ocak`', '`Şubat`', '`Mart`', '`Nisan`', '`Mayıs`', '`Haziran`',
  '`Temmuz`', '`Ağustos`', '`Eylül`', '`Ekim`', '`Kasım`', '`Aralık`',
];


// Products that exist in both production, trade AND price index data
const CROSS_PRODUCTS = [
  { label: 'Buğday', urundenge: 'Buğday (toplam)', trade: 'Buğday', priceKey: 'Buğday' },
  { label: 'Arpa', urundenge: 'Arpa', trade: 'Arpa', priceKey: 'Arpa' },
  { label: 'Mısır', urundenge: 'Mısır', trade: 'Mısır', priceKey: 'Mısır' },
  { label: 'Pirinç', urundenge: 'Pirinç', trade: 'Pirinç', priceKey: 'Pirinç' },
  { label: 'Ayçiçeği', urundenge: 'Ayçiçeği', trade: 'Ayçiçeği', priceKey: 'Ayçiçeği' },
  { label: 'Şekerpancarı', urundenge: 'Şeker pancarı', trade: '', priceKey: 'Şeker' },
  { label: 'Patates', urundenge: 'Patates', trade: '', priceKey: 'Patates' },
  { label: 'Mercimek', urundenge: 'Kırmızı mercimek', trade: 'Mercimek', priceKey: 'Mercimek' },
  { label: 'Nohut', urundenge: 'Nohut', trade: 'Nohut', priceKey: 'Nohut' },
  { label: 'Çay', urundenge: 'Çay', trade: 'Çay', priceKey: 'Çay' },
];

/* ------------------------------------------------------------------ */
/*  TIPLER                                                            */
/* ------------------------------------------------------------------ */
interface CrossRow {
  year: string;
  production: number;
  exports: number;
  imports: number;
  sufficiency: number;
  priceIndex: number;
}
interface InsightMsg { type: 'warning' | 'info' | 'danger' | 'success'; text: string }
interface RadarDim { dimension: string; value: number; fullMark: number }
interface ScatterPoint { x: number; y: number; name: string; size: number }

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                         */
/* ------------------------------------------------------------------ */
export default function CrossIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(0); // index into CROSS_PRODUCTS

  // Cross data
  const [crossData, setCrossData] = useState<CrossRow[]>([]);
  const [insights, setInsights] = useState<InsightMsg[]>([]);
  const [radar, setRadar] = useState<RadarDim[]>([]);
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);

  // Global food security overview
  const [foodSecurityTable, setFoodSecurityTable] = useState<{
    product: string; sufficiency: number; importDep: number; consumption: number; trend: string;
  }[]>([]);

  const product = CROSS_PRODUCTS[selected];

  /* ----- LOAD ----- */
  const loadCross = useCallback(async (pIdx: number) => {
    setLoading(true);
    setError(false);
    const p = CROSS_PRODUCTS[pIdx];
    try {
      /* 1. Ürün dengesi — üretim, ithalat, ihracat, yeterlilik */
      const [prodRes, impRes, expRes, suffRes] = await Promise.all([
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='Üretim'`),
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='İthalat'`),
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='İhracat'`),
        fetchQuery(`SELECT ${YEAR_SQL} FROM tuik_urundenge WHERE TRIM(urun)='${p.urundenge}' AND \`fasıl\`='Yeterlilik derecesi'`),
      ]);

      const getYearVals = (res: typeof prodRes) => {
        if (!res.data?.[0]) return YEAR_COLS.map(() => 0);
        return YEAR_COLS.map(c => Number(res.data![0][c]) || 0);
      };

      const productions = getYearVals(prodRes);
      const imports = getYearVals(impRes);
      const exports = getYearVals(expRes);
      const sufficiencies = getYearVals(suffRes);

      /* 2. Fiyat endeksi (T-GFE veya TÜFE gıda) */
      let priceIndices = YEAR_LABELS.map(() => 100);
      if (p.priceKey) {
        const priceRes = await fetchQuery(`
          SELECT yil, AVG((${MONTH_COLS.join('+')}) / 12) as avg_idx
          FROM tuik_fiyatendex
          WHERE endeks='T-GFE' AND (d2 LIKE '%${p.priceKey}%' OR d3 LIKE '%${p.priceKey}%')
          AND yil >= 2015 AND yil <= 2024
          GROUP BY yil ORDER BY yil
        `);
        if (priceRes.data?.length) {
          const priceMap: Record<string, number> = {};
          for (const r of priceRes.data) priceMap[String(r.yil)] = Number(r.avg_idx) || 100;
          priceIndices = YEAR_LABELS.map(y => priceMap[y] || 100);
        }
      }

      /* 3. Cross data construction */
      const rows: CrossRow[] = YEAR_LABELS.map((y, i) => ({
        year: y,
        production: productions[i],
        exports: exports[i],
        imports: imports[i],
        sufficiency: sufficiencies[i],
        priceIndex: priceIndices[i],
      }));
      setCrossData(rows);

      /* 4. Otomatik Insights (en önemli kısım!) */
      const msgs: InsightMsg[] = [];
      const latest = rows[rows.length - 1];
      const prev = rows[rows.length - 2];
      if (latest && prev) {
        // Production trend
        const prodChange = prev.production > 0 ? ((latest.production - prev.production) / prev.production) * 100 : 0;
        if (prodChange < -10) {
          msgs.push({ type: 'danger', text: `${p.label} üretimi %${Math.abs(prodChange).toFixed(1)} düştü → İthalat baskısı artabilir` });
        } else if (prodChange > 15) {
          msgs.push({ type: 'success', text: `${p.label} üretimi %${prodChange.toFixed(1)} arttı → İhracat potansiyeli yükseliyor` });
        }

        // Import dependency
        const impDep = latest.imports > 0 && (latest.production + latest.imports) > 0
          ? (latest.imports / (latest.production + latest.imports)) * 100 : 0;
        if (impDep > 30) {
          msgs.push({ type: 'warning', text: `İthalat bağımlılığı %${impDep.toFixed(1)} → Kritik eşik (%30) aşıldı! Dış fiyat şoklarına açık` });
        }

        // Sufficiency
        if (latest.sufficiency > 0 && latest.sufficiency < 80) {
          msgs.push({ type: 'danger', text: `Yeterlilik derecesi %${latest.sufficiency.toFixed(0)} → Gıda güvenliği riski! Üretim artışı veya ithalat çeşitlendirmesi gerekli` });
        } else if (latest.sufficiency > 120) {
          msgs.push({ type: 'success', text: `Yeterlilik derecesi %${latest.sufficiency.toFixed(0)} → Fazla üretim, ihracat ile değerlendirme fırsatı` });
        }

        // Price-production inverse correlation check
        const prodDelta = prodChange;
        const priceDelta = prev.priceIndex > 0 ? ((latest.priceIndex - prev.priceIndex) / prev.priceIndex) * 100 : 0;
        if (prodDelta < -5 && priceDelta > 10) {
          msgs.push({ type: 'warning', text: `Üretim ↓%${Math.abs(prodDelta).toFixed(0)} iken fiyat ↑%${priceDelta.toFixed(0)} → Arz daralması fiyatı yukarı itiyor` });
        } else if (prodDelta > 10 && priceDelta < -5) {
          msgs.push({ type: 'info', text: `Üretim ↑%${prodDelta.toFixed(0)} iken fiyat ↓%${Math.abs(priceDelta).toFixed(0)} → Arz bolluğu fiyatı baskılıyor` });
        }

        // Trade balance
        if (latest.imports > latest.exports * 5 && latest.imports > 1e4) {
          msgs.push({ type: 'danger', text: `İthalat, ihracatın ${(latest.imports / Math.max(1, latest.exports)).toFixed(0)} katı → Ticaret açığı derinleşiyor` });
        }
      }
      if (msgs.length === 0) {
        msgs.push({ type: 'info', text: `${p.label} için şu an kritik bir sinyal tespit edilmedi. Veriler stabil.` });
      }
      setInsights(msgs);

      /* 5. Radar — Gıda Güvenliği 5-Boyut */
      const latestR = rows[rows.length - 1];
      if (latestR) {
        const impDep = latestR.imports > 0 ? (latestR.imports / (latestR.production + latestR.imports)) * 100 : 0;
        // Volatility = std_dev of production / mean
        const meanProd = productions.reduce((a, b) => a + b, 0) / productions.length;
        const stdProd = Math.sqrt(productions.reduce((s, v) => s + (v - meanProd) ** 2, 0) / productions.length);
        const volatility = meanProd > 0 ? (stdProd / meanProd) * 100 : 0;

        // Price stability = inverse of price change volatility
        const priceChanges = priceIndices.slice(1).map((v, i) => priceIndices[i] > 0 ? ((v - priceIndices[i]) / priceIndices[i]) * 100 : 0);
        const meanPC = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
        const stdPC = Math.sqrt(priceChanges.reduce((s, v) => s + (v - meanPC) ** 2, 0) / priceChanges.length);
        const priceStab = Math.max(0, Math.min(100, 100 - stdPC * 2));

        const tradeBalance = latestR.exports > 0 ? Math.min(100, (latestR.exports / Math.max(1, latestR.imports)) * 50) : 5;

        setRadar([
          { dimension: 'Yeterlilik', value: Math.min(100, latestR.sufficiency), fullMark: 100 },
          { dimension: 'İthalat Bağımsızlığı', value: Math.max(0, 100 - impDep), fullMark: 100 },
          { dimension: 'Fiyat Stabilitesi', value: priceStab, fullMark: 100 },
          { dimension: 'Ticaret Dengesi', value: tradeBalance, fullMark: 100 },
          { dimension: 'Üretim Stabilitesi', value: Math.max(0, 100 - volatility * 3), fullMark: 100 },
        ]);
      }

      /* 6. Scatter — Tüm ürünler: Üretim vs Yeterlilik (son yıl) */
      const [allSuff, allProd2] = await Promise.all([
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Yeterlilik derecesi' AND \`y2023/24\` > 0`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Üretim' AND \`y2023/24\` > 0`),
      ]);

      const suffMap: Record<string, number> = {};
      for (const r of (allSuff.data || [])) suffMap[String(r.urun).trim()] = Number(r.val) || 0;
      const scatter: ScatterPoint[] = [];
      for (const r of (allProd2.data || [])) {
        const name = String(r.urun).trim();
        const prod = Number(r.val) || 0;
        const suff = suffMap[name];
        if (suff && suff > 0) scatter.push({ x: prod, y: suff, name, size: prod });
      }
      setScatterData(scatter.sort((a, b) => b.x - a.x).slice(0, 30));

      /* 7. Global food security table */
      const [fsTable, fsCons, fsImp, fsProd] = await Promise.all([
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Yeterlilik derecesi' ORDER BY CAST(\`y2023/24\` AS DECIMAL) ASC`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as val FROM tuik_urundenge WHERE \`fasıl\`='Kişi başına tüketim' ORDER BY urun`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as imp, \`y2022/23\` as imp_prev FROM tuik_urundenge WHERE \`fasıl\`='İthalat'`),
        fetchQuery(`SELECT TRIM(urun) as urun, \`y2023/24\` as prod FROM tuik_urundenge WHERE \`fasıl\`='Üretim'`),
      ]);

      const consMap: Record<string, number> = {};
      for (const r of (fsCons.data || [])) consMap[String(r.urun).trim()] = Number(r.val) || 0;
      const impMap: Record<string, { imp: number; prev: number }> = {};
      for (const r of (fsImp.data || [])) impMap[String(r.urun).trim()] = { imp: Number(r.imp) || 0, prev: Number(r.imp_prev) || 0 };
      const prodMap2: Record<string, number> = {};
      for (const r of (fsProd.data || [])) prodMap2[String(r.urun).trim()] = Number(r.prod) || 0;

      const fsRows = (fsTable.data || [])
        .filter(r => Number(r.val) > 0)
        .map(r => {
          const name = String(r.urun).trim();
          const suff = Number(r.val) || 0;
          const imp = impMap[name]?.imp || 0;
          const prod = prodMap2[name] || 0;
          const impDep = (prod + imp) > 0 ? (imp / (prod + imp)) * 100 : 0;
          const impPrev = impMap[name]?.prev || 0;
          const trend = impPrev > 0 ? ((imp - impPrev) / impPrev) * 100 : 0;
          return {
            product: name,
            sufficiency: suff,
            importDep: impDep,
            consumption: consMap[name] || 0,
            trend: trend > 5 ? '↑ İthalat artıyor' : trend < -5 ? '↓ İthalat azalıyor' : '→ Stabil',
          };
        });
      setFoodSecurityTable(fsRows);

    } catch (e) {
      console.error('CrossIntelligence error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCross(selected); }, [selected, loadCross]);

  if (loading) return <Loading />;
  if (error) return <ErrorState title="Çapraz analiz yüklenemedi" onRetry={() => loadCross(selected)} />;

  const latestRow = crossData[crossData.length - 1];

  return (
    <div className="space-y-6 pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Brain className="w-7 h-7 text-green-600" />
            Çapraz İstihbarat Analizi
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Üretim ↔ Fiyat ↔ Ticaret ↔ Gıda Güvenliği bağlantısı
          </p>
        </div>
        <select
          className="px-4 py-2 border-2 border-green-200 rounded-lg text-sm font-medium bg-green-50"
          value={selected}
          onChange={e => setSelected(Number(e.target.value))}
        >
          {CROSS_PRODUCTS.map((p, i) => (
            <option key={i} value={i}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Insights Panel */}
      <div className="rounded-xl p-5 shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          Otomatik İstihbarat Sinyalleri — {product.label}
        </h3>
        <div className="space-y-2">
          {insights.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
              m.type === 'danger' ? 'bg-red-500/20 border border-red-500/30' :
              m.type === 'warning' ? 'bg-amber-500/20 border border-amber-500/30' :
              m.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
              'bg-blue-500/20 border border-blue-500/30'
            }`}>
              {m.type === 'danger' ? <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> :
               m.type === 'warning' ? <FileWarning className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /> :
               m.type === 'success' ? <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /> :
               <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />}
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{m.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {latestRow && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-xl border p-4 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Üretim (Son Yıl)</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{latestRow.production > 1e6 ? `${(latestRow.production / 1e6).toFixed(1)}M ton` : `${(latestRow.production / 1e3).toFixed(0)}K ton`}</p>
          </div>
          <div className="rounded-xl border p-4 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>İthalat</p>
            <p className="text-xl font-bold text-red-600">{latestRow.imports > 1e6 ? `${(latestRow.imports / 1e6).toFixed(1)}M ton` : `${(latestRow.imports / 1e3).toFixed(0)}K ton`}</p>
          </div>
          <div className="rounded-xl border p-4 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>İhracat</p>
            <p className="text-xl font-bold text-green-600">{latestRow.exports > 1e6 ? `${(latestRow.exports / 1e6).toFixed(1)}M ton` : `${(latestRow.exports / 1e3).toFixed(0)}K ton`}</p>
          </div>
          <div className="rounded-xl border p-4 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Yeterlilik</p>
            <p className={`text-xl font-bold ${latestRow.sufficiency >= 100 ? 'text-green-600' : latestRow.sufficiency >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
              %{latestRow.sufficiency.toFixed(0)}
            </p>
          </div>
          <div className="rounded-xl border p-4 shadow-sm" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Fiyat Endeksi</p>
            <p className="text-xl font-bold text-purple-600">{latestRow.priceIndex.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Main Cross Chart + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cross Time Series */}
        <div className="lg:col-span-2 rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ArrowRightLeft className="w-4 h-4 text-green-600" />
            {product.label} — Üretim × İthalat × İhracat × Fiyat (2015-2024)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={crossData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" fontSize={10} />
              <YAxis yAxisId="left" fontSize={9} tickFormatter={v => v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" fontSize={9} />
              <Tooltip formatter={(v: number, name: string) => {
                if (name.includes('Fiyat') || name.includes('Yeterlilik')) return [v.toFixed(1), name];
                return [v > 1e6 ? `${(v / 1e6).toFixed(2)}M ton` : `${(v / 1e3).toFixed(0)}K ton`, name];
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="production" fill="#10b981" name="Üretim" opacity={0.7} />
              <Bar yAxisId="left" dataKey="imports" fill="#ef4444" name="İthalat" opacity={0.7} />
              <Bar yAxisId="left" dataKey="exports" fill="#3b82f6" name="İhracat" opacity={0.7} />
              <Line yAxisId="right" type="monotone" dataKey="priceIndex" stroke="#8b5cf6" strokeWidth={2.5} name="Fiyat Endeksi" dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="sufficiency" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Yeterlilik %" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield className="w-4 h-4 text-green-600" />
            Gıda Güvenliği Radarı
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar name={product.label} dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {radar.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-primary)' }}>{r.dimension}</span>
                <span className={`font-bold ${r.value >= 70 ? 'text-green-600' : r.value >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {r.value.toFixed(0)}/100
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Production vs Sufficiency Scatter */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Crosshair className="w-4 h-4 text-blue-600" />
          Üretim vs Yeterlilik Derecesi — Tüm Ürünler (2023/24)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" name="Üretim (ton)" fontSize={9} tickFormatter={v => v > 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} />
            <YAxis dataKey="y" name="Yeterlilik %" fontSize={9} domain={[0, 'auto']} />
            <ZAxis dataKey="size" range={[50, 400]} />
            <Tooltip content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload as ScatterPoint;
              return (
                <div className="border rounded-lg shadow-lg p-3 text-xs" style={{ background: 'var(--bg-card)' }}>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
                  <p>Üretim: {d.x > 1e6 ? `${(d.x / 1e6).toFixed(1)}M ton` : `${(d.x / 1e3).toFixed(0)}K ton`}</p>
                  <p className={d.y >= 100 ? 'text-green-600' : 'text-red-600'}>Yeterlilik: %{d.y.toFixed(0)}</p>
                </div>
              );
            }} />
            {/* Reference line at 100% sufficiency */}
            <Scatter data={scatterData} fill="#16a34a">
              {scatterData.map((s, i) => (
                <Cell key={i} fill={s.y >= 100 ? '#10b981' : s.y >= 80 ? '#f59e0b' : '#ef4444'} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-primary)' }}>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Yeterli (%100+)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> Kısmi (%80-100)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Yetersiz (&lt;%80)</span>
        </div>
      </div>

      {/* Food Security Ranking Table */}
      <div className="rounded-xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 className="w-4 h-4 text-red-600" />
          Gıda Güvenliği Risk Sıralaması — En Düşük Yeterlilik (2023/24)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Ürün</th>
                <th className="text-center px-3 py-2">Yeterlilik</th>
                <th className="text-center px-3 py-2">İthalat Bağımlılığı</th>
                <th className="text-center px-3 py-2">Kişi Başı Tüketim</th>
                <th className="text-center px-3 py-2">Trend</th>
                <th className="text-center px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {foodSecurityTable.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-t hover:bg-green-50">
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.product}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold ${r.sufficiency >= 100 ? 'text-green-600' : r.sufficiency >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      %{r.sufficiency.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-2" style={{ background: 'var(--bg-primary)' }}>
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, r.importDep)}%`,
                            backgroundColor: r.importDep > 50 ? '#ef4444' : r.importDep > 20 ? '#f59e0b' : '#10b981',
                          }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right" style={{ color: 'var(--text-primary)' }}>%{r.importDep.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: 'var(--text-primary)' }}>{r.consumption > 0 ? `${r.consumption.toFixed(1)} kg` : '-'}</td>
                  <td className="px-3 py-2 text-center">
                    {r.trend.includes('↑') ? (
                      <span className="text-red-500 text-xs flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> {r.trend}</span>
                    ) : r.trend.includes('↓') ? (
                      <span className="text-green-500 text-xs flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" /> {r.trend}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.trend}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.sufficiency < 80 && r.importDep > 30 ? (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">KRİTİK</span>
                    ) : r.sufficiency < 100 ? (
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">ORTA</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">DÜŞÜK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross Correlation Explanation */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '2px solid #16a34a' }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Brain className="w-5 h-5 text-green-600" />
          Çapraz Analiz Nasıl Çalışır?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--text-primary)' }}>
          <div className="space-y-1">
            <p className="font-medium text-green-700">1. Üretim ↔ Fiyat</p>
            <p className="text-xs">Üretim düşünce fiyatlar artar mı? Arz-talep yasası test edilir.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-blue-700">2. Üretim ↔ Ticaret</p>
            <p className="text-xs">Üretim açığı ithalatla kapatılıyor mu? Bağımlılık oranı ölçülür.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-purple-700">3. Fiyat ↔ Gıda Güvenliği</p>
            <p className="text-xs">Yeterlilik derecesi düşük ürünlerde fiyat volatilitesi yüksek mi?</p>
          </div>
        </div>
      </div>
    </div>
  );
}
