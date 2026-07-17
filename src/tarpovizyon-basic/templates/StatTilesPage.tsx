import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { StatTileGrid, type StatTile } from '../charts/StatTileGrid';

export type StatTilesPageConfig = {
  title: string;
  endpoint: string;
  dateField: string;
  tiles: { field: string; label: string; unit?: string }[];
};

export function StatTilesPage({ config }: { config: StatTilesPageConfig }) {
  const { title, endpoint, dateField, tiles } = config;

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-stat-tiles', endpoint],
    queryFn: () => fetchRows(endpoint, { limit: '500' }),
  });

  const rows = (data ?? []).slice().sort((a, b) => String(a[dateField]).localeCompare(String(b[dateField])));
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  const statTiles: StatTile[] = tiles.map((t) => {
    const value = last ? Number(last[t.field]) : null;
    const prevValue = prev ? Number(prev[t.field]) : null;
    const changePct = value !== null && Number.isFinite(value) && prevValue !== null && Number.isFinite(prevValue) && prevValue !== 0
      ? ((value - prevValue) / prevValue) * 100
      : null;
    return { label: t.label, value: Number.isFinite(value as number) ? (value as number) : null, unit: t.unit, changePct };
  });

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner tvb-page__banner--orange">{title}</div>
      {last && <p className="tvb-status">Son veri tarihi: {String(last[dateField])}</p>}
      {isLoading && <p className="tvb-status">Yükleniyor…</p>}
      {!isLoading && <StatTileGrid tiles={statTiles} />}
    </div>
  );
}
