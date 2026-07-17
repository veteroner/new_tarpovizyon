import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { StackedComparisonBar } from '../charts/StackedComparisonBar';

export type StackedComparisonPageConfig = {
  title: string;
  endpoint: string;
  nameField: string;
  series: { key: string; label: string }[];
};

export function StackedComparisonPage({ config }: { config: StackedComparisonPageConfig }) {
  const { title, endpoint, nameField, series } = config;

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-stacked', endpoint],
    queryFn: () => fetchRows(endpoint, { limit: '500' }),
  });

  const rows = (data ?? []) as Record<string, number | string>[];

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>
      {isLoading && <p className="tvb-status">Yükleniyor…</p>}
      {!isLoading && rows.length > 0 && (
        <div className="tvb-section">
          <StackedComparisonBar data={rows} nameKey={nameField} series={series} />
        </div>
      )}
    </div>
  );
}
