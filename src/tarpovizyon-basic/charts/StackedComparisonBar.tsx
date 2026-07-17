const COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#7c3aed', '#0ea5e9', '#db2777'];
const numberFmt = new Intl.NumberFormat('tr-TR');

/** Div-based horizontal stacked comparison bar. Like HorizontalRankBar, the
 *  category label sits above each bar so the bar spans the full width; each
 *  row's bar is split into colored segments per series. Rows are sorted by
 *  their total descending (largest at top). A legend maps colors to series. */
export function StackedComparisonBar({
  data,
  nameKey,
  series,
}: {
  data: Record<string, number | string>[];
  nameKey: string;
  series: { key: string; label: string }[];
}) {
  const rows = data
    .map((row) => {
      const parts = series.map((s) => ({ key: s.key, label: s.label, value: Number(row[s.key]) || 0 }));
      const total = parts.reduce((sum, p) => sum + p.value, 0);
      return { name: String(row[nameKey] ?? ''), parts, total };
    })
    .filter((r) => r.name)
    .sort((a, b) => b.total - a.total);

  const maxTotal = Math.max(...rows.map((r) => r.total), 0) || 1;

  return (
    <div>
      <div className="tvb-rankbar__legend">
        {series.map((s, i) => (
          <span key={s.key} className="tvb-rankbar__legend-item">
            <span className="tvb-rankbar__swatch" style={{ background: COLORS[i % COLORS.length] }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="tvb-rankbar">
        {rows.map((row, i) => (
          <div className="tvb-rankbar__row" key={`${row.name}-${i}`}>
            <div className="tvb-rankbar__name" title={row.name}>{row.name}</div>
            <div className="tvb-rankbar__bar">
              <div className="tvb-rankbar__track" style={{ overflow: 'visible' }}>
                <div className="tvb-rankbar__stack" style={{ width: `${(row.total / maxTotal) * 100}%` }}>
                  {row.parts.map((p, j) => (
                    p.value > 0 ? (
                      <div
                        key={p.key}
                        className="tvb-rankbar__seg"
                        style={{ width: `${(p.value / row.total) * 100}%`, background: COLORS[j % COLORS.length] }}
                        title={`${p.label}: ${numberFmt.format(p.value)}`}
                      />
                    ) : null
                  ))}
                </div>
              </div>
              <div className="tvb-rankbar__value">{numberFmt.format(row.total)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
