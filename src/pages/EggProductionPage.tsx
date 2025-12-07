import { useEffect, useState } from 'react';
import { Egg, Globe, TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { fetchQuery, formatNumber } from '../services/api';

const COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309', '#ea580c'];

interface EggData {
  totalProduction: number;
  eggTypeDistribution: { name: string; value: number }[];
  topCountries: { ulke: string; toplam: number }[];
  yearlyTrend: { yil: string; toplam: number }[];
  turkeyRank: { rank: number; total: number; value: number };
}

function formatTon(value: number): string {
  if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}

export function EggProductionPage() {
  const [data, setData] = useState<EggData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Total egg production
        const totalRes = await fetchQuery(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%'
        `);

        // Egg type distribution
        const eggTypes = [
          { name: 'Tavuk Yumurtası', query: "ürün LIKE '%Hen eggs%'" },
          { name: 'Diğer Kuş Yumurtaları', query: "ürün LIKE '%Eggs from other birds%'" },
        ];

        const eggTypePromises = eggTypes.map(async (type) => {
          const res = await fetchQuery(`
            SELECT SUM(deger) as toplam 
            FROM üretimindex 
            WHERE ${type.query}
          `);
          return {
            name: type.name,
            value: parseFloat(String(res.data?.[0]?.toplam ?? 0)) || 0
          };
        });
        const eggDistribution = await Promise.all(eggTypePromises);

        // Top producing countries
        const topCountriesRes = await fetchQuery(`
          SELECT ülke as ulke, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%Hen eggs%'
          GROUP BY ülke 
          ORDER BY toplam DESC 
          LIMIT 10
        `);

        // Yearly trend
        const yearlyRes = await fetchQuery(`
          SELECT yil, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%'
          GROUP BY yil 
          ORDER BY yil
        `);

        // Turkey's rank
        const turkeyRes = await fetchQuery(`
          SELECT ülke, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%Hen eggs%'
          GROUP BY ülke 
          ORDER BY toplam DESC
        `);
        
        const turkeyData = turkeyRes.data || [];
        const turkeyIndex = turkeyData.findIndex((d: Record<string, string | number>) => 
          String(d.ulke).toLowerCase().includes('turkey') || String(d.ulke).toLowerCase().includes('türk')
        );

        setData({
          totalProduction: parseFloat(String(totalRes.data?.[0]?.toplam ?? 0)) || 0,
          eggTypeDistribution: eggDistribution.filter(e => e.value > 0),
          topCountries: (topCountriesRes.data || []).map((d: Record<string, string | number>) => ({
            ulke: String(d.ulke || 'Bilinmiyor'),
            toplam: parseFloat(String(d.toplam ?? 0)) || 0
          })),
          yearlyTrend: (yearlyRes.data || []).map((d: Record<string, string | number>) => ({
            yil: String(d.yil || ''),
            toplam: parseFloat(String(d.toplam ?? 0)) || 0
          })),
          turkeyRank: {
            rank: turkeyIndex >= 0 ? turkeyIndex + 1 : 0,
            total: turkeyData.length,
            value: turkeyIndex >= 0 ? parseFloat(String(turkeyData[turkeyIndex]?.toplam ?? 0)) : 0
          }
        });
      } catch (error) {
        console.error('Error loading egg data:', error);
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
        <h1 className="page-title">🥚 Yumurta Üretimi</h1>
        <p className="page-subtitle">Dünya yumurta üretimi verileri ve analizler</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam Yumurta Üretimi"
          value={formatTon(data?.totalProduction || 0)}
          subtitle="Dünya geneli üretim değeri"
          icon={Egg}
          color="orange"
          large
        />
        <KPICard
          title="Üretici Ülke"
          value={formatNumber(data?.topCountries.length || 0) + '+'}
          subtitle="Yumurta üreten ülke sayısı"
          icon={Globe}
          color="blue"
        />
        <KPICard
          title="Türkiye Sıralaması"
          value={data?.turkeyRank.rank ? `#${data.turkeyRank.rank}` : 'N/A'}
          subtitle={`${data?.turkeyRank.total || 0} ülke arasında`}
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Yumurta Türü"
          value={data?.eggTypeDistribution.length.toString() || '0'}
          subtitle="Farklı yumurta kategorisi"
          icon={BarChart3}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🌍 En Çok Tavuk Yumurtası Üreten Ülkeler</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.topCountries.map(c => ({
              name: c.ulke.substring(0, 15),
              value: c.toplam / 1e9,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={100} fontSize={11} />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${v.toFixed(0)}B`} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}B`, 'Üretim Değeri']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🥧 Yumurta Türü Dağılımı</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data?.eggTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {data?.eggTypeDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatTon(value), 'Üretim']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yearly Trend */}
      <div className="chart-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="chart-title">📈 Yıllık Yumurta Üretim Trendi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data?.yearlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="yil" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${(v / 1e9).toFixed(0)}B`} />
            <Tooltip 
              formatter={(value: number) => [formatTon(value), 'Üretim']}
              contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <Line type="monotone" dataKey="toplam" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Country Rankings Table */}
      <div className="data-table" style={{ marginTop: '1.5rem' }}>
        <h3 className="data-table-title">🏆 Tavuk Yumurtası Üretim Sıralaması</h3>
        {data?.topCountries.map((country, index) => (
          <div key={index} className="table-row">
            <div className="table-rank" style={{ background: index < 3 ? '#f59e0b' : '#374151' }}>
              {index + 1}
            </div>
            <div className="table-info">
              <div className="table-name">{country.ulke}</div>
              <div className="table-subtext">Dünya sıralaması</div>
            </div>
            <div className="table-value" style={{ color: '#f59e0b' }}>{formatTon(country.toplam)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
