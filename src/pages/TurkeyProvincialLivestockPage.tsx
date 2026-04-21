import Loading from '../components/Loading';
import { useProvincialLivestockData } from './provincial-livestock/useProvincialLivestockData';
import ProvincialLivestockHeader from './provincial-livestock/ProvincialLivestockHeader';
import ProvincialOverviewTab from './provincial-livestock/ProvincialOverviewTab';
import ProvincialDistrictsTab from './provincial-livestock/ProvincialDistrictsTab';
import ProvincialTrendsTab from './provincial-livestock/ProvincialTrendsTab';
import ProvincialComparisonTab from './provincial-livestock/ProvincialComparisonTab';
import ProvincialCorrelationTab from './provincial-livestock/ProvincialCorrelationTab';
import ProvincialForecastTab from './provincial-livestock/ProvincialForecastTab';

export default function TurkeyProvincialLivestockPage() {
  const data = useProvincialLivestockData();

  if (data.loading) return <Loading />;

  return (
    <div ref={data.pageRef} style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <ProvincialLivestockHeader
        metrics={data.metrics}
        selectedYear={data.selectedYear}
        setSelectedYear={data.setSelectedYear}
        selectedAnimals={data.selectedAnimals}
        setSelectedAnimals={data.setSelectedAnimals}
        selectedRegion={data.selectedRegion}
        setSelectedRegion={data.setSelectedRegion}
        selectedProvince={data.selectedProvince}
        setSelectedProvince={data.setSelectedProvince}
        provincialData={data.provincialData}
        activeTab={data.activeTab}
        setActiveTab={data.setActiveTab}
        exportMenuOpen={data.exportMenuOpen}
        setExportMenuOpen={data.setExportMenuOpen}
        exportToExcel={data.exportToExcel}
        exportToPDF={data.exportToPDF}
      />

      {data.activeTab === 'overview' && (
        <ProvincialOverviewTab
          top10Provinces={data.top10Provinces}
          filteredProvincialData={data.filteredProvincialData}
          regionalSummary={data.regionalSummary}
          selectedRegion={data.selectedRegion}
          setSelectedRegion={data.setSelectedRegion}
          setSelectedProvince={data.setSelectedProvince}
        />
      )}

      {data.activeTab === 'districts' && (
        <ProvincialDistrictsTab
          selectedProvince={data.selectedProvince}
          selectedAnimals={data.selectedAnimals}
          selectedYear={data.selectedYear}
          districtData={data.districtData}
          setSelectedProvince={data.setSelectedProvince}
        />
      )}

      {data.activeTab === 'trends' && (
        <ProvincialTrendsTab
          yearRange={data.yearRange}
          yearlyTrendData={data.yearlyTrendData}
        />
      )}

      {data.activeTab === 'comparison' && (
        <ProvincialComparisonTab
          filteredProvincialData={data.filteredProvincialData}
          regionalSummary={data.regionalSummary}
        />
      )}

      {data.activeTab === 'correlation' && (
        <ProvincialCorrelationTab
          top10Provinces={data.top10Provinces}
          selectedAnimals={data.selectedAnimals}
        />
      )}

      {data.activeTab === 'forecast' && (
        <ProvincialForecastTab
          top10Provinces={data.top10Provinces}
          metrics={data.metrics}
          yearRange={data.yearRange}
        />
      )}
    </div>
  );
}
