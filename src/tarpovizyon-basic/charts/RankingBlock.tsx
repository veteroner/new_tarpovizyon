import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';
import { useContainerWidth, wrapLabel } from './chartResponsive';

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

  const [barRef, barWidth] = useContainerWidth(400);
  const barIsNarrow = barWidth < 480;
  const barYAxisWidth = Math.round(Math.min(160, Math.max(90, barWidth * 0.36)));
  const barFontSize = barIsNarrow ? 10 : 12;
  const barCharsPerLine = Math.max(8, Math.floor((barYAxisWidth - 8) / (barFontSize * 0.58)));

  const [donutRef, donutWidth] = useContainerWidth(400);
  const donutIsNarrow = donutWidth < 420;

  return (
    <div className="tvb-ranking">
      <div className="tvb-ranking__chart" ref={barRef}>
        <h3>İlk {top.length} — Bar</h3>
        <ResponsiveContainer width="100%" height={Math.max(220, top.length * (barIsNarrow ? 40 : 34))}>
          <BarChart data={[...top].reverse()} layout="vertical" margin={{ left: 8, right: barIsNarrow ? 36 : 48 }}>
            <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} tick={{ fontSize: barFontSize }} />
            <YAxis
              type="category"
              dataKey="name"
              width={barYAxisWidth}
              tick={(props) => {
                const { x, y, payload } = props;
                const lines = wrapLabel(String(payload.value), barCharsPerLine, barIsNarrow ? 2 : 1);
                const lineHeight = barFontSize + 2;
                const startY = -((lines.length - 1) * lineHeight) / 2;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <title>{payload.value}</title>
                    {lines.map((line, i) => (
                      <text key={i} x={0} y={startY + i * lineHeight} dy={4} textAnchor="end" fontSize={barFontSize} fill="#4b5563">
                        {line}
                      </text>
                    ))}
                  </g>
                );
              }}
            />
            <Tooltip
              formatter={(v: number) => numberFmt.format(v)}
              contentStyle={{ maxWidth: 220, fontSize: barFontSize, whiteSpace: 'normal', wordBreak: 'break-word' }}
              allowEscapeViewBox={{ x: false, y: false }}
            />
            <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={barIsNarrow ? 22 : 28}>
              <LabelList dataKey="value" position="right" formatter={(v: number) => numberFmt.format(v)} fontSize={barFontSize} fill="#374151" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
