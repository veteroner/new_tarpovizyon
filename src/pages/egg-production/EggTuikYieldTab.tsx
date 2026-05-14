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
import { ChartInsightButton } from '../../components/ChartInsightButton';

interface EggTuikYieldTabProps {
  tuikData: TuikEggData[];
}

export function EggTuikYieldTab({ tuikData }: EggTuikYieldTabProps) {
  const yieldData = tuikData.filter(d => d.yieldPerBird > 0);
  const layerData = tuikData.filter(d => d.layerCount > 0 && (d.nativeLayer > 0 || d.hybridLayer > 0));
  const hatchData = tuikData.filter(d => d.hatchedEggs > 0);
  const hasYieldData = yieldData.length >= 2;
  const hasLayerData = layerData.length >= 2;
  const hasHatchData = hatchData.length >= 2;

  const noDataBox = (msg: string) => (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '8px' }}>
      ⚠️ {msg}
    </div>
  );

  return (
    <>
      {/* Verim Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>📊 Tavuk Başına Yumurta Verimi Trendi (2010-2025)</h3>
            <ChartInsightButton title="📊 Tavuk Başına Yumurta Verimi Trendi (2010-2025)" description="Tavuk başına yumurta verimi 16 yıllık trendi" data={tuikData} context={{ section: 'Verim Trend' }} compact />
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
                <div><strong>2025 Verim:</strong> {yieldData[0]?.yieldPerBird.toFixed(1)} adet/baş/yıl</div>
                <div><strong>{yieldData.length} yıl ortalama:</strong> {(yieldData.reduce((sum, d) => sum + d.yieldPerBird, 0) / yieldData.length).toFixed(1)} adet/baş/yıl</div>
                <div>
                  <strong>Verim artışı:</strong> %{(() => {
                    const first = yieldData[yieldData.length - 1]?.yieldPerBird || 1;
                    const last = yieldData[0]?.yieldPerBird || 1;
                    return ((last - first) / first * 100).toFixed(2);
                  })()}
                </div>
              </div>
            </>
          ) : noDataBox('Tavuk başına verim verisi mevcut değil (layerCount = 0)')}
        </div>
      </div>

      {/* Yerli vs Hibrit Karşılaştırması */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🐔 Yerli vs Hibrit Yumurtacı Tavuk (2010-2025)</h3>
            <ChartInsightButton title="🐔 Yerli vs Hibrit Yumurtacı Tavuk (2010-2025)" description="Yerli ve hibrit yumurtacı tavuk karşılaştırması" data={tuikData} context={{ section: 'Yerli-Hibrit' }} compact />
          </div>
          {hasLayerData ? (
            <>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={layerData.slice().reverse()}>
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
                {(() => {
                  const latest = layerData[0];
                  const denom = latest?.layerCount || 1;
                  return (
                    <>
                      <div>
                        <strong>Yerli (son yıl):</strong> {(latest?.nativeLayer || 0).toLocaleString('tr-TR')} bin adet
                        <br /><small>Toplam: {((latest?.nativeLayer / denom * 100) || 0).toFixed(1)}%</small>
                      </div>
                      <div>
                        <strong>Hibrit (son yıl):</strong> {(latest?.hybridLayer || 0).toLocaleString('tr-TR')} bin adet
                        <br /><small>Toplam: {((latest?.hybridLayer / denom * 100) || 0).toFixed(1)}%</small>
                      </div>
                      <div><strong>Toplam (son yıl):</strong> {(latest?.layerCount || 0).toLocaleString('tr-TR')} bin adet</div>
                    </>
                  );
                })()}
              </div>
            </>
          ) : noDataBox('Yerli/Hibrit tavuk sayısı verisi mevcut değil')}
        </div>
      </div>

      {/* Kuluçka Yumurtası Trendi */}
      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🥚 Kuluçkaya Basılan Yumurta (Layer Civciv Üretimi - 2010-2025)</h3>
            <ChartInsightButton title="🥚 Kuluçkaya Basılan Yumurta (Layer Civciv Üretimi - 2010-2025)" description="Layer civciv üretimi için kuluçkaya basılan yumurta sayısı" data={tuikData} context={{ section: 'Kuluçka' }} compact />
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
                <br />
                <strong>{hatchData.length} yıl toplam:</strong> {hatchData.reduce((sum, d) => sum + d.hatchedEggs, 0).toLocaleString('tr-TR')} bin adet
                <br />
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
          <strong>📊 Son Yıl Verimlilik Göstergeleri:</strong>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            <div>• <strong>Tavuk başına verim:</strong> {tuikData[0]?.yieldPerBird > 0 ? tuikData[0].yieldPerBird.toFixed(1) + ' adet/yıl' : 'Veri yok'}</div>
            <div>• <strong>Kuluçka/Tavuk oranı:</strong> {tuikData[0]?.layerCount > 0 ? ((tuikData[0].hatchedEggs / tuikData[0].layerCount) || 0).toFixed(2) : 'Veri yok'}</div>
            <div>• <strong>Üretim/Tavuk oranı:</strong> {tuikData[0]?.layerCount > 0 ? ((tuikData[0].eggProduction / tuikData[0].layerCount) || 0).toFixed(0) : 'Veri yok'}</div>
          </div>
        </div>
      </div>
    </>
  );
}
