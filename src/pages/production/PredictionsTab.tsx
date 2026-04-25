/* eslint-disable @typescript-eslint/no-explicit-any */
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../../components/KPICard';
import { InsightCard } from '../../components/InsightCard';
import { translateProduct } from '../../utils/productTranslations';
import { formatValue, formatShort, formatYield, formatHa } from './productionTypes';
import type { Insight, PredKPIs, ForecastData } from './productionTypes';

// Local icon stand-ins
const Leaf: typeof TrendingUp = TrendingUp;
const Target: typeof TrendingUp = TrendingUp;

interface PredictionsTabProps {
  predProduct: string;
  setPredProduct: (p: string) => void;
  primaryProducts: string[];
  predKPIs: PredKPIs | null;
  predProductionForecast: ForecastData | null;
  predYieldForecast: ForecastData | null;
  predAreaForecast: ForecastData | null;
  predWorldForecast: ForecastData | null;
  predInsights: Insight[];
}

function buildForecastSeries(forecast: ForecastData | null): any[] {
  if (!forecast) return [];
  const hist = (forecast.historical || []).map((p: any) => ({ year: p.year, actual: p.value, predicted: null }));
  const pred = (forecast.forecast || []).map((p: any) => ({ year: p.year, actual: null, predicted: p.value }));
  // attach last historical to first predicted for continuity
  if (hist.length > 0 && pred.length > 0) {
    pred[0].actual = hist[hist.length - 1].actual;
  }
  return [...hist, ...pred];
}

export function PredictionsTab({
  predProduct, setPredProduct, primaryProducts,
  predKPIs, predProductionForecast, predYieldForecast, predAreaForecast,
  predWorldForecast, predInsights
}: PredictionsTabProps) {
  const prodSeries = buildForecastSeries(predProductionForecast);
  const worldSeries = buildForecastSeries(predWorldForecast);
  const yieldSeries = buildForecastSeries(predYieldForecast);
  const areaSeries = buildForecastSeries(predAreaForecast);

  return (
    <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}><Leaf size={14} /> Tahmin Analizi</label>
          <select value={predProduct} onChange={(e) => setPredProduct(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
            {primaryProducts.map(p => <option key={p} value={p}>{translateProduct(p)}</option>)}
          </select>
        </div>
      </div>

      {predKPIs && (<>
        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <KPICard title="🇹🇷 Mevcut" value={formatValue(predKPIs.currentProduction)} subtitle="2023 üretim" icon={Leaf} color="blue" large />
          <KPICard title="Tahmin 2028" value={formatValue(predKPIs.forecastProduction)} subtitle={`${predKPIs.prodChange >= 0 ? '+' : ''}${predKPIs.prodChange.toFixed(1)}%`} icon={predKPIs.prodChange >= 0 ? TrendingUp : TrendingDown} color={predKPIs.prodChange >= 0 ? 'green' : 'red'} />
          <KPICard title="Model R²" value={predKPIs.r2Production.toFixed(3)} subtitle={predKPIs.r2Production > 0.9 ? '✅ Güçlü' : predKPIs.r2Production > 0.7 ? '🟡 Orta' : '⚠️ Zayıf'} icon={Activity} color={predKPIs.r2Production > 0.9 ? 'green' : predKPIs.r2Production > 0.7 ? 'orange' : 'red'} />
          <KPICard title="Verim Tahmin" value={formatYield(predKPIs.forecastYield)} subtitle={predKPIs.forecastYield > predKPIs.currentYield ? '📈 Artış bekleniyor' : '📉 Düşüş bekleniyor'} icon={Target} color={predKPIs.forecastYield > predKPIs.currentYield ? 'green' : 'red'} />
        </div>

        <div style={{ marginBottom: '24px' }}><InsightCard insights={predInsights} maxDisplay={6} /></div>

        <div className="chart-grid" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <h3 className="chart-title">📈 Türkiye Üretim Tahmini</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={prodSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <Tooltip formatter={(v: unknown, n: unknown) => [formatValue(Number(v)), n === 'actual' ? 'Gerçek' : 'Tahmin']} />
                <Legend formatter={(v) => v === 'actual' ? 'Gerçek' : 'Tahmin'} />
                <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="actual" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                  dot={(props: any) => { const d = props as unknown as Record<string, unknown>; return d.value !== null ? <circle cx={Number(d.cx)} cy={Number(d.cy)} r={4} fill="white" stroke="#f59e0b" strokeWidth={2} /> : <g />; }}
                  name="predicted" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">🌍 Dünya Üretim Tahmini</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={worldSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <Tooltip formatter={(v: unknown, n: unknown) => [formatValue(Number(v)), n === 'actual' ? 'Gerçek' : 'Tahmin']} />
                <Legend formatter={(v) => v === 'actual' ? 'Gerçek' : 'Tahmin'} />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={false} name="actual" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                  dot={(props: any) => { const d = props as unknown as Record<string, unknown>; return d.value !== null ? <circle cx={Number(d.cx)} cy={Number(d.cy)} r={4} fill="white" stroke="#f59e0b" strokeWidth={2} /> : <g />; }}
                  name="predicted" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-grid" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <h3 className="chart-title">📊 Verim Tahmini (kg/ha)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yieldSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(v: unknown, n: unknown) => [formatYield(Number(v)), n === 'actual' ? 'Gerçek' : 'Tahmin']} />
                <Legend formatter={(v) => v === 'actual' ? 'Gerçek' : 'Tahmin'} />
                <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="actual" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                  dot={(props: any) => { const d = props as unknown as Record<string, unknown>; return d.value !== null ? <circle cx={Number(d.cx)} cy={Number(d.cy)} r={4} fill="white" stroke="#f59e0b" strokeWidth={2} /> : <g />; }}
                  name="predicted" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">🗺️ Alan Tahmini (ha)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={areaSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                <Tooltip formatter={(v: unknown, n: unknown) => [formatHa(Number(v)), n === 'actual' ? 'Gerçek' : 'Tahmin']} />
                <Legend formatter={(v) => v === 'actual' ? 'Gerçek' : 'Tahmin'} />
                <Line type="monotone" dataKey="actual" stroke="#a855f7" strokeWidth={2} dot={false} name="actual" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                  dot={(props: any) => { const d = props as unknown as Record<string, unknown>; return d.value !== null ? <circle cx={Number(d.cx)} cy={Number(d.cy)} r={4} fill="white" stroke="#f59e0b" strokeWidth={2} /> : <g />; }}
                  name="predicted" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>📐 Senaryo Analizi (5 Yıl)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(239,68,68,0.08)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>📉 Kötümser (×0.8)</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatValue(predKPIs.forecastProduction * 0.8)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {((predKPIs.forecastProduction * 0.8 / predKPIs.currentProduction - 1) * 100).toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(59,130,246,0.08)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, marginBottom: '8px' }}>📊 Baz Senaryo</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatValue(predKPIs.forecastProduction)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {predKPIs.prodChange >= 0 ? '+' : ''}{predKPIs.prodChange.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>📈 İyimser (×1.2)</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatValue(predKPIs.forecastProduction * 1.2)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {((predKPIs.forecastProduction * 1.2 / predKPIs.currentProduction - 1) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.05)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <strong>⚠️ Model Notu:</strong> Doğrusal regresyon (OLS) • R² = {predKPIs.r2Production.toFixed(3)} • Tahminler geçmiş trendlere dayalıdır • İklim/politika değişkenlikleri dahil değil
        </div>
      </>)}
    </div>
  );
}
