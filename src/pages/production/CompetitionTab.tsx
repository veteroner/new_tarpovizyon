/* eslint-disable @typescript-eslint/no-explicit-any */
import { Globe, BarChart2 } from 'lucide-react';
import {
  ScatterChart, Scatter, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { KPICard } from '../../components/KPICard';
import { InsightCard } from '../../components/InsightCard';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { translateProduct } from '../../utils/productTranslations';
import { formatMetric } from '../../utils/livestockCalculations';
import { formatValue, formatShort, formatHa, formatYield, TURKEY_COLOR } from './productionTypes';
import type { Insight, CompKPIs } from './productionTypes';

// Local icon stand-ins
const Target: typeof Globe = Globe;
const Award: typeof Globe = Globe;
const Zap: typeof BarChart2 = BarChart2;

interface CompetitionTabProps {
  compProduct: string;
  setCompProduct: (p: string) => void;
  primaryProducts: string[];
  compKPIs: CompKPIs | null;
  compTopMovers: any | null;
  compBubbleData: any[];
  compMatrix: any[];
  compHHITimeline: any[];
  compInsights: Insight[];
}

export function CompetitionTab({
  compProduct, setCompProduct, primaryProducts,
  compKPIs, compTopMovers, compBubbleData, compMatrix, compHHITimeline, compInsights
}: CompetitionTabProps) {
  return (
    <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Zap size={14} /> Rekabet Analizi</label>
          <select value={compProduct} onChange={(e) => setCompProduct(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
            {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
          </select>
        </div>
      </div>

      {compKPIs && (<>
        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <KPICard title="🇹🇷 Sıralama" value={compKPIs.turkeyRank > 0 ? `${compKPIs.turkeyRank}.` : '-'} subtitle={`${compKPIs.totalProducers} üretici`} icon={Target} color="blue" large />
          <KPICard title="Lider" value={compKPIs.leader.substring(0, 15)} subtitle={`%${compKPIs.leaderShare.toFixed(1)}`} icon={Award} color="orange" />
          <KPICard title="HHI" value={compKPIs.latestHHI.toFixed(0)} subtitle={compKPIs.latestHHI > 2500 ? '🔴 Çok Yoğun' : compKPIs.latestHHI > 1500 ? '🟡 Yoğun' : '🟢 Rekabetçi'} icon={BarChart2} color={compKPIs.latestHHI > 2500 ? 'red' : compKPIs.latestHHI > 1500 ? 'orange' : 'green'} />
          <KPICard title="Aktif Ülke" value={compKPIs.totalProducers.toString()} subtitle="Üretim yapan" icon={Globe} color="teal" />
        </div>

        <div style={{ marginBottom: '24px' }}><InsightCard insights={compInsights} maxDisplay={8} /></div>

        {compTopMovers && (
          <div className="chart-grid" style={{ marginBottom: '24px' }}>
            <div className="chart-card" style={{ padding: '20px' }}>
              <h3 className="chart-title" style={{ marginBottom: '16px', color: '#10b981' }}>📈 En Hızlı Büyüyenler</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(compTopMovers.gainers || []).slice(0, 5).map((c: any, i: number) => (
                  <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(16,185,129,0.07)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '20px' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>+{c.growth.toFixed(1)}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatMetric(c.production)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card" style={{ padding: '20px' }}>
              <h3 className="chart-title" style={{ marginBottom: '16px', color: '#ef4444' }}>📉 En Hızlı Düşenler</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(compTopMovers.decliners || []).slice(0, 5).map((c: any, i: number) => (
                  <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(239,68,68,0.07)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '20px' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{c.growth.toFixed(1)}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatMetric(c.production)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RCA & Rekabet Avantajı Göstergeleri ────────────────── */}
        {compMatrix.length >= 5 && (() => {
          const tr = compMatrix.find((c: any) => c.isTurkey);
          if (!tr) return null;
          const sharesSorted = compMatrix.map((c: any) => c.share).sort((a: number, b: number) => a - b);
          const yieldsSorted = compMatrix.filter((c: any) => c.yieldVal > 0).map((c: any) => c.yieldVal).sort((a: number, b: number) => a - b);
          const areasSorted = compMatrix.filter((c: any) => c.area > 0).map((c: any) => c.area).sort((a: number, b: number) => a - b);
          const median = (arr: number[]) => arr.length === 0 ? 0 : arr.length % 2 === 0 ? (arr[arr.length/2 - 1] + arr[arr.length/2]) / 2 : arr[Math.floor(arr.length/2)];
          const medShare = median(sharesSorted) || 0.001;
          const medYield = median(yieldsSorted) || 1;
          const medArea = median(areasSorted) || 1;
          const top5avgYield = yieldsSorted.slice(-5).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(5, yieldsSorted.length));
          // RCA-benzeri normalize göstergeler (1.0 = medyan ile eşit; >1 avantaj)
          const rcaShare = tr.share / medShare;
          const rcaYield = tr.yieldVal / medYield;
          const rcaArea = tr.area / medArea;
          const rcaYieldVsTop = top5avgYield > 0 ? tr.yieldVal / top5avgYield : 0;
          const radarRcaData = [
            { metric: 'Pay (RCA)', value: Math.min(rcaShare, 5), full: 5 },
            { metric: 'Verim Avantajı', value: Math.min(rcaYield, 5), full: 5 },
            { metric: 'Ölçek (Alan)', value: Math.min(rcaArea, 5), full: 5 },
            { metric: 'Verim vs Top 5', value: Math.min(rcaYieldVsTop * 2, 5), full: 5 }, // x2 ölçek (1=Top5 eşit → 2 nokta)
          ];
          const tile = (label: string, val: number, hint: string) => {
            const color = val >= 1.5 ? '#10b981' : val >= 1.0 ? '#3b82f6' : val >= 0.7 ? '#f59e0b' : '#ef4444';
            const badge = val >= 1.5 ? '🏆 Avantaj' : val >= 1.0 ? '✅ Üzerinde' : val >= 0.7 ? '⚠️ Altında' : '🔴 Zayıf';
            return (
              <div style={{ padding: '14px', background: 'var(--bg)', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color, margin: '4px 0' }}>{val.toFixed(2)}×</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{hint}</div>
                <div style={{ fontSize: '10px', color, marginTop: '4px', fontWeight: 600 }}>{badge}</div>
              </div>
            );
          };
          return (
            <div className="chart-card" style={{ marginBottom: '24px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h3 className="chart-title" style={{ marginBottom: 0 }}>🎯 RCA & Rekabet Avantajı — {translateProduct(compProduct)}</h3>
                <ChartInsightButton title={`RCA & Rekabet Avantajı — ${translateProduct(compProduct)}`} description="Türkiye rekabet avantajı radar analizi" data={radarRcaData} context={{ ürün: compProduct }} compact />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Türkiye'nin değerleri global medyana ve top 5 ortalamasına göre normalize edilir. <strong>1,0×</strong> medyan ile eşit, <strong>&gt;1</strong> avantaj.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {tile('Pazar Payı (RCA)', rcaShare, `TR %${tr.share.toFixed(2)} · Medyan %${medShare.toFixed(2)}`)}
                {tile('Verim Avantajı', rcaYield, `TR ${formatYield(tr.yieldVal)} · Medyan ${formatYield(medYield)}`)}
                {tile('Üretim Ölçeği (Alan)', rcaArea, `TR ${formatHa(tr.area)} · Medyan ${formatHa(medArea)}`)}
                {tile('Verim vs Top 5', rcaYieldVsTop, `Top 5 ort: ${formatYield(top5avgYield)}`)}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarRcaData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
                  <Radar name="Türkiye" dataKey="value" stroke={TURKEY_COLOR} fill={TURKEY_COLOR} fillOpacity={0.35} strokeWidth={2} />
                  <Radar name="Medyan (1,0×)" dataKey="full" stroke="#94a3b8" fill="transparent" strokeDasharray="3 3" strokeWidth={1} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}×`, '']} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                💡 RCA (Revealed Comparative Advantage) yaklaşımı: değer ne kadar yüksekse Türkiye o boyutta o denli avantajlı.
              </div>
            </div>
          );
        })()}

        <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>🗺️ Rekabet Matrisi — Top 15</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['#', 'Ülke', 'Üretim', 'Pay %', 'Ekim (ha)', 'Verim'].map(h => <th key={h} style={{ textAlign: h === '#' || h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {compMatrix.slice(0, 15).map((c: any) => (
                <tr key={c.country} style={{ borderBottom: '1px solid var(--border)', background: c.isTurkey ? 'rgba(255,107,53,0.1)' : 'transparent', fontWeight: c.isTurkey ? 700 : 400 }}>
                  <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.rank}</td>
                  <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatMetric(c.production)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>%{c.share.toFixed(1)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatHa(c.area)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatYield(c.yieldVal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-grid" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>🔬 Büyüme vs Üretim (Scatter)</h3>
              <ChartInsightButton title="Büyüme vs Üretim (Scatter)" description="Ülkelerin üretim büyüme oranı ve üretim hacmi dağılımı" data={compBubbleData} context={{ ürün: compProduct }} />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" name="Büyüme %" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <YAxis dataKey="y" name="Üretim" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <Tooltip content={({ active, payload }: any) => {
                  if (active && payload?.[0]) { const d = payload[0].payload; return (
                    <div style={{ padding: '8px 12px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: d.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{d.isTurkey ? '🇹🇷 ' : ''}{d.name}</div>
                      <div>Büyüme: {d.x.toFixed(1)}%</div><div>Üretim: {formatValue(d.y)}</div>
                    </div>); } return null;
                }} />
                <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="4 4" />
                <Scatter data={compBubbleData.filter((d: any) => !d.isTurkey)} fill="#3b82f6" fillOpacity={0.6} />
                <Scatter data={compBubbleData.filter((d: any) => d.isTurkey)} fill={TURKEY_COLOR} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📉 HHI Konsantrasyon Trendi</h3>
              <ChartInsightButton title="HHI Konsantrasyon Trendi" description="Herfindahl-Hirschman endeksi ile pazar yoğunlaşma trendi" data={compHHITimeline} context={{ hhi: compKPIs?.latestHHI }} />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={compHHITimeline}>
                <defs>
                  <linearGradient id="hhiG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => [Number(v).toFixed(0), 'HHI']} />
                <ReferenceLine y={2500} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Çok Yoğun', fill: '#ef4444', fontSize: 11 }} />
                <ReferenceLine y={1500} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Yoğun', fill: '#f59e0b', fontSize: 11 }} />
                <Area type="monotone" dataKey="hhi" stroke="#a855f7" strokeWidth={2} fill="url(#hhiG)" name="HHI" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>)}
    </div>
  );
}

// Suppress unused import warning
void formatValue;
