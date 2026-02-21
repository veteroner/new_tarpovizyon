import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Scale, ArrowLeftRight, Zap, AlertTriangle } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { TreemapContent } from '../../components/TreemapContent';
import { fetchQuery, formatMoney, TRADE_TABLES } from '../../services/api';

const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

const COLORS_EXPORT = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#047857', '#065f46', '#064e3b', '#022c22'];
const COLORS_IMPORT = ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#b45309', '#92400e', '#78350f', '#451a03'];

export default function TradeOverviewTab() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  // Data states
  const [expTotal, setExpTotal] = useState(0);
  const [impTotal, setImpTotal] = useState(0);
  const [plantExp, setPlantExp] = useState(0);
  const [, setPlantImp] = useState(0);
  const [, setAnimalExp] = useState(0);
  const [, setAnimalImp] = useState(0);
  const [prevYearExp, setPrevYearExp] = useState(0);
  const [, setPrevYearImp] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ay: string; exp: number; imp: number}[]>([]);
  const [yearlyData, setYearlyData] = useState<{yil: string; exp: number; imp: number; denge: number}[]>([]);
  const [topExpProducts, setTopExpProducts] = useState<{name: string; value: number; category: string}[]>([]);
  const [topImpProducts, setTopImpProducts] = useState<{name: string; value: number; category: string}[]>([]);
  const [topExpCountries, setTopExpCountries] = useState<{name: string; exp: number; imp: number}[]>([]);
  // Intelligence
  const [fastestGrowing, setFastestGrowing] = useState<{name: string; growth: number} | null>(null);
  const [biggestImportIncrease, setBiggestImportIncrease] = useState<{name: string; growth: number} | null>(null);
  const [top5CountryShare, setTop5CountryShare] = useState(0);

  const loadYears = useCallback(async () => {
    const res = await fetchQuery(`SELECT DISTINCT yil FROM ${TRADE_TABLES.PLANT} ORDER BY yil DESC`);
    const years = (res.data || []).map(r => String(r.yil)).filter(Boolean);
    setYearOptions(years);
    if (years.length && !years.includes(selectedYear)) setSelectedYear(years[0]);
  }, [selectedYear]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const yr = selectedYear;
      const prevYr = String(Number(yr) - 1);

      // KPI queries — separate for plant/animal to get category breakdown
      const [plantKpi, animalKpi, plantKpiPrev, animalKpiPrev] = await Promise.all([
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}'`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}'`),
      ]);

      const pe = Number(plantKpi.data?.[0]?.exp) || 0;
      const pi = Number(plantKpi.data?.[0]?.imp) || 0;
      const ae = Number(animalKpi.data?.[0]?.exp) || 0;
      const ai = Number(animalKpi.data?.[0]?.imp) || 0;
      setPlantExp(pe); setPlantImp(pi); setAnimalExp(ae); setAnimalImp(ai);
      setExpTotal(pe + ae); setImpTotal(pi + ai);

      const prevE = (Number(plantKpiPrev.data?.[0]?.exp) || 0) + (Number(animalKpiPrev.data?.[0]?.exp) || 0);
      const prevI = (Number(plantKpiPrev.data?.[0]?.imp) || 0) + (Number(animalKpiPrev.data?.[0]?.imp) || 0);
      setPrevYearExp(prevE); setPrevYearImp(prevI);

      // Monthly trend
      const monthRes = await fetchQuery(`
        SELECT ay, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT ay, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ay, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
        ) t GROUP BY ay ORDER BY CAST(ay AS UNSIGNED)
      `);
      setMonthlyData((monthRes.data || []).map(r => ({
        ay: MONTHS_TR[String(r.ay)] || String(r.ay),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));

      // Yearly trend (all years)
      const yearRes = await fetchQuery(`
        SELECT yil, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT yil, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay'
          UNION ALL
          SELECT yil, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil'
        ) t GROUP BY yil ORDER BY yil
      `);
      setYearlyData((yearRes.data || []).map(r => {
        const e = Number(r.exp) || 0;
        const i = Number(r.imp) || 0;
        return { yil: String(r.yil), exp: e, imp: i, denge: e - i };
      }));

      // Top export products (combined)
      const expProdRes = await fetchQuery(`
        SELECT ana_urun, SUM(ihracat_deger) as val, kategori FROM (
          SELECT ana_urun, ihracat_deger, 'bitkisel' as kategori FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ana_urun, ihracat_deger, 'hayvansal' as kategori FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
        ) t GROUP BY ana_urun, kategori ORDER BY val DESC LIMIT 15
      `);
      setTopExpProducts((expProdRes.data || []).map(r => ({
        name: String(r.ana_urun),
        value: Number(r.val) || 0,
        category: String(r.kategori),
      })));

      // Top import products
      const impProdRes = await fetchQuery(`
        SELECT ana_urun, SUM(ithalat_deger) as val, kategori FROM (
          SELECT ana_urun, ithalat_deger, 'bitkisel' as kategori FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ana_urun, ithalat_deger, 'hayvansal' as kategori FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
        ) t GROUP BY ana_urun, kategori ORDER BY val DESC LIMIT 15
      `);
      setTopImpProducts((impProdRes.data || []).map(r => ({
        name: String(r.ana_urun),
        value: Number(r.val) || 0,
        category: String(r.kategori),
      })));

      // Top export countries
      const countryRes = await fetchQuery(`
        SELECT ulke, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT ulke, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ulke, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
        ) t WHERE ulke != '' GROUP BY ulke ORDER BY exp DESC LIMIT 10
      `);
      setTopExpCountries((countryRes.data || []).map(r => ({
        name: String(r.ulke),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));

      // Intelligence: fastest growing export product
      const growthRes = await fetchQuery(`
        SELECT a.ana_urun, a.val as curr, b.val as prev, 
          ((a.val - b.val) / NULLIF(b.val, 0) * 100) as growth
        FROM (
          SELECT ana_urun, SUM(ihracat_deger) as val FROM (
            SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
            UNION ALL SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) a
        JOIN (
          SELECT ana_urun, SUM(ihracat_deger) as val FROM (
            SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}'
            UNION ALL SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) b ON a.ana_urun = b.ana_urun
        ORDER BY growth DESC LIMIT 1
      `);
      if (growthRes.data?.[0]) {
        setFastestGrowing({ name: String(growthRes.data[0].ana_urun), growth: Number(growthRes.data[0].growth) || 0 });
      }

      // Intelligence: biggest import increase
      const impGrowthRes = await fetchQuery(`
        SELECT a.ana_urun, a.val as curr, b.val as prev, 
          ((a.val - b.val) / NULLIF(b.val, 0) * 100) as growth
        FROM (
          SELECT ana_urun, SUM(ithalat_deger) as val FROM (
            SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
            UNION ALL SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) a
        JOIN (
          SELECT ana_urun, SUM(ithalat_deger) as val FROM (
            SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}'
            UNION ALL SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) b ON a.ana_urun = b.ana_urun
        ORDER BY growth DESC LIMIT 1
      `);
      if (impGrowthRes.data?.[0]) {
        setBiggestImportIncrease({ name: String(impGrowthRes.data[0].ana_urun), growth: Number(impGrowthRes.data[0].growth) || 0 });
      }

      // Top 5 country concentration
      const concRes = await fetchQuery(`
        SELECT SUM(total_exp) as top5 FROM (
          SELECT SUM(exp) as total_exp FROM (
            SELECT ulke, ihracat_deger as exp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
            UNION ALL SELECT ulke, ihracat_deger as exp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          ) t WHERE ulke != '' GROUP BY ulke ORDER BY total_exp DESC LIMIT 5
        ) top
      `);
      const top5Val = Number(concRes.data?.[0]?.top5) || 0;
      setTop5CountryShare(pe + ae > 0 ? (top5Val / (pe + ae)) * 100 : 0);

    } catch (e) {
      console.error('TradeOverview error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { loadYears(); }, [loadYears]);
  useEffect(() => { loadData(); }, [loadData]);

  const balance = expTotal - impTotal;
  const ratio = impTotal > 0 ? expTotal / impTotal : 0;
  const yoyExpGrowth = prevYearExp > 0 ? ((expTotal - prevYearExp) / prevYearExp * 100) : 0;
  const plantShare = expTotal > 0 ? ((plantExp / expTotal) * 100) : 0;

  const treemapExpData = useMemo(() => topExpProducts.filter(p => p.value > 0).map((p, i) => ({
    name: p.name,
    size: p.value,
    value: p.value,
    fill: p.category === 'bitkisel' ? COLORS_EXPORT[i % COLORS_EXPORT.length] : ['#ef4444', '#dc2626', '#f87171', '#fca5a5', '#fee2e2', '#b91c1c', '#991b1b'][i % 7],
  })), [topExpProducts]);

  const treemapImpData = useMemo(() => topImpProducts.filter(p => p.value > 0).map((p, i) => ({
    name: p.name,
    size: p.value,
    value: p.value,
    fill: p.category === 'bitkisel' ? COLORS_IMPORT[i % COLORS_IMPORT.length] : ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#6d28d9', '#5b21b6'][i % 7],
  })), [topImpProducts]);

  if (loading) return <Loading />;

  return (
    <div>
      {/* Year Filter */}
      <div className="date-filter" style={{ marginBottom: 16 }}>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam İhracat"
          value={formatMoney(expTotal)}
          subtitle={`YoY: ${yoyExpGrowth >= 0 ? '+' : ''}${yoyExpGrowth.toFixed(1)}%`}
          icon={TrendingUp}
          color="green"
          large
        />
        <KPICard
          title="Toplam İthalat"
          value={formatMoney(impTotal)}
          subtitle={`${selectedYear} toplamı`}
          icon={TrendingDown}
          color="orange"
          large
        />
        <KPICard
          title="Dış Ticaret Dengesi"
          value={formatMoney(balance)}
          subtitle={balance >= 0 ? '✅ Fazla' : '⚠️ Açık'}
          icon={Scale}
          color={balance >= 0 ? 'green' : 'orange'}
        />
        <KPICard
          title="İhracat/İthalat Oranı"
          value={ratio.toFixed(2)}
          subtitle={ratio >= 1 ? 'Pozitif denge' : 'Negatif denge'}
          icon={ArrowLeftRight}
          color="blue"
        />
        <KPICard
          title="Bitkisel Pay"
          value={`%${plantShare.toFixed(1)}`}
          subtitle={`Hayvansal: %${(100 - plantShare).toFixed(1)}`}
          icon={TrendingUp}
          color="purple"
        />
        <KPICard
          title="YoY Büyüme"
          value={`${yoyExpGrowth >= 0 ? '+' : ''}${yoyExpGrowth.toFixed(1)}%`}
          subtitle="İhracat büyümesi"
          icon={Zap}
          color={yoyExpGrowth >= 0 ? 'green' : 'orange'}
        />
      </div>

      {/* Intelligence Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {fastestGrowing && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TrendingUp size={18} color="#10b981" />
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>En Hızlı Büyüyen İhracat</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{fastestGrowing.name}</div>
            <div style={{ fontSize: 13, color: '#10b981' }}>+{fastestGrowing.growth.toFixed(1)}% büyüme</div>
          </div>
        )}

        {biggestImportIncrease && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>En Çok Artan İthalat</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{biggestImportIncrease.name}</div>
            <div style={{ fontSize: 13, color: '#f59e0b' }}>+{biggestImportIncrease.growth.toFixed(1)}% artış</div>
          </div>
        )}

        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Scale size={18} color="#6366f1" />
            <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 13 }}>Ülke Yoğunlaşması</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>%{top5CountryShare.toFixed(1)}</div>
          <div style={{ fontSize: 13, color: '#6366f1' }}>İlk 5 ülke ihracat payı</div>
        </div>

        <div style={{
          background: balance >= 0
            ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
          border: balance >= 0
            ? '1px solid rgba(16,185,129,0.3)'
            : '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {balance >= 0 ? <TrendingUp size={18} color="#10b981" /> : <TrendingDown size={18} color="#ef4444" />}
            <span style={{ color: balance >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 13 }}>
              Ticaret Dengesi Sinyali
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {balance >= 0 ? '🟢 FAZLA' : '🔴 AÇIK'}
          </div>
          <div style={{ fontSize: 13, color: balance >= 0 ? '#10b981' : '#ef4444' }}>
            {formatMoney(Math.abs(balance))} {balance >= 0 ? 'dış ticaret fazlası' : 'dış ticaret açığı'}
          </div>
        </div>
      </div>

      {/* Charts Row 1: Monthly + Yearly */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">📊 Aylık İhracat/İthalat Trendi ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(1)}B`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : 'İthalat'} />
              <Area type="monotone" dataKey="exp" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📈 Yıllık Trend + Ticaret Dengesi (2000–2025)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={2} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(0)}B`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(0)}B`} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : name === 'imp' ? 'İthalat' : 'Denge']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : v === 'imp' ? 'İthalat' : 'Ticaret Dengesi'} />
              <Bar yAxisId="left" dataKey="exp" name="exp" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Bar yAxisId="left" dataKey="imp" name="imp" fill="#f59e0b" radius={[2, 2, 0, 0]} opacity={0.8} />
              <Line yAxisId="right" type="monotone" dataKey="denge" name="denge" stroke="#6366f1" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Treemaps */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🟢 İhracat Ürün Dağılımı ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={350}>
            <Treemap
              data={treemapExpData}
              dataKey="size"
              stroke="#fff"
              content={<TreemapContent />}
            >
              {treemapExpData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İhracat Değeri']} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🟠 İthalat Ürün Dağılımı ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={350}>
            <Treemap
              data={treemapImpData}
              dataKey="size"
              stroke="#fff"
              content={<TreemapContent />}
            >
              {treemapImpData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İthalat Değeri']} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3: Countries */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="chart-title">🌍 Top 10 İhracat Ülkesi - İhracat vs İthalat ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topExpCountries.map(c => ({
              name: c.name.length > 18 ? c.name.substring(0, 18) + '..' : c.name,
              İhracat: c.exp / 1e6,
              İthalat: c.imp / 1e6,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
              <Legend />
              <Bar dataKey="İhracat" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Products Tables */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🏆 Top İhracat Ürünleri ({selectedYear})</h3>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Ürün</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Kategori</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Değer ($)</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Pay</th>
                </tr>
              </thead>
              <tbody>
                {topExpProducts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: p.category === 'bitkisel' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: p.category === 'bitkisel' ? '#10b981' : '#ef4444',
                      }}>
                        {p.category === 'bitkisel' ? '🌿 Bitkisel' : '🐄 Hayvansal'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                      {formatMoney(p.value)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      %{expTotal > 0 ? ((p.value / expTotal) * 100).toFixed(1) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📦 Top İthalat Ürünleri ({selectedYear})</h3>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Ürün</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Kategori</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Değer ($)</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>Pay</th>
                </tr>
              </thead>
              <tbody>
                {topImpProducts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: p.category === 'bitkisel' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)',
                        color: p.category === 'bitkisel' ? '#f59e0b' : '#8b5cf6',
                      }}>
                        {p.category === 'bitkisel' ? '🌿 Bitkisel' : '🐄 Hayvansal'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>
                      {formatMoney(p.value)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      %{impTotal > 0 ? ((p.value / impTotal) * 100).toFixed(1) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
