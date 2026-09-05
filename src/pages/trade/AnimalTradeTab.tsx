import { seriesColor } from '../../utils/chartColors';
import { yuzde } from '../../utils/sayi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Beef, Scale, Zap, AlertTriangle } from 'lucide-react';
import { KPICard } from '../../components/KPICard';
import { Loading } from '../../components/Loading';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { formatMoney, formatNumber } from '../../services/api';
import { fetchAgg, latestYear, num } from '../../services/d1';

import { ChartCard } from '../../components/ui/Card';
import { SplitAxisChart } from '../../components/ui/SplitAxisChart';
import { LINE_Y_DOMAIN } from '../../utils/chartTicks';

const R = 'tuik/ticaret-hayvansal';
// Düzey filtreleri eski SQL'dekiyle birebir: bu tabloda hangi kırılım
// hangi düzeyde tutuluyorsa o kullanılıyor.
const F_KPI = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' };
const F_URUN = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' };
const F_ULKE = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'yil' };
const F_AY = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'ay' };
const F_YIL = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' };
const NUM_DEGER = ['ihracat_deger', 'ithalat_deger'];
const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

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

      // Products
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

      // Yearly
      const yearRes = await fetchAgg(R, {
        groupBy: ['yil'], sum: NUM_DEGER, where: { ...F_YIL, ...urunF }, orderBy: 'yil', dir: 'asc',
      });
      setYearlyData(yearRes.map(r => {
        const e = num(r.sum_ihracat_deger); const i = num(r.sum_ithalat_deger);
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
  const hhiLabel = expHHI > 2500 ? 'Yüksek Yoğunlaşma' : expHHI > 1500 ? 'Orta' : 'Çeşitlendirilmiş';

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
  const animalContext = { group: 'Hayvansal ticaret', year: selectedYear, product: selectedProduct || 'Tüm ürünler', totalExp, totalImp, balance, productCount, countryCount, expHHI, yoyGrowth: Number(yoyGrowth.toFixed(2)), impChange: Number(impChange.toFixed(2)) };
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
          <label className="filter-label">Ürün</label>
          <select className="filter-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
            <option value="">Tüm Ürünler</option>
            {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard title="Hayvansal İhracat" value={formatMoney(totalExp)} subtitle={`Yıllık: ${yoyGrowth >= 0 ? '+' : ''}${yuzde(yoyGrowth, 1)}`} icon={TrendingUp} color="green" large />
        <KPICard title="Hayvansal İthalat" value={formatMoney(totalImp)} subtitle={`Yıllık: ${impChange >= 0 ? '+' : ''}${yuzde(impChange, 1)}`} icon={TrendingDown} color="orange" large />
        <KPICard title="Ticaret Dengesi" value={formatMoney(balance)} subtitle={balance >= 0 ? 'Fazla' : 'Açık'} icon={Scale} color={balance >= 0 ? 'green' : 'orange'} />
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
              İhracat: {formatMoney(products[0].exp)} · Pay: {yuzde(totalExp > 0? ((products[0].exp / totalExp) * 100) : 0, 1)}
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
            {balance >= 0 ? 'FAZLA' : 'AÇIK'}
          </div>
          <div style={{ fontSize: 12, color: balance >= 0 ? '#10b981' : '#f59e0b' }}>
            {formatMoney(Math.abs(balance))}
          </div>
        </div>
      </div>

      {/* Canlı vs İşlenmiş Hayvansal Ürün Ayrımı */}
      <ChartCard title={<>Canlı Hayvan vs İşlenmiş Ürün Ayrımı ({selectedYear})</>} action={<ChartInsightButton title={`Canlı Hayvan vs İşlenmiş Ürün Ayrımı (${selectedYear})`} description="Canlı ve işlenmiş ürünlerde ihracat/ithalat kırılımı" data={liveProcChart} context={animalContext} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 4 }}>CANLI — İhracat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.liveExp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: {yuzde(totalExpForSplit > 0? ((liveProcessed.liveExp / totalExpForSplit) * 100) : 0, 1)} · {liveProcessed.liveCount} ürün
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 4 }}>CANLI — İthalat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.liveImp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: {yuzde(totalImpForSplit > 0? ((liveProcessed.liveImp / totalImpForSplit) * 100) : 0, 1)}
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>İŞLENMİŞ — İhracat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.procExp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: {yuzde(totalExpForSplit > 0? ((liveProcessed.procExp / totalExpForSplit) * 100) : 0, 1)} · {liveProcessed.procCount} ürün
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>İŞLENMİŞ — İthalat</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatMoney(liveProcessed.procImp)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Pay: {yuzde(totalImpForSplit > 0? ((liveProcessed.procImp / totalImpForSplit) * 100) : 0, 1)}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={liveProcChart} layout="vertical" margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e6).toFixed(0)}M`} />
            <YAxis type="category" dataKey="yon" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={80} interval={0} />
            <Tooltip formatter={(v: number) => formatMoney(v)} />
            <Legend />
            <Bar dataKey="Canlı" stackId="a" fill="#6366f1" />
            <Bar dataKey="İşlenmiş" stackId="a" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Sınıflandırma heuristiği: ürün adında "canlı" / "damızlık" / "diri" geçenler canlı, diğerleri işlenmiş kabul edilir.
        </p>
      </ChartCard>

      {/* Charts Row 1: Monthly + Product Pie */}
      <div className="chart-grid">
        <ChartCard title={<>Aylık Hayvansal Ticaret ({selectedYear})</>} action={<ChartInsightButton title={`Aylık Hayvansal Ticaret (${selectedYear})`} description="Aylık ihracat ve ithalat değerleri" data={monthlyData} context={animalContext} />}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${(Number(v) / 1e6).toFixed(0)}M`} width={46} domain={LINE_Y_DOMAIN} />
              <Tooltip formatter={(v: number, name: string) => [formatMoney(v), name === 'exp' ? 'İhracat' : 'İthalat']} />
              <Legend formatter={v => v === 'exp' ? 'İhracat' : 'İthalat'} />
              <Area type="monotone" dataKey="exp" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="imp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<>Ürün İhracat Dağılımı ({selectedYear})</>} action={<ChartInsightButton title={`Hayvansal Ürün İhracat Dağılımı (${selectedYear})`} description="İlk ürünlerin ihracat ağırlığı" data={pieData} context={animalContext} />}>
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
                label={({ name, percent }) => `${name?.substring(0, 12)} ${yuzde(((percent ?? 0) * 100), 0)}`}
                labelLine={{ strokeWidth: 1 }}
              >
                {pieData.map((_, i) => <Cell key={i} fill={seriesColor(i)} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [formatMoney(v), 'İhracat']} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Yearly trend */}
      <div className="chart-grid">
        <ChartCard title="Yıllık Hayvansal Ticaret Trendi + Denge" action={<ChartInsightButton title="Yıllık Hayvansal Ticaret Trendi + Denge" description="Yıllara göre ihracat, ithalat ve denge" data={yearlyData} context={animalContext} />}>
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
            <Bar dataKey="exp" fill="var(--series-8)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="imp" fill="var(--series-4)" radius={[2, 2, 0, 0]} />
          </SplitAxisChart>
        </ChartCard>
      </div>

      {/* Countries */}
      <div className="chart-grid">
        <ChartCard title={<>Top 15 Hayvansal İhracat Ülkesi ({selectedYear})</>} action={<ChartInsightButton title={`Hayvansal Top 15 İhracat Ülkesi (${selectedYear})`} description="Ülke bazlı milyon USD ihracat ve ithalat" data={countryChartData} context={animalContext} />}>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={countryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={70} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(0)}M`} width={46} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(1)}M`]} />
              <Legend />
              <Bar dataKey="ihracatMilyonUsd" name="İhracat" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ithalatMilyonUsd" name="İthalat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Products Table */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <h3 className="chart-title">Hayvansal Ürün Detay Tablosu ({selectedYear})</h3>
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
