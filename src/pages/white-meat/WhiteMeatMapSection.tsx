import { TurkeyHeatMap, type RegionTotal } from '../../components/TurkeyHeatMap';
import type { PoultryMapType } from './whiteMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type Props = {
  provincialPoultry: RegionTotal[];
  provincialBroilers: RegionTotal[];
  provincialLayers: RegionTotal[];
  poultryMapType: PoultryMapType;
  setPoultryMapType: (v: PoultryMapType) => void;
};

export default function WhiteMeatMapSection({ provincialPoultry, provincialBroilers, provincialLayers, poultryMapType, setPoultryMapType }: Props) {
  return (
    <div style={{ marginTop: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          🗺️ İl Bazlı Kanatlı Hayvan Varlığı Dağılımı
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['total', 'broiler', 'layer'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPoultryMapType(type)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: poultryMapType === type ? 'var(--primary)' : 'var(--bg-card)',
                color: poultryMapType === type ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {type === 'total' ? '🐔 Toplam' : type === 'broiler' ? '🍗 Et Tavuğu' : '🥚 Yumurta Tavuğu'}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>
            {poultryMapType === 'total' && 'Et Tavuğu + Yumurta Tavuğu (Toplam)'}
            {poultryMapType === 'broiler' && 'Et Tavuğu (Etlik Piliç)'}
            {poultryMapType === 'layer' && 'Yumurta Tavuğu (Yumurtacı Tavuk)'}
          </h3>
          <ChartInsightButton title="🗺️ İl Bazlı Kanatlı Hayvan Varlığı" description="Türkiye il bazlı kanatlı hayvan varlığı dağılımı" data={provincialPoultry} context={{ section: 'İl Dağılımı' }} compact />
        </div>
        {provincialPoultry.length === 0 && (
          <div style={{ marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            İl bazlı veriler yükleniyor…
          </div>
        )}
        <TurkeyHeatMap 
          regionTotals={
            poultryMapType === 'broiler' ? provincialBroilers :
            poultryMapType === 'layer' ? provincialLayers :
            provincialPoultry
          } 
          unitLabel="baş" 
          height={420} 
        />
      </div>
    </div>
  );
}
