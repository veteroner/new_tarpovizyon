import { type KpiMetrics, COLORS, formatNumber, formatTon } from './beekeepingTypes';

export function BeekeepingKpiCards({ kpiMetrics }: { kpiMetrics: KpiMetrics }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
      gap: '20px', 
      marginBottom: '32px' 
    }}>
      {/* Total Beekeepers */}
      <div style={{ 
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`, 
        padding: '24px', 
        borderRadius: '14px',
        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🐝</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
            TOPLAM ARICI SAYISI
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
            {formatNumber(kpiMetrics.totalBeekeepers)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
            {kpiMetrics.beekeeperGrowth >= 0 ? '+' : ''}{kpiMetrics.beekeeperGrowth.toFixed(1)}% (2023 vs 2022)
          </div>
        </div>
      </div>

      {/* Total Hives */}
      <div style={{ 
        background: `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.primary} 100%)`, 
        padding: '24px', 
        borderRadius: '14px',
        boxShadow: '0 4px 16px rgba(251, 191, 36, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🪔</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
            TOPLAM KOVAN SAYISI
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
            {formatNumber(kpiMetrics.totalHives)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
            Aktif Kovan (2023)
          </div>
        </div>
      </div>

      {/* Honey Production */}
      <div style={{ 
        background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.emerald} 100%)`, 
        padding: '24px', 
        borderRadius: '14px',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🍯</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
            BAL ÜRETİMİ
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
            {formatTon(kpiMetrics.totalHoneyProduction)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
            Yıllık Toplam (2023)
          </div>
        </div>
      </div>

      {/* Beeswax Production */}
      <div style={{ 
        background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.cyan} 100%)`, 
        padding: '24px', 
        borderRadius: '14px',
        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🕯️</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
            BALMUMU ÜRETİMİ
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
            {formatTon(kpiMetrics.totalBeeswaxProduction)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
            Yıllık Toplam (2023)
          </div>
        </div>
      </div>
    </div>
  );
}
