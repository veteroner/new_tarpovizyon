import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { fetchQuery } from '../services/api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

interface LivestockItem {
  name: string;
  value: number;
  fill: string;
  [key: string]: string | number;
}

interface YearlyData {
  year: string;
  value: number;
  [key: string]: string | number;
}

interface OverviewData {
  population: number;
  ruralPopulation: number;
  urbanPopulation: number;
  gdp: number;
  gdpPerCapita: number;
  agriculturalLand: number;
  totalLand: number;
  livestockProduction: number;
  topLivestockProducts: LivestockItem[];
  livestockYearlyTrend: YearlyData[];
  landUseData: { name: string; value: number; fill: string }[];
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Paralel sorgular
      const [
        populationRes,
        gdpRes,
        gdpPerCapitaRes,
        landRes,
        livestockTotalRes,
        livestockProductsRes,
        livestockTrendRes
      ] = await Promise.all([
        // Nüfus (2023)
        fetchQuery(`SELECT total_v, kirsal_v, sehir_v FROM fao_nufus WHERE year=2023 AND area='Türkiye' LIMIT 1`),
        // GSYİH (2023) - million USD
        fetchQuery(`SELECT value FROM fao_makro_1 WHERE year=2023 AND area='Türkiye' AND item='Gross Domestic Product' AND unit='million' AND elementcode='6225' LIMIT 1`),
        // Kişi başı GSYİH
        fetchQuery(`SELECT value FROM fao_makro_1 WHERE year=2023 AND area='Türkiye' AND item='Gross Domestic Product' AND unit='USD' LIMIT 1`),
        // Arazi kullanımı (2022)
        fetchQuery(`SELECT item_tr, value FROM fao_land_use WHERE year=2022 AND area='Türkiye' AND item IN ('Country area', 'Land area', 'Agriculture', 'Arable land', 'Permanent meadows and pastures', 'Forest land')`),
        // Toplam hayvansal üretim (2023)
        fetchQuery(`SELECT SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production'`),
        // En çok üretilen hayvansal ürünler
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' GROUP BY item ORDER BY total DESC LIMIT 8`),
        // Hayvansal üretim yıllık trend
        fetchQuery(`SELECT year, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE area='Türkiye' AND element='Production' AND year >= 2010 GROUP BY year ORDER BY year`)
      ]);

      // Nüfus
      const popData = populationRes.data?.[0];
      const population = Number(popData?.total_v) * 1000 || 0;
      const ruralPopulation = Number(popData?.kirsal_v) * 1000 || 0;
      const urbanPopulation = Number(popData?.sehir_v) * 1000 || 0;

      // GSYİH
      const gdp = Number(gdpRes.data?.[0]?.value) * 1e6 || 0;
      const gdpPerCapita = Number(gdpPerCapitaRes.data?.[0]?.value) || 0;

      // Arazi
      const landMap: Record<string, number> = {};
      landRes.data?.forEach(item => {
        landMap[String(item.item_tr)] = Number(item.value) * 1000 || 0; // 1000 ha -> ha
      });

      const agriculturalLand = landMap['Tarım'] || 0;
      const totalLand = landMap['Ülke yüzölçümü'] || 0;

      // Arazi kullanım dağılımı
      const landUseData = [
        { name: 'Tarım Arazisi', value: landMap['Tarım'] || 0, fill: '#22c55e' },
        { name: 'Orman', value: landMap['Orman arazisi'] || 0, fill: '#14b8a6' },
        { name: 'Ekilebilir Arazi', value: landMap['Ekilebilir arazi'] || 0, fill: '#3b82f6' },
        { name: 'Çayır-Mera', value: landMap['Daimi çayır ve meralar'] || 0, fill: '#f59e0b' },
      ].filter(item => item.value > 0);

      // Hayvansal üretim
      const livestockProduction = Number(livestockTotalRes.data?.[0]?.total) || 0;

      // Ürün bazında
      const topLivestockProducts: LivestockItem[] = (livestockProductsRes.data || []).map((item, idx) => ({
        name: translateLivestockItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS[idx % COLORS.length]
      }));

      // Yıllık trend
      const livestockYearlyTrend: YearlyData[] = (livestockTrendRes.data || []).map(item => ({
        year: String(item.year),
        value: Number(item.total) || 0
      }));

      setData({
        population,
        ruralPopulation,
        urbanPopulation,
        gdp,
        gdpPerCapita,
        agriculturalLand,
        totalLand,
        livestockProduction,
        topLivestockProducts,
        livestockYearlyTrend,
        landUseData
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hayvansal ürün isimlerini Türkçeleştir
  function translateLivestockItem(item: string): string {
    const translations: Record<string, string> = {
      'Hen eggs in shell, fresh': 'Yumurta',
      'Raw milk of cattle': 'İnek Sütü',
      'Meat of chickens, fresh or chilled': 'Tavuk Eti',
      'Meat of cattle with the bone, fresh or chilled': 'Sığır Eti',
      'Raw milk of sheep': 'Koyun Sütü',
      'Meat of sheep, fresh or chilled': 'Koyun Eti',
      'Raw milk of goats': 'Keçi Sütü',
      'Raw hides and skins of cattle': 'Sığır Derisi',
      'Edible offal of cattle, fresh, chilled or frozen': 'Sığır Sakatat',
      'Meat of goat, fresh or chilled': 'Keçi Eti'
    };
    return translations[item] || item.split(',')[0];
  }

  const ruralPercent = data ? ((data.ruralPopulation / data.population) * 100).toFixed(1) : '0';
  const urbanPercent = data ? ((data.urbanPopulation / data.population) * 100).toFixed(1) : '0';
  const agriLandPercent = data && data.totalLand > 0 ? ((data.agriculturalLand / data.totalLand) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🇹🇷 Türkiye Tarım Paneli</h1>
        <p className="page-subtitle">Türkiye Tarım, Hayvancılık ve Ekonomik Göstergeler - 2023</p>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {/* Ana KPI'lar */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">NÜFUS</span><div className="kpi-icon blue">👥</div></div>
              <div className="kpi-value">{formatNumber(data?.population || 0)}</div>
              <div className="kpi-subtitle">2023 Yılı</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">GSYİH</span><div className="kpi-icon green">💰</div></div>
              <div className="kpi-value">${formatNumber(data?.gdp || 0)}</div>
              <div className="kpi-subtitle">USD (2023)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">KİŞİ BAŞI GSYİH</span><div className="kpi-icon blue">📊</div></div>
              <div className="kpi-value">${formatNumber(data?.gdpPerCapita || 0)}</div>
              <div className="kpi-subtitle">USD/kişi</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">TARIM ARAZİSİ</span><div className="kpi-icon green">🌾</div></div>
              <div className="kpi-value">{formatNumber(data?.agriculturalLand || 0)} ha</div>
              <div className="kpi-subtitle">Toplam alanın %{agriLandPercent}'i</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">HAYVANSAL ÜRETİM</span><div className="kpi-icon orange">🐄</div></div>
              <div className="kpi-value">{formatNumber(data?.livestockProduction || 0)} ton</div>
              <div className="kpi-subtitle">2023 Yılı Toplam</div>
            </div>
          </div>

          {/* Nüfus Dağılımı */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">👥 Nüfus Dağılımı (2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: `Kentsel (%${urbanPercent})`, value: data?.urbanPopulation || 0, fill: '#3b82f6' },
                      { name: `Kırsal (%${ruralPercent})`, value: data?.ruralPopulation || 0, fill: '#22c55e' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name }) => name}
                  />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' kişi', '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🌍 Arazi Kullanımı (2022)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.landUseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ha', '']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data?.landUseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hayvansal Üretim */}
          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📈 Hayvansal Üretim Trendi (2010-2023)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.livestockYearlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', 'Üretim']} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🥩 Hayvansal Ürün Dağılımı (2023)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data?.topLivestockProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data?.topLivestockProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Üretim Payları</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data?.topLivestockProducts.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    dataKey="value"
                    label={({ name, percent }) => `${name?.substring(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data?.topLivestockProducts.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatNumber(value) + ' ton', '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Veri Tablosu */}
          <div className="data-table">
            <h3 className="data-table-title">📋 Hayvansal Ürün Sıralaması (2023)</h3>
            {data?.topLivestockProducts.map((product, index) => (
              <div className="table-row" key={product.name}>
                <div className={`table-rank ${index < 3 ? 'green' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{product.name}</div>
                  <div className="table-subtext">
                    Pay: %{((product.value / (data?.livestockProduction || 1)) * 100).toFixed(1)}
                  </div>
                </div>
                <div className="table-value green">{formatNumber(product.value)} ton</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
