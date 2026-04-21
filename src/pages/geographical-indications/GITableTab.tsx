import type { GIProduct } from './giTypes';
import { formatNumber } from './giTypes';

interface Props {
  allProducts: GIProduct[];
  filteredProducts: GIProduct[];
  selectedProvince: string;
  selectedStatus: string;
  selectedType: string;
  selectedGroup: string;
  searchTerm: string;
  onProvinceChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onGroupChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onExport: () => void;
}

export function GITableTab({
  allProducts,
  filteredProducts,
  selectedProvince,
  selectedStatus,
  selectedType,
  selectedGroup,
  searchTerm,
  onProvinceChange,
  onStatusChange,
  onTypeChange,
  onGroupChange,
  onSearchChange,
  onExport
}: Props) {
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          📊 Tüm Coğrafi İşaretli Gıda Ürünleri
        </h2>
        <button
          onClick={onExport}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📥 Excel İndir
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Province filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              İl Filtresi
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => onProvinceChange(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="Tümü">Tüm İller</option>
              {Array.from(new Set(allProducts.map(p => p.province))).sort().map(province => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Durum Filtresi
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="Tümü">Tüm Durumlar</option>
              <option value="Tescilli">Tescilli</option>
              <option value="Başvuru">Başvuru</option>
            </select>
          </div>

          {/* Type filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Tür Filtresi
            </label>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="Tümü">Tüm Türler</option>
              {Array.from(new Set(allProducts.map(p => p.type))).sort().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Group filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Ürün Grubu Filtresi
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => onGroupChange(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="Tümü">Tüm Gruplar</option>
              {Array.from(new Set(allProducts.map(p => p.productGroup))).sort().map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Arama
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ürün adı ara..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Toplam {formatNumber(filteredProducts.length)} ürün gösteriliyor
      </div>

      {/* Products Table */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>#</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN ADI</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN GRUBU</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TÜR</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>DURUM</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU TARİHİ</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİL TARİHİ</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.slice(0, 100).map((product, idx) => (
                <tr
                  key={product.id}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</td>
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{product.province}</td>
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{product.productGroup}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{
                      display: 'inline-block', padding: '4px 8px', borderRadius: '6px',
                      background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', fontSize: '11px', fontWeight: 600
                    }}>
                      {product.type}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{
                      display: 'inline-block', padding: '4px 8px', borderRadius: '6px',
                      background: product.status === 'Tescilli' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: product.status === 'Tescilli' ? '#10b981' : '#f59e0b',
                      fontSize: '11px', fontWeight: 600
                    }}>
                      {product.status}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{product.applicationDate}</td>
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {product.registrationDate === '-' ? '-' : product.registrationDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length > 100 && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            İlk 100 ürün gösteriliyor. Tüm verileri görmek için Excel'i indirin.
          </div>
        )}
      </div>
    </div>
  );
}
