import { normalizeTurkish } from '../../pages/basin/basinUtils';

export type DistrictFeature = {
  type: 'Feature';
  properties?: { name?: string; NAME?: string; province?: string };
  geometry: { type: string; coordinates: unknown };
};

/** turkey_districts.json includes two features tagged to Muğla that aren't
 *  actually Turkish districts and cause the map to draw Greek islands hanging off
 *  the Aegean coast: the Kalymnos regional unit (Greek-script name) and "Kara Ada".
 *  Drop them, exactly as the main app's basin DistrictMap does — but only for
 *  Muğla, so Muş districts (which also start with "Mu") are unaffected. */
export function shouldExcludeDistrict(feature: DistrictFeature): boolean {
  const districtName = feature.properties?.name || feature.properties?.NAME || '';
  const provinceName = feature.properties?.province || '';
  if (normalizeTurkish(provinceName) !== 'mugla') return false;
  if (normalizeTurkish(districtName) === 'kara ada') return true;
  return /[Ͱ-Ͽ]/.test(districtName); // Greek script → not a Turkish district
}

// Same linear lon/lat → pixel transform as the main app's basin DistrictMap —
// d3-geo's geoPath/geoMercator was tried first, but turkey_districts.json has
// inconsistent ring winding order on ~half its polygons, which makes d3's clip
// algorithm paint a full background rectangle behind them. A plain linear
// transform sidesteps that entirely since SVG's own fill-rule doesn't care about
// winding direction for simple (non-clipped) shapes.
export function pathFor(geometry: DistrictFeature['geometry']): string | null {
  const coords = geometry?.coordinates;
  if (!coords) return null;
  const polygons = geometry.type === 'Polygon' ? [coords] : (coords as unknown[]);
  return (polygons as unknown[][]).map((polygon) =>
    (polygon as unknown[][]).map((ring) =>
      (ring as number[][]).map((point, i) => {
        const x = (point[0] - 25) * 50 + 50;
        const y = (43 - point[1]) * 80 + 50;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      }).join(' ')
    ).join(' Z ') + ' Z'
  ).join(' ');
}
