import { useEffect, useState, useCallback } from 'react';
import { Truck, Ship, Plane, Train, Package, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, Cell,
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

export function TransportPage() {
  const [data, setData] = useState<TransportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const transportRes = await fetchQuery(addYearFilter(queries.transportModes, selectedYear));
      const modes = (transportRes.data || []) as unknown as TransportMode[];
      
      const total = modes.reduce((sum, m) => sum + (parseFloat(String(m.toplam)) || 0), 0);
      const totalCount = modes.reduce((sum, m) => sum + (parseInt(String(m.cnt)) || 0), 0);
      const topMode = modes.length > 0 ? modes[0] : null;

      setData({
        transportModes: modes,
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

  if (loading) return <Loading />;

  const topModes = data?.transportModes.slice(0, 6) || [];
  const avgPerTransaction = data?.totalCount ? data.totalTransport / data.totalCount : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Taşıma Şekilleri Analizi</h1>
        <p className="page-subtitle">Uluslararası ticaret lojistik dağılımı (FAO)</p>
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
          value={formatMoney(data?.totalTransport || 0)}
          subtitle={`${formatNumber(data?.totalCount || 0)} işlem`}
          icon={Package}
          color="blue"
          large
        />
        <KPICard
          title="Taşıma Türü Sayısı"
          value={String(data?.transportModes.length || 0)}
          subtitle="Farklı taşıma şekli"
          icon={Truck}
          color="purple"
        />
        <KPICard
          title="En Çok Kullanılan"
          value={data?.topMode?.tasimaSekli.substring(0, 20) || '—'}
          subtitle={data?.topMode ? formatMoney(parseFloat(String(data.topMode.toplam))) : '—'}
          icon={getTransportIcon(data?.topMode?.tasimaSekli || '')}
          color="green"
        />
        <KPICard
          title="İşlem Başına Ort."
          value={formatMoney(avgPerTransaction)}
          subtitle="Ortalama değer"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Taşıma Şekillerine Göre Hacim (İlk 6)</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={topModes.map(mode => ({
              name: mode.tasimaSekli.substring(0, 15),
              Hacim: parseFloat(String(mode.toplam)) / 1e9,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                angle={-30} 
                textAnchor="end" 
                height={100} 
              />
              <YAxis 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                tickFormatter={(v) => `$${v.toFixed(1)}B`} 
              />
              <Tooltip 
                formatter={(value: unknown) => [`$${(Number(value) || 0).toFixed(2)}B`, 'Hacim']}
              />
              <Legend />
              <Bar dataKey="Hacim" radius={[4, 4, 0, 0]}>
                {topModes.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">İşlem Sayıları Karşılaştırma</h3>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={topModes.map(mode => ({
              name: mode.tasimaSekli.substring(0, 12),
              İşlem: parseInt(String(mode.cnt)),
            }))}>
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
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip formatter={(value: unknown) => [formatNumber(Number(value) || 0), 'İşlem Sayısı']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="İşlem" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transport List */}
      <div className="data-table">
        <h3 className="data-table-title">Detaylı Taşıma Şekilleri Listesi</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr auto auto auto', 
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
          <div style={{ textAlign: 'right' }}>Toplam Değer</div>
        </div>
        {data?.transportModes.map((mode, index) => {
          const percentage = data.totalTransport ? ((parseFloat(String(mode.toplam)) / data.totalTransport) * 100).toFixed(1) : '0';
          const value = parseFloat(String(mode.toplam));
          
          return (
            <div key={index} className="table-row" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'auto 1fr auto auto auto', 
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
