import { useEffect, useState, useCallback } from 'react';
import { Beef, Globe, Scale, Target } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { DateFilter } from '../components/DateFilter';
import { fetchQuery, PRODUCTION_YEARS } from '../services/api';

interface ComparisonData {
  turkeyStats: {
    meatProduction: number;
    milkProduction: number;
    eggProduction: number;
    meatRank: number;
    milkRank: number;
    eggRank: number;
  };
  worldStats: {
    meatProduction: number;
    milkProduction: number;
    eggProduction: number;
  };
  turkeyTrend: { yil: string; et: number; sut: number; yumurta: number }[];
  topCompetitors: { ulke: string; total: number }[];
  turkeyShare: { category: string; turkey: number; world: number; percent: number }[];
  radarData: { subject: string; Turkey: number; WorldAvg: number }[];
}

function formatTon(value: number): string {
  if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}

function addProductionYearFilter(sql: string, year: string): string {
  if (year === 'all') return sql;
  const hasWhere = sql.toLowerCase().includes('where');
  const yearCondition = "yil = '" + year + "'";
  
  if (hasWhere) {
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, 'AND ' + yearCondition + ' GROUP BY');
    }
    return sql + ' AND ' + yearCondition;
  } else {
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, 'WHERE ' + yearCondition + ' GROUP BY');
    }
    return sql + ' WHERE ' + yearCondition;
  }
}

export function LivestockCompetitionPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Turkey's production values
      const turkeyMeat = await fetchQuery(addProductionYearFilter(
        "SELECT SUM(deger) as toplam FROM üretimindex WHERE (ürün LIKE '%Meat%' OR ürün LIKE '%meat%') AND (ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%')",
        selectedYear
      ));

      const turkeyMilk = await fetchQuery(addProductionYearFilter(
        "SELECT SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%milk%' AND (ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%')",
        selectedYear
      ));

      const turkeyEggs = await fetchQuery(addProductionYearFilter(
        "SELECT SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%' AND (ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%')",
        selectedYear
      ));

      // World totals
      const worldMeat = await fetchQuery(addProductionYearFilter(
        "SELECT SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%Meat%' OR ürün LIKE '%meat%'",
        selectedYear
      ));

      const worldMilk = await fetchQuery(addProductionYearFilter(
        "SELECT SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%milk%'",
        selectedYear
      ));

      const worldEggs = await fetchQuery(addProductionYearFilter(
        "SELECT SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%'",
        selectedYear
      ));

      // Rankings
      const meatRankRes = await fetchQuery(addProductionYearFilter(
        "SELECT ülke, SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%Meat%' OR ürün LIKE '%meat%' GROUP BY ülke ORDER BY toplam DESC",
        selectedYear
      ));
      const milkRankRes = await fetchQuery(addProductionYearFilter(
        "SELECT ülke, SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%milk%' GROUP BY ülke ORDER BY toplam DESC",
        selectedYear
      ));
      const eggRankRes = await fetchQuery(addProductionYearFilter(
        "SELECT ülke, SUM(deger) as toplam FROM üretimindex WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%' GROUP BY ülke ORDER BY toplam DESC",
        selectedYear
      ));

      const findTurkeyRank = (data: Record<string, string | number>[]) => {
        const idx = data.findIndex((d) => 
          String(d.ulke || d.ülke || '').toLowerCase().includes('turkey') || 
          String(d.ulke || d.ülke || '').toLowerCase().includes('türk')
        );
        return idx >= 0 ? idx + 1 : 0;
      };

      // Top competitors (total livestock production)
      const topCompetitorsRes = await fetchQuery(addProductionYearFilter(
        "SELECT ülke as ulke, SUM(deger) as total FROM üretimindex WHERE (ürün LIKE '%Meat%' OR ürün LIKE '%milk%' OR ürün LIKE '%egg%') AND ürün NOT LIKE '%Eggplant%' GROUP BY ülke ORDER BY total DESC LIMIT 15",
        selectedYear
      ));

      // Turkey yearly trend - don't filter by year
      const turkeyTrendRes = await fetchQuery(
        "SELECT yil, " +
        "SUM(CASE WHEN (ürün LIKE '%Meat%' OR ürün LIKE '%meat%') THEN deger ELSE 0 END) as et, " +
        "SUM(CASE WHEN ürün LIKE '%milk%' THEN deger ELSE 0 END) as sut, " +
        "SUM(CASE WHEN ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%' THEN deger ELSE 0 END) as yumurta " +
        "FROM üretimindex WHERE ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%' GROUP BY yil ORDER BY yil"
      );

      const turkeyMeatVal = parseFloat(String(turkeyMeat.data?.[0]?.toplam ?? 0)) || 0;
      const turkeyMilkVal = parseFloat(String(turkeyMilk.data?.[0]?.toplam ?? 0)) || 0;
      const turkeyEggsVal = parseFloat(String(turkeyEggs.data?.[0]?.toplam ?? 0)) || 0;
      const worldMeatVal = parseFloat(String(worldMeat.data?.[0]?.toplam ?? 0)) || 0;
      const worldMilkVal = parseFloat(String(worldMilk.data?.[0]?.toplam ?? 0)) || 0;
      const worldEggsVal = parseFloat(String(worldEggs.data?.[0]?.toplam ?? 0)) || 0;

      // Calculate Turkey's share
      const turkeyShare = [
        { 
          category: 'Et Üretimi', 
          turkey: turkeyMeatVal, 
          world: worldMeatVal,
          percent: worldMeatVal > 0 ? (turkeyMeatVal / worldMeatVal) * 100 : 0
        },
        { 
          category: 'Süt Üretimi', 
          turkey: turkeyMilkVal, 
          world: worldMilkVal,
          percent: worldMilkVal > 0 ? (turkeyMilkVal / worldMilkVal) * 100 : 0
        },
        { 
          category: 'Yumurta Üretimi', 
          turkey: turkeyEggsVal, 
          world: worldEggsVal,
          percent: worldEggsVal > 0 ? (turkeyEggsVal / worldEggsVal) * 100 : 0
        },
      ];

      // Radar data for comparison
      const countryCount = (meatRankRes.data || []).length || 1;
      const radarData = [
        { 
          subject: 'Et', 
          Turkey: turkeyMeatVal / 1e9, 
          WorldAvg: worldMeatVal / countryCount / 1e9 
        },
        { 
          subject: 'Süt', 
          Turkey: turkeyMilkVal / 1e9, 
          WorldAvg: worldMilkVal / countryCount / 1e9 
        },
        { 
          subject: 'Yumurta', 
          Turkey: turkeyEggsVal / 1e9, 
          WorldAvg: worldEggsVal / countryCount / 1e9 
        },
      ];

      setData({
        turkeyStats: {
          meatProduction: turkeyMeatVal,
          milkProduction: turkeyMilkVal,
          eggProduction: turkeyEggsVal,
          meatRank: findTurkeyRank(meatRankRes.data || []),
          milkRank: findTurkeyRank(milkRankRes.data || []),
          eggRank: findTurkeyRank(eggRankRes.data || []),
        },
        worldStats: {
          meatProduction: worldMeatVal,
          milkProduction: worldMilkVal,
          eggProduction: worldEggsVal,
        },
        turkeyTrend: (turkeyTrendRes.data || []).map((d: Record<string, string | number>) => ({
          yil: String(d.yil || ''),
          et: parseFloat(String(d.et ?? 0)) || 0,
          sut: parseFloat(String(d.sut ?? 0)) || 0,
          yumurta: parseFloat(String(d.yumurta ?? 0)) || 0,
        })),
        topCompetitors: (topCompetitorsRes.data || []).map((d: Record<string, string | number>) => ({
          ulke: String(d.ulke || 'Bilinmiyor'),
          total: parseFloat(String(d.total ?? 0)) || 0
        })),
        turkeyShare,
        radarData,
      });
    } catch (error) {
      console.error('Error loading competition data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  const turkeyTotalProduction = 
    (data?.turkeyStats.meatProduction || 0) + 
    (data?.turkeyStats.milkProduction || 0) + 
    (data?.turkeyStats.eggProduction || 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Rekabet Analizi</h1>
        <p className="page-subtitle">Türkiye'nin dünya hayvansal üretimindeki konumu</p>
      </div>

      <DateFilter
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={PRODUCTION_YEARS}
      />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Türkiye Toplam Üretim"
          value={formatTon(turkeyTotalProduction)}
          subtitle="Et + Süt + Yumurta"
          icon={Beef}
          color="red"
          large
        />
        <KPICard
          title="Et Sıralaması"
          value={data?.turkeyStats.meatRank ? `#${data.turkeyStats.meatRank}` : 'N/A'}
          subtitle="Dünya sıralaması"
          icon={Target}
          color="orange"
        />
        <KPICard
          title="Süt Sıralaması"
          value={data?.turkeyStats.milkRank ? `#${data.turkeyStats.milkRank}` : 'N/A'}
          subtitle="Dünya sıralaması"
          icon={Scale}
          color="blue"
        />
        <KPICard
          title="Yumurta Sıralaması"
          value={data?.turkeyStats.eggRank ? `#${data.turkeyStats.eggRank}` : 'N/A'}
          subtitle="Dünya sıralaması"
          icon={Globe}
          color="green"
        />
      </div>

      {/* Turkey Share */}
      <div className="chart-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="chart-title">🇹🇷 Türkiye'nin Dünya Payı</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem' }}>
          {data?.turkeyShare.map((item, index) => (
            <div key={index} style={{ 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              textAlign: 'center' 
            }}>
              <h4 style={{ color: '#a1a1aa', marginBottom: '0.5rem' }}>{item.category}</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                %{item.percent.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.5rem' }}>
                {formatTon(item.turkey)} / {formatTon(item.world)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-grid">
        {/* Top Competitors */}
        <div className="chart-card">
          <h3 className="chart-title">🏆 En Büyük Üreticiler</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.topCompetitors.slice(0, 10).map(c => ({
              name: c.ulke.substring(0, 12),
              value: c.total / 1e9,
              isTurkey: c.ulke.toLowerCase().includes('turkey') || c.ulke.toLowerCase().includes('türk')
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={100} fontSize={10} />
              <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${v.toFixed(0)}B`} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}B`, 'Toplam Üretim']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar 
                dataKey="value" 
                fill="#6366f1" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Comparison */}
        <div className="chart-card">
          <h3 className="chart-title">📈 Türkiye vs Dünya Ortalaması</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={data?.radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" />
              <PolarRadiusAxis stroke="#a1a1aa" />
              <Radar name="Türkiye" dataKey="Turkey" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
              <Radar name="Dünya Ort." dataKey="WorldAvg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Legend />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}B`, '']}
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Turkey Trend */}
      <div className="chart-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="chart-title">📈 Türkiye Üretim Trendi</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data?.turkeyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="yil" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${(v / 1e9).toFixed(0)}B`} />
            <Tooltip 
              formatter={(value: number) => [formatTon(value), '']}
              contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <Legend />
            <Line type="monotone" dataKey="et" name="Et" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
            <Line type="monotone" dataKey="sut" name="Süt" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            <Line type="monotone" dataKey="yumurta" name="Yumurta" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rankings Table */}
      <div className="data-table" style={{ marginTop: '1.5rem' }}>
        <h3 className="data-table-title">🌍 Hayvansal Üretim Liderliği</h3>
        {data?.topCompetitors.slice(0, 10).map((country, index) => {
          const isTurkey = country.ulke.toLowerCase().includes('turkey') || country.ulke.toLowerCase().includes('türk');
          return (
            <div key={index} className="table-row" style={{ background: isTurkey ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
              <div className="table-rank" style={{ background: index < 3 ? '#6366f1' : '#374151' }}>
                {index + 1}
              </div>
              <div className="table-info">
                <div className="table-name" style={{ color: isTurkey ? '#ef4444' : 'inherit' }}>
                  {isTurkey ? '🇹🇷 ' : ''}{country.ulke}
                </div>
                <div className="table-subtext">Toplam hayvansal üretim</div>
              </div>
              <div className="table-value" style={{ color: isTurkey ? '#ef4444' : '#6366f1' }}>
                {formatTon(country.total)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
