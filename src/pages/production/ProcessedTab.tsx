/* eslint-disable @typescript-eslint/no-explicit-any */
import { Globe, Factory, TrendingUp, Activity } from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../../components/KPICard';
import { InsightCard } from '../../components/InsightCard';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { translateProduct } from '../../utils/productTranslations';
import { formatMetric } from '../../utils/livestockCalculations';
import { formatValue, formatShort, TURKEY_COLOR, CHART_COLORS } from './productionTypes';
import type { Insight, ProcessedKPIs } from './productionTypes';

interface ProcessedTabProps {
  processedProduct: string;
  setProcessedProduct: (p: string) => void;
  processedProducts: string[];
  processedTopCountries: any[];
  processedTrends: any[];
  processedKPIs: ProcessedKPIs | null;
  processedInsights: Insight[];
}

export function ProcessedTab({
  processedProduct, setProcessedProduct, processedProducts,
  processedTopCountries, processedTrends, processedKPIs, processedInsights
}: ProcessedTabProps) {
  return (
    <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Factory size={14} /> İşlenmiş Ürün</label>
          <select value={processedProduct} onChange={(e) => setProcessedProduct(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
            {processedProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
          </select>
        </div>
      </div>

      {processedKPIs && (<>
        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <KPICard title="Dünya Toplam" value={formatValue(processedKPIs.worldTotal)} subtitle={`Lider: ${processedKPIs.leader} (%${processedKPIs.leaderShare.toFixed(1)})`} icon={Globe} color="blue" large />
          <KPICard title="🇹🇷 Türkiye" value={formatValue(processedKPIs.turkeyProduction)} subtitle={processedKPIs.turkeyRank > 0 ? `${processedKPIs.turkeyRank}. | %${processedKPIs.turkeyShare.toFixed(1)}` : 'Sıralama dışı'} icon={Factory} color="green" />
          <KPICard title="Dünya CAGR" value={`${processedKPIs.worldCAGR >= 0 ? '+' : ''}${processedKPIs.worldCAGR.toFixed(2)}%`} subtitle="Bileşik büyüme" icon={TrendingUp} color={processedKPIs.worldCAGR >= 0 ? 'green' : 'red'} />
          <KPICard title="🇹🇷 CAGR" value={`${processedKPIs.turkeyCAGR >= 0 ? '+' : ''}${processedKPIs.turkeyCAGR.toFixed(2)}%`} subtitle="Türkiye büyüme" icon={Activity} color={processedKPIs.turkeyCAGR >= 0 ? 'green' : 'red'} />
        </div>

        <div style={{ marginBottom: '24px' }}><InsightCard insights={processedInsights} maxDisplay={6} /></div>

        <div className="chart-card" style={{ marginBottom: '24px', padding: '20px', overflowX: 'auto' }}>
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>🏆 Top Üretici — {translateProduct(processedProduct).substring(0, 40)}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['#', 'Ülke', 'Üretim', 'Pay %'].map(h => <th key={h} style={{ textAlign: h === '#' || h === 'Ülke' ? 'left' : 'right', padding: '10px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {processedTopCountries.slice(0, 15).map((c: any) => (
                <tr key={c.country} style={{ borderBottom: '1px solid var(--border)', background: c.isTurkey ? 'rgba(255,107,53,0.1)' : 'transparent', fontWeight: c.isTurkey ? 700 : 400 }}>
                  <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.rank}</td>
                  <td style={{ padding: '10px 8px', color: c.isTurkey ? TURKEY_COLOR : 'var(--text-primary)' }}>{c.isTurkey ? '🇹🇷 ' : ''}{c.country}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatMetric(c.production)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>%{c.share.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-grid" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Trend — Dünya vs Türkiye</h3>
              <ChartInsightButton title="İşlenmiş Üretim Trendi — Dünya vs Türkiye" description="Yıllık dünya ve Türkiye işlenmiş ürün trendi" data={processedTrends} context={{ ürün: processedProduct }} />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={processedTrends}>
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
              <ChartInsightButton title="İşlenmiş Ürün Pazar Payı — Top 10" description="İşlenmiş üretimde lider 10 ülke pazar payı" data={processedTopCountries.slice(0, 10)} context={{ ürün: processedProduct }} />
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={processedTopCountries.slice(0, 10)} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="production" nameKey="country"
                  label={(props: any) => { const p = props as unknown as Record<string, unknown>; return `${String(p.country).substring(0, 10)} ${((Number(p.percent) || 0) * 100).toFixed(0)}%`; }}>
                  {processedTopCountries.slice(0, 10).map((e: any, i: number) => <Cell key={`c-${i}`} fill={e.isTurkey ? TURKEY_COLOR : CHART_COLORS[i % CHART_COLORS.length]} />)}
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
