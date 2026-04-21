import React from 'react';
import { Package, Download } from 'lucide-react';
import { Loading } from '../components/Loading';
import { useTurkeyAnimalProductionData } from './turkeyAnimalProduction/useTurkeyAnimalProductionData';
import HeroSection from './turkeyAnimalProduction/HeroSection';
import HistoricalTrendsSection from './turkeyAnimalProduction/HistoricalTrendsSection';
import RedMeatSection from './turkeyAnimalProduction/RedMeatSection';
import PoultrySection from './turkeyAnimalProduction/PoultrySection';
import WorldRankingsSection from './turkeyAnimalProduction/WorldRankingsSection';
import MapSection from './turkeyAnimalProduction/MapSection';

const TurkeyAnimalProductionPage: React.FC = () => {
  const {
    loading, yearRange, setYearRange, mapFilter, setMapFilter,
    historicalData,
    kpiData, historicalChartData, redMeatBreakdown, redMeatTrendData,
    buyukbasKucukbasData, poultryMonthlyData,
    worldBeefRanking, worldMilkRanking, worldChickenRanking, mapData,
    cagr5Year, forecastRedMeat, milkProductivityTrend, growthStrategy,
  } = useTurkeyAnimalProductionData();

  const exportCSV = () => {
    const headers = ['Yıl', 'Kırmızı Et (ton)', 'Süt (ton)', 'Yumurta (M adet)', 'Kanatlı (ton)', 'Bal (ton)'];
    const rows = historicalData.map(d => [
      d.yillar.substring(0, 4),
      d.kirmizi_et_uretimi,
      d.cig_sut_uretimi,
      d.yumurta_milyon_adet,
      d.kanatli_eti_ton,
      d.bal_uretimi,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hayvansal_uretim_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return <Loading />;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
            <Package size={36} color="#ef4444" />
            Hayvansal Üretim Dashboard
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Türkiye hayvansal ürün üretim verileri • 1961-2024 tarihsel analiz
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600, fontSize: '14px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <Download size={18} />
          CSV İndir
        </button>
      </div>

      <HeroSection
        kpiData={kpiData}
        cagr5Year={cagr5Year}
        milkProductivityTrend={milkProductivityTrend}
        forecastRedMeat={forecastRedMeat}
        growthStrategy={growthStrategy}
      />

      <HistoricalTrendsSection
        historicalChartData={historicalChartData}
        yearRange={yearRange}
        setYearRange={setYearRange}
      />

      <RedMeatSection
        redMeatBreakdown={redMeatBreakdown}
        redMeatTrendData={redMeatTrendData}
        buyukbasKucukbasData={buyukbasKucukbasData}
      />

      <PoultrySection poultryMonthlyData={poultryMonthlyData} />

      <WorldRankingsSection
        worldBeefRanking={worldBeefRanking}
        worldMilkRanking={worldMilkRanking}
        worldChickenRanking={worldChickenRanking}
      />

      <MapSection
        mapData={mapData}
        mapFilter={mapFilter}
        setMapFilter={setMapFilter}
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important; }
      `}</style>
    </div>
  );
};

export default TurkeyAnimalProductionPage;
