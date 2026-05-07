import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { YearPoint } from './eggProductionTypes';
import { formatMillion } from './eggProductionTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface EggTrendChartProps {
  series: YearPoint[];
}

export function EggTrendChart({ series }: EggTrendChartProps) {
  return (
    <div className="chart-grid">
      <div className="chart-card" style={{ gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Yumurta Üretimi Trendi</h3>
          <ChartInsightButton title="📈 Yumurta Üretimi Trendi" description="Yumurta üretimi uzun dönem trendi" data={series} context={{ section: 'Trend' }} />
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              tickFormatter={(v) => formatMillion(Number(v))}
            />
            <Tooltip
              formatter={(value: number) => [`${formatMillion(value)} milyon`, 'Yumurta']}
              labelFormatter={(label) => `Yıl: ${label}`}
            />
            <Area type="monotone" dataKey="eggsMillion" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
