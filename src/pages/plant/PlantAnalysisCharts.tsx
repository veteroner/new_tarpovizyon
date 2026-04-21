import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Line,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { COLORS, fmt, fmtShort, CityRow, ScatterRow, DistrictRow, YieldTrendRow } from './plantTypes';

interface PlantAnalysisChartsProps {
  scatterData: ScatterRow[];
  districtData: DistrictRow[];
  cityData: CityRow[];
  radarData: { il: string; [key: string]: string | number }[];
  yieldTrendData: YieldTrendRow[];
  selectedProvince: string;
  setSelectedProvince: (p: string) => void;
  selectedUnsur: string;
  currentBirim: string;
  selectedYear: number;
  radarYears: number[];
}

export default function PlantAnalysisCharts({
  scatterData, districtData, cityData, radarData, yieldTrendData,
  selectedProvince, setSelectedProvince,
  selectedUnsur, currentBirim, selectedYear, radarYears,
}: PlantAnalysisChartsProps) {
  return (
    <>
      {/* ─── Grafik 6: Scatter — Alan vs Üretim vs Verim ─── */}
      {scatterData.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <h3 className="chart-title">🔵 Alan – Üretim – Verim İlişkisi ({selectedYear})</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 8px 0' }}>
              X: Ekilen Alan (Dekar) — Y: Üretim (Ton) — Nokta Boyutu: Verim (Kg/Dekar)
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="area" name="Ekilen Alan" unit=" dek"
                  tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="number" dataKey="production" name="Üretim" unit=" ton"
                  tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <ZAxis type="number" dataKey="verim" range={[60, 600]} name="Verim" unit=" kg/dek" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as ScatterRow;
                    return (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                        <div>Ekilen Alan: {fmt(d.area)} dekar</div>
                        <div>Üretim: {fmt(d.production)} ton</div>
                        <div>Verim: {fmt(d.verim)} kg/dek</div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData} fill="#8b5cf6">
                  {scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Grafik 7: İlçe Detayı ─── */}
      {selectedProvince && districtData.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <h3 className="chart-title">🏘️ {selectedProvince} İlçe Detayı ({selectedYear})</h3>
            <ResponsiveContainer width="100%" height={Math.max(250, districtData.length * 30)}>
              <BarChart data={districtData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                  {districtData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Grafik 8 & 9: Treemap + Radar ─── */}
      {cityData.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card">
            <h3 className="chart-title">🗺️ Üretim Yoğunlaşması</h3>
            <ResponsiveContainer width="100%" height={340}>
              <Treemap
                data={cityData.slice(0, 15)}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="var(--bg-card)"
                content={({ x, y, width, height, name }: { x: number; y: number; width: number; height: number; name: string }) => {
                  const idx = cityData.findIndex(c => c.name === name);
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height}
                        style={{ fill: COLORS[idx % COLORS.length], stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                      {width > 50 && height > 25 && (
                        <text x={x + width / 2} y={y + height / 2} textAnchor="middle"
                          fill="#fff" fontSize={11} fontWeight="bold">
                          {(name || '').substring(0, 10)}
                        </text>
                      )}
                    </g>
                  );
                }}
              />
            </ResponsiveContainer>
          </div>

          {radarData.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">🎯 Top İller — Çoklu Yıl Karşılaştırması</h3>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="il" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                    tickFormatter={v => fmtShort(Number(v))} />
                  {radarYears.map((y, i) => (
                    <Radar key={y} name={String(y)} dataKey={String(y)}
                      stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15 + i * 0.1} />
                  ))}
                  <Legend />
                  <Tooltip formatter={(v: number) => [fmt(v), 'Ton']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ─── Grafik 10 & 11: Üretim-Alan-Verim + Decomposition ─── */}
      {yieldTrendData.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card">
            <h3 className="chart-title">📊 Üretim-Alan-Verim Trendi</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '8px' }}>
              🔵 Üretim (ton) | 🟢 Alan (dekar) | 🟠 Verim (kg/dek)
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={yieldTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                <YAxis yAxisId="uretim" tick={{ fill: '#3b82f6', fontSize: 9 }} tickFormatter={v => fmtShort(v)} />
                <YAxis yAxisId="alan" orientation="right" tick={{ fill: '#22c55e', fontSize: 9 }} tickFormatter={v => fmtShort(v)} />
                <YAxis yAxisId="verim" orientation="right" tick={{ fill: '#f59e0b', fontSize: 9 }} tickFormatter={v => fmtShort(v)} dx={40} />
                <Tooltip formatter={(v: number, name: string) => [
                  name === 'uretim' ? `${fmt(v)} ton` : name === 'alan' ? `${fmt(v)} dekar` : `${v.toFixed(1)} kg/dek`,
                  name === 'uretim' ? 'Üretim' : name === 'alan' ? 'Ekilen Alan' : 'Verim'
                ]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                <Line yAxisId="uretim" type="monotone" dataKey="uretim" name="Üretim" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="alan" type="monotone" dataKey="alan" name="Alan" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line yAxisId="verim" type="monotone" dataKey="verim" name="Verim" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">🧬 Üretim Artışı Kaynağı</h3>
            {(() => {
              const hasDecomposition = yieldTrendData.some(d =>
                (d.alanEtkisi && Math.abs(d.alanEtkisi) > 0.01) ||
                (d.verimEtkisi && Math.abs(d.verimEtkisi) > 0.01)
              );
              return hasDecomposition ? (
                <>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '2px', lineHeight: '1.4' }}>
                    <strong>🟩 Alan Genişlemesi:</strong> Verim sabit, alan arttı • <strong>🟨 Verim Artışı:</strong> Alan sabit, verim arttı<br />
                    <strong>🟦 Sinerjik Etki:</strong> Hem alan hem verim birlikte değiştiğinde oluşan ekstra etki (ΔAlan × ΔVerim)
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={yieldTrendData.slice(1)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        tickFormatter={v => fmtShort(v)} label={{ value: 'Üretim Değişimi (ton)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <Tooltip formatter={(v: number, name: string) => [
                        `${v >= 0 ? '+' : ''}${fmt(v)} ton`,
                        name === 'alanEtkisi' ? '🟩 Alan Etkisi' : name === 'verimEtkisi' ? '🟨 Verim Etkisi' : '🟦 Sinerjik Etki'
                      ]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="alanEtkisi" name="Alan Etkisi" stackId="a" fill="#22c55e" />
                      <Bar dataKey="verimEtkisi" name="Verim Etkisi" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="etkilesim" name="Sinerjik Etki" stackId="a" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '8px' }}>
                    📊 Yıllık üretim değişimi (Alan/verim verisi mevcut değil)
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={yieldTrendData.slice(1)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        tickFormatter={v => fmtShort(v)} label={{ value: 'Üretim Değişimi (ton)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <Tooltip formatter={(v: number) => [
                        `${v >= 0 ? '+' : ''}${fmt(v)} ton`, 'Üretim Değişimi'
                      ]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="uretimDegisimi" name="Üretim Değişimi" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── Detay Tablosu ─── */}
      <div className="data-table">
        <h3 className="data-table-title">📋 İl Sıralaması — {selectedUnsur} ({selectedYear})</h3>
        {cityData.map((city, i) => (
          <div className="table-row" key={city.name}
            style={{ cursor: 'pointer', background: selectedProvince === city.name ? 'var(--bg-hover)' : undefined }}
            onClick={() => setSelectedProvince(selectedProvince === city.name ? '' : city.name)}>
            <div className={`table-rank ${i < 3 ? 'green' : ''}`}>{i + 1}</div>
            <div className="table-info">
              <div className="table-name">{city.name}</div>
              <div className="table-subtext">Pay: %{city.share}</div>
            </div>
            <div className="table-value green">{fmt(city.value)} {currentBirim}</div>
          </div>
        ))}
        {cityData.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>Veri bulunamadı</p>
        )}
      </div>
    </>
  );
}
