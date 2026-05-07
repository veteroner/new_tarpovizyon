import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { ProductGroupData } from './giTypes';
import { formatNumber } from './giTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface Props {
  productGroupData: ProductGroupData[];
}

export function GIProductsTab({ productGroupData }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        🏷️ Ürün Grupları Analizi
      </h2>

      {/* Product Groups Chart */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
            📊 Ürün Gruplarına Göre Dağılım (Top 15)
          </h3>
          <ChartInsightButton title="📊 Ürün Grupları" description="Coğrafi işaretli ürün grupları dağılımı" data={productGroupData} context={{ section: 'Coğrafi İşaretler Ürünler' }} compact />
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={productGroupData.slice(0, 15)}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis
              type="category"
              dataKey="group"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              width={190}
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
            <Legend />
            <Bar dataKey="registered" name="Tescilli" stackId="a" fill="#10b981" />
            <Bar dataKey="pending" name="Başvuru" stackId="a" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Product Groups Table */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Detaylı Ürün Grubu Tablosu
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRÜN GRUBU</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOPLAM</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİLLİ</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİL ORANI</th>
              </tr>
            </thead>
            <tbody>
              {productGroupData.map((group, idx) => (
                <tr
                  key={group.group}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{group.group}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatNumber(group.count)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                    {formatNumber(group.registered)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>
                    {formatNumber(group.pending)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      %{((group.registered / group.count) * 100).toFixed(1)}
                    </div>
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
