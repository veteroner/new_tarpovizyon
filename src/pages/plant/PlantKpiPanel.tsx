import { fmt } from './plantTypes';

interface PlantKpiPanelProps {
  totalValue: number;
  yoyChange: number;
  topCity: string;
  topCityValue: number;
  productCount: number;
  currentBirim: string;
  selectedYear: number;
  cagr5Year: number;
  yieldTrend: number;
  forecast: number;
  growthDriver: string;
}

export default function PlantKpiPanel({
  totalValue, yoyChange, topCity, topCityValue, productCount,
  currentBirim, selectedYear, cagr5Year, yieldTrend, forecast, growthDriver,
}: PlantKpiPanelProps) {
  return (
    <>
      {/* ─── KPI Kartları ─── */}
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header"><span className="kpi-title">TOPLAM</span></div>
          <div className="kpi-value">{fmt(totalValue)}</div>
          <div className="kpi-subtitle">{currentBirim} ({selectedYear})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YILLIK DEĞİŞİM</span>
            <div className={`kpi-icon ${yoyChange >= 0 ? 'green' : 'red'}`}>{yoyChange >= 0 ? '📈' : '📉'}</div>
          </div>
          <div className="kpi-value" style={{ color: yoyChange >= 0 ? '#22c55e' : '#ef4444' }}>
            %{yoyChange.toFixed(1)}
          </div>
          <div className="kpi-subtitle">Önceki yıla göre</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon green">🏆</div></div>
          <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCity}</div>
          <div className="kpi-subtitle">{fmt(topCityValue)} {currentBirim}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">ÜRÜN SAYISI</span><div className="kpi-icon blue">📊</div></div>
          <div className="kpi-value">{productCount}</div>
          <div className="kpi-subtitle">Seçili ürün</div>
        </div>
      </div>

      {/* ─── 🧠 Intelligence Panel ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        color: 'white'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🧠 Tarım İçgörü Özeti
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>5 YILLIK CAGR</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{cagr5Year >= 0 ? '+' : ''}{cagr5Year.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>VERİMLİLİK TRENDİ</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yieldTrend >= 0 ? '+' : ''}{yieldTrend.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 3 yıl verim değişimi</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>TAHMİN {selectedYear + 1}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{forecast > 0 ? fmt(forecast) : '-'}</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Linear trend tahmini</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BÜYÜME STRATEJİSİ</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{growthDriver}</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 5 yıl analizi</div>
          </div>
        </div>
      </div>
    </>
  );
}
