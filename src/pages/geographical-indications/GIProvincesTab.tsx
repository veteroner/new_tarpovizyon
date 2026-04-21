import type { GIProduct, ProvinceData } from './giTypes';
import { formatNumber } from './giTypes';

interface Props {
  provinceData: ProvinceData[];
  allProducts: GIProduct[];
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
}

export function GIProvincesTab({ provinceData, allProducts, selectedProvince, onProvinceChange }: Props) {
  const selectedData = provinceData.find(p => p.province === selectedProvince);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        📍 İl Bazında Coğrafi İşaretli Gıda Ürünleri
      </h2>

      {/* Province Selector */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          İl Seçimi (Gıda Ürünleri)
        </label>
        <select
          value={selectedProvince}
          onChange={(e) => onProvinceChange(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
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
          <option value="Tümü">Tüm İller</option>
          {provinceData.map(p => (
            <option key={p.province} value={p.province}>
              {p.province} ({p.totalProducts} ürün)
            </option>
          ))}
        </select>
      </div>

      {/* Province Detail Card */}
      {selectedProvince !== 'Tümü' && selectedData && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            {selectedProvince}
          </div>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>Toplam Ürün</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{formatNumber(selectedData.totalProducts)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>Tescilli</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{formatNumber(selectedData.registered)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>Başvuru</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{formatNumber(selectedData.pending)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          {selectedProvince === 'Tümü' ? 'Tüm Gıda Ürünleri' : `${selectedProvince} Coğrafi İşaretli Gıda Ürünleri`}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>#</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN ADI</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN GRUBU</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TÜR</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>DURUM</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİL TARİHİ</th>
              </tr>
            </thead>
            <tbody>
              {allProducts
                .filter(p => selectedProvince === 'Tümü' || p.province === selectedProvince)
                .slice(0, 50)
                .map((product, idx) => (
                  <tr
                    key={product.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</td>
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
                    <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {product.registrationDate === '-' ? '-' : product.registrationDate}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
