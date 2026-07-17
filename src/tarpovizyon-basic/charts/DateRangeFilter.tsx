import { useState } from 'react';

/** Year-range filter for time-series pages — mirrors the date-range picker
 *  the source Looker report shows above its trend charts (e.g. "1 Oca 2024 -
 *  30 Nis 2026"), which our charts previously always rendered at full range
 *  with no way to narrow it. Filters by year (not exact month/day) since
 *  that's the granularity `yıl`/xField data actually carries here. */
export function useYearRangeFilter<T>(rows: T[], getYear: (row: T) => number | null) {
  const years = rows.map(getYear).filter((y): y is number => y !== null && Number.isFinite(y));
  const minYear = years.length ? Math.min(...years) : null;
  const maxYear = years.length ? Math.max(...years) : null;

  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const activeFrom = from ?? minYear;
  const activeTo = to ?? maxYear;

  const filtered = rows.filter((r) => {
    const y = getYear(r);
    return y !== null && (activeFrom === null || y >= activeFrom) && (activeTo === null || y <= activeTo);
  });

  const yearOptions =
    minYear !== null && maxYear !== null
      ? Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
      : [];

  const control =
    yearOptions.length > 1 ? (
      <div className="tvb-page__controls">
        <div className="tvb-select">
          <label>Başlangıç Yılı</label>
          <select value={activeFrom ?? ''} onChange={(e) => setFrom(Number(e.target.value))}>
            {yearOptions.filter((y) => activeTo === null || y <= activeTo).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="tvb-select">
          <label>Bitiş Yılı</label>
          <select value={activeTo ?? ''} onChange={(e) => setTo(Number(e.target.value))}>
            {yearOptions.filter((y) => activeFrom === null || y >= activeFrom).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    ) : null;

  return { filtered, control };
}
