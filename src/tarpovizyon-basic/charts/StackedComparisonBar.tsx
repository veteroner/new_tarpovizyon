import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useContainerWidth, wrapLabel } from './chartResponsive';

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
  const [containerRef, containerWidth] = useContainerWidth(400);
  const isNarrow = containerWidth < 480;
  const yAxisWidth = Math.round(Math.min(150, Math.max(80, containerWidth * 0.32)));
  const fontSize = isNarrow ? 10 : 12;
  const maxLines = isNarrow ? 2 : 1;
  const charsPerLine = Math.max(8, Math.floor((yAxisWidth - 8) / (fontSize * 0.58)));

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * (isNarrow ? 64 : 60))}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: isNarrow ? 16 : 24 }}>
          <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} tick={{ fontSize }} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={yAxisWidth}
            tick={(props) => {
              const { x, y, payload } = props;
              const lines = wrapLabel(String(payload.value), charsPerLine, maxLines);
              const lineHeight = fontSize + 2;
              const startY = -((lines.length - 1) * lineHeight) / 2;
              return (
                <g transform={`translate(${x},${y})`}>
                  <title>{payload.value}</title>
                  {lines.map((line, i) => (
                    <text key={i} x={0} y={startY + i * lineHeight} dy={4} textAnchor="end" fontSize={fontSize} fill="#4b5563">
                      {line}
                    </text>
                  ))}
                </g>
              );
            }}
          />
          <Tooltip
            formatter={(v: number) => numberFmt.format(v)}
            contentStyle={{ maxWidth: 220, fontSize, whiteSpace: 'normal', wordBreak: 'break-word' }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
          <Legend wrapperStyle={{ fontSize }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
