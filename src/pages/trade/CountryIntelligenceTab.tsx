import { useCallback, useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, Scale, Package } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { fetchQuery, formatMoney, TRADE_TABLES } from '../../services/api';

const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

interface ProductDetail { name: string; exp: number; imp: number; balance: number; category: string }
interface YearDetail { yil: string; exp: number; imp: number; denge: number }
interface MonthDetail { ay: string; exp: number; imp: number }

export default function CountryIntelligenceTab() {
  const [loading, setLoading] = useState(false);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [totalExp, setTotalExp] = useState(0);
  const [totalImp, setTotalImp] = useState(0);
  const [prevExp, setPrevExp] = useState(0);
  const [, setPrevImp] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [topProduct, setTopProduct] = useState('');

  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [yearlyData, setYearlyData] = useState<YearDetail[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthDetail[]>([]);
  const [yearForMonthly, setYearForMonthly] = useState('2024');

  // Load country list
  useEffect(() => {
    (async () => {
      const res = await fetchQuery(`
        SELECT DISTINCT ulke FROM (
          SELECT ulke FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND ulke != ''
          UNION SELECT ulke FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND ulke != ''
        ) t ORDER BY ulke
      `);
      setCountryOptions((res.data || []).map(r => String(r.ulke)));
    })();
  }, []);

  const loadCountry = useCallback(async (country: string) => {
    if (!country) return;
    setLoading(true);
    try {
      const yr = '2024';
      const prevYr = '2023';
      const esc = country.replace(/'/g, "''");

      // KPIs — combine plant + animal for this country
      const [kpi, kpiPrev, pcnt] = await Promise.all([
        fetchQuery(`
          SELECT SUM(exp) as exp, SUM(imp) as imp FROM (
            SELECT ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}' AND ulke='${esc}'
            UNION ALL SELECT ihracat_deger, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}' AND ulke='${esc}'
          ) t
        `),
        fetchQuery(`
          SELECT SUM(exp) as exp, SUM(imp) as imp FROM (
            SELECT ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}' AND ulke='${esc}'
            UNION ALL SELECT ihracat_deger, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}' AND ulke='${esc}'
          ) t
        `),
        fetchQuery(`
          SELECT COUNT(DISTINCT ana_urun) as cnt FROM (
            SELECT ana_urun FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}' AND ulke='${esc}' AND (ihracat_deger > 0 OR ithalat_deger > 0)
            UNION SELECT ana_urun FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}' AND ulke='${esc}' AND (ihracat_deger > 0 OR ithalat_deger > 0)
          ) t
        `),
      ]);

      setTotalExp(Number(kpi.data?.[0]?.exp) || 0);
      setTotalImp(Number(kpi.data?.[0]?.imp) || 0);
      setPrevExp(Number(kpiPrev.data?.[0]?.exp) || 0);
      setPrevImp(Number(kpiPrev.data?.[0]?.imp) || 0);
      setProductCount(Number(pcnt.data?.[0]?.cnt) || 0);

      // Products for this country
      const prodRes = await fetchQuery(`
        SELECT ana_urun, SUM(exp) as exp, SUM(imp) as imp, kategori FROM (
          SELECT ana_urun, ihracat_deger as exp, ithalat_deger as imp, 'bitkisel' as kategori FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}' AND ulke='${esc}'
          UNION ALL SELECT ana_urun, ihracat_deger, ithalat_deger, 'hayvansal' FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}' AND ulke='${esc}'
        ) t GROUP BY ana_urun, kategori ORDER BY exp DESC
      `);
      const pData = (prodRes.data || []).map(r => ({
        name: String(r.ana_urun),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
        balance: (Number(r.exp) || 0) - (Number(r.imp) || 0),
        category: String(r.kategori),
      }));
      setProducts(pData);
      setTopProduct(pData[0]?.name || '-');

      // Yearly trend
      const yearRes = await fetchQuery(`
        SELECT yil, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT yil, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND ulke='${esc}'
          UNION ALL SELECT yil, ihracat_deger, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND ulke='${esc}'
        ) t GROUP BY yil ORDER BY yil
      `);
      setYearlyData((yearRes.data || []).map(r => {
        const e = Number(r.exp) || 0; const i = Number(r.imp) || 0;
        return { yil: String(r.yil), exp: e, imp: i, denge: e - i };
      }));

      // Monthly
      const monthRes = await fetchQuery(`
        SELECT ay, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT ay, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}' AND ulke='${esc}'
          UNION ALL SELECT ay, ihracat_deger, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}' AND ulke='${esc}'
        ) t GROUP BY ay ORDER BY CAST(ay AS UNSIGNED)
      `);
      setMonthlyData((monthRes.data || []).map(r => ({
        ay: MONTHS_TR[String(r.ay)] || String(r.ay),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));
      setYearForMonthly(yr);
    } catch (e) {
      console.error('CountryIntelligence error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedCountry) loadCountry(selectedCountry); }, [selectedCountry, loadCountry]);

  const filteredCountries = countryOptions.filter(c =>
    c.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
  );

  const balance = totalExp - totalImp;
  const yoyGrowth = prevExp > 0 ? ((totalExp - prevExp) / prevExp * 100) : 0;

  return (
    <div>
      {/* Country Selector */}
      <div style={{
        background: 'var(--card-bg)', borderRadius: 12, padding: 20, marginBottom: 20,
        border: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: 16 }}>
          <Globe size={18} style={{ verticalAlign: -3, marginRight: 8 }} />
          Ülke Seçin — Derinlemesine İstihbarat
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Ülke ara... (ör: Almanya, Irak, Rusya)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1, minWidth: 250, padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)',
              fontSize: 14, outline: 'none',
            }}
          />
          <select
            className="filter-select"
            value={selectedCountry}
            onChange={e => { setSelectedCountry(e.target.value); setSearchTerm(''); }}
            style={{ minWidth: 220, padding: '10px 14px' }}
          >
            <option value="">-- Ülke Seçin --</option>
            {filteredCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {['Almanya', 'Irak', 'Rusya', 'İtalya', 'ABD', 'İngiltere', 'Fransa', 'Hollanda', 'İspanya'].map(c => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
                background: selectedCountry === c ? 'var(--accent)' : 'var(--bg)',
                color: selectedCountry === c ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {!selectedCountry && (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          color: 'var(--text-secondary)', fontSize: 16,
        }}>
          <Globe size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <div>Yukarıdan bir ülke seçerek istihbarat analizine başlayın</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.6 }}>240+ ülke · 75 ürün · 2000–2025 verisi</div>
        </div>
      )}

      {loading && <Loading />}

      {selectedCountry && !loading && (
        <>
          {/* Country header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.03))',
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
            border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>🌍</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCountry}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {productCount} ürün grubu ile ticaret · 2024 yılı
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid">
            <KPICard title="İhracat (2024)" value={formatMoney(totalExp)} subtitle={`Yıllık: ${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`} icon={TrendingUp} color="green" large />
            <KPICard title="İthalat (2024)" value={formatMoney(totalImp)} subtitle="Yıllık toplam" icon={TrendingDown} color="orange" large />
            <KPICard title="Denge" value={formatMoney(balance)} subtitle={balance >= 0 ? '✅ Fazla' : '⚠️ Açık'} icon={Scale} color={balance >= 0 ? 'green' : 'orange'} />
            <KPICard title="1. Ürün" value={topProduct} subtitle="En çok ihracat" icon={Package} color="purple" />
          </div>

          {/* Charts */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Aylık Ticaret — {selectedCountry} ({yearForMonthly})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => formatMoney(Number(v))} />
                  <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
                  <Legend formatter={v => v === 'exp' ? 'İhracat' : 'İthalat'} />
                  <Area type="monotone" dataKey="exp" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                  <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📈 Yıllık Ticaret Trendi — {selectedCountry}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => formatMoney(Number(v))} />
                  <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : name === 'imp' ? 'İthalat' : 'Denge']} />
                  <Legend formatter={v => v === 'exp' ? 'İhracat' : v === 'imp' ? 'İthalat' : 'Denge'} />
                  <Bar dataKey="exp" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.8} />
                  <Bar dataKey="imp" fill="#f59e0b" radius={[2, 2, 0, 0]} opacity={0.8} />
                  <Line type="monotone" dataKey="denge" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top products bar */}
          <div className="chart-card" style={{ marginTop: 16 }}>
            <h3 className="chart-title">📦 Ürün Bazlı Ticaret — {selectedCountry} (2024)</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, products.length * 28)}>
              <BarChart data={products.slice(0, 15).map(p => ({
                name: p.name.length > 18 ? p.name.substring(0, 18) + '..' : p.name,
                İhracat: p.exp / 1e6,
                İthalat: p.imp / 1e6,
              }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
                <Legend />
                <Bar dataKey="İhracat" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="İthalat" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Products table */}
          <div className="chart-card" style={{ marginTop: 16 }}>
            <h3 className="chart-title">📋 Ürün Detay Tablosu</h3>
            <div style={{ maxHeight: 450, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--card-bg)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>Ürün</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>Tip</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İhracat ($)</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İthalat ($)</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>Denge ($)</th>
                    <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--text-secondary)' }}>Sinyal</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: p.category === 'bitkisel' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: p.category === 'bitkisel' ? '#10b981' : '#ef4444',
                        }}>
                          {p.category === 'bitkisel' ? '🌿' : '🐄'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatMoney(p.exp)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatMoney(p.imp)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: p.balance >= 0 ? '#10b981' : '#ef4444' }}>
                        {p.balance >= 0 ? '+' : ''}{formatMoney(p.balance)}
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
        </>
      )}
    </div>
  );
}
