import { usePlantData } from './plant/usePlantData';
import PlantFilters from './plant/PlantFilters';
import PlantKpiPanel from './plant/PlantKpiPanel';
import PlantMainCharts from './plant/PlantMainCharts';
import PlantAnalysisCharts from './plant/PlantAnalysisCharts';

export type { TuikPlantCategoryPageProps } from './plant/plantTypes';
import type { TuikPlantCategoryPageProps } from './plant/plantTypes';

export default function TuikPlantCategoryPage(props: TuikPlantCategoryPageProps) {
  const { title, subtitle, icon, extraSection } = props;
  const data = usePlantData(props);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{icon} {title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      {/* Filtreler */}
      <PlantFilters
        productList={data.productList}
        selectedProducts={data.selectedProducts}
        setSelectedProducts={data.setSelectedProducts}
        filteredUnsurOptions={data.filteredUnsurOptions}
        selectedUnsur={data.selectedUnsur}
        setSelectedUnsur={data.setSelectedUnsur}
        selectedYear={data.selectedYear}
        setSelectedYear={data.setSelectedYear}
        selectedRegion={data.selectedRegion}
        setSelectedRegion={data.setSelectedRegion}
        selectedProvince={data.selectedProvince}
        setSelectedProvince={data.setSelectedProvince}
        provinceList={data.provinceList}
      />

      {data.loading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          <PlantKpiPanel
            totalValue={data.totalValue}
            yoyChange={data.yoyChange}
            topCity={data.topCity}
            topCityValue={data.topCityValue}
            productCount={data.productCount}
            currentBirim={data.currentBirim}
            selectedYear={data.selectedYear}
            cagr5Year={data.cagr5Year}
            yieldTrend={data.yieldTrend}
            forecast={data.forecast}
            growthDriver={data.growthDriver}
          />
          <PlantMainCharts
            yearlyData={data.yearlyData}
            cityData={data.cityData}
            regionData={data.regionData}
            productCompareData={data.productCompareData}
            selectedUnsur={data.selectedUnsur}
            currentBirim={data.currentBirim}
            selectedYear={data.selectedYear}
          />
          <PlantAnalysisCharts
            scatterData={data.scatterData}
            districtData={data.districtData}
            cityData={data.cityData}
            radarData={data.radarData}
            yieldTrendData={data.yieldTrendData}
            selectedProvince={data.selectedProvince}
            setSelectedProvince={data.setSelectedProvince}
            selectedUnsur={data.selectedUnsur}
            currentBirim={data.currentBirim}
            selectedYear={data.selectedYear}
            radarYears={data.radarYears}
          />
          {extraSection}
        </>
      )}
    </div>
  );
}
