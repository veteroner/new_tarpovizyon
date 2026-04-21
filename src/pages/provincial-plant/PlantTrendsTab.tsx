import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from 'recharts';
import type { YearlyTrendData } from './provincialPlantUtils';
import { formatNumber, formatShort, calculateCAGR } from './provincialPlantUtils';

interface Props {
  yearRange: [number, number];
  setYearRange: (v: [number, number]) => void;
  yearlyTrendData: YearlyTrendData[];
}

export function PlantTrendsTab({ yearRange, setYearRange, yearlyTrendData }: Props) {
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
        border: '1px solid var(--border)'
      }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>
          📅 YIL ARALIĞI
        </label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Son 5 Yıl', years: 5 },
            { label: 'Son 10 Yıl', years: 10 },
            { label: 'Son 15 Yıl', years: 15 },
            { label: 'Tüm Veri (22 Yıl)', years: 22 }
          ].map(preset => (
            <button
              key={preset.years}
              onClick={() => {
                setYearRange([2025 - preset.years + 1, 2025]);
                console.log(`Year range set to ${preset.years} years`);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: yearRange[1] - yearRange[0] + 1 === preset.years ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg)',
                color: yearRange[1] - yearRange[0] + 1 === preset.years ? '#3b82f6' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trend KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {(() => {
          const rangeData = yearlyTrendData.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]);
          const startVal = rangeData[0]?.value || 0;
          const endVal = rangeData[rangeData.length - 1]?.value || 0;
          const years = rangeData.length - 1;
          const cagr = calculateCAGR(startVal, endVal, years);
          const totalChange = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;

          return (
            <>
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  CAGR ({yearRange[0]}-{yearRange[1]})
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: cagr >= 0 ? '#22c55e' : '#ef4444' }}>
                  {cagr >= 0 ? '+' : ''}{cagr.toFixed(2)}%
                </div>
              </div>
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Başlangıç ({yearRange[0]})
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatNumber(startVal)}
                </div>
              </div>
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Son Değer ({yearRange[1]})
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatNumber(endVal)}
                </div>
              </div>
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Toplam Değişim
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: totalChange >= 0 ? '#22c55e' : '#ef4444' }}>
                  {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(1)}%
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* 22-Year Trend Area Chart */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          📈 22 Yıllık Trend (2004-2025)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={yearlyTrendData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
              formatter={(value: number) => formatNumber(value)}
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

      {/* Year-over-Year Growth */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          📊 Yıllık Büyüme Oranları
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={yearlyTrendData.map((d, idx) => {
              if (idx === 0) return { year: d.year, growth: 0 };
              const prevValue = yearlyTrendData[idx - 1].value;
              const growth = prevValue > 0 ? ((d.value - prevValue) / prevValue) * 100 : 0;
              return { year: d.year, growth };
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
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Bar
              dataKey="growth"
              radius={[8, 8, 0, 0]}
            >
              {yearlyTrendData.map((_entry, index) => {
                if (index === 0) return <Cell key={`cell-${index}`} fill="#64748b" />;
                const prevValue = yearlyTrendData[index - 1].value;
                const currentValue = yearlyTrendData[index].value;
                const growth = currentValue - prevValue;
                return <Cell key={`cell-${index}`} fill={growth >= 0 ? '#22c55e' : '#ef4444'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
