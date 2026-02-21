import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Leaf, ArrowLeftRight, Zap } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { TreemapContent } from '../../components/TreemapContent';
import { fetchQuery, formatMoney, formatNumber, TRADE_TABLES } from '../../services/api';

const TABLE = TRADE_TABLES.PLANT;
const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};
const COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46', '#064e3b', '#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0'];

interface ProductRow { name: string; exp: number; imp: number; balance: number; expQty: number; impQty: number; unit: string }
interface CountryRow { name: string; exp: number; imp: number }
interface MonthRow { ay: string; exp: number; imp: number }
interface YearRow { yil: string; exp: number; imp: number; denge: number }

export default function PlantTradeTab() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2024');
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

  // Load filters
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

      // KPIs
      const [kpiRes, kpiPrev, cntRes, ccntRes] = await Promise.all([
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TABLE} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'${productWhere}`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TABLE} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}'${productWhere}`),
        fetchQuery(`SELECT COUNT(DISTINCT ana_urun) as cnt FROM ${TABLE} WHERE duzey_2='ürün' AND yil='${yr}'`),
        fetchQuery(`SELECT COUNT(DISTINCT ulke) as cnt FROM ${TABLE} WHERE duzey_1='ülke' AND yil='${yr}'`),
      ]);

      setTotalExp(Number(kpiRes.data?.[0]?.exp) || 0);
      setTotalImp(Number(kpiRes.data?.[0]?.imp) || 0);
      setPrevExp(Number(kpiPrev.data?.[0]?.exp) || 0);
      setPrevImp(Number(kpiPrev.data?.[0]?.imp) || 0);
      setProductCount(Number(cntRes.data?.[0]?.cnt) || 0);
      setCountryCount(Number(ccntRes.data?.[0]?.cnt) || 0);

      // Products table
      const prodRes = await fetchQuery(`
        SELECT ana_urun, 
          SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp,
          SUM(ihracat_mik) as exp_q, SUM(ithalat_mik) as imp_q,
          MAX(miktar_birim) as birim
        FROM ${TABLE} 
        WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'${productWhere}
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
        FROM ${TABLE} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'${productWhere}
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
        FROM ${TABLE} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'${productWhere}
        GROUP BY ay ORDER BY CAST(ay AS UNSIGNED)
      `);
      setMonthlyData((monthRes.data || []).map(r => ({
        ay: MONTHS_TR[String(r.ay)] || String(r.ay),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));

      // Yearly trend
      const yearRes = await fetchQuery(`
        SELECT yil, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
        FROM ${TABLE} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay'${productWhere}
        GROUP BY yil ORDER BY yil
      `);
      setYearlyData((yearRes.data || []).map(r => {
        const e = Number(r.exp) || 0; const i = Number(r.imp) || 0;
        return { yil: String(r.yil), exp: e, imp: i, denge: e - i };
      }));
    } catch (e) {
      console.error('PlantTradeTab error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedProduct]);

  useEffect(() => { loadData(); }, [loadData]);

  const balance = totalExp - totalImp;
  const yoyGrowth = prevExp > 0 ? ((totalExp - prevExp) / prevExp * 100) : 0;
  const impChange = prevImp > 0 ? ((totalImp - prevImp) / prevImp * 100) : 0;

  const treemapData = useMemo(() =>
    products.filter(p => p.exp > 0).slice(0, 15).map((p, i) => ({
      name: p.name, size: p.exp, value: p.exp, fill: COLORS[i % COLORS.length],
    })), [products]);

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
          <label className="filter-label">Ürün Filtresi</label>
          <select className="filter-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
            <option value="">Tüm Ürünler</option>
            {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard title="Bitkisel İhracat" value={formatMoney(totalExp)} subtitle={`YoY: ${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`} icon={TrendingUp} color="green" large />
        <KPICard title="Bitkisel İthalat" value={formatMoney(totalImp)} subtitle={`YoY: ${impChange >= 0 ? '+' : ''}${impChange.toFixed(1)}%`} icon={TrendingDown} color="orange" large />
        <KPICard title="Ticaret Dengesi" value={formatMoney(balance)} subtitle={balance >= 0 ? '✅ Fazla' : '⚠️ Açık'} icon={ArrowLeftRight} color={balance >= 0 ? 'green' : 'orange'} />
        <KPICard title="Ürün Sayısı" value={String(productCount)} subtitle="Bitkisel ürün grubu" icon={Leaf} color="green" />
        <KPICard title="Ülke Sayısı" value={String(countryCount)} subtitle="Ticaret ortağı" icon={Zap} color="blue" />
        <KPICard title="İhracat/İthalat" value={(totalImp > 0 ? (totalExp / totalImp) : 0).toFixed(2)} subtitle="Karşılama oranı" icon={ArrowLeftRight} color="purple" />
      </div>

      {/* Charts Row 1 */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">📊 Aylık Bitkisel Ticaret ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(1)}B`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : 'İthalat'} />
              <Area type="monotone" dataKey="exp" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📈 Yıllık Bitkisel Trend + Denge</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={2} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(0)}B`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(0)}B`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : name === 'imp' ? 'İthalat' : 'Denge']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : v === 'imp' ? 'İthalat' : 'Denge'} />
              <Bar yAxisId="left" dataKey="exp" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Bar yAxisId="left" dataKey="imp" fill="#f59e0b" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Line yAxisId="right" type="monotone" dataKey="denge" stroke="#6366f1" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Treemap */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="chart-title">🌿 İhracat Ürün Treemap ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={380}>
            <Treemap data={treemapData} dataKey="size" stroke="#fff" content={<TreemapContent />}>
              {treemapData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İhracat']} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Countries */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="chart-title">🌍 Top 15 İhracat Ülkesi ({selectedYear})</h3>
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
              <Bar dataKey="İhracat" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Products Detail Table */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3 className="chart-title">📋 Bitkisel Ürün Detay Tablosu ({selectedYear})</h3>
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>Ürün</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İhracat ($)</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İthalat ($)</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>Denge ($)</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İhr. Miktar</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İth. Miktar</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--text-secondary)' }}>Sinyal</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                  <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatMoney(p.exp)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatMoney(p.imp)}</td>
                  <td style={{
                    padding: '8px', textAlign: 'right', fontWeight: 600,
                    color: p.balance >= 0 ? '#10b981' : '#ef4444',
                  }}>
                    {p.balance >= 0 ? '+' : ''}{formatMoney(p.balance)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {formatNumber(p.expQty / 1000)} ton
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {formatNumber(p.impQty / 1000)} ton
                  </td>
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
