import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type YearPoint,
  type ConsumptionData,
  type WorldRankings,
  type ImportAnalytics,
  MEAT_COLORS,
  formatTon,
  formatShort,
} from './redMeatUtils';

type Props = {
  filteredSeries: YearPoint[];
  latest: YearPoint | undefined;
  yoy: number;
  peak: YearPoint | undefined;
  avgLast5: number;
  consumptionData: ConsumptionData | null;
  worldRankings: WorldRankings | null;
  importAnalytics: ImportAnalytics | null;
};

export default function ProductionOverviewSection({
  filteredSeries,
  latest,
  yoy,
  peak,
  avgLast5,
  consumptionData,
  worldRankings,
  importAnalytics,
}: Props) {
  const breakdown = useMemo(() => {
    if (!latest) return [];
    const items = [
      { name: 'Sığır', value: latest.cattleTon, color: MEAT_COLORS['Sığır'] },
      { name: 'Koyun', value: latest.sheepTon, color: MEAT_COLORS['Koyun'] },
      { name: 'Keçi', value: latest.goatTon, color: MEAT_COLORS['Keçi'] },
      { name: 'Manda', value: latest.buffaloTon, color: MEAT_COLORS['Manda'] },
    ];
    return items.filter(item => item.value > 0);
  }, [latest]);

  const buyukbasKucukbasBreakdown = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Büyükbaş', value: latest.buyukbasToplam, color: MEAT_COLORS['Büyükbaş'] },
      { name: 'Küçükbaş', value: latest.kucukbasToplam, color: MEAT_COLORS['Küçükbaş'] },
    ].filter(item => item.value > 0);
  }, [latest]);

  return (
    <>
      {/* Section 1: KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card large">
          <div className="kpi-header">
            <span className="kpi-title">SON YIL TOPLAM</span>
          </div>
          <div className="kpi-value">{formatTon(latest?.totalTon ?? 0)}</div>
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

        {consumptionData && (
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">KIRMIZI ET TÜKETİMİ</span>
              <div className="kpi-icon red">🥩</div>
            </div>
            <div className="kpi-value">{consumptionData.kirmizi_et_tuketimi_kg.toFixed(1)} kg</div>
            <div className="kpi-subtitle">Kişi başı/yıl</div>
          </div>
        )}

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">ZİRVE</span>
            <div className="kpi-icon orange">🏆</div>
          </div>
          <div className="kpi-value">{formatTon(peak?.totalTon ?? 0)}</div>
          <div className="kpi-subtitle">{peak?.year ? `${peak.year}` : '—'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">SON 5Y ORT</span>
            <div className="kpi-icon purple">🧮</div>
          </div>
          <div className="kpi-value">{formatTon(avgLast5)}</div>
          <div className="kpi-subtitle">Hareketli ortalama</div>
        </div>

        {worldRankings && (
          <>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">SIĞIR ETİ</span>
                <div className="kpi-icon orange">🐄</div>
              </div>
              <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRankings.cattle.world}</div>
              <div className="kpi-subtitle">AB #{worldRankings.cattle.eu}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">KOYUN ETİ</span>
                <div className="kpi-icon cyan">🐑</div>
              </div>
              <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRankings.sheep.world}</div>
              <div className="kpi-subtitle">AB #{worldRankings.sheep.eu}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">KEÇİ ETİ</span>
                <div className="kpi-icon purple">🐐</div>
              </div>
              <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRankings.goat.world}</div>
              <div className="kpi-subtitle">AB #{worldRankings.goat.eu}</div>
            </div>
          </>
        )}
      </div>

      {/* Intelligence Panel */}
      {importAnalytics && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '24px',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧠 Kırmızı Et İçgörü Özeti
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>ET İTHALAT CAGR</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{importAnalytics.cagr.carcass.toFixed(1)}%</div>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Karkas Et Büyüme</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>YILLIK DEĞİŞİM</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{yoy > 0 ? '+' : ''}{yoy.toFixed(1)}%</div>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Üretim Değişimi</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>BESİLİK SIĞIR İTH. CAGR</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{importAnalytics.cagr.cattle.toFixed(1)}%</div>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Büyükbaş Büyüme</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>HARCAMA CAGR</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{importAnalytics.cagr.spending.toFixed(1)}%</div>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>İthalat Giderleri</div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Üretim Trendi */}
      <div className="chart-grid" style={{ marginTop: '30px' }}>
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">📈 Kırmızı Et Üretimi Trendi (1961-2024)</h3>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={filteredSeries} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
              <Tooltip 
                labelFormatter={(label) => `Yıl: ${label}`} 
                formatter={(value: number) => [formatTon(Number(value))]}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="totalTon" name="Toplam Üretim" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🥧 Tür Bazında Dağılım ({latest?.year ?? '-'})</h3>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={breakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, value }) => `${name}: ${formatTon(value)}`}
                labelLine={true}
              >
                {breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatTon(value)]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">📊 Büyükbaş vs Küçükbaş ({latest?.year ?? '-'})</h3>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={buyukbasKucukbasBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={true}
              >
                {buyukbasKucukbasBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatTon(value)]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
