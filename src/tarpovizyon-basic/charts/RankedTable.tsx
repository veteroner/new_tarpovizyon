import { useState } from 'react';

const numberFmt = new Intl.NumberFormat('tr-TR');
const PREVIEW_COUNT = 10;

export type RankedTableItem = { name: string; value: number; secondary?: number };

/** Some of these tables list every country/product with no cap (a global
 *  ranking can run 190+ rows) — collapse to a preview with a "Tümünü göster"
 *  toggle instead of always rendering the full table on page load. */
export function RankedTable({
  items,
  nameLabel = 'Ülke',
  valueLabel = 'Değer',
  secondaryLabel,
}: {
  items: RankedTableItem[];
  nameLabel?: string;
  valueLabel?: string;
  /** When set, renders a second numeric column (e.g. quantity alongside value). */
  secondaryLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...items].filter((i) => Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
  const collapsible = sorted.length > PREVIEW_COUNT;
  const shown = collapsible && !expanded ? sorted.slice(0, PREVIEW_COUNT) : sorted;

  return (
    <div>
      <div className="tvb-table-wrap">
        <table className="tvb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{nameLabel}</th>
              {secondaryLabel && <th>{secondaryLabel}</th>}
              <th>{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((item, i) => (
              <tr key={`${item.name}-${i}`}>
                <td>{i + 1}</td>
                <td>{item.name}</td>
                {secondaryLabel && <td>{Number.isFinite(item.secondary) ? numberFmt.format(item.secondary as number) : '—'}</td>}
                <td>{numberFmt.format(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {collapsible && (
        <button type="button" className="tvb-show-more-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Daha az göster' : `Tümünü göster (+${sorted.length - PREVIEW_COUNT})`}
        </button>
      )}
    </div>
  );
}
