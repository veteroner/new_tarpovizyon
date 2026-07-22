import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useContainerWidth } from './chartResponsive';

const COLORS = ['#f59e0b', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#0891b2'];
const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
// Axis ticks abbreviate only millions+ (1,4 Mn / 2,1 Mr) so a wide value like
// "1.400.000" doesn't bloat the Y-axis column; thousands stay plain to avoid
// mixing "1,4 B" with "700" on the same axis. The tooltip keeps full precision.
const compactFmt = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
const plainFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const axisTick = (v: number) => (Math.abs(v) >= 1_000_000 ? compactFmt.format(v) : plainFmt.format(v));

export type SeriesConfig = {
  key: string;
  label: string;
  type?: 'bar' | 'line';
  /** 'right' plots this series against a secondary Y-axis — for pairing series
   *  whose scales differ by orders of magnitude (e.g. toplam vs. tarım GSYH, or
   *  ihracat adedi vs. birim fiyat) so neither gets flattened. */
  axis?: 'left' | 'right';
};

export function YearlyChart({
  data,
  xKey,
  series,
  yDomain = 'zero',
}: {
  data: Record<string, number | string>[];
  xKey: string;
  series: SeriesConfig[];
  /**
   * 'zero' (default) anchors the Y-axis at 0 — correct for bars, whose length
   * must encode magnitude. 'auto' scales to the data range with a little
   * padding — for index/level or %-change line charts (e.g. FAO ~90-160,
   * TÜFE-change ±%) a 0-baseline flattens the line into a meaningless band.
   */
  yDomain?: 'zero' | 'auto';
}) {
  // A single-series chart's legend just repeats the section's <h3> title
  // above it verbatim — on mobile that long label wraps to 2 lines and,
  // since Legend is absolutely positioned inside the fixed-height
  // ResponsiveContainer, the overflow eats into the plot area instead of
  // pushing the container taller. Multi-series legends (short labels like
  // "Tarım-ÜFE") stay, but get a taller reserved band on narrow screens.
  const showLegend = series.length > 1;

  const [containerRef, containerWidth] = useContainerWidth(600);

  const isNarrow = containerWidth < 480;
  const legendHeight = showLegend ? (series.length > 2 || isNarrow ? 48 : 24) : 0;
  const fontSize = isNarrow ? 10 : 12;
  // Cap the number of visible X-axis ticks so date labels don't overlap —
  // `interval` is "skip this many ticks between shown ones" in Recharts.
  const maxTicks = Math.max(3, Math.floor(containerWidth / (isNarrow ? 60 : 80)));
  const tickInterval = Math.max(0, Math.ceil(data.length / maxTicks) - 1);

  const hasRightAxis = series.some((s) => s.axis === 'right');

  // For 'auto', derive a padded [min,max] from the actual series values so the
  // line fills the plot area. Recharts' default number domain anchors at 0.
  // Computed per axis so a dual-axis chart scales each side independently.
  const domainFor = (which: 'left' | 'right'): [number, number] | undefined => {
    if (yDomain !== 'auto') return undefined;
    const keys = series.filter((s) => (s.axis ?? 'left') === which).map((s) => s.key);
    const vals = data.flatMap((d) => keys.map((k) => Number(d[k]))).filter((n) => Number.isFinite(n));
    if (!vals.length) return undefined;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min || Math.abs(max) || 1) * 0.08;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  };

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={(isNarrow ? 280 : 340) + legendHeight}>
        <ComposedChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: legendHeight }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
          <XAxis dataKey={xKey} interval={tickInterval} tick={{ fontSize }} tickMargin={6} />
          <YAxis
            yAxisId="left"
            tickFormatter={axisTick}
            tick={{ fontSize }}
            width={isNarrow ? 44 : 56}
            domain={domainFor('left')}
            allowDataOverflow={false}
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={axisTick}
              tick={{ fontSize }}
              width={isNarrow ? 44 : 56}
              domain={domainFor('right')}
              allowDataOverflow={false}
            />
          )}
          <Tooltip
            formatter={(v: number) => numberFmt.format(v)}
            contentStyle={{ maxWidth: 240, fontSize, whiteSpace: 'normal', wordBreak: 'break-word' }}
            wrapperStyle={{ zIndex: 20 }}
            allowEscapeViewBox={{ x: false, y: true }}
          />
          {showLegend && <Legend wrapperStyle={{ paddingTop: 12, fontSize }} />}
          {series.map((s, i) =>
            s.type === 'line' ? (
              <Line
                key={s.key}
                yAxisId={s.axis ?? 'left'}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ) : (
              <Bar key={s.key} yAxisId={s.axis ?? 'left'} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
