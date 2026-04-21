import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type YearTrendData, COLORS, formatNumber } from './beekeepingTypes';

export function BeekeepingDevelopmentSection({ yearTrendData }: { yearTrendData: YearTrendData[] }) {
  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          📈 Arıcılık Gelişimi (2013-2023)
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Türkiye geneli arıcı sayısı ve kovan gelişimi tarihsel trend analizi
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          gridColumn: 'span 2',
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🐝 Arıcı Sayısı Gelişimi
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={yearTrendData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBeekeepers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatNumber} />
              <Tooltip 
                formatter={(value: number) => [formatNumber(value) + ' arıcı', 'Toplam Arıcı']}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area 
                type="monotone" 
                dataKey="beekeepers" 
                stroke={COLORS.primary} 
                fill="url(#colorBeekeepers)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
