import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Line,
} from 'recharts';
import { COLORS, fmt, fmtShort } from './plantTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import type { CityRow, YearRow, RegionRow, ProductRow } from './plantTypes';

interface PlantMainChartsProps {
  yearlyData: YearRow[];
  cityData: CityRow[];
  regionData: RegionRow[];
  productCompareData: ProductRow[];
  selectedUnsur: string;
  currentBirim: string;
  selectedYear: number;
}

export default function PlantMainCharts({
  yearlyData, cityData, regionData, productCompareData,
  selectedUnsur, currentBirim, selectedYear,
}: PlantMainChartsProps) {
  return (
    <>
      {/* ─── Grafik 1: Yıllık Trend (ComposedChart) ─── */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📅 Yıllık Trend (2004–2024)</h3>
            <ChartInsightButton title="📅 Yıllık Trend" description="Bitkisel üretim yıllık trendi" data={yearlyData} context={{ section: 'Bitkisel Üretim' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={[-50, 50]} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'value' ? `${fmt(value)} ${currentBirim}` : `${(value as number).toFixed(1)}%`,
                  name === 'value' ? selectedUnsur : 'Yıllık Değişim'
                ]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="value" name={selectedUnsur} fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Line yAxisId="right" type="monotone" dataKey="change" name="Yıllık Değişim %" stroke="#ef4444" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Grafik 2 & 3: İl Sıralaması + Pie ─── */}
      <div className="chart-grid">
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🏙️ İl Sıralaması — Top 20 ({selectedYear})</h3>
            <ChartInsightButton title="🏙️ İl Sıralaması" description="Top 20 il" data={cityData.slice(0, 20)} context={{ section: 'Bitkisel Üretim' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                {cityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥧 İl Payları</h3>
            <ChartInsightButton title="🥧 İl Payları" description="İl bazında üretim payları" data={cityData} context={{ section: 'Bitkisel Üretim' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={450}>
            <PieChart>
              <Pie data={cityData.slice(0, 10)} cx="50%" cy="50%" outerRadius={150}
                dataKey="value"
                label={({ name, percent }) => `${(name || '').substring(0, 8)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}>
                {cityData.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Grafik 4: Bölge Karşılaştırması ─── */}
      {regionData.length > 0 && (
        <div className="chart-grid">
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>🗺️ Bölge Karşılaşması ({selectedYear})</h3>
              <ChartInsightButton title="🗺️ Bölge Karşılaşması" description="Bölgesel karşılaştirma" data={regionData} context={{ section: 'Bitkisel Üretim' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                <YAxis tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="value" name={selectedUnsur} radius={[4, 4, 0, 0]}>
                  {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Grafik 5: Ürünler Arası Karşılaştırma ─── */}
      {productCompareData.length > 1 && (
        <div className="chart-grid">
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Ürün Karşılaşması ({selectedYear})</h3>
              <ChartInsightButton title="📊 Ürün Karşılaşması" description="Ürün bazlı karşılaştirma" data={productCompareData} context={{ section: 'Bitkisel Üretim' }} compact />
            </div>
            <ResponsiveContainer width="100%" height={Math.max(250, productCompareData.length * 32)}>
              <BarChart data={productCompareData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                  {productCompareData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
