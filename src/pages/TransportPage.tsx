import { useEffect, useState } from 'react';
import { Truck, Ship, Plane, Train } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { fetchQuery, formatMoney, formatNumber, queries } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#3b82f6'];

const TRANSPORT_NAMES: Record<string, { name: string; icon: typeof Truck }> = {
  '1': { name: 'Deniz Yolu', icon: Ship },
  '2': { name: 'Demiryolu', icon: Train },
  '3': { name: 'Karayolu', icon: Truck },
  '4': { name: 'Hava Yolu', icon: Plane },
  '5': { name: 'Posta', icon: Truck },
  '7': { name: 'Boru Hattı', icon: Truck },
  '8': { name: 'İç Su Yolu', icon: Ship },
  '9': { name: 'Diğer', icon: Truck },
};

interface TransportData {
  transportModes: { tasimaSekli: string; toplam: number; cnt: number }[];
  totalTransport: number;
}

export function TransportPage() {
  const [data, setData] = useState<TransportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const transportRes = await fetchQuery(queries.transportModes);
        const modes = (transportRes.data || []) as { tasimaSekli: string; toplam: number; cnt: number }[];
        const total = modes.reduce((sum, m) => sum + (parseFloat(String(m.toplam)) || 0), 0);

        setData({
          transportModes: modes,
          totalTransport: total,
        });
      } catch (error) {
        console.error('Error loading transport data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Taşıma Modları</h1>
        <p className="page-subtitle">Lojistik ve taşıma analizi</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam Taşıma Hacmi"
          value={formatMoney(data?.totalTransport || 0)}
          subtitle={`${data?.transportModes.length || 0} farklı taşıma türü`}
          icon={Truck}
          color="purple"
          large
        />
        {data?.transportModes.slice(0, 4).map((mode, index) => {
          const modeInfo = TRANSPORT_NAMES[mode.tasimaSekli] || { name: `Tür ${mode.tasimaSekli}`, icon: Truck };
          return (
            <KPICard
              key={index}
              title={modeInfo.name}
              value={formatMoney(parseFloat(String(mode.toplam)))}
              subtitle={`${formatNumber(mode.cnt)} işlem`}
              icon={modeInfo.icon}
              color={['blue', 'green', 'orange', 'teal'][index] as 'blue' | 'green' | 'orange' | 'teal'}
            />
          );
        })}
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Taşıma Şekillerine Göre Dağılım</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.transportModes.slice(0, 8).map(mode => ({
              name: (TRANSPORT_NAMES[mode.tasimaSekli]?.name || `Tür ${mode.tasimaSekli}`).substring(0, 10),
              value: parseFloat(String(mode.toplam)) / 1e9,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `$${v}B`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}B`, 'Değer']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data?.transportModes.slice(0, 8).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Taşıma Türleri Payları</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data?.transportModes.slice(0, 6).map(mode => ({
                  name: (TRANSPORT_NAMES[mode.tasimaSekli]?.name || mode.tasimaSekli).substring(0, 10),
                  value: parseFloat(String(mode.toplam)),
                }))}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data?.transportModes.slice(0, 6).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatMoney(value), 'Değer']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transport List */}
      <div className="data-table">
        <h3 className="data-table-title">Tüm Taşıma Şekilleri</h3>
        {data?.transportModes.map((mode, index) => {
          const modeInfo = TRANSPORT_NAMES[mode.tasimaSekli] || { name: `Tür ${mode.tasimaSekli}`, icon: Truck };
          const percentage = data.totalTransport ? ((parseFloat(String(mode.toplam)) / data.totalTransport) * 100).toFixed(1) : '0';
          
          return (
            <div key={index} className="table-row">
              <div className="table-rank" style={{ background: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}>
                {index + 1}
              </div>
              <div className="table-info">
                <div className="table-name">{modeInfo.name}</div>
                <div className="table-subtext">{formatNumber(mode.cnt)} işlem • {percentage}%</div>
              </div>
              <div className="table-value" style={{ color: COLORS[index % COLORS.length] }}>
                {formatMoney(parseFloat(String(mode.toplam)))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
