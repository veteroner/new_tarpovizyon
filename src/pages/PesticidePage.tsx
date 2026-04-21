import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line, Scatter,
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Award, AlertTriangle, Layers, BarChart2, Activity, Zap, Bug, Leaf, Droplets, Target } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import type { IntelligenceAlert } from '../utils/intelligenceCalculations';
import { usePesticideData, TABS, CHART_COLORS, formatTon, formatKgHa, formatShort } from './pesticide/usePesticideData';
import type { Tab } from './pesticide/usePesticideData';

export default function PesticidePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    loading,
    overviewKPIs, overviewByType, overviewTopCountries, overviewTrend, overviewInsights,
    compData, compTrends, compInsights,
    concData, concHHI, concInsights,
    turkeyProfile, turkeyTrends, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  } = usePesticideData(activeTab);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌿 Pestisit Analizi</h1>
        <p className="page-subtitle">FAO pestisit kullanımı — akıllı analiz motoru</p>
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
                <KPICard title="DÜNYA PESTİSİT KULLANIMI" value={formatTon(overviewKPIs.worldTotal)} subtitle={`Yıllık: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | BBO: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="TÜRKİYE KULLANIMI" value={formatTon(overviewKPIs.turkeyUsage)} subtitle={`Dünya sırası: #${overviewKPIs.turkeyRank}`} icon={MapPin} color="orange" />
                <KPICard title="EN BÜYÜK KULLANICI" value={overviewKPIs.topUser} subtitle="2021" icon={Award} color="blue" />
                <KPICard title="PESTİSİT TÜRÜ" value={String(overviewKPIs.typeCount)} subtitle="Aktif tür" icon={Bug} color="red" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Pestisit Tür Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={overviewByType} cx="50%" cy="50%" outerRadius={100} innerRadius={40} dataKey="value" label={({ name, percent }) => `${(name || '').substring(0, 12)} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {overviewByType.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 Pestisit Kullanıcısı Ülke</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: { isTurkey: boolean }, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dünya Pestisit Kullanım Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Toplam']} />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* COMPOSITION */}
          {activeTab === 'composition' && (
            <>
              {compData.length > 0 && (
                <div className="kpi-grid">
                  {compData.slice(0, 4).map((type: { name: string; countries: { country: string; value: number }[] }, i: number) => {
                    const total = type.countries.reduce((s: number, c: { value: number }) => s + c.value, 0);
                    return (
                      <KPICard key={type.name} title={type.name.toUpperCase()} value={formatTon(total)} subtitle={`Lider: ${type.countries[0]?.country || '-'}`} icon={([Bug, Leaf, Droplets, Target] as const)[i] || Bug} color={(['purple', 'green', 'blue', 'orange'] as const)[i % 4]} />
                    );
                  })}
                </div>
              )}
              {compTrends.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Pestisit Alt Tür Trendleri (2000+)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={compTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Area type="monotone" dataKey="Herbisitler" name="Herbisitler" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="İnsektisitler" name="İnsektisitler" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="Fungisitler ve Bakterisitler" name="Fungisitler" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="Rodentisitler" name="Rodentisitler" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={compInsights} />
            </>
          )}

          {/* CONCENTRATION */}
          {activeTab === 'concentration' && (
            <>
              {concHHI && (
                <div className="kpi-grid">
                  <KPICard title="HHI ENDEKSİ" value={concHHI.hhi.toFixed(0)} subtitle={`Konsantrasyon: ${concHHI.concentration === 'HIGH' ? 'Yüksek' : concHHI.concentration === 'MODERATE' ? 'Orta' : 'Düşük'}`} icon={BarChart2} color="purple" large />
                  <KPICard title="İLK 1 PAYI" value={`%${concHHI.top1Share.toFixed(1)}`} subtitle={concData[0]?.country || '-'} icon={Award} color="orange" />
                  <KPICard title="İLK 3 PAYI" value={`%${concHHI.top3Share.toFixed(1)}`} subtitle="İlk 3 ülke" icon={Layers} color="blue" />
                  <KPICard title="ETKİN RAKİP" value={concHHI.effectiveCompetitors.toFixed(1)} subtitle="Efektif sayı" icon={Activity} color="green" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Pestisit Kullanımı — Ülke Sıralaması</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={concData.slice(0, 25)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="country" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
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
                <KPICard title="TOPLAM PESTİSİT" value={formatTon(turkeyProfile.totalUsage)} subtitle={`BBO: %${turkeyProfile.cagr.toFixed(2)}`} icon={Bug} color="red" large />
                <KPICard title="YOĞUNLUK" value={formatKgHa(turkeyProfile.kgHa)} subtitle="kg/ha" icon={Droplets} color="purple" />
                <KPICard title="DÜNYA ORTALAMASI" value={formatTon(turkeyProfile.worldAvg)} subtitle="Ülke ort." icon={Globe} color="blue" />
                <KPICard title="TREND YÖNÜ" value={turkeyProfile.direction === 'up' ? 'Artış' : turkeyProfile.direction === 'down' ? 'Düşüş' : 'Stabil'} subtitle={`%${Math.abs(turkeyProfile.vsWorldAvg).toFixed(0)} ${turkeyProfile.vsWorldAvg > 0 ? 'üzerinde' : 'altında'}`} icon={turkeyProfile.direction === 'up' ? TrendingUp : TrendingDown} color={turkeyProfile.direction === 'up' ? 'orange' : 'green'} />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Pestisit Kompozisyonu</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={turkeyProfile.composition} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={160} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Kullanım']} />
                      <Bar dataKey="tonaj" radius={[0, 4, 4, 0]}>
                        {turkeyProfile.composition.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Türkiye Pestisit Trendi (2000+)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Toplam']} />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    </AreaChart>
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
                <KPICard title="TÜRKİYE BBO" value={`%${forecastData.turkeyTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.turkeyR2?.toFixed(3) || '0'}`} icon={forecastData.turkeyTrend?.direction === 'up' ? TrendingUp : TrendingDown} color={forecastData.turkeyTrend?.direction === 'up' ? 'orange' : 'green'} large />
                <KPICard title="DÜNYA BBO" value={`%${forecastData.worldTrend?.cagr?.toFixed(2) || '0'}`} subtitle={`R² = ${forecastData.worldR2?.toFixed(3) || '0'}`} icon={Globe} color="blue" />
                <KPICard title="OYNAKLIK" value={`%${forecastData.turkeyTrend?.volatility?.toFixed(1) || '0'}`} subtitle="Türkiye" icon={Activity} color="purple" />
                <KPICard title="ANOMALİ" value={String(forecastData.anomalyCount || 0)} subtitle="Sapma sayısı" icon={AlertTriangle} color="red" />
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Türkiye Pestisit Kullanımı — Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatTon(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gerçek" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
                      <Scatter dataKey="anomaly" name="Anomali" fill="#f59e0b" />
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
                <KPICard title="KRİTİK" value={String(intelligenceAlerts.filter((a: IntelligenceAlert) => a.severity === 'critical').length)} subtitle="Acil" icon={AlertTriangle} color="red" />
                <KPICard title="UYARI" value={String(intelligenceAlerts.filter((a: IntelligenceAlert) => a.severity === 'warning').length)} subtitle="İzlenmeli" icon={Activity} color="orange" />
                <KPICard title="POZİTİF" value={String(intelligenceAlerts.filter((a: IntelligenceAlert) => a.severity === 'positive').length)} subtitle="Gelişim" icon={TrendingUp} color="green" />
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
