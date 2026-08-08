import SectionTabs, { useSectionTab, type SectionTab } from '../components/SectionTabs';
import { useMilkData } from './milk/useMilkData';
import MilkHeroSection from './milk/MilkHeroSection';
import MilkProductionSection from './milk/MilkProductionSection';
import MilkIndustrySection from './milk/MilkIndustrySection';
import MilkTuikSection from './milk/MilkTuikSection';
import MilkEconomicsSection from './milk/MilkEconomicsSection';

/*
 * Sayfa mobilde 16.864 px sürüyordu (~21 ekran). Bölümler sekmeye alındı:
 * özet her sekmede görünür kalıyor, geri kalanı seçime bağlı.
 */
const BOLUMLER: SectionTab[] = [
  { id: 'uretim', label: 'Üretim' },
  { id: 'sanayi', label: 'Sanayi' },
  { id: 'urunler', label: 'Süt Ürünleri' },
  { id: 'ekonomi', label: 'Ekonomi' },
];

export default function TurkeyMilkProductionPage() {
  const { active } = useSectionTab(BOLUMLER);
  const {
    loading,
    series,
    economicData,
    industrySutData,
    worldMilkPrices,
    productivity,
    productivityComparison,
    sufficiency,
    worldRankings,
    econStartDate,
    setEconStartDate,
    econEndDate,
    setEconEndDate,
    tuikSutData,
    selectedTuikSutUrun,
    setSelectedTuikSutUrun,
    latest,
    yoy,
    cattleShare,
    cagr,
    latestBreakdown,
    growthRates,
    tuikSelectedData,
    tuikLatestYear,
    tuikYoyChange,
    tuikAllProductsLatest,
    tuikSeasonality,
    tuikSeasonHeatmap,
    tuikGrowthRates,
  } = useMilkData();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Türkiye Süt Üretimi (TÜİK)</h1>
        <p className="page-subtitle">Yıllık süt üretimi ve türlere göre dağılım (ton)</p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          <MilkHeroSection
            latest={latest}
            yoy={yoy}
            cattleShare={cattleShare}
            cagr={cagr}
            sufficiency={sufficiency}
            worldRankings={worldRankings}
          />

          <SectionTabs tabs={BOLUMLER} />

          {active === 'uretim' && (
          <MilkProductionSection
            series={series}
            latest={latest}
            latestBreakdown={latestBreakdown}
            growthRates={growthRates}
            productivity={productivity}
            productivityComparison={productivityComparison}
            sufficiency={sufficiency}
          />
          )}

          {active === 'sanayi' && <MilkIndustrySection industrySutData={industrySutData} />}

          {active === 'urunler' && (
          <MilkTuikSection
            tuikSutData={tuikSutData}
            selectedTuikSutUrun={selectedTuikSutUrun}
            setSelectedTuikSutUrun={setSelectedTuikSutUrun}
            tuikSelectedData={tuikSelectedData}
            tuikLatestYear={tuikLatestYear}
            tuikYoyChange={tuikYoyChange}
            tuikAllProductsLatest={tuikAllProductsLatest}
            tuikSeasonality={tuikSeasonality}
            tuikSeasonHeatmap={tuikSeasonHeatmap}
            tuikGrowthRates={tuikGrowthRates}
          />
          )}

          {active === 'ekonomi' && (
          <MilkEconomicsSection
            worldMilkPrices={worldMilkPrices}
            economicData={economicData}
            econStartDate={econStartDate}
            setEconStartDate={setEconStartDate}
            econEndDate={econEndDate}
            setEconEndDate={setEconEndDate}
          />
          )}
        </>
      )}
    </div>
  );
}
