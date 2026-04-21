import { useState } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TurkeyHeatMap } from '../../components/TurkeyHeatMap';
import { formatNumber, formatShort, OverviewData } from './overviewTypes';

interface Props {
  data: OverviewData;
}

export function LivestockSection({ data }: Props) {
  const [regionalGroup, setRegionalGroup] = useState<'cattle' | 'sheep' | 'goat' | 'poultry'>('cattle');
  const [regionalView, setRegionalView] = useState<'map' | 'bar'>('map');

  return (
    <>
      <div className="section-header" style={{ marginTop: '3rem', marginBottom: '1rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#6b7280' }}>🐄 Hayvan Varlığı (2023)</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">SIĞIR</span><div className="kpi-icon">🐄</div></div>
          <div className="kpi-value">{formatNumber(data.livestockStocks.cattle)}</div>
          <div className="kpi-subtitle">Baş</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KOYUN</span><div className="kpi-icon">🐑</div></div>
          <div className="kpi-value">{formatNumber(data.livestockStocks.sheep)}</div>
          <div className="kpi-subtitle">Baş</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KEÇİ</span><div className="kpi-icon">🐐</div></div>
          <div className="kpi-value">{formatNumber(data.livestockStocks.goat)}</div>
          <div className="kpi-subtitle">Baş</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><span className="kpi-title">KANATLI</span><div className="kpi-icon">🐔</div></div>
          <div className="kpi-value">{formatNumber(data.livestockStocks.poultry)}</div>
          <div className="kpi-subtitle">Baş</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">📊 Hayvan Varlığı Dağılımı (2023)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.livestockStocks.breakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
              <Tooltip formatter={(value: number) => [formatNumber(value) + ' baş', '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.livestockStocks.breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>🗺️ Bölgesel Dağılım (Top 12)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                role="tablist"
                aria-label="Bölgesel görünüm"
                style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden', background: 'white' }}
              >
                <button
                  type="button"
                  onClick={() => setRegionalView('map')}
                  style={{ padding: '0.45rem 0.7rem', fontSize: '0.85rem', border: 'none', background: regionalView === 'map' ? 'var(--primary)' : 'transparent', color: regionalView === 'map' ? 'white' : 'var(--text)', cursor: 'pointer' }}
                >
                  Harita
                </button>
                <button
                  type="button"
                  onClick={() => setRegionalView('bar')}
                  style={{ padding: '0.45rem 0.7rem', fontSize: '0.85rem', border: 'none', background: regionalView === 'bar' ? 'var(--primary)' : 'transparent', color: regionalView === 'bar' ? 'white' : 'var(--text)', cursor: 'pointer' }}
                >
                  Grafik
                </button>
              </div>

              <select
                value={regionalGroup}
                onChange={(e) => setRegionalGroup(e.target.value as 'cattle' | 'sheep' | 'goat' | 'poultry')}
                style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'white', color: 'var(--text)', fontSize: '0.875rem' }}
              >
                <option value="cattle">Sığır</option>
                <option value="sheep">Koyun</option>
                <option value="goat">Keçi</option>
                <option value="poultry">Kanatlı</option>
              </select>
            </div>
          </div>

          {regionalView === 'map' ? (
            <TurkeyHeatMap
              regionTotals={data.livestockStocks.regional[regionalGroup] ?? []}
              unitLabel="baş"
              height={380}
            />
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.livestockStocks.regional[regionalGroup]} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" angle={-35} textAnchor="end" height={80} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [formatNumber(value) + ' baş', '']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.livestockStocks.regional[regionalGroup].map((entry, index) => (
                    <Cell key={`cell-reg-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
