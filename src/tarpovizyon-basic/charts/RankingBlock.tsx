import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { useContainerWidth } from './chartResponsive';
import { HorizontalRankBar } from './HorizontalRankBar';

const COLORS = ['#16a34a', '#0891b2', '#dc2626', '#f59e0b', '#7c3aed', '#0ea5e9', '#65a30d', '#db2777', '#6b7280'];

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

  const [donutRef, donutWidth] = useContainerWidth(400);
  const donutIsNarrow = donutWidth < 420;

  return (
    <div className="tvb-ranking">
      <div className="tvb-ranking__chart">
        <h3>İlk {top.length}</h3>
        <HorizontalRankBar items={top} />
      </div>
      <div className="tvb-ranking__chart" ref={donutRef}>
        <h3>Oran (%)</h3>
        {/* A right-aligned vertical legend eats most of a mobile-width
            donut, squeezing the pie into a sliver. Below ~420px, drop the
            legend under the chart instead so the pie keeps its full size. */}
        <ResponsiveContainer width="100%" height={donutIsNarrow ? 340 : 280}>
          <PieChart margin={donutIsNarrow ? { bottom: 24 } : undefined}>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              innerRadius={donutIsNarrow ? 55 : 60}
              outerRadius={donutIsNarrow ? 90 : 100}
              paddingAngle={1}
              cy={donutIsNarrow ? '42%' : '50%'}
            >
              {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            {donutIsNarrow ? (
              <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
            ) : (
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            )}
            <Tooltip formatter={(v: number) => `${((v / total) * 100).toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
