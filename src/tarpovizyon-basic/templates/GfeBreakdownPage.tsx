import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { YearlyChart, type SeriesConfig } from '../charts/YearlyChart';

const MONTH_ABBR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const BITKISEL_SERIES = ['Enerji ve yağlayıcılar', 'Tohum ve dikim materyali', 'Gübre ve toprak geliştiriciler', 'Tarımsal ilaçlar', 'Diğer mal ve hizmetler', 'Malzemeler'];
const HAYVANSAL_SERIES = ['Kaba yemler', 'Kesif yemler', 'Veteriner harcamaları'];

export type GfeBreakdownPageConfig = { title: string };

function useMergedSeries(names: string[]) {
  const results = useQueries({
    queries: names.map((name) => ({
      queryKey: ['tvb-gfe-alt-grup', name],
      queryFn: () => fetchRows('makro/gfe-alt-grup-aylik', { alt_grup: name, limit: '200' }),
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const merged = new Map<number, Record<string, number | string>>();
  results.forEach((r, i) => {
    (r.data ?? []).forEach((row) => {
      const yil = Number(row.yil);
      const ay = Number(row.ay);
      const key = yil * 100 + ay;
      const existing = merged.get(key) ?? { sortKey: key, x: `${MONTH_ABBR[ay - 1]} ${yil}` };
      existing[names[i]] = Number(row.yillik_degisim);
      merged.set(key, existing);
    });
  });
  const data = Array.from(merged.values()).sort((a, b) => (a.sortKey as number) - (b.sortKey as number));
  return { data, isLoading };
}

export function GfeBreakdownPage({ config }: { config: GfeBreakdownPageConfig }) {
  const { data: trendRows } = useQuery({
    queryKey: ['tvb-gfe-alt-grup', 'Tarımsal Girdi Fiyat Endeksi'],
    queryFn: () => fetchRows('makro/gfe-alt-grup-aylik', { alt_grup: 'Tarımsal Girdi Fiyat Endeksi', limit: '200' }),
  });
  const trendData = (trendRows ?? [])
    .map((r) => ({ sortKey: Number(r.yil) * 100 + Number(r.ay), x: `${MONTH_ABBR[Number(r.ay) - 1]} ${r.yil}`, value: Number(r.yillik_degisim) }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => a.sortKey - b.sortKey);

  const bitkisel = useMergedSeries(BITKISEL_SERIES);
  const hayvansal = useMergedSeries(HAYVANSAL_SERIES);

  const colorSeries = (names: string[]): SeriesConfig[] => names.map((n) => ({ key: n, label: n, type: 'line' }));
  const lastPeriod = (rows: { x?: unknown }[]) => (rows.length ? String(rows[rows.length - 1].x ?? '') : null);
  const trendPeriod = trendData.length ? trendData[trendData.length - 1].x : null;

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      {trendData.length > 0 && (
        <div className="tvb-section">
          <div className="tvb-section__head">
            <h3>Tarımsal Girdi Fiyat Endeksi Yıllık Değişim Oranı (%)</h3>
            {trendPeriod && <span className="tvb-badge">Son dönem: {trendPeriod}</span>}
          </div>
          <YearlyChart
            data={trendData as unknown as Record<string, number | string>[]}
            xKey="x"
            series={[{ key: 'value', label: 'Tarımsal Girdi Fiyat Endeksi', type: 'line' }]}
            yDomain="auto"
          />
        </div>
      )}

      {bitkisel.data.length > 0 && (
        <div className="tvb-section">
          <div className="tvb-section__head">
            <h3>Bitkisel Üretim-GFE Yıllık Değişim Oranı (%)</h3>
            {lastPeriod(bitkisel.data) && <span className="tvb-badge">Son dönem: {lastPeriod(bitkisel.data)}</span>}
          </div>
          <YearlyChart data={bitkisel.data} xKey="x" series={colorSeries(BITKISEL_SERIES)} yDomain="auto" />
        </div>
      )}

      {hayvansal.data.length > 0 && (
        <div className="tvb-section">
          <div className="tvb-section__head">
            <h3>Hayvansal Üretim-GFE Yıllık Değişim Oranı (%)</h3>
            {lastPeriod(hayvansal.data) && <span className="tvb-badge">Son dönem: {lastPeriod(hayvansal.data)}</span>}
          </div>
          <YearlyChart data={hayvansal.data} xKey="x" series={colorSeries(HAYVANSAL_SERIES)} yDomain="auto" />
        </div>
      )}
    </div>
  );
}
