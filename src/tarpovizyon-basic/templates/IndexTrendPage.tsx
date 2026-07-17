import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { YearlyChart } from '../charts/YearlyChart';
import { SnapshotBarChart } from '../charts/SnapshotBarChart';

const MONTH_ABBR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export type IndexTrendPageConfig = {
  title: string;
  trendEndpoint: string;
  trendValueField: string;
  trendChartTitle: string;
  /** Optional: filter the trend endpoint to a single category (used for gfe-alt-grup-aylik). */
  trendFilter?: { param: string; value: string };
  snapshots: {
    chartTitle: string;
    endpoint: string;
    nameField: string;
    valueField: string;
    referenceName?: string;
  }[];
};

export function IndexTrendPage({ config }: { config: IndexTrendPageConfig }) {
  const { title, trendEndpoint, trendValueField, trendChartTitle, trendFilter, snapshots } = config;

  const { data: trendRows } = useQuery({
    queryKey: ['tvb-index-trend', trendEndpoint, trendFilter?.value],
    queryFn: () => fetchRows(trendEndpoint, trendFilter ? { [trendFilter.param]: trendFilter.value, limit: '500' } : { limit: '500' }),
  });

  const trendData = (trendRows ?? [])
    .map((r) => ({
      sortKey: Number(r.yil) * 100 + Number(r.ay),
      x: `${MONTH_ABBR[Number(r.ay) - 1]} ${r.yil}`,
      value: Number(r[trendValueField]),
    }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => a.sortKey - b.sortKey);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      {trendData.length > 0 && (
        <div className="tvb-section">
          <h3>{trendChartTitle}</h3>
          <YearlyChart
            data={trendData as unknown as Record<string, number | string>[]}
            xKey="x"
            series={[{ key: 'value', label: trendChartTitle, type: 'line' }]}
          />
        </div>
      )}

      {snapshots.map((snap) => (
        <SnapshotSection key={snap.endpoint + snap.chartTitle} snap={snap} />
      ))}
    </div>
  );
}

function SnapshotSection({ snap }: { snap: IndexTrendPageConfig['snapshots'][number] }) {
  const { data } = useQuery({ queryKey: ['tvb-index-snapshot', snap.endpoint], queryFn: () => fetchRows(snap.endpoint, { limit: '100' }) });
  const items = (data ?? [])
    .map((r) => ({ name: String(r[snap.nameField] ?? ''), value: Number(r[snap.valueField]) }))
    .filter((i) => i.name && Number.isFinite(i.value));

  if (items.length === 0) return null;

  return (
    <div className="tvb-section">
      <h3>{snap.chartTitle}</h3>
      <SnapshotBarChart items={items} referenceName={snap.referenceName} />
    </div>
  );
}
