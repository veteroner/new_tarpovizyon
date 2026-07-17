import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from 'recharts';
import { useContainerWidth, wrapLabel } from './chartResponsive';

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

  // Fixed YAxis width worked on desktop but ate most of the plot area on
  // mobile widths (~360-400px), leaving bars a few pixels long. Track the
  // container width and scale the label column (and font) down with it.
  const [containerRef, containerWidth] = useContainerWidth(400);

  const isNarrow = containerWidth < 480;
  const yAxisWidth = Math.round(Math.min(220, Math.max(110, containerWidth * 0.42)));
  const fontSize = isNarrow ? 10 : 12;
  const maxLines = isNarrow ? 2 : 1;
  const charsPerLine = Math.max(8, Math.floor((yAxisWidth - 8) / (fontSize * 0.58)));
  const rowHeight = isNarrow ? 44 : 32;
  // Touch devices have no hover, so the exact value must be readable
  // without tapping each bar — draw it directly at the bar's end.
  const rightMargin = isNarrow ? 36 : 48;

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={height ?? Math.max(220, sorted.length * rowHeight)}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: rightMargin }} barCategoryGap={isNarrow ? '25%' : '15%'}>
          <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} tick={{ fontSize }} />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tick={(props) => {
              const { x, y, payload } = props;
              // Category names in this dataset (e.g. "Tarımsal yatırıma
              // katkı sağlayan mal ve hizmetler (Girdi 2)") don't fit a
              // mobile-width column on one line; wrap up to 2 lines and
              // expose the full name via a native SVG <title> so it's
              // never silently cut with no way to read it.
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
            wrapperStyle={{ zIndex: 20 }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
          <ReferenceLine x={0} stroke="#9ca3af" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={isNarrow ? 22 : 28}>
            {sorted.map((item, i) => (
              <Cell key={i} fill={item.name === referenceName ? '#dc2626' : '#2563eb'} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v: number) => numberFmt.format(v)} fontSize={fontSize} fill="#374151" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
