import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line, Scatter
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, Users, Award, AlertTriangle, Activity, Zap, MapPin, Target, BarChart2, UserCheck } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { IntelligenceAlert } from '../utils/intelligenceCalculations';
import {
  useAgriculturalEmploymentData, TABS, formatPop, formatShort, formatPercent
} from './agriculturalEmployment/useAgriculturalEmploymentData';
import type { Tab } from './agriculturalEmployment/useAgriculturalEmploymentData';

export default function AgriculturalEmploymentPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    loading,
    overviewKPIs, topCountries, yearlyTrend, overviewInsights,
    genderByCountry, genderTrend, genderKPIs, genderInsights,
    concentrationData, concentrationInsights,
    turkeyProfile, turkeyTrend, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  } = useAgriculturalEmploymentData(activeTab);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tarım İstihdamı İçgörü Paneli</h1>
        <p className="page-subtitle">FAO tarim istihdami &amp; cinsiyet analizi - akilli karar destek motoru</p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
            fontWeight: activeTab === tab.id ? '700' : '500',
            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
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
                <KPICard title="DUNYA TARIM ISTIHDAMI" value={formatPop(overviewKPIs.worldTotal)} subtitle={`Yıllık: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | BBO: %${overviewKPIs.cagr.toFixed(2)}`} icon={Users} color="purple" large />
                <KPICard title="EN BUYUK" value={overviewKPIs.topCountry} subtitle={formatPop(overviewKPIs.topCountryValue)} icon={Award} color="blue" />
                <KPICard title="KADIN PAYI" value={formatPercent(overviewKPIs.femaleShare)} subtitle="Dunya ortalama" icon={UserCheck} color="teal" />
                <KPICard title="ERKEK" value={formatPop(overviewKPIs.worldMale)} subtitle={`Kadin: ${formatPop(overviewKPIs.worldFemale)}`} icon={BarChart2} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Top 20 Ulke - Tarim Istihdami</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topCountries.slice(0, 20)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={110} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Bar dataKey="male" name="Erkek" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="female" name="Kadin" stackId="a" fill="#ec4899" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Yillik Istihdam Trendi</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatPop(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="total" name="Toplam" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="female" name="Kadin" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* GENDER */}
          {activeTab === 'gender' && genderKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="ORT KADIN ORANI" value={formatPercent(genderKPIs.avgFemaleRatio)} subtitle="Top 20 ulke" icon={UserCheck} color="teal" large />
                <KPICard title="EN YUKSEK" value={genderKPIs.highestFemale} subtitle="Kadin payi" icon={TrendingUp} color="green" />
                <KPICard title="EN DUSUK" value={genderKPIs.lowestFemale} subtitle="Kadin payi" icon={TrendingDown} color="red" />
                <KPICard title="SON 10 YIL" value={`${genderKPIs.recentTrend > 0 ? '+' : ''}${genderKPIs.recentTrend.toFixed(1)}pp`} subtitle="Kadin payi degisimi" icon={Activity} color="purple" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Ulke Bazli Erkek-Kadin Istihdami</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={genderByCountry.slice(0, 15)}>
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
                  <h3 className="chart-title">Kadin Istihdam Orani Trendi (%)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={genderTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="male" name="Erkek" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      <Area yAxisId="left" type="monotone" dataKey="female" name="Kadin" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                      <Line yAxisId="right" type="monotone" dataKey="femaleRatio" name="Kadin Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={genderInsights} />
            </>
          )}

          {/* CONCENTRATION */}
          {activeTab === 'concentration' && concentrationData && (
            <>
              <div className="kpi-grid">
                <KPICard title="HHI ENDEKSI" value={String((concentrationData.hhi * 10000).toFixed(0))} subtitle={concentrationData.hhi > 0.25 ? 'Yuksek yogunlasma' : concentrationData.hhi > 0.15 ? 'Orta yogunlasma' : 'Dusuk yogunlasma'} icon={Target} color={concentrationData.hhi > 0.25 ? 'red' : 'blue'} large />
                <KPICard title="TOP 5 PAYI" value={formatPercent(concentrationData.top5Share)} subtitle="Ilk 5 ulke" icon={Award} color="purple" />
                <KPICard title="TOP 10 PAYI" value={formatPercent(concentrationData.top10Share)} subtitle="Ilk 10 ulke" icon={BarChart2} color="orange" />
                <KPICard title="ULKE SAYISI" value={String(concentrationData.countryCount)} subtitle="Aktif istihdam" icon={Globe} color="green" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Istihdam Pazar Payi Dagilimi</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={concentrationData.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} dataKey="value" label={({ name, share }: any) => `${name} ${share}%`} labelLine={false}>
                        {concentrationData.pieData.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatPop(v), 'Istihdam']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">HHI &amp; Top 5 Payi Tarihsel</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={concentrationData.hhiHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="hhi" name="HHI" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="top5" name="Top 5 Pay (%)" stroke="#f59e0b" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={concentrationInsights} />
            </>
          )}

          {/* TURKEY */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE ISTIHDAMI" value={formatPop(turkeyProfile.totalNow)} subtitle={`Dunya #${turkeyProfile.rank} | CAGR: %${turkeyProfile.cagr.toFixed(2)}`} icon={MapPin} color="orange" large />
                <KPICard title="ERKEK" value={formatPop(turkeyProfile.maleNow)} subtitle="2022" icon={Users} color="blue" />
                <KPICard title="KADIN" value={formatPop(turkeyProfile.femaleNow)} subtitle={`%${turkeyProfile.femaleRatio.toFixed(1)}`} icon={UserCheck} color="teal" />
                <KPICard title="DUNYA SIRASI" value={`#${turkeyProfile.rank}`} subtitle="Tarim istihdami" icon={Award} color="purple" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Tarim Istihdami Trendi</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={turkeyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => [name.includes('Oran') ? `%${Number(v).toFixed(1)}` : formatPop(v), name]} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="total" name="Toplam" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} />
                      <Bar yAxisId="left" dataKey="male" name="Erkek" fill="#3b82f6" opacity={0.6} />
                      <Bar yAxisId="left" dataKey="female" name="Kadin" fill="#ec4899" opacity={0.6} />
                      <Line yAxisId="right" type="monotone" dataKey="femaleRatio" name="Kadin Oran (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
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
                  <h3 className="chart-title">Turkiye Istihdam - Tahmin Projeksiyonu</h3>
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

          {/* INTELLIGENCE */}
          {activeTab === 'alerts' && (
            <>
              <div className="kpi-grid">
                <KPICard title="TOPLAM ALERT" value={String(intelligenceAlerts.length)} subtitle="Otomatik tespit" icon={Zap} color="purple" large />
                <KPICard title="KRITIK" value={String(intelligenceAlerts.filter(a => a.severity === 'critical').length)} subtitle="Acil dikkat" icon={AlertTriangle} color="red" />
                <KPICard title="UYARI" value={String(intelligenceAlerts.filter(a => a.severity === 'warning').length)} subtitle="Izlenmeli" icon={Activity} color="orange" />
                <KPICard title="POZITIF" value={String(intelligenceAlerts.filter(a => a.severity === 'positive').length)} subtitle="Gelisim" icon={TrendingUp} color="green" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {intelligenceAlerts.map((alert: IntelligenceAlert) => {
                  const severityColors: Record<string, { bg: string; border: string; icon: string }> = {
                    critical: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '🔴' },
                    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '⚠️' },
                    positive: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', icon: '🟢' },
                    info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: '💡' }
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
