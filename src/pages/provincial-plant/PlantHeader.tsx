import type {
  ProvincialData,
  AggregatedMetrics,
} from './provincialPlantUtils';
import {
  YEARS,
  UNSUR_OPTIONS,
  REGION_COLORS,
  formatNumber,
  getProductIcon,
} from './provincialPlantUtils';

interface Props {
  metrics: AggregatedMetrics;
  selectedYear: string;
  setSelectedYear: (v: string) => void;
  selectedUnsur: string;
  setSelectedUnsur: (v: string) => void;
  selectedProducts: string[];
  setSelectedProducts: (v: string[]) => void;
  selectedRegion: string;
  setSelectedRegion: (v: string) => void;
  selectedProvince: string | null;
  setSelectedProvince: (v: string | null) => void;
  provincialData: ProvincialData[];
  productList: string[];
  activeTab: string;
  setActiveTab: (v: string) => void;
  exportToExcel: () => void;
  exportToPDF: () => Promise<void>;
}

export function PlantHeader({
  metrics, selectedYear, setSelectedYear,
  selectedUnsur, setSelectedUnsur,
  selectedProducts, setSelectedProducts,
  selectedRegion, setSelectedRegion,
  selectedProvince, setSelectedProvince,
  provincialData, productList,
  activeTab, setActiveTab,
  exportToExcel, exportToPDF,
}: Props) {
  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '36px' }}>🌾</span>
          İl ve İlçe Bazlı Bitkisel Üretim Analizi
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Detaylı coğrafi analiz, trend izleme ve tahmin platformu
        </p>
      </div>

      {/* KPI Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* KPI 1: Toplam Üretim */}
        <div style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(34, 197, 94, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            {selectedUnsur === 'Üretim' ? '🌾 Toplam Üretim' : selectedUnsur === 'Ekilen Alan' ? '📏 Toplam Ekilen Alan' : '📊 Toplam Verim'}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>
            {formatNumber(metrics.totalProduction)}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            {UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || 'birim'}
          </div>
        </div>

        {/* KPI 2: Lider İl */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            🏆 Lider İl
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
            {metrics.leaderProvince}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            En yüksek üretim
          </div>
        </div>

        {/* KPI 3: En Hızlı Büyüyen */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            📈 En Hızlı Büyüyen
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
            {metrics.fastestGrowing}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            Yıllık büyüme bazlı
          </div>
        </div>

        {/* KPI 4: Aktif İl Sayısı */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(139, 92, 246, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            🗺️ Aktif İl Sayısı
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>
            {metrics.activeProvinces}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            İl verileri yükleniyor
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          alignItems: 'end'
        }}>
          {/* Year Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📅 YIL SEÇİMİ
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {[...YEARS].reverse().map(year => (
                <option key={year} value={`y${year}`}>{year}</option>
              ))}
            </select>
          </div>

          {/* Unsur Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📊 UNSUR
            </label>
            <select
              value={selectedUnsur}
              onChange={(e) => setSelectedUnsur(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {UNSUR_OPTIONS.map(unsur => (
                <option key={unsur.id} value={unsur.id}>{unsur.label}</option>
              ))}
            </select>
          </div>

          {/* Product Multi-Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              🌾 ÜRÜN SEÇİMİ (Max 5)
            </label>
            <div style={{ position: 'relative' }}>
              <select
                multiple
                value={selectedProducts}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  if (selected.length <= 5) {
                    setSelectedProducts(selected);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '48px'
                }}
              >
                {productList.map(product => (
                  <option key={product} value={product}>
                    {getProductIcon(product)} {product}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Region Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              🗺️ BÖLGE FİLTRESİ
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="Tümü">Tüm Bölgeler</option>
              {Object.keys(REGION_COLORS).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Province Selector for Districts */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              🏙️ İLÇE ANALİZİ İÇİN İL
            </label>
            <select
              value={selectedProvince || ''}
              onChange={(e) => setSelectedProvince(e.target.value || null)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="">İl Seçiniz</option>
              {provincialData.slice(0, 30).map(p => (
                <option key={p.province} value={p.province}>{p.province}</option>
              ))}
            </select>
          </div>

          {/* Export Menu */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📥 DIŞA AKTAR
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={exportToExcel}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #22c55e',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📊 Excel
              </button>
              <button
                onClick={exportToPDF}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📄 PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'overview', icon: '🗺️', label: 'İl Genel Bakış', desc: 'Provincial Overview' },
          { id: 'districts', icon: '📍', label: 'İlçe Detayları', desc: 'District Deep Dive' },
          { id: 'trends', icon: '📈', label: 'Zaman Serisi', desc: 'Time Series & Trends' },
          { id: 'comparison', icon: '⚖️', label: 'Karşılaştırma', desc: 'Comparative Analysis' },
          { id: 'correlation', icon: '🔗', label: 'Korelasyon', desc: 'Ürünler arası içgörü' },
          { id: 'forecast', icon: '🔮', label: 'Tahmin', desc: 'Forecasting & Projection' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '16px 24px',
              borderRadius: '12px',
              border: activeTab === tab.id ? '2px solid #3b82f6' : '1px solid var(--border)',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg)',
              color: activeTab === tab.id ? '#3b82f6' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              minWidth: '180px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
            <div style={{ fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {tab.desc}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
