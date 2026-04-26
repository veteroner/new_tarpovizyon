import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Beef, Scale, Zap, AlertTriangle } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { fetchQuery, formatMoney, formatNumber, TRADE_TABLES, DEFAULT_TRADE_YEAR } from '../../services/api';

const TABLE = TRADE_TABLES.ANIMAL;
const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};
const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

function calcHHI(values: number[]): number {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  return Math.round(values.reduce((acc, v) => { const s = v / total; return acc + s * s; }, 0) * 10000);
}

interface ProductRow { name: string; exp: number; imp: number; balance: number; expQty: number; impQty: number; unit: string }
interface CountryRow { name: string; exp: number; imp: number }
interface MonthRow { ay: string; exp: number; imp: number }
interface YearRow { yil: string; exp: number; imp: number; denge: number }

export default function AnimalTradeTab() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_TRADE_YEAR);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productOptions, setProductOptions] = useState<string[]>([]);

  const [totalExp, setTotalExp] = useState(0);
  const [totalImp, setTotalImp] = useState(0);
  const [prevExp, setPrevExp] = useState(0);
  const [prevImp, setPrevImp] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [countryCount, setCountryCount] = useState(0);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthRow[]>([]);
  const [yearlyData, setYearlyData] = useState<YearRow[]>([]);

  useEffect(() => {
    (async () => {
      const [yRes, pRes] = await Promise.all([
        fetchQuery(`SELECT DISTINCT yil FROM ${TABLE} ORDER BY yil DESC`),
        fetchQuery(`SELECT DISTINCT ana_urun FROM ${TABLE} WHERE duzey_2='ürün' ORDER BY ana_urun`),
      ]);
      setYearOptions((yRes.data || []).map(r => String(r.yil)));
      setProductOptions((pRes.data || []).map(r => String(r.ana_urun)));
    })();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const yr = selectedYear;
      const prevYr = String(Number(yr) - 1);
      const productWhere = selectedProduct ? ` AND ana_urun='${selectedProduct}'` : '';

      const [kpiRes, kpiPrev, cntRes, ccntRes] = await Promise.all([
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TABLE} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'${productWhere}`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TABLE} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}'${productWhere}`),
        fetchQuery(`SELECT COUNT(DISTINCT ana_urun) as cnt FROM ${TABLE} WHERE duzey_2='ürün' AND yil='${yr}'`),
        fetchQuery(`SELECT COUNT(DISTINCT ulke) as cnt FROM ${TABLE} WHERE duzey_1='ülke' AND yil='${yr}'`),
      ]);

      setTotalExp(Number(kpiRes.data?.[0]?.exp) || 0);
      setTotalImp(Number(kpiRes.data?.[0]?.imp) || 0);
      setPrevExp(Number(kpiPrev.data?.[0]?.exp) || 0);
      setPrevImp(Number(kpiPrev.data?.[0]?.imp) || 0);
      setProductCount(Number(cntRes.data?.[0]?.cnt) || 0);
      setCountryCount(Number(ccntRes.data?.[0]?.cnt) || 0);

      // Products
      const prodRes = await fetchQuery(`
        SELECT ana_urun, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp,
          SUM(ihracat_mik) as exp_q, SUM(ithalat_mik) as imp_q, MAX(miktar_birim) as birim
        FROM ${TABLE} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'${productWhere}
        GROUP BY ana_urun ORDER BY exp DESC
      `);
      setProducts((prodRes.data || []).map(r => ({
        name: String(r.ana_urun),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
        balance: (Number(r.exp) || 0) - (Number(r.imp) || 0),
        expQty: Number(r.exp_q) || 0,
        impQty: Number(r.imp_q) || 0,
        unit: String(r.birim || 'KG'),
      })));

      // Countries top 15
      const cntryRes = await fetchQuery(`
        SELECT ulke, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
        FROM ${TABLE} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'${productWhere}
        AND ulke != '' GROUP BY ulke ORDER BY exp DESC LIMIT 15
      `);
      setCountries((cntryRes.data || []).map(r => ({
        name: String(r.ulke),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));

      // Monthly
      const monthRes = await fetchQuery(`
        SELECT ay, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
        FROM ${TABLE} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'${productWhere}
        GROUP BY ay ORDER BY CAST(ay AS UNSIGNED)
      `);
      setMonthlyData((monthRes.data || []).map(r => ({
        ay: MONTHS_TR[String(r.ay)] || String(r.ay),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));

      // Yearly
      const yearRes = await fetchQuery(`
        SELECT yil, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
        FROM ${TABLE} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil'${productWhere}
        GROUP BY yil ORDER BY yil
      `);
      setYearlyData((yearRes.data || []).map(r => {
        const e = Number(r.exp) || 0; const i = Number(r.imp) || 0;
        return { yil: String(r.yil), exp: e, imp: i, denge: e - i };
      }));
    } catch (e) {
      console.error('AnimalTradeTab error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedProduct]);

  useEffect(() => { loadData(); }, [loadData]);

  const balance = totalExp - totalImp;
  const yoyGrowth = prevExp > 0 ? ((totalExp - prevExp) / prevExp * 100) : 0;
  const impChange = prevImp > 0 ? ((totalImp - prevImp) / prevImp * 100) : 0;

  // HHI for export concentration
  const expHHI = useMemo(() => calcHHI(countries.map(c => c.exp)), [countries]);
  const hhiLabel = expHHI > 2500 ? '🔴 Yüksek Yoğunlaşma' : expHHI > 1500 ? '🟡 Orta' : '🟢 Çeşitlendirilmiş';

  // Pie data for product share
  const pieData = useMemo(() =>
    products.filter(p => p.exp > 0).slice(0, 8).map(p => ({
      name: p.name, value: p.exp,
    })), [products]);

  // Canlı vs İşlenmiş ayrımı — heuristik: ürün adında "canlı" / "damızlık" / "diri" geçiyorsa canlı kabul
  const liveProcessed = useMemo(() => {
    const isLive = (name: string) => /canl[ıi]|dam[ıi]zl[ıi]k|diri/i.test(name);
    let liveExp = 0, liveImp = 0, procExp = 0, procImp = 0;
    let liveCount = 0, procCount = 0;
    for (const p of products) {
      if (isLive(p.name)) {
        liveExp += p.exp; liveImp += p.imp; liveCount++;
      } else {
        procExp += p.exp; procImp += p.imp; procCount++;
      }
    }
    return { liveExp, liveImp, procExp, procImp, liveCount, procCount };
  }, [products]);
  const totalExpForSplit = liveProcessed.liveExp + liveProcessed.procExp;
  const totalImpForSplit = liveProcessed.liveImp + liveProcessed.procImp;
  const liveProcChart = useMemo(() => ([
    { yon: 'İhracat', Canlı: liveProcessed.liveExp, İşlenmiş: liveProcessed.procExp },
    { yon: 'İthalat', Canlı: liveProcessed.liveImp, İşlenmiş: liveProcessed.procImp },
  ]), [liveProcessed]);

  if (loading) return <Loading />;

  return (
    <div>
      {/* Filters */}
      <div className="date-filter" style={{ marginBottom: 16 }}>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Ürün</label>
          <select className="filter-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
            <option value="">Tüm Ürünler</option>
            {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard title="Hayvansal İhracat" value={formatMoney(totalExp)} subtitle={`Yıllık: ${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`} icon={TrendingUp} color="green" large />
        <KPICard title="Hayvansal İthalat" value={formatMoney(totalImp)} subtitle={`Yıllık: ${impChange >= 0 ? '+' : ''}${impChange.toFixed(1)}%`} icon={TrendingDown} color="orange" large />
        <KPICard title="Ticaret Dengesi" value={formatMoney(balance)} subtitle={balance >= 0 ? '✅ Fazla' : '⚠️ Açık'} icon={Scale} color={balance >= 0 ? 'green' : 'orange'} />
        <KPICard title="Ürün Sayısı" value={String(productCount)} subtitle="Hayvansal ürün grubu" icon={Beef} color="red" />
        <KPICard title="Ülke Sayısı" value={String(countryCount)} subtitle="Ticaret ortağı" icon={Zap} color="blue" />
        <KPICard title="HHI Endeksi" value={String(expHHI)} subtitle={hhiLabel} icon={AlertTriangle} color={expHHI > 2500 ? 'orange' : 'green'} />
      </div>

      {/* Intelligence strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Scale size={18} color="#ef4444" />
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>İhracat Yoğunlaşma (HHI)</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{expHHI}</div>
          <div style={{ fontSize: 12, color: '#ef4444' }}>
            {expHHI > 2500 ? 'Çok az ülkeye bağımlılık! Çeşitlendirme gerekli.' : expHHI > 1500 ? 'Orta düzey yoğunlaşma.' : 'İyi çeşitlendirilmiş ihracat portföyü.'}
          </div>
        </div>
        {products[0] && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TrendingUp size={18} color="#10b981" />
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>Lider Ürün</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{products[0].name}</div>
            <div style={{ fontSize: 12, color: '#10b981' }}>
              İhracat: {formatMoney(products[0].exp)} · Pay: %{totalExp > 0 ? ((products[0].exp / totalExp) * 100).toFixed(1) : '0'}
            </div>
          </div>
        )}
        <div style={{
          background: balance >= 0
            ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
          border: balance >= 0 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {balance >= 0 ? <TrendingUp size={18} color="#10b981" /> : <AlertTriangle size={18} color="#f59e0b" />}
            <span style={{ color: balance >= 0 ? '#10b981' : '#f59e0b', fontWeight: 700, fontSize: 13 }}>Ticaret Dengesi</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {balance >= 0 ? '🟢 FAZLA' : '🔴 AÇIK'}
          </div>
          <div style={{ fontSize: 12, color: balance >= 0 ? '#10b981' : '#f59e0b' }}>
            {formatMoney(Math.abs(balance))}
          </div>
        </div>
      </div>

      {/* Canlı vs İşlenmiş Hayvansal Ürün Ayrımı */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <h3 className="chart-title">🐄 Canlı Hayvan vs İşlenmiş Ürün Ayrımı ({selectedYear})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 4 }}>🐄 CANLI — İhracat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.liveExp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: %{totalExpForSplit > 0 ? ((liveProcessed.liveExp / totalExpForSplit) * 100).toFixed(1) : '0'} · {liveProcessed.liveCount} ürün
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 4 }}>🐄 CANLI — İthalat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.liveImp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: %{totalImpForSplit > 0 ? ((liveProcessed.liveImp / totalImpForSplit) * 100).toFixed(1) : '0'}
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>🥩 İŞLENMİŞ — İhracat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.procExp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: %{totalExpForSplit > 0 ? ((liveProcessed.procExp / totalExpForSplit) * 100).toFixed(1) : '0'} · {liveProcessed.procCount} ürün
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>🥩 İŞLENMİŞ — İthalat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.procImp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: %{totalImpForSplit > 0 ? ((liveProcessed.procImp / totalImpForSplit) * 100).toFixed(1) : '0'}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={liveProcChart} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e6).toFixed(0)}M`} />
            <YAxis type="category" dataKey="yon" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={80} />
            <Tooltip formatter={(v: number) => formatMoney(v)} />
            <Legend />
            <Bar dataKey="Canlı" stackId="a" fill="#6366f1" />
            <Bar dataKey="İşlenmiş" stackId="a" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Sınıflandırma heuristiği: ürün adında "canlı" / "damızlık" / "diri" geçenler canlı, diğerleri işlenmiş kabul edilir.
        </p>
      </div>

      {/* Charts Row 1: Monthly + Product Pie */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">📊 Aylık Hayvansal Ticaret ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : 'İthalat'} />
              <Area type="monotone" dataKey="exp" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🥧 Ürün İhracat Dağılımı ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={50}
                label={({ name, percent }) => `${name?.substring(0, 12)} %${((percent ?? 0) * 100).toFixed(0)}`}
                labelLine={{ strokeWidth: 1 }}
              >
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İhracat']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yearly trend */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="chart-title">📈 Yıllık Hayvansal Ticaret Trendi + Denge</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={2} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(1)}B`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(1)}B`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : name === 'imp' ? 'İthalat' : 'Denge']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : v === 'imp' ? 'İthalat' : 'Denge'} />
              <Bar yAxisId="left" dataKey="exp" fill="#ef4444" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Bar yAxisId="left" dataKey="imp" fill="#f59e0b" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Line yAxisId="right" type="monotone" dataKey="denge" stroke="#6366f1" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Countries */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="chart-title">🌍 Top 15 Hayvansal İhracat Ülkesi ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={countries.map(c => ({
              name: c.name.length > 16 ? c.name.substring(0, 16) + '..' : c.name,
              İhracat: c.exp / 1e6,
              İthalat: c.imp / 1e6,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
              <Legend />
              <Bar dataKey="İhracat" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Products Table */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3 className="chart-title">📋 Hayvansal Ürün Detay Tablosu ({selectedYear})</h3>
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>Ürün</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>Birim</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İhracat ($)</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İthalat ($)</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>Denge ($)</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İhr. Mik.</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İth. Mik.</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--text-secondary)' }}>Sinyal</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                  <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: 11 }}>{p.unit}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{formatMoney(p.exp)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatMoney(p.imp)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: p.balance >= 0 ? '#10b981' : '#ef4444' }}>
                    {p.balance >= 0 ? '+' : ''}{formatMoney(p.balance)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNumber(p.expQty)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNumber(p.impQty)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {p.balance > 0 ? '🟢' : p.balance === 0 ? '⚪' : '🔴'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
