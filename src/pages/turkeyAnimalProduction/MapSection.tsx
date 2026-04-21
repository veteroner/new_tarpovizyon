import React from 'react';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import { COLORS, MapFilterKey } from './turkeyAnimalProductionTypes';

interface MapSectionProps {
  mapData: { name: string; value: number }[];
  mapFilter: MapFilterKey;
  setMapFilter: (v: MapFilterKey) => void;
}

const MapSection: React.FC<MapSectionProps> = ({ mapData, mapFilter, setMapFilter }) => {
  if (mapData.length === 0) return null;

  const mapDescription = (() => {
    if (mapFilter === 'toplam') return 'Bölgelere göre toplam hayvan sayısı (Sığır + Manda + Koyun + Keçi)';
    if (mapFilter === 'kovan') return 'Bölgelere göre kovan sayısı';
    if (mapFilter === 'etTavugu') return 'Bölgelere göre et tavuğu sayısı';
    if (mapFilter === 'yumurtaTavugu') return 'Bölgelere göre yumurta tavuğu sayısı';
    const nameMap: Record<string, string> = { sigir: 'sığır', manda: 'manda', koyun: 'koyun', keci: 'keçi' };
    return `Bölgelere göre ${nameMap[mapFilter] || mapFilter} sayısı`;
  })();

  const filters: { key: MapFilterKey; label: string; color: string }[] = [
    { key: 'toplam', label: '🐄 Toplam', color: '#6b7280' },
    { key: 'sigir', label: '🐄 Sığır', color: COLORS['Sığır'] },
    { key: 'manda', label: '🐃 Manda', color: COLORS['Manda'] },
    { key: 'koyun', label: '🐑 Koyun', color: COLORS['Koyun'] },
    { key: 'keci', label: '🐐 Keçi', color: COLORS['Keçi'] },
    { key: 'kovan', label: '🐝 Kovan', color: COLORS['Bal'] },
    { key: 'etTavugu', label: '🍗 Et Tavuğu', color: '#ef4444' },
    { key: 'yumurtaTavugu', label: '🥚 Yumurta Tavuğu', color: '#fbbf24' },
  ];

  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          🗺️ İl Bazlı Dağılım
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {mapDescription}
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setMapFilter(filter.key)}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: mapFilter === filter.key ? `2px solid ${filter.color}` : '1px solid var(--border)',
                background: mapFilter === filter.key ? `${filter.color}15` : 'var(--bg-card)',
                color: mapFilter === filter.key ? filter.color : 'var(--text-secondary)',
                fontWeight: mapFilter === filter.key ? '600' : '500',
                fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '48px' }}>
        <TurkeyHeatMap regionTotals={mapData} unitLabel="Baş" height={450} />
      </div>
    </>
  );
};

export default MapSection;
