import { useQuery } from '@tanstack/react-query';
import { fetchRows } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { GaugeChart } from '../charts/GaugeChart';
import { YearlyChart, type SeriesConfig } from '../charts/YearlyChart';
import { TradeTrendSection } from '../charts/TradeTrendSection';
import { HorizontalRankBar } from '../charts/HorizontalRankBar';

export type YearlyPageConfig = {
  title: string;
  endpoint: string;
  xField: string; // yıl or tarih
  series: SeriesConfig[];
  kpiField?: string; // main KPI, latest non-zero value + YoY change
  kpiLabel?: string;
  kpiUnit?: string;
  secondKpiField?: string;
  secondKpiLabel?: string;
  /** Self-sufficiency gauge sourced from its own endpoint (tr/yeterlilikler holds a ratio, e.g. 1.17 = 117%). */
  gauge?: { endpoint: string; field: string; label: string; asRatio?: boolean };
  /** Aggregate monthly/date rows into yearly sums for a cleaner trend chart. */
  aggregateYearly?: boolean;
  /** Reformats a datetime xField into a compact axis label. */
  xFormat?: 'year' | 'yearMonth';
  /** Renders a "Dış Ticaret" sub-section (KPIs + yearly trend + product table) below the main chart. */
  tradeSection?: { title: string; urunler: string[] };
  /** Renders a "İlk 10 İl" section below the main chart — one ranking bar per
   *  metric, computed from the endpoint's latest year (e.g. province-level
   *  Sığır/Manda/Koyun/Keçi varlığı, matching the source Looker report's
   *  per-species province ranking that the main yearly chart alone doesn't cover). */
  provincialRanking?: {
    title: string;
    endpoint: string;
    nameField: string;
    yearField: string;
    metrics: { field: string; label: string }[];
    topN?: number;
  };
};

type Row = Record<string, unknown>;

function extractYear(value: unknown): number | null {
  const m = String(value ?? '').match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

function sortRows(rows: Row[], xField: string): Row[] {
  const numeric = rows.every((r) => Number.isFinite(Number(r[xField])));
  return [...rows].sort((a, b) =>
    numeric ? Number(a[xField]) - Number(b[xField]) : String(a[xField]).localeCompare(String(b[xField]))
  );
}

function aggregateByYear(rows: Row[], xField: string, fields: string[]): Row[] {
  const byYear = new Map<number, Row>();
  for (const r of rows) {
    const year = extractYear(r[xField]);
    if (year === null) continue;
    const acc = byYear.get(year) ?? { [xField]: year };
    for (const f of fields) {
      const v = Number(r[f]);
      if (Number.isFinite(v)) acc[f] = (Number(acc[f]) || 0) + v;
    }
    byYear.set(year, acc);
  }
  return Array.from(byYear.values()).sort((a, b) => Number(a[xField]) - Number(b[xField]));
}

/** Walks back from the end to find the latest row with a non-zero, finite value; returns it plus the prior comparable row. */
function latestNonZero(rows: Row[], field: string): { value: number | null; pct: number | null } {
  for (let i = rows.length - 1; i >= 1; i--) {
    const v = Number(rows[i][field]);
    if (Number.isFinite(v) && v !== 0) {
      const p = Number(rows[i - 1][field]);
      const pct = Number.isFinite(p) && p !== 0 ? ((v - p) / p) * 100 : null;
      return { value: v, pct };
    }
  }
  return { value: null, pct: null };
}

function useProvincialRanking(config?: YearlyPageConfig['provincialRanking']) {
  const { data } = useQuery({
    queryKey: ['tvb-provincial-ranking', config?.endpoint],
    queryFn: () => fetchRows(config!.endpoint, { limit: '3000' }),
    enabled: Boolean(config),
  });
  if (!config || !data) return null;
  const yearOf = (r: (typeof data)[number]) => extractYear(r[config.yearField]);
  const latestYear = Math.max(...data.map(yearOf).filter((y): y is number => y !== null));
  const latestRows = data.filter((r) => yearOf(r) === latestYear);
  return config.metrics.map((m) => ({
    label: m.label,
    items: latestRows
      .map((r) => ({ name: String(r[config.nameField] ?? ''), value: Number(r[m.field]) }))
      .filter((i) => i.name && Number.isFinite(i.value) && i.value > 0),
  }));
}

function useGauge(gauge?: YearlyPageConfig['gauge']) {
  const { data } = useQuery({
    queryKey: ['tvb-gauge', gauge?.endpoint],
    queryFn: () => fetchRows(gauge!.endpoint, { limit: '10' }),
    enabled: Boolean(gauge),
  });
  if (!gauge || !data || data.length === 0) return null;
  const raw = Number(data[0][gauge.field]);
  if (!Number.isFinite(raw)) return null;
  return gauge.asRatio === false ? raw : raw * 100;
}

export function YearlyPage({ config }: { config: YearlyPageConfig }) {
  const { title, endpoint, xField, series, kpiField, kpiLabel, kpiUnit, secondKpiField, secondKpiLabel, gauge, aggregateYearly, xFormat, tradeSection, provincialRanking } = config;

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-yearly', endpoint],
    queryFn: () => fetchRows(endpoint, { limit: '3000' }),
  });

  let rows = sortRows((data ?? []) as Row[], xField);
  if (aggregateYearly) {
    rows = aggregateByYear(rows, xField, series.map((s) => s.key));
  } else if (xFormat === 'year') {
    rows = rows.map((r) => ({ ...r, [xField]: extractYear(r[xField]) ?? r[xField] }));
  } else if (xFormat === 'yearMonth') {
    rows = rows.map((r) => ({ ...r, [xField]: String(r[xField]).slice(0, 7) }));
  }

  const kpi1 = kpiField ? latestNonZero(rows, kpiField) : null;
  const kpi2 = secondKpiField ? latestNonZero(rows, secondKpiField) : null;
  const gaugeValue = useGauge(gauge);
  const rankings = useProvincialRanking(provincialRanking);

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      {isLoading && <p className="tvb-status">Yükleniyor…</p>}

      {!isLoading && (
        <>
          {(kpi1 || kpi2 || gaugeValue !== null) && (
            <div className="tvb-page__controls">
              {gaugeValue !== null && <GaugeChart label={gauge?.label ?? 'Yeterlilik Oranı'} percent={gaugeValue} />}
              {kpi1 && <KpiCard label={kpiLabel ?? kpiField ?? ''} value={formatNumber(kpi1.value)} suffix={kpiUnit} changePct={kpi1.pct} />}
              {kpi2 && <KpiCard label={secondKpiLabel ?? secondKpiField ?? ''} value={formatNumber(kpi2.value)} suffix={kpiUnit} changePct={kpi2.pct} />}
            </div>
          )}

          <div className="tvb-section">
            <YearlyChart data={rows as Record<string, number | string>[]} xKey={xField} series={series} />
          </div>

          {tradeSection && <TradeTrendSection title={tradeSection.title} urunler={tradeSection.urunler} />}

          {rankings && (
            <div className="tvb-section">
              <h3>{provincialRanking?.title}</h3>
              <div className="tvb-provincial-grid">
                {rankings.map((r) => (
                  <div key={r.label}>
                    <h4>{r.label}</h4>
                    <HorizontalRankBar items={r.items} topN={provincialRanking?.topN ?? 10} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
