import { KademeliListe } from '../../components/ui/KademeliListe';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Line, ReferenceLine,
  ScatterChart, Scatter, ZAxis, Cell,
  LabelList,
} from 'recharts';
import { COLORS, fmt, fmtShort } from './plantTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import type { CityRow, ScatterRow, DistrictRow, YieldTrendRow } from './plantTypes';
import { VALUE_HEADROOM, compactValue, truncTick, LINE_Y_DOMAIN } from '../../utils/chartTicks';
import { BAR_COLOR, GRID, AXIS, seriesColor } from '../../utils/chartColors';
import { sayi, kisa } from '../../utils/sayi';
import { ChartCard } from '../../components/ui/Card';

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
  /*
   * Endeks: her seri KENDİ ilk dolu yılına göre 100. Üç farklı birimi
   * (ton / dekar / kg-dek) tek eksende karşılaştırmanın tek dürüst yolu.
   * Ham değerler `ham_*` alanlarında duruyor, ipucunda gösteriliyor.
   */
  const endeksVerisi = (() => {
    const ilk = (alan: keyof YieldTrendRow) =>
      yieldTrendData.find((r) => Number(r[alan]) > 0)?.[alan] as number | undefined;
    const t0 = { uretim: ilk('uretim'), alan: ilk('alan'), verim: ilk('verim') };
    return yieldTrendData.map((r) => ({
      year: r.year,
      uretim: t0.uretim ? (r.uretim / t0.uretim) * 100 : 0,
      alan: t0.alan ? (r.alan / t0.alan) * 100 : 0,
      verim: t0.verim ? (r.verim / t0.verim) * 100 : 0,
      ham_uretim: r.uretim, ham_alan: r.alan, ham_verim: r.verim,
    }));
  })();

  return (
    <>
      {/* ─── Grafik 6: Scatter — Alan vs Üretim vs Verim ─── */}
      {scatterData.length > 0 && (
        <div className="chart-grid">
          <ChartCard title={<>Alan – Üretim – Verim İlişkisi ({selectedYear})</>} span={2} action={<ChartInsightButton title="Alan–Üretim–Verim" description="Scatter: alan vs üretim vs verim" data={scatterData} context={{ section: 'Analiz' }} compact />}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 8px 0' }}>
              X: Ekilen Alan (Dekar) — Y: Üretim (Ton) — Nokta Boyutu: Verim (Kg/Dekar)
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="area" name="Ekilen Alan" unit=" dek"
                  tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="number" dataKey="production" name="Üretim" unit=" ton"
                  tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
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
                  {scatterData.map((_, i) => <Cell key={i} fill={seriesColor(i)} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ─── Grafik 7: İlçe Detayı ─── */}
      {selectedProvince && districtData.length > 0 && (
        <div className="chart-grid">
          <ChartCard title={<>{selectedProvince} İlçe Detayı ({selectedYear})</>} span={2} action={<ChartInsightButton title="İlçe Detayı" description="İlçe bazında detay" data={districtData} context={{ section: 'Analiz' }} compact />}>
            <ResponsiveContainer width="100%" height={Math.max(250, districtData.length * 30)}>
              <BarChart data={districtData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={VALUE_HEADROOM} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={truncTick} interval={0} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                  {districtData.map((_, i) => <Cell key={i} fill={BAR_COLOR} />)}
                
                <LabelList dataKey="value" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ─── Grafik 8 & 9: Treemap + Radar ─── */}
      {cityData.length > 0 && (
        <div className="chart-grid">
          <ChartCard title="Üretim Yoğunlaşması" action={<ChartInsightButton title="Üretim Yoğunlaşması" description="Üretim yoğunlaşma analizi" data={cityData} context={{ section: 'Analiz' }} compact />}>
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
                        style={{ fill: seriesColor(idx), stroke: 'var(--bg-card)', strokeWidth: 2 }} />
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
          </ChartCard>

          {radarData.length > 0 && (
            <ChartCard title="Top İller — Çoklu Yıl Karşılaşması" action={<ChartInsightButton title="Top İller" description="Çoklu yıl karşılaştirması" data={cityData} context={{ section: 'Analiz' }} compact />}>
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
            </ChartCard>
          )}
        </div>
      )}

      {/* ─── Grafik 10 & 11: Üretim-Alan-Verim + Decomposition ─── */}
      {yieldTrendData.length > 0 && (
        <div className="chart-grid">
          <ChartCard title="Üretim–Alan–Verim Trendi (ilk yıl = 100)" action={<ChartInsightButton title="Üretim-Alan-Verim Trendi" description="Trend analizi" data={yieldTrendData} context={{ section: 'Analiz' }} compact />}>
            {/*
              * ÜÇ AYRI Y EKSENİ KALDIRILDI, ENDEKSE GEÇİLDİ.
              *
              * Burada üretim (ton), alan (dekar) ve verim (kg/dek) üç farklı
              * ölçekte üst üste çiziliyordu. İki (hele üç) eksen, çizgileri
              * istediğin yerde kesiştirmene izin verir — kesişimin hiçbir
              * anlamı yoktur, eksen aralığını değiştirince kaybolur. Okuyucu
              * bunu bilmez, kesişimi olay sanar.
              *
              * Üstelik bu üçlü çarpımsal ilişkili: üretim ≈ alan × verim.
              * Okuyucunun sorusu "üretim alandan mı verimden mi arttı" — buna
              * cevap veren şey mutlak değer değil, ORANSAL değişim. Üçü de ilk
              * yıla göre endekslendi: tek eksen, doğrudan karşılaştırılabilir
              * eğriler, ve %100 çizgisi başlangıcı işaretliyor.
              */}
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '8px' }}>
              Üç seri de {endeksVerisi[0]?.year ?? 'ilk'} yılına göre endeksli (100 = başlangıç).
              Mutlak değerler için ipucuna bakın.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={endeksVerisi}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="year" tick={{ fill: AXIS, fontSize: 9 }} />
                <YAxis tick={{ fill: AXIS, fontSize: 9 }} width={46}
                  tickFormatter={(v: number) => sayi(v)} domain={LINE_Y_DOMAIN} />
                <ReferenceLine y={100} stroke={AXIS} strokeDasharray="4 4" />
                <Tooltip formatter={(v: number, name: string, p: { payload?: Record<string, number> }) => {
                  const ham = p?.payload?.[`ham_${name}`];
                  const birim = name === 'uretim' ? 'ton' : name === 'alan' ? 'dekar' : 'kg/dek';
                  const ad = name === 'uretim' ? 'Üretim' : name === 'alan' ? 'Ekilen Alan' : 'Verim';
                  return [`${sayi(v, 1)}  (${ham !== undefined ? kisa(ham) : '—'} ${birim})`, ad];
                }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="uretim" name="Üretim" stroke={seriesColor(0)} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="alan" name="Alan" stroke={seriesColor(1)} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="verim" name="Verim" stroke={seriesColor(2)} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Üretim Artışı Kaynağı" action={<ChartInsightButton title="Üretim Artışı Kaynağı" description="Alan ve verim kaynaklı artış analizi" data={yieldTrendData} context={{ section: 'Analiz' }} compact />}>
            {(() => {
              const hasDecomposition = yieldTrendData.some(d =>
                (d.alanEtkisi && Math.abs(d.alanEtkisi) > 0.01) ||
                (d.verimEtkisi && Math.abs(d.verimEtkisi) > 0.01)
              );
              return hasDecomposition ? (
                <>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '2px', lineHeight: '1.4' }}>
                    <strong>Alan Genişlemesi:</strong> Verim sabit, alan arttı • <strong>Verim Artışı:</strong> Alan sabit, verim arttı<br />
                    <strong>Sinerjik Etki:</strong> Hem alan hem verim birlikte değiştiğinde oluşan ekstra etki (ΔAlan × ΔVerim)
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={yieldTrendData.slice(1)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        tickFormatter={v => fmtShort(v)} label={{ value: 'Üretim Değişimi (ton)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} width={58} />
                      <Tooltip formatter={(v: number, name: string) => [
                        `${v >= 0 ? '+' : ''}${fmt(v)} ton`,
                        name === 'alanEtkisi' ? 'Alan Etkisi' : name === 'verimEtkisi' ? 'Verim Etkisi' : 'Sinerjik Etki'
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
                    Yıllık üretim değişimi (Alan/verim verisi mevcut değil)
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={yieldTrendData.slice(1)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                        tickFormatter={v => fmtShort(v)} label={{ value: 'Üretim Değişimi (ton)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} width={58} />
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
          </ChartCard>
        </div>
      )}

      {/* ─── Detay Tablosu ─── */}
      <div className="data-table">
        <h3 className="data-table-title">İl Sıralaması — {selectedUnsur} ({selectedYear})</h3>
        <KademeliListe ilk={5} birim="il">
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
        </KademeliListe>
        {cityData.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>Veri bulunamadı</p>
        )}
      </div>
    </>
  );
}
