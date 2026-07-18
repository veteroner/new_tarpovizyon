import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { GaugeChart } from '../charts/GaugeChart';

export type GaugeGridPageConfig = {
  title: string;
  endpoint: string;
  gauges: { field: string; label: string; max: number }[];
};

export function GaugeGridPage({ config }: { config: GaugeGridPageConfig }) {
  const { title, endpoint, gauges } = config;

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-gauge-grid', endpoint],
    queryFn: () => fetchRows(endpoint, { limit: '5' }),
  });

  const row = data?.[0];

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>
      {isLoading && <p className="tvb-status">Yükleniyor…</p>}
      {!isLoading && row && (
        <div className="tvb-tiles">
          {gauges.map((g) => {
            const raw = Number(row[g.field]);
            if (!Number.isFinite(raw)) return null;
            return (
              <div key={g.field} className="tvb-gauge-tile">
                <GaugeChart
                  label={g.label}
                  percent={(raw / g.max) * 100}
                  displayText={raw.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  scaleLabels={['0', String(g.max)]}
                  neutral
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
