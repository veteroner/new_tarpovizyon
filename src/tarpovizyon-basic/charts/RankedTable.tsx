const numberFmt = new Intl.NumberFormat('tr-TR');

export function RankedTable({ items, nameLabel = 'Ülke', valueLabel = 'Değer' }: { items: { name: string; value: number }[]; nameLabel?: string; valueLabel?: string }) {
  const sorted = [...items].filter((i) => Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
  return (
    <div className="tvb-table-wrap">
      <table className="tvb-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{nameLabel}</th>
            <th>{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr key={`${item.name}-${i}`}>
              <td>{i + 1}</td>
              <td>{item.name}</td>
              <td>{numberFmt.format(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
