import { useQuery } from '@tanstack/react-query';
import { fetchRows, type Row } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { YearlyChart } from '../charts/YearlyChart';
import { useYearRangeFilter } from '../charts/DateRangeFilter';

const MONTH_ABBR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const COMMODITY_FIELDS: { key: string; label: string }[] = [
  { key: 'et', label: 'Et' },
  { key: 'sut', label: 'Süt' },
  { key: 'hububat', label: 'Hububat' },
  { key: 'bitkisel_yag', label: 'Bitkisel Yağ' },
  { key: 'seker', label: 'Şeker' },
];

export type FaoIndexPageConfig = { title: string };

function pctChange(rows: Row[], field: string): number | null {
  if (rows.length < 2) return null;
  const last = Number(rows[rows.length - 1][field]);
  const prev = Number(rows[rows.length - 2][field]);
  if (!Number.isFinite(last) || !Number.isFinite(prev) || prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

export function FaoIndexPage({ config }: { config: FaoIndexPageConfig }) {
  const { data } = useQuery({ queryKey: ['tvb-fao-urunler'], queryFn: () => fetchRows('makro/fao-urunler-aylik', { limit: '600' }) });
  const rows = (data ?? []).slice().sort((a, b) => (Number(a.yil) * 100 + Number(a.ay)) - (Number(b.yil) * 100 + Number(b.ay)));

  const latest = rows[rows.length - 1];
  const latestGidaPct = pctChange(rows, 'gida');
  // Reference period the KPI figures belong to, e.g. "Mayıs 2026".
  const latestPeriod = latest ? `${MONTH_ABBR[Number(latest.ay) - 1]} ${latest.yil}` : undefined;

  // Year-range filter drives the seasonal (month-on-x, year-as-line) overlay.
  // Defaults to the last 5 years so the overlay stays readable, but the user
  // can widen it — the FAO series goes back to 1991.
  const maxYear = rows.length ? Number(rows[rows.length - 1].yil) : null;
  const { filtered: filteredRows, control: yearControl } = useYearRangeFilter(
    rows,
    (r) => Number(r.yil),
    { defaultFrom: maxYear != null ? maxYear - 4 : null },
  );

  const yearOverlay = (() => {
    const years = Array.from(new Set(filteredRows.map((r) => Number(r.yil)))).sort((a, b) => a - b);
    const byMonth: Record<number, Record<string, number | string>> = {};
    for (let ay = 1; ay <= 12; ay++) byMonth[ay] = { ay: MONTH_ABBR[ay - 1] };
    filteredRows.forEach((r) => {
      byMonth[Number(r.ay)][String(Number(r.yil))] = Number(r.gida);
    });
    return { years, data: Object.values(byMonth) };
  })();

  const recent = rows.slice(-17).map((r) => ({
    x: `${MONTH_ABBR[Number(r.ay) - 1]} ${r.yil}`,
    et: Number(r.et), sut: Number(r.sut), hububat: Number(r.hububat), bitkisel_yag: Number(r.bitkisel_yag), seker: Number(r.seker),
  }));

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      <div className="tvb-section">
        <div className="tvb-section__head">
          <h3>FAO Gıda Endeksi</h3>
          {latestPeriod && <span className="tvb-badge">Son dönem: {latestPeriod}</span>}
        </div>
        {latest && (
          <div className="tvb-page__controls">
            <KpiCard label="FAO Gıda Endeksi" value={formatNumber(Number(latest.gida))} period={latestPeriod} changePct={latestGidaPct} />
          </div>
        )}
        {yearControl}
        {yearOverlay.data.length > 0 && (
          <YearlyChart
            data={yearOverlay.data}
            xKey="ay"
            series={yearOverlay.years.map((y) => ({ key: String(y), label: String(y), type: 'line' as const }))}
            yDomain="auto"
          />
        )}
      </div>

      <div className="tvb-section">
        <div className="tvb-section__head">
          <h3>FAO Emtia Endeksi</h3>
          {latestPeriod && <span className="tvb-badge">Son dönem: {latestPeriod}</span>}
        </div>
        {recent.length > 0 && (
          <YearlyChart
            data={recent as unknown as Record<string, number | string>[]}
            xKey="x"
            series={COMMODITY_FIELDS.map((c) => ({ key: c.key, label: c.label, type: 'line' as const }))}
            yDomain="auto"
          />
        )}
        {latest && (
          <div className="tvb-page__controls">
            {COMMODITY_FIELDS.map((c) => (
              <KpiCard key={c.key} label={c.label} value={formatNumber(Number(latest[c.key]))} period={latestPeriod} changePct={pctChange(rows, c.key)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
