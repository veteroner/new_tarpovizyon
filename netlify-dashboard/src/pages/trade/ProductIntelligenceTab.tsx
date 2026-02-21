import { useCallback, useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Search, TrendingUp, TrendingDown, Scale, Package, Globe } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { fetchQuery, formatMoney, TRADE_TABLES } from '../../services/api';

const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

interface CountryDetail { name: string; exp: number; imp: number; balance: number }
interface YearDetail { yil: string; exp: number; imp: number; denge: number }
interface MonthDetail { ay: string; exp: number; imp: number }

export default function ProductIntelligenceTab() {
  const [loading, setLoading] = useState(false);
  const [productOptions, setProductOptions] = useState<{ name: string; category: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [totalExp, setTotalExp] = useState(0);
  const [totalImp, setTotalImp] = useState(0);
  const [prevExp, setPrevExp] = useState(0);
  const [, setPrevImp] = useState(0);
  const [topCountry, setTopCountry] = useState('');
  const [countryCount, setCountryCount] = useState(0);
  const [productCategory, setProductCategory] = useState('');

  const [countries, setCountries] = useState<CountryDetail[]>([]);
  const [yearlyData, setYearlyData] = useState<YearDetail[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthDetail[]>([]);
  const [yearForMonthly, setYearForMonthly] = useState('2024');

  // Load product list
  useEffect(() => {
    (async () => {
      const [pRes, aRes] = await Promise.all([
        fetchQuery(`SELECT DISTINCT ana_urun FROM ${TRADE_TABLES.PLANT} WHERE duzey_2='ürün' ORDER BY ana_urun`),
        fetchQuery(`SELECT DISTINCT ana_urun FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_2='ürün' ORDER BY ana_urun`),
      ]);
      const plantP = (pRes.data || []).map(r => ({ name: String(r.ana_urun), category: 'bitkisel' }));
      const animalP = (aRes.data || []).map(r => ({ name: String(r.ana_urun), category: 'hayvansal' }));
      setProductOptions([...plantP, ...animalP]);
    })();
  }, []);

  const loadProduct = useCallback(async (product: string) => {
    if (!product) return;
    setLoading(true);
    try {
      const cat = productOptions.find(p => p.name === product)?.category;
      setProductCategory(cat || '');
      const table = cat === 'hayvansal' ? TRADE_TABLES.ANIMAL : TRADE_TABLES.PLANT;
      // bitkisel tablosunda duzey_1='tüm' ve duzey_3='yil' verisi yok
      const d1Agg = cat === 'bitkisel' ? 'ülke' : 'tüm';
      const d3Year = cat === 'bitkisel' ? 'ay' : 'yil';
      const yr = '2024';
      const prevYr = '2023';

      const [kpi, kpiPrev, ccnt] = await Promise.all([
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${table} WHERE duzey_1='${d1Agg}' AND duzey_2='ürün' AND duzey_3='${d3Year}' AND yil='${yr}' AND ana_urun='${product}'`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${table} WHERE duzey_1='${d1Agg}' AND duzey_2='ürün' AND duzey_3='${d3Year}' AND yil='${prevYr}' AND ana_urun='${product}'`),
        fetchQuery(`SELECT COUNT(DISTINCT ulke) as cnt FROM ${table} WHERE duzey_1='ülke' AND duzey_3='${d3Year}' AND yil='${yr}' AND ana_urun='${product}' AND (ihracat_deger > 0 OR ithalat_deger > 0)`),
      ]);

      setTotalExp(Number(kpi.data?.[0]?.exp) || 0);
      setTotalImp(Number(kpi.data?.[0]?.imp) || 0);
      setPrevExp(Number(kpiPrev.data?.[0]?.exp) || 0);
      setPrevImp(Number(kpiPrev.data?.[0]?.imp) || 0);
      setCountryCount(Number(ccnt.data?.[0]?.cnt) || 0);

      // Countries
      const cntryRes = await fetchQuery(`
        SELECT ulke, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
        FROM ${table} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='${d3Year}' AND yil='${yr}' AND ana_urun='${product}'
        AND ulke != '' GROUP BY ulke ORDER BY exp DESC LIMIT 20
      `);
      const cData = (cntryRes.data || []).map(r => ({
        name: String(r.ulke),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
        balance: (Number(r.exp) || 0) - (Number(r.imp) || 0),
      }));
      setCountries(cData);
      setTopCountry(cData[0]?.name || '-');

      // Yearly trend
      const yearRes = await fetchQuery(`
        SELECT yil, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
        FROM ${table} WHERE duzey_1='${d1Agg}' AND duzey_2='ürün' AND duzey_3='${d3Year}' AND ana_urun='${product}'
        GROUP BY yil ORDER BY yil
      `);
      setYearlyData((yearRes.data || []).map(r => {
        const e = Number(r.exp) || 0; const i = Number(r.imp) || 0;
        return { yil: String(r.yil), exp: e, imp: i, denge: e - i };
      }));

      // Monthly for selected year
      const monthRes = await fetchQuery(`
        SELECT ay, SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp
        FROM ${table} WHERE duzey_1='${d1Agg}' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}' AND ana_urun='${product}'
        GROUP BY ay ORDER BY CAST(ay AS UNSIGNED)
      `);
      setMonthlyData((monthRes.data || []).map(r => ({
        ay: MONTHS_TR[String(r.ay)] || String(r.ay),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));
      setYearForMonthly(yr);
    } catch (e) {
      console.error('ProductIntelligence error:', e);
    } finally {
      setLoading(false);
    }
  }, [productOptions]);

  useEffect(() => { if (selectedProduct) loadProduct(selectedProduct); }, [selectedProduct, loadProduct]);

  const filteredProducts = productOptions.filter(p =>
    p.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
  );

  const balance = totalExp - totalImp;
  const yoyGrowth = prevExp > 0 ? ((totalExp - prevExp) / prevExp * 100) : 0;

  return (
    <div>
      {/* Product Selector */}
      <div style={{
        background: 'var(--card-bg)', borderRadius: 12, padding: 20, marginBottom: 20,
        border: '1px solid var(--border)',
      }}>
        <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: 16 }}>
          <Search size={18} style={{ verticalAlign: -3, marginRight: 8 }} />
          Ürün Seçin — Derinlemesine İstihbarat
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Ürün ara... (ör: Fındık, Buğday, Piliç Eti)"
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
            value={selectedProduct}
            onChange={e => { setSelectedProduct(e.target.value); setSearchTerm(''); }}
            style={{ minWidth: 220, padding: '10px 14px' }}
          >
            <option value="">-- Ürün Seçin --</option>
            {filteredProducts.map(p => (
              <option key={p.name + p.category} value={p.name}>
                {p.category === 'bitkisel' ? '🌿' : '🐄'} {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick pick buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {['Fındık', 'Buğday', 'Pamuk', 'Zeytinyağı', 'Soya', 'Piliç Eti', 'Mercimek', 'Mısır', 'Üzüm Kuru'].map(p => (
            <button
              key={p}
              onClick={() => setSelectedProduct(p)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
                background: selectedProduct === p ? 'var(--accent)' : 'var(--bg)',
                color: selectedProduct === p ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {!selectedProduct && (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          color: 'var(--text-secondary)', fontSize: 16,
        }}>
          <Package size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <div>Yukarıdan bir ürün seçerek istihbarat analizine başlayın</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.6 }}>75 ürün · 240+ ülke · 2000–2025 verisi</div>
        </div>
      )}

      {loading && <Loading />}

      {selectedProduct && !loading && (
        <>
          {/* Product header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--card-bg), var(--bg))',
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{productCategory === 'bitkisel' ? '🌿' : '🐄'}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedProduct}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {productCategory === 'bitkisel' ? 'Bitkisel Ürün' : 'Hayvansal Ürün'} · {countryCount} ülkeye ihracat
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid">
            <KPICard title="İhracat (2024)" value={formatMoney(totalExp)} subtitle={`YoY: ${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`} icon={TrendingUp} color="green" large />
            <KPICard title="İthalat (2024)" value={formatMoney(totalImp)} subtitle="Yıllık toplam" icon={TrendingDown} color="orange" large />
            <KPICard title="Denge" value={formatMoney(balance)} subtitle={balance >= 0 ? '✅ Fazla' : '⚠️ Açık'} icon={Scale} color={balance >= 0 ? 'green' : 'orange'} />
            <KPICard title="1. Partner" value={topCountry} subtitle="En büyük ihracat ülkesi" icon={Globe} color="blue" />
          </div>

          {/* Charts */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Aylık {selectedProduct} Ticareti ({yearForMonthly})</h3>
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
              <h3 className="chart-title">📈 Yıllık {selectedProduct} Trendi (2000–2025)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={3} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => formatMoney(Number(v))} />
                  <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : name === 'imp' ? 'İthalat' : 'Denge']} />
                  <Legend formatter={v => v === 'exp' ? 'İhracat' : v === 'imp' ? 'İthalat' : 'Denge'} />
                  <Bar dataKey="exp" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.8} />
                  <Bar dataKey="imp" fill="#f59e0b" radius={[2, 2, 0, 0]} opacity={0.8} />
                  <Line type="monotone" dataKey="denge" stroke="#6366f1" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Country Table */}
          <div className="chart-card" style={{ marginTop: 16 }}>
            <h3 className="chart-title">🌍 {selectedProduct} — Ülke Bazlı Ticaret (2024)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={countries.slice(0, 12).map(c => ({
                name: c.name.length > 16 ? c.name.substring(0, 16) + '..' : c.name,
                İhracat: c.exp / 1e6,
                İthalat: c.imp / 1e6,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-25} textAnchor="end" height={65} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
                <Legend />
                <Bar dataKey="İhracat" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Countries detail table */}
          <div className="chart-card" style={{ marginTop: 16 }}>
            <h3 className="chart-title">📋 Ülke Detay Tablosu</h3>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, background: 'var(--card-bg)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)' }}>Ülke</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İhracat ($)</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İthalat ($)</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>Denge ($)</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-secondary)' }}>İhr. Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatMoney(c.exp)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatMoney(c.imp)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: c.balance >= 0 ? '#10b981' : '#ef4444' }}>
                        {c.balance >= 0 ? '+' : ''}{formatMoney(c.balance)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        %{totalExp > 0 ? ((c.exp / totalExp) * 100).toFixed(1) : '0'}
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
