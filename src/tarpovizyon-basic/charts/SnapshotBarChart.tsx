import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export type SnapshotBarItem = { name: string; value: number };

/** Horizontal bar chart used for "Alt Gruplara Göre ... Değişim Oranı" snapshots —
 *  one bar per category, sorted descending, with the overall/reference category
 *  (e.g. "Tarım-ÜFE", "TÜFE (Genel Endeks)") highlighted in a different color. */
export function SnapshotBarChart({
  items,
  referenceName,
  height,
}: {
  items: SnapshotBarItem[];
  referenceName?: string;
  height?: number;
}) {
  const sorted = [...items].filter((i) => Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(220, sorted.length * 32)}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 24, right: 40 }}>
        <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} />
        <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => numberFmt.format(v)} />
        <ReferenceLine x={0} stroke="#9ca3af" />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {sorted.map((item, i) => (
            <Cell key={i} fill={item.name === referenceName ? '#dc2626' : '#2563eb'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
