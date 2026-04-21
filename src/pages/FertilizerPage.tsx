import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, AreaChart, Area, ComposedChart, Line, Scatter,
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Target, Award, AlertTriangle, Layers, BarChart2, Activity, Zap, Scale } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { IntelligenceAlert } from '../utils/intelligenceCalculations';
import {
  useFertilizerData, formatTon, formatUSD, formatShort, CHART_COLORS,
} from './fertilizer/useFertilizerData';
import type { Tab } from './fertilizer/useFertilizerData';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍' },
  { id: 'trade', label: 'Ticaret Dengesi', icon: '⚖️' },
  { id: 'concentration', label: 'Pazar Yoğunluğu', icon: '🏆' },
  { id: 'turkey', label: 'Türkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'Akıllı Analiz', icon: '🧠' },
];

export default function FertilizerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    loading,
    overviewKPIs, overviewByType, overviewTopCountries, overviewTrend, overviewInsights,
    tradeBalance, tradeTimeSeries, tradeInsights,
    concData, concHHI, concInsights,
    turkeyProfile, turkeyTrends, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  } = useFertilizerData(activeTab);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌱 Gübre Ticareti Analizi</h1>
        <p className="page-subtitle">FAO gübre ticareti — akıllı analiz motoru</p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
            fontWeight: activeTab === tab.id ? '700' : '500',
            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Analiz yükleniyor...</p></div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === 'overview' && overviewKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="DÜNYA GÜBRE İTHALATI" value={formatTon(overviewKPIs.worldTotal)} subtitle={`Yıllık: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | BBO: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="TÜRKİYE İTHALATI" value={formatTon(overviewKPIs.turkeyImport)} subtitle={`Dünya sırası: #${overviewKPIs.turkeyRank}`} icon={MapPin} color="orange" />
                <KPICard title="EN BÜYÜK İTHALATÇI" value={overviewKPIs.topImporter} subtitle="2023" icon={Award} color="blue" />
                <KPICard title="EN BÜYÜK İHRACATÇI" value={overviewKPIs.topExporter} subtitle="2023" icon={TrendingUp} color="green" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Gübre Türü Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewByType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={130} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'İthalat']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {overviewByType.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 İthalatçı Ülke</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'İthalat']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: { isTurkey: boolean }, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dünya Gübre İthalat Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Toplam']} />
                      <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* TRADE BALANCE */}
          {activeTab === 'trade' && (
            <>
              {tradeBalance.length > 0 && (
                <div className="kpi-grid">
                  <KPICard title="TOPLAM İTHALAT" value={formatTon(tradeBalance.reduce((s, b) => s + b.import, 0))} subtitle="Türkiye 2023" icon={TrendingDown} color="red" large />
                  <KPICard title="TOPLAM İHRACAT" value={formatTon(tradeBalance.reduce((s, b) => s + b.export, 0))} subtitle="Türkiye 2023" icon={TrendingUp} color="green" />
                  <KPICard title="TİCARET AÇIĞI" value={formatTon(tradeBalance.reduce((s, b) => s + b.balance, 0))} subtitle="İthalat — İhracat" icon={Scale} color="orange" />
                  <KPICard title="GÜBRE TÜRÜ" value={String(tradeBalance.length)} subtitle="İzlenen" icon={Layers} color="blue" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Türkiye Gübre Ticaret Dengesi (Tür Bazlı)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={tradeBalance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="import" name="İthalat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="export" name="İhracat" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {tradeTimeSeries.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Türkiye Gübre Ticareti Zaman Serisi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={tradeTimeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Area type="monotone" dataKey="import" name="İthalat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="export" name="İhracat" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Line type="monotone" dataKey="balance" name="Açık" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={tradeInsights} />
            </>
          )}

          {/* CONCENTRATION */}
          {activeTab === 'concentration' && (
            <>
              {concHHI && (
                <div className="kpi-grid">
                  <KPICard title="HHI ENDEKSİ" value={concHHI.hhi.toFixed(0)} subtitle={`Konsantrasyon: ${concHHI.concentration === 'HIGH' ? 'Yüksek' : concHHI.concentration === 'MODERATE' ? 'Orta' : 'Düşük'}`} icon={BarChart2} color="purple" large />
                  <KPICard title="İLK 1 PAYI" value={`%${concHHI.top1Share.toFixed(1)}`} subtitle="En büyük ihracatçı" icon={Award} color="orange" />
                  <KPICard title="İLK 3 PAYI" value={`%${concHHI.top3Share.toFixed(1)}`} subtitle="İlk 3 ülke" icon={Layers} color="blue" />
                  <KPICard title="ETKİN RAKİP" value={concHHI.effectiveCompetitors.toFixed(1)} subtitle="Efektif sayı" icon={Activity} color="green" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Gübre İhracatı — Ülke Sıralaması</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={concData.slice(0, 25)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'İhracat']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {concData.slice(0, 25).map((c: { isTurkey: boolean }, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={concInsights} />
            </>
          )}

          {/* TURKEY PROFILE */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TOPLAM İTHALAT" value={formatTon(turkeyProfile.totalImp)} subtitle={`BBO: %${turkeyProfile.impCAGR.toFixed(2)}`} icon={TrendingDown} color="red" large />
                <KPICard title="TOPLAM İHRACAT" value={formatTon(turkeyProfile.totalExp)} subtitle="2023" icon={TrendingUp} color="green" />
                <KPICard title="İTHALAT DEĞERİ" value={formatUSD(turkeyProfile.totalImpVal * 1000)} subtitle="2023 USD" icon={Target} color="blue" />
                <KPICard title="TİCARET ORANI" value={`${turkeyProfile.tradeRatio.toFixed(1)}x`} subtitle="İthalat / İhracat" icon={Scale} color={turkeyProfile.tradeRatio > 3 ? 'red' : 'orange'} />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Gübre Ticareti (Ürün Bazlı)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={turkeyProfile.byProduct} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={130} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="import" name="İthalat" fill="#ef4444" />
                      <Bar dataKey="export" name="İhracat" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Gübre Trendi (2000+)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="import" name="İthalat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                      <Line type="monotone" dataKey="export" name="İhracat" stroke="#22c55e" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={turkeyInsights} />
            </>
          )}

          {/* FORECAST */}
          {activeTab === 'forecast' && forecastData && (
            <>
              <div className="kpi-grid">
                <KPICard title="TÜRKİYE BBO" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.turkeyR2?.toFixed(3) || '0'}`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'green' : 'red'} large />
                <KPICard title="DÜNYA BBO" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="OYNAKLIK" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Türkiye" icon={Activity} color="purple" />
                <KPICard title="ANOMALİ" value={String(forecastData.anomalyCount || 0)} subtitle="Sapma sayısı" icon={AlertTriangle} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Türkiye Gübre İthalatı — Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatTon(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gerçek" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#8b5cf6" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                      <Scatter dataKey="anomaly" name="Anomali" fill="#ef4444" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={forecastInsights} />
            </>
          )}

          {/* INTELLIGENCE ALERTS */}
          {activeTab === 'alerts' && (
            <>
              <div className="kpi-grid">
                <KPICard title="TOPLAM UYARI" value={String(intelligenceAlerts.length)} subtitle="Otomatik tespit" icon={Zap} color="purple" large />
                <KPICard title="KRİTİK" value={String(intelligenceAlerts.filter(a => a.severity === 'critical').length)} subtitle="Acil" icon={AlertTriangle} color="red" />
                <KPICard title="UYARI" value={String(intelligenceAlerts.filter(a => a.severity === 'warning').length)} subtitle="İzlenmeli" icon={Activity} color="orange" />
                <KPICard title="POZİTİF" value={String(intelligenceAlerts.filter(a => a.severity === 'positive').length)} subtitle="Gelişim" icon={TrendingUp} color="green" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {intelligenceAlerts.map((alert: IntelligenceAlert) => {
                  const severityColors: Record<string, { bg: string; border: string; icon: string }> = {
                    critical: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '🔴' },
                    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '⚠️' },
                    positive: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', icon: '🟢' },
                    info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: '💡' },
                  };
                  const colors = severityColors[alert.severity] || severityColors.info;
                  return (
                    <div key={alert.id} style={{ padding: '16px 20px', borderRadius: '12px', background: colors.bg, border: '1px solid ' + colors.border, display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.5rem' }}>{colors.icon}</span>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{alert.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{alert.message}</div>
                        {alert.metric && <div style={{ marginTop: '6px', fontSize: '0.8rem', color: colors.border, fontWeight: '600' }}>{alert.metric}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <InsightCard insights={allInsights} />
            </>
          )}
        </>
      )}
    </div>
  );
}
