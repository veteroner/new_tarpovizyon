import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export type SnapshotBarItem = { name: string; value: number };

/** Greedy word-wrap into at most `maxLines` lines of ~`charsPerLine` chars;
 *  the last line gets an ellipsis if words remain unplaced. Category names
 *  in this dataset (e.g. "Tarımsal yatırıma katkı sağlayan mal ve
 *  hizmetler (Girdi 2)") are too long to fit a single line at any mobile
 *  YAxis width, so truncation is unavoidable — the full name is exposed via
 *  a native SVG <title> tooltip on the tick instead of being silently cut. */
function wrapLabel(text: string, charsPerLine: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  const remainingWords = words.join(' ').length > lines.join(' ').length;
  if (lines.length === maxLines && remainingWords) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > charsPerLine - 1 ? `${last.slice(0, charsPerLine - 1)}…` : `${last}…`;
  }
  return lines;
}

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isNarrow = containerWidth < 480;
  const yAxisWidth = Math.round(Math.min(220, Math.max(110, containerWidth * 0.42)));
  const fontSize = isNarrow ? 10 : 12;
  const maxLines = isNarrow ? 2 : 1;
  const charsPerLine = Math.max(8, Math.floor((yAxisWidth - 8) / (fontSize * 0.58)));
  const rowHeight = isNarrow ? 44 : 32;

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={height ?? Math.max(220, sorted.length * rowHeight)}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: isNarrow ? 16 : 40 }} barCategoryGap={isNarrow ? '25%' : '15%'}>
          <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} tick={{ fontSize }} />
          <YAxis
            type="category"
            dataKey="name"
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
            wrapperStyle={{ zIndex: 20 }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
          <ReferenceLine x={0} stroke="#9ca3af" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={isNarrow ? 22 : 28}>
            {sorted.map((item, i) => (
              <Cell key={i} fill={item.name === referenceName ? '#dc2626' : '#2563eb'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
