import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { YearlyTrend } from './giTypes';
import { formatNumber } from './giTypes';

interface Props {
  yearlyTrend: YearlyTrend[];
}

export function GITrendsTab({ yearlyTrend }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        📈 Yıllara Göre Trend Analizi
      </h2>

      {/* Yearly Trend Chart */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          📊 Yıllık Tescil ve Başvuru Sayıları
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={yearlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
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
            <Area
              type="monotone"
              dataKey="registered"
              name="Tescilli"
              stroke="#10b981"
              fill="#10b98120"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="applications"
              name="Başvuru"
              stroke="#f59e0b"
              fill="#f59e0b20"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Yearly Statistics Table */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Yıl Bazında İstatistikler
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>YIL</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TESCİLLİ</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BAŞVURU</th>
              </tr>
            </thead>
            <tbody>
              {yearlyTrend.slice().reverse().map((year) => (
                <tr
                  key={year.year}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {year.year}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                    {formatNumber(year.registered)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>
                    {formatNumber(year.applications)}
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
