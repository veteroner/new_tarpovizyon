import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { COLORS, fmt, fmtShort } from './plantTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { SplitAxisChart } from '../../components/ui/SplitAxisChart';
import type { CityRow, YearRow, RegionRow, ProductRow } from './plantTypes';
import { VALUE_HEADROOM, compactValue, pctTick, truncTick } from '../../utils/chartTicks';
import { BAR_COLOR } from '../../utils/chartColors';
import { ChartCard } from '../../components/ui/Card';

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
        <ChartCard title="📅 Yıllık Trend (2004–2024)" span={2} action={<ChartInsightButton title="📅 Yıllık Trend" description="Bitkisel üretim yıllık trendi" data={yearlyData} context={{ section: 'Bitkisel Üretim' }} compact />}>
          {/*
            * "Yıllık değişim %" üretim serisinden TÜRETİLMİŞ. Eskiden ikinci
            * bir y ekseninde çiziliyordu; iki ölçeğin hizası keyfi olduğu için
            * çubuk ile çizginin kesiştiği yıl veride karşılığı olmayan bir
            * dönüm noktası gibi okunuyordu. Ortak x eksenli şeride taşındı.
            */}
          <SplitAxisChart
            data={yearlyData as unknown as Record<string, unknown>[]}
            xKey="year"
            height={270}
            yFormat={fmtShort}
            stripKey="change"
            stripLabel="Yıllık Değişim"
            stripFormat={(v) => `%${pctTick(v)}`}
          >
            <Bar dataKey="value" name={selectedUnsur} fill="var(--series-1)"
              radius={[4, 4, 0, 0]} />
          </SplitAxisChart>
        </ChartCard>
      </div>

      {/* ─── Grafik 2 & 3: İl Sıralaması + Pie ─── */}
      <div className="chart-grid">
        <ChartCard title={<>🏙️ İl Sıralaması — Top 20 ({selectedYear})</>} action={<ChartInsightButton title="🏙️ İl Sıralaması" description="Top 20 il" data={cityData.slice(0, 20)} context={{ section: 'Bitkisel Üretim' }} compact />}>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={VALUE_HEADROOM} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={0} />
              <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                {cityData.map((_, i) => <Cell key={i} fill={BAR_COLOR} />)}
              
                <LabelList dataKey="value" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🥧 İl Payları" action={<ChartInsightButton title="🥧 İl Payları" description="İl bazında üretim payları" data={cityData} context={{ section: 'Bitkisel Üretim' }} compact />}>
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
        </ChartCard>
      </div>

      {/* ─── Grafik 4: Bölge Karşılaştırması ─── */}
      {regionData.length > 0 && (
        <div className="chart-grid">
          <ChartCard title={<>🗺️ Bölge Karşılaşması ({selectedYear})</>} span={2} action={<ChartInsightButton title="🗺️ Bölge Karşılaşması" description="Bölgesel karşılaştirma" data={regionData} context={{ section: 'Bitkisel Üretim' }} compact />}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={80} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={46} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="value" name={selectedUnsur} radius={[4, 4, 0, 0]}>
                  {regionData.map((_, i) => <Cell key={i} fill={BAR_COLOR} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ─── Grafik 5: Ürünler Arası Karşılaştırma ─── */}
      {productCompareData.length > 1 && (
        <div className="chart-grid">
          <ChartCard title={<>📊 Ürün Karşılaşması ({selectedYear})</>} span={2} action={<ChartInsightButton title="📊 Ürün Karşılaşması" description="Ürün bazlı karşılaştirma" data={productCompareData} context={{ section: 'Bitkisel Üretim' }} compact />}>
            <ResponsiveContainer width="100%" height={Math.max(250, productCompareData.length * 32)}>
              <BarChart data={productCompareData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={v => fmtShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={VALUE_HEADROOM} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={truncTick} interval={0} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} ${currentBirim}`, selectedUnsur]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="value" name={selectedUnsur} radius={[0, 4, 4, 0]}>
                  {productCompareData.map((_, i) => <Cell key={i} fill={BAR_COLOR} />)}
                
                <LabelList dataKey="value" position="right" formatter={compactValue} style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </>
  );
}
