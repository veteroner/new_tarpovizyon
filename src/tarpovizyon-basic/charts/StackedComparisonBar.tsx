import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#7c3aed', '#0ea5e9', '#db2777'];
const numberFmt = new Intl.NumberFormat('tr-TR');

export function StackedComparisonBar({
  data,
  nameKey,
  series,
}: {
  data: Record<string, number | string>[];
  nameKey: string;
  series: { key: string; label: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 60)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
        <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} />
        <YAxis type="category" dataKey={nameKey} width={100} />
        <Tooltip formatter={(v: number) => numberFmt.format(v)} />
        <Legend />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
