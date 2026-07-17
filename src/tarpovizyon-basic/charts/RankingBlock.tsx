import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#16a34a', '#0891b2', '#dc2626', '#f59e0b', '#7c3aed', '#0ea5e9', '#65a30d', '#db2777', '#6b7280'];
const numberFmt = new Intl.NumberFormat('tr-TR');

export type RankingItem = { name: string; value: number };

export function RankingBlock({ items, topN = 10 }: { items: RankingItem[]; topN?: number }) {
  const sorted = [...items].filter((i) => Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const total = sorted.reduce((s, i) => s + i.value, 0);

  const donutData = (() => {
    const topFew = sorted.slice(0, 5);
    const otherSum = sorted.slice(5).reduce((s, i) => s + i.value, 0);
    const data = topFew.map((i) => ({ name: i.name, value: i.value }));
    if (otherSum > 0) data.push({ name: 'Diğer', value: otherSum });
    return data;
  })();

  return (
    <div className="tvb-ranking">
      <div className="tvb-ranking__chart">
        <h3>İlk {top.length} — Bar</h3>
        <ResponsiveContainer width="100%" height={Math.max(220, top.length * 34)}>
          <BarChart data={[...top].reverse()} layout="vertical" margin={{ left: 24, right: 24 }}>
            <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} />
            <YAxis type="category" dataKey="name" width={140} />
            <Tooltip formatter={(v: number) => numberFmt.format(v)} />
            <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="tvb-ranking__chart">
        <h3>Oran (%)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={1}>
              {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend layout="vertical" align="right" verticalAlign="middle" />
            <Tooltip formatter={(v: number) => `${((v / total) * 100).toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
