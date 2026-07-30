import { useQuery } from '@tanstack/react-query';
import { fetchRows, type Row } from '../api';
import { YearlyChart } from '../charts/YearlyChart';
import { useYearRangeFilter } from '../charts/DateRangeFilter';

/** Earliest year at which any of the given fields carries a value — used to
 *  seed the filter so the FAO series' 1991 tail (which the Turkish indices
 *  don't share) doesn't stretch the comparison into a misleading flat run. */
function firstYearWith<T extends { yil: number }>(rows: T[], fields: (keyof T)[]): number | null {
  let min: number | null = null;
  for (const r of rows) {
    if (fields.some((f) => r[f] !== undefined)) {
      const y = r.yil;
      if (Number.isFinite(y) && (min === null || y < min)) min = y;
    }
  }
  return min;
}

const MONTH_ABBR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export type EndeksKarsilastirmaPageConfig = { title: string };

function key(yil: unknown, ay: unknown) {
  return Number(yil) * 100 + Number(ay);
}

/** FAO's index is a raw level (2014-2016=100 baz), not a %-change series like the
 *  Turkish indices — compute year-over-year % change from the raw monthly level
 *  so it can be plotted on the same "yıllık değişim (%)" axis as the others. */
function toYoyPct(rows: Row[], field: string): Map<number, number> {
  const byKey = new Map<number, number>();
  rows.forEach((r) => byKey.set(key(r.yil, r.ay), Number(r[field])));
  const out = new Map<number, number>();
  byKey.forEach((v, k) => {
    const prevKey = k - 100 <= 0 ? null : (Math.floor(k / 100) - 1) * 100 + (k % 100);
    const prev = prevKey !== null ? byKey.get(prevKey) : undefined;
    if (prev !== undefined && Number.isFinite(prev) && prev !== 0 && Number.isFinite(v)) {
      out.set(k, ((v - prev) / prev) * 100);
    }
  });
  return out;
}

export function EndeksKarsilastirmaPage({ config }: { config: EndeksKarsilastirmaPageConfig }) {
  const { data: ufe } = useQuery({ queryKey: ['tvb-ufe-aylik'], queryFn: () => fetchRows('makro/ufe-aylik', { limit: '500' }) });
  const { data: gfe } = useQuery({
    queryKey: ['tvb-gfe-alt-grup', 'Tarımsal Girdi Fiyat Endeksi'],
    queryFn: () => fetchRows('makro/gfe-alt-grup-aylik', { alt_grup: 'Tarımsal Girdi Fiyat Endeksi', limit: '200' }),
  });
  const { data: tufe } = useQuery({ queryKey: ['tvb-tufe-aylik'], queryFn: () => fetchRows('makro/tufe-aylik', { limit: '500' }) });
  const { data: fao } = useQuery({ queryKey: ['tvb-fao-urunler'], queryFn: () => fetchRows('makro/fao-urunler-aylik', { limit: '600' }) });

  // Hooks (incl. the two useYearRangeFilter below) must run unconditionally, so
  // fall back to empty arrays and defer the loading return until after them.
  const loading = !ufe || !gfe || !tufe || !fao;
  const uf = ufe ?? [];
  const gf = gfe ?? [];
  const tf = tufe ?? [];
  const fo = fao ?? [];

  const faoGidaYoy = toYoyPct(fo, 'gida');

  const gidaByKey = new Map<number, { x: string; yil: number; fao?: number; tufe_gida?: number }>();
  const allDates = new Set<number>([...fo.map((r) => key(r.yil, r.ay)), ...tf.map((r) => key(r.yil, r.ay))]);
  allDates.forEach((k) => {
    const yil = Math.floor(k / 100);
    const ay = k % 100;
    gidaByKey.set(k, { x: `${MONTH_ABBR[ay - 1]} ${yil}`, yil });
  });
  faoGidaYoy.forEach((v, k) => { const e = gidaByKey.get(k); if (e) e.fao = v; });
  tf.forEach((r) => { const k = key(r.yil, r.ay); const e = gidaByKey.get(k); if (e && r.gida_alkolsuz !== null) e.tufe_gida = Number(r.gida_alkolsuz); });
  const gidaChart = Array.from(gidaByKey.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v)
    .filter((v) => v.fao !== undefined || v.tufe_gida !== undefined);

  const combinedByKey = new Map<number, { x: string; yil: number; ufe?: number; gfe?: number; tufe?: number; fao?: number }>();
  const allDates2 = new Set<number>([
    ...uf.map((r) => key(r.yil, r.ay)),
    ...gf.map((r) => key(r.yil, r.ay)),
    ...tf.map((r) => key(r.yil, r.ay)),
    ...fo.map((r) => key(r.yil, r.ay)),
  ]);
  allDates2.forEach((k) => {
    const yil = Math.floor(k / 100);
    const ay = k % 100;
    combinedByKey.set(k, { x: `${MONTH_ABBR[ay - 1]} ${yil}`, yil });
  });
  uf.forEach((r) => { const e = combinedByKey.get(key(r.yil, r.ay)); if (e && r.tarim_ufe !== null) e.ufe = Number(r.tarim_ufe); });
  gf.forEach((r) => { const e = combinedByKey.get(key(r.yil, r.ay)); if (e && r.yillik_degisim !== null) e.gfe = Number(r.yillik_degisim); });
  tf.forEach((r) => { const e = combinedByKey.get(key(r.yil, r.ay)); if (e && r.tufe !== null) e.tufe = Number(r.tufe); });
  faoGidaYoy.forEach((v, k) => { const e = combinedByKey.get(k); if (e) e.fao = v; });
  const combinedChart = Array.from(combinedByKey.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v)
    .filter((v) => v.ufe !== undefined || v.gfe !== undefined || v.tufe !== undefined || v.fao !== undefined);

  // Seed each filter at the year the Turkish index in that chart starts, so the
  // FAO-only 1991-2010 stretch (where the other lines are simply absent) doesn't
  // dominate the view. Fully overridable by the user.
  const { filtered: gidaFiltered, control: gidaControl } = useYearRangeFilter(
    gidaChart, (r) => r.yil, { defaultFrom: firstYearWith(gidaChart, ['tufe_gida']) },
  );
  const { filtered: combinedFiltered, control: combinedControl } = useYearRangeFilter(
    combinedChart, (r) => r.yil, { defaultFrom: firstYearWith(combinedChart, ['ufe', 'gfe', 'tufe']) },
  );

  if (loading) {
    return (
      <div className="tvb-page">
        <div className="tvb-page__banner">{config.title}</div>
        <p className="tvb-status">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="tvb-page">
      <div className="tvb-page__banner">{config.title}</div>

      <div className="tvb-section">
        <h3>FAO Gıda Endeksi ve Türkiye TÜFE Gıda Fiyat Endeksi Yıllık Değişimi</h3>
        {gidaControl}
        <YearlyChart
          data={gidaFiltered as unknown as Record<string, number | string>[]}
          xKey="x"
          yDomain="auto"
          series={[
            { key: 'fao', label: 'FAO Gıda Endeksi', type: 'line' },
            { key: 'tufe_gida', label: 'Türkiye TÜFE Gıda Fiyat Endeksi', type: 'line' },
          ]}
        />
      </div>

      <div className="tvb-section">
        <h3>Endeks Değerlerinde Yıllık Değişim Oranları (%)</h3>
        {combinedControl}
        <YearlyChart
          data={combinedFiltered as unknown as Record<string, number | string>[]}
          xKey="x"
          yDomain="auto"
          series={[
            { key: 'ufe', label: 'Tarım ÜFE', type: 'line' },
            { key: 'gfe', label: 'Tarımsal GFE', type: 'line' },
            { key: 'tufe', label: 'TÜFE', type: 'line' },
            { key: 'fao', label: 'FAO Gıda Endeksi', type: 'line' },
          ]}
        />
      </div>
    </div>
  );
}
