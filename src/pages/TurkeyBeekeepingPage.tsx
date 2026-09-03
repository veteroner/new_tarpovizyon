import { Loading } from '../components/Loading';
import { useBeekeepingData } from './beekeeping/useBeekeepingData';
import { BeekeepingKpiCards } from './beekeeping/BeekeepingKpiCards';
import { BeekeepingIntelligencePanel } from './beekeeping/BeekeepingIntelligencePanel';
import SectionTabs, { useSectionTab, type SectionTab } from '../components/SectionTabs';
import { BeekeepingDevelopmentSection } from './beekeeping/BeekeepingDevelopmentSection';
import { BeekeepingProvincialSection } from './beekeeping/BeekeepingProvincialSection';
import { BeekeepingProductivitySection } from './beekeeping/BeekeepingProductivitySection';
import { BeekeepingHoneyTypesSection } from './beekeeping/BeekeepingHoneyTypesSection';
import { BeekeepingTuikSection } from './beekeeping/BeekeepingTuikSection';

/* 5 bölüm alt alta, mobilde 10.854 px. KPI'lar üstte kalıyor. */
const BOLUMLER: SectionTab[] = [
  { id: 'gelisim', label: 'Gelişim' },
  { id: 'iller', label: 'İller' },
  { id: 'verimlilik', label: 'Verimlilik' },
  { id: 'bal', label: 'Bal Türleri' },
  { id: 'tuik', label: 'TÜİK Kovan' },
];

export default function TurkeyBeekeepingPage() {
  const { active } = useSectionTab(BOLUMLER);
  const {
    loading,
    yearTrendData,
    ilkYil,
    sonYil,
    oncekiYil,
    kpiMetrics,
    topBeekeepers,
    topProducers,
    topYield,
    honeyTypesData,
    treemapData,
    tuikKovanYear,
    tuikKovanKpi,
    tuikTopKovan,
    tuikTopBalmumu,
  } = useBeekeepingData();

  if (loading) return <Loading />;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          Türkiye Arıcılık İstihbaratı
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '700px' }}>
          Arıcı sayıları, kovan dağılımı, bal üretimi, verimlilik analizi ve TÜİK kovan/balmumu verileri
        </p>
      </div>

      {kpiMetrics && (
        <>
          <BeekeepingKpiCards kpiMetrics={kpiMetrics} sonYil={sonYil} oncekiYil={oncekiYil} />

          {tuikKovanKpi && <BeekeepingIntelligencePanel tuikKovanKpi={tuikKovanKpi} />}

          <SectionTabs tabs={BOLUMLER} />

          {active === 'gelisim' && <BeekeepingDevelopmentSection yearTrendData={yearTrendData} ilkYil={ilkYil} sonYil={sonYil} />}

          {active === 'iller' && (
          <BeekeepingProvincialSection
            sonYil={sonYil}
            topBeekeepers={topBeekeepers}
            topProducers={topProducers}
            topYield={topYield}
            honeyTypesData={honeyTypesData}
          />
          )}

          {active === 'verimlilik' && <BeekeepingProductivitySection treemapData={treemapData} />}

          {active === 'bal' && <BeekeepingHoneyTypesSection honeyTypesData={honeyTypesData} />}

          {active === 'tuik' && tuikKovanYear.length > 0 && tuikKovanKpi && (
            <BeekeepingTuikSection
              tuikKovanYear={tuikKovanYear}
              tuikKovanKpi={tuikKovanKpi}
              tuikTopKovan={tuikTopKovan}
              tuikTopBalmumu={tuikTopBalmumu}
            />
          )}

          {/* Footer Note */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #fbbf24',
            marginTop: '32px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.95rem', color: '#92400e', fontWeight: '600' }}>
              Veriler TÜİK (Türkiye İstatistik Kurumu) resmi kaynaklarından derlenmiştir - 2023/2024 Yılı
            </div>
          </div>
        </>
      )}
    </div>
  );
}
