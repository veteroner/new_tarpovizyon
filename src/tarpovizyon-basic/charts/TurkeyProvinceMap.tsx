import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeTurkish } from '../../pages/basin/basinUtils';
import { pathFor, shouldExcludeDistrict, type DistrictFeature } from './districtGeo';

type GeoFeatureCollection = { type: 'FeatureCollection'; features: DistrictFeature[] };

const COLOR_STEPS = ['#c7e9c0', '#78c679', '#f9d371', '#f4895f', '#de425b'];

function quantileBreaks(sortedValues: number[]): number[] {
  if (sortedValues.length === 0) return [];
  const breaks: number[] = [];
  for (let i = 1; i < COLOR_STEPS.length; i++) {
    const idx = Math.min(sortedValues.length - 1, Math.floor((i / COLOR_STEPS.length) * sortedValues.length));
    breaks.push(sortedValues[idx]);
  }
  return breaks;
}

function colorFor(value: number, breaks: number[]) {
  if (!Number.isFinite(value)) return '#e5e7eb';
  let idx = 0;
  while (idx < breaks.length && value > breaks[idx]) idx++;
  return COLOR_STEPS[Math.min(idx, COLOR_STEPS.length - 1)];
}

/** Province-level choropleth using the district-boundary geojson (no separate
 *  province polygon file exists) — every district within a province is painted
 *  the same color, which reads visually as a province map since adjacent
 *  same-province districts share borders. */
export function TurkeyProvinceMap({ values }: { values: Record<string, number> }) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [hover, setHover] = useState<{ name: string; value: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}turkey_districts.json`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setGeoData(json); })
      .catch(() => { if (!cancelled) setGeoData(null); });
    return () => { cancelled = true; };
  }, []);

  const byProvinceKey = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [name, value] of Object.entries(values)) map[normalizeTurkish(name)] = value;
    return map;
  }, [values]);

  const sortedValues = useMemo(
    () => Object.values(values).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b),
    [values]
  );
  const max = sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : 0;
  const breaks = useMemo(() => quantileBreaks(sortedValues), [sortedValues]);

  const features = geoData?.features ?? [];
  const withPaths = useMemo(
    () => features
      .filter((feat) => !shouldExcludeDistrict(feat))
      .map((feat) => ({ feat, d: pathFor(feat.geometry) }))
      .filter((f) => f.d),
    [features]
  );

  return (
    <div ref={containerRef} className="tvb-map" onMouseLeave={() => setHover(null)}>
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Pass 1: fat same-color stroke to fill coordinate gaps between adjacent districts */}
        {withPaths.map(({ feat, d }, idx) => {
          const provinceName = String(feat.properties?.province || '');
          const value = byProvinceKey[normalizeTurkish(provinceName)];
          const color = value !== undefined ? colorFor(value, breaks) : '#eef0f2';
          return (
            <path key={`gap-${idx}`} d={d as string} fill={color} stroke={color} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" paintOrder="stroke" />
          );
        })}
        {/* Pass 2: thin borders + hover interaction */}
        {withPaths.map(({ feat, d }, idx) => {
          const provinceName = String(feat.properties?.province || '');
          const value = byProvinceKey[normalizeTurkish(provinceName)];
          const color = value !== undefined ? colorFor(value, breaks) : '#eef0f2';
          return (
            <path
              key={`border-${idx}`}
              d={d as string}
              fill={color}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={0.6}
              strokeLinejoin="round"
              style={{ cursor: value !== undefined ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                if (value === undefined) return;
                const rect = containerRef.current?.getBoundingClientRect();
                setHover({ name: provinceName, value, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
              }}
            />
          );
        })}
      </svg>
      {hover && (
        <div className="tvb-map__tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <strong>{hover.name}</strong>: {new Intl.NumberFormat('tr-TR').format(hover.value)}
        </div>
      )}
      <div className="tvb-map__legend">
        <span>0</span>
        <div className="tvb-map__legend-bar">
          {COLOR_STEPS.map((c) => <span key={c} style={{ background: c }} />)}
        </div>
        <span>{new Intl.NumberFormat('tr-TR').format(max)}</span>
      </div>
    </div>
  );
}
