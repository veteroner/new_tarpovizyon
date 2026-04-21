import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import {
  formatNumber,
  formatShort,
  getAnimalColor,
  getAnimalIcon,
  REGION_COLORS,
  type ProvincialData,
  type RegionalSummary,
} from './provincialLivestockUtils';

interface Props {
  top10Provinces: ProvincialData[];
  filteredProvincialData: ProvincialData[];
  regionalSummary: RegionalSummary[];
  selectedRegion: string;
  setSelectedRegion: (v: string) => void;
  setSelectedProvince: (v: string | null) => void;
}

export default function ProvincialOverviewTab({
  top10Provinces,
  filteredProvincialData,
  regionalSummary,
  selectedRegion,
  setSelectedRegion,
  setSelectedProvince,
}: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        🗺️ İl Genel Bakış
      </h2>

      {/* Top 10 İller - Intelligence Format Table */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🏆 Top 10 İl - Hayvan Popülasyonu Sıralaması
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  SIRA
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  İL
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  TOPLAM POPÜLASYON
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  BASKIN HAYVAN
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  BÜYÜME
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  PAZAR PAYI
                </th>
              </tr>
            </thead>
            <tbody>
              {top10Provinces.map((province, idx) => (
                <tr
                  key={province.province}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelectedProvince(province.province)}
                >
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: idx === 0 ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' :
                                 idx === 1 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' :
                                 idx === 2 ? 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)' :
                                 'rgba(100, 116, 139, 0.08)',
                      color: idx < 3 ? 'white' : 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 700
                    }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {province.province}
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: `${REGION_COLORS[province.region]}15`,
                        color: REGION_COLORS[province.region]
                      }}>
                        {province.region}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatNumber(province.totalPopulation)}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: `${getAnimalColor(province.dominantAnimal)}15`,
                      border: `1px solid ${getAnimalColor(province.dominantAnimal)}30`
                    }}>
                      <span style={{ fontSize: '16px' }}>{getAnimalIcon(province.dominantAnimal)}</span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: getAnimalColor(province.dominantAnimal)
                      }}>
                        {province.dominantAnimal}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: province.growthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: province.growthRate >= 0 ? '#22c55e' : '#ef4444'
                    }}>
                      {province.growthRate >= 0 ? '↗' : '↘'} {Math.abs(province.growthRate).toFixed(1)}%
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {province.marketShare.toFixed(2)}%
                    </div>
                    <div style={{
                      marginTop: '4px',
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(100, 116, 139, 0.1)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(province.marketShare * 10, 100)}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #22c55e 100%)',
                        borderRadius: '2px'
                      }} />
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
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Provincial Distribution Bar Chart */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            📊 İl Bazında Dağılım (Top 15)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={filteredProvincialData.slice(0, 15)}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="province"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickFormatter={(value) => formatShort(value)}
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
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regional Distribution Pie Chart */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            🥧 Bölgesel Dağılım
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={regionalSummary}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }: { percent?: number }) => percent ? `${(percent * 100).toFixed(1)}%` : ''}
                outerRadius={100}
                fill="#8884d8"
                dataKey="totalPopulation"
                nameKey="region"
              >
                {regionalSummary.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional Summary Cards */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🌍 Bölgesel Özet
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {regionalSummary.map(region => (
            <div
              key={region.region}
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: `${region.color}08`,
                border: `1px solid ${region.color}30`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${region.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => setSelectedRegion(region.region)}
            >
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: region.color,
                marginBottom: '8px'
              }}>
                {region.region}
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                {formatNumber(region.totalPopulation)}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                {region.provinceCount} il • Ort. {formatShort(region.averagePerProvince)}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: region.growthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: region.growthRate >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {region.growthRate >= 0 ? '↗' : '↘'} {Math.abs(region.growthRate).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Turkey Heatmap */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🗺️ Türkiye İl Dağılım Haritası (Coğrafi Bölgeler)
        </h3>
        {filteredProvincialData.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
            İl verileri yükleniyor…
          </div>
        ) : (
          <TurkeyHeatMap
            regionTotals={filteredProvincialData.map((item) => ({
              name: item.province,
              value: item.totalPopulation,
              unit: 'baş'
            }))}
            unitLabel="baş"
            height={450}
            fillMode="region"
            regionColors={REGION_COLORS}
            highlightRegion={selectedRegion !== 'Tümü' ? selectedRegion : undefined}
            dimNonSelected={selectedRegion !== 'Tümü'}
            onProvinceClick={(province) => {
              setSelectedProvince(province);
            }}
          />
        )}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
          * İller coğrafi bölgesine göre renklidir — bir ile tıklayarak “İlçe Detayları” sekmesine geçebilirsiniz.
        </p>
      </div>
    </div>
  );
}
