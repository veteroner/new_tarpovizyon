import React from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, Area, Line
} from 'recharts';

interface HistoricalTrendsSectionProps {
  historicalChartData: Record<string, string | number>[];
  yearRange: string;
  setYearRange: (v: string) => void;
}

const HistoricalTrendsSection: React.FC<HistoricalTrendsSectionProps> = ({
  historicalChartData, yearRange, setYearRange
}) => {
  if (historicalChartData.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: '48px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
            📈 Tarihsel Üretim Trendleri
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            1961-2024 dönemi hayvansal ürün üretim trendleri
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['last5', 'last10', 'last20', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setYearRange(range)}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: yearRange === range ? 'none' : '1px solid var(--border)',
                background: yearRange === range ? 'var(--primary)' : 'var(--bg-card)',
                color: yearRange === range ? 'white' : 'var(--text-primary)',
                cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s'
              }}
            >
              {range === 'all' ? 'Tüm Veri' : `Son ${range.replace('last', '')} Yıl`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '48px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={historicalChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
            <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="Süt (M ton)" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="Kırmızı Et (K ton)" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="Kanatlı (K ton)" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="Yumurta (M adet)" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24', r: 2 }} />
            <Line yAxisId="right" type="monotone" dataKey="Bal (K ton)" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default HistoricalTrendsSection;
