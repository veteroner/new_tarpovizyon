import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TuikEggData } from './eggProductionTypes';
import { formatShort } from './eggProductionTypes';
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface EggTuikYieldTabProps {
  tuikData: TuikEggData[];
}

export function EggTuikYieldTab({ tuikData }: EggTuikYieldTabProps) {
  const yieldData = tuikData.filter(d => d.yieldPerBird > 0);
  const layerChartData = tuikData.filter(d => d.layerCount > 0);
  const hatchData = tuikData.filter(d => d.hatchedEggs > 0);
  const hasYieldData = yieldData.length >= 2;
  const hasLayerChartData = layerChartData.length >= 2;
  const hasHatchData = hatchData.length >= 2;

  const noDataBox = (msg: string) => (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '8px' }}>
      ⚠️ {msg}
    </div>
  );

  return (
    <>
      {/* Yumurtacı Tavuk Sayısı Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🐔 Yumurtacı Tavuk Sayısı Trendi</h3>
            <ChartInsightButton title="🐔 Yumurtacı Tavuk Sayısı Trendi" description="Yumurtacı tavuk sayısı trendi" data={layerChartData} context={{ section: 'Layer Count' }} compact />
          </div>
          {hasLayerChartData ? (
            <>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={layerChartData.slice().reverse()}>
                  <defs>
                    <linearGradient id="colorLayer2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    tickFormatter={(v) => formatShort(v)}
                    label={{ value: 'Tavuk Sayısı', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    formatter={(value: number) => [value.toLocaleString('tr-TR') + ' adet', 'Yumurtacı Tavuk']}
                  />
                  <Area type="monotone" dataKey="layerCount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLayer2)" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div><strong>Son yıl:</strong> {(layerChartData[0]?.layerCount || 0).toLocaleString('tr-TR')} adet</div>
                <div><strong>{layerChartData.length} yıl büyüme:</strong> %{(() => {
                  const first = layerChartData[layerChartData.length - 1]?.layerCount || 1;
                  const last = layerChartData[0]?.layerCount || 1;
                  return ((last - first) / first * 100).toFixed(2);
                })()}</div>
              </div>
            </>
          ) : noDataBox('Yumurtacı tavuk sayısı verisi mevcut değil')}
        </div>
      </div>

      {/* Verim Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Tavuk Başına Yumurta Verimi Trendi</h3>
            <ChartInsightButton title="📊 Tavuk Başına Yumurta Verimi Trendi" description="Tavuk başına yumurta verimi trendi" data={yieldData} context={{ section: 'Verim Trend' }} compact />
          </div>
          {hasYieldData ? (
            <>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={yieldData.slice().reverse()}>
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
                <div><strong>Son yıl verim:</strong> {yieldData[0]?.yieldPerBird.toFixed(1)} adet/baş/yıl</div>
                <div><strong>{yieldData.length} yıl ortalama:</strong> {(yieldData.reduce((sum, d) => sum + d.yieldPerBird, 0) / yieldData.length).toFixed(1)} adet/baş/yıl</div>
                <div><strong>Verim artışı:</strong> %{(() => {
                  const first = yieldData[yieldData.length - 1]?.yieldPerBird || 1;
                  const last = yieldData[0]?.yieldPerBird || 1;
                  return ((last - first) / first * 100).toFixed(2);
                })()}</div>
              </div>
            </>
          ) : noDataBox('Tavuk başına verim verisi hesaplanamıyor (yumurtacı tavuk sayısı gerekli)')}
        </div>
      </div>

      {/* Kuluçka Yumurtası Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥚 Kuluçkaya Basılan Yumurta (Layer Civciv Üretimi)</h3>
            <ChartInsightButton title="🥚 Kuluçkaya Basılan Yumurta" description="Layer civciv üretimi için kuluçkaya basılan yumurta sayısı" data={hatchData} context={{ section: 'Kuluçka' }} compact />
          </div>
          {hasHatchData ? (
            <>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={hatchData.slice().reverse()}>
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
                    {hatchData.slice().reverse().map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === hatchData.length - 1 ? '#f59e0b' : '#fbbf24'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>Son yıl kuluçka:</strong> {(hatchData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')} bin adet
                {' | '}
                <strong>{hatchData.length} yıl büyüme:</strong> %{(() => {
                  const first = hatchData[hatchData.length - 1]?.hatchedEggs || 1;
                  const last = hatchData[0]?.hatchedEggs || 1;
                  return ((last - first) / first * 100).toFixed(2);
                })()}
              </div>
            </>
          ) : noDataBox('Kuluçka yumurtası verisi mevcut değil')}
        </div>
      </div>

      {/* Üretim Döngüsü */}
      <div style={{ marginTop: '30px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
          🔄 Üretim Döngüsü: Kuluçka → Yumurtacı Tavuk → Yumurta
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '30px', padding: '20px 0' }}>
          {hasHatchData && (
            <>
              <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🥚</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>
                  {(hatchData[0]?.hatchedEggs || 0).toLocaleString('tr-TR')}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Kuluçkaya Basılan<br />(bin adet)</div>
              </div>
              <div style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }}>→</div>
            </>
          )}
          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🐔</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>
              {tuikData[0]?.layerCount > 0 ? tuikData[0].layerCount.toLocaleString('tr-TR') : '—'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Yumurtacı Tavuk<br />(adet)</div>
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
        {hasYieldData && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>📊 Verimlilik Göstergeleri:</strong>
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              <div>• <strong>Tavuk başına verim:</strong> {tuikData[0]?.yieldPerBird.toFixed(1)} adet/yıl</div>
              {tuikData[0]?.layerCount > 0 && (
                <div>• <strong>Üretim/Tavuk oranı:</strong> {(tuikData[0].eggProduction / tuikData[0].layerCount).toFixed(0)}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
