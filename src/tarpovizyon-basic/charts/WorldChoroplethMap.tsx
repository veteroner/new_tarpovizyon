import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { normalizeCountryKey, toWorldGeoCountryKey, translateCountry } from '../../utils/countryTranslations';
import { resolveFaoCountryKey } from './faoCountryOverrides';

type GeoFeature = { type: 'Feature'; properties?: { name?: string }; geometry: unknown };
type GeoFeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] };

const COLOR_STEPS = ['#c7e9c0', '#78c679', '#f9d371', '#f4895f', '#de425b'];

// Country metrics vary wildly in shape — production totals are heavily right-skewed
// (one or two dominant countries, a long tail), while per-unit yields cluster in a
// narrow band. A fixed value/max (or log) scale looks great for one shape and crams
// everything into a single color for the other. Quantile buckets (equal country count
// per color, breakpoints from the actual data) adapt to either shape automatically —
// the standard approach for choropleth maps.
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

export function WorldChoroplethMap({ values, height = 360 }: { values: Record<string, number>; height?: number }) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [hover, setHover] = useState<{ name: string; value: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}world.geojson`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setGeoData(json); })
      .catch(() => { if (!cancelled) setGeoData(null); });
    return () => { cancelled = true; };
  }, []);

  const width = 900;
  const geoKeySet = useMemo(
    () => new Set((geoData?.features ?? []).map((f) => normalizeCountryKey(String(f.properties?.name || '')))),
    [geoData]
  );
  const byGeoKey = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [name, value] of Object.entries(values)) {
      const override = resolveFaoCountryKey(name);
      const fallback = toWorldGeoCountryKey(name);
      const key = geoKeySet.has(override) ? override : geoKeySet.has(fallback) ? fallback : override;
      map[key] = value;
    }
    return map;
  }, [values, geoKeySet]);

  const sortedValues = useMemo(
    () => Object.values(values).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b),
    [values]
  );
  const max = sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : 0;
  const breaks = useMemo(() => quantileBreaks(sortedValues), [sortedValues]);

  const projection = useMemo(() => {
    const proj = geoNaturalEarth1();
    if (geoData) {
      try {
        proj.fitSize([width, height], geoData as unknown as GeoPermissibleObjects);
      } catch {
        proj.scale(140).translate([width / 2, height / 2]);
      }
    } else {
      proj.scale(140).translate([width / 2, height / 2]);
    }
    return proj;
  }, [geoData, height]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);
  const features = geoData?.features ?? [];

  return (
    <div ref={containerRef} className="tvb-map" onMouseLeave={() => setHover(null)}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {features.map((feat, idx) => {
          const geoName = String(feat.properties?.name || '');
          const key = normalizeCountryKey(geoName);
          const value = byGeoKey[key];
          const d = pathGen(feat as unknown as GeoPermissibleObjects);
          if (!d) return null;
          return (
            <path
              key={idx}
              d={d}
              fill={value !== undefined ? colorFor(value, breaks) : '#eef0f2'}
              stroke="#fff"
              strokeWidth={0.4}
              onMouseEnter={(e) => {
                if (value === undefined) return;
                const rect = containerRef.current?.getBoundingClientRect();
                setHover({ name: translateCountry(geoName), value, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) });
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
