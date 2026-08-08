import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, ReferenceLine, Legend,
  ScatterChart, Scatter, ZAxis,
  Sankey
} from 'recharts';
import { formatNumber, formatShort } from './tuikLivestockTypes';
import type { UseTuikLivestockDataReturn } from './useTuikLivestockData';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { ChartCard } from '../../components/ui/Card';

type Props = Pick<UseTuikLivestockDataReturn,
  | 'selectedAnimal' | 'yearLabel'
  | 'cagrAnalysis' | 'regressionAnalysis' | 'yearlyData'
  | 'anomalies' | 'scatterData' | 'sankeyData'
>;

export default function TrendsTab({
  selectedAnimal, yearLabel,
  cagrAnalysis, regressionAnalysis, yearlyData,
  anomalies, scatterData, sankeyData
}: Props) {
  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Trend Analizi ve Tahminler</h2>

      {/* CAGR KPI'lar */}
      {cagrAnalysis && (
        <div className="kpi-grid">
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white' }}>
            <div className="kpi-header"><span className="kpi-title">CAGR (TÜM DÖNEM)</span></div>
            <div className="kpi-value">%{cagrAnalysis.overall.toFixed(2)}</div>
            <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>{cagrAnalysis.startYear} - {cagrAnalysis.endYear}</div>
          </div>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', color: 'white' }}>
            <div className="kpi-header"><span className="kpi-title">CAGR (SON 5 YIL)</span></div>
            <div className="kpi-value">%{cagrAnalysis.last5Years.toFixed(2)}</div>
            <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>Son 5 yıllık büyüme</div>
          </div>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
            <div className="kpi-header"><span className="kpi-title">BAŞLANGIÇ ({cagrAnalysis.startYear})</span></div>
            <div className="kpi-value">{formatShort(cagrAnalysis.startValue)}</div>
            <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>baş</div>
          </div>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: 'white' }}>
            <div className="kpi-header"><span className="kpi-title">GÜNCEL ({cagrAnalysis.endYear})</span></div>
            <div className="kpi-value">{formatShort(cagrAnalysis.endValue)}</div>
            <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>baş</div>
          </div>
        </div>
      )}

      {/* Trend Line with Predictions */}
      {regressionAnalysis && (
        <ChartCard title={<>Trend Çizgisi ve 3 Yıllık Projeksiyon (R² = {regressionAnalysis.r2.toFixed(3)})</>} action={<ChartInsightButton title="📉 Trend ve Projeksiyon" description="Regresyon ile tahmin analizi" data={yearlyData} context={{ section: 'Trend' }} compact />}>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={[...yearlyData, ...regressionAnalysis.predictions]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
              <Tooltip formatter={(value: number, name: string) => [`${formatNumber(value)} baş`, name]} />
              <Legend />
              <Area type="monotone" dataKey="value" name="Gerçek Veri" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.3} tooltipType="none" legendType="none" />
              <Line type="monotone" dataKey="value" strokeDasharray="5 5" stroke="#f59e0b" strokeWidth={2} name="Tahmin" dot={{ fill: '#f59e0b', r: 4 }} />
              <ReferenceLine x={yearLabel} stroke="#ef4444" strokeDasharray="3 3" label="Güncel" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Anomali Tespiti */}
      {anomalies.length > 0 && (
        <ChartCard title="⚠️ Anomali Tespiti (Beklenmedik Değişimler)" action={<ChartInsightButton title="⚠️ Anomali Tespiti" description="Beklenmedik değişimler" data={anomalies} context={{ section: 'Anomali' }} compact />}>
          <div style={{ padding: '20px' }}>
            {anomalies.map((anomaly, idx) => (
              <div key={idx} style={{ padding: '12px', marginBottom: '8px', background: 'var(--card-bg)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>📍 {anomaly.year} Yılı</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Değer: {formatNumber(anomaly.value)} baş • Sapma: {anomaly.deviation.toFixed(2)} sigma
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Sankey Diagram */}
      {sankeyData.nodes.length > 0 && (
        <ChartCard title="🌊 Hayvan Akış Diyagramı (Son 3 Yıl)" action={<ChartInsightButton title="🌊 Akış Diyagramı" description="Yıllar arası hayvan sayısı akışı" data={sankeyData.nodes} context={{ section: 'Akış' }} compact />}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Yıllar arası {selectedAnimal} sayısının akışı
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <Sankey
                data={sankeyData}
                node={{ fill: '#f59e0b', fillOpacity: 0.8 } as any}
                link={{ stroke: '#d97706', strokeOpacity: 0.4 } as any}
                nodePadding={50}
                margin={{ top: 20, right: 60, bottom: 20, left: 60 }}
              >
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                          <p style={{ margin: 0, fontWeight: '600' }}>
                            {data.source?.name || data.name} → {data.target?.name || ''}
                          </p>
                          <p style={{ margin: 0, color: 'var(--primary)' }}>
                            {formatShort(data.value || 0)} baş
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Scatter Plot */}
      {scatterData.length > 0 && (
        <ChartCard title="📊 Yıllık Değer Korelasyon Grafiği (Scatter Plot)" action={<ChartInsightButton title="📊 Korelasyon Grafiği" description="Dağılım ve korelasyon analizi" data={scatterData} context={{ section: 'Korelasyon' }} compact />}>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 8, bottom: 20, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" type="number" name="Yıl" stroke="var(--text-secondary)" />
              <YAxis dataKey="y" type="number" name="Hayvan Sayısı" stroke="var(--text-secondary)" width={46} />
              <ZAxis dataKey="z" range={[50, 400]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div style={{ background: 'var(--bg-secondary)', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <p style={{ margin: 0, fontWeight: '600' }}>{data.year}</p>
                        <p style={{ margin: 0, color: 'var(--primary)' }}>{formatShort(data.y)} baş</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Hayvan Sayısı" data={scatterData} fill="#f59e0b" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </>
  );
}
