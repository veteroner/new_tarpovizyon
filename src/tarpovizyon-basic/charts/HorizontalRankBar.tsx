const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export type RankBarItem = { name: string; value: number };

/** Div-based horizontal ranking bar. The category label sits ABOVE each bar
 *  (wrapping naturally across the full width) instead of in a fixed left
 *  column, so the bar itself gets the whole container width — critical on
 *  mobile where a long-label left column left bars only a few px wide.
 *  Sorted descending so the largest value is at the TOP. The exact value is
 *  always rendered (no hover needed, which touch devices lack). */
export function HorizontalRankBar({
  items,
  highlightName,
  baseColor = '#2563eb',
  topN,
}: {
  items: RankBarItem[];
  highlightName?: string;
  baseColor?: string;
  topN?: number;
}) {
  const sorted = [...items]
    .filter((i) => Number.isFinite(i.value))
    .sort((a, b) => b.value - a.value);
  const shown = topN ? sorted.slice(0, topN) : sorted;
  const max = Math.max(...shown.map((i) => Math.abs(i.value)), 0) || 1;

  return (
    <div className="tvb-rankbar">
      {shown.map((item, i) => {
        const hl = item.name === highlightName;
        return (
          <div className="tvb-rankbar__row" key={`${item.name}-${i}`}>
            <div className={`tvb-rankbar__name${hl ? ' tvb-rankbar__name--hl' : ''}`} title={item.name}>
              {item.name}
            </div>
            <div className="tvb-rankbar__bar">
              <div className="tvb-rankbar__track">
                <div
                  className="tvb-rankbar__fill"
                  style={{ width: `${(Math.abs(item.value) / max) * 100}%`, background: hl ? '#dc2626' : baseColor }}
                />
              </div>
              <div className="tvb-rankbar__value">{numberFmt.format(item.value)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
