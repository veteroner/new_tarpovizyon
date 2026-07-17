const numberFmt = new Intl.NumberFormat('tr-TR');

export type RankedTableItem = { name: string; value: number; secondary?: number };

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
  const sorted = [...items].filter((i) => Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
  return (
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
          {sorted.map((item, i) => (
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
  );
}
