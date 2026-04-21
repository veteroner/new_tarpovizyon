import type { ProvincialData, AggregatedMetrics } from './provincialPlantUtils';
import { formatNumber } from './provincialPlantUtils';

interface Props {
  top10Provinces: ProvincialData[];
  metrics: AggregatedMetrics;
  yearRange: [number, number];
}

export function PlantForecastTab({ top10Provinces, metrics, yearRange }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
        🔮 Tahmin & Projeksiyon
      </h2>

      {/* Forecast Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
          📊 Gelecek Projeksiyonları
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Geçmiş trendlere dayalı olarak {yearRange[0]}-{yearRange[1]} yılları arasındaki büyüme oranları kullanılarak
          gelecek 3-5 yıl için tahminler yapılmaktadır.
        </div>
      </div>

      {/* Growth Projections for Top 5 Provinces */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          📈 Top 5 İl Büyüme Projeksiyonları (2026-2028)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  İL
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  GÜNCEL (2025)
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  TAHMİN 2026
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  TAHMİN 2027
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  TAHMİN 2028
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  TREND
                </th>
              </tr>
            </thead>
            <tbody>
              {top10Provinces.slice(0, 5).map(province => {
                const growthRate = province.growthRate / 100;
                const current = province.totalProduction;
                const forecast2026 = current * (1 + growthRate);
                const forecast2027 = forecast2026 * (1 + growthRate);
                const forecast2028 = forecast2027 * (1 + growthRate);

                return (
                  <tr 
                    key={province.province}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '16px 8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {province.province}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginTop: '2px'
                      }}>
                        Büyüme: {province.growthRate.toFixed(1)}%/yıl
                      </div>
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatNumber(current)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>
                        {formatNumber(forecast2026)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>
                        {formatNumber(forecast2027)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>
                        {formatNumber(forecast2028)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '20px',
                        background: growthRate > 0 ? 'rgba(34, 197, 94, 0.1)' : growthRate < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)'
                      }}>
                        {growthRate > 0 ? '🚀' : growthRate < 0 ? '📉' : '➡️'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario Analysis */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {['Optimistic', 'Realistic', 'Pessimistic'].map((scenario, idx) => {
          const multipliers = [1.5, 1.0, 0.5];
          const totalCurrent = metrics.totalProduction;
          const avgGrowth = metrics.avgGrowthRate / 100;
          const scenarioGrowth = avgGrowth * multipliers[idx];
          const forecast2028 = totalCurrent * Math.pow(1 + scenarioGrowth, 3);
          const colors = ['#22c55e', '#3b82f6', '#f59e0b'];

          return (
            <div
              key={scenario}
              style={{
                background: 'var(--card-bg)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: `2px solid ${colors[idx]}30`
              }}
            >
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: colors[idx],
                marginBottom: '12px'
              }}>
                {scenario === 'Optimistic' ? '🌟 İyimser Senaryo' : 
                 scenario === 'Realistic' ? '🎯 Gerçekçi Senaryo' : 
                 '⚠️ Kart Senaryo'}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginBottom: '16px'
              }}>
                Yıllık büyüme: <strong>{(scenarioGrowth * 100).toFixed(1)}%</strong>
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                {formatNumber(forecast2028)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                2028 Tahmini
              </div>
              <div style={{
                marginTop: '12px',
                padding: '8px',
                borderRadius: '6px',
                background: `${colors[idx]}10`,
                fontSize: '12px',
                fontWeight: 600,
                color: colors[idx],
                textAlign: 'center'
              }}>
                {((forecast2028 - totalCurrent) / totalCurrent * 100).toFixed(1)}% artış
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
