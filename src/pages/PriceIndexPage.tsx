import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, ComposedChart, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, BarChart3, Thermometer } from 'lucide-react';
import {
  usePriceIndexData, formatIndex, MONTHS_SHORT, type DatasetId,
} from './priceIndex/usePriceIndexData';
import { ChartInsightButton } from '../components/ChartInsightButton';

export default function PriceIndexPage() {
  const {
    dataset, setDataset,
    selectedYear, setSelectedYear,
    selectedProduct, setSelectedProduct,
    yearOptions, productOptions,
    loading, error,
    monthlyData, yearlyData, topProducts, heatmapData, scissorData, anomalies,
    avgIndex, maxMonth, minMonth, yearChange, cagr5, volatility,
    selectedProductName, heatmapProducts, config,
  } = usePriceIndexData();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{config.title}</h1>
        <p className="page-subtitle">{config.subtitle}</p>
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Endeks Tipi</label>
          <select className="filter-select" value={dataset} onChange={e => { setDataset(e.target.value as DatasetId); setSelectedProduct(''); }}>
            <option value="TUFE">TÜFE — Tüketici Fiyat Endeksi</option>
            <option value="T-UFE">Tarım-ÜFE — Üretici Fiyat Endeksi</option>
            <option value="T-GFE">GFE — Girdi Fiyat Endeksi</option>
            <option value="FAO">FAO — Gıda Fiyat Endeksi</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Kategori / Ürün</label>
          <select className="filter-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} disabled={productOptions.length === 0}>
            {productOptions.length === 0 && <option value="">Yükleniyor…</option>}
            {productOptions.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} disabled={yearOptions.length === 0}>
            {yearOptions.length === 0 && <option value="">Yükleniyor…</option>}
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card large" style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }}>
              <div className="kpi-header">
                <span className="kpi-title">YIL ORTALAMASI</span>
                <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><Activity size={18} /></div>
              </div>
              <div className="kpi-value">{formatIndex(avgIndex)}</div>
              <div className="kpi-subtitle">{selectedProductName} · {selectedYear}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">YILLIK DEĞİŞİM</span>
                <div className={`kpi-icon ${yearChange >= 0 ? 'red' : 'green'}`}>
                  {yearChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
              </div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#ef4444' : '#22c55e' }}>
                %{yearChange >= 0 ? '+' : ''}{yearChange.toFixed(1)}
              </div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">EN YÜKSEK AY</span>
                <div className="kpi-icon orange"><Thermometer size={18} /></div>
              </div>
              <div className="kpi-value">{maxMonth.month}</div>
              <div className="kpi-subtitle">{formatIndex(maxMonth.value)} endeks</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">EN DÜŞÜK AY</span>
                <div className="kpi-icon green"><TrendingDown size={18} /></div>
              </div>
              <div className="kpi-value">{minMonth.month}</div>
              <div className="kpi-subtitle">{formatIndex(minMonth.value)} endeks</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">5 YIL BBO</span>
                <div className="kpi-icon purple"><BarChart3 size={18} /></div>
              </div>
              <div className="kpi-value" style={{ color: cagr5 >= 0 ? '#ef4444' : '#22c55e' }}>
                %{cagr5 >= 0 ? '+' : ''}{cagr5.toFixed(1)}
              </div>
              <div className="kpi-subtitle">5 yıllık bileşik büyüme</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">DALGALANMA</span>
                <div className="kpi-icon blue"><Activity size={18} /></div>
              </div>
              <div className="kpi-value">{volatility.toFixed(2)}</div>
              <div className="kpi-subtitle">Aylık std. sapma</div>
            </div>
          </div>

          {anomalies.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>
                  Anomali Tespiti — {anomalies.length} ay normalin dışında (|Z| &gt; 1.5)
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {anomalies.map((a, i) => (
                  <span key={i} style={{
                    background: a.zScore > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    color: a.zScore > 0 ? '#ef4444' : '#22c55e',
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>
                    {a.month}: {formatIndex(a.value)} (Z={a.zScore > 0 ? '+' : ''}{a.zScore.toFixed(1)})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="chart-grid">
            <div className="chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Aylık Endeks ({selectedYear})</h3>
              <ChartInsightButton title="Aylık Endeks" description="Aylık fiyat endeksi" data={monthlyData} context={{ section: 'Fiyat Endeksi' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatIndex(v), 'Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" name="Endeks" fill={config.color} radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, i) => {
                      const isAnomaly = anomalies.some(a => a.month === entry.month);
                      return <Cell key={i} fill={isAnomaly ? '#f59e0b' : config.color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Aylık Trend</h3>
              <ChartInsightButton title="Aylık Trend" description="Aylık fiyat trendi" data={monthlyData} context={{ section: 'Fiyat Endeksi' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatIndex(v), 'Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={3} dot={{ fill: config.color, r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📅 Yıllık Endeks Trendi ({yearlyData[0]?.year || '…'}–{yearlyData[yearlyData.length - 1]?.year || '…'})</h3>
              <ChartInsightButton title="Yıllık Endeks Trendi" description="Yıllık fiyat endeksi trendi" data={yearlyData} context={{ section: 'Fiyat Endeksi' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={Math.max(0, Math.floor(yearlyData.length / 12))} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatIndex(v), 'Ortalama Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="value" stroke={config.color} fill={config.color} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {scissorData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 className="chart-title" style={{ marginBottom: 0 }}>✂️ Fiyat Makası — Gıda TÜFE vs GFE (Girdi Fiyat)</h3>
                <ChartInsightButton title="Fiyat Makası" description="Gıda tüfe vs gfe girdi fiyat makası" data={scissorData} context={{ section: 'Fiyat Endeksi' }} compact />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>
                  Pozitif fark = Girdi fiyatları tüketici fiyatlarından yüksek → Çiftçi sıkışması (kırmızı bar). Çizgiler TÜFE/GFE endekslerini gösterir.
                </p>
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={scissorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={Math.max(0, Math.floor(scissorData.length / 12))} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Endeks', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}`} label={{ value: 'Fark (puan)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(v: number, name: string) => name === 'Fark (GFE-TÜFE)' ? [`${v >= 0 ? '+' : ''}${Number(v).toFixed(1)} puan`, name] : [formatIndex(Number(v)), name]} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend />
                    <ReferenceLine yAxisId="right" y={0} stroke="var(--border)" strokeDasharray="3 3" />
                    <Bar yAxisId="right" dataKey="gap" name="Fark (GFE-TÜFE)" radius={[2, 2, 0, 0]}>
                      {scissorData.map((d, i) => (
                        <Cell key={i} fill={d.gap >= 0 ? '#ef4444' : '#22c55e'} fillOpacity={0.45} />
                      ))}
                    </Bar>
                    <Line yAxisId="left" type="monotone" dataKey="tufe" name="Gıda TÜFE" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="gfe" name="GFE" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                {(() => {
                  const recent = scissorData.slice(-3);
                  const avgGap = recent.reduce((s, d) => s + d.gap, 0) / (recent.length || 1);
                  const signal = avgGap > 5
                    ? { text: 'Çiftçi Sıkışması: Girdi fiyatları tüketici fiyatlarının üzerinde', color: '#ef4444', icon: '🔴' }
                    : avgGap < -5
                      ? { text: 'Çiftçi Avantajı: Tüketici fiyatları girdi fiyatlarının üzerinde', color: '#22c55e', icon: '🟢' }
                      : { text: 'Dengeli: Girdi ve tüketici fiyatları yakın seyirde', color: '#f59e0b', icon: '🟡' };
                  return (
                    <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, background: `${signal.color}15`, border: `1px solid ${signal.color}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{signal.icon}</span>
                      <span style={{ color: signal.color, fontWeight: 600, fontSize: 13 }}>{signal.text}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 'auto' }}>
                        Son 3 yıl fark: {avgGap >= 0 ? '+' : ''}{avgGap.toFixed(1)} puan
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {topProducts.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 className="chart-title" style={{ marginBottom: 0 }}>🏆 Kategori Endeks Sıralaması ({selectedYear})</h3>
                  <ChartInsightButton title="Kategori Endeks Sıralaması" description="Kategori endeks sıralaması" data={topProducts} context={{ section: 'Fiyat Endeksi' }} compact />
                  </div>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={170} />
                    <Tooltip formatter={(v: number) => [formatIndex(v), 'Endeks']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="value" name="Endeks" radius={[0, 4, 4, 0]}>
                      {topProducts.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Yıllık Değişim Oranı (%)</h3>
                  <ChartInsightButton title="Yıllık Değişim Oranı" description="Yıllık değişim oranı (%)" data={topProducts} context={{ section: 'Fiyat Endeksi' }} compact />
                  </div>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={[...topProducts].sort((a, b) => b.change - a.change)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v: number) => `%${v.toFixed(0)}`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} width={170} />
                    <Tooltip formatter={(v: number) => [`%${Number(v).toFixed(1)}`, 'Değişim']} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="change" name="Değişim" radius={[0, 4, 4, 0]}>
                      {[...topProducts].sort((a, b) => b.change - a.change).map((entry, i) => (
                        <Cell key={i} fill={entry.change >= 0 ? '#ef4444' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {heatmapProducts.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 20 }}>
              <h3 className="chart-title">🌡️ Enflasyon Heatmap — Kategori × Ay ({selectedYear})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)', minWidth: 180 }}>Kategori</th>
                      {MONTHS_SHORT.map(m => (
                        <th key={m} style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)', minWidth: 50 }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapProducts.map(prod => {
                      const cells = heatmapData.filter(c => c.product === prod);
                      const vals = cells.map(c => c.value).filter(v => v > 0);
                      const min = vals.length ? Math.min(...vals) : 0;
                      const max = vals.length ? Math.max(...vals) : 0;
                      const range = max - min || 1;
                      return (
                        <tr key={prod} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: 500, fontSize: 10 }}>
                            {prod.length > 35 ? prod.substring(0, 35) + '…' : prod}
                          </td>
                          {MONTHS_SHORT.map((m, i) => {
                            const cell = cells.find(c => c.monthIdx === i);
                            const v = cell?.value || 0;
                            const intensity = v > 0 ? (v - min) / range : 0;
                            const bg = v > 0 ? `rgba(239, 68, 68, ${0.08 + intensity * 0.55})` : 'transparent';
                            return (
                              <td key={m} style={{
                                padding: '4px 2px', textAlign: 'center', fontWeight: 600, fontSize: 10,
                                background: bg, color: intensity > 0.5 ? '#fff' : 'var(--text-primary)', borderRadius: 2,
                              }}>
                                {v > 0 ? v.toFixed(1) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {topProducts.length > 0 && (
            <div className="data-table">
              <h3 className="data-table-title">📋 Kategori Detay Tablosu ({selectedYear})</h3>
              {topProducts.map((p, index) => (
                <div className="table-row" key={p.name}>
                  <div className={`table-rank ${index < 3 ? 'red' : ''}`}>{index + 1}</div>
                  <div className="table-info">
                    <div className="table-name">{p.name}</div>
                    <div className="table-subtext">Ortalama endeks: {formatIndex(p.value)}</div>
                  </div>
                  <div className="table-value" style={{ color: p.change >= 0 ? '#ef4444' : '#22c55e' }}>
                    {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
