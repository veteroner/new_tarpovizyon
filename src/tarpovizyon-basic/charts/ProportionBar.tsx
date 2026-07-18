const pctFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

export type ProportionItem = { name: string; value: number; color: string };

/** Single 100%-stacked horizontal bar for part-to-whole breakdowns — replaces
 *  a pie/donut for the common case here where one bucket ("Diğer") dominates
 *  and 5+ real categories are left as slivers too thin to read or tap. A bar
 *  segment stays legible even when thin, values are labeled directly (no
 *  hover needed, which touch devices lack), and the legend below always
 *  shows the exact percentage for every category including the smallest. */
export function ProportionBar({ items }: { items: ProportionItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div className="tvb-proportion">
      <div className="tvb-proportion__track">
        {items.map((item) => {
          const pct = (item.value / total) * 100;
          return (
            <div
              key={item.name}
              className="tvb-proportion__seg"
              style={{ width: `${pct}%`, background: item.color }}
              title={`${item.name}: ${pctFmt.format(pct)}%`}
            >
              {pct >= 8 && <span>{pctFmt.format(pct)}%</span>}
            </div>
          );
        })}
      </div>
      <div className="tvb-proportion__legend">
        {items.map((item) => (
          <span key={item.name} className="tvb-proportion__legend-item">
            <i style={{ background: item.color }} />
            {item.name} <b>{pctFmt.format((item.value / total) * 100)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}
