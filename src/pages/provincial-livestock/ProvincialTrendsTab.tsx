import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import {
  formatNumber,
  formatShort,
  calculateCAGR,
  type YearlyTrendData,
} from './provincialLivestockUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface Props {
  yearRange: [number, number];
  yearlyTrendData: YearlyTrendData[];
}

export default function ProvincialTrendsTab({
  yearRange,
  yearlyTrendData,
}: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        📈 Zaman Serisi & Trendler
      </h2>

      {/* Year Range Selector */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Zaman Aralığı Presetleri
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: 'Son 5 Yıl', years: 5 },
                { label: 'Son 10 Yıl', years: 10 },
                { label: 'Son 15 Yıl', years: 15 },
                { label: 'Tüm Veri (22 Yıl)', years: 22 }
              ].map(preset => (
                <button
                  key={preset.years}
                  onClick={() => {
                    console.log(`Selected preset: ${preset.label}`);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--card-bg)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trend KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Başlangıç ({yearRange[0]})
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {yearlyTrendData.length > 0 ? formatNumber(yearlyTrendData[0].value) : '-'}
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Güncel ({yearRange[1]})
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {yearlyTrendData.length > 0 ? formatNumber(yearlyTrendData[yearlyTrendData.length - 1].value) : '-'}
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📈</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            CAGR (Bileşik Büyüme)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {yearlyTrendData.length > 1 ? (
              <span style={{
                color: calculateCAGR(yearlyTrendData[0].value, yearlyTrendData[yearlyTrendData.length - 1].value, yearlyTrendData.length - 1) >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {calculateCAGR(yearlyTrendData[0].value, yearlyTrendData[yearlyTrendData.length - 1].value, yearlyTrendData.length - 1).toFixed(2)}%/yıl
              </span>
            ) : '-'}
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💹</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Toplam Değişim
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {yearlyTrendData.length > 1 ? (
              <span style={{
                color: (yearlyTrendData[yearlyTrendData.length - 1].value - yearlyTrendData[0].value) >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {((yearlyTrendData[yearlyTrendData.length - 1].value - yearlyTrendData[0].value) / yearlyTrendData[0].value * 100).toFixed(1)}%
              </span>
            ) : '-'}
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
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
            📊 {yearRange[0]}-{yearRange[1]} Yılları Arası Hayvan Popülasyon Trendi
          </h3>
          <ChartInsightButton title="📊 Popülasyon Trendi" description="Yıllar arası trend analizi" data={yearlyTrendData} context={{ section: 'Trend' }} compact />
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={yearlyTrendData}
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="year"
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
              labelFormatter={(label) => `Yıl: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Year-over-Year Growth Chart */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
            📊 Yıllık Büyüme Oranları (%)
          </h3>
          <ChartInsightButton title="📊 Büyüme Oranları" description="Yıllık büyüme yüzdeleri" data={yearlyTrendData} context={{ section: 'Trend' }} compact />
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={yearlyTrendData.map((item, idx) => {
              if (idx === 0) return { year: item.year, growth: 0 };
              const prevValue = yearlyTrendData[idx - 1].value;
              const growth = prevValue > 0 ? ((item.value - prevValue) / prevValue) * 100 : 0;
              return { year: item.year, growth };
            })}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Büyüme']}
              labelFormatter={(label) => `Yıl: ${label}`}
            />
            <Bar
              dataKey="growth"
              fill="#22c55e"
              radius={[8, 8, 0, 0]}
            >
              {yearlyTrendData.map((entry, index) => {
                if (index === 0) return <Cell key={`cell-${index}`} fill="#94a3b8" />;
                const prevValue = yearlyTrendData[index - 1].value;
                const growth = prevValue > 0 ? ((entry.value - prevValue) / prevValue) * 100 : 0;
                return <Cell key={`cell-${index}`} fill={growth >= 0 ? '#22c55e' : '#ef4444'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
