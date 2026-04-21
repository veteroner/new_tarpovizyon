import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikEggData, MonthlyEggData } from './eggProductionTypes';
import { formatShort } from './eggProductionTypes';

interface EggTuikProductionTabProps {
  tuikData: TuikEggData[];
  monthlyEgg: MonthlyEggData[];
  monthlyLayer: MonthlyEggData[];
}

export function EggTuikProductionTab({ tuikData, monthlyEgg, monthlyLayer }: EggTuikProductionTabProps) {
  return (
    <>
      {/* Üretim Trendleri */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🥚 Yıllık Yumurta Üretimi (2010-2025)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={tuikData.slice().reverse()}>
              <defs>
                <linearGradient id="colorEgg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v * 1000)}
                label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet', 'Üretim']}
              />
              <Area type="monotone" dataKey="eggProduction" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorEgg)" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>2025 Üretim:</strong> {(tuikData[0]?.eggProduction || 0).toLocaleString('tr-TR')} bin adet
            <br />
            <strong>16 yıl büyüme:</strong> %{(() => {
              const first = tuikData[tuikData.length - 1]?.eggProduction || 1;
              const last = tuikData[0]?.eggProduction || 1;
              return ((last - first) / first * 100).toFixed(2);
            })()}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🐔 Yıllık Yumurtacı Tavuk Sayısı (2010-2025)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={tuikData.slice().reverse()}>
              <defs>
                <linearGradient id="colorLayer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v * 1000)}
                label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet', 'Tavuk']}
              />
              <Area type="monotone" dataKey="layerCount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLayer)" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>2025 Sayı:</strong> {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')} bin adet
            <br />
            <strong>16 yıl büyüme:</strong> %{(() => {
              const first = tuikData[tuikData.length - 1]?.layerCount || 1;
              const last = tuikData[0]?.layerCount || 1;
              return ((last - first) / first * 100).toFixed(2);
            })()}
          </div>
        </div>
      </div>

      {/* 2025 Aylık Dağılım */}
      {monthlyEgg.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>📅 2025 Aylık Dağılım</h3>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🥚 Aylık Yumurta Üretimi (2025)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyEgg}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    tickFormatter={(v) => formatShort(v)}
                    label={{ value: 'Yumurta (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    formatter={(value: number) => [value.toLocaleString('tr-TR') + ' adet', 'Üretim']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {monthlyEgg.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 30}, 70%, 60%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>En yüksek üretim:</strong> {monthlyEgg.reduce((max, m) => m.value > max.value ? m : max, monthlyEgg[0]).month}
                <br />
                <strong>Toplam (2025):</strong> {monthlyEgg.reduce((sum, m) => sum + m.value, 0).toLocaleString('tr-TR')} adet
              </div>
            </div>

            {monthlyLayer.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">🐔 Aylık Yumurtacı Tavuk Sayısı (2025)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthlyLayer}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                      tickFormatter={(v) => formatShort(v)}
                      label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      formatter={(value: number) => [value.toLocaleString('tr-TR') + ' adet', 'Tavuk']}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <strong>Ortalama:</strong> {(monthlyLayer.reduce((sum, m) => sum + m.value, 0) / monthlyLayer.length).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} adet
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
