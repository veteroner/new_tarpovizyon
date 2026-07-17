import { useEffect, useRef, useState } from 'react';
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
  const yAxisWidth = Math.round(Math.min(220, Math.max(90, containerWidth * 0.4)));
  const fontSize = isNarrow ? 10 : 12;

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={height ?? Math.max(220, sorted.length * 32)}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: isNarrow ? 16 : 40 }}>
          <XAxis type="number" tickFormatter={(v) => numberFmt.format(v)} tick={{ fontSize }} />
          <YAxis type="category" dataKey="name" width={yAxisWidth} tick={{ fontSize }} />
          <Tooltip formatter={(v: number) => numberFmt.format(v)} />
          <ReferenceLine x={0} stroke="#9ca3af" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {sorted.map((item, i) => (
              <Cell key={i} fill={item.name === referenceName ? '#dc2626' : '#2563eb'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
