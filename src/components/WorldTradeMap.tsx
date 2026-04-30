import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { normalizeCountryKey, translateCountry } from '../utils/countryTranslations';

export type WorldTradeMetric = 'exportValue' | 'importValue' | 'balanceValue';

export type CountryTradeMetrics = {
  exportValue: number;
  importValue: number;
  balanceValue: number;
};

type GeoFeature = {
  type: 'Feature';
  properties?: {
    name?: string;
    [key: string]: unknown;
  };
  geometry: unknown;
};

type GeoFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoFeature[];
};

type TooltipState = {
  countryName: string;
  metrics: CountryTradeMetrics;
  x: number;
  y: number;
} | null;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function formatMoney(value: number): string {
  const v = Number(value) || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString('tr-TR')}`;
}

function pickFillForValue(value: number, min: number, max: number): string {
  const range = max - min;
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || range <= 0) {
    return 'var(--border-light)';
  }

  const t = clamp01((value - min) / range);

  if (t < 0.2) return 'var(--primary-light)';
  if (t < 0.4) return 'var(--primary)';
  if (t < 0.7) return 'var(--primary-dark)';
  return 'var(--purple)';
}

function pickDivergingFill(value: number, maxAbs: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(maxAbs) || maxAbs <= 0) {
    return 'var(--border-light)';
  }

  const t = clamp01(Math.abs(value) / maxAbs);

  if (Math.abs(value) < maxAbs * 0.05) return 'var(--border-light)';

  if (value < 0) {
    if (t < 0.35) return 'var(--error-light)';
    return 'var(--error)';
  }

  if (t < 0.35) return 'var(--success-light)';
  return 'var(--success)';
}

export function WorldTradeMap({
  metric,
  countryMetrics,
  selectedCountry,
  height = 420,
  onCountrySelect,
  onCountryHover,
  formatCountryLabel,
}: {
  metric: WorldTradeMetric;
  countryMetrics: Record<string, CountryTradeMetrics>; // key = normalized country name
  selectedCountry?: string; // normalized key
  height?: number;
  onCountrySelect?: (countryKey?: string) => void;
  onCountryHover?: (countryKey?: string) => void;
  formatCountryLabel?: (geoCountryName: string) => string;
}) {
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/world.geojson')
      .then(async res => {
        if (!res.ok) throw new Error('world geojson fetch failed');
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

  const width = 980;

  const projection = useMemo(() => {
    const proj = geoNaturalEarth1();
    if (geoData) {
      try {
        proj.fitSize([width, height], geoData as unknown as GeoPermissibleObjects);
      } catch {
        proj.scale(170).translate([width / 2, height / 2]);
      }
    } else {
      proj.scale(170).translate([width / 2, height / 2]);
    }
    return proj;
  }, [geoData, height]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const domain = useMemo(() => {
    const values = Object.values(countryMetrics).map(m => m[metric]).filter(v => Number.isFinite(v));
    if (values.length === 0) {
      return { min: 0, max: 0, maxAbs: 0 };
    }

    if (metric === 'balanceValue') {
      const maxAbs = Math.max(...values.map(v => Math.abs(v)));
      return { min: -maxAbs, max: maxAbs, maxAbs };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max, maxAbs: Math.max(Math.abs(min), Math.abs(max)) };
  }, [countryMetrics, metric]);

  const features = geoData?.features ?? [];

  const handleMove = (evt: ReactMouseEvent) => {
    if (!containerRef.current || !tooltip) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    setTooltip({ ...tooltip, x, y });
  };

  // Tooltip sınırlarını hesapla — containerRef mount sonrası hazır olur, fallback olarak prop kullanılır
  // eslint-disable-next-line react-hooks/refs
  const tooltipMaxLeft = (containerRef.current?.clientWidth ?? width) - 260;
  // eslint-disable-next-line react-hooks/refs
  const tooltipMaxTop = (containerRef.current?.clientHeight ?? height) - 140;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
      onMouseMove={handleMove}
      onMouseLeave={() => {
        setTooltip(null);
        onCountryHover?.(undefined);
      }}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Dünya Haritası</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Hover: İhracat / İthalat / Denge • Click: ülke seç/temizle
        </div>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', background: 'var(--bg-secondary)' }}
      >
        <g>
          {features.map((feat, idx) => {
            const name = String(feat.properties?.name || '').trim();
            const key = normalizeCountryKey(name);
            const metrics = countryMetrics[key];
            const isSelected = Boolean(selectedCountry) && key === selectedCountry;

            const fill = metrics
              ? (metric === 'balanceValue'
                  ? pickDivergingFill(metrics.balanceValue, domain.maxAbs)
                  : pickFillForValue(metrics[metric], domain.min, domain.max))
              : 'var(--border-light)';

            const stroke = isSelected ? 'var(--text-primary)' : 'var(--border)';
            const strokeWidth = isSelected ? 1.6 : 0.6;

            const d = pathGen(feat as unknown as GeoPermissibleObjects);
            if (!d) return null;

            return (
              <path
                key={`${key || idx}-${idx}`}
                d={d}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                style={{ cursor: metrics ? 'pointer' : 'default' }}
                onMouseEnter={(e) => {
                  if (!metrics) return;
                  const rect = (containerRef.current?.getBoundingClientRect()) ?? { left: 0, top: 0 };
                  setTooltip({
                    countryName: name,
                    metrics,
                    x: (e.clientX - rect.left),
                    y: (e.clientY - rect.top),
                  });
                  onCountryHover?.(key);
                }}
                onClick={() => {
                  if (!metrics) return;
                  const next = isSelected ? undefined : key;
                  onCountrySelect?.(next);
                }}
              />
            );
          })}
        </g>
      </svg>

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(8, Math.min(tooltip.x + 12, tooltipMaxLeft)),
            top: Math.max(8, Math.min(tooltip.y + 12, tooltipMaxTop)),
            width: 248,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: 12,
            padding: 12,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            {formatCountryLabel ? formatCountryLabel(tooltip.countryName) : translateCountry(tooltip.countryName)}
          </div>
          <div style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div><span style={{ fontWeight: 700 }}>İhracat:</span> {formatMoney(tooltip.metrics.exportValue)}</div>
            <div><span style={{ fontWeight: 700 }}>İthalat:</span> {formatMoney(tooltip.metrics.importValue)}</div>
            <div><span style={{ fontWeight: 700 }}>Denge:</span> {formatMoney(tooltip.metrics.balanceValue)}</div>
          </div>
        </div>
      )}

      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12 }}>
        Renk: {metric === 'exportValue' ? 'İhracat Değeri' : metric === 'importValue' ? 'İthalat Değeri' : 'Denge'}
      </div>
    </div>
  );
}
