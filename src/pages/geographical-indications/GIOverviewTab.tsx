import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from 'recharts';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import type { ProvinceData, GIMetrics } from './giTypes';
import { COLORS, formatNumber } from './giTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface Props {
  provinceData: ProvinceData[];
  metrics: GIMetrics;
  allProductsCount: number;
  registeredCount: number;
  pendingCount: number;
  typeData: { type: string; count: number }[];
  onProvinceClick: (province: string) => void;
}

export function GIOverviewTab({
  provinceData,
  registeredCount,
  pendingCount,
  typeData,
  onProvinceClick
}: Props) {
  const statusPieData = [
    { name: 'Tescilli', value: registeredCount },
    { name: 'Başvuru', value: pendingCount }
  ];

  return (
    <div>
      {/* Turkey Heatmap */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🗺️ İllere Göre Coğrafi İşaretli Gıda Dağılımı
        </h3>
        <TurkeyHeatMap
          regionTotals={provinceData.map(p => ({
            name: p.province,
            value: p.totalProducts,
            unit: 'ürün',
          }))}
          unitLabel="ürün"
          height={420}
          fillMode="heat"
          onProvinceClick={(province) => onProvinceClick(province)}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Status Distribution */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
              📊 Durum Dağılımı
            </h3>
            <ChartInsightButton title="📊 Durum Dağılımı" description="Coğrafi işaretli ürünlerin durum dağılımı" data={statusPieData} context={{ section: 'Coğrafi İşaretler' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusPieData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                labelLine={true}
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
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

        {/* Type Distribution */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
              🏷️ İşaret Türü Dağılımı
            </h3>
            <ChartInsightButton title="🏷️ İşaret Türü Dağılımı" description="Coğrafi işaret türüne göre dağılım" data={typeData} context={{ section: 'Coğrafi İşaretler' }} compact />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="count"
                nameKey="type"
                label={({ type, count }: any) => `${type}: ${formatNumber(count)}`}
                labelLine={true}
              >
                {typeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
      </div>

      {/* Top 10 Provinces */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🏆 En Çok Coğrafi İşaretli Gıda Üreyen 10 İl
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BÖLGE</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOPLAM</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİLLİ</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU</th>
              </tr>
            </thead>
            <tbody>
              {provinceData.slice(0, 10).map((p, idx) => (
                <tr
                  key={p.province}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => onProvinceClick(p.province)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>{p.province}</td>
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.region}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatNumber(p.totalProducts)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                    {formatNumber(p.registered)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>
                    {formatNumber(p.pending)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          * Detayları görmek için il adına tıklayın
        </div>
      </div>
    </div>
  );
}
