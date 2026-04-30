/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, Scale, Package, MapPin, Languages, Landmark, Users, Banknote, BarChart3, X } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { WorldTradeMap } from '../../components/WorldTradeMap';
import { CountrySilhouette } from '../../components/CountrySilhouette';
import { fetchQuery, formatMoney, TRADE_TABLES, DEFAULT_TRADE_YEAR } from '../../services/api';
import { toWorldGeoCountryKey } from '../../utils/countryTranslations';
import countryProfilesData from '../../data/countryProfiles.json';

interface CountryProfile {
  name_tr: string;
  name_en: string;
  capital: string;
  languages: string[];
  area_km2: number;
  population: number;
  currency: { name: string; code: string };
  gdp_usd_billion: number;
}

const COUNTRY_PROFILES = countryProfilesData as unknown as Record<string, CountryProfile | { description?: string }>;

function getCountryProfile(countryKey: string): CountryProfile | null {
  const entry = COUNTRY_PROFILES[countryKey];
  if (entry && 'capital' in entry) return entry as CountryProfile;
  return null;
}

function formatNumberTr(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('tr-TR');
}

const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

interface ProductDetail { name: string; exp: number; imp: number; balance: number; category: string }
interface YearDetail { yil: string; exp: number; imp: number; denge: number }
interface MonthDetail { ay: string; exp: number; imp: number }
interface ProductYearDetail { yil: string; exp: number; imp: number; denge: number }

function toProductShare(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

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
  const [yearForMonthly, setYearForMonthly] = useState(DEFAULT_TRADE_YEAR);
  const [selectedProductDetail, setSelectedProductDetail] = useState<ProductDetail | null>(null);
  const [selectedProductYearlyData, setSelectedProductYearlyData] = useState<ProductYearDetail[]>([]);

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
      const yr = DEFAULT_TRADE_YEAR;
      const prevYr = String(Number(yr) - 1);
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
      setSelectedProductDetail(null);

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

  useEffect(() => {
    if (!selectedCountry || !selectedProductDetail) {
      setSelectedProductYearlyData([]);
      return;
    }

    let ignore = false;
    (async () => {
      try {
        const escCountry = selectedCountry.replace(/'/g, "''");
        const escProduct = selectedProductDetail.name.replace(/'/g, "''");
        const yearRes = await fetchQuery(`
          SELECT yil, SUM(exp) as exp, SUM(imp) as imp FROM (
            SELECT yil, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND ulke='${escCountry}' AND ana_urun='${escProduct}'
            UNION ALL SELECT yil, ihracat_deger, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND ulke='${escCountry}' AND ana_urun='${escProduct}'
          ) t GROUP BY yil ORDER BY yil
        `);
        if (ignore) return;
        setSelectedProductYearlyData((yearRes.data || []).map((row: any) => {
          const exp = Number(row.exp) || 0;
          const imp = Number(row.imp) || 0;
          return { yil: String(row.yil), exp, imp, denge: exp - imp };
        }));
      } catch (error) {
        if (!ignore) {
          console.error('CountryIntelligence product yearly detail error:', error);
          setSelectedProductYearlyData([]);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedCountry, selectedProductDetail]);

  const filteredCountries = countryOptions.filter(c =>
    c.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
  );

  const balance = totalExp - totalImp;
  const yoyGrowth = prevExp > 0 ? ((totalExp - prevExp) / prevExp * 100) : 0;

  const selectedProductExportShare = selectedProductDetail ? toProductShare(selectedProductDetail.exp, totalExp) : 0;
  const selectedProductImportShare = selectedProductDetail ? toProductShare(selectedProductDetail.imp, totalImp) : 0;
  const selectedProductTurnover = selectedProductDetail ? selectedProductDetail.exp + selectedProductDetail.imp : 0;
  const selectedProductShareTrend = selectedProductYearlyData.map(row => {
    const totalRow = yearlyData.find(total => total.yil === row.yil);
    const totalYearExp = totalRow?.exp || 0;
    const totalYearImp = totalRow?.imp || 0;
    return {
      yil: row.yil,
      expShare: parseFloat(toProductShare(row.exp, totalYearExp).toFixed(2)),
      impShare: parseFloat(toProductShare(row.imp, totalYearImp).toFixed(2)),
    };
  });
  const openProductDetail = (productName: string) => {
    const match = products.find(product => product.name === productName);
    if (match) setSelectedProductDetail(match);
  };

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
        <>
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <h3 className="chart-title" style={{ margin: '0 0 8px' }}>🗺️ Dünya Üzerinden Ülke Seçin</h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Yukarıdaki listeden veya hızlı erişim çiplerinden bir ülke seçtiğinizde, harita yerine ülke profili açılır.
            </div>
            <WorldTradeMap
              metric="exportValue"
              countryMetrics={{}}
              height={420}
            />
          </div>
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: 'var(--text-secondary)', fontSize: 15,
          }}>
            <Globe size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>Bir ülke seçerek istihbarat analizine başlayın</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.6 }}>240+ ülke · 75 ürün · 2000–2025 verisi</div>
          </div>
        </>
      )}

      {loading && <Loading />}

      {selectedCountry && !loading && (() => {
        const countryKey = toWorldGeoCountryKey(selectedCountry);
        const profile = getCountryProfile(countryKey);
        return (
        <>
          {/* Country profile — siluet + meta + temizleme */}
          <div className="chart-card" style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))',
            border: '1px solid rgba(139,92,246,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ülke Profili</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{selectedCountry}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {productCount} ürün grubu · {yearForMonthly} yılı{profile ? ` · ${profile.name_en}` : ''}
                </div>
              </div>
              <button
                onClick={() => { setSelectedCountry(''); setSelectedProductDetail(null); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 20, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                <X size={14} /> Tüm dünyaya dön
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 360px) 1fr',
              gap: 16,
              alignItems: 'stretch',
            }}>
              <div style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 240,
              }}>
                <CountrySilhouette countryKey={countryKey} width={320} height={220} />
              </div>

              <div style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                alignContent: 'start',
              }}>
                {profile ? (
                  <>
                    <ProfileFact icon={<Landmark size={16} />} label="Başkent" value={profile.capital} />
                    <ProfileFact icon={<Languages size={16} />} label="Dil" value={profile.languages.join(', ')} />
                    <ProfileFact icon={<MapPin size={16} />} label="Yüzölçümü" value={`${formatNumberTr(profile.area_km2)} km²`} />
                    <ProfileFact icon={<Users size={16} />} label="Nüfus" value={formatNumberTr(profile.population)} />
                    <ProfileFact icon={<Banknote size={16} />} label="Para Birimi" value={`${profile.currency.name} (${profile.currency.code})`} />
                    <ProfileFact icon={<BarChart3 size={16} />} label="GSYİH (Nominal)" value={`$${formatNumberTr(profile.gdp_usd_billion)} milyar`} />
                  </>
                ) : (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                    Bu ülke için ek profil verisi henüz girilmedi. <br />
                    <span style={{ fontSize: 11, opacity: 0.7 }}>(`src/data/countryProfiles.json` dosyasına eklenebilir.)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid">
            <KPICard title={`İhracat (${yearForMonthly})`} value={formatMoney(totalExp)} subtitle={`Yıllık: ${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`} icon={TrendingUp} color="green" large />
            <KPICard title={`İthalat (${yearForMonthly})`} value={formatMoney(totalImp)} subtitle="Yıllık toplam" icon={TrendingDown} color="orange" large />
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
            <h3 className="chart-title">📦 Ürün Bazlı Ticaret — {selectedCountry} ({yearForMonthly})</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, products.length * 28)}>
              <BarChart data={products.slice(0, 15).map(p => ({
                name: p.name.length > 18 ? p.name.substring(0, 18) + '..' : p.name,
                fullName: p.name,
                İhracat: p.exp / 1e6,
                İthalat: p.imp / 1e6,
              }))} layout="vertical" onClick={(state: any) => openProductDetail(state?.activePayload?.[0]?.payload?.fullName || '')}>
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
                    <tr
                      key={i}
                      onClick={() => setSelectedProductDetail(p)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: selectedProductDetail?.name === p.name ? 'rgba(139,92,246,0.08)' : 'transparent',
                      }}
                    >
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

          {/* ScatterChart + RadarChart grid */}
          <div className="chart-grid" style={{ marginTop: 16 }}>
            <div className="chart-card">
              <h3 className="chart-title">🎯 Ürün Fırsat Matrisi — İhracat Payı vs. Denge</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Yeşil: fazla · Kırmızı: açık · Daire büyüklüğü: ihracat hacmi
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number" dataKey="x" name="İhracat Payı (%)"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    label={{ value: 'İhracat Payı (%)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Denge ($M)"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    tickFormatter={v => `$${Number(v).toFixed(0)}M`}
                  />
                  <ZAxis type="number" dataKey="z" range={[40, 600]} name="İhracat ($M)" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }: any) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                          <div>İhracat Payı: %{d.x.toFixed(1)}</div>
                          <div>Denge: ${d.y.toFixed(1)}M</div>
                          <div>İhracat: ${d.z.toFixed(1)}M</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={products.map(p => ({
                      x: parseFloat(toProductShare(p.exp, totalExp).toFixed(2)),
                      y: parseFloat((p.balance / 1e6).toFixed(2)),
                      z: parseFloat((p.exp / 1e6).toFixed(2)),
                      name: p.name,
                    }))}
                    fill="#8b5cf6"
                    onClick={(point: any) => openProductDetail(point?.name || '')}
                  >
                    {products.map((_p, i) => (
                      <Cell key={i} fill={_p.balance >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.75} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🕸️ {selectedCountry} Ticaret Profili</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Her boyut 0–100 skor · Büyük alan = güçlü ticaret pozisyonu
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={[
                  { metric: 'İhracat Hacmi', value: Math.min(100, (totalExp / 5e8) * 100) },
                  { metric: 'YoY Büyüme', value: Math.min(100, Math.max(0, yoyGrowth + 50)) },
                  { metric: 'Ürün Çeşitliliği', value: Math.min(100, (productCount / 30) * 100) },
                  { metric: 'İhr/İth Oranı', value: totalExp + totalImp > 0 ? (totalExp / (totalExp + totalImp)) * 100 : 50 },
                  { metric: 'Denge Skoru', value: totalExp + totalImp > 0 ? Math.min(100, Math.max(0, 50 + (balance / (totalExp + totalImp)) * 100)) : 50 },
                ]}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Radar name={selectedCountry} dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} strokeWidth={2} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}`, 'Skor']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Treemap — ürün ihracat dağılımı */}
          <div className="chart-card" style={{ marginTop: 16 }}>
            <h3 className="chart-title">🗺️ {selectedCountry} — Ürün İhracat Dağılımı (Treemap)</h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Alan büyüklüğü ihracat değerine orantılı · İlk 15 ürün · Yeşil = bitkisel, Turuncu = hayvansal
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={products.slice(0, 15).map(p => ({
                  name: p.name.length > 14 ? p.name.substring(0, 14) + '.' : p.name,
                  fullName: p.name,
                  size: p.exp,
                  category: p.category,
                }))}
                dataKey="size"
                stroke="var(--bg)"
                onClick={(node: any) => openProductDetail(node?.fullName || '')}
                content={(props: any) => {
                  const { x, y, width, height, name, category } = props;
                  const size = props.size ?? props.value ?? 0;
                  if (!width || !height || width < 20 || height < 15) return <g />;
                  const PLANT_COLORS = ['#10b981','#34d399','#6ee7b7','#059669','#047857'];
                  const ANIMAL_COLORS = ['#f59e0b','#fbbf24','#fcd34d','#d97706','#b45309'];
                  const palette = category === 'hayvansal' ? ANIMAL_COLORS : PLANT_COLORS;
                  const fi = products.slice(0, 15).findIndex(p => (p.name.length > 14 ? p.name.substring(0, 14) + '.' : p.name) === name);
                  const fill = palette[fi % palette.length];
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.85} stroke="var(--bg)" strokeWidth={2} rx={3} />
                      {width > 50 && height > 25 && (
                        <>
                          <text x={x + width / 2} y={y + height / 2 - 5} textAnchor="middle" fill="#fff" fontSize={Math.min(12, width / 5)} fontWeight={600}>{name}</text>
                          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={Math.min(10, width / 6)}>${(size / 1e6).toFixed(1)}M</text>
                        </>
                      )}
                    </g>
                  );
                }}
              />
            </ResponsiveContainer>
          </div>

          {selectedProductDetail && (
            <>
              <div
                onClick={() => setSelectedProductDetail(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 40 }}
              />
              <aside
                style={{
                  position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(420px, 100vw)',
                  background: 'var(--card-bg)', borderLeft: '1px solid var(--border)', zIndex: 41,
                  boxShadow: '-24px 0 48px rgba(15, 23, 42, 0.18)', display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Ürün Detay Drawer
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                      {selectedProductDetail.name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                      {selectedCountry} ülkesinin {yearForMonthly} ürün ticaret profili
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProductDetail(null)}
                    style={{
                      width: 36, height: 36, borderRadius: 999, border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 18,
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>İhracat</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{formatMoney(selectedProductDetail.exp)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>%{selectedProductExportShare.toFixed(1)} ülke payı</div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>İthalat</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{formatMoney(selectedProductDetail.imp)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>%{selectedProductImportShare.toFixed(1)} ülke payı</div>
                    </div>
                  </div>

                  <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Ticaret Denge Özeti</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Net denge</span>
                        <strong style={{ color: selectedProductDetail.balance >= 0 ? '#10b981' : '#ef4444' }}>
                          {selectedProductDetail.balance >= 0 ? '+' : ''}{formatMoney(selectedProductDetail.balance)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Toplam ciro</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{formatMoney(selectedProductTurnover)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Kategori</span>
                        <strong style={{ color: selectedProductDetail.category === 'bitkisel' ? '#10b981' : '#ef4444' }}>
                          {selectedProductDetail.category === 'bitkisel' ? 'Bitkisel' : 'Hayvansal'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Yıl Bazlı Mini Trend</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Seçili ürünün ülke içindeki yıllık ihracat / ithalat izi
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={selectedProductYearlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="countryDrawerExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="countryDrawerImp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis hide />
                        <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
                        <Area type="monotone" dataKey="exp" stroke="#10b981" fill="url(#countryDrawerExp)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="url(#countryDrawerImp)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Ülke İçi Pay Değişimi</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Seçili ürünün toplam ülke ihracat ve ithalatı içindeki payının zaman izi
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={selectedProductShareTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="countryDrawerExpShare" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.04} />
                          </linearGradient>
                          <linearGradient id="countryDrawerImpShare" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis hide />
                        <Tooltip formatter={(v: number, name: string) => [`%${v.toFixed(1)}`, name === 'expShare' ? 'İhracat Payı' : 'İthalat Payı']} />
                        <Area type="monotone" dataKey="expShare" stroke="#6366f1" fill="url(#countryDrawerExpShare)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="impShare" stroke="#ef4444" fill="url(#countryDrawerImpShare)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Okuma Notları</div>
                    <div style={{ display: 'grid', gap: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div>
                        {selectedProductDetail.balance >= 0
                          ? 'Bu ürün ülke için net fazla üretiyor; pozitif denge güçlü pazar pozisyonuna işaret ediyor.'
                          : 'Bu ürün ülke için net açık üretiyor; negatif denge dışa bağımlılık sinyali veriyor.'}
                      </div>
                      <div>
                        İhracat payı %{selectedProductExportShare.toFixed(1)} ve toplam ülke cirosundaki ağırlığı {selectedProductTurnover > 0 ? `%${toProductShare(selectedProductTurnover, totalExp + totalImp).toFixed(1)}` : '%0.0'}.
                      </div>
                      <div>
                        Drawer, tablo, bar chart, scatter ve treemap üzerindeki ürün seçimini tek okuma yüzeyinde birleştirir.
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </>
          )}
        </>
        );
      })()}
    </div>
  );
}

function ProfileFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon}
        {label}
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
