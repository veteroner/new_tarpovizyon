import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { YearPoint } from './eggProductionTypes';
import { formatMillion } from './eggProductionTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';
import { ChartCard } from '../../components/ui/Card';

interface EggTrendChartProps {
  series: YearPoint[];
}

export function EggTrendChart({ series }: EggTrendChartProps) {
  return (
    <div className="chart-grid">
      <ChartCard title="Yumurta Üretimi Trendi" span={2} action={<ChartInsightButton title="Yumurta Üretimi Trendi" description="Yumurta üretimi uzun dönem trendi" data={series} context={{ section: 'Trend' }} />}>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              tickFormatter={(v) => formatMillion(Number(v))} width={46} />
            <Tooltip
              formatter={(value: number) => [`${formatMillion(value)} milyon`, 'Yumurta']}
              labelFormatter={(label) => `Yıl: ${label}`}
            />
            <Area type="monotone" dataKey="eggsMillion" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
