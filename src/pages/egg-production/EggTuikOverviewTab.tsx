import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikEggData } from './eggProductionTypes';
import { formatShort } from './eggProductionTypes';

interface EggTuikOverviewTabProps {
  tuikData: TuikEggData[];
}

export function EggTuikOverviewTab({ tuikData }: EggTuikOverviewTabProps) {
  return (
    <>
      {/* TÜİK KPI Kartları */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YUMURTA ÜRETİMİ (2025)</span>
            <div className="kpi-icon orange">🥚</div>
          </div>
          <div className="kpi-value">{formatShort(tuikData[0]?.eggProduction * 1000)} adet</div>
          <div className="kpi-subtitle">{tuikData[0]?.eggProduction.toLocaleString('tr-TR')} bin adet</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">YUMURTACI TAVUK</span>
            <div className="kpi-icon green">🐔</div>
          </div>
          <div className="kpi-value">{formatShort(tuikData[0]?.layerCount * 1000)} adet</div>
          <div className="kpi-subtitle">{tuikData[0]?.layerCount.toLocaleString('tr-TR')} bin adet</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">TAVUK BAŞINA VERİM</span>
            <div className="kpi-icon blue">📊</div>
          </div>
          <div className="kpi-value">{tuikData[0]?.yieldPerBird.toFixed(0)} adet/yıl</div>
          <div className="kpi-subtitle">Yıllık ortalama</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">KULUÇKA YUMURTAs</span>
            <div className="kpi-icon yellow">🥚</div>
          </div>
          <div className="kpi-value">{formatShort(tuikData[0]?.hatchedEggs * 1000)} adet</div>
          <div className="kpi-subtitle">{tuikData[0]?.hatchedEggs.toLocaleString('tr-TR')} bin adet</div>
        </div>
      </div>

      {/* Kombine Üretim Grafiği */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">📊 Yumurta Üretimi vs Yumurtacı Tavuk (Dual Axis)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={tuikData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v * 1000)}
                label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v * 1000)}
                label={{ value: 'Tavuk Sayısı (adet)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="eggProduction" name="Yumurta Üretimi (bin adet)" fill="#f59e0b" opacity={0.7} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="layerCount" name="Yumurtacı Tavuk (bin adet)" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Üretim Akışı */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">🔄 Üretim Akışı: Tavuk → Yumurta (2025)</h3>
          <div style={{ padding: '30px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '220px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🐔</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>
                {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Yumurtacı Tavuk<br />(bin adet)
              </div>
            </div>
            <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '220px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🥚</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>
                {(tuikData[0]?.eggProduction || 0).toLocaleString('tr-TR')}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Yumurta Üretimi<br />(bin adet)
              </div>
            </div>
            <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
            <div style={{ textAlign: 'center', flex: '1', minWidth: '220px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#3b82f6' }}>
                {tuikData[0]?.yieldPerBird.toFixed(0)}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Tavuk Başına Verim<br />(adet/yıl)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Özet İstatistikler */}
      <div style={{ marginTop: '30px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
          📊 TÜİK Yumurta Üretimi Özet İstatistikler (2010-2025)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Toplam Yumurta Üretimi (16 yıl)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>
              {formatShort(tuikData.reduce((sum, d) => sum + d.eggProduction, 0) * 1000)} adet
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ortalama Tavuk Başına Verim</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#3b82f6' }}>
              {(tuikData.reduce((sum, d) => sum + d.yieldPerBird, 0) / tuikData.length).toFixed(0)} adet/yıl
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Toplam Kuluçka Yumurtası (16 yıl)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f59e0b' }}>
              {formatShort(tuikData.reduce((sum, d) => sum + d.hatchedEggs, 0) * 1000)} adet
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Yıllık Ortalama Büyüme</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#10b981' }}>
              %{(() => {
                const first = tuikData[tuikData.length - 1]?.eggProduction || 1;
                const last = tuikData[0]?.eggProduction || 1;
                const years = tuikData.length - 1;
                return ((Math.pow(last / first, 1 / years) - 1) * 100).toFixed(2);
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
