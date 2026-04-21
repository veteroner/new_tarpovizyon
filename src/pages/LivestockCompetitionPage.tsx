/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ScatterChart, Scatter, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Loading } from '../components/Loading';
import { InsightCard } from '../components/InsightCard';
import { useLivestockCompetitionData, isTR } from './livestockCompetition/useLivestockCompetitionData';

/* ── Color constants ───────────────────────────────────────── */
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];
const TURKEY_COLOR = '#ef4444';
const POS = '#22c55e';
const NEG = '#ef4444';
const NEUT = '#f59e0b';

/* ── Helpers ───────────────────────────────────────────────── */
function fmtVal(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════ */
export function LivestockCompetitionPage() {
  const {
    loading,
    selectedYear, setSelectedYear, availableYears,
    currentRankings, turkeyTrend, insights,
    turkeyData, rnk, pRnk, trCagr, world, hhi,
    mktShareChart, bcgData, rivals, catchUp, radarData, top2,
  } = useLivestockCompetitionData();

  /* ── render helpers ──────────────────────────────────────── */
  const rankBadge = (chg: number) =>
    chg > 0 ? <span style={{ color: POS }}>▲{chg}</span>
    : chg < 0 ? <span style={{ color: NEG }}>▼{Math.abs(chg)}</span>
    : <span style={{ color: NEUT }}>━</span>;

  const cagrBadge = (v: number) => (
    <span style={{
      padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
      background: v > 0 ? 'rgba(34,197,94,.2)' : v < 0 ? 'rgba(239,68,68,.2)' : 'rgba(245,158,11,.2)',
      color: v > 0 ? POS : v < 0 ? NEG : NEUT,
    }}>
      {v > 0 ? '↑' : v < 0 ? '↓' : '→'} {Math.abs(v).toFixed(1)}% BBO
    </span>
  );

  if (loading) return <Loading />;

  /* ══════════  JSX  ══════════ */
  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">🏆 Rekabet Analizi</h1>
        <p className="page-subtitle">
          Türkiye'nin dünya hayvansal üretimindeki stratejik konumu · FAO verileri · {selectedYear}
        </p>
      </div>

      {/* ── Year Selector ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {availableYears.slice(0, 15).map(y => (
          <button key={y} onClick={() => setSelectedYear(y)} style={{
            padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
            border: selectedYear === y ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: selectedYear === y ? 'rgba(99,102,241,.2)' : 'var(--bg-card)',
            color: selectedYear === y ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: selectedYear === y ? 700 : 400,
          }}>{y}</button>
        ))}
      </div>

      {/* ── KPI Row 1 – Turkey basics ──────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header"><span className="kpi-title">🇹🇷 TÜRKİYE TOPLAM ÜRETİM</span></div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: TURKEY_COLOR }}>
            {turkeyData ? fmtVal(turkeyData.total) : 'N/A'}
          </div>
          <div className="kpi-subtitle">
            Et + Süt + Yumurta · Dünya #{rnk.total} {rankBadge(pRnk.total - rnk.total)}
          </div>
          <div style={{ marginTop: 8 }}>{cagrBadge(trCagr.total)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🥩 ET SIRALAMASI</span><div className="kpi-icon red">#{rnk.meat}</div></div>
          <div className="kpi-value">{turkeyData ? fmtVal(turkeyData.meat) : 'N/A'}</div>
          <div className="kpi-subtitle">{rankBadge(pRnk.meat - rnk.meat)} 5 yılda</div>
          <div style={{ marginTop: 5 }}>{cagrBadge(trCagr.meat)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🥛 SÜT SIRALAMASI</span><div className="kpi-icon blue">#{rnk.milk}</div></div>
          <div className="kpi-value">{turkeyData ? fmtVal(turkeyData.milk) : 'N/A'}</div>
          <div className="kpi-subtitle">{rankBadge(pRnk.milk - rnk.milk)} 5 yılda</div>
          <div style={{ marginTop: 5 }}>{cagrBadge(trCagr.milk)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🥚 YUMURTA SIRALAMASI</span><div className="kpi-icon orange">#{rnk.eggs}</div></div>
          <div className="kpi-value">{turkeyData ? fmtVal(turkeyData.eggs) : 'N/A'}</div>
          <div className="kpi-subtitle">{rankBadge(pRnk.eggs - rnk.eggs)} 5 yılda</div>
          <div style={{ marginTop: 5 }}>{cagrBadge(trCagr.eggs)}</div>
        </div>
      </div>

      {/* ── KPI Row 2 – Intelligence metrics ───────────────── */}
      <div className="kpi-grid" style={{ marginTop: 15 }}>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">📊 PAZAR PAYI</span></div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            %{turkeyData && world.total > 0 ? ((turkeyData.total / world.total) * 100).toFixed(2) : '0'}
          </div>
          <div className="kpi-subtitle">Dünya toplam hayvansal üretim payı</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🎯 HHI KONSANTRASYON</span></div>
          <div className="kpi-value" style={{
            color: hhi.concentration === 'VERY_HIGH' ? NEG : hhi.concentration === 'HIGH' ? NEUT : POS
          }}>{hhi.hhi.toFixed(0)}</div>
          <div className="kpi-subtitle">
            {hhi.concentration === 'LOW' ? '✅ Rekabetçi' : hhi.concentration === 'MODERATE' ? '⚠️ Orta' : hhi.concentration === 'HIGH' ? '🟡 Yüksek' : '🔴 Çok yüksek'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">📈 TOP 3 PAY</span></div>
          <div className="kpi-value" style={{ color: '#8b5cf6' }}>%{hhi.top3Share.toFixed(1)}</div>
          <div className="kpi-subtitle">En büyük 3 üreticinin payı</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">🌍 ETKİN RAKİP</span></div>
          <div className="kpi-value" style={{ color: '#06b6d4' }}>{hhi.effectiveCompetitors.toFixed(1)}</div>
          <div className="kpi-subtitle">{currentRankings.length} ülke arasında</div>
        </div>
      </div>

      {/* ── Turkey Share ───────────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">🇹🇷 Türkiye'nin Dünya Payı ({selectedYear})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, padding: 15 }}>
          {([
            { label: 'Et Üretimi', val: turkeyData?.meat || 0, w: world.meat, color: '#ef4444', emoji: '🥩' },
            { label: 'Süt Üretimi', val: turkeyData?.milk || 0, w: world.milk, color: '#3b82f6', emoji: '🥛' },
            { label: 'Yumurta Üretimi', val: turkeyData?.eggs || 0, w: world.eggs, color: '#f59e0b', emoji: '🥚' },
          ]).map((it, i) => {
            const pct = it.w > 0 ? (it.val / it.w) * 100 : 0;
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 20, textAlign: 'center',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 5 }}>{it.emoji}</div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: 10, fontSize: '0.85rem' }}>{it.label}</h4>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: it.color }}>%{pct.toFixed(2)}</div>
                <div style={{ marginTop: 10, background: 'rgba(255,255,255,.05)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct * 5, 100)}%`, background: it.color, borderRadius: 8, transition: 'width .5s' }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  {fmtVal(it.val)} / {fmtVal(it.w)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Insights ───────────────────────────────────────── */}
      {insights.length > 0 && <div style={{ marginTop: 20 }}><InsightCard insights={insights} /></div>}

      {/* ── Charts Row 1: Market Share + BCG ────────────────── */}
      <div className="chart-grid" style={{ marginTop: 20 }}>
        {/* Market Share Evolution */}
        <div className="chart-card">
          <h3 className="chart-title">📈 Pazar Payı Evrimi (2010–{selectedYear})</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={mktShareChart} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v: number, n: string) => [`%${(v as number).toFixed(2)}`, n]} />
              <Legend />
              {currentRankings.slice(0, 8).map((c, i) => (
                <Area key={c.country} type="monotone" dataKey={c.country} stackId="1"
                  stroke={isTR(c.country) ? TURKEY_COLOR : COLORS[i % COLORS.length]}
                  fill={isTR(c.country) ? TURKEY_COLOR : COLORS[i % COLORS.length]}
                  fillOpacity={isTR(c.country) ? 0.8 : 0.4} />
              ))}
              <Area type="monotone" dataKey="Diğer" stackId="1" stroke="#6b7280" fill="#6b7280" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* BCG Matrix */}
        <div className="chart-card">
          <h3 className="chart-title">🎯 Rekabet Pozisyon Matrisi (Büyüme × Pay)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="share" stroke="var(--text-secondary)"
                label={{ value: 'Pazar Payı (%)', position: 'bottom', fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="number" dataKey="cagr" stroke="var(--text-secondary)"
                label={{ value: 'BBO (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip content={({ payload }) => {
                const d = payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{d.fullName}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Pay: %{d.share.toFixed(2)} · BBO: %{d.cagr.toFixed(1)}
                    </div>
                  </div>
                );
              }} />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
              <ReferenceLine x={2} stroke="var(--border)" strokeDasharray="3 3" />
              <Scatter data={bcgData.filter(d => !d.isTurkey)} fill="#6366f1" fillOpacity={0.6} />
              <Scatter data={bcgData.filter(d => d.isTurkey)} fill={TURKEY_COLOR} fillOpacity={1} shape="star" />
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, fontSize: '0.75rem', padding: 10, color: 'var(--text-secondary)' }}>
            <span>↗️ Sağ üst: Yıldızlar</span>
            <span>↘️ Sağ alt: Nakit İnekleri</span>
            <span>↖️ Sol üst: Soru İşaretleri</span>
            <span>↙️ Sol alt: Köpekler</span>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Top Producers + Radar ─────────────── */}
      <div className="chart-grid">
        {/* Top 15 */}
        <div className="chart-card">
          <h3 className="chart-title">🏆 Top 15 Hayvansal Üretici ({selectedYear})</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={currentRankings.slice(0, 15).map(c => ({
                name: c.country.length > 15 ? c.country.substring(0, 15) + '..' : c.country,
                fullName: c.country,
                meat: c.meat / 1e6, milk: c.milk / 1e6, eggs: c.eggs / 1e6,
                isTurkey: isTR(c.country),
              }))}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={v => `${v.toFixed(0)}M`} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={95}
                tick={({ x, y, payload }: Record<string, unknown>) => {
                  const px = Number(x || 0);
                  const py = Number(y || 0);
                  const val = String((payload as Record<string, unknown>)?.value || '');
                  const d = currentRankings.slice(0, 15).find(c =>
                    (c.country.length > 15 ? c.country.substring(0, 15) + '..' : c.country) === val);
                  const t = d ? isTR(d.country) : false;
                  return <text x={px} y={py} dy={4} textAnchor="end" fill={t ? TURKEY_COLOR : 'var(--text-secondary)'} fontWeight={t ? 700 : 400} fontSize={11}>
                    {t ? '🇹🇷 ' : ''}{val}
                  </text>;
                }}
              />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(v: number, n: string) => [`${(v as number).toFixed(2)}M ton`, n === 'meat' ? 'Et' : n === 'milk' ? 'Süt' : 'Yumurta']} />
              <Legend formatter={v => v === 'meat' ? '🥩 Et' : v === 'milk' ? '🥛 Süt' : '🥚 Yumurta'} />
              <Bar dataKey="meat" stackId="a" fill="#ef4444" />
              <Bar dataKey="milk" stackId="a" fill="#3b82f6" />
              <Bar dataKey="eggs" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="chart-card">
          <h3 className="chart-title">📊 Türkiye vs Top 2 – Kategori Karşılaştırması</h3>
          {top2.length >= 2 && radarData.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" />
                <PolarRadiusAxis stroke="var(--text-secondary)" domain={[0, 100]} />
                <Radar name="Türkiye" dataKey="Türkiye" stroke={TURKEY_COLOR} fill={TURKEY_COLOR} fillOpacity={0.4} strokeWidth={2} />
                <Radar name={top2[0].country} dataKey={top2[0].country} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Radar name={top2[1].country} dataKey={top2[1].country} stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                <Legend />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
          <div style={{ padding: 10, fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            💡 Her kategoride en yüksek üretici = 100 baz puan. Diğerleri oransal.
          </div>
        </div>
      </div>

      {/* ── Turkey Trend ───────────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">📈 Türkiye Üretim Trendi (Tüm Yıllar)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={turkeyTrend} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              formatter={(v: number, n: string) => [fmtVal(v) + ' ton', n === 'meat' ? '🥩 Et' : n === 'milk' ? '🥛 Süt' : '🥚 Yumurta']} />
            <Legend formatter={v => v === 'meat' ? '🥩 Et' : v === 'milk' ? '🥛 Süt' : '🥚 Yumurta'} />
            <Line type="monotone" dataKey="meat" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
            <Line type="monotone" dataKey="milk" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
            <Line type="monotone" dataKey="eggs" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* ── Treemap: Ülke Pazar Payı Haritası ──────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">🗺️ Ülke Pazar Payı Haritası ({selectedYear}) — Top 20</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 0 12px' }}>
          Alan büyüklüğü toplam hayvansal üretim miktarıyla orantılı. Türkiye kırmızı ile gösterilmiştir.
        </p>
        <ResponsiveContainer width="100%" height={420}>
          <Treemap
            data={currentRankings.slice(0, 20).map((c, i) => ({
              name: c.country.length > 18 ? c.country.substring(0, 18) + '…' : c.country,
              size: c.meat + c.milk + c.eggs,
              isTurkey: isTR(c.country),
              color: isTR(c.country) ? TURKEY_COLOR : COLORS[i % COLORS.length],
            }))}
            dataKey="size"
            aspectRatio={4 / 3}
            content={(props: any) => {
              const { x = 0, y = 0, width = 0, height = 0, name = '', isTurkey = false, color = '#6366f1', depth = 0 } = props;
              if (depth === 0 || width < 15 || height < 15) return <g />;
              return (
                <g>
                  <rect x={x} y={y} width={width} height={height}
                    fill={color} stroke="var(--bg-card)" strokeWidth={2} rx={3} />
                  {width > 40 && height > 20 && (
                    <text
                      x={x + width / 2} y={y + height / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize={Math.min(12, Math.floor(width / 7))}
                      fontWeight={isTurkey ? 700 : 400}
                    >
                      {name}
                    </text>
                  )}
                </g>
              );
            }}
          >
            <Tooltip formatter={(v: number) => [fmtVal(v) + ' ton', 'Toplam Üretim']} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* ── HHI Zaman Serisi ─────────────────────────────────── */}
      {mktShareChart.length > 1 && (() => {
        const hhiSeries = (mktShareChart as Record<string, number>[]).map(row => {
          const year = row.year;
          const hhi_val = Object.entries(row)
            .filter(([k]) => k !== 'year')
            .reduce((s, [, v]) => s + (v / 100) ** 2, 0);
          return { year, hhi: Math.round(hhi_val * 10000) };
        });
        return (
          <div className="chart-card" style={{ marginTop: 20 }}>
            <h3 className="chart-title">📊 Piyasa Konsantrasyon Endeksi (HHI) Zaman Serisi</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 0 8px' }}>
              HHI &lt; 1500 = Rekabetçi · 1500–2500 = Orta · &gt; 2500 = Yoğunlaşmış piyasa (DOJ kriterleri)
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hhiSeries} margin={{ top: 10, right: 70, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  formatter={(v: number) => [v.toLocaleString(), 'HHI']}
                />
                <ReferenceLine y={1500} stroke="#22c55e" strokeDasharray="4 2"
                  label={{ value: 'Rekabetçi sınır (1500)', fontSize: 10, fill: '#22c55e', position: 'right' }} />
                <ReferenceLine y={2500} stroke="#ef4444" strokeDasharray="4 2"
                  label={{ value: 'Yoğunlaşma sınır (2500)', fontSize: 10, fill: '#ef4444', position: 'right' }} />
                <Line type="monotone" dataKey="hhi" stroke="#6366f1" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1' }} name="HHI" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
      {/* ── Catch-Up Analysis ──────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">🎯 Yakalama Analizi – Türkiye vs Dünya Liderleri</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.05)' }}>
                {['Kategori', 'Lider', 'Lider Üretim', 'Türkiye', 'TR Sıra', 'Fark', 'TR BBO', 'Lider BBO', 'Yakalama'].map(h => (
                  <th key={h} style={{ padding: 12, textAlign: h === 'Yakalama' ? 'center' : h === 'Kategori' || h === 'Lider' ? 'left' : 'right',
                    borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catchUp.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.emoji} {c.name}</td>
                  <td style={{ padding: 12, color: 'var(--text-primary)' }}>{c.leader}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtVal(c.leaderVal)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: TURKEY_COLOR, fontWeight: 600 }}>{fmtVal(c.trVal)}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>#{c.trRank}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: NEG }}>{fmtVal(c.gap)}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <span style={{ color: c.tCagr > 0 ? POS : NEG }}>%{c.tCagr.toFixed(1)}</span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <span style={{ color: c.lCagr > 0 ? POS : NEG }}>%{c.lCagr.toFixed(1)}</span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {c.yrs !== null ? (
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600,
                        background: c.yrs < 20 ? 'rgba(34,197,94,.2)' : c.yrs < 50 ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)',
                        color: c.yrs < 20 ? POS : c.yrs < 50 ? NEUT : NEG,
                      }}>~{c.yrs} yıl</span>
                    ) : (
                      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600,
                        background: 'rgba(239,68,68,.2)', color: NEG }}>∞</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{
          marginTop: 15, padding: 15, background: 'rgba(59,130,246,.1)', borderRadius: 8,
          border: '1px solid rgba(59,130,246,.3)'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            💡 <strong>Yakalama formülü:</strong> Türkiye BBO &gt; Lider BBO ise mevcut büyüme hızıyla liderliğe ulaşma süresi hesaplanır.
            Lider daha hızlı büyüyorsa yakalama imkansız (∞).
          </div>
        </div>
      </div>

      {/* ── Nearest Rivals ─────────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 20 }}>
        <h3 className="chart-title">⚔️ Türkiye'nin En Yakın Rakipleri (±5 sıra)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.05)' }}>
                {['#', 'Ülke', 'Toplam', 'Et', 'Süt', 'Yumurta', 'BBO', 'Sıra Δ', 'Fark'].map((h, i) => (
                  <th key={h} style={{ padding: 12, textAlign: i === 0 ? 'center' : i === 1 ? 'left' : i >= 6 ? 'center' : 'right',
                    borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rivals.map((r, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid var(--border)',
                  background: r.isTurkey ? 'rgba(239,68,68,.08)' : 'transparent',
                }}>
                  <td style={{ padding: 12, textAlign: 'center', fontWeight: 700,
                    color: r.rank <= 3 ? '#f59e0b' : 'var(--text-primary)' }}>{r.rank}</td>
                  <td style={{ padding: 12, fontWeight: r.isTurkey ? 700 : 500,
                    color: r.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>
                    {r.isTurkey ? '🇹🇷 ' : ''}{r.country}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>{fmtVal(r.total)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtVal(r.meat)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtVal(r.milk)}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtVal(r.eggs)}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{cagrBadge(r.cagr)}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{rankBadge(r.rankChg)}</td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: '0.85rem',
                    color: r.gap > 0 ? 'var(--text-secondary)' : r.gap < 0 ? NEG : NEUT }}>
                    {r.isTurkey ? '—' : (r.gap > 0 ? '+' : '') + fmtVal(r.gap)}
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
