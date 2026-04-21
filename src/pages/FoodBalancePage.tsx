/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, AreaChart, Area, ComposedChart, Line, Scatter
} from 'recharts';
import { Globe, TrendingUp, TrendingDown, MapPin, Target, Award, AlertTriangle, Activity, Zap, Shield, Heart, Scale, Wheat } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import { SankeyDiagram } from '../components/SankeyDiagram';
import type { IntelligenceAlert } from '../utils/intelligenceCalculations';
import {
  useFoodBalanceData, Tab, CHART_COLORS,
  formatTon, formatShort, formatPercent
} from './foodBalance/useFoodBalanceData';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Genel Bakis', icon: '🌍' },
  { id: 'security', label: 'Gida Guvenligi', icon: '🛡️' },
  { id: 'trade', label: 'Ticaret Akisi', icon: '⚖️' },
  { id: 'turkey', label: 'Turkiye Profili', icon: '🇹🇷' },
  { id: 'forecast', label: 'Trend & Tahmin', icon: '🔮' },
  { id: 'alerts', label: 'İçgörüler', icon: '🧠' },
];

export default function FoodBalancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    loading,
    overviewKPIs, overviewByProduct, overviewTopCountries, overviewTrend, overviewInsights,
    securityData, securityKPIs, securityInsights,
    tradeData, tradeTrend, tradeInsights,
    turkeyProfile, turkeyTrends, turkeyInsights,
    forecastData, forecastInsights,
    intelligenceAlerts, allInsights,
  } = useFoodBalanceData(activeTab);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gıda Dengesi İçgörü Paneli</h1>
        <p className="page-subtitle">FAO gida dengesi & guvenlik analizi - akilli karar destek motoru</p>
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
                <KPICard title="DUNYA GIDA URETIMI" value={formatTon(overviewKPIs.worldProd)} subtitle={`Yıllık: ${overviewKPIs.yoy > 0 ? '+' : ''}${overviewKPIs.yoy.toFixed(1)}% | BBO: %${overviewKPIs.worldCAGR.toFixed(2)}`} icon={Globe} color="purple" large />
                <KPICard title="EN BUYUK URETICI" value={overviewKPIs.topProducer} subtitle="2022" icon={Award} color="blue" />
                <KPICard title="ORT KALORI" value={`${overviewKPIs.avgCal.toFixed(0)} kcal`} subtitle="kisi/gun" icon={Heart} color="orange" />
                <KPICard title="IZLENEN URUN" value={String(overviewKPIs.productCount)} subtitle="Temel gida" icon={Wheat} color="green" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Gida Bazinda Uretim</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewByProduct} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Uretim']} />
                      <Bar dataKey="production" radius={[0, 4, 4, 0]}>
                        {overviewByProduct.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Top 15 Uretici Ulke</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewTopCountries.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={-50} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Uretim']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {overviewTopCountries.slice(0, 15).map((c: any, i: number) => <Cell key={i} fill={c.isTurkey ? '#ff6b35' : CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Dunya Gida Uretim Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={overviewTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), 'Uretim']} />
                      <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <InsightCard insights={overviewInsights} />
            </>
          )}

          {/* FOOD SECURITY */}
          {activeTab === 'security' && securityKPIs && (
            <>
              <div className="kpi-grid">
                <KPICard title="ORT YETERLILIK" value={formatPercent(securityKPIs.avgSufficiency)} subtitle="Turkiye ortalama" icon={Shield} color={securityKPIs.avgSufficiency >= 80 ? 'green' : 'orange'} large />
                <KPICard title="KENDINE YETERLI" value={`${securityKPIs.selfSufficient}/${securityKPIs.productCount}`} subtitle="Fazla uretim" icon={Award} color="green" />
                <KPICard title="BAGIMLI URUN" value={String(securityKPIs.dependent)} subtitle="%80 altinda" icon={AlertTriangle} color="red" />
                <KPICard title="IZLENEN" value={String(securityKPIs.productCount)} subtitle="Gida urunu" icon={Target} color="blue" />
              </div>
              {securityData.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Turkiye Gida Kendine Yeterlilik Orani (%)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={securityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" domain={[0, 'dataMax']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                        <Tooltip formatter={(v: number) => [`%${Number(v).toFixed(1)}`, 'Yeterlilik']} />
                        <Bar dataKey="sufficiency" radius={[0, 4, 4, 0]}>
                          {securityData.map((d: any, i: number) => <Cell key={i} fill={d.sufficiencyColor} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                      {[{ color: '#22c55e', label: 'Kendine Yeterli (>%100)' }, { color: '#f59e0b', label: 'Yakin (%80-100)' }, { color: '#f97316', label: 'Kismi (%50-80)' }, { color: '#ef4444', label: 'Bagimli (<%50)' }].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color }}></div>{l.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {securityData.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Uretim vs Ithalat vs Ihracat (Turkiye)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={securityData.filter((d: any) => d.production > 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Bar dataKey="production" name="Uretim" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="imports" name="Ithalat" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="exports" name="Ihracat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <InsightCard insights={securityInsights} />
            </>
          )}

          {/* TRADE */}
          {activeTab === 'trade' && (
            <>
              {tradeData.length > 0 && (
                <div className="kpi-grid">
                  <KPICard title="TOPLAM ITHALAT" value={formatTon(tradeData.reduce((s: number, t: any) => s + t.imports, 0))} subtitle="2022" icon={TrendingDown} color="red" large />
                  <KPICard title="TOPLAM IHRACAT" value={formatTon(tradeData.reduce((s: number, t: any) => s + t.exports, 0))} subtitle="2022" icon={TrendingUp} color="green" />
                  <KPICard title="NET IHRACATCI" value={String(tradeData.filter((t: any) => t.netExporter).length)} subtitle="urunde" icon={Award} color="blue" />
                  <KPICard title="NET ITHALATCI" value={String(tradeData.filter((t: any) => !t.netExporter).length)} subtitle="urunde" icon={Scale} color="orange" />
                </div>
              )}
              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Gida Bazinda Ithalat vs Ihracat</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={tradeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="imports" name="Ithalat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="exports" name="Ihracat" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {tradeTrend.length > 0 && (
                <div className="chart-grid">
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Dunya Gida Ticareti Trendi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={tradeTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                        <Legend />
                        <Area type="monotone" dataKey="production" name="Uretim" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                        <Line type="monotone" dataKey="imports" name="Ithalat" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="exports" name="Ihracat" stroke="#ef4444" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {tradeData.length > 0 && (() => {
                const totalProd = tradeData.reduce((s: number, t: any) => s + (t.production || 0), 0);
                const totalImp = tradeData.reduce((s: number, t: any) => s + (t.imports || 0), 0);
                const totalExp = tradeData.reduce((s: number, t: any) => s + (t.exports || 0), 0);
                const totalDom = Math.max(0, totalProd + totalImp - totalExp);
                const sankeyNodes = [
                  { name: 'Üretim', color: '#22c55e' },
                  { name: 'İthalat', color: '#3b82f6' },
                  { name: 'Toplam Arz', color: '#6366f1' },
                  { name: 'İç Tüketim', color: '#f59e0b' },
                  { name: 'İhracat', color: '#ef4444' },
                ];
                const sankeyLinks = [
                  { source: 0, target: 2, value: totalProd },
                  { source: 1, target: 2, value: totalImp },
                  { source: 2, target: 3, value: totalDom },
                  { source: 2, target: 4, value: totalExp },
                ];
                return (
                  <div className="chart-grid">
                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                      <h3 className="chart-title">⚖️ Gıda Arz-Kullanım Akış Diyagramı</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        Dünya gıda üretimi ve ticaretinin arz→kullanım dağılımı (bin ton)
                      </p>
                      <SankeyDiagram
                        nodes={sankeyNodes}
                        links={sankeyLinks}
                        height={320}
                        formatValue={v => formatTon(v)}
                      />
                    </div>
                  </div>
                );
              })()}
              <InsightCard insights={tradeInsights} />
            </>
          )}
          {activeTab === 'turkey' && turkeyProfile && (
            <>
              <div className="kpi-grid">
                <KPICard title="TURKIYE URETIMI" value={formatTon(turkeyProfile.totalProd)} subtitle={`CAGR: %${turkeyProfile.cagr.toFixed(2)} | Dunya #${turkeyProfile.worldRank}`} icon={MapPin} color="orange" large />
                <KPICard title="ITHALAT" value={formatTon(turkeyProfile.totalImp)} subtitle="2022" icon={TrendingDown} color="red" />
                <KPICard title="IHRACAT" value={formatTon(turkeyProfile.totalExp)} subtitle="2022" icon={TrendingUp} color="green" />
                <KPICard title="ORT KALORI" value={`${turkeyProfile.avgCal.toFixed(0)} kcal`} subtitle="kisi/gun" icon={Heart} color="purple" />
              </div>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye Urun Bazli Uretim</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={turkeyProfile.products} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Bar dataKey="production" name="Uretim" fill="#22c55e" />
                      <Bar dataKey="imports" name="Ithalat" fill="#3b82f6" />
                      <Bar dataKey="exports" name="Ihracat" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3 className="chart-title">Turkiye Gida Uretim Trendi (2000+)</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={turkeyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatTon(v), '']} />
                      <Legend />
                      <Area type="monotone" dataKey="production" name="Uretim" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                      <Line type="monotone" dataKey="imports" name="Ithalat" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="exports" name="Ihracat" stroke="#ef4444" strokeWidth={2} />
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
                  <h3 className="chart-title">Turkiye Gida Uretimi - Tahmin Projeksiyonu</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={forecastData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={formatShort} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v ? formatTon(v) : '-', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="historical" name="Gercek" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Tahmin" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} connectNulls dot={{ r: 4 }} />
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
                <KPICard title="KRITIK" value={String(intelligenceAlerts.filter(a => a.severity === 'critical').length)} subtitle="Gida Guvenligi" icon={AlertTriangle} color="red" />
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
