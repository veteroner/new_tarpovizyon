import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { getRegionByProvince } from '../utils/productionCategories';

type GeoFeature = {
  type: 'Feature';
  properties?: {
    Name?: string;
    [key: string]: unknown;
  };
  geometry: unknown;
};

type GeoFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoFeature[];
};

export type RegionTotal = {
  name: string;
  value: number;
  unit?: string;
};

type TooltipState = {
  province: string;
  region?: string;
  value?: number;
  unitLabel: string;
} | null;

// CC0 dataset (province borders): https://github.com/uyasarkocal/borders-of-turkey
const GEO_URL = 'https://raw.githubusercontent.com/uyasarkocal/borders-of-turkey/master/lvl1-TR.geojson';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 450;

function normalizeTr(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeProvinceName(province: string): string {
  // Fix common misspellings
  if (province === 'Zinguldak') return 'Zonguldak';
  return province;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function blueRamp(t: number): string {
  // Light -> Dark blues in HSL
  const tt = clamp01(t);
  const lightness = 92 - 45 * tt;
  return `hsl(210 80% ${lightness}%)`;
}

export function TurkeyHeatMap({
  regionTotals,
  unitLabel = 'baş',
  height = 360,
}: {
  regionTotals: RegionTotal[];
  unitLabel?: string;
  height?: number;
}) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(GEO_URL)
      .then(async res => {
        if (!res.ok) throw new Error(`Failed to fetch GeoJSON: ${res.status}`);
        return (await res.json()) as GeoFeatureCollection;
      })
      .then(json => {
        if (!cancelled) setGeoData(json);
      })
      .catch(() => {
        if (!cancelled) setGeoData(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { valueByRegionKey, minValue, maxValue } = useMemo(() => {
    const byKey = new Map<string, number>();

    for (const item of regionTotals) {
      const key = normalizeTr(item.name);
      byKey.set(key, Number(item.value) || 0);
    }

    const values = Array.from(byKey.values()).filter(v => Number.isFinite(v) && v > 0);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;

    return {
      valueByRegionKey: byKey,
      minValue: min,
      maxValue: max,
    };
  }, [regionTotals]);

  const getFill = (value?: number) => {
    if (!value || !Number.isFinite(value) || value <= 0) return 'var(--border)';
    if (minValue === maxValue) return blueRamp(0.65);
    const t = (value - minValue) / (maxValue - minValue);
    return blueRamp(t);
  };

  const pathGenerator = useMemo(() => {
    if (!geoData?.features?.length) return null;

    const projection = geoMercator();
    try {
      projection.fitSize([MAP_WIDTH, MAP_HEIGHT], geoData as unknown as GeoPermissibleObjects);
    } catch {
      projection.center([35, 39]).scale(2200).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
    }
    return geoPath(projection);
  }, [geoData]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ width: '100%', height }}>
        {!geoData || !pathGenerator ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              border: '1px dashed var(--card-border)',
              borderRadius: 12,
            }}
          >
            Harita yükleniyor…
          </div>
        ) : (
          <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} style={{ width: '100%', height: '100%' }}>
            {geoData.features.map((feature, idx) => {
              const rawProvince = String(feature.properties?.Name ?? '').trim();
              const province = normalizeProvinceName(rawProvince);
              const provinceKey = normalizeTr(province);
              const regionName = getRegionByProvince(province);
              const regionKey = normalizeTr(regionName);
              const value = valueByRegionKey.get(provinceKey) ?? valueByRegionKey.get(regionKey);

              const d = pathGenerator(feature as unknown as GeoPermissibleObjects);
              if (!d) return null;

              return (
                <path
                  key={`${provinceKey || 'p'}-${idx}`}
                  d={d}
                  fill={getFill(value)}
                  stroke="var(--border)"
                  strokeOpacity={0.9}
                  strokeWidth={1.1}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: 'default', outline: 'none' }}
                  onMouseEnter={() => {
                    setTooltip({
                      province: province || '—',
                      region: regionName || undefined,
                      value,
                      unitLabel,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Simple legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginTop: '0.75rem',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
        }}
      >
        <span>{minValue ? Math.round(minValue).toLocaleString('tr-TR') : '0'}</span>
        <div
          aria-hidden
          style={{
            flex: 1,
            height: 10,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${blueRamp(0)} 0%, ${blueRamp(1)} 100%)`,
            border: '1px solid var(--card-border)',
          }}
        />
        <span>{maxValue ? Math.round(maxValue).toLocaleString('tr-TR') : '0'}</span>
      </div>

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(17, 24, 39, 0.92)',
            color: 'white',
            padding: '0.6rem 0.75rem',
            borderRadius: '0.75rem',
            maxWidth: 260,
            pointerEvents: 'none',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tooltip.province}</div>
          {tooltip.region && (
            <div style={{ opacity: 0.9, marginTop: 2, fontSize: '0.85rem' }}>{tooltip.region}</div>
          )}
          <div style={{ marginTop: 6, fontSize: '0.9rem' }}>
            {tooltip.value != null && Number.isFinite(tooltip.value)
              ? `${Math.round(tooltip.value).toLocaleString('tr-TR')} ${tooltip.unitLabel}`
              : 'Veri yok'}
          </div>
        </div>
      )}
    </div>
  );
}
