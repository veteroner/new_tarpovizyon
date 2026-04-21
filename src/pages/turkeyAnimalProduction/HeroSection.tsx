import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { KpiData } from './useTurkeyAnimalProductionData';
import { formatValue } from './turkeyAnimalProductionTypes';

interface HeroSectionProps {
  kpiData: KpiData | null;
  cagr5Year: number;
  milkProductivityTrend: number;
  forecastRedMeat: number;
  growthStrategy: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  kpiData, cagr5Year, milkProductivityTrend, forecastRedMeat, growthStrategy
}) => {
  if (!kpiData) return null;

  return (
    <>
      {/* Hero KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        {/* Red Meat */}
        <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: '24px', borderRadius: '14px', boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🥩</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>TOPLAM KIRMIZI ET</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{formatValue(kpiData.redMeat.value)} ton</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
              {kpiData.redMeat.change >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />}
              {kpiData.redMeat.change >= 0 ? '+' : ''}{kpiData.redMeat.change.toFixed(1)}% Yıllık Değişim
            </div>
          </div>
        </div>

        {/* Milk */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '24px', borderRadius: '14px', boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🥛</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>TOPLAM SÜT ÜRETİMİ</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{formatValue(kpiData.milk.value)} ton</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
              {kpiData.milk.change >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />}
              {kpiData.milk.change >= 0 ? '+' : ''}{kpiData.milk.change.toFixed(1)}% Yıllık Değişim
            </div>
          </div>
        </div>

        {/* Egg */}
        <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', padding: '24px', borderRadius: '14px', boxShadow: '0 4px 16px rgba(251, 191, 36, 0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🥚</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>TOPLAM YUMURTA</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{kpiData.egg.value.toFixed(1)} Milyar adet</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
              {kpiData.egg.change >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />}
              {kpiData.egg.change >= 0 ? '+' : ''}{kpiData.egg.change.toFixed(1)}% Yıllık Değişim
            </div>
          </div>
        </div>

        {/* Honey */}
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '24px', borderRadius: '14px', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🍯</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>TOPLAM BAL ÜRETİMİ</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>{formatValue(kpiData.honey.value)} ton</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
              {kpiData.honey.change >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />}
              {kpiData.honey.change >= 0 ? '+' : ''}{kpiData.honey.change.toFixed(1)}% Yıllık Değişim
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Panel */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '20px', marginBottom: '48px', color: 'white' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🧠 Hayvansal Üretim İçgörü Özeti
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>5 YILLIK BBO (KIRMIZI ET)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{cagr5Year >= 0 ? '+' : ''}{cagr5Year.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>SÜT VERİMLİLİK TRENDİ</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{milkProductivityTrend >= 0 ? '+' : ''}{milkProductivityTrend.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 3 yıl büyüme</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>TAHMİN (KIRMIZI ET)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{forecastRedMeat > 0 ? formatValue(forecastRedMeat) : '-'} ton</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Doğrusal trend tahmini</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BÜYÜME STRATEJİSİ</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{growthStrategy}</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 3 yıl analizi</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeroSection;
