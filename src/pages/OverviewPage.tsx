import { sayi } from '../utils/sayi';
import { useOverviewData } from './overview/useOverviewData';
import { GeneralStatsSection } from './overview/GeneralStatsSection';
import { RontgenSection } from './overview/RontgenSection';
import { ZincirSection } from './overview/ZincirSection';
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

  const kirsalOran = (data.ruralPopulation / (data.population || 1)) * 100;
  const ruralPercent = sayi(kirsalOran, 1);
  const urbanPercent = sayi(100 - kirsalOran, 1);
  const agriLandPercent = sayi((data.agriculturalLand / (data.totalLand || 1)) * 100, 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Türkiye Tarım Genel Bakış</h1>
          <p className="page-subtitle">Nüfus, ekonomi, arazi ve hayvansal üretim özeti</p>
        </div>
      </div>

      {/*
        * Röntgen EN ÜSTTE, göstergelerden bile önce.
        *
        * Sayfa bugüne kadar seviye gösteriyordu ("şu kadar ton"); "neye
        * bakmalıyım" sorusunun cevabı hiçbir yerde yoktu. Sorunlar aşağıda
        * bir yerde dursaydı, onları görmek için zaten sayfayı taramak
        * gerekirdi — yani çözdüğü sorunu yeniden üretirdi.
        */}
      <RontgenSection />

      {/*
        * Zincir röntgenin HEMEN ALTINDA.
        *
        * Röntgen "şu an neyde sorun var" diyor, zincir "bugünkü hareket nereye
        * varıyor". İkincisi ancak birincisi okunduktan sonra anlam kazanıyor;
        * tersi sırada, henüz ne olduğunu bilmeyen okuyucuya ne olacağı
        * anlatılmış olurdu.
        */}
      <ZincirSection />

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
