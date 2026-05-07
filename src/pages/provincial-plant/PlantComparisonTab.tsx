import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import type { ProvincialData, RegionalSummary } from './provincialPlantUtils';
import { REGION_COLORS, formatNumber, formatShort } from './provincialPlantUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface Props {
  filteredProvincialData: ProvincialData[];
  regionalSummary: RegionalSummary[];
}

export function PlantComparisonTab({ filteredProvincialData, regionalSummary }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        ⚖️ İller Arası Karşılaştırma
      </h2>

      {/* Top 20 Provinces Comparison */}
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
            📊 Top 20 İl Karşılaştırma
          </h3>
          <ChartInsightButton title="📊 Top 20 İl Karşılaştırma" description="İl bazında bitkisel üretim" data={filteredProvincialData.slice(0, 20)} context={{ section: 'İl Karşılaştırma' }} compact />
        </div>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={filteredProvincialData.slice(0, 20)}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis 
              type="number"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickFormatter={(value) => formatShort(value)}
            />
            <YAxis 
              type="category"
              dataKey="province" 
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              width={110}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number, _name: string, props: unknown) => {
                const payload = (props as Record<string, Record<string, number>>).payload;
                return [formatNumber(value), `Üretim (${payload.marketShare.toFixed(2)}% pazar payı)`];
              }}
            />
            <Bar 
              dataKey="totalProduction" 
              radius={[0, 8, 8, 0]}
            >
              {filteredProvincialData.slice(0, 20).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Regional Comparison Cards */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🌍 Bölgesel Karşılaştırma Metrikleri
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {regionalSummary.map(region => (
            <div
              key={region.region}
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${region.color}15 0%, ${region.color}05 100%)`,
                border: `2px solid ${region.color}30`
              }}
            >
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: region.color,
                marginBottom: '12px'
              }}>
                {region.region}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Toplam Üretim
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatNumber(region.totalProduction)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    İl Sayısı
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {region.provinceCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Ortalama/İl
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatShort(region.averagePerProvince)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Büyüme
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: region.growthRate >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {region.growthRate >= 0 ? '+' : ''}{region.growthRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
