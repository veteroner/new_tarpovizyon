import type { TabId } from './geographical-indications/useGIData';
import { useGIData } from './geographical-indications/useGIData';
import { GIKpiCards } from './geographical-indications/GIKpiCards';
import { GIOverviewTab } from './geographical-indications/GIOverviewTab';
import { GIProvincesTab } from './geographical-indications/GIProvincesTab';
import { GIProductsTab } from './geographical-indications/GIProductsTab';
import { GITrendsTab } from './geographical-indications/GITrendsTab';
import { GITableTab } from './geographical-indications/GITableTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '🗺️ Genel Bakış' },
  { id: 'provinces', label: '📍 İl Analizi' },
  { id: 'products', label: '🏷️ Ürün Grupları' },
  { id: 'trends', label: '📈 Trend Analizi' },
  { id: 'table', label: '📊 Detaylı Tablo' },
];

export default function GeographicalIndicationsPage() {
  const {
    loading,
    activeTab,
    setActiveTab,
    selectedProvince,
    setSelectedProvince,
    selectedStatus,
    setSelectedStatus,
    selectedType,
    setSelectedType,
    selectedGroup,
    setSelectedGroup,
    searchTerm,
    setSearchTerm,
    allProducts,
    provinceData,
    productGroupData,
    yearlyTrend,
    filteredProducts,
    metrics,
    typeData,
    exportToExcel,
  } = useGIData();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: 'var(--text-secondary)'
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>🏛️</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>Coğrafi İşaretli Gıda Ürünleri Yükleniyor...</div>
        </div>
      </div>
    );
  }

  const handleProvinceClick = (province: string) => {
    setSelectedProvince(province);
    setActiveTab('provinces');
  };

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
      background: 'var(--bg)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{ fontSize: '48px' }}>🏛️</div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              Türkiye Coğrafi İşaretli Gıda Ürünleri
            </h1>
            <p style={{ fontSize: '16px', margin: '8px 0 0 0', opacity: 0.95 }}>
              Türk Patent ve Marka Kurumu Tescilli Gıda Ürünleri Analiz Platformu
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <GIKpiCards metrics={metrics} />

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--border)',
        flexWrap: 'wrap'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <GIOverviewTab
          provinceData={provinceData}
          metrics={metrics}
          allProductsCount={allProducts.length}
          registeredCount={metrics.registered}
          pendingCount={metrics.pending}
          typeData={typeData}
          onProvinceClick={handleProvinceClick}
        />
      )}
      {activeTab === 'provinces' && (
        <GIProvincesTab
          provinceData={provinceData}
          allProducts={allProducts}
          selectedProvince={selectedProvince}
          onProvinceChange={setSelectedProvince}
        />
      )}
      {activeTab === 'products' && (
        <GIProductsTab productGroupData={productGroupData} />
      )}
      {activeTab === 'trends' && (
        <GITrendsTab yearlyTrend={yearlyTrend} />
      )}
      {activeTab === 'table' && (
        <GITableTab
          allProducts={allProducts}
          filteredProducts={filteredProducts}
          selectedProvince={selectedProvince}
          selectedStatus={selectedStatus}
          selectedType={selectedType}
          selectedGroup={selectedGroup}
          searchTerm={searchTerm}
          onProvinceChange={setSelectedProvince}
          onStatusChange={setSelectedStatus}
          onTypeChange={setSelectedType}
          onGroupChange={setSelectedGroup}
          onSearchChange={setSearchTerm}
          onExport={exportToExcel}
        />
      )}
    </div>
  );
}
