/* eslint-disable @typescript-eslint/no-explicit-any */
import { Globe, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../../components/KPICard';
import { InsightCard } from '../../components/InsightCard';
import { translateProduct } from '../../utils/productTranslations';
import { formatMetric } from '../../utils/livestockCalculations';
import { formatValue, formatShort, formatHa, formatYield, TURKEY_COLOR, CHART_COLORS } from './productionTypes';
import type { Insight, YieldKPIs } from './productionTypes';

// Local icon stand-ins for icons not in lucide-react default set
const Target = (props: any) => <AlertTriangle {...props} />;
const Award = (props: any) => <Globe {...props} />;

interface YieldTabProps {
  yieldProduct: string;
  setYieldProduct: (p: string) => void;
  primaryProducts: string[];
  yieldKPIs: YieldKPIs | null;
  yieldGapData: any[];
  yieldScatter: any[];
  yieldTrends: any[];
  yieldBestPractices: any[];
  yieldInsights: Insight[];
  yieldSegmented: any[];
}

export function YieldTab({
  yieldProduct, setYieldProduct, primaryProducts,
  yieldKPIs, yieldGapData, yieldScatter, yieldTrends,
  yieldBestPractices, yieldInsights, yieldSegmented
}: YieldTabProps) {
  return (
    <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Target size={14} /> Verim Analizi</label>
          <select value={yieldProduct} onChange={(e) => setYieldProduct(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
            {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
          </select>
        </div>
      </div>

      {yieldKPIs && (<>
        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <KPICard title="🇹🇷 Verim" value={formatYield(yieldKPIs.turkeyYield)} subtitle={`${yieldKPIs.turkeyRank}./${yieldKPIs.totalRanked}`} icon={Target} color={yieldKPIs.turkeyYield > yieldKPIs.worldAvgYield ? 'green' : 'red'} large />
          <KPICard title="Dünya Ort." value={formatYield(yieldKPIs.worldAvgYield)} subtitle="Tüm üreticiler" icon={Globe} color="blue" />
          <KPICard title="Lider" value={formatYield(yieldKPIs.leaderYield)} subtitle={yieldKPIs.leader} icon={Award} color="purple" />
          <KPICard title="Gap" value={`%${yieldKPIs.gapToLeader.toFixed(0)}`} subtitle={yieldKPIs.catchUpYears ? `~${yieldKPIs.catchUpYears}y` : 'N/A'} icon={AlertTriangle} color={yieldKPIs.gapToLeader > 50 ? 'red' : 'orange'} />
        </div>

        <div style={{ marginBottom: '24px' }}><InsightCard insights={yieldInsights} maxDisplay={6} /></div>

        <div className="chart-grid" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <h3 className="chart-title">📊 Verim Gap Analizi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yieldGapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatYield(Number(v))} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {yieldGapData.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">📊 Segmented — Gelişmiş vs Gelişmekte</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yieldSegmented}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatYield(Number(v))} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {yieldSegmented.map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-grid" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <h3 className="chart-title">🔬 Alan vs Verim (Scatter)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" name="Alan" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v: number) => formatHa(v)} />
                <YAxis dataKey="y" name="Verim" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip content={({ active, payload }: any) => {
                  if (active && payload?.[0]) { const d = payload[0].payload; return (
                    <div style={{ padding: '8px 12px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: d.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{d.isTurkey ? '🇹🇷 ' : ''}{d.name}</div>
                      <div>Alan: {formatHa(d.x)}</div><div>Verim: {formatYield(d.y)}</div><div>Üretim: {formatValue(d.z)}</div>
                    </div>); } return null;
                }} />
                <Scatter data={yieldScatter.filter((d: any) => !d.isTurkey)} fill="#3b82f6" fillOpacity={0.6} />
                <Scatter data={yieldScatter.filter((d: any) => d.isTurkey)} fill={TURKEY_COLOR} fillOpacity={1} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">📈 Verim Trendi — Dünya vs Türkiye</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={yieldTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(v: unknown, n: unknown) => [formatYield(Number(v)), n === 'world' ? 'Dünya' : '🇹🇷 Türkiye']} />
                <Legend formatter={(v) => v === 'world' ? 'Dünya' : '🇹🇷 Türkiye'} />
                <Line type="monotone" dataKey="world" stroke="#3b82f6" strokeWidth={2} dot={false} name="world" />
                <Line type="monotone" dataKey="turkey" stroke={TURKEY_COLOR} strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="turkey" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>🏅 En Verimli 10 Ülke</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['#', 'Ülke', 'Verim (kg/ha)', 'Üretim', 'Ekim (ha)'].map(h => <th key={h} style={{ textAlign: h === '#' || h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {yieldBestPractices.map((c: any) => (
                <tr key={c.country} style={{ borderBottom: '1px solid var(--border)', background: c.isTurkey ? 'rgba(255,107,53,0.1)' : 'transparent', fontWeight: c.isTurkey ? 700 : 400 }}>
                  <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.rank}</td>
                  <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{formatYield(c.yieldVal)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatMetric(c.production)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatHa(c.area)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}

// Suppress unused import warning for CHART_COLORS
void CHART_COLORS;
