import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import type { ProvincialData, RegionalSummary } from './provincialPlantUtils';
import {
  UNSUR_OPTIONS,
  REGION_COLORS,
  formatNumber,
  formatShort,
  getProductColor,
  getProductIcon,
} from './provincialPlantUtils';

interface Props {
  top10Provinces: ProvincialData[];
  filteredProvincialData: ProvincialData[];
  regionalSummary: RegionalSummary[];
  selectedRegion: string;
  setSelectedRegion: (v: string) => void;
  setSelectedProvince: (v: string | null) => void;
  setActiveTab: (v: string) => void;
  selectedUnsur: string;
}

export function PlantOverviewTab({
  top10Provinces, filteredProvincialData, regionalSummary,
  selectedRegion, setSelectedRegion, setSelectedProvince, setActiveTab,
  selectedUnsur,
}: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        🗺️ İl Genel Bakış
      </h2>

      {/* Top 10 Provinces Intelligence Table */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🏆 Top 10 İl
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRETİM</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BASKIN ÜRÜN</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BÜYÜME</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>PAZAR PAYI</th>
              </tr>
            </thead>
            <tbody>
              {top10Provinces.map((province, idx) => (
                <tr
                  key={province.province}
                  onClick={() => {
                    setSelectedProvince(province.province);
                    setActiveTab('districts');
                  }}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: idx < 3 ? `linear-gradient(135deg, ${['#fbbf24', '#94a3b8', '#cd7f32'][idx]} 0%, ${['#f59e0b', '#64748b', '#a0522d'][idx]} 100%)` : 'rgba(100, 116, 139, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 800,
                      color: idx < 3 ? 'white' : 'var(--text-secondary)'
                    }}>
                      {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {province.province}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: `${REGION_COLORS[province.region] || '#64748b'}15`,
                      color: REGION_COLORS[province.region] || '#64748b',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {province.region}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatNumber(province.totalProduction)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || ''}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: `${getProductColor(province.dominantProduct)}15`,
                      color: getProductColor(province.dominantProduct),
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      <span>{getProductIcon(province.dominantProduct)}</span>
                      <span>{province.dominantProduct}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: province.growthRate >= 0 ? '#22c55e' : '#ef4444'
                    }}>
                      <span>{province.growthRate >= 0 ? '↗' : '↘'}</span>
                      <span>{province.growthRate >= 0 ? '+' : ''}{province.growthRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {province.marketShare.toFixed(2)}%
                    </div>
                    <div style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: 'rgba(100, 116, 139, 0.1)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(province.marketShare * 5, 100)}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                        borderRadius: '3px'
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional Distribution Pie Chart + Bar Chart */}
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
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            🥧 Bölgesel Dağılım
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={regionalSummary}
                dataKey="totalProduction"
                nameKey="region"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ percent }: { percent?: number }) => percent ? `${(percent * 100).toFixed(1)}%` : ''}
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
                formatter={(value: number) => formatNumber(value)}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            📊 İl Dağılımı (Top 15)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={filteredProvincialData.slice(0, 15)}
              layout="horizontal"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="category"
                dataKey="province"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                type="number"
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
                formatter={(value: number) => formatNumber(value)}
              />
              <Bar
                dataKey="totalProduction"
                radius={[8, 8, 0, 0]}
              >
                {filteredProvincialData.slice(0, 15).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '24px'
      }}>
        {regionalSummary.map(region => (
          <div
            key={region.region}
            onClick={() => setSelectedRegion(region.region)}
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${region.color}15 0%, ${region.color}05 100%)`,
              border: `2px solid ${selectedRegion === region.region ? region.color : `${region.color}30`}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: region.color,
              marginBottom: '8px'
            }}>
              {region.region}
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '4px'
            }}>
              {formatShort(region.totalProduction)}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              {region.provinceCount} il • Ort: {formatShort(region.averagePerProvince)}
            </div>
          </div>
        ))}
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
              value: item.totalProduction, 
              unit: UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || 'ton'
            }))}
            unitLabel={UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || 'ton'}
            height={450}
            fillMode="region"
            regionColors={REGION_COLORS}
            highlightRegion={selectedRegion !== 'Tümü' ? selectedRegion : undefined}
            dimNonSelected={selectedRegion !== 'Tümü'}
            onProvinceClick={(province) => {
              setSelectedProvince(province);
              setActiveTab('districts');
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
