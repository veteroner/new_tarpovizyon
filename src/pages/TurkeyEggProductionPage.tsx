import { Loading } from '../components/Loading';
import { useEggProductionData } from './egg-production/useEggProductionData';
import { EggKpiCards } from './egg-production/EggKpiCards';
import { EggIntelligencePanel } from './egg-production/EggIntelligencePanel';
import { EggTrendChart } from './egg-production/EggTrendChart';
import { EggEconomicSection } from './egg-production/EggEconomicSection';
import { EggTuikOverviewTab } from './egg-production/EggTuikOverviewTab';
import { EggTuikProductionTab } from './egg-production/EggTuikProductionTab';
import { EggTuikYieldTab } from './egg-production/EggTuikYieldTab';
import { EggTuikProjectionTab } from './egg-production/EggTuikProjectionTab';
import type { TuikTab } from './egg-production/eggProductionTypes';

export default function TurkeyEggProductionPage() {
  const {
    loading,
    series,
    economicData,
    econStartDate,
    setEconStartDate,
    econEndDate,
    setEconEndDate,
    worldRanking,
    eggPrices,
    eggPriceDate,
    eggPriceError,
    activeTuikTab,
    setActiveTuikTab,
    tuikData,
    monthlyEgg,
    monthlyLayer,
    latest,
    yoy,
    peak,
  } = useEggProductionData();

  if (loading) return <Loading />;

  const tuikTabs: { key: TuikTab; icon: string; label: string }[] = [
    { key: 'overview', icon: '📊', label: 'Genel Bakış' },
    { key: 'production', icon: '📈', label: 'Üretim Trendi' },
    { key: 'yield', icon: '🐔', label: 'Verim Analizi' },
    { key: 'projection', icon: '🔮', label: 'Projeksiyon' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Türkiye Yumurta Üretim Analizi 🥚</h1>
        <p className="page-subtitle">Yıllık üretim trendleri, ekonomik göstergeler ve TÜİK verileri</p>
      </div>

      {/* KPI Cards */}
      <EggKpiCards
        latest={latest}
        yoy={yoy}
        peak={peak}
        eggPrices={eggPrices}
        eggPriceDate={eggPriceDate}
        eggPriceError={eggPriceError}
        worldRanking={worldRanking}
      />

      {/* Intelligence Panel */}
      {tuikData.length > 0 && <EggIntelligencePanel tuikData={tuikData} />}

      {/* Trend Chart */}
      <EggTrendChart series={series} />

      {/* Economic Section */}
      <EggEconomicSection
        economicData={economicData}
        econStartDate={econStartDate}
        setEconStartDate={setEconStartDate}
        econEndDate={econEndDate}
        setEconEndDate={setEconEndDate}
      />

      {/* TÜİK Section */}
      {tuikData.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              📊 TÜİK Yumurta Üretim Verileri (2010-2025)
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Türkiye İstatistik Kurumu resmi yumurta üretimi, tavuk sayısı ve verim verileri
            </p>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '30px',
            flexWrap: 'wrap',
            padding: '20px',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}>
            {tuikTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTuikTab(tab.key)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: activeTuikTab === tab.key ? 'var(--primary)' : 'var(--bg-primary)',
                  color: activeTuikTab === tab.key ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTuikTab === 'overview' && <EggTuikOverviewTab tuikData={tuikData} />}
          {activeTuikTab === 'production' && (
            <EggTuikProductionTab tuikData={tuikData} monthlyEgg={monthlyEgg} monthlyLayer={monthlyLayer} />
          )}
          {activeTuikTab === 'yield' && <EggTuikYieldTab tuikData={tuikData} />}
          {activeTuikTab === 'projection' && (
            <EggTuikProjectionTab tuikData={tuikData} monthlyEgg={monthlyEgg} monthlyLayer={monthlyLayer} />
          )}
        </>
      )}
    </div>
  );
}
