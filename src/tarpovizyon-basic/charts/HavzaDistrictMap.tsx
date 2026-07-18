import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeTurkish, BASIN_COLORS } from '../../pages/basin/basinUtils';
import { pathFor, shouldExcludeDistrict, type DistrictFeature } from './districtGeo';

type GeoFeatureCollection = { type: 'FeatureCollection'; features: DistrictFeature[] };

export type HavzaIlceRow = { havza: string; il: string; ilce: string };

const VISIBLE_LEGEND_COUNT = 8;

/** Turkey district map colored by havza (basin), using the same district-boundary
 *  geojson and basin color palette as the main dashboard's basin feature — kept
 *  visually identical, but data-fetched from our own D1-backed Worker instead of
 *  the raw-SQL-passthrough pattern the main app uses. */
export function HavzaDistrictMap({ rows }: { rows: HavzaIlceRow[] }) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [hover, setHover] = useState<{ ilce: string; il: string; havza: string; x: number; y: number } | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}turkey_districts.json`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setGeoData(json); })
      .catch(() => { if (!cancelled) setGeoData(null); });
    return () => { cancelled = true; };
  }, []);

  const byKey = useMemo(() => {
    const map = new Map<string, HavzaIlceRow>();
    rows.forEach((r) => {
      if (!r.havza) return;
      map.set(`${normalizeTurkish(r.il)}|${normalizeTurkish(r.ilce)}`, r);
    });
    return map;
  }, [rows]);

  // The geojson names a province's central district "<İl> Merkez" (e.g.
  // "Adıyaman Merkez"), but the API's ilçe column just says "Merkez" — a
  // direct key lookup missed this for ~51 provinces, leaving their central
  // (often largest) district unpainted white. Fall back to the province's
  // own "Merkez" row when the district name is exactly "<province> Merkez".
  const findMatch = (provinceName: string, districtName: string): HavzaIlceRow | undefined => {
    const direct = byKey.get(`${normalizeTurkish(provinceName)}|${normalizeTurkish(districtName)}`);
    if (direct) return direct;
    if (normalizeTurkish(districtName) === `${normalizeTurkish(provinceName)} merkez`) {
      return byKey.get(`${normalizeTurkish(provinceName)}|merkez`);
    }
    return undefined;
  };

  const features = geoData?.features ?? [];
  const withPaths = useMemo(
    () => features
      .filter((feat) => !shouldExcludeDistrict(feat))
      .map((feat) => ({ feat, d: pathFor(feat.geometry) }))
      .filter((f) => f.d),
    [features]
  );

  const basinNames = useMemo(() => Array.from(new Set(rows.map((r) => r.havza).filter(Boolean))).sort(), [rows]);

  // The API stores basin names with Turkish diacritics stripped ("DOGU
  // KARADENIZ", trailing spaces) while BASIN_COLORS keys carry proper Turkish
  // letters ("DOĞU KARADENİZ") — a direct key lookup missed ~17 of 30 basins,
  // leaving them on the gray fallback and indistinguishable. Match on the
  // normalized (accent-folded, trimmed) form so every basin gets its color.
  const colorForHavza = useMemo(() => {
    const normalized = new Map<string, string>();
    Object.entries(BASIN_COLORS).forEach(([k, v]) => normalized.set(normalizeTurkish(k), v));
    return (havza: string) => normalized.get(normalizeTurkish(havza)) || '#95a5a6';
  }, []);

  return (
    <div ref={containerRef} className="tvb-map" onMouseLeave={() => setHover(null)}>
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Pass 1: fat same-color stroke to fill coordinate gaps between adjacent districts */}
        {withPaths.map(({ feat, d }, idx) => {
          const districtName = String(feat.properties?.name || '');
          const provinceName = String(feat.properties?.province || '');
          const match = findMatch(provinceName, districtName);
          if (!match) return null;
          const color = colorForHavza(match.havza);
          return (
            <path key={`gap-${idx}`} d={d as string} fill={color} stroke={color} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" paintOrder="stroke" />
          );
        })}
        {/* Pass 2: thin borders + hover interaction */}
        {withPaths.map(({ feat, d }, idx) => {
          const districtName = String(feat.properties?.name || '');
          const provinceName = String(feat.properties?.province || '');
          const match = findMatch(provinceName, districtName);
          const color = match ? colorForHavza(match.havza) : '#eef0f2';
          return (
            <path
              key={`border-${idx}`}
              d={d as string}
              fill={color}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={0.6}
              strokeLinejoin="round"
              style={{ cursor: match ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                if (!match) return;
                const rect = containerRef.current?.getBoundingClientRect();
                setHover({ ilce: districtName, il: provinceName, havza: match.havza, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
              }}
            />
          );
        })}
      </svg>
      {hover && (
        <div className="tvb-map__tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <strong>{hover.ilce}</strong> / {hover.il}
          <br />
          {hover.havza}
        </div>
      )}
      <div className="tvb-map__legend tvb-map__legend--swatches">
        {/* 30 basins made this list a wall of text on mobile; a district's name
            is already shown via hover/tap on the map, so the always-visible
            legend only needs to name a color at a glance — collapse to a
            preview row by default and let the user expand the full list. */}
        {(legendExpanded ? basinNames : basinNames.slice(0, VISIBLE_LEGEND_COUNT)).map((b) => (
          <span key={b} className="tvb-map__swatch" title={b}>
            <i style={{ background: colorForHavza(b) }} />
            <span>{b}</span>
          </span>
        ))}
        {basinNames.length > VISIBLE_LEGEND_COUNT && (
          <button type="button" className="tvb-map__legend-toggle" onClick={() => setLegendExpanded((v) => !v)}>
            {legendExpanded ? 'Daha az göster' : `Tümünü göster (+${basinNames.length - VISIBLE_LEGEND_COUNT})`}
          </button>
        )}
      </div>
    </div>
  );
}
