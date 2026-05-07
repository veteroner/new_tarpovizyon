import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
} from 'recharts';
import { COLORS, formatNumber } from './beekeepingTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type TreemapItem = { name: string; children: { name: string; size: number; yield: number; hives: number; beekeepers: number }[] };

export function BeekeepingProductivitySection({ treemapData }: { treemapData: TreemapItem[] }) {
  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          ⚡ Verimlilik Analizi
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Kovan sayısı, bal verimi ve toplam üretim ilişkisi
        </p>
      </div>

      <div style={{ 
        background: 'var(--bg-card)', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
            📍 İl Bazlı Bal Üretim Haritası
          </h3>
          <ChartInsightButton title="📍 İl Bazlı Bal Üretim Haritası" description="Treemap: il bazlı bal üretim dağılımı" data={treemapData} context={{ section: 'İl Dağılım' }} compact />
        </div>
        <ResponsiveContainer width="100%" height={500}>
          <Treemap
            data={treemapData}
            dataKey="size"
            stroke="#fff"
            fill={COLORS.primary}
            content={(props: { x?: number; y?: number; width?: number; height?: number; name?: string; size?: number; yield?: number; beekeepers?: number }) => {
              const { x = 0, y = 0, width = 0, height = 0, name, size, yield: yieldVal, beekeepers } = props;
              if (!name || name === 'Türkiye') return <g />;
              
              const getColor = (yieldValue: number) => {
                if (yieldValue >= 20) return '#059669';
                if (yieldValue >= 15) return '#10b981';
                if (yieldValue >= 10) return '#fbbf24';
                if (yieldValue >= 7) return '#f59e0b';
                return '#f97316';
              };

              const fontSize = width > 80 ? 12 : width > 60 ? 10 : 0;
              const showDetails = width > 100 && height > 60;
              const yieldNumber = Number(yieldVal) || 0;
              const sizeNumber = Number(size) || 0;
              const beekeepersNumber = Number(beekeepers) || 0;
              
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                      fill: getColor(yieldNumber),
                      stroke: '#fff',
                      strokeWidth: 2,
                      cursor: 'pointer',
                    }}
                  />
                  {fontSize > 0 && (
                    <>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 - (showDetails ? 15 : 0)}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={fontSize}
                        fontWeight="700"
                      >
                        {name}
                      </text>
                      {showDetails && (
                        <>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 5}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={fontSize - 2}
                            fontWeight="600"
                          >
                            {formatNumber(sizeNumber)} ton
                          </text>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 20}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.9)"
                            fontSize={fontSize - 3}
                          >
                            🐝 {formatNumber(beekeepersNumber)} | {yieldNumber.toFixed(1)} kg/kovan
                          </text>
                        </>
                      )}
                    </>
                  )}
                </g>
              );
            }}
          >
            <Tooltip
              content={({ payload }) => {
                if (!payload || !payload[0]) return null;
                const data = payload[0].payload;
                if (data.name === 'Türkiye') return null;
                
                return (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '2px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                      📍 {data.name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>🍯 <strong>Bal Üretimi:</strong> {formatNumber(data.size)} ton</div>
                      <div>📊 <strong>Verim:</strong> {(data.yield || 0).toFixed(1)} kg/kovan</div>
                      <div>🪔 <strong>Kovan:</strong> {formatNumber(data.hives)}</div>
                      <div>🐝 <strong>Arıcı:</strong> {formatNumber(data.beekeepers)}</div>
                    </div>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ width: 16, height: 16, background: '#059669', borderRadius: '4px' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Çok Yüksek Verim (≥20 kg)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ width: 16, height: 16, background: '#10b981', borderRadius: '4px' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Yüksek Verim (15-20 kg)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ width: 16, height: 16, background: '#fbbf24', borderRadius: '4px' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Orta Verim (10-15 kg)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ width: 16, height: 16, background: '#f59e0b', borderRadius: '4px' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Düşük-Orta (7-10 kg)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ width: 16, height: 16, background: '#f97316', borderRadius: '4px' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Düşük Verim (&lt;7 kg)</span>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '12px', textAlign: 'center' }}>
          ℹ️ Alan büyüklüğü bal üretim miktarını, renk ise kovan başına verimi göstermektedir
        </div>
      </div>
    </>
  );
}
