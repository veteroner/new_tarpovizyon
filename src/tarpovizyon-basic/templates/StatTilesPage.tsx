import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { StatTileGrid, type StatTile } from '../charts/StatTileGrid';
import { formatPeriod, MONTH_ABBR } from '../charts/period';
import { YearlyChart } from '../charts/YearlyChart';

export type StatTilesPageConfig = {
  title: string;
  endpoint: string;
  dateField: string;
  tiles: { field: string; label: string; unit?: string }[];
  /** Optional last-2-years month-by-month comparison chart for one field. */
  comparison?: { field: string; label: string; unit?: string };
};

export function StatTilesPage({ config }: { config: StatTilesPageConfig }) {
  const { title, endpoint, dateField, tiles, comparison } = config;

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-stat-tiles', endpoint],
    queryFn: () => fetchRows(endpoint, { limit: '500' }),
  });

  const rows = (data ?? []).slice().sort((a, b) => String(a[dateField]).localeCompare(String(b[dateField])));
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const period = last ? formatPeriod(last[dateField]) : null;

  const statTiles: StatTile[] = tiles.map((t) => {
    const value = last ? Number(last[t.field]) : null;
    const prevValue = prev ? Number(prev[t.field]) : null;
    const changePct = value !== null && Number.isFinite(value) && prevValue !== null && Number.isFinite(prevValue) && prevValue !== 0
      ? ((value - prevValue) / prevValue) * 100
      : null;
    return { label: t.label, value: Number.isFinite(value as number) ? (value as number) : null, unit: t.unit, changePct, period: period ?? undefined };
  });

  // Last-2-years monthly overlay (month on X, one bar series per year) so the
  // reader can compare this year's course against last year's, month by month.
  const comparisonChart = (() => {
    if (!comparison) return null;
    const years = Array.from(new Set(rows.map((r) => Number(String(r[dateField]).slice(0, 4))))).sort((a, b) => a - b).slice(-2);
    if (years.length === 0) return null;
    const byMonth: Record<number, Record<string, number | string>> = {};
    for (let ay = 1; ay <= 12; ay++) byMonth[ay] = { ay: MONTH_ABBR[ay - 1] };
    rows.forEach((r) => {
      const s = String(r[dateField]);
      const yil = Number(s.slice(0, 4));
      const ay = Number(s.slice(5, 7));
      if (!years.includes(yil) || !(ay >= 1 && ay <= 12)) return;
      const v = Number(r[comparison.field]);
      if (Number.isFinite(v)) byMonth[ay][String(yil)] = v;
    });
    return { years, data: Object.values(byMonth) };
  })();

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner tvb-page__banner--orange">{title}</div>
      {period && <p className="tvb-status">Son dönem: {period}</p>}
      {isLoading && <p className="tvb-status">Yükleniyor…</p>}
      {!isLoading && <StatTileGrid tiles={statTiles} />}

      {comparisonChart && comparisonChart.years.length > 1 && (
        <div className="tvb-section">
          <h3>{comparison?.label} — Son İki Yıl Aylık Karşılaştırma{comparison?.unit ? ` (${comparison.unit})` : ''}</h3>
          <YearlyChart
            data={comparisonChart.data}
            xKey="ay"
            series={comparisonChart.years.map((y) => ({ key: String(y), label: String(y), type: 'bar' as const }))}
          />
        </div>
      )}
    </div>
  );
}
