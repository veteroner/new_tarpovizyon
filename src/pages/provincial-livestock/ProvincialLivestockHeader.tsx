import {
  formatNumber,
  YEAR_COLUMNS,
  ANIMAL_GROUPS,
  REGION_COLORS,
  type TabId,
  type ProvincialData,
  type AggregatedMetrics,
} from './provincialLivestockUtils';

interface Props {
  metrics: AggregatedMetrics;
  selectedYear: string;
  setSelectedYear: (v: string) => void;
  selectedAnimals: string[];
  setSelectedAnimals: (v: string[]) => void;
  selectedRegion: string;
  setSelectedRegion: (v: string) => void;
  selectedProvince: string | null;
  setSelectedProvince: (v: string | null) => void;
  provincialData: ProvincialData[];
  activeTab: TabId;
  setActiveTab: (v: TabId) => void;
  exportMenuOpen: boolean;
  setExportMenuOpen: (v: boolean) => void;
  exportToExcel: () => void;
  exportToPDF: () => Promise<void>;
}

export default function ProvincialLivestockHeader({
  metrics,
  selectedYear, setSelectedYear,
  selectedAnimals, setSelectedAnimals,
  selectedRegion, setSelectedRegion,
  selectedProvince, setSelectedProvince,
  provincialData,
  activeTab, setActiveTab,
  exportMenuOpen, setExportMenuOpen,
  exportToExcel, exportToPDF,
}: Props) {
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">🗺️ İl ve İlçe Bazlı Hayvancılık Analizi</h1>
        <p className="page-subtitle">
          Detaylı coğrafi analiz, trend izleme ve tahmin platformu
        </p>
      </div>

      {/* KPI Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Population Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🐄</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Toplam Hayvan Popülasyonu
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {formatNumber(metrics.totalPopulation)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {selectedYear.substring(1)} Yılı
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: '8px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: metrics.avgGrowthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: metrics.avgGrowthRate >= 0 ? '#22c55e' : '#ef4444'
          }}>
            {metrics.avgGrowthRate >= 0 ? '+' : ''}{metrics.avgGrowthRate.toFixed(1)}%
          </div>
        </div>

        {/* Leader Province Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Lider İl
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {metrics.topProvince || '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            En yüksek popülasyon
          </div>
        </div>

        {/* Fastest Growing Province Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            En Hızlı Büyüyen İl
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {metrics.fastestGrowingProvince || '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Yıllık büyüme bazlı
          </div>
        </div>

        {/* Active Province Count Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Aktif İl Sayısı
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {metrics.provinceCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {metrics.districtCount > 0 ? `${metrics.districtCount} ilçe` : 'İlçe verileri yükleniyor'}
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Year Selector */}
          <div className="filter-group">
            <label className="filter-label">Yıl Seçimi</label>
            <select 
              className="filter-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEAR_COLUMNS.map(yc => (
                <option key={yc} value={yc}>{yc.substring(1)}</option>
              ))}
            </select>
          </div>

          {/* Animal Multi-Selector */}
          <div className="filter-group">
            <label className="filter-label">Hayvan Türleri (Max 5)</label>
            <div style={{ position: 'relative' }}>
              <div 
                className="filter-select"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => {
                  const dropdown = document.getElementById('animal-dropdown');
                  if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                }}
              >
                {selectedAnimals.length > 0 ? `${selectedAnimals.length} hayvan seçildi` : 'Hayvan seçin'}
              </div>
              <div 
                id="animal-dropdown"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  padding: '8px'
                }}
              >
                {ANIMAL_GROUPS.map(animal => (
                  <label
                    key={animal.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnimals.includes(animal.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedAnimals.length < 5) {
                            setSelectedAnimals([...selectedAnimals, animal.id]);
                          }
                        } else {
                          setSelectedAnimals(selectedAnimals.filter(a => a !== animal.id));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ marginRight: '8px' }}>{animal.icon}</span>
                    <span>{animal.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Region Filter */}
          <div className="filter-group">
            <label className="filter-label">Bölge Filtresi</label>
            <select 
              className="filter-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="Tümü">Tüm Bölgeler</option>
              {Object.keys(REGION_COLORS).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Province Selector */}
          <div className="filter-group">
            <label className="filter-label">İl Seçimi (İlçe Analizi İçin)</label>
            <select 
              className="filter-select"
              value={selectedProvince || ''}
              onChange={(e) => setSelectedProvince(e.target.value || null)}
            >
              <option value="">İl Seçin</option>
              {provincialData.map(p => (
                <option key={p.province} value={p.province}>{p.province}</option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <button
                className="btn btn-primary"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📤 Dışa Aktar
              </button>
              {exportMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  minWidth: '150px'
                }}>
                  <button
                    onClick={() => { exportToExcel(); setExportMenuOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={() => { exportToPDF(); setExportMenuOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    📄 PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview' as TabId, label: '🗺️ İl Genel Bakış', desc: 'Provincial Overview' },
          { id: 'districts' as TabId, label: '📍 İlçe Detayları', desc: 'District Deep Dive' },
          { id: 'trends' as TabId, label: '📈 Zaman Serisi', desc: 'Time Series' },
          { id: 'comparison' as TabId, label: '⚖️ Karşılaştırma', desc: 'Comparative Analysis' },
          { id: 'correlation' as TabId, label: '🔗 Korelasyon', desc: 'Türler arası içgörü' },
          { id: 'forecast' as TabId, label: '🔮 Tahmin', desc: 'Forecasting' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <div>{tab.label}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>{tab.desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}
