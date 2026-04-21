import { BackToHome } from '../components/BackToHome';
import { Loading } from '../components/Loading';
import { useProductionData } from './production/useProductionData';
import { TABS, CROP_CATEGORIES } from './production/productionTypes';
import type { Tab } from './production/productionTypes';
import { OverviewTab } from './production/OverviewTab';
import { PrimaryTab } from './production/PrimaryTab';
import { ProcessedTab } from './production/ProcessedTab';
import { YieldTab } from './production/YieldTab';
import { CompetitionTab } from './production/CompetitionTab';
import { PredictionsTab } from './production/PredictionsTab';

interface ProductionPageProps {
  categoryFilter?: string;
  categoryTitle?: string;
  categoryIcon?: string;
}

export function ProductionPage({ categoryFilter, categoryTitle, categoryIcon }: ProductionPageProps = {}) {
  const {
    activeTab, setActiveTab, loading,
    overviewKPIs, overviewTrends, overviewCategoryData, overviewTopCountries, overviewInsights, overviewSupplyChain,
    primaryProduct, setPrimaryProduct, primaryProducts, primaryTopCountries, primaryTrends, primaryKPIs, primaryHHI, primaryInsights, primaryAnomalies,
    processedProduct, setProcessedProduct, processedProducts, processedTopCountries, processedTrends, processedKPIs, processedInsights,
    yieldProduct, setYieldProduct, yieldKPIs, yieldGapData, yieldScatter, yieldTrends, yieldBestPractices, yieldInsights, yieldSegmented,
    compProduct, setCompProduct, compKPIs, compTopMovers, compBubbleData, compMatrix, compHHITimeline, compInsights,
    predProduct, setPredProduct, predKPIs, predProductionForecast, predYieldForecast, predAreaForecast, predWorldForecast, predInsights,
  } = useProductionData(categoryFilter);

  return (
    <div className="production-page" style={{ animation: 'fadeIn 0.3s ease-in' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <BackToHome />

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {categoryIcon || '🌾'} {categoryTitle || 'Bitkisel Üretim İçgörüleri'}
        </h1>
        <p className="page-subtitle" style={{ opacity: 0.8 }}>
          {categoryFilter
            ? `FAO dünya verileri — ${CROP_CATEGORIES[categoryFilter]?.name || ''} kategorisi — Tarım İçgörü Aracı`
            : 'FAO dünya verileri — 232 ülke, 161 ürün, 24 işlenmiş ürün — Tarım İçgörü Aracı'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '8px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
            style={{
              padding: '10px 18px',
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-primary)',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              border: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: '8px', fontSize: '14px', fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
            }}>
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {activeTab === 'overview' && !loading && overviewKPIs && (
        <OverviewTab
          overviewKPIs={overviewKPIs}
          overviewTrends={overviewTrends}
          overviewCategoryData={overviewCategoryData}
          overviewTopCountries={overviewTopCountries}
          overviewInsights={overviewInsights}
          overviewSupplyChain={overviewSupplyChain}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'primary' && !loading && (
        <PrimaryTab
          primaryProduct={primaryProduct}
          setPrimaryProduct={setPrimaryProduct}
          primaryProducts={primaryProducts}
          primaryTopCountries={primaryTopCountries}
          primaryTrends={primaryTrends}
          primaryKPIs={primaryKPIs}
          primaryHHI={primaryHHI}
          primaryInsights={primaryInsights}
          primaryAnomalies={primaryAnomalies}
        />
      )}

      {activeTab === 'processed' && !loading && (
        <ProcessedTab
          processedProduct={processedProduct}
          setProcessedProduct={setProcessedProduct}
          processedProducts={processedProducts}
          processedTopCountries={processedTopCountries}
          processedTrends={processedTrends}
          processedKPIs={processedKPIs}
          processedInsights={processedInsights}
        />
      )}

      {activeTab === 'yield' && !loading && (
        <YieldTab
          yieldProduct={yieldProduct}
          setYieldProduct={setYieldProduct}
          primaryProducts={primaryProducts}
          yieldKPIs={yieldKPIs}
          yieldGapData={yieldGapData}
          yieldScatter={yieldScatter}
          yieldTrends={yieldTrends}
          yieldBestPractices={yieldBestPractices}
          yieldInsights={yieldInsights}
          yieldSegmented={yieldSegmented}
        />
      )}

      {activeTab === 'competition' && !loading && (
        <CompetitionTab
          compProduct={compProduct}
          setCompProduct={setCompProduct}
          primaryProducts={primaryProducts}
          compKPIs={compKPIs}
          compTopMovers={compTopMovers}
          compBubbleData={compBubbleData}
          compMatrix={compMatrix}
          compHHITimeline={compHHITimeline}
          compInsights={compInsights}
        />
      )}

      {activeTab === 'predictions' && !loading && (
        <PredictionsTab
          predProduct={predProduct}
          setPredProduct={setPredProduct}
          primaryProducts={primaryProducts}
          predKPIs={predKPIs}
          predProductionForecast={predProductionForecast}
          predYieldForecast={predYieldForecast}
          predAreaForecast={predAreaForecast}
          predWorldForecast={predWorldForecast}
          predInsights={predInsights}
        />
      )}
    </div>
  );
}
