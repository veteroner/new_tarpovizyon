import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { YearlyChart } from '../charts/YearlyChart';
import { SnapshotBarChart } from '../charts/SnapshotBarChart';
import { useYearRangeFilter } from '../charts/DateRangeFilter';

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
    /**
     * Dönemi trendin son ayından al.
     *
     * ─── NE ZAMAN KULLANILIR ────────────────────────────────────────────────
     * Normalde snapshot'ın dönemi DOĞRULANARAK bulunuyor: referans satırının
     * değeri trend serisinde hangi aya denk geliyorsa o. Ama AYLIK değişim
     * snapshot'ında bu işlemiyor — trend serisi YILLIK değişim tutuyor, aylık
     * bir değer (1,78) hiçbir aya eşleşmez.
     *
     * Bu bayrak yalnızca snapshot'ın trendle AYNI kaynaktan, aynı anda
     * yazıldığı biliniyorsa verilmeli. TÜFE'de öyle:
     * `scripts/tufe-guncelle.mjs` üç tabloyu da tek bülten dosyasından
     * yazıyor, dolayısıyla dönemleri tanım gereği aynı.
     */
    donemTrendinSonu?: boolean;
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
      yil: Number(r.yil),
      x: `${MONTH_ABBR[Number(r.ay) - 1]} ${r.yil}`,
      value: Number(r[trendValueField]),
    }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => a.sortKey - b.sortKey);

  // Date-range filter — mirrors the "1 Oca 2024 - 30 Nis 2026" style picker
  // the source Looker report shows above its trend charts, which our index
  // pages previously lacked entirely (always rendered full history).
  const { filtered: filteredTrend, control: dateControl } = useYearRangeFilter(trendData, (r) => (Number.isFinite(r.yil) ? r.yil : null));

  // Latest available period ("May 2026") — sparse X-axis ticks mean the most
  // recent month is often unlabeled, so the reader can't tell how current the
  // series is; surface it explicitly above the chart.
  const latestPeriod = trendData.length ? trendData[trendData.length - 1].x : null;

  // Snapshot tables carry no period column and aren't refreshed by the daily
  // sync, so we recover a snapshot's month by matching its reference value back
  // to the trend series (rounded); later periods win when a value repeats.
  const periodByValue = new Map<string, string>();
  trendData.forEach((r) => periodByValue.set(r.value.toFixed(2), r.x));

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      {trendData.length > 0 && (
        <div className="tvb-section">
          {dateControl}
          <div className="tvb-section__head">
            <h3>{trendChartTitle}</h3>
            {latestPeriod && <span className="tvb-badge">Son dönem: {latestPeriod}</span>}
          </div>
          <YearlyChart
            data={filteredTrend as unknown as Record<string, number | string>[]}
            xKey="x"
            series={[{ key: 'value', label: trendChartTitle, type: 'line' }]}
            yDomain="auto"
          />
        </div>
      )}

      {snapshots.map((snap) => (
        <SnapshotSection
          key={snap.endpoint + snap.chartTitle}
          snap={snap}
          periodByValue={periodByValue}
          trendSonDonem={latestPeriod}
        />
      ))}
    </div>
  );
}

function SnapshotSection({ snap, periodByValue, trendSonDonem }: {
  snap: IndexTrendPageConfig['snapshots'][number];
  periodByValue: Map<string, string>;
  trendSonDonem: string | null;
}) {
  const { data } = useQuery({ queryKey: ['tvb-index-snapshot', snap.endpoint], queryFn: () => fetchRows(snap.endpoint, { limit: '100' }) });
  const items = (data ?? [])
    .map((r) => ({ name: String(r[snap.nameField] ?? ''), value: Number(r[snap.valueField]) }))
    .filter((i) => i.name && Number.isFinite(i.value));

  if (items.length === 0) return null;

  /*
   * Dönem iki yoldan bulunuyor, sırayla:
   *
   *  1. DOĞRULAMA (tercih edilen): referans satırının değeri trend serisinde
   *     hangi aya denk geliyorsa o. Değer eşleştiği için bu bir kanıt.
   *  2. `donemTrendinSonu` bayrağı: snapshot trendle aynı kaynaktan, aynı anda
   *     yazılıyorsa trendin son ayı geçerlidir. Aylık değişim snapshot'ında
   *     1. yol işlemiyor (trend yıllık değer tutuyor, aylık değer eşleşmez).
   *
   * Hiçbiri yoksa rozet ÇİZİLMİYOR — ay tahmin edilmiyor.
   */
  const refItem = snap.referenceName ? items.find((i) => i.name === snap.referenceName) : undefined;
  const eslesen = refItem ? periodByValue.get(refItem.value.toFixed(2)) : undefined;
  const period = eslesen ?? (snap.donemTrendinSonu ? trendSonDonem ?? undefined : undefined);

  return (
    <div className="tvb-section">
      <div className="tvb-section__head">
        <h3>{snap.chartTitle}</h3>
        {period && <span className="tvb-badge">Son dönem: {period}</span>}
      </div>
      <SnapshotBarChart items={items} referenceName={snap.referenceName} />
    </div>
  );
}
