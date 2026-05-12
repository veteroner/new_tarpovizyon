import { useWhiteMeatData } from './white-meat/useWhiteMeatData';
import WhiteMeatHeroSection from './white-meat/WhiteMeatHeroSection';
import WhiteMeatMapSection from './white-meat/WhiteMeatMapSection';
import WhiteMeatEconomicsSection from './white-meat/WhiteMeatEconomicsSection';
import WhiteMeatTuikSection from './white-meat/WhiteMeatTuikSection';
import WhiteMeatTurkeyMeatSection from './white-meat/WhiteMeatTurkeyMeatSection';
import WhiteMeatQuailSection from './white-meat/WhiteMeatQuailSection';
import WhiteMeatComparisonSection from './white-meat/WhiteMeatComparisonSection';

export default function TurkeyWhiteMeatProductionPage() {
  const data = useWhiteMeatData();

  if (data.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Beyaz et verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <WhiteMeatHeroSection
        series={data.series}
        latest={data.latest}
        yoy={data.yoy}
        worldRanking={data.worldRanking}
        tuikData={data.tuikData}
      />

      <WhiteMeatMapSection
        provincialPoultry={data.provincialPoultry}
        provincialBroilers={data.provincialBroilers}
        provincialLayers={data.provincialLayers}
        poultryMapType={data.poultryMapType}
        setPoultryMapType={data.setPoultryMapType}
      />

      {data.economicData.length > 0 && (
        <WhiteMeatEconomicsSection
          economicData={data.economicData}
          econStartDate={data.econStartDate}
          setEconStartDate={data.setEconStartDate}
          econEndDate={data.econEndDate}
          setEconEndDate={data.setEconEndDate}
        />
      )}

      {data.tuikData.length > 0 && (
        <WhiteMeatTuikSection
          tuikData={data.tuikData}
          activeTuikTab={data.activeTuikTab}
          setActiveTuikTab={data.setActiveTuikTab}
          monthlySlaughter={data.monthlySlaughter}
          monthlyMeat={data.monthlyMeat}
        />
      )}

      {data.turkeyMeatData.length > 0 && (
        <WhiteMeatTurkeyMeatSection
          turkeyMeatData={data.turkeyMeatData}
          monthlyTurkeyMeat={data.monthlyTurkeyMeat}
        />
      )}

      {data.quailMeatData.length > 0 && (
        <WhiteMeatQuailSection
          quailMeatData={data.quailMeatData}
          quailSlaughterData={data.quailSlaughterData}
          monthlyQuailMeat={data.monthlyQuailMeat}
        />
      )}

      {(data.tuikData.length > 0 || data.turkeyMeatData.length > 0 || data.quailMeatData.length > 0) && (
        <WhiteMeatComparisonSection
          tuikData={data.tuikData}
          turkeyMeatData={data.turkeyMeatData}
          quailMeatData={data.quailMeatData}
          tradeData={data.tradeData}
        />
      )}
    </div>
  );
}
