import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, FileText, Calculator } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { DateFilter } from '../components/DateFilter';
import { fetchQuery, formatMoney, formatNumber, queries, addYearFilter, TRADE_YEARS } from '../services/api';

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#14b8a6'];

interface ExportData {
  totalExport: number;
  exportCount: number;
  topCountries: { ulke: string; toplam: number; cnt: number }[];
}

export function ExportPage() {
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [exportRes, countriesRes] = await Promise.all([
        fetchQuery(addYearFilter(queries.totalExport, selectedYear)),
        fetchQuery(addYearFilter(queries.topExportCountries, selectedYear)),
      ]);

      setData({
        totalExport: parseFloat(String(exportRes.data?.[0]?.toplam ?? 0)) || 0,
        exportCount: parseInt(String(exportRes.data?.[0]?.cnt ?? 0)) || 0,
        topCountries: (countriesRes.data || []) as { ulke: string; toplam: number; cnt: number }[],
      });
    } catch (error) {
      console.error('Error loading export data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  const avgPerTransaction = data?.exportCount ? data.totalExport / data.exportCount : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">İhracat Analizi</h1>
        <p className="page-subtitle">İhracat verileri ve trendler</p>
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
          title="Toplam İhracat"
          value={formatMoney(data?.totalExport || 0)}
          subtitle={`${formatNumber(data?.exportCount || 0)} ihracat işlemi`}
          icon={TrendingUp}
          color="green"
          large
        />
        <KPICard
          title="İşlem Sayısı"
          value={formatNumber(data?.exportCount || 0)}
          subtitle="Toplam ihracat"
          icon={FileText}
          color="green"
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
          <h3 className="chart-title">En Çok İhracat Yapılan Ülkeler</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.topCountries.map(c => ({
              name: c.ulke?.substring(0, 12) || 'Bilinmiyor',
              value: parseFloat(String(c.toplam)) / 1e9,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `$${v}B`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}B`, 'İhracat']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">İhracat Dağılımı (İlk 6 Ülke)</h3>
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
                formatter={(value: number) => [formatMoney(value), 'İhracat']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Country List */}
      <div className="data-table">
        <h3 className="data-table-title">İhracat Ülkeleri Detayı</h3>
        {data?.topCountries.map((country, index) => (
          <div key={index} className="table-row">
            <div className="table-rank green">{index + 1}</div>
            <div className="table-info">
              <div className="table-name">{country.ulke}</div>
              <div className="table-subtext">{formatNumber(country.cnt)} işlem</div>
            </div>
            <div className="table-value green">{formatMoney(parseFloat(String(country.toplam)))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
