import type { ProvincialData } from './provincialPlantUtils';
import { formatNumber, getProductColor, getProductIcon } from './provincialPlantUtils';

interface Props {
  top10Provinces: ProvincialData[];
  selectedProducts: string[];
}

export function PlantCorrelationTab({ top10Provinces, selectedProducts }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        🔗 Ürün Türleri Korelasyon Analizi
      </h2>

      {/* Product Distribution by Top Provinces */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🌾 Ürün Türü Dağılımı (Top 10 İl)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  İL
                </th>
                {selectedProducts.map(product => (
                  <th key={product} style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: getProductColor(product) }}>
                    {getProductIcon(product)} {product}
                  </th>
                ))}
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  TOPLAM
                </th>
              </tr>
            </thead>
            <tbody>
              {top10Provinces.map(province => (
                <tr 
                  key={province.province}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {province.province}
                    </div>
                  </td>
                  {selectedProducts.map(product => (
                    <td key={product} style={{ padding: '16px 8px', textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatNumber(province.productAmounts[product] || 0)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginTop: '2px'
                      }}>
                        {province.totalProduction > 0 ? 
                          ((province.productAmounts[product] || 0) / province.totalProduction * 100).toFixed(1) : 
                          '0.0'
                        }%
                      </div>
                    </td>
                  ))}
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatNumber(province.totalProduction)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diversity Score Cards */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🌈 Çeşitlilik Skorları (Top 10)
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {top10Provinces.map((province, idx) => {
            const diversityScore = Object.keys(province.productAmounts).length;
            return (
              <div
                key={province.province}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {province.province}
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: idx < 3 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                    color: idx < 3 ? '#22c55e' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    #{idx + 1}
                  </div>
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#8b5cf6',
                  marginBottom: '4px'
                }}>
                  {diversityScore}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  farklı ürün türü
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
