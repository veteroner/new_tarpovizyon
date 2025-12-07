import { useEffect, useState } from 'react';
import { Beef, Globe, Scale, Target } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { fetchQuery } from '../services/api';

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

export function LivestockCompetitionPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Turkey's production values
        const turkeyMeat = await fetchQuery(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE (ürün LIKE '%Meat%' OR ürün LIKE '%meat%') 
          AND (ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%')
        `);

        const turkeyMilk = await fetchQuery(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%milk%' 
          AND (ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%')
        `);

        const turkeyEggs = await fetchQuery(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%'
          AND (ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%')
        `);

        // World totals
        const worldMeat = await fetchQuery(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%Meat%' OR ürün LIKE '%meat%'
        `);

        const worldMilk = await fetchQuery(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%milk%'
        `);

        const worldEggs = await fetchQuery(`
          SELECT SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%'
        `);

        // Turkey's rankings
        const meatRanking = await fetchQuery(`
          SELECT ülke, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%Meat%' OR ürün LIKE '%meat%'
          GROUP BY ülke 
          ORDER BY toplam DESC
        `);
        
        const milkRanking = await fetchQuery(`
          SELECT ülke, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%milk%'
          GROUP BY ülke 
          ORDER BY toplam DESC
        `);

        const eggRanking = await fetchQuery(`
          SELECT ülke, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE ürün LIKE '%egg%' AND ürün NOT LIKE '%Eggplant%'
          GROUP BY ülke 
          ORDER BY toplam DESC
        `);

        const findTurkeyRank = (data: Record<string, unknown>[]) => {
          const idx = data.findIndex((d) => 
            String(d.ulke || d.ülke || '').toLowerCase().includes('turkey') || 
            String(d.ulke || d.ülke || '').toLowerCase().includes('türk')
          );
          return idx >= 0 ? idx + 1 : 0;
        };

        // Turkey's yearly trend
        const turkeyYearlyTrend = await fetchQuery(`
          SELECT yil, ürün, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE (ülke LIKE '%Turkey%' OR ülke LIKE '%Türk%')
          AND (ürün LIKE '%Meat%' OR ürün LIKE '%milk%' OR ürün LIKE '%egg%')
          GROUP BY yil, ürün
          ORDER BY yil
        `);

        // Process yearly trend
        const trendMap = new Map<string, { et: number; sut: number; yumurta: number }>();
        (turkeyYearlyTrend.data || []).forEach((d: Record<string, string | number>) => {
          const year = String(d.yil || '');
          const product = String(d.ürün || '').toLowerCase();
          const value = parseFloat(String(d.toplam ?? 0)) || 0;
          
          if (!trendMap.has(year)) {
            trendMap.set(year, { et: 0, sut: 0, yumurta: 0 });
          }
          const entry = trendMap.get(year)!;
          
          if (product.includes('meat')) entry.et += value;
          else if (product.includes('milk')) entry.sut += value;
          else if (product.includes('egg')) entry.yumurta += value;
        });

        const turkeyTrend = Array.from(trendMap.entries())
          .map(([yil, values]) => ({ yil, ...values }))
          .sort((a, b) => a.yil.localeCompare(b.yil));

        // Top competitors (total animal production)
        const competitors = await fetchQuery(`
          SELECT ülke as ulke, SUM(deger) as toplam 
          FROM üretimindex 
          WHERE (ürün LIKE '%Meat%' OR ürün LIKE '%milk%' OR ürün LIKE '%egg%')
          AND ürün NOT LIKE '%Eggplant%'
          GROUP BY ülke 
          ORDER BY toplam DESC 
          LIMIT 15
        `);

        // Calculate percentages
        const tMeat = parseFloat(String(turkeyMeat.data?.[0]?.toplam ?? 0)) || 0;
        const tMilk = parseFloat(String(turkeyMilk.data?.[0]?.toplam ?? 0)) || 0;
        const tEggs = parseFloat(String(turkeyEggs.data?.[0]?.toplam ?? 0)) || 0;
        const wMeat = parseFloat(String(worldMeat.data?.[0]?.toplam ?? 0)) || 0;
        const wMilk = parseFloat(String(worldMilk.data?.[0]?.toplam ?? 0)) || 0;
        const wEggs = parseFloat(String(worldEggs.data?.[0]?.toplam ?? 0)) || 0;

        const turkeyShare = [
          { category: 'Et', turkey: tMeat, world: wMeat, percent: wMeat > 0 ? (tMeat / wMeat) * 100 : 0 },
          { category: 'Süt', turkey: tMilk, world: wMilk, percent: wMilk > 0 ? (tMilk / wMilk) * 100 : 0 },
          { category: 'Yumurta', turkey: tEggs, world: wEggs, percent: wEggs > 0 ? (tEggs / wEggs) * 100 : 0 },
        ];

        // Radar data (normalized)
        const countryCount = (competitors.data || []).length || 1;
        const avgMeat = wMeat / countryCount;
        const avgMilk = wMilk / countryCount;
        const avgEggs = wEggs / countryCount;

        const radarData = [
          { subject: 'Et Üretimi', Turkey: Math.min(100, (tMeat / avgMeat) * 20), WorldAvg: 20 },
          { subject: 'Süt Üretimi', Turkey: Math.min(100, (tMilk / avgMilk) * 20), WorldAvg: 20 },
          { subject: 'Yumurta', Turkey: Math.min(100, (tEggs / avgEggs) * 20), WorldAvg: 20 },
          { subject: 'Et Sıralaması', Turkey: Math.max(0, 100 - findTurkeyRank(meatRanking.data || [])), WorldAvg: 50 },
          { subject: 'Süt Sıralaması', Turkey: Math.max(0, 100 - findTurkeyRank(milkRanking.data || [])), WorldAvg: 50 },
        ];

        setData({
          turkeyStats: {
            meatProduction: tMeat,
            milkProduction: tMilk,
            eggProduction: tEggs,
            meatRank: findTurkeyRank(meatRanking.data || []),
            milkRank: findTurkeyRank(milkRanking.data || []),
            eggRank: findTurkeyRank(eggRanking.data || []),
          },
          worldStats: {
            meatProduction: wMeat,
            milkProduction: wMilk,
            eggProduction: wEggs,
          },
          turkeyTrend,
          topCompetitors: (competitors.data || []).map((d: Record<string, string | number>) => ({
            ulke: String(d.ulke || 'Bilinmiyor'),
            total: parseFloat(String(d.toplam ?? 0)) || 0
          })),
          turkeyShare,
          radarData,
        });
      } catch (error) {
        console.error('Error loading competition data:', error);
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
        <h1 className="page-title">🏆 Türkiye Rekabet Analizi</h1>
        <p className="page-subtitle">Türkiye'nin hayvansal üretimde dünya konumu</p>
      </div>

      {/* KPI Cards - Turkey Stats */}
      <div className="kpi-grid">
        <KPICard
          title="🇹🇷 Türkiye Et Üretimi"
          value={formatTon(data?.turkeyStats.meatProduction || 0)}
          subtitle={`Dünya sıralaması: #${data?.turkeyStats.meatRank || 'N/A'}`}
          icon={Beef}
          color="red"
        />
        <KPICard
          title="🇹🇷 Türkiye Süt Üretimi"
          value={formatTon(data?.turkeyStats.milkProduction || 0)}
          subtitle={`Dünya sıralaması: #${data?.turkeyStats.milkRank || 'N/A'}`}
          icon={Scale}
          color="blue"
        />
        <KPICard
          title="🇹🇷 Türkiye Yumurta"
          value={formatTon(data?.turkeyStats.eggProduction || 0)}
          subtitle={`Dünya sıralaması: #${data?.turkeyStats.eggRank || 'N/A'}`}
          icon={Target}
          color="orange"
        />
        <KPICard
          title="🌍 Dünya Toplam"
          value={formatTon((data?.worldStats.meatProduction || 0) + (data?.worldStats.milkProduction || 0) + (data?.worldStats.eggProduction || 0))}
          subtitle="Et + Süt + Yumurta"
          icon={Globe}
          color="purple"
          large
        />
      </div>

      {/* Turkey's World Share */}
      <div className="chart-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="chart-title">🇹🇷 Türkiye'nin Dünya Payı</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', padding: '1rem' }}>
          {data?.turkeyShare.map((item, index) => (
            <div key={index} style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {item.category === 'Et' ? '🥩' : item.category === 'Süt' ? '🥛' : '🥚'}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                %{item.percent.toFixed(2)}
              </div>
              <div style={{ color: '#a1a1aa', marginTop: '0.5rem' }}>{item.category} Üretimi</div>
              <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.5rem' }}>
                {formatTon(item.turkey)} / {formatTon(item.world)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="chart-grid" style={{ marginTop: '1.5rem' }}>
        <div className="chart-card">
          <h3 className="chart-title">🌍 En Büyük Hayvansal Üretici Ülkeler</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.topCompetitors.map(c => ({
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

        <div className="chart-card">
          <h3 className="chart-title">📊 Türkiye Performans Radarı</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={data?.radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={11} />
              <PolarRadiusAxis stroke="#a1a1aa" />
              <Radar name="Türkiye" dataKey="Turkey" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
              <Radar name="Dünya Ort." dataKey="WorldAvg" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Legend />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Turkey Yearly Trend */}
      <div className="chart-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="chart-title">📈 Türkiye Yıllık Üretim Trendi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data?.turkeyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="yil" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip 
              formatter={(value: number, name: string) => [formatTon(value), name === 'et' ? 'Et' : name === 'sut' ? 'Süt' : 'Yumurta']}
              contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <Legend formatter={(value) => value === 'et' ? 'Et' : value === 'sut' ? 'Süt' : 'Yumurta'} />
            <Line type="monotone" dataKey="et" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sut" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="yumurta" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rankings Summary */}
      <div className="data-table" style={{ marginTop: '1.5rem' }}>
        <h3 className="data-table-title">🏅 Türkiye Sıralama Özeti</h3>
        <div className="table-row">
          <div className="table-rank" style={{ background: data?.turkeyStats.meatRank && data.turkeyStats.meatRank <= 20 ? '#22c55e' : '#f59e0b' }}>
            #{data?.turkeyStats.meatRank || 'N/A'}
          </div>
          <div className="table-info">
            <div className="table-name">🥩 Et Üretimi</div>
            <div className="table-subtext">Dünya sıralaması</div>
          </div>
          <div className="table-value" style={{ color: '#ef4444' }}>{formatTon(data?.turkeyStats.meatProduction || 0)}</div>
        </div>
        <div className="table-row">
          <div className="table-rank" style={{ background: data?.turkeyStats.milkRank && data.turkeyStats.milkRank <= 20 ? '#22c55e' : '#f59e0b' }}>
            #{data?.turkeyStats.milkRank || 'N/A'}
          </div>
          <div className="table-info">
            <div className="table-name">🥛 Süt Üretimi</div>
            <div className="table-subtext">Dünya sıralaması</div>
          </div>
          <div className="table-value" style={{ color: '#3b82f6' }}>{formatTon(data?.turkeyStats.milkProduction || 0)}</div>
        </div>
        <div className="table-row">
          <div className="table-rank" style={{ background: data?.turkeyStats.eggRank && data.turkeyStats.eggRank <= 20 ? '#22c55e' : '#f59e0b' }}>
            #{data?.turkeyStats.eggRank || 'N/A'}
          </div>
          <div className="table-info">
            <div className="table-name">🥚 Yumurta Üretimi</div>
            <div className="table-subtext">Dünya sıralaması</div>
          </div>
          <div className="table-value" style={{ color: '#f59e0b' }}>{formatTon(data?.turkeyStats.eggProduction || 0)}</div>
        </div>
      </div>
    </div>
  );
}
