import { useEffect, useMemo, useState, useCallback } from 'react';
import { Truck, Ship, Plane, Train, Package, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, Line, Cell, ComposedChart, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { DateFilter } from '../components/DateFilter';
import { fetchQuery, formatMoney, formatNumber, queries, addYearFilter, TRADE_YEARS } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#3b82f6'];

// Taşıma şekilleri için icon mapping (FAO motDesc text değerleri için)
function getTransportIcon(mode: string): typeof Truck {
  const lower = mode.toLowerCase();
  if (lower.includes('sea') || lower.includes('deniz')) return Ship;
  if (lower.includes('air') || lower.includes('hava')) return Plane;
  if (lower.includes('rail') || lower.includes('demiryolu')) return Train;
  if (lower.includes('road') || lower.includes('karayolu')) return Truck;
  if (lower.includes('post')) return Package;
  return Truck;
}

function isTotalModeDesc(mode: string): boolean {
  const s = mode.trim().toLowerCase();
  if (!s) return true;
  return (
    s === 'total' ||
    s.includes('total mot') ||
    s.startsWith('total') ||
    s.includes('all modes') ||
    s.includes('all mode') ||
    s.includes('total mode')
  );
}

function translateTransportMode(mode: string): string {
  const raw = mode.trim();
  const lower = raw.toLowerCase();

  if (isTotalModeDesc(raw)) return 'Toplam (tüm taşıma şekilleri)';

  // Heuristic translations for common FAO/transport terms
  if (lower.includes('sea')) return 'Deniz yolu';
  if (lower.includes('air')) return 'Hava yolu';
  if (lower.includes('rail')) return 'Demiryolu';
  if (lower.includes('road')) return 'Karayolu';
  if (lower.includes('postal') || lower.includes('post')) return 'Posta/Kargo';
  if (lower.includes('pipeline')) return 'Boru hattı';
  if (lower.includes('inland') || lower.includes('waterway') || lower.includes('river')) return 'İç su yolu';
  if (lower.includes('other') || lower.includes('unknown')) return 'Diğer';

  // Preserve already-Turkish values
  if (lower.includes('deniz') || lower.includes('hava') || lower.includes('demiryolu') || lower.includes('karayolu')) {
    return raw;
  }

  return raw;
}

interface TransportMode {
  tasimaSekli: string;
  toplam: number;
  cnt: number;
}

interface TransportData {
  transportModes: TransportMode[];
  totalTransport: number;
  totalCount: number;
  topMode: TransportMode | null;
}

type SortKey = 'toplam' | 'cnt' | 'avg';

export function TransportPage() {
  const [data, setData] = useState<TransportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('toplam');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const transportRes = await fetchQuery(addYearFilter(queries.transportModes, selectedYear));
      const rawModes = (transportRes.data || []) as unknown as TransportMode[];

      const normalizedModes: TransportMode[] = rawModes
        .map((m) => ({
          tasimaSekli: translateTransportMode(String(m.tasimaSekli ?? '')),
          toplam: parseFloat(String(m.toplam)) || 0,
          cnt: parseInt(String(m.cnt)) || 0,
        }))
        .filter((m) => m.tasimaSekli && !isTotalModeDesc(m.tasimaSekli))
        .sort((a, b) => b.toplam - a.toplam);

      const total = normalizedModes.reduce((sum, m) => sum + (m.toplam || 0), 0);
      const totalCount = normalizedModes.reduce((sum, m) => sum + (m.cnt || 0), 0);
      const topMode = normalizedModes.length > 0 ? normalizedModes[0] : null;

      setData({
        transportModes: normalizedModes,
        totalTransport: total,
        totalCount,
        topMode,
      });
    } catch (error) {
      console.error('Error loading transport data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalTransport = data?.totalTransport || 0;
  const totalCount = data?.totalCount || 0;

  const avgPerTransaction = totalCount ? totalTransport / totalCount : 0;

  const topModes = useMemo(() => (data?.transportModes || []).slice(0, 8), [data?.transportModes]);

  const modeChart = useMemo(() => {
    const total = totalTransport || 0;
    let cumulative = 0;
    return topModes.map((m) => {
      const share = total > 0 ? (m.toplam / total) * 100 : 0;
      cumulative += share;
      const avg = m.cnt > 0 ? m.toplam / m.cnt : 0;
      return {
        name: m.tasimaSekli,
        valueB: m.toplam / 1e9,
        share,
        cumShare: cumulative,
        cnt: m.cnt,
        avgM: avg / 1e6,
        rawValue: m.toplam,
      };
    });
  }, [topModes, totalTransport]);

  const donutData = useMemo(() => {
    const top = (data?.transportModes || []).slice(0, 6);
    const topSum = top.reduce((s, m) => s + (m.toplam || 0), 0);
    const other = Math.max(0, totalTransport - topSum);
    const items = top.map((m) => ({ name: m.tasimaSekli, value: m.toplam }));
    if (other > 0) items.push({ name: 'Diğer', value: other });
    return items;
  }, [data?.transportModes, totalTransport]);

  const tableRows = useMemo(() => {
    const rows = (data?.transportModes || []).map((m) => {
      const share = totalTransport > 0 ? (m.toplam / totalTransport) * 100 : 0;
      const avg = m.cnt > 0 ? m.toplam / m.cnt : 0;
      return { ...m, share, avg };
    });

    const sorters: Record<SortKey, (a: typeof rows[number], b: typeof rows[number]) => number> = {
      toplam: (a, b) => b.toplam - a.toplam,
      cnt: (a, b) => b.cnt - a.cnt,
      avg: (a, b) => b.avg - a.avg,
    };
    return rows.sort(sorters[sortKey]);
  }, [data?.transportModes, sortKey, totalTransport]);

  const topModeShare = data?.topMode && totalTransport > 0 ? (data.topMode.toplam / totalTransport) * 100 : 0;
  const top3Share = useMemo(() => {
    const top3 = (data?.transportModes || []).slice(0, 3);
    const sum = top3.reduce((s, m) => s + (m.toplam || 0), 0);
    return totalTransport > 0 ? (sum / totalTransport) * 100 : 0;
  }, [data?.transportModes, totalTransport]);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Taşıma Şekilleri Analizi</h1>
        <p className="page-subtitle">Uluslararası ticaret lojistik dağılımı (FAO) — "Toplam" satırları analiz dışı bırakıldı.</p>
      </div>

      {/* Date Filter */}
      <DateFilter
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={TRADE_YEARS}
      />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam Ticaret Hacmi"
          value={formatMoney(totalTransport)}
          subtitle={`${formatNumber(totalCount)} işlem`}
          icon={Package}
          color="blue"
          large
        />
        <KPICard
          title="Taşıma Şekli Sayısı"
          value={String(data?.transportModes.length || 0)}
          subtitle="Analize giren mod"
          icon={Truck}
          color="purple"
        />
        <KPICard
          title="En Yoğun Mod"
          value={data?.topMode?.tasimaSekli || '—'}
          subtitle={data?.topMode ? `${formatMoney(data.topMode.toplam)} • %${topModeShare.toFixed(1)} pay` : '—'}
          icon={getTransportIcon(data?.topMode?.tasimaSekli || '')}
          color="green"
        />
        <KPICard
          title="İşlem Başına Ortalama"
          value={formatMoney(avgPerTransaction)}
          subtitle={`Top 3 payı: %${top3Share.toFixed(1)}`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Taşıma Modları Pay Dağılımı (Top 6 + Diğer)</h3>
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Tooltip
                formatter={(value: unknown, name: unknown) => [formatMoney(Number(value) || 0), String(name)]}
              />
              <Legend />
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={130}
                paddingAngle={2}
              >
                {donutData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Hacim ve Kümülatif Pay (Pareto)</h3>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={modeChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="name"
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                angle={-30} 
                textAnchor="end" 
                height={100} 
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                tickFormatter={(v: number) => `$${v.toFixed(1)}B`} 
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v: number) => `%${v.toFixed(0)}`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => {
                  const n = String(name);
                  if (n === 'valueB') return [`$${(Number(value) || 0).toFixed(2)}B`, 'Hacim'];
                  if (n === 'cumShare') return [`%${(Number(value) || 0).toFixed(1)}`, 'Kümülatif Pay'];
                  return [String(value), n];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="valueB" name="Hacim (B$)" radius={[4, 4, 0, 0]}>
                {modeChart.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumShare"
                name="Kümülatif Pay (%)"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">İşlem Başına Ortalama Değer (Top 8)</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={modeChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                angle={-25} 
                textAnchor="end" 
                height={90} 
              />
              <YAxis 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                tickFormatter={(v: number) => `$${v.toFixed(1)}M`}
              />
              <Tooltip
                formatter={(value: unknown) => [`$${(Number(value) || 0).toFixed(2)}M`, 'Ortalama']}
              />
              <Legend />
              <Bar dataKey="avgM" name="Ortalama (M$)" radius={[4, 4, 0, 0]}>
                {modeChart.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transport List */}
      <div className="data-table">
        <h3 className="data-table-title">Detaylı Taşıma Şekilleri Listesi</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 12px 0' }}>
          <button
            type="button"
            onClick={() => setSortKey('toplam')}
            className="btn"
            style={{ opacity: sortKey === 'toplam' ? 1 : 0.7 }}
          >
            Hacme Göre
          </button>
          <button
            type="button"
            onClick={() => setSortKey('cnt')}
            className="btn"
            style={{ opacity: sortKey === 'cnt' ? 1 : 0.7 }}
          >
            İşleme Göre
          </button>
          <button
            type="button"
            onClick={() => setSortKey('avg')}
            className="btn"
            style={{ opacity: sortKey === 'avg' ? 1 : 0.7 }}
          >
            Ortalama Değere Göre
          </button>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr auto auto auto auto', 
          gap: '8px', 
          padding: '12px 16px', 
          background: 'var(--card-bg)',
          borderRadius: '8px',
          marginBottom: '8px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase'
        }}>
          <div>#</div>
          <div>Taşıma Şekli</div>
          <div style={{ textAlign: 'right' }}>İşlem Sayısı</div>
          <div style={{ textAlign: 'right' }}>Pay (%)</div>
          <div style={{ textAlign: 'right' }}>Ort. (İşlem)</div>
          <div style={{ textAlign: 'right' }}>Toplam Değer</div>
        </div>
        {tableRows.map((mode, index) => {
          const percentage = (mode.share || 0).toFixed(1);
          const value = mode.toplam;
          const avg = mode.avg;
          
          return (
            <div key={index} className="table-row" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'auto 1fr auto auto auto auto', 
              gap: '8px',
              alignItems: 'center'
            }}>
              <div className="table-rank" style={{ 
                background: COLORS[index % COLORS.length] + '20', 
                color: COLORS[index % COLORS.length],
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                fontWeight: 600
              }}>
                {index + 1}
              </div>
              <div className="table-info" style={{ minWidth: 0 }}>
                <div className="table-name" style={{ 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  {mode.tasimaSekli}
                </div>
              </div>
              <div style={{ 
                textAlign: 'right', 
                fontSize: '13px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap'
              }}>
                {formatNumber(mode.cnt)}
              </div>
              <div style={{ 
                textAlign: 'right',
                fontSize: '13px',
                fontWeight: 500,
                color: COLORS[index % COLORS.length],
                whiteSpace: 'nowrap'
              }}>
                {percentage}%
              </div>
              <div style={{
                textAlign: 'right',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap'
              }}>
                {formatMoney(avg)}
              </div>
              <div className="table-value" style={{ 
                color: COLORS[index % COLORS.length],
                textAlign: 'right',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                {formatMoney(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
