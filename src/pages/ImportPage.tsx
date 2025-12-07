import { useEffect, useState, useCallback } from 'react';
import { TrendingDown, FileText, Calculator } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { DateFilter } from '../components/DateFilter';
import { fetchQuery, formatMoney, formatNumber, queries, addYearFilter, TRADE_YEARS } from '../services/api';

const COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309', '#ea580c'];

interface ImportData {
  totalImport: number;
  importCount: number;
  topCountries: { ulke: string; toplam: number; cnt: number }[];
}

export function ImportPage() {
  const [data, setData] = useState<ImportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [importRes, countriesRes] = await Promise.all([
        fetchQuery(addYearFilter(queries.totalImport, selectedYear)),
        fetchQuery(addYearFilter(queries.topImportCountries, selectedYear)),
      ]);

      setData({
        totalImport: parseFloat(String(importRes.data?.[0]?.toplam ?? 0)) || 0,
        importCount: parseInt(String(importRes.data?.[0]?.cnt ?? 0)) || 0,
        topCountries: (countriesRes.data || []) as { ulke: string; toplam: number; cnt: number }[],
      });
    } catch (error) {
      console.error('Error loading import data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  const avgPerTransaction = data?.importCount ? data.totalImport / data.importCount : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">İthalat Analizi</h1>
        <p className="page-subtitle">İthalat verileri ve trendler</p>
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
          title="Toplam İthalat"
          value={formatMoney(data?.totalImport || 0)}
          subtitle={`${formatNumber(data?.importCount || 0)} ithalat işlemi`}
          icon={TrendingDown}
          color="orange"
          large
        />
        <KPICard
          title="İşlem Sayısı"
          value={formatNumber(data?.importCount || 0)}
          subtitle="Toplam ithalat"
          icon={FileText}
          color="orange"
        />
        <KPICard
          title="Ortalama İşlem"
          value={formatMoney(avgPerTransaction)}
          subtitle="İşlem başına"
          icon={Calculator}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">En Çok İthalat Yapılan Ülkeler</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.topCountries.map(c => ({
              name: c.ulke?.substring(0, 12) || 'Bilinmiyor',
              value: parseFloat(String(c.toplam)) / 1e9,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `$${v}B`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}B`, 'İthalat']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">İthalat Dağılımı (İlk 6 Ülke)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data?.topCountries.slice(0, 6).map(c => ({
                  name: c.ulke?.substring(0, 10) || 'Diğer',
                  value: parseFloat(String(c.toplam)),
                }))}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data?.topCountries.slice(0, 6).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatMoney(value), 'İthalat']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Country List */}
      <div className="data-table">
        <h3 className="data-table-title">İthalat Ülkeleri Detayı</h3>
        {data?.topCountries.map((country, index) => (
          <div key={index} className="table-row">
            <div className="table-rank orange">{index + 1}</div>
            <div className="table-info">
              <div className="table-name">{country.ulke}</div>
              <div className="table-subtext">{formatNumber(country.cnt)} işlem</div>
            </div>
            <div className="table-value orange">{formatMoney(parseFloat(String(country.toplam)))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
