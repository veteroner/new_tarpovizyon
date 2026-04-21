import { useState, useEffect } from 'react';
import { fetchQuery } from '../services/api';
import { Tab, PrimaryTab } from './livestock/livestockUtils';
import LivestockOverviewSection from './livestock/LivestockOverviewSection';
import LivestockStocksSection from './livestock/LivestockStocksSection';
import LivestockPrimarySection from './livestock/LivestockPrimarySection';
import LivestockPredictionsSection from './livestock/LivestockPredictionsSection';
import LivestockEfficiencySection from './livestock/LivestockEfficiencySection';
import LivestockProcessedSection from './livestock/LivestockProcessedSection';

export default function LivestockStocksPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [activePrimaryTab, setActivePrimaryTab] = useState<PrimaryTab>('meat');
  const [selectedYear, setSelectedYear] = useState('2022');
  const [availableYears, setAvailableYears] = useState<string[]>(['2024', '2023', '2022', '2021', '2020', '2019', '2018']);
  const [selectedItems, setSelectedItems] = useState<string[]>(['Sığır', 'Koyun', 'Keçi', 'Tavuk']);
  const [loading, setLoading] = useState(false);

  // Auto-detect latest year
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [maxRes, yearsRes] = await Promise.all([
        fetchQuery("SELECT MAX(year) as max_year FROM fao_uretim_hayvansal_canlihayvan"),
        fetchQuery("SELECT DISTINCT year FROM fao_uretim_hayvansal_canlihayvan ORDER BY year DESC LIMIT 25"),
      ]);
      const maxYear = String(maxRes.data?.[0]?.max_year ?? '').trim();
      const years = (yearsRes.data ?? [])
        .map((r: Record<string, string | number>) => String(r.year ?? '').trim())
        .filter(Boolean);

      if (!cancelled && years.length) setAvailableYears(years);
      if (!cancelled && maxYear) setSelectedYear(maxYear);
    })();
    return () => { cancelled = true; };
  }, []);

  const renderTabButton = (tab: Tab, icon: string, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '12px 24px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: activeTab === tab ? 'var(--primary)' : 'var(--bg-primary)',
        color: activeTab === tab ? 'white' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌍 Dünya Hayvansal Üretim</h1>
        <p className="page-subtitle">
          Canlı hayvan stokları, birincil ve işlenmiş ürün analizleri - FAO Veritabanı ({selectedYear})
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
        border: '1px solid var(--border)'
      }}>
        {renderTabButton('overview', '📊', 'Genel Bakış')}
        {renderTabButton('predictions', '🔮', 'Tahminler & Trendler')}
        {renderTabButton('efficiency', '⚡', 'Verimlilik Analizi')}
        {renderTabButton('stocks', '🐄', 'Canlı Hayvan Stokları')}
        {renderTabButton('primary', '🥩', 'Birincil Ürünler')}
        {renderTabButton('processed', '🏭', 'İşlenmiş Ürünler')}
      </div>

      {/* Year Filter */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <LivestockOverviewSection selectedYear={selectedYear} setActiveTab={setActiveTab} setLoading={setLoading} />
          )}
          {activeTab === 'stocks' && (
            <LivestockStocksSection selectedYear={selectedYear} selectedItems={selectedItems} setSelectedItems={setSelectedItems} setLoading={setLoading} />
          )}
          {activeTab === 'primary' && (
            <LivestockPrimarySection selectedYear={selectedYear} activePrimaryTab={activePrimaryTab} setActivePrimaryTab={setActivePrimaryTab} setLoading={setLoading} />
          )}
          {activeTab === 'predictions' && (
            <LivestockPredictionsSection selectedYear={selectedYear} setLoading={setLoading} />
          )}
          {activeTab === 'efficiency' && (
            <LivestockEfficiencySection selectedYear={selectedYear} setLoading={setLoading} />
          )}
          {activeTab === 'processed' && (
            <LivestockProcessedSection selectedYear={selectedYear} setLoading={setLoading} />
          )}
        </>
      )}
    </div>
  );
}
