import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { YearPoint, TuikChickenData } from './whiteMeatUtils';
import { formatTon, formatShort } from './whiteMeatUtils';
import { ChartInsightButton } from '../../components/ChartInsightButton';

type Props = {
  series: YearPoint[];
  latest: YearPoint | undefined;
  yoy: number;
  worldRanking: { world: number; eu: number } | null;
  tuikData: TuikChickenData[];
};

export default function WhiteMeatHeroSection({ series, latest, yoy, worldRanking, tuikData }: Props) {
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header">
            <span className="kpi-title">SON YIL</span>
          </div>
          <div className="kpi-value">{formatTon(latest?.poultryTon ?? 0)}</div>
          <div className="kpi-subtitle">({latest?.year ?? '-'})</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YILLIK DEĞİŞİM</span>
            <div className={`kpi-icon ${yoy >= 0 ? 'green' : 'red'}`}>{yoy >= 0 ? '📈' : '📉'}</div>
          </div>
          <div className="kpi-value" style={{ color: yoy >= 0 ? '#22c55e' : '#ef4444' }}>
            %{yoy.toFixed(1)}
          </div>
          <div className="kpi-subtitle">Önceki yıla göre</div>
        </div>

        {worldRanking && (
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">TAVUK ETİ</span>
              <div className="kpi-icon orange">🐔</div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRanking.world}</div>
            <div className="kpi-subtitle">AB #{worldRanking.eu}</div>
          </div>
        )}
      </div>

      {/* Intelligence Panel */}
      {tuikData.length > 0 && (() => {
        const lastYear = tuikData[0];
        const firstYear = tuikData[tuikData.length - 1];
        const years = tuikData.length - 1;
        
        const slaughterCAGR = years > 0 
          ? ((Math.pow(lastYear.slaughtered / firstYear.slaughtered, 1 / years) - 1) * 100) 
          : 0;
        
        const meatCAGR = years > 0
          ? ((Math.pow(lastYear.meatProduction / firstYear.meatProduction, 1 / years) - 1) * 100)
          : 0;
        
        const hatchSuccessChange = lastYear.hatchRate - firstYear.hatchRate;
        
        return (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '24px',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧠 Beyaz Et İçgörü Özeti
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>KESİM CAGR</div>
                <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{slaughterCAGR.toFixed(1)}%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>{years} Yıl Büyüme</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>ÜRETİM CAGR</div>
                <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{meatCAGR.toFixed(1)}%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Et Üretimi ({years}Y)</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>KULUÇKA BAŞARI</div>
                <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{hatchSuccessChange > 0 ? '+' : ''}{hatchSuccessChange.toFixed(1)}%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Verimlilik Artışı</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>TAVUK BAŞI VERİM</div>
                <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{lastYear.yieldPerBird.toFixed(2)} kg</div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Güncel Performans</div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📈 Kanatlı Eti Üretimi Trendi</h3>
            <ChartInsightButton title="📈 Kanatlı Eti Üretimi Trendi" description="Kanatlı eti uzun dönem üretim trendi" data={series} context={{ section: 'Trend' }} />
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(Number(v))}
              />
              <Tooltip
                formatter={(value: number) => [formatTon(value), 'Kanatlı Eti']}
                labelFormatter={(label) => `Yıl: ${label}`}
              />
              <Area type="monotone" dataKey="poultryTon" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
