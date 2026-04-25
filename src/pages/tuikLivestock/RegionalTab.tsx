import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import { COLORS, REGION_COLORS, formatNumber, formatShort } from './tuikLivestockTypes';
import type { UseTuikLivestockDataReturn } from './useTuikLivestockData';

type Props = Pick<UseTuikLivestockDataReturn,
  | 'selectedAnimal' | 'selectedRegion'
  | 'regionalAnalysis' | 'cityDataForSelectedRegion' | 'totalSelectedRegion'
  | 'heatmapData'
>;

export default function RegionalTab({
  selectedAnimal, selectedRegion,
  regionalAnalysis, cityDataForSelectedRegion, totalSelectedRegion,
  heatmapData
}: Props) {
  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>🗺️ Bölgesel Dağılım Analizi</h2>

      {/* Bölgesel KPI'lar */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {regionalAnalysis.slice(0, 7).map((region) => (
          <div key={region.region} className="kpi-card" style={{
            background: `linear-gradient(135deg, ${REGION_COLORS[region.region] || '#6b7280'} 0%, ${REGION_COLORS[region.region] || '#4b5563'} 100%)`,
            color: 'white'
          }}>
            <div className="kpi-header"><span className="kpi-title">{region.region.toUpperCase()}</span></div>
            <div className="kpi-value">{formatShort(region.total)}</div>
            <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>{region.cities} il • Ort: {formatShort(region.average)}</div>
          </div>
        ))}
      </div>

      {selectedRegion === 'Tümü' ? (
        <>
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">📊 Bölgelere Göre {selectedAnimal} Dağılımı</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionalAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="region" angle={-15} textAnchor="end" height={100} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, 'Toplam']} />
                  <Bar dataKey="total" name="Toplam Hayvan" radius={[8, 8, 0, 0]}>
                    {regionalAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Bölgesel Pay Dağılımı (%)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={regionalAnalysis}
                    cx="50%" cy="50%"
                    outerRadius={130} innerRadius={50}
                    dataKey="total"
                    label={(props) => {
                      const payload = (props as any)?.payload as any;
                      const region = String(payload?.region ?? '').trim();
                      const share = Number(payload?.share ?? 0);
                      return region ? `${region} %${share.toFixed(1)}` : '';
                    }}
                    labelLine={true}
                  >
                    {regionalAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">🎯 Çok Boyutlu Bölge Karşılaştırması</h3>
            <ResponsiveContainer width="100%" height={450}>
              <RadarChart data={regionalAnalysis}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="region" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Radar name="Toplam" dataKey="total" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                <Radar name="Ortalama" dataKey="average" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Tooltip formatter={(value: number) => [formatNumber(value), '']} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="chart-grid">
          <div className="chart-card">
            <h3 className="chart-title">🏙️ {selectedRegion} — İllere Göre {selectedAnimal} Dağılımı (Top 20)</h3>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={cityDataForSelectedRegion.slice(0, 20)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {cityDataForSelectedRegion.slice(0, 20).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={REGION_COLORS[selectedRegion] || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">🥧 {selectedRegion} — İl Pay Dağılımı (%) (Top 10)</h3>
            <ResponsiveContainer width="100%" height={420}>
              <PieChart>
                <Pie
                  data={cityDataForSelectedRegion.slice(0, 10).map((c) => ({
                    name: c.name,
                    value: c.value,
                    share: totalSelectedRegion > 0 ? (c.value / totalSelectedRegion * 100) : 0,
                  }))}
                  cx="50%" cy="50%"
                  outerRadius={140} innerRadius={55}
                  dataKey="value"
                  label={(props) => {
                    const payload = (props as any)?.payload as any;
                    const name = String(payload?.name ?? '').trim();
                    const share = Number(payload?.share ?? 0);
                    return name ? `${name} %${share.toFixed(1)}` : '';
                  }}
                  labelLine={true}
                >
                  {cityDataForSelectedRegion.slice(0, 10).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Turkey Heatmap */}
      <div className="chart-card" style={{ marginTop: '24px' }}>
        <h3 className="chart-title">🗺️ Türkiye İl Dağılım Haritası (Coğrafi Bölgeler)</h3>
        {heatmapData.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>İl verileri yükleniyor…</div>
        ) : (
          <TurkeyHeatMap
            regionTotals={heatmapData.map((item) => ({ name: item.province, value: item.value, unit: 'baş' }))}
            unitLabel="baş"
            height={450}
            fillMode="region"
            regionColors={REGION_COLORS}
            highlightRegion={selectedRegion !== 'Tümü' ? selectedRegion : undefined}
            dimNonSelected={selectedRegion !== 'Tümü'}
          />
        )}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
          * İller coğrafi bölgesine göre renklidir; tooltip'te il değerini görebilirsiniz.
        </p>
      </div>
    </>
  );
}
