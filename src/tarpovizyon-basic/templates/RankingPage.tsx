import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRows, type Row } from '../api';
import { KpiCard, formatNumber } from '../charts/KpiCard';
import { WorldChoroplethMap } from '../charts/WorldChoroplethMap';
import { RankingBlock } from '../charts/RankingBlock';
import { RankedTable } from '../charts/RankedTable';

export type RankingPageConfig = {
  title: string;
  endpoint: string;
  nameField: string;
  valueField: string;
  kpiLabel: string;
  kpiUnit?: string;
  filterField?: string;
  filterLabel?: string;
  filterParam?: string;
  showMap?: boolean;
  /** 'sum' (default) totals the value across all rows into the KPI card; 'none' hides
   *  the KPI entirely — use this for per-unit yield/ratio metrics that aren't additive
   *  (e.g. karkas verimi kg/animal), where a sum would be meaningless. */
  kpiAggregation?: 'sum' | 'none';
  /** Row names to drop before computing totals/map/ranking (e.g. FAO's "World" aggregate row). */
  excludeNames?: string[];
  /** An extra field shown as a second KPI card (e.g. ekilen alan ha) — always summed. */
  secondaryField?: string;
  secondaryLabel?: string;
  secondaryUnit?: string;
  /** A third KPI shown as a production-weighted average (e.g. verim kg/ha = sum(üretim)/sum(alan)). */
  yieldField?: { productionField: string; areaField: string; label: string; unit?: string };
  /** When the endpoint returns multiple years per row (e.g. one row per ülke+yıl), set this
   *  to the year column so only the latest year is summed/ranked — otherwise totals silently
   *  add up every year in the result set. */
  yearField?: string;
};

export function RankingPage({ config }: { config: RankingPageConfig }) {
  const { title, endpoint, nameField, valueField, kpiLabel, kpiUnit, filterField, filterLabel, filterParam, showMap = true, kpiAggregation = 'sum', excludeNames, secondaryField, secondaryLabel, secondaryUnit, yieldField, yearField } = config;
  const [filter, setFilter] = useState<string>('');

  const { data: allRows } = useQuery({
    queryKey: ['tvb-filter-options', endpoint],
    queryFn: () => fetchRows(endpoint, { limit: '3000' }),
    enabled: Boolean(filterField),
  });

  const filterOptions = useMemo(() => {
    if (!filterField || !allRows) return [];
    const set = new Set<string>();
    allRows.forEach((r) => {
      const v = r[filterField];
      if (v !== null && v !== undefined) set.add(String(v));
    });
    return Array.from(set).sort();
  }, [allRows, filterField]);

  const activeFilter = filter || filterOptions[0] || '';

  const { data, isLoading } = useQuery({
    queryKey: ['tvb-ranking', endpoint, filterField ? activeFilter : null],
    queryFn: () => fetchRows(endpoint, filterField && activeFilter ? { [filterParam ?? filterField]: activeFilter, limit: '8000' } : { limit: '8000' }),
    // When a filter column exists, wait for activeFilter to resolve — otherwise the
    // first render would fetch every product's rows at once, so each country appears
    // multiple times (one row per product) and downstream keys collide.
    enabled: !filterField || Boolean(activeFilter),
  });

  const excluded = new Set(excludeNames ?? []);
  let rows: Row[] = (data ?? []).filter((r) => !excluded.has(String(r[nameField] ?? '')));
  if (yearField && rows.length > 0) {
    const latestYear = Math.max(...rows.map((r) => Number(r[yearField])).filter(Number.isFinite));
    rows = rows.filter((r) => Number(r[yearField]) === latestYear);
  }
  const items = rows
    .map((r) => ({ name: String(r[nameField] ?? ''), value: Number(r[valueField]) }))
    .filter((i) => i.name && Number.isFinite(i.value));

  const total = items.reduce((s, i) => s + i.value, 0);
  const mapValues = Object.fromEntries(items.map((i) => [i.name, i.value]));

  const secondaryTotal = secondaryField
    ? rows.reduce((s, r) => s + (Number.isFinite(Number(r[secondaryField])) ? Number(r[secondaryField]) : 0), 0)
    : null;

  const yieldValue = yieldField
    ? (() => {
        const prod = rows.reduce((s, r) => s + (Number.isFinite(Number(r[yieldField.productionField])) ? Number(r[yieldField.productionField]) : 0), 0);
        const area = rows.reduce((s, r) => s + (Number.isFinite(Number(r[yieldField.areaField])) ? Number(r[yieldField.areaField]) : 0), 0);
        return area > 0 ? prod / area : null;
      })()
    : null;

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{title}</div>

      <div className="tvb-page__controls">
        {filterField && filterOptions.length > 0 && (
          <div className="tvb-select">
            <label>{filterLabel ?? filterField}</label>
            <select value={activeFilter} onChange={(e) => setFilter(e.target.value)}>
              {filterOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        {kpiAggregation === 'sum' && <KpiCard label={kpiLabel} value={formatNumber(total)} suffix={kpiUnit} />}
        {secondaryTotal !== null && <KpiCard label={secondaryLabel ?? secondaryField ?? ''} value={formatNumber(secondaryTotal)} suffix={secondaryUnit} />}
        {yieldValue !== null && <KpiCard label={yieldField?.label ?? 'Verim'} value={formatNumber(yieldValue)} suffix={yieldField?.unit} />}
      </div>

      {isLoading && <p className="tvb-status">Yükleniyor…</p>}

      {!isLoading && items.length > 0 && (
        <>
          {showMap && (
            <div className="tvb-section">
              <h3>Ülkelerin Dağılımı</h3>
              <WorldChoroplethMap values={mapValues} />
            </div>
          )}
          <div className="tvb-section">
            <RankingBlock items={items} />
          </div>
          <div className="tvb-section">
            <RankedTable items={items} nameLabel={nameField === 'ulke' ? 'Ülke' : nameField} valueLabel={kpiLabel} />
          </div>
        </>
      )}

      {!isLoading && items.length === 0 && <p className="tvb-status">Kayıt bulunamadı.</p>}
    </div>
  );
}
