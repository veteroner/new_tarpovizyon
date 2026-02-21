import { useEffect, useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  TrendingUp, DollarSign, MapPin, Activity, BarChart3, Landmark, Users,
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { fetchQuery } from '../services/api';

/* ─── Constants ─── */
const MAIN_SECTORS = ['A', 'BCD', 'F', 'GHI', 'J', 'K', 'L', 'MN', 'OPQ', 'RST'];
const SECTOR_SHORT: Record<string, string> = {
  A: 'Tarım', BCD: 'Sanayi', F: 'İnşaat', GHI: 'Ticaret',
  J: 'Bilgi/İletişim', K: 'Finans', L: 'Gayrimenkul',
  MN: 'Mesleki Hizmet', OPQ: 'Kamu/Eğitim/Sağlık', RST: 'Diğer',
};
const SECTOR_COLORS: Record<string, string> = {
  A: '#16a34a', BCD: '#2563eb', F: '#f59e0b', GHI: '#7c3aed',
  J: '#06b6d4', K: '#ec4899', L: '#84cc16', MN: '#64748b',
  OPQ: '#dc2626', RST: '#a855f7',
};

const fmtMilyar = (v: number) => {
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'T';
  if (v >= 1) return v.toFixed(0);
  return (v * 1e3).toFixed(0) + 'M';
};

/* ─── KPI ─── */
function KPI({ icon: Icon, title, value, sub, color }: {
  icon: typeof TrendingUp; title: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl shadow-md p-4 border-l-4" style={{ background: 'var(--bg-card)', borderLeftColor: color }}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{title}</p>
          <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{sub}</p>}
        </div>
        <Icon size={18} style={{ color }} className="opacity-60" />
      </div>
    </div>
  );
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function TurkeyMacroPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Sektörel GSYH
  interface SectorRow { sektorkod: string; sektor: string; yil: string; cari: number; zincir_degisim: number }
  const [sectorData, setSectorData] = useState<SectorRow[]>([]);

  // Tarım GSYH payı trendi
  interface AgriShareRow { yil: string; agri: number; total: number; share: number; growth: number }
  const [agriShareTrend, setAgriShareTrend] = useState<AgriShareRow[]>([]);

  // Kişi başı gelir — il bazlı
  interface IncomeRow { yer: string; USD: number; TR: number }
  const [incomeTop, setIncomeTop] = useState<IncomeRow[]>([]);
  const [incomeBottom, setIncomeBottom] = useState<IncomeRow[]>([]);
  const [incomeTrend, setIncomeTrend] = useState<{ yil: string; topAvg: number; botAvg: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [sectorRes, agriRes, incTopRes, incBotRes, incTrendRes] = await Promise.all([
          // Latest year sectors
          fetchQuery(`
            SELECT sektorkod, sektor, cari, zincir_degisim
            FROM tuik_gsyh_a21 WHERE yerkod='TR' AND yil='2024'
            ORDER BY CAST(cari AS DECIMAL(20,2)) DESC
          `),
          // Agriculture share trend (25 years)
          fetchQuery(`
            SELECT a.yil,
                   CAST(a.cari AS DECIMAL(20,2)) as agri,
                   (SELECT SUM(CAST(b.cari AS DECIMAL(20,2)))
                    FROM tuik_gsyh_a21 b
                    WHERE b.yerkod='TR' AND b.yil=a.yil AND b.sektorkod != 'C') as total,
                   CAST(a.zincir_degisim AS DECIMAL(10,4)) as growth
            FROM tuik_gsyh_a21 a
            WHERE a.yerkod='TR' AND a.sektorkod='A'
            ORDER BY a.yil
          `),
          // Top 10 provinces by income
          fetchQuery(`
            SELECT yer, USD, TR FROM tuik_kisibasigelir
            WHERE yil='2024' AND duzey='1'
            ORDER BY CAST(USD AS UNSIGNED) DESC LIMIT 10
          `),
          // Bottom 10 provinces
          fetchQuery(`
            SELECT yer, USD, TR FROM tuik_kisibasigelir
            WHERE yil='2024' AND duzey='1'
            ORDER BY CAST(USD AS UNSIGNED) ASC LIMIT 10
          `),
          // Income inequality trend (top5 avg vs bottom5 avg per year)
          fetchQuery(`
            SELECT yil, yer, CAST(USD AS UNSIGNED) as usd_val
            FROM tuik_kisibasigelir
            WHERE duzey='1' AND yil >= '2010'
            ORDER BY yil, CAST(USD AS UNSIGNED) DESC
          `),
        ]);

        setSectorData((sectorRes.data || []).map((r: Record<string, unknown>) => ({
          sektorkod: String(r.sektorkod),
          sektor: String(r.sektor),
          yil: '2024',
          cari: Number(r.cari) / 1e6, // → Milyar TL
          zincir_degisim: Number(r.zincir_degisim),
        })));

        setAgriShareTrend((agriRes.data || []).map((r: Record<string, unknown>) => {
          const agri = Number(r.agri);
          const total = Number(r.total);
          return {
            yil: String(r.yil),
            agri: agri / 1e6,
            total: total / 1e6,
            share: total > 0 ? (agri / total) * 100 : 0,
            growth: Number(r.growth),
          };
        }));

        setIncomeTop((incTopRes.data || []).map((r: Record<string, unknown>) => ({
          yer: String(r.yer), USD: Number(r.USD), TR: Number(r.TR),
        })));
        setIncomeBottom((incBotRes.data || []).map((r: Record<string, unknown>) => ({
          yer: String(r.yer), USD: Number(r.USD), TR: Number(r.TR),
        })));
        
        // Process income trend data - calculate top5 and bottom5 averages per year
        const yearMap: Record<string, number[]> = {};
        for (const r of (incTrendRes.data || [])) {
          const year = String(r.yil);
          const val = Number(r.usd_val) || 0;
          if (!yearMap[year]) yearMap[year] = [];
          yearMap[year].push(val);
        }
        const trendData = Object.keys(yearMap).sort().map(year => {
          const values = yearMap[year].sort((a, b) => b - a);
          const top5 = values.slice(0, 5);
          const bot5 = values.slice(-5);
          return {
            yil: year,
            topAvg: top5.length ? top5.reduce((a, b) => a + b, 0) / top5.length : 0,
            botAvg: bot5.length ? bot5.reduce((a, b) => a + b, 0) / bot5.length : 0,
          };
        });
        setIncomeTrend(trendData);
      } catch (e) {
        console.error('TurkeyMacro error:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─── Derived ─── */
  const mainSectors = sectorData.filter(s => MAIN_SECTORS.includes(s.sektorkod));
  const totalGDP = mainSectors.reduce((sum, s) => sum + s.cari, 0);
  const agriSector = sectorData.find(s => s.sektorkod === 'A');
  const agriShare = totalGDP > 0 && agriSector ? (agriSector.cari / totalGDP) * 100 : 0;
  const agriGrowth = agriSector?.zincir_degisim ?? 0;
  const latestIncome = incomeTop[0];
  const lowestIncome = incomeBottom[0];
  const gapRatio = latestIncome && lowestIncome ? (latestIncome.USD / lowestIncome.USD) : 0;
  const latestShare = agriShareTrend[agriShareTrend.length - 1];
  const prevShare = agriShareTrend.length > 1 ? agriShareTrend[agriShareTrend.length - 2] : null;
  const shareDelta = latestShare && prevShare ? latestShare.share - prevShare.share : 0;

  // Pie chart data
  const pieData = mainSectors.map(s => ({
    name: SECTOR_SHORT[s.sektorkod] || s.sektorkod,
    value: s.cari,
    fill: SECTOR_COLORS[s.sektorkod] || '#999',
  }));

  // Sectoral growth ranking
  const growthRanking = [...mainSectors]
    .sort((a, b) => b.zincir_degisim - a.zincir_degisim)
    .map(s => ({
      name: SECTOR_SHORT[s.sektorkod],
      growth: s.zincir_degisim,
      fill: SECTOR_COLORS[s.sektorkod],
    }));

  // Agriculture share + growth dual axis chart
  const agriChartData = useMemo(() =>
    agriShareTrend.map(r => ({
      yil: r.yil,
      'GSYH Payı (%)': Number(r.share.toFixed(2)),
      'Reel Büyüme (%)': Number(r.growth.toFixed(2)),
      'Tarım GSYH': Number(r.agri.toFixed(0)),
    })),
  [agriShareTrend]);

  // Income gap chart
  const incomeGapChart = useMemo(() =>
    incomeTrend.map(r => ({
      yil: r.yil,
      'En Zengin 5 İl': r.topAvg,
      'En Yoksul 5 İl': r.botAvg,
      'Oran': r.botAvg > 0 ? Number((r.topAvg / r.botAvg).toFixed(1)) : 0,
    })),
  [incomeTrend]);

  if (loading) return <Loading />;
  if (error) return <ErrorState title="Makroekonomik veri yüklenemedi" onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Header ─── */}
      <div className="rounded-2xl p-6 shadow-lg" style={{ background: 'var(--bg-card)', borderLeft: '4px solid #0ea5e9' }}>
        <div className="flex items-center gap-3 mb-2">
          <Landmark size={28} style={{ color: '#0ea5e9' }} />
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Makroekonomik Göstergeler</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          TÜİK GSYH Sektörel Dağılım (A21) • Kişi Başı Gelir • Tarım Ekonomisi Analizi • 2000-2024
        </p>
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI icon={Landmark} title="Toplam GSYH" value={fmtMilyar(totalGDP) + ' Milyar ₺'}
             sub="2024 Cari Fiyatlarla" color="#2563eb" />
        <KPI icon={Activity} title="Tarım GSYH Payı" value={agriShare.toFixed(1) + '%'}
             sub={`Δ ${shareDelta >= 0 ? '+' : ''}${shareDelta.toFixed(2)} puan`}
             color="#16a34a" />
        <KPI icon={TrendingUp} title="Tarım Büyümesi" value={agriGrowth.toFixed(1) + '%'}
             sub="Reel (zincir endeks)" color={agriGrowth > 0 ? '#16a34a' : '#dc2626'} />
        <KPI icon={DollarSign} title="En Yüksek Gelir" value={'$' + (latestIncome?.USD || 0).toLocaleString()}
             sub={latestIncome?.yer || '-'} color="#7c3aed" />
        <KPI icon={MapPin} title="En Düşük Gelir" value={'$' + (lowestIncome?.USD || 0).toLocaleString()}
             sub={lowestIncome?.yer || '-'} color="#dc2626" />
        <KPI icon={Users} title="Gelir Uçurumu" value={gapRatio.toFixed(1) + 'x'}
             sub="En zengin / En yoksul il" color={gapRatio > 4 ? '#dc2626' : '#f59e0b'} />
      </div>

      {/* ─── Row: Pie + Growth ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sektörel GSYH Dağılımı */}
        <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 size={16} className="text-blue-600" />
            Sektörel GSYH Dağılımı — 2024 (Milyar ₺)
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                   outerRadius={120} innerRadius={50} paddingAngle={2}
                   // eslint-disable-next-line @typescript-eslint/no-explicit-any
                   label={((props: any) =>
                     `${String(props.name || '')} %${((Number(props.percent) || 0) * 100).toFixed(0)}`
                   )} labelLine={{ strokeWidth: 1 }} style={{ fontSize: 10 }}>
                {pieData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [fmtMilyar(v) + ' Milyar ₺', '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sektörel Büyüme Sıralaması */}
        <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp size={16} className="text-green-600" />
            Sektörel Reel Büyüme — 2024 (%)
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={growthRanking} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={88} />
              <Tooltip formatter={(v: number) => [v.toFixed(2) + '%', 'Büyüme']} />
              <Bar dataKey="growth" radius={[0, 4, 4, 0]}>
                {growthRanking.map((d, i) => (
                  <Cell key={i} fill={d.fill} opacity={d.growth >= 0 ? 1 : 0.6} />
                ))}
              </Bar>

            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Agriculture GDP Share + Growth Trend (25 Years) ─── */}
      <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Activity size={16} className="text-green-600" />
          Tarım Sektörünün 25 Yıllık Serüveni — GSYH Payı &amp; Reel Büyüme
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={agriChartData} margin={{ top: 10, right: 50, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="yil" tick={{ fontSize: 10 }} interval={2} />
            <YAxis yAxisId="left" domain={[0, 'auto']} tickFormatter={v => v + '%'} tick={{ fontSize: 10 }}
                   label={{ value: 'GSYH Payı (%)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }}
                   label={{ value: 'Büyüme (%)', angle: 90, position: 'insideRight', fontSize: 10 }} />
            <Tooltip formatter={(v: number, name: string) => [
              name.includes('GSYH') ? v.toFixed(0) + ' Milyar ₺' : v.toFixed(2) + '%', name
            ]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="left" type="monotone" dataKey="GSYH Payı (%)"
                  fill="#16a34a" fillOpacity={0.15} stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
            <Bar yAxisId="right" dataKey="Reel Büyüme (%)" radius={[3, 3, 0, 0]}>
              {agriChartData.map((d, i) => (
                <Cell key={i} fill={d['Reel Büyüme (%)'] >= 0 ? '#22c55e' : '#ef4444'} opacity={0.7} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-3 rounded-lg p-3 text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>📊 Intelligence Notu:</p>
          <p>
            {agriShareTrend.length > 0 && (() => {
              const first = agriShareTrend[0];
              const last = agriShareTrend[agriShareTrend.length - 1];
              const decline = first.share - last.share;
              const volatileYears = agriShareTrend.filter(r => Math.abs(r.growth) > 5).length;
              return `Tarımın GSYH payı ${first.yil}'de %${first.share.toFixed(1)}'den ${last.yil}'de %${last.share.toFixed(1)}'e geriledi (${decline.toFixed(1)} puan düşüş). Son 25 yılda ${volatileYears} yılda %5'ten fazla dalgalanma yaşandı — tarım, en volatil sektörlerden biri olmaya devam ediyor.`;
            })()}
          </p>
        </div>
      </div>

      {/* ─── Provincial Income: Top vs Bottom ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 */}
        <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <DollarSign size={16} className="text-green-600" />
            En Yüksek Kişi Başı Gelir — 2024
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeTop} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="yer" tick={{ fontSize: 11 }} width={75} />
              <Tooltip formatter={(v: number) => ['$' + v.toLocaleString(), 'Kişi Başı Gelir']} />
              <Bar dataKey="USD" fill="#16a34a" radius={[0, 4, 4, 0]}>
                {incomeTop.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#166534' : i < 3 ? '#16a34a' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom 10 */}
        <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MapPin size={16} className="text-red-500" />
            En Düşük Kişi Başı Gelir — 2024
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeBottom} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="yer" tick={{ fontSize: 11 }} width={75} />
              <Tooltip formatter={(v: number) => ['$' + v.toLocaleString(), 'Kişi Başı Gelir']} />
              <Bar dataKey="USD" fill="#dc2626" radius={[0, 4, 4, 0]}>
                {incomeBottom.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#dc2626' : i < 6 ? '#f97316' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Income Gap Trend ─── */}
      {incomeGapChart.length > 0 && (
        <div className="rounded-xl shadow-md p-4" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users size={16} className="text-purple-600" />
            Gelir Eşitsizliği Trendi — En Zengin 5 vs En Yoksul 5 İl (USD)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={incomeGapChart} margin={{ top: 10, right: 50, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="yil" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fontSize: 10 }}
                     label={{ value: 'Oran (x)', angle: 90, position: 'insideRight', fontSize: 10 }} />
              <Tooltip formatter={(v: number, name: string) =>
                [name === 'Oran' ? v + 'x' : '$' + v.toLocaleString(), name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="left" type="monotone" dataKey="En Zengin 5 İl"
                    fill="#16a34a" fillOpacity={0.1} stroke="#16a34a" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="En Yoksul 5 İl"
                    fill="#dc2626" fillOpacity={0.1} stroke="#dc2626" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="Oran"
                    stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-2 rounded-lg p-3 text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>📊 Intelligence Notu:</p>
            <p>
              {incomeGapChart.length > 0 && (() => {
                const first = incomeGapChart[0];
                const last = incomeGapChart[incomeGapChart.length - 1];
                const gapChange = last.Oran - first.Oran;
                return `${first.yil}'den ${last.yil}'e gelir uçurumu ${gapChange > 0 ? 'arttı' : 'azaldı'} (${first.Oran}x → ${last.Oran}x). En zengin 5 il, en yoksul 5 ilden yaklaşık ${last.Oran}x daha fazla kişi başı gelire sahip. Tarım yoğun illerin genellikle düşük gelir grubunda olması, tarımsal katma değer sorununa işaret ediyor.`;
              })()}
            </p>
          </div>
        </div>
      )}

      {/* ─── Sectoral Detail Table ─── */}
      <div className="rounded-xl shadow-md p-4 overflow-x-auto" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Landmark size={16} className="text-blue-600" />
          Sektörel GSYH Detay Tablosu — 2024
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-left py-2 px-3" style={{ color: 'var(--text-primary)' }}>Sektör</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>GSYH (Milyar ₺)</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>Pay (%)</th>
              <th className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>Reel Büyüme (%)</th>
              <th className="text-left py-2 px-3 w-40" style={{ color: 'var(--text-primary)' }}>Dağılım</th>
            </tr>
          </thead>
          <tbody>
            {MAIN_SECTORS.map(code => {
              const s = sectorData.find(d => d.sektorkod === code);
              if (!s) return null;
              const share = totalGDP > 0 ? (s.cari / totalGDP) * 100 : 0;
              return (
                <tr key={code} className={`hover:bg-green-50 ${code === 'A' ? 'bg-green-50 font-bold' : ''}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                    <span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: SECTOR_COLORS[code] }} />
                    {SECTOR_SHORT[code]}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{fmtMilyar(s.cari)}</td>
                  <td className="py-2 px-3 text-right">{share.toFixed(1)}%</td>
                  <td className={`py-2 px-3 text-right font-bold ${s.zincir_degisim >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {s.zincir_degisim >= 0 ? '+' : ''}{s.zincir_degisim.toFixed(2)}%
                  </td>
                  <td className="py-2 px-3">
                    <div className="w-full rounded-full h-2" style={{ background: 'var(--bg-primary)' }}>
                      <div className="h-2 rounded-full" style={{ width: `${Math.min(share, 100)}%`, backgroundColor: SECTOR_COLORS[code] }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Intelligence Summary ─── */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '2px solid var(--border)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Activity size={16} className="text-green-400" />
          🧠 Makroekonomik Intelligence Özeti
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <p className="text-green-300 font-bold mb-1">Tarımın Konumu</p>
            <p>Tarım GSYH payı %{agriShare.toFixed(1)} ile {
              [...mainSectors].sort((a, b) => b.cari - a.cari).findIndex(s => s.sektorkod === 'A') + 1
            }. sırada. Reel büyüme %{agriGrowth.toFixed(1)}.
            Tarım ekonominin yaklaşık her {Math.round(100 / agriShare)} TL'sinden 1 TL'sini üretiyor.</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <p className="text-blue-300 font-bold mb-1">Sektörel Dinamik</p>
            <p>{(() => {
              const fastest = growthRanking[0];
              const slowest = growthRanking[growthRanking.length - 1];
              return `En hızlı büyüyen: ${fastest?.name} (%${fastest?.growth.toFixed(1)}). En yavaş: ${slowest?.name} (%${slowest?.growth.toFixed(1)}). Sanayi ${(sectorData.find(s => s.sektorkod === 'BCD')?.zincir_degisim ?? 0).toFixed(1)}% büyüdü.`;
            })()}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <p className="text-purple-300 font-bold mb-1">Bölgesel Eşitsizlik</p>
            <p>En zengin il ({incomeTop[0]?.yer}) ile en yoksul il ({incomeBottom[0]?.yer}) arasında {gapRatio.toFixed(1)}x gelir farkı.
            {gapRatio > 4 ? ' 🔴 Kritik eşitsizlik seviyesi.' : gapRatio > 3 ? ' 🟠 Yüksek eşitsizlik.' : ' 🟡 Orta seviye.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
