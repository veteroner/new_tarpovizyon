import { useOverviewData } from './overview/useOverviewData';
import { GeneralStatsSection } from './overview/GeneralStatsSection';
import { MilkSection } from './overview/MilkSection';
import { MeatSection } from './overview/MeatSection';
import { EggSection } from './overview/EggSection';
import { LivestockSection } from './overview/LivestockSection';
import { ComparativeSection } from './overview/ComparativeSection';

export function OverviewPage() {
  const { data, loading } = useOverviewData();

  if (loading || !data) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Veriler yükleniyor...</p>
      </div>
    );
  }

  const ruralPercent = ((data.ruralPopulation / (data.population || 1)) * 100).toFixed(1);
  const urbanPercent = (100 - parseFloat(ruralPercent)).toFixed(1);
  const agriLandPercent = ((data.agriculturalLand / (data.totalLand || 1)) * 100).toFixed(1);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">🌾 Türkiye Tarım Genel Bakış</h1>
          <p className="page-subtitle">Nüfus, ekonomi, arazi ve hayvansal üretim özeti</p>
        </div>
      </div>

      <GeneralStatsSection
        data={data}
        ruralPercent={ruralPercent}
        urbanPercent={urbanPercent}
        agriLandPercent={agriLandPercent}
      />

      <MilkSection data={data} />
      <MeatSection data={data} />
      <EggSection data={data} />
      <LivestockSection data={data} />
      <ComparativeSection data={data} />
    </div>
  );
}
