import { type TuikKovanKpi } from './beekeepingTypes';

export function BeekeepingIntelligencePanel({ tuikKovanKpi }: { tuikKovanKpi: TuikKovanKpi }) {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '48px',
      marginBottom: '48px',
      color: 'white'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        🧠 Arıcılık İçgörü Özeti
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>KOVAN CAGR</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{tuikKovanKpi.cagr >= 0 ? '+' : ''}{tuikKovanKpi.cagr.toFixed(1)}%</div>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>SON YIL DEĞİŞİM</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{tuikKovanKpi.yoy >= 0 ? '+' : ''}{tuikKovanKpi.yoy.toFixed(1)}%</div>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Kovan sayısı artışı</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>ESKİ TİP KOVAN PAYI</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>%{tuikKovanKpi.eskiPay.toFixed(1)}</div>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Modernizasyon seviyesi</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BALMUMU DEĞİŞİM</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{tuikKovanKpi.balmumuYoy >= 0 ? '+' : ''}{tuikKovanKpi.balmumuYoy.toFixed(1)}%</div>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son yıl balmumu</div>
        </div>
      </div>
    </div>
  );
}
