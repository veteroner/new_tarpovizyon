import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { normalizeCountryKey } from '../utils/countryTranslations';

type GeoFeature = {
  type: 'Feature';
  properties?: { name?: string };
  geometry: unknown;
};

type GeoFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoFeature[];
};

let cachedGeo: GeoFeatureCollection | null = null;
let cachedPromise: Promise<GeoFeatureCollection> | null = null;

function loadGeo(): Promise<GeoFeatureCollection> {
  if (cachedGeo) return Promise.resolve(cachedGeo);
  if (cachedPromise) return cachedPromise;
  cachedPromise = fetch('/world.geojson')
    .then(r => r.json() as Promise<GeoFeatureCollection>)
    .then(g => { cachedGeo = g; return g; });
  return cachedPromise;
}

export interface CountrySilhouetteProps {
  countryKey: string; // toWorldGeoCountryKey output (already normalized)
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  className?: string;
}

export function CountrySilhouette({
  countryKey,
  width = 320,
  height = 220,
  fill = 'var(--accent, #8b5cf6)',
  stroke = 'rgba(255,255,255,0.6)',
  className,
}: CountrySilhouetteProps) {
  const [geo, setGeo] = useState<GeoFeatureCollection | null>(cachedGeo);

  useEffect(() => {
    let cancelled = false;
    if (!geo) {
      loadGeo().then(g => { if (!cancelled) setGeo(g); }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [geo]);

  const pathD = useMemo(() => {
    if (!geo || !countryKey) return null;
    const target = normalizeCountryKey(countryKey);
    const feature = geo.features.find(f => normalizeCountryKey(f.properties?.name || '') === target);
    if (!feature) return null;
    const projection = geoMercator().fitSize([width - 8, height - 8], feature as unknown as GeoJSON.GeoJsonObject);
    const path = geoPath(projection);
    return path(feature as unknown as GeoJSON.GeoJsonObject);
  }, [geo, countryKey, width, height]);

  if (!geo) {
    return (
      <div
        className={className}
        style={{
          width, height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', fontSize: 12,
        }}
      >
        Harita yükleniyor…
      </div>
    );
  }

  if (!pathD) {
    return (
      <div
        className={className}
        style={{
          width, height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', fontSize: 12,
          border: '1px dashed var(--border)', borderRadius: 8,
        }}
      >
        Bu ülke için şekil bulunamadı
      </div>
    );
  }

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      <g transform="translate(4,4)">
        <path
          d={pathD}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 4px 8px rgba(139,92,246,0.25))' }}
        />
      </g>
    </svg>
  );
}

export default CountrySilhouette;
