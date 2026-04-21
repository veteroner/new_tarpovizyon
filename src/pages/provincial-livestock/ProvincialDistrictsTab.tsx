import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  formatNumber,
  formatShort,
  getAnimalColor,
  getAnimalIcon,
  type DistrictData,
} from './provincialLivestockUtils';

interface Props {
  selectedProvince: string | null;
  selectedAnimals: string[];
  selectedYear: string;
  districtData: DistrictData[];
  setSelectedProvince: (v: string | null) => void;
}

export default function ProvincialDistrictsTab({
  selectedProvince,
  selectedAnimals,
  selectedYear,
  districtData,
  setSelectedProvince: _setSelectedProvince,
}: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        📍 İlçe Detay Analizi
      </h2>
      {selectedProvince ? (
        <div>
          {/* Province Info Header */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Seçili İl</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>{selectedProvince}</div>
                <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>
                  {districtData.length} ilçe • {selectedAnimals.join(', ')} • {selectedYear.substring(1)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.85 }}>Toplam Popülasyon</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>
                    {formatNumber(districtData.reduce((sum, d) => sum + d.totalPopulation, 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.85 }}>Ortalama/İlçe</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>
                    {formatNumber(districtData.reduce((sum, d) => sum + d.totalPopulation, 0) / (districtData.length || 1))}
                  </div>
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
              📊 İlçeler Detay Tablosu
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      SIRA
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      İLÇE
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      POPÜLASYON
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      BASKIN HAYVAN
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      İL İÇİ PAY
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      BÜYÜME
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      TREND
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {districtData.map((district, idx) => (
                    <tr
                      key={district.district}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: idx < 3 ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'rgba(100, 116, 139, 0.08)',
                          color: idx < 3 ? 'white' : 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 700
                        }}>
                          {idx + 1}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {district.district}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatNumber(district.totalPopulation)}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: `${getAnimalColor(district.dominantAnimal)}15`,
                          border: `1px solid ${getAnimalColor(district.dominantAnimal)}30`
                        }}>
                          <span style={{ fontSize: '16px' }}>{getAnimalIcon(district.dominantAnimal)}</span>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: getAnimalColor(district.dominantAnimal)
                          }}>
                            {district.dominantAnimal}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {district.provinceShare.toFixed(2)}%
                        </div>
                        <div style={{
                          height: '4px',
                          borderRadius: '2px',
                          background: 'rgba(100, 116, 139, 0.1)',
                          overflow: 'hidden',
                          width: '80px',
                          marginLeft: 'auto'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(district.provinceShare, 100)}%`,
                            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: '2px'
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: district.growthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: district.growthRate >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {district.growthRate >= 0 ? '↗' : '↘'} {Math.abs(district.growthRate).toFixed(1)}%
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: district.trend === 'increasing' ? 'rgba(34, 197, 94, 0.1)' :
                                     district.trend === 'decreasing' ? 'rgba(239, 68, 68, 0.1)' :
                                     'rgba(100, 116, 139, 0.1)',
                          color: district.trend === 'increasing' ? '#22c55e' :
                                district.trend === 'decreasing' ? '#ef4444' :
                                '#64748b'
                        }}>
                          {district.trend === 'increasing' ? '📈 Artış' :
                           district.trend === 'decreasing' ? '📉 Düşüş' :
                           '➡️ Sabit'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '24px'
          }}>
            {/* District Bar Chart */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                📊 İlçe Popülasyon Dağılımı
              </h3>
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
                    formatter={(value: number) => [formatNumber(value), 'Popülasyon']}
                  />
                  <Bar
                    dataKey="totalPopulation"
                    fill="#8b5cf6"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Province Share Pie Chart */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                🥧 İl İçi Pay Dağılımı (Top 10)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={districtData.slice(0, 10)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: unknown) => {
                      const data = entry as Record<string, string | number>;
                      return `${data.district} (${(data.provinceShare as number).toFixed(1)}%)`;
                    }}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="totalPopulation"
                  >
                    {districtData.slice(0, 10).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${(index * 36) % 360}, 70%, 60%)`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatNumber(value), 'Popülasyon']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '2px dashed var(--border)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📍</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            İl Seçimi Gerekli
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            İlçe detay analizi için lütfen yukarıdaki filtrelerden bir il seçin
          </p>
          <div style={{
            display: 'inline-block',
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            fontSize: '13px',
            fontWeight: 600
          }}>
            💡 İpucu: Tab 1'deki tabloda bir ile tıklayarak da seçebilirsiniz
          </div>
        </div>
      )}
    </div>
  );
}
