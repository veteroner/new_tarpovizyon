import { useEffect, useState } from 'react';
import { Leaf, Grid, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { fetchQuery, formatNumber, queries } from '../services/api';

const COLORS = ['#14b8a6', '#10b981', '#34d399', '#6ee7b7', '#059669', '#047857'];

interface ProductionData {
  stats: { toplamUrun: number; toplamUretim: number };
  topProducts: { ad: string; miktar: number; birim: string }[];
  yearlyProduction: { yil: string; toplam: number }[];
}

function formatProduction(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}

export function ProductionPage() {
  const [data, setData] = useState<ProductionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, productsRes, yearlyRes] = await Promise.all([
          fetchQuery(queries.productionStats),
          fetchQuery(queries.topProducts),
          fetchQuery(queries.yearlyProduction),
        ]);

        const statsData = statsRes.data?.[0];
        
        setData({
          stats: {
            toplamUrun: parseInt(String(statsData?.toplamUrun ?? 0)) || 0,
            toplamUretim: parseFloat(String(statsData?.toplamUretim ?? 0)) || 0,
          },
          topProducts: (productsRes.data || []) as { ad: string; miktar: number; birim: string }[],
          yearlyProduction: (yearlyRes.data || []) as { yil: string; toplam: number }[],
        });
      } catch (error) {
        console.error('Error loading production data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <Loading />;

  const avgPerProduct = (data?.stats.toplamUretim || 0) / (data?.stats.toplamUrun || 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tarımsal Üretim</h1>
        <p className="page-subtitle">Üretim verileri ve trendler</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam Üretim"
          value={formatProduction(data?.stats.toplamUretim || 0) + ' ton'}
          subtitle={`${formatNumber(data?.stats.toplamUrun || 0)} farklı ürün`}
          icon={Leaf}
          color="teal"
          large
        />
        <KPICard
          title="Ürün Çeşidi"
          value={formatNumber(data?.stats.toplamUrun || 0)}
          subtitle="Kayıtlı ürün"
          icon={Grid}
          color="teal"
        />
        <KPICard
          title="Ortalama Üretim"
          value={formatProduction(avgPerProduct)}
          subtitle="Ürün başına"
          icon={BarChart3}
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">En Çok Üretilen Ürünler</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.topProducts.slice(0, 10).map(p => ({
              name: p.ad?.substring(0, 12) || 'Ürün',
              value: parseFloat(String(p.miktar)) / 1e6,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${v}M`} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}M ton`, 'Üretim']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data?.topProducts.slice(0, 10).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Üretim Dağılımı (İlk 6 Ürün)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data?.topProducts.slice(0, 6).map(p => ({
                  name: p.ad?.substring(0, 10) || 'Diğer',
                  value: parseFloat(String(p.miktar)),
                }))}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data?.topProducts.slice(0, 6).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatProduction(value) + ' ton', 'Üretim']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {data?.yearlyProduction && data.yearlyProduction.length > 0 && (
          <div className="chart-card full-width">
            <h3 className="chart-title">Yıllık Üretim Trendi</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.yearlyProduction.map(d => ({
                yil: d.yil,
                value: parseFloat(String(d.toplam)) / 1e9,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="yil" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${v}B`} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}B ton`, 'Üretim']}
                  contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#14b8a6" 
                  strokeWidth={3}
                  dot={{ fill: '#14b8a6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Product List */}
      <div className="data-table">
        <h3 className="data-table-title">Üretim Detayları</h3>
        {data?.topProducts.map((product, index) => (
          <div key={index} className="table-row">
            <div className="table-rank" style={{ background: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}>
              {index + 1}
            </div>
            <div className="table-info">
              <div className="table-name">{product.ad}</div>
              <div className="table-subtext">{product.birim || 'ton'}</div>
            </div>
            <div className="table-value" style={{ color: COLORS[index % COLORS.length] }}>
              {formatProduction(parseFloat(String(product.miktar)))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
