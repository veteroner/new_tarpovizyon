import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Line, Scatter,
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, Users, Award, AlertTriangle, Activity, Zap, MapPin, BarChart2, Home, Building2 } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { IntelligenceAlert } from '../utils/intelligenceCalculations';
import { usePopulationData, TABS, formatPop, formatShort, formatPercent } from './population/usePopulationData';
import type { Tab } from './population/usePopulationData';

export default function PopulationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    loading,
    overviewKPIs, topCountries, yearlyTrend, overviewInsights,
    urbanData, urbanTrend, urbanKPIs, urbanInsights,
    demoByCountry, demoTrend, demoKPIs, demoInsights,
    turkeyProfile, turkeyTrend, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  } = usePopulationData(activeTab);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dünya Nüfus İçgörü Paneli</h1>
        <p className="page-subtitle">FAO nufus & kentlesme analizi - akilli karar destek motoru</p>
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
        <div className="loading"><div className="loading-spinner"></div><p>İçgörü analizi yükleniyor...</p></div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === 'overview' && overviewKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="DUNYA NUFUSU" value={formatPop(overviewKPIs.worldTotal)} subtitle={`Yıllık: +${overviewKPIs.yoy.toFixed(1)}% | BBO: %${overviewKPIs.cagr.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="EN KALABALIK" value={overviewKPIs.topCountry} subtitle={formatPop(overviewKPIs.topCountryValue)} icon={Award} color="blue" />
                <KPICard title="KENTLESME" value={formatPercent(overviewKPIs.urbanRate)} subtitle="Sehirde yasayan" icon={Building2} color="teal" />
                <KPICard title="KIRSAL" value={formatPop(overviewKPIs.worldRural)} subtitle={`Kentsel: ${formatPop(overviewKPIs.worldUrban)}`} icon={Home} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Top 25 Ulke Nufusu</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={topCountries} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={100} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="urban" name="Kentsel" stackId="a" fill="#8b5cf6" />
                      <Bar dataKey="rural" name="Kirsal" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Nufus Buyume Trendi</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <AreaChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="total" name="Toplam" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="urban" name="Kentsel" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="rural" name="Kirsal" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* URBANIZATION */}
          {activeTab === 'urbanization' && urbanKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="ORT KENTLESME" value={formatPercent(urbanKPIs.avgUrban)} subtitle="Top 20 ulke" icon={Building2} color="purple" large />
                <KPICard title="EN KENTSEL" value={urbanKPIs.mostUrban} subtitle={formatPercent(urbanKPIs.mostUrbanRate)} icon={TrendingUp} color="blue" />
                <KPICard title="EN KIRSAL" value={urbanKPIs.leastUrban} subtitle={formatPercent(urbanKPIs.leastUrbanRate)} icon={Home} color="green" />
                <KPICard title="KENTLESME ARTISI" value={`+${urbanKPIs.urbanShift.toFixed(1)}pp`} subtitle="Tarihsel trend" icon={Activity} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Ulke Bazli Kentsel vs Kirsal</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={urbanData.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="urban" name="Kentsel" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rural" name="Kirsal" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Kentlesme Orani Trendi (%)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={urbanTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="urban" name="Kentsel" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="rural" name="Kirsal" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="urbanRate" name="Kentlesme Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={urbanInsights} />
            </>
          )}

          {/* DEMOGRAPHICS */}
          {activeTab === 'demographics' && demoKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="CINSIYET ORANI" value={`${demoKPIs.worldSexRatio.toFixed(1)}`} subtitle="Erkek/100 kadin" icon={Users} color="purple" large />
                <KPICard title="EN YUKSEK E/K" value={demoKPIs.highestRatio} subtitle={`${demoKPIs.highestRatioVal.toFixed(0)}/100`} icon={TrendingUp} color="red" />
                <KPICard title="EN DUSUK E/K" value={demoKPIs.lowestRatio} subtitle={`${demoKPIs.lowestRatioVal.toFixed(0)}/100`} icon={TrendingDown} color="green" />
                <KPICard title="TOPLAM" value={formatPop(demoKPIs.totalM + demoKPIs.totalF)} subtitle={`E: ${formatPop(demoKPIs.totalM)} | K: ${formatPop(demoKPIs.totalF)}`} icon={BarChart2} color="blue" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Ulke Bazli Erkek-Kadin Nufusu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={demoByCountry.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="male" name="Erkek" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="female" name="Kadin" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Cinsiyet Orani Trendi (Erkek/100 Kadin)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={demoTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[90, 110]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="female" name="Kadin" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="sexRatio" name="Cinsiyet Orani" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={demoInsights} />
            </>
          )}

          {/* TURKEY */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE NUFUSU" value={formatPop(turkeyProfile.totalNow)} subtitle={`Dunya #${turkeyProfile.rank} | CAGR: %${turkeyProfile.cagr.toFixed(2)}`} icon={MapPin} color="orange" large />
                <KPICard title="KENTSEL" value={formatPop(turkeyProfile.urbanNow)} subtitle={formatPercent(turkeyProfile.urbanRate)} icon={Building2} color="purple" />
                <KPICard title="KIRSAL" value={formatPop(turkeyProfile.ruralNow)} subtitle={formatPercent(100 - turkeyProfile.urbanRate)} icon={Home} color="green" />
                <KPICard title="DUNYA SIRASI" value={`#${turkeyProfile.rank}`} subtitle="Nufus" icon={Award} color="blue" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Nufus & Kentlesme Trendi (1960+)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={turkeyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => [name.includes('Oran') ? `%${Number(v).toFixed(1)}` : formatPop(v), name]} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="total" name="Toplam" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="urban" name="Kentsel" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="rural" name="Kirsal" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="urbanRate" name="Kentlesme Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
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
                <KPICard title="TURKIYE CAGR" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.turkeyR2?.toFixed(3) || '0'}`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'green' : 'red'} large />
                <KPICard title="DUNYA CAGR" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="VOLATILITE" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Turkiye" icon={Activity} color="purple" />
                <KPICard title="ANOMALI" value={String(forecastData.anomalyCount || 0)} subtitle="Sapma sayisi" icon={AlertTriangle} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Nufus - Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatPop(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gercek" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#ff6b35" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
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
                <KPICard title="TOPLAM ALERT" value={String(intelligenceAlerts.length)} subtitle="Otomatik tespit" icon={Zap} color="purple" large />
                <KPICard title="KRITIK" value={String(intelligenceAlerts.filter((a: IntelligenceAlert) => a.severity === 'critical').length)} subtitle="Acil" icon={AlertTriangle} color="red" />
                <KPICard title="UYARI" value={String(intelligenceAlerts.filter((a: IntelligenceAlert) => a.severity === 'warning').length)} subtitle="Izlenmeli" icon={Activity} color="orange" />
                <KPICard title="POZITIF" value={String(intelligenceAlerts.filter((a: IntelligenceAlert) => a.severity === 'positive').length)} subtitle="Gelisim" icon={TrendingUp} color="green" />
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
