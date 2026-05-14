import type { TuikEggData } from './eggProductionTypes';

interface EggIntelligencePanelProps {
  tuikData: TuikEggData[];
}

export function EggIntelligencePanel({ tuikData }: EggIntelligencePanelProps) {
  if (tuikData.length === 0) return null;

  const lastYear = tuikData[0];
  const firstYear = tuikData[tuikData.length - 1];
  const years = tuikData.length - 1;

  const eggCAGR = years > 0
    ? ((Math.pow(lastYear.eggProduction / firstYear.eggProduction, 1 / years) - 1) * 100)
    : 0;

  const validLayerData = tuikData.filter(d => d.layerCount > 0);
  const layerCAGR = validLayerData.length >= 2
    ? ((Math.pow(validLayerData[0].layerCount / validLayerData[validLayerData.length - 1].layerCount, 1 / (validLayerData.length - 1)) - 1) * 100)
    : 0;

  const yieldChange = lastYear.yieldPerBird - firstYear.yieldPerBird;
  const denomForHybrid = lastYear.layerCount > 0 ? lastYear.layerCount :
    (lastYear.nativeLayer + lastYear.hybridLayer > 0 ? lastYear.nativeLayer + lastYear.hybridLayer : 0);
  const hybridShare = denomForHybrid > 0 ? (lastYear.hybridLayer / denomForHybrid) * 100 : 0;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '24px',
      marginTop: '24px',
      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🧠 Yumurta İçgörü Özeti
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>YUMURTA CAGR</div>
          <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{eggCAGR.toFixed(1)}%</div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>{years} Yıl Büyüme</div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>TAVUK CAGR</div>
          <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{layerCAGR.toFixed(1)}%</div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Popülasyon ({years}Y)</div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>VERİM ARTIŞI</div>
          <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{yieldChange > 0 ? '+' : ''}{yieldChange.toFixed(0)}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Adet/Tavuk/Yıl</div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>HİBRİT PAYI</div>
          <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{hybridShare.toFixed(1)}%</div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Modernizasyon</div>
        </div>
      </div>
    </div>
  );
}
