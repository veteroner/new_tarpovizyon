import { useState, useEffect, useMemo } from 'react';
import { normalizeTurkish } from './basinUtils';
import type { BasinData } from './basinUtils';

interface DistrictMapProps {
  basinData: BasinData[];
  basinColors: Record<string, string>;
  filterBasin?: string;
  filterProvince?: string;
  filterDistrict?: string;
  selectedDistrict?: string | null;
  onDistrictClick?: (district: string, province: string, basin: string) => void;
}

export default function DistrictMap({ basinData, basinColors, filterBasin, filterProvince, filterDistrict, selectedDistrict, onDistrictClick }: DistrictMapProps) {
  const [geoData, setGeoData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ district: string; basin: string; province: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const shouldExcludeDistrictFeature = (feature: Record<string, unknown>) => {
    const properties = feature?.properties as Record<string, string> | undefined;
    const districtName = properties?.name || properties?.NAME || '';
    const provinceName = properties?.province || '';
    const normalizedProvince = normalizeTurkish(provinceName);
    const normalizedDistrict = normalizeTurkish(districtName);

    if (normalizedProvince !== 'mugla') return false;

    if (normalizedDistrict === 'kara ada') return true;

    const hasGreekChars = /[\u0370-\u03FF]/.test(districtName);
    return hasGreekChars;
  };

  useEffect(() => {
    fetch('/turkey_districts.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('District GeoJSON load error:', err);
        setLoading(false);
      });
  }, []);

  // Create district-to-basin mapping
  const districtBasinMap = useMemo(() => {
    const map = new Map<string, { basin: string; color: string; province: string }>();
    
    const districtOverrides: Record<string, string> = {
      'eyupsultan': 'eyup',
      'kahramankazan': 'kazan',
      'yesilyu rt': 'yesilyurt',
      'elazig merkez': 'elazig',
    };
    
    const newDistrictBasins: Record<string, string> = {
      'aksaray-sultanhani':   'ORTA ANADOLU HAVZASI',
      'artvin-kemalpasa':     'CORUH HAVZASI',
      'elazig-aricak':        'FIRAT HAVZASI',
      'hakkari-derecik':      'ZAP HAVZASI',
      'hatay-defne':          'DOGU AKDENIZ HAVZASI',
      'hatay-arsuz':          'KIYI AKDENIZ HAVZASI',
      'hatay-payas':          'KIYI AKDENIZ HAVZASI',
      'mardin-artuklu':       'KARACADAG HAVZASI',
      'sanliurfa-haliliye':   'GAP HAVZASI',
      'sanliurfa-eyyubiye':   'GAP HAVZASI',
      'sanliurfa-karakopru':  'GAP HAVZASI',
      'siirt-tillo':          'KARACADAG HAVZASI',
      'yozgat-akdagmadeni':   'ORTA KIZILIRMAK HAVZASI',
      'yozgat-cayiralan':     'ORTA KIZILIRMAK HAVZASI',
      'zonguldak-kozlu':      'BATI KARADENIZ HAVZASI',
      'zonguldak-kilimli':    'BATI KARADENIZ HAVZASI',
    };

    Object.entries(newDistrictBasins).forEach(([key, basinNameNormalized]) => {
      const normalizedLookup = basinNameNormalized.toLowerCase();
      const realBasinName = Object.keys(basinColors).find(
        bn => normalizeTurkish(bn) === normalizedLookup
      ) || basinNameNormalized;
      const [provKey] = key.split('-');
      map.set(key, {
        basin: realBasinName,
        color: basinColors[realBasinName] || '#95a5a6',
        province: provKey
      });
    });

    basinData.forEach(item => {
      const normalizedProvince = normalizeTurkish(item.provinceName);
      const rawDistrict = item.districtName.replace(/\s*\/\s*[^/]+$/, '').trim();
      const normalizedDistrict = normalizeTurkish(rawDistrict);
      
      const value = {
        basin: item.basinName,
        color: basinColors[item.basinName] || '#95a5a6',
        province: item.provinceName
      };
      
      map.set(`${normalizedProvince}-${normalizedDistrict}`, value);
      
      const fullNormalized = normalizeTurkish(item.districtName);
      if (fullNormalized !== normalizedDistrict) {
        map.set(`${normalizedProvince}-${fullNormalized}`, value);
      }
      
      Object.entries(districtOverrides).forEach(([geoKey, dbKey]) => {
        if (dbKey === normalizedDistrict) {
          map.set(`${normalizedProvince}-${geoKey}`, value);
        }
      });
    });
    
    return map;
  }, [basinData, basinColors]);

  const filteredFeatures = useMemo(() => {
    if (!geoData?.features) return [];
    const features = geoData.features as Record<string, unknown>[];
    return features.filter((feature: Record<string, unknown>) => !shouldExcludeDistrictFeature(feature));
  }, [geoData, shouldExcludeDistrictFeature]);

  if (loading) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--text-secondary)'
      }}>
        🗺️ İlçe haritası yükleniyor...
      </div>
    );
  }

  if (!geoData) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--error)'
      }}>
        ❌ İlçe haritası yüklenemedi
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg 
        viewBox="0 0 1200 700" 
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          aspectRatio: '1200 / 700',
          background: 'var(--bg-secondary)',
          borderRadius: '12px'
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {/* Pass 1: fat same-color stroke to fill coordinate gaps between adjacent districts */}
        {filteredFeatures.map((feature: Record<string, unknown>, idx: number) => {
          const properties = feature.properties as Record<string, string> | undefined;
          const districtName = properties?.name || properties?.NAME || '';
          const provinceName = properties?.province || '';
          const key = `${normalizeTurkish(provinceName)}-${normalizeTurkish(districtName)}`;
          const basinInfo = districtBasinMap.get(key);
          const color = basinInfo?.color || 'transparent';
          if (!basinInfo) return null;

          const geometry = feature.geometry as Record<string, unknown> | undefined;
          const coords = geometry?.coordinates;
          if (!coords) return null;
          const geomType = geometry?.type;
          const polygons = geomType === 'Polygon' ? [coords] : coords;
          const pathData = (polygons as unknown[][]).map((polygon: unknown[]) =>
            (polygon as unknown[][]).map((ring: unknown[]) =>
              (ring as number[][]).map((point: number[], i: number) => {
                const x = (point[0] - 25) * 50 + 50;
                const y = (43 - point[1]) * 80 + 50;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ')
            ).join(' Z ') + ' Z'
          ).join(' ');

          return (
            <path
              key={`gap-${idx}`}
              d={pathData}
              fill={color}
              stroke={color}
              strokeWidth={14}
              strokeLinejoin="round"
              strokeLinecap="round"
              paintOrder="stroke"
            />
          );
        })}

        {/* Pass 2: thin white borders + hover + click interaction */}
        {filteredFeatures.map((feature: Record<string, unknown>, idx: number) => {
          const properties = feature.properties as Record<string, string> | undefined;
          const districtName = properties?.name || properties?.NAME || '';
          const provinceName = properties?.province || '';
          const key = `${normalizeTurkish(provinceName)}-${normalizeTurkish(districtName)}`;
          const basinInfo = districtBasinMap.get(key);
          if (!basinInfo) return null;

          const matchesBasin = !filterBasin || filterBasin === 'Tümü' || basinInfo.basin === filterBasin;
          const matchesProvince = !filterProvince || filterProvince === 'Tümü' || basinInfo.province === provinceName;
          const matchesDistrict = !filterDistrict || filterDistrict === 'Tümü' || districtName === filterDistrict;
          const isFiltered = !matchesBasin || !matchesProvince || !matchesDistrict;
          const isSelected = selectedDistrict === `${provinceName}||${districtName}`;

          const color = basinInfo.color;

          const geometry = feature.geometry as Record<string, unknown> | undefined;
          const coords = geometry?.coordinates;
          if (!coords) return null;
          const geomType = geometry?.type;
          const polygons = geomType === 'Polygon' ? [coords] : coords;
          const pathData = (polygons as unknown[][]).map((polygon: unknown[]) =>
            (polygon as unknown[][]).map((ring: unknown[]) =>
              (ring as number[][]).map((point: number[], i: number) => {
                const x = (point[0] - 25) * 50 + 50;
                const y = (43 - point[1]) * 80 + 50;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ')
            ).join(' Z ') + ' Z'
          ).join(' ');

          return (
            <path
              key={`border-${idx}`}
              d={pathData}
              fill={color}
              stroke={isSelected ? 'white' : 'rgba(255,255,255,0.7)'}
              strokeWidth={isSelected ? 2.5 : 0.6}
              strokeLinejoin="round"
              opacity={isFiltered ? 0.12 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => {
                if (!isFiltered) {
                  e.currentTarget.style.filter = 'brightness(1.2)';
                  e.currentTarget.style.stroke = 'white';
                  e.currentTarget.style.strokeWidth = '1.5';
                  setTooltip({ district: districtName, basin: basinInfo.basin, province: basinInfo.province });
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = '';
                e.currentTarget.style.stroke = isSelected ? 'white' : 'rgba(255,255,255,0.7)';
                e.currentTarget.style.strokeWidth = isSelected ? '2.5' : '0.6';
                setTooltip(null);
              }}
              onClick={() => {
                if (!isFiltered && onDistrictClick) {
                  onDistrictClick(districtName, provinceName, basinInfo.basin);
                }
              }}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: mousePos.x + 15,
          top: mousePos.y + 15,
          background: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{tooltip.district}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>📍 {tooltip.province}</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>🌊 {tooltip.basin}</div>
        </div>
      )}
    </div>
  );
}
