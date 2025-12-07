import { useEffect, useState } from 'react';
import { Globe, TrendingUp, TrendingDown, ArrowLeftRight, FileText } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { fetchQuery, formatMoney, formatNumber, queries } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const FLOW_NAMES: Record<string, string> = {
  'X': 'İhracat', 'M': 'İthalat', 'DX': 'Doğrudan İhr.', 
  'FM': 'Serbest Dol.', 'RX': 'Yeniden İhr.', 'RM': 'Yeniden İth.'
};

interface OverviewData {
  totalTrade: number;
  totalExport: number;
  totalImport: number;
  balance: number;
  transactionCount: number;
  flowDistribution: { name: string; value: number }[];
  monthlyTrend: { ay: string; ihracat: number; ithalat: number }[];
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [totalRes, exportRes, importRes, flowRes, monthlyRes] = await Promise.all([
          fetchQuery(queries.totalTrade),
          fetchQuery(queries.totalExport),
          fetchQuery(queries.totalImport),
          fetchQuery(queries.flowDistribution),
          fetchQuery(queries.monthlyTrend),
        ]);

        const total = parseFloat(String(totalRes.data?.[0]?.toplam ?? 0)) || 0;
        const exp = parseFloat(String(exportRes.data?.[0]?.toplam ?? 0)) || 0;
        const imp = parseFloat(String(importRes.data?.[0]?.toplam ?? 0)) || 0;
        const count = parseInt(String(totalRes.data?.[0]?.cnt ?? 0)) || 0;

        setData({
          totalTrade: total,
          totalExport: exp,
          totalImport: imp,
          balance: exp - imp,
          transactionCount: count,
          flowDistribution: (flowRes.data || []).map((d) => ({
            name: FLOW_NAMES[String(d.flowCode)] || String(d.flowCode),
            value: parseFloat(String(d.toplam)) || 0,
          })),
          monthlyTrend: (monthlyRes.data || []).map((d) => ({
            ay: MONTHS[parseInt(String(d.ay)) - 1] || String(d.ay),
            ihracat: parseFloat(String(d.ihracat)) / 1e9 || 0,
            ithalat: parseFloat(String(d.ithalat)) / 1e9 || 0,
          })),
        });
      } catch (error) {
        console.error('Error loading data:', error);
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
        <h1 className="page-title">Genel Bakış</h1>
        <p className="page-subtitle">Ticaret verilerine genel bakış</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam Ticaret Hacmi"
          value={formatMoney(data?.totalTrade || 0)}
          subtitle={`${formatNumber(data?.transactionCount || 0)} işlem`}
          icon={Globe}
          large
        />
        <KPICard
          title="Toplam İhracat"
          value={formatMoney(data?.totalExport || 0)}
          subtitle="X + DX işlemleri"
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Toplam İthalat"
          value={formatMoney(data?.totalImport || 0)}
          subtitle="M + FM işlemleri"
          icon={TrendingDown}
          color="orange"
        />
        <KPICard
          title="Dış Ticaret Dengesi"
          value={formatMoney(Math.abs(data?.balance || 0))}
          subtitle={(data?.balance || 0) >= 0 ? 'Fazla' : 'Açık'}
          icon={ArrowLeftRight}
          color={(data?.balance || 0) >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="İşlem Sayısı"
          value={formatNumber(data?.transactionCount || 0)}
          subtitle="Toplam kayıt"
          icon={FileText}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">İhracat vs İthalat</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'İhracat', value: (data?.totalExport || 0) / 1e9 },
              { name: 'İthalat', value: (data?.totalImport || 0) / 1e9 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `$${v}B`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}B`, 'Değer']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Akış Türleri Dağılımı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.flowDistribution.slice(0, 6)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data?.flowDistribution.slice(0, 6).map((_, index) => (
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

        <div className="chart-card full-width">
          <h3 className="chart-title">Aylık Ticaret Trendi</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data?.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="ay" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `$${v}B`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}B`, '']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ihracat" 
                name="İhracat"
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="ithalat" 
                name="İthalat"
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ fill: '#f59e0b', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
