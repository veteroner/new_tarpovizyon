import { useEffect, useRef, useState } from 'react';
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
  // A single-series chart's legend just repeats the section's <h3> title
  // above it verbatim — on mobile that long label wraps to 2 lines and,
  // since Legend is absolutely positioned inside the fixed-height
  // ResponsiveContainer, the overflow eats into the plot area instead of
  // pushing the container taller. Multi-series legends (short labels like
  // "Tarım-ÜFE") stay, but get a taller reserved band on narrow screens.
  const showLegend = series.length > 1;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);

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
  const legendHeight = showLegend ? (series.length > 2 || isNarrow ? 48 : 24) : 0;
  const fontSize = isNarrow ? 10 : 12;
  // Cap the number of visible X-axis ticks so date labels don't overlap —
  // `interval` is "skip this many ticks between shown ones" in Recharts.
  const maxTicks = Math.max(3, Math.floor(containerWidth / (isNarrow ? 60 : 80)));
  const tickInterval = Math.max(0, Math.ceil(data.length / maxTicks) - 1);

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={(isNarrow ? 280 : 340) + legendHeight}>
        <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: legendHeight }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
          <XAxis dataKey={xKey} interval={tickInterval} tick={{ fontSize }} />
          <YAxis tickFormatter={(v) => numberFmt.format(v)} tick={{ fontSize }} />
          <Tooltip formatter={(v: number) => numberFmt.format(v)} />
          {showLegend && <Legend wrapperStyle={{ paddingTop: 12, fontSize }} />}
          {series.map((s, i) =>
            s.type === 'line' ? (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ) : (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
