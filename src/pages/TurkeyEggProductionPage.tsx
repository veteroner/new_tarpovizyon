import { useMemo } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
import { formatShort } from './egg-production/eggProductionTypes';
import { ChartInsightButton } from '../components/ChartInsightButton';
import { ChartCard } from '../components/ui/Card';

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
    eggTradeData,
    latest,
    yoy,
    peak,
  } = useEggProductionData();

  const tuikRangeLabel = useMemo(() => {
    if (!tuikData.length) return '';
    const years = tuikData.filter(d => d.eggProduction > 0).map(d => Number(d.year));
    if (!years.length) return '';
    return `${Math.min(...years)}–${Math.max(...years)}`;
  }, [tuikData]);

  const tradeIntelligence = useMemo(() => {
    if (!eggTradeData || eggTradeData.length === 0) return null;
    // İçinde bulunulan yıl henüz dolmadı; KPI ve CAGR'ı yarım yıl üzerinden
    // hesaplamak uydurma bir YoY üretiyor. Kartlar son TAM yıldan, kısmi yıl
    // grafikte kalıyor.
    const buYil = new Date().getFullYear();
    const tamYillar = eggTradeData.filter(d => d.yil < buYil);
    const kaynak = tamYillar.length >= 2 ? tamYillar : eggTradeData;
    const latest = kaynak[kaynak.length - 1];
    const prev = kaynak[kaynak.length - 2];
    const exportCAGR = kaynak.length > 1
      ? (Math.pow(latest.ihracat_musd / kaynak[0].ihracat_musd, 1 / (kaynak.length - 1)) - 1) * 100
      : 0;
    const yoyExport = prev ? ((latest.ihracat_musd - prev.ihracat_musd) / prev.ihracat_musd) * 100 : 0;
    const kismiYil = eggTradeData.some(d => d.yil >= buYil) ? buYil : null;
    return { latest, exportCAGR, yoyExport, kismiYil, ilkYil: kaynak[0].yil,
      netBalance: latest.ihracat_musd - latest.ithalat_musd };
  }, [eggTradeData]);

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
              📊 TÜİK Yumurta Üretim Verileri{tuikRangeLabel ? ` (${tuikRangeLabel})` : ''}
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
      {/* Yumurta Dış Ticaret Intelligence */}
      {tradeIntelligence && eggTradeData.length > 0 && (
        <>
          <div style={{ marginTop: '60px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              🌍 Yumurta Dış Ticaret Analizi
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Türkiye yumurta ihracat ve ithalat performansı — yıllık ticaret akışları ve denge analizi
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: `İHRACAT (${tradeIntelligence.latest.yil})`, value: `$${tradeIntelligence.latest.ihracat_musd.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} M`, color: '#22c55e', icon: '📤', sub: `${tradeIntelligence.yoyExport >= 0 ? '+' : ''}${tradeIntelligence.yoyExport.toFixed(1)}% YoY` },
              { label: `İTHALAT (${tradeIntelligence.latest.yil})`, value: `$${tradeIntelligence.latest.ithalat_musd.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} M`, color: '#ef4444', icon: '📥', sub: 'Sofralık & Kuluçkalık' },
              { label: 'NET TİCARET DENGESİ', value: `$${tradeIntelligence.netBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} M`, color: tradeIntelligence.netBalance > 0 ? '#10b981' : '#ef4444', icon: '⚖️', sub: tradeIntelligence.netBalance > 0 ? '✅ Net ihracatçı' : '❌ Net ithalatçı' },
              { label: 'İHRACAT CAGR', value: `${tradeIntelligence.exportCAGR >= 0 ? '+' : ''}${tradeIntelligence.exportCAGR.toFixed(1)}%`, color: '#3b82f6', icon: '📈', sub: `${tradeIntelligence.ilkYil}–${tradeIntelligence.latest.yil} bileşik` },
            ].map(kpi => (
              <div key={kpi.label} className="kpi-card" style={{ borderTop: `3px solid ${kpi.color}` }}>
                <div className="kpi-header"><span className="kpi-title" style={{ fontSize: '0.7rem' }}>{kpi.label}</span><span style={{ fontSize: '1.5rem' }}>{kpi.icon}</span></div>
                <div className="kpi-value" style={{ color: kpi.color, fontSize: '1.4rem' }}>{kpi.value}</div>
                <div className="kpi-subtitle">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {tradeIntelligence.kismiYil !== null && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: -16, marginBottom: 20 }}>
              ⓘ {tradeIntelligence.kismiYil} yılı henüz tamamlanmadı; grafikte yıl içi toplam olarak
              görünüyor. Yukarıdaki kartlar son tam yıl ({tradeIntelligence.latest.yil}) verisidir.
            </div>
          )}

          <div className="chart-grid" style={{ marginBottom: '40px' }}>
            <ChartCard title="📊 İhracat vs İthalat Trendi (M$)" span={2} action={<ChartInsightButton title="📊 Yumurta Dış Ticaret Trendi" description="Türkiye yumurta ihracat ve ithalat gelişimi" data={eggTradeData} context={{ section: 'Ticaret' }} />}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={eggTradeData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={v => `$${formatShort(v)}M`} width={46} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(v: number, name: string) => [`$${v.toLocaleString('tr-TR')} M`, name]} />
                  <Legend />
                  <Bar dataKey="ihracat_musd" name="İhracat (M$)" fill="#22c55e" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ithalat_musd" name="İthalat (M$)" fill="#ef4444" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                  <Area dataKey={(d: { ihracat_musd: number; ithalat_musd: number }) => d.ihracat_musd - d.ithalat_musd} name="Net Denge (M$)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
