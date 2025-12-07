import { useEffect, useState, useCallback } from 'react';
import { Beef, Globe, TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { DateFilter } from '../components/DateFilter';
import { fetchQuery, formatNumber, PRODUCTION_YEARS } from '../services/api';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#6366f1'];

const MEAT_TYPES = [
  { key: 'cattle', name: 'Sığır Eti', query: "ürün LIKE '%Meat of cattle%'" },
  { key: 'chicken', name: 'Tavuk Eti', query: "ürün LIKE '%Meat of chicken%'" },
  { key: 'sheep', name: 'Koyun Eti', query: "ürün LIKE '%Meat of sheep%'" },
  { key: 'pig', name: 'Domuz Eti', query: "ürün LIKE '%Meat of pig%'" },
  { key: 'turkey', name: 'Hindi Eti', query: "ürün LIKE '%Meat of turkey%'" },
  { key: 'goat', name: 'Keçi Eti', query: "ürün LIKE '%Meat of goat%'" },
];

interface MeatData {
  totalProduction: number;
  meatTypeDistribution: { name: string; value: number }[];
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

// Helper to add year filter to production queries
function addProductionYearFilter(sql: string, year: string): string {
  if (year === 'all') return sql;
  const hasWhere = sql.toLowerCase().includes('where');
  const yearCondition = `yil = '${year}'`;
  
  if (hasWhere) {
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, `AND ${yearCondition} GROUP BY`);
    }
    return sql + ` AND ${yearCondition}`;
  } else {
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, `WHERE ${yearCondition} GROUP BY`);
    }
    return sql + ` WHERE ${yearCondition}`;
  }
}

export function MeatProductionPage() {
  const [data, setData] = useState<MeatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMeat] = useState('cattle');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  
  // Use variables to suppress lint warnings
  void selectedMeat;
  void formatNumber;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Total meat production
      const totalRes = await fetchQuery(addProductionYearFilter(`
        SELECT SUM(deger) as toplam 
        FROM üretimindex 
        WHERE (ürün LIKE '%Meat%' AND ürün NOT LIKE '%Game meat%')
      `, selectedYear));

      // Meat type distribution
      const meatTypePromises = MEAT_TYPES.map(async (type) => {
        const res = await fetchQuery(addProductionYearFilter(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ${type.query}
        `, selectedYear));
        return {
          name: type.name,
          value: parseFloat(String(res.data?.[0]?.toplam ?? 0)) || 0
        };
      });
      const meatTypes = await Promise.all(meatTypePromises);

      // Top producing countries for selected meat
      const topCountriesRes = await fetchQuery(addProductionYearFilter(`
        SELECT ülke as ulke, SUM(deger) as toplam 
        FROM üretimindex 
        WHERE ürün LIKE '%Meat of cattle%'
        GROUP BY ülke 
        ORDER BY toplam DESC 
        LIMIT 10
      `, selectedYear));

      // Yearly trend - don't filter by year, shows all years
      const yearlyRes = await fetchQuery(`
        SELECT yil, SUM(deger) as toplam 
        FROM üretimindex 
        WHERE (ürün LIKE '%Meat%' AND ürün NOT LIKE '%Game meat%')
        GROUP BY yil 
        ORDER BY yil
      `);

      // Turkey's rank
      const turkeyRes = await fetchQuery(addProductionYearFilter(`
        SELECT ülke, SUM(deger) as toplam 
        FROM üretimindex 
        WHERE ürün LIKE '%Meat of cattle%'
        GROUP BY ülke 
        ORDER BY toplam DESC
      `, selectedYear));
      
      const turkeyData = turkeyRes.data || [];
      const turkeyIndex = turkeyData.findIndex((d: Record<string, string | number>) => 
        String(d.ulke).toLowerCase().includes('turkey') || String(d.ulke).toLowerCase().includes('türk')
      );

      setData({
        totalProduction: parseFloat(String(totalRes.data?.[0]?.toplam ?? 0)) || 0,
        meatTypeDistribution: meatTypes.filter(m => m.value > 0),
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
      console.error('Error loading meat data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🥩 Et Üretimi</h1>
        <p className="page-subtitle">Dünya et üretimi verileri ve analizler</p>
      </div>

      {/* Date Filter */}
      <DateFilter
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={PRODUCTION_YEARS}
      />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Toplam Et Üretimi"
          value={formatTon(data?.totalProduction || 0)}
          subtitle="Dünya geneli üretim değeri"
          icon={Beef}
          color="red"
          large
        />
        <KPICard
          title="Üretici Ülke"
          value={formatNumber(data?.topCountries.length || 0) + '+'}
          subtitle="Et üreten ülke sayısı"
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
          title="Et Türü"
          value={data?.meatTypeDistribution.length.toString() || '0'}
          subtitle="Farklı et kategorisi"
          icon={BarChart3}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">🌍 En Çok Sığır Eti Üreten Ülkeler</h3>
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
              <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">🥧 Et Türü Dağılımı</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data?.meatTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {data?.meatTypeDistribution.map((_, index) => (
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
        <h3 className="chart-title">📈 Yıllık Et Üretim Trendi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data?.yearlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="yil" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${(v / 1e9).toFixed(0)}B`} />
            <Tooltip 
              formatter={(value: number) => [formatTon(value), 'Üretim']}
              contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <Line type="monotone" dataKey="toplam" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Country Rankings Table */}
      <div className="data-table" style={{ marginTop: '1.5rem' }}>
        <h3 className="data-table-title">🏆 Sığır Eti Üretim Sıralaması</h3>
        {data?.topCountries.map((country, index) => (
          <div key={index} className="table-row">
            <div className="table-rank" style={{ background: index < 3 ? '#ef4444' : '#374151' }}>
              {index + 1}
            </div>
            <div className="table-info">
              <div className="table-name">{country.ulke}</div>
              <div className="table-subtext">Dünya sıralaması</div>
            </div>
            <div className="table-value" style={{ color: '#ef4444' }}>{formatTon(country.toplam)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
