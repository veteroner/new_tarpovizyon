/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line, Scatter, LineChart
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Target, Award, AlertTriangle, Layers, BarChart2, Activity, Zap } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import { SankeyDiagram } from '../components/SankeyDiagram';
import type { IntelligenceAlert } from '../utils/intelligenceCalculations';
import { useLandUseData, Tab, CHART_COLORS, formatArea, formatShort, formatPercent } from './landUse/useLandUseData';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍', desc: 'Dunya arazi kullanimi ozeti' },
  { id: 'transformation', label: 'Arazi Donusumu', icon: '🔄', desc: 'Arazi tipi degisim analizi' },
  { id: 'benchmark', label: 'Ulke Siralamasi', icon: '🏆', desc: 'Arazi verimliligi karsilastirma' },
  { id: 'turkey', label: 'Turkiye Profili', icon: '🇹🇷', desc: 'Turkiye arazi intelligence' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮', desc: 'Zaman serisi projeksiyonlari' },
  { id: 'alerts', label: 'İçgörüler', icon: '🧠', desc: 'Otomatik uyarılar ve içgörüler' },
];

export default function LandUsePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    loading,
    overviewKPIs, overviewLandTypes, overviewTopCountries, overviewTrend, overviewInsights,
    transformData, transformComparison, transformInsights,
    benchmarkData, benchmarkHHI, benchmarkInsights,
    turkeyProfile, turkeyTrends, turkeyRadar, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  } = useLandUseData(activeTab);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Arazi İçgörü Paneli</h1>
        <p className="page-subtitle">FAO arazi kullanimi - akilli analiz motoru</p>
      </div>

      {/* Tab Navigation */}
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
          {/* ==================== OVERVIEW TAB ==================== */}
          {activeTab === 'overview' && overviewKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="DUNYA TARIM ARAZISI" value={formatArea(overviewKPIs.worldAg)} subtitle={`Yıllık: ${overviewKPIs.worldYoY > 0 ? '+' : ''}${overviewKPIs.worldYoY.toFixed(2)}% | BBO: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="green" large />
                <KPICard title="TURKIYE ARAZISI" value={formatArea(overviewKPIs.turkeyAg)} subtitle={`Dunya payi: %${overviewKPIs.turkeyShare.toFixed(2)} | Sira: #${overviewKPIs.turkeyRank}`} icon={MapPin} color="orange" />
                <KPICard title="SULAMA ORANI" value={formatPercent(overviewKPIs.irrigationRate)} subtitle={`${formatArea(overviewKPIs.turkeyIrrigation)} sulanan`} icon={Target} color="blue" />
                <KPICard title="NADAS ORANI" value={formatPercent(overviewKPIs.fallowRate)} subtitle={`${formatArea(overviewKPIs.turkeyFallow)} nadas`} icon={AlertTriangle} color={overviewKPIs.fallowRate > 15 ? 'red' : 'green'} />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Dunya Arazi Turu Dagilimi (1000 ha)</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={overviewLandTypes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Alan']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {overviewLandTypes.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 Ulke - Tarim Arazisi</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Tarim Arazisi']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dunya Tarim Arazisi Trendi (1000 ha)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Tarim Arazisi']} />
                      <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* ==================== TRANSFORMATION TAB ==================== */}
          {activeTab === 'transformation' && (
            <>
              {transformComparison.length > 0 && (
                <div className="kpi-grid">
                  {transformComparison.slice(0, 4).map((tc: any, i: number) => (
                    <KPICard key={tc.name} title={tc.name.substring(0, 20).toUpperCase()} value={`${tc.changePct > 0 ? '+' : ''}${tc.changePct.toFixed(1)}%`} subtitle={`${tc.startYear} -> ${tc.endYear} | CAGR: %${tc.cagr.toFixed(2)}`} icon={tc.changePct > 0 ? TrendingUp : TrendingDown} color={tc.changePct > 0 ? 'green' : 'red'} large={i === 0} />
                  ))}
                </div>
              )}
              {transformComparison.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">🌊 Türkiye Arazi Kullanımı Dağılımı (Güncel)</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Son yıl arazi tipi dağılımı ve değişim yönü
                    </p>
                    <SankeyDiagram
                      nodes={[
                        { name: 'Türkiye Arazisi', color: '#6366f1' },
                        ...transformComparison.map((t: any) => ({
                          name: t.name as string,
                          color: (t.change as number) > 0 ? '#22c55e' : (t.change as number) < 0 ? '#ef4444' : '#f59e0b',
                        })),
                      ]}
                      links={transformComparison.map((t: any, i: number) => ({
                        source: 0,
                        target: i + 1,
                        value: Math.max(0, t.endValue as number),
                      }))}
                      height={380}
                      formatValue={v => formatArea(v)}
                    />
                  </div>
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Arazi Tipi Degisimi (2000-2022)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={transformData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatArea(v), '']} />
                      <Legend />
                      {Object.keys(transformData[0] || {}).filter(k => k !== 'year').map((key, i) => (
                        <Line key={key} type="monotone" dataKey={key} name={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {transformComparison.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Donemsel Degisim Karsilastirmasi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={transformComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                        <YAxis tickFormatter={(v) => '%' + v} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => ['%' + (v as number).toFixed(1), '']} />
                        <Bar dataKey="changePct" name="Degisim %" radius={[4, 4, 0, 0]}>
                          {transformComparison.map((tc: any, i: number) => <Cell key={i} fill={tc.changePct > 0 ? '#22c55e' : '#ef4444'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={transformInsights} />
            </>
          )}

          {/* ==================== BENCHMARK TAB ==================== */}
          {activeTab === 'benchmark' && (
            <>
              {benchmarkHHI && (
                <div className="kpi-grid">
                  <KPICard title="HHI ENDEKSI" value={benchmarkHHI.hhi.toFixed(0)} subtitle={`Konsantrasyon: ${benchmarkHHI.concentration}`} icon={BarChart2} color="purple" large />
                  <KPICard title="TOP 1 PAY" value={formatPercent(benchmarkHHI.top1Share)} subtitle="En buyuk ulke" icon={Award} color="orange" />
                  <KPICard title="TOP 3 PAY" value={formatPercent(benchmarkHHI.top3Share)} subtitle="Ilk 3 ulke toplam" icon={Layers} color="blue" />
                  <KPICard title="ETKIN REKABET" value={benchmarkHHI.effectiveCompetitors.toFixed(1)} subtitle="Efektif rakip sayisi" icon={Activity} color="green" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Tarim Arazisi - Ulke Siralamasi</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={benchmarkData.slice(0, 30)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Tarim Arazisi']} />
                      <Bar dataKey="agLand" radius={[0, 4, 4, 0]}>
                        {benchmarkData.slice(0, 30).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={benchmarkInsights} />
              <div className="data-table">
                <h3 className="data-table-title">Detayli Ulke Siralamasi</h3>
                {benchmarkData.slice(0, 30).map((c: any) => (
                  <div className="table-row" key={c.country} style={c.isTurkey ? { background: 'rgba(255, 107, 53, 0.1)', borderLeft: '3px solid #ff6b35' } : {}}>
                    <div className={'table-rank' + (c.rank <= 3 ? ' green' : '')}>{c.rank}</div>
                    <div className="table-info">
                      <div className="table-name">{c.isTurkey ? 'TR ' + c.country : c.country}</div>
                      <div className="table-subtext">{c.rawName}</div>
                    </div>
                    <div className="table-value green">{formatArea(c.agLand)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ==================== TURKEY PROFILE TAB ==================== */}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TARIM ARAZISI" value={formatArea(turkeyProfile['Tarım arazisi'] || 0)} subtitle={`Islenebilir: %${(turkeyProfile.arablePct || 0).toFixed(1)} | Mera: %${(turkeyProfile.pasturePct || 0).toFixed(1)}`} icon={Globe} color="green" large />
                <KPICard title="SULAMA ORANI" value={formatPercent(turkeyProfile.irrigationRate || 0)} subtitle={`Dunya sirasi: #${turkeyProfile.irrigationRank}`} icon={Target} color="blue" />
                <KPICard title="NADAS ORANI" value={formatPercent(turkeyProfile.fallowRate || 0)} subtitle={`${formatArea(turkeyProfile['Geçici nadas alanı'] || 0)} nadas`} icon={AlertTriangle} color={turkeyProfile.fallowRate > 15 ? 'red' : 'green'} />
                <KPICard title="ORMANLIK ALAN" value={formatArea(turkeyProfile['Orman alanı'] || 0)} subtitle="Agaclandirma trendi" icon={Layers} color="teal" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye Arazi Trendleri (2000+)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatArea(v) : 'N/A', '']} />
                      <Legend />
                      {Object.keys(turkeyTrends[0] || {}).filter(k => k !== 'year').map((key, i) => (
                        <Line key={key} type="monotone" dataKey={key} name={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye vs Dunya Ortalamasi</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={turkeyRadar} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                      <Tooltip formatter={(v: number) => [formatArea(v), '']} />
                      <Legend />
                      <Bar dataKey="turkey" name="Turkiye" fill="#ff6b35" />
                      <Bar dataKey="worldAvg" name="Dunya Ort." fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Arazi Yapisi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={[
                        { name: 'Islenebilir Arazi', value: turkeyProfile['İşlenebilir arazi'] || 0 },
                        { name: 'Sürekli çayırlar ve meralar', value: turkeyProfile['Sürekli çayırlar ve meralar'] || 0 },
                        { name: 'Cok Yillik', value: turkeyProfile['Çok yıllık ürünler'] || 0 },
                        { name: 'Nadas', value: turkeyProfile['Geçici nadas alanı'] || 0 },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => name + ' ' + ((percent || 0) * 100).toFixed(0) + '%'}>
                        {[0, 1, 2, 3].map(i => <Cell key={i} fill={CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatArea(v), 'Alan']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={turkeyInsights} />
            </>
          )}

          {/* ==================== FORECAST TAB ==================== */}
          {activeTab === 'forecast' && forecastData && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE CAGR" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.turkeyR2?.toFixed(3) || '0'} | Yillik ${forecastData.turkeySlope > 0 ? '+' : ''}${forecastData.turkeySlope?.toFixed(1) || '0'} bin ha`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'green' : 'red'} large />
                <KPICard title="DUNYA CAGR" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R2 = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="VOLATILITE" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Turkiye tarim arazisi" icon={Activity} color="purple" />
                <KPICard title="ANOMALI" value={String(forecastData.anomalyCount || 0)} subtitle="Istatistiksel sapma" icon={AlertTriangle} color="orange" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Turkiye Tarim Arazisi - Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatArea(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="turkeyHistorical" name="Turkiye (Gercek)" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="turkeyForecast" name="Turkiye (Tahmin)" stroke="#ff6b35" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                      <Scatter dataKey="anomaly" name="Anomali" fill="#ef4444" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={forecastInsights} />
            </>
          )}

          {/* ==================== INTELLIGENCE ALERTS TAB ==================== */}
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
