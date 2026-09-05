import { seriesColor } from '../../utils/chartColors';
import { yuzde } from '../../utils/sayi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Leaf, ArrowLeftRight, Zap } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { TreemapContent } from '../../components/TreemapContent';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { formatMoney, formatNumber } from '../../services/api';
import { fetchAgg, latestYear, num } from '../../services/d1';

import { ChartCard } from '../../components/ui/Card';
import { SplitAxisChart } from '../../components/ui/SplitAxisChart';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';

const R = 'tuik/ticaret-bitkisel';
// Düzey filtreleri eski SQL'dekiyle birebir: bu tabloda hangi kırılım
// hangi düzeyde tutuluyorsa o kullanılıyor.
const F_KPI = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'ay' };
const F_URUN = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'ay' };
const F_ULKE = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'ay' };
const F_AY = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'ay' };
const F_YIL = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'ay' };
const NUM_DEGER = ['ihracat_deger', 'ithalat_deger'];
const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

interface ProductRow { name: string; exp: number; imp: number; balance: number; expQty: number; impQty: number; unit: string }
interface CountryRow { name: string; exp: number; imp: number }
interface MonthRow { ay: string; exp: number; imp: number }
interface YearRow { yil: string; exp: number; imp: number; denge: number }

export default function PlantTradeTab() {
  const [loading, setLoading] = useState(true);
  // Yıl kodda sabitti; son TAM yıl veriden seçiliyor (içinde bulunulan yıl
  // yarım olduğu için minShare 0.9 ile eleniyor).
  const [selectedYear, setSelectedYear] = useState('');
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
      const [yRes, pRes, tamYil] = await Promise.all([
        fetchAgg(R, { groupBy: ['yil'], orderBy: 'yil', dir: 'desc' }),
        fetchAgg(R, { groupBy: ['ana_urun'], where: { duzey_2: 'ürün' }, orderBy: 'ana_urun', dir: 'asc' }),
        latestYear(R, 'yil', { minShare: 0.9 }),
      ]);
      const yillar = yRes.map(r => String(r.yil));
      setYearOptions(yillar);
      setProductOptions(pRes.map(r => String(r.ana_urun)));
      setSelectedYear(mevcut => (mevcut && yillar.includes(mevcut)) ? mevcut : (tamYil ? String(tamYil) : (yillar[0] ?? '')));
    })();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const yr = selectedYear;
      const prevYr = String(Number(yr) - 1);
      const urunF = selectedProduct ? { ana_urun: selectedProduct } : {};

      // KPIs
      const [kpiRes, kpiPrev, cntRes, ccntRes] = await Promise.all([
        fetchAgg(R, { sum: NUM_DEGER, where: { ...F_KPI, yil: yr, ...urunF } }),
        fetchAgg(R, { sum: NUM_DEGER, where: { ...F_KPI, yil: prevYr, ...urunF } }),
        fetchAgg(R, { countDistinct: ['ana_urun'], where: { duzey_2: 'ürün', yil: yr } }),
        fetchAgg(R, { countDistinct: ['ulke'], where: { duzey_1: 'ülke', yil: yr } }),
      ]);

      setTotalExp(num(kpiRes[0]?.sum_ihracat_deger));
      setTotalImp(num(kpiRes[0]?.sum_ithalat_deger));
      setPrevExp(num(kpiPrev[0]?.sum_ihracat_deger));
      setPrevImp(num(kpiPrev[0]?.sum_ithalat_deger));
      setProductCount(num(cntRes[0]?.cd_ana_urun));
      setCountryCount(num(ccntRes[0]?.cd_ulke));

      // Products table
      const prodRes = await fetchAgg(R, {
        groupBy: ['ana_urun'], sum: [...NUM_DEGER, 'ihracat_mik', 'ithalat_mik'],
        maxText: ['miktar_birim'], where: { ...F_URUN, yil: yr, ...urunF },
        orderBy: 'sum_ihracat_deger', dir: 'desc',
      });
      setProducts(prodRes.map(r => ({
        name: String(r.ana_urun),
        exp: num(r.sum_ihracat_deger),
        imp: num(r.sum_ithalat_deger),
        balance: num(r.sum_ihracat_deger) - num(r.sum_ithalat_deger),
        expQty: num(r.sum_ihracat_mik),
        impQty: num(r.sum_ithalat_mik),
        unit: String(r.maxt_miktar_birim || 'KG'),
      })));

      // Countries top 15
      // WHERE ulke != '' karşılığı istemcide süzülüyor.
      const cntryRes = (await fetchAgg(R, {
        groupBy: ['ulke'], sum: NUM_DEGER, where: { ...F_ULKE, yil: yr, ...urunF },
        orderBy: 'sum_ihracat_deger', dir: 'desc', limit: 20,
      })).filter(r => String(r.ulke ?? '') !== '').slice(0, 15);
      setCountries(cntryRes.map(r => ({
        name: String(r.ulke),
        exp: num(r.sum_ihracat_deger),
        imp: num(r.sum_ithalat_deger),
      })));

      // Monthly
      const monthRes = await fetchAgg(R, {
        groupBy: ['ay'], sum: NUM_DEGER, where: { ...F_AY, yil: yr, ...urunF },
      });
      setMonthlyData([...monthRes].sort((a, b) => Number(a.ay) - Number(b.ay)).map(r => ({
        ay: MONTHS_TR[String(r.ay)] || String(r.ay),
        exp: num(r.sum_ihracat_deger),
        imp: num(r.sum_ithalat_deger),
      })));

      // Yearly trend
      const yearRes = await fetchAgg(R, {
        groupBy: ['yil'], sum: NUM_DEGER, where: { ...F_YIL, ...urunF }, orderBy: 'yil', dir: 'asc',
      });
      setYearlyData(yearRes.map(r => {
        const e = num(r.sum_ihracat_deger); const i = num(r.sum_ithalat_deger);
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
      name: p.name, size: p.exp, value: p.exp, fill: seriesColor(i),
    })), [products]);
  const plantContext = { group: 'Bitkisel ticaret', year: selectedYear, product: selectedProduct || 'Tüm ürünler', totalExp, totalImp, balance, productCount, countryCount, yoyGrowth: Number(yoyGrowth.toFixed(2)), impChange: Number(impChange.toFixed(2)) };
  const countryChartData = countries.map(c => ({
    name: c.name.length > 16 ? c.name.substring(0, 16) + '..' : c.name,
    ihracatMilyonUsd: Number((c.exp / 1e6).toFixed(2)),
    ithalatMilyonUsd: Number((c.imp / 1e6).toFixed(2)),
  }));

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
        <KPICard title="Bitkisel İhracat" value={formatMoney(totalExp)} subtitle={`Yıllık: ${yoyGrowth >= 0 ? '+' : ''}${yuzde(yoyGrowth, 1)}`} icon={TrendingUp} color="green" large />
        <KPICard title="Bitkisel İthalat" value={formatMoney(totalImp)} subtitle={`Yıllık: ${impChange >= 0 ? '+' : ''}${yuzde(impChange, 1)}`} icon={TrendingDown} color="orange" large />
        <KPICard title="Ticaret Dengesi" value={formatMoney(balance)} subtitle={balance >= 0 ? 'Fazla' : 'Açık'} icon={ArrowLeftRight} color={balance >= 0 ? 'green' : 'orange'} />
        <KPICard title="Ürün Sayısı" value={String(productCount)} subtitle="Bitkisel ürün grubu" icon={Leaf} color="green" />
        <KPICard title="Ülke Sayısı" value={String(countryCount)} subtitle="Ticaret ortağı" icon={Zap} color="blue" />
        <KPICard title="İhracat/İthalat" value={(totalImp > 0 ? (totalExp / totalImp) : 0).toFixed(2)} subtitle="Karşılama oranı" icon={ArrowLeftRight} color="purple" />
      </div>

      {/* Charts Row 1 */}
      <div className="chart-grid">
        <ChartCard title={<>Aylık Bitkisel Ticaret ({selectedYear})</>} action={<ChartInsightButton title={`Aylık Bitkisel Ticaret (${selectedYear})`} description="Aylık ihracat ve ithalat değerleri" data={monthlyData} context={plantContext} />}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e9).toFixed(1)}B`} width={46} domain={LINE_Y_DOMAIN} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : 'İthalat'} />
              <Area type="monotone" dataKey="exp" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Yıllık Bitkisel Trend + Denge" action={<ChartInsightButton title="Yıllık Bitkisel Trend + Denge" description="Yıllara göre ihracat, ithalat ve denge" data={yearlyData} context={plantContext} />}>
          {/*
            * "Denge" ihracat ile ithalatın FARKI — türetilmiş seri. Eskiden
            * ikinci bir y ekseninde çiziliyordu ve iki eksen AYNI birimi
            * ($xxB) farklı ölçekte gösteriyordu: okuyucu iki tarafta da dolar
            * görüyor ama ölçekler tutmuyordu. Ortak x eksenli şeride taşındı.
            */}
          <SplitAxisChart
            data={yearlyData as unknown as Record<string, unknown>[]}
            xKey="yil"
            height={270}
            yFormat={(v: number) => `$${(Number(v) / 1e9).toFixed(1)}B`}
            stripKey="denge"
            stripLabel="Dış Ticaret Dengesi"
            stripFormat={(v: number) => `$${(Number(v) / 1e9).toFixed(1)}B`}
            xProps={{ interval: 2 }}
          >
            <Legend formatter={(v: string) => v === 'exp' ? 'İhracat' : 'İthalat'} />
            <Bar dataKey="exp" fill="var(--series-3)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="imp" fill="var(--series-4)" radius={[2, 2, 0, 0]} />
          </SplitAxisChart>
        </ChartCard>
      </div>

      {/* Treemap */}
      <div className="chart-grid">
        <ChartCard title={<>İhracat Ürün Treemap ({selectedYear})</>} action={<ChartInsightButton title={`Bitkisel İhracat Ürün Treemap (${selectedYear})`} description="İlk 15 ürünün ihracat ağırlığı" data={treemapData} context={plantContext} />}>
          <ResponsiveContainer width="100%" height={380}>
            <Treemap data={treemapData} dataKey="size" stroke="#fff" content={<TreemapContent />}>
              {treemapData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İhracat']} />
            </Treemap>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Countries */}
      <div className="chart-grid">
        <ChartCard title={<>Top 15 İhracat Ülkesi ({selectedYear})</>} action={<ChartInsightButton title={`Bitkisel Top 15 İhracat Ülkesi (${selectedYear})`} description="Ülke bazlı milyon USD ihracat ve ithalat" data={countryChartData} context={plantContext} />}>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={countryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(0)}M`} width={46} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
              <Legend />
              <Bar dataKey="ihracatMilyonUsd" name="İhracat" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ithalatMilyonUsd" name="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Products Detail Table */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3 className="chart-title">Bitkisel Ürün Detay Tablosu ({selectedYear})</h3>
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
