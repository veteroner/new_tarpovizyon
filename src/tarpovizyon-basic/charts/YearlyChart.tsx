import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const COLORS = ['#f59e0b', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#0891b2'];
const numberFmt = new Intl.NumberFormat('tr-TR');

export type SeriesConfig = { key: string; label: string; type?: 'bar' | 'line' };

export function YearlyChart({
  data,
  xKey,
  series,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  series: SeriesConfig[];
}) {
  const legendHeight = series.length > 2 ? 48 : 24;
  return (
    <ResponsiveContainer width="100%" height={340 + legendHeight}>
      <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: legendHeight }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={(v) => numberFmt.format(v)} />
        <Tooltip formatter={(v: number) => numberFmt.format(v)} />
        <Legend wrapperStyle={{ paddingTop: 12 }} />
        {series.map((s, i) =>
          s.type === 'line' ? (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ) : (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
