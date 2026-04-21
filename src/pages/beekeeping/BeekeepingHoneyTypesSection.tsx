import { HONEY_COLORS } from './beekeepingTypes';

export function BeekeepingHoneyTypesSection({ honeyTypesData }: { honeyTypesData: { name: string; count: number }[] }) {
  return (
    <>
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          🌺 Türkiye Bal Çeşitleri
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Türkiye'de üretilen bal çeşitleri ve illerdeki yaygınlığı
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        {honeyTypesData.slice(0, 12).map((ht, i) => (
          <div key={ht.name} style={{ 
            background: 'var(--bg-card)', 
            padding: '20px', 
            borderRadius: '14px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '4px', 
              background: HONEY_COLORS[i % HONEY_COLORS.length] 
            }}></div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: '900', 
              color: HONEY_COLORS[i % HONEY_COLORS.length],
              marginBottom: '6px'
            }}>
              {ht.count}
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: '600', 
              color: 'var(--text-primary)',
              lineHeight: 1.3
            }}>
              {ht.name}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              il üretiyor
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
