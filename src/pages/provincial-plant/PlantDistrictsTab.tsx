import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import type { DistrictData } from './provincialPlantUtils';
import {
  REGION_COLORS,
  formatNumber,
  formatShort,
  getProductColor,
  getProductIcon,
} from './provincialPlantUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface Props {
  selectedProvince: string | null;
  districtData: DistrictData[];
}

export function PlantDistrictsTab({ selectedProvince, districtData }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        📍 İlçe Detay Analizi
      </h2>

      {selectedProvince ? (
        <>
          {/* Province Header */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>
              {selectedProvince}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Toplam İlçe Üretimi</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  {formatNumber(districtData.reduce((sum, d) => sum + d.totalProduction, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>İlçe Başına Ortalama</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  {formatShort(districtData.reduce((sum, d) => sum + d.totalProduction, 0) / (districtData.length || 1))}
                </div>
              </div>
            </div>
          </div>

          {/* District Intelligence Table */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📋 İlçe Detayları
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İLÇE</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRETİM</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BASKIN ÜRÜN</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL PAYI</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BÜYÜME</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TREND</th>
                  </tr>
                </thead>
                <tbody>
                  {districtData.map((district, idx) => (
                    <tr
                      key={district.district}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx < 3 ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: idx < 3 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.08)',
                          color: idx < 3 ? '#3b82f6' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          #{idx + 1}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {district.district}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatNumber(district.totalProduction)}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: `${getProductColor(district.dominantProduct)}15`,
                          color: getProductColor(district.dominantProduct),
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          <span>{getProductIcon(district.dominantProduct)}</span>
                          <span>{district.dominantProduct}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          {district.provinceShare.toFixed(2)}%
                        </div>
                        <div style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(100, 116, 139, 0.1)',
                          overflow: 'hidden',
                          width: '80px',
                          marginLeft: 'auto'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(district.provinceShare, 100)}%`,
                            background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: district.growthRate >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {district.growthRate >= 0 ? '+' : ''}{district.growthRate.toFixed(1)}%
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: district.trend === 'increasing' ? 'rgba(34, 197, 94, 0.1)' : district.trend === 'decreasing' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.08)',
                          color: district.trend === 'increasing' ? '#22c55e' : district.trend === 'decreasing' ? '#ef4444' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          <span>{district.trend === 'increasing' ? '📈' : district.trend === 'decreasing' ? '📉' : '➡️'}</span>
                          <span>{district.trend === 'increasing' ? 'Artış' : district.trend === 'decreasing' ? 'Düşüş' : 'Sabit'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* District Charts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px'
          }}>
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
                  📊 İlçe Üretim (Top 10)
                </h3>
                <ChartInsightButton title="📊 İlçe Üretimi" description="Top 10 ilçe üretim dağılımı" data={districtData.slice(0, 10)} context={{ section: 'İlçe' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={districtData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => formatShort(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="district"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Bar
                    dataKey="totalProduction"
                    radius={[0, 8, 8, 0]}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
                  🥧 İl Payı Dağılımı (Top 10)
                </h3>
                <ChartInsightButton title="🥧 İl Payı Dağılımı" description="Top 10 ilçe pay dağılımı" data={districtData.slice(0, 10)} context={{ section: 'İlçe' }} compact />
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={districtData.slice(0, 10)}
                    dataKey="provinceShare"
                    nameKey="district"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry: unknown) => {
                      const data = entry as Record<string, string | number>;
                      return `${data.district}: ${(data.provinceShare as number).toFixed(1)}%`;
                    }}
                    labelLine={{stroke: 'var(--text-secondary)', strokeWidth: 1}}
                  >
                    {districtData.slice(0, 10).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[Object.keys(REGION_COLORS)[index % 7]]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            İlçe bazlı analiz için lütfen bir il seçiniz
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Yukarıdaki filtre panelinden "İLÇE ANALİZİ İÇİN İL" dropdown'ından seçim yapabilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
