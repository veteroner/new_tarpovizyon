import { Loading } from '../components/Loading';
import { useProvincialPlantData } from './provincial-plant/useProvincialPlantData';
import { PlantHeader } from './provincial-plant/PlantHeader';
import { PlantOverviewTab } from './provincial-plant/PlantOverviewTab';
import { PlantDistrictsTab } from './provincial-plant/PlantDistrictsTab';
import { PlantTrendsTab } from './provincial-plant/PlantTrendsTab';
import { PlantComparisonTab } from './provincial-plant/PlantComparisonTab';
import { PlantCorrelationTab } from './provincial-plant/PlantCorrelationTab';
import { PlantForecastTab } from './provincial-plant/PlantForecastTab';

export default function TurkeyProvincialPlantPage() {
  /*
   * `pageRef` AYRI alınıyor.
   *
   * Kanca ref'i düz nesnenin içinde döndürüyor; `data.pageRef` okunduğu anda
   * React derleyicisi NESNENİN TAMAMINI ref sayıyor ve ardından gelen her
   * `data.X` erişimi "render sırasında ref okuma" hatası veriyor — tek dosyada
   * 20'ye yakın hata. Ref'i ayırınca geriye düz veri nesnesi kalıyor.
   */
  const { pageRef, ...data } = useProvincialPlantData();

  if (data.loading) return <Loading />;

  return (
    <div ref={pageRef} style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PlantHeader
        activeTab={data.activeTab}
        setActiveTab={data.setActiveTab}
        selectedYear={data.selectedYear}
        setSelectedYear={data.setSelectedYear}
        selectedProducts={data.selectedProducts}
        setSelectedProducts={data.setSelectedProducts}
        selectedUnsur={data.selectedUnsur}
        setSelectedUnsur={data.setSelectedUnsur}
        selectedRegion={data.selectedRegion}
        setSelectedRegion={data.setSelectedRegion}
        selectedProvince={data.selectedProvince}
        setSelectedProvince={data.setSelectedProvince}
        productList={data.productList}
        provincialData={data.provincialData}
        metrics={data.metrics}
        exportToExcel={data.exportToExcel}
        exportToPDF={data.exportToPDF}
      />

      {data.activeTab === 'overview' && (
        <PlantOverviewTab
          top10Provinces={data.top10Provinces}
          filteredProvincialData={data.filteredProvincialData}
          regionalSummary={data.regionalSummary}
          selectedRegion={data.selectedRegion}
          setSelectedRegion={data.setSelectedRegion}
          setSelectedProvince={data.setSelectedProvince}
          setActiveTab={data.setActiveTab}
          selectedUnsur={data.selectedUnsur}
        />
      )}

      {data.activeTab === 'districts' && (
        <PlantDistrictsTab
          selectedProvince={data.selectedProvince}
          districtData={data.districtData}
        />
      )}

      {data.activeTab === 'trends' && (
        <PlantTrendsTab
          yearRange={data.yearRange}
          setYearRange={data.setYearRange}
          yearlyTrendData={data.yearlyTrendData}
        />
      )}

      {data.activeTab === 'comparison' && (
        <PlantComparisonTab
          filteredProvincialData={data.filteredProvincialData}
          regionalSummary={data.regionalSummary}
        />
      )}

      {data.activeTab === 'correlation' && (
        <PlantCorrelationTab
          top10Provinces={data.top10Provinces}
          selectedProducts={data.selectedProducts}
        />
      )}

      {data.activeTab === 'forecast' && (
        <PlantForecastTab
          top10Provinces={data.top10Provinces}
          metrics={data.metrics}
          yearRange={data.yearRange}
        />
      )}
    </div>
  );
}
