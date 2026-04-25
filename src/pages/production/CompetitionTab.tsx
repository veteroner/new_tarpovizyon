/* eslint-disable @typescript-eslint/no-explicit-any */
import { Globe, BarChart2 } from 'lucide-react';
import {
  ScatterChart, Scatter, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { KPICard } from '../../components/KPICard';
import { InsightCard } from '../../components/InsightCard';
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
            <h3 className="chart-title">🔬 Büyüme vs Üretim (Scatter)</h3>
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
            <h3 className="chart-title">📉 HHI Konsantrasyon Trendi</h3>
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
