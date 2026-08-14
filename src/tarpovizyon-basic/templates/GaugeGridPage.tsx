import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { OranCubugu } from '../charts/OranCubugu';

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
        <div className="tvb-oran-liste">
          {gauges.map((g) => {
            const raw = Number(row[g.field]);
            if (!Number.isFinite(raw)) return null;
            return (
              /* Miktar çubuğu: değer ham birimiyle yazılıyor, ölçek `max`e
                 kadar. Eşik yok — burada aşılması gereken bir hedef yok. */
              <OranCubugu
                key={g.field}
                label={g.label}
                deger={raw}
                max={g.max}
                gosterim={raw.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                neutral
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
