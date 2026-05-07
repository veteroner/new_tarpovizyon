/* eslint-disable @typescript-eslint/no-explicit-any */
import { Globe, Leaf, TrendingUp, Activity, Wheat, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../../components/KPICard';
import { InsightCard } from '../../components/InsightCard';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { translateProduct } from '../../utils/productTranslations';
import { formatMetric } from '../../utils/livestockCalculations';
import { formatValue, formatShort, formatHa, formatYield, TURKEY_COLOR, CHART_COLORS } from './productionTypes';
import type { Insight, PrimaryKPIs } from './productionTypes';

interface PrimaryTabProps {
  primaryProduct: string;
  setPrimaryProduct: (p: string) => void;
  primaryProducts: string[];
  primaryTopCountries: any[];
  primaryTrends: any[];
  primaryKPIs: PrimaryKPIs | null;
  primaryHHI: any | null;
  primaryInsights: Insight[];
  primaryAnomalies: any[];
}

export function PrimaryTab({
  primaryProduct, setPrimaryProduct, primaryProducts,
  primaryTopCountries, primaryTrends, primaryKPIs, primaryHHI,
  primaryInsights, primaryAnomalies
}: PrimaryTabProps) {
  return (
    <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Wheat size={14} /> Ürün Seçin</label>
          <select value={primaryProduct} onChange={(e) => setPrimaryProduct(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
            {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
          </select>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>
          📊 {primaryProducts.length} ürün mevcut
        </div>
      </div>

      {primaryKPIs && (<>
        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <KPICard title={`Dünya ${translateProduct(primaryProduct).substring(0, 20)}`} value={formatValue(primaryKPIs.worldTotal)} subtitle={`${primaryKPIs.producerCount} ülke`} icon={Globe} color="blue" large />
          <KPICard title="🇹🇷 Türkiye" value={formatValue(primaryKPIs.turkeyProduction)} subtitle={`${primaryKPIs.turkeyRank}. | %${primaryKPIs.turkeyShare.toFixed(1)}`} icon={Leaf} color="green" />
          <KPICard title="Dünya CAGR" value={`${primaryKPIs.worldCAGR >= 0 ? '+' : ''}${primaryKPIs.worldCAGR.toFixed(2)}%`} subtitle="2000-2023" icon={TrendingUp} color={primaryKPIs.worldCAGR >= 0 ? 'green' : 'red'} />
          <KPICard title="🇹🇷 CAGR" value={`${primaryKPIs.turkeyCAGR >= 0 ? '+' : ''}${primaryKPIs.turkeyCAGR.toFixed(2)}%`} subtitle={`Vol: %${primaryKPIs.turkeyVolatility.toFixed(1)}`} icon={Activity} color={primaryKPIs.turkeyCAGR >= 0 ? 'green' : 'red'} />
        </div>

        {primaryAnomalies.length > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#f59e0b" />
            <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 500 }}>
              {primaryAnomalies.length} anomali: {primaryAnomalies.map((a: any) => `${a.year} (${a.type === 'SPIKE' ? '📈' : '📉'})`).join(', ')}
            </span>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}><InsightCard insights={primaryInsights} maxDisplay={8} /></div>

        <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>🏆 Top Üretici — {translateProduct(primaryProduct)} (2023)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['#', 'Ülke', 'Üretim', 'Pay %', 'Ekim (ha)', 'Verim'].map(h => <th key={h} style={{ textAlign: h === '#' || h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {primaryTopCountries.slice(0, 15).map((c: any) => (
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

        {primaryHHI && (
          <div className="chart-card" style={{ marginBottom: '24px', padding: '20px' }}>
            <h3 className="chart-title" style={{ marginBottom: '16px' }}>📊 Pazar Konsantrasyonu</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>HHI</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: primaryHHI.hhi > 2500 ? '#ef4444' : primaryHHI.hhi > 1500 ? '#f59e0b' : '#10b981' }}>{primaryHHI.hhi.toFixed(0)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{primaryHHI.concentration === 'VERY_HIGH' ? 'Çok Yoğun' : primaryHHI.concentration === 'HIGH' ? 'Yoğun' : primaryHHI.concentration === 'MODERATE' ? 'Orta' : 'Rekabetçi'}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Top 1</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>%{primaryHHI.top1Share.toFixed(1)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{primaryKPIs.leader}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Top 3</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>%{primaryHHI.top3Share.toFixed(1)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Etkin Üretici</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{primaryHHI.effectiveCompetitors}</div>
              </div>
            </div>
          </div>
        )}

        <div className="chart-grid" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Trend — Dünya vs Türkiye</h3>
              <ChartInsightButton title="Birincil Üretim Trendi — Dünya vs Türkiye" description="Yıllık dünya ve Türkiye üretim değişimi" data={primaryTrends} context={{ ürün: primaryProduct, türkiyeCAGR: primaryKPIs?.turkeyCAGR, dünyaCAGR: primaryKPIs?.worldCAGR }} />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={primaryTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: TURKEY_COLOR, fontSize: 11 }} tickFormatter={formatShort} />
                <Tooltip formatter={(v: unknown, n: unknown) => [formatValue(Number(v)), n === 'world' ? 'Dünya' : '🇹🇷 Türkiye']} />
                <Legend formatter={(v) => v === 'world' ? 'Dünya' : '🇹🇷 Türkiye'} />
                <Line yAxisId="left" type="monotone" dataKey="world" stroke="#3b82f6" strokeWidth={2} dot={false} name="world" />
                <Line yAxisId="right" type="monotone" dataKey="turkey" stroke={TURKEY_COLOR} strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="turkey" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>🥧 Pazar Payı — Top 10</h3>
              <ChartInsightButton title="Pazar Payı — Top 10" description="Birincil üretimde lider 10 ülke pazar payı" data={primaryTopCountries.slice(0, 10)} context={{ ürün: primaryProduct }} />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={primaryTopCountries.slice(0, 10)} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="production" nameKey="country"
                  label={(props: any) => { const p = props as unknown as Record<string, unknown>; return `${String(p.country).substring(0, 10)} ${((Number(p.percent) || 0) * 100).toFixed(0)}%`; }}>
                  {primaryTopCountries.slice(0, 10).map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.isTurkey ? TURKEY_COLOR : CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatValue(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>)}
    </div>
  );
}
