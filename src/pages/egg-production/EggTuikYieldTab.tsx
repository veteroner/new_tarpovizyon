import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikEggData } from './eggProductionTypes';
import { formatShort } from './eggProductionTypes';

interface EggTuikYieldTabProps {
  tuikData: TuikEggData[];
}

export function EggTuikYieldTab({ tuikData }: EggTuikYieldTabProps) {
  return (
    <>
      {/* Verim Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">📊 Tavuk Başına Yumurta Verimi Trendi (2010-2025)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={tuikData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                label={{ value: 'Verim (adet/baş/yıl)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [value.toFixed(1) + ' adet/baş/yıl', 'Verim']}
              />
              <Line type="monotone" dataKey="yieldPerBird" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div><strong>2025 Verim:</strong> {tuikData[0]?.yieldPerBird.toFixed(1)} adet/baş/yıl</div>
            <div><strong>16 yıl ortalama:</strong> {(tuikData.reduce((sum, d) => sum + d.yieldPerBird, 0) / tuikData.length).toFixed(1)} adet/baş/yıl</div>
            <div>
              <strong>Verim artışı:</strong> %{(() => {
                const first = tuikData[tuikData.length - 1]?.yieldPerBird || 1;
                const last = tuikData[0]?.yieldPerBird || 1;
                return ((last - first) / first * 100).toFixed(2);
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Yerli vs Hibrit Karşılaştırması */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">🐔 Yerli vs Hibrit Yumurtacı Tavuk (2010-2025)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={tuikData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v * 1000)}
                label={{ value: 'Tavuk Sayısı (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet']}
              />
              <Legend />
              <Bar dataKey="nativeLayer" name="Yerli Yumurtacı" stackId="a" fill="#fbbf24" opacity={0.8} radius={[0, 0, 0, 0]} />
              <Bar dataKey="hybridLayer" name="Hibrit Yumurtacı" stackId="a" fill="#10b981" opacity={0.8} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="layerCount" name="Toplam" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong>Yerli (2025):</strong> {(tuikData[0]?.nativeLayer || 0).toLocaleString('tr-TR')} bin adet
              <br /><small>Toplam: {((tuikData[0]?.nativeLayer / tuikData[0]?.layerCount * 100) || 0).toFixed(1)}%</small>
            </div>
            <div>
              <strong>Hibrit (2025):</strong> {(tuikData[0]?.hybridLayer || 0).toLocaleString('tr-TR')} bin adet
              <br /><small>Toplam: {((tuikData[0]?.hybridLayer / tuikData[0]?.layerCount * 100) || 0).toFixed(1)}%</small>
            </div>
            <div><strong>Toplam (2025):</strong> {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')} bin adet</div>
          </div>
        </div>
      </div>

      {/* Kuluçka Yumurtası Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">🥚 Kuluçkaya Basılan Yumurta (Layer Civciv Üretimi - 2010-2025)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={tuikData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => formatShort(v * 1000)}
                label={{ value: 'Kuluçka Yumurtası (adet)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value: number) => [(value * 1000).toLocaleString('tr-TR') + ' adet', 'Kuluçka']}
              />
              <Bar dataKey="hatchedEggs" radius={[8, 8, 0, 0]}>
                {tuikData.slice().reverse().map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === tuikData.length - 1 ? '#f59e0b' : '#fbbf24'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>2025 Kuluçka:</strong> {(tuikData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')} bin adet
            <br />
            <strong>16 yıl toplam:</strong> {tuikData.reduce((sum, d) => sum + d.hatchedEggs, 0).toLocaleString('tr-TR')} bin adet
            <br />
            <strong>16 yıl büyüme:</strong> %{(() => {
              const first = tuikData[tuikData.length - 1]?.hatchedEggs || 1;
              const last = tuikData[0]?.hatchedEggs || 1;
              return ((last - first) / first * 100).toFixed(2);
            })()}
          </div>
        </div>
      </div>

      {/* Kuluçka → Yumurtacı Tavuk Akışı */}
      <div style={{ marginTop: '30px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
          🔄 Üretim Döngüsü: Kuluçka → Yumurtacı Tavuk → Yumurta (2025)
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '30px', padding: '20px 0' }}>
          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🥚</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>
              {(tuikData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Kuluçkaya Basılan<br />(bin adet)</div>
          </div>
          <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🐔</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>
              {(tuikData[0]?.layerCount || 0).toLocaleString('tr-TR')}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Yumurtacı Tavuk<br />(bin adet)</div>
          </div>
          <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🥚</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#3b82f6' }}>
              {(tuikData[0]?.eggProduction || 0).toLocaleString('tr-TR')}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Yumurta Üretimi<br />(bin adet)</div>
          </div>
        </div>
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <strong>📊 2025 Verimlilik Göstergeleri:</strong>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            <div>• <strong>Tavuk başına verim:</strong> {tuikData[0]?.yieldPerBird.toFixed(1)} adet/yıl</div>
            <div>• <strong>Kuluçka/Tavuk oranı:</strong> {((tuikData[0]?.hatchedEggs / tuikData[0]?.layerCount) || 0).toFixed(2)}</div>
            <div>• <strong>Üretim/Tavuk oranı:</strong> {((tuikData[0]?.eggProduction / tuikData[0]?.layerCount) || 0).toFixed(0)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
