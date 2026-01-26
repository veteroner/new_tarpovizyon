import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, Area
} from 'recharts';
import { fetchQuery } from '../services/api';
import { translateCountry } from '../utils/countryTranslations';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { TrendingUp, Globe, Target, Award, AlertCircle, CheckCircle, Users, Leaf, DollarSign, Beef } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface CountryStats {
  country: string;
  cattleStock: number;
  sheepStock: number;
  goatStock: number;
  chickenStock: number;
  totalStock: number;
  meatProduction: number;
  milkProduction: number;
  eggProduction: number;
  totalProduction: number;
  cropProduction: number;
  population: number;
  gdp: number;
  agriculturalGdp: number;
  landArea: number;
  ruralPopulation: number;
  investmentScore: number;
  growthRate: number;
}

const POPULAR_COUNTRIES = [
  'Turkey', 'Sudan', 'Kenya', 'Ethiopia', 'Egypt', 'United States of America', 
  'China, mainland', 'India', 'Brazil', 'Argentina', 'Australia', 'Russian Federation',
  'Pakistan', 'Nigeria', 'South Africa', 'Tanzania', 'Uganda', 'Germany', 'France', 'Spain'
];

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
  return value.toFixed(0);
}

function formatTon(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar ton';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon ton';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin ton';
  return value.toFixed(0) + ' ton';
}

function formatShort(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

function calculateInvestmentScore(stats: CountryStats): number {
  let score = 0;
  const growthScore = Math.min(25, Math.max(0, stats.growthRate * 2.5));
  score += growthScore;
  const stockScore = Math.min(20, (stats.totalStock / 100000000) * 10);
  score += stockScore;
  const agriGdpPercent = stats.gdp > 0 ? (stats.agriculturalGdp / stats.gdp) * 100 : 0;
  const agriScore = Math.min(15, agriGdpPercent * 0.5);
  score += agriScore;
  const popScore = Math.min(15, (stats.population / 100000000) * 5);
  score += popScore;
  const prodScore = Math.min(15, (stats.totalProduction / 10000000) * 5);
  score += prodScore;
  const ruralPercent = stats.population > 0 ? (stats.ruralPopulation / stats.population) * 100 : 0;
  const ruralScore = Math.min(10, ruralPercent * 0.2);
  score += ruralScore;
  return Math.round(score);
}

export default function CountryInvestmentAnalysisPage() {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [countrySearch, setCountrySearch] = useState('');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [countryStats, setCountryStats] = useState<CountryStats | null>(null);
  const [yearlyTrend, setYearlyTrend] = useState<any[]>([]);
  const [animalStockTrend, setAnimalStockTrend] = useState<any[]>([]);
  const [productionByType, setProductionByType] = useState<any[]>([]);
  const [worldRanking, setWorldRanking] = useState<any[]>([]);
  const selectedYear = '2022';

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const result = await fetchQuery(
          'SELECT DISTINCT area FROM fao_uretim_canlihayvan WHERE area != \'\' ORDER BY area'
        );
        if (result.data) {
          const countries = result.data.map(r => String(r.area));
          setAvailableCountries(countries);
        }
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    loadCountries();
  }, []);

  const loadCountryData = useCallback(async (country: string, year: string): Promise<CountryStats | null> => {
    try {
      const [stockRes, livestockRes, popRes, ruralRes, gdpRes, agriGdpRes, landRes, growthRes] = await Promise.all([
        fetchQuery(`SELECT SUM(CASE WHEN item_tr='Sığır' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as cattle, SUM(CASE WHEN item_tr='Koyun' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as sheep, SUM(CASE WHEN item_tr='Keçi' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as goat, SUM(CASE WHEN item_tr='Tavuk' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as chicken FROM fao_uretim_canlihayvan WHERE area='${country}' AND year='${year}' AND element_tr='Stoklar'`),
        fetchQuery(`SELECT SUM(CASE WHEN item LIKE '%Meat%' OR item LIKE '%meat%' THEN CAST(REPLACE(value,',','.') AS DECIMAL(20,2)) ELSE 0 END) as meat, SUM(CASE WHEN item LIKE '%milk%' THEN CAST(REPLACE(value,',','.') AS DECIMAL(20,2)) ELSE 0 END) as milk, SUM(CASE WHEN item LIKE '%egg%' AND item NOT LIKE '%Eggplant%' THEN CAST(REPLACE(value,',','.') AS DECIMAL(20,2)) ELSE 0 END) as eggs FROM fao_livestock_primary WHERE area='${country}' AND year='${year}' AND element='Production'`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_nufus WHERE area='${country}' AND year='${year}' AND element='Total Population - Both sexes'`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_nufus WHERE area='${country}' AND year='${year}' AND element='Rural population'`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_makro_1 WHERE area='${country}' AND year='${year}' AND item='Gross Domestic Product'`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_makro_1 WHERE area='${country}' AND year='${year}' AND item LIKE '%Agriculture%GDP%'`),
        fetchQuery(`SELECT SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE area='${country}' AND year='${year}' AND item='Country area'`),
        fetchQuery(`SELECT year, SUM(CAST(REPLACE(value,',','.') AS DECIMAL(20,2))) as total FROM fao_livestock_primary WHERE area='${country}' AND element='Production' AND year >= '${parseInt(year) - 5}' GROUP BY year ORDER BY year`)
      ]);

      const stockData = stockRes.data?.[0];
      const livestockData = livestockRes.data?.[0];
      const cattleStock = parseFloat(String(stockData?.cattle || 0));
      const sheepStock = parseFloat(String(stockData?.sheep || 0));
      const goatStock = parseFloat(String(stockData?.goat || 0));
      const chickenStock = parseFloat(String(stockData?.chicken || 0));
      const meatProd = parseFloat(String(livestockData?.meat || 0));
      const milkProd = parseFloat(String(livestockData?.milk || 0));
      const eggProd = parseFloat(String(livestockData?.eggs || 0));
      const population = parseFloat(String(popRes.data?.[0]?.total || 0));
      const ruralPop = parseFloat(String(ruralRes.data?.[0]?.total || 0));
      const gdp = parseFloat(String(gdpRes.data?.[0]?.total || 0));
      const agriGdp = parseFloat(String(agriGdpRes.data?.[0]?.total || 0));
      const land = parseFloat(String(landRes.data?.[0]?.total || 0));

      let growthRate = 0;
      if (growthRes.data && growthRes.data.length >= 2) {
        const firstYear = parseFloat(String(growthRes.data[0]?.total || 0));
        const lastYear = parseFloat(String(growthRes.data[growthRes.data.length - 1]?.total || 0));
        const years = growthRes.data.length - 1;
        if (firstYear > 0 && years > 0) {
          growthRate = ((lastYear - firstYear) / firstYear / years) * 100;
        }
      }

      const stats: CountryStats = {
        country, cattleStock, sheepStock, goatStock, chickenStock,
        totalStock: cattleStock + sheepStock + goatStock + chickenStock,
        meatProduction: meatProd, milkProduction: milkProd, eggProduction: eggProd,
        totalProduction: meatProd + milkProd + eggProd, cropProduction: 0,
        population, gdp, agriculturalGdp: agriGdp, landArea: land, ruralPopulation: ruralPop,
        investmentScore: 0, growthRate
      };
      stats.investmentScore = calculateInvestmentScore(stats);
      return stats;
    } catch (error) {
      console.error(`Error loading data for ${country}:`, error);
      return null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedCountry) {
      setCountryStats(null);
      setYearlyTrend([]);
      setAnimalStockTrend([]);
      setProductionByType([]);
      setWorldRanking([]);
      return;
    }

    setLoading(true);
    try {
      const stats = await loadCountryData(selectedCountry, selectedYear);
      setCountryStats(stats);

      const [trendRes, stockTrendRes, productionByTypeRes, worldRankRes] = await Promise.all([
        fetchQuery(`SELECT year, SUM(CAST(REPLACE(value,',','.') AS DECIMAL(20,2))) as total FROM fao_livestock_primary WHERE area='${selectedCountry}' AND element='Production' AND year >= '2010' GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT year, item_tr, CAST(value AS DECIMAL(20,2)) as stock FROM fao_uretim_canlihayvan WHERE area='${selectedCountry}' AND element_tr='Stoklar' AND item_tr IN ('Sığır', 'Koyun', 'Keçi', 'Tavuk') AND year >= '2013' ORDER BY year, item_tr`),
        fetchQuery(`SELECT item, SUM(CAST(REPLACE(value,',','.') AS DECIMAL(20,2))) as total FROM fao_livestock_primary WHERE area='${selectedCountry}' AND year='${selectedYear}' AND element='Production' GROUP BY item ORDER BY total DESC LIMIT 8`),
        fetchQuery(`SELECT area, SUM(CAST(REPLACE(value,',','.') AS DECIMAL(20,2))) as total FROM fao_livestock_primary WHERE year='${selectedYear}' AND element='Production' GROUP BY area ORDER BY total DESC LIMIT 15`)
      ]);

      if (trendRes.data) {
        setYearlyTrend(trendRes.data.map((row: any) => ({
          year: String(row.year),
          value: parseFloat(String(row.total || 0))
        })));
      }

      if (stockTrendRes.data) {
        const stockMap: any = {};
        stockTrendRes.data.forEach((row: any) => {
          const year = String(row.year);
          if (!stockMap[year]) stockMap[year] = { year };
          stockMap[year][String(row.item_tr)] = parseFloat(String(row.stock || 0));
        });
        setAnimalStockTrend(Object.values(stockMap));
      }

      if (productionByTypeRes.data) {
        setProductionByType(productionByTypeRes.data.map((row: any, idx: number) => ({
          name: String(row.item).split(',')[0],
          value: parseFloat(String(row.total || 0)),
          fill: COLORS[idx % COLORS.length]
        })));
      }

      if (worldRankRes.data) {
        setWorldRanking(worldRankRes.data.map((row: any, idx: number) => ({
          rank: idx + 1,
          country: translateCountry(String(row.area)),
          value: parseFloat(String(row.total || 0)),
          isSelected: String(row.area) === selectedCountry
        })));
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, selectedYear, loadCountryData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectCountry = (country: string) => {
    setSelectedCountry(country);
    setCountrySearch('');
  };

  const filteredCountries = availableCountries.filter(country =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const displayCountries = countrySearch ? filteredCountries.slice(0, 20) : POPULAR_COUNTRIES.filter(c => availableCountries.includes(c));

  const animalDistribution = countryStats ? [
    { name: 'Sığır', value: countryStats.cattleStock, fill: COLORS[0] },
    { name: 'Koyun', value: countryStats.sheepStock, fill: COLORS[1] },
    { name: 'Keçi', value: countryStats.goatStock, fill: COLORS[2] },
    { name: 'Tavuk', value: countryStats.chickenStock, fill: COLORS[3] }
  ].filter(d => d.value > 0) : [];

  const productionDistribution = countryStats ? [
    { name: 'Et', value: countryStats.meatProduction, fill: COLORS[4] },
    { name: 'Süt', value: countryStats.milkProduction, fill: COLORS[5] },
    { name: 'Yumurta', value: countryStats.eggProduction, fill: COLORS[6] }
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌍 Ülke Yatırım Analizi</h1>
        <p className="page-subtitle">Detaylı Tarım ve Hayvancılık Sektörü Analizi - Tek Ülke Odaklı</p>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>📍 Ülke Seçin</h3>
        <input
          type="text"
          placeholder="Ülke ara... (örn: Sudan, Kenya, Turkey, India)"
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '1rem'
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {displayCountries.map(country => (
            <button
              key={country}
              onClick={() => selectCountry(country)}
              style={{
                padding: '0.5rem 1rem',
                border: selectedCountry === country ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                background: selectedCountry === country ? '#3b82f6' : 'white',
                color: selectedCountry === country ? 'white' : '#1f2937',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              {translateCountry(country)}
            </button>
          ))}
        </div>
        {selectedCountry && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #3b82f6' }}>
            <strong style={{ color: '#1e40af' }}>Seçili Ülke:</strong> {translateCountry(selectedCountry)}
          </div>
        )}
      </div>

      {!selectedCountry ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6b7280' }}>
          <Globe size={64} style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Ülke Seçiniz</h3>
          <p style={{ fontSize: '1.1rem' }}>Detaylı analiz için yukarıdan bir ülke seçin</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Popüler: Sudan, Kenya, Türkiye, Hindistan, Brezilya...</p>
        </div>
      ) : loading ? (
        <Loading />
      ) : !countryStats ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
          <p>Veri yüklenemedi</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <KPICard title="Yatırım Skoru" value={`${countryStats.investmentScore}/100`} subtitle={countryStats.investmentScore >= 70 ? '🟢 Yüksek Potansiyel' : countryStats.investmentScore >= 50 ? '🟡 Orta Potansiyel' : '🔴 Düşük Potansiyel'} icon={Award} color="blue" large />
            <KPICard title="Toplam Hayvan Stoku" value={formatShort(countryStats.totalStock)} subtitle="Baş (Sığır+Koyun+Keçi+Tavuk)" icon={Beef} color="green" />
            <KPICard title="Toplam Üretim" value={formatTon(countryStats.totalProduction)} subtitle="Et + Süt + Yumurta" icon={TrendingUp} color="orange" />
            <KPICard title="Yıllık Büyüme" value={`${countryStats.growthRate > 0 ? '+' : ''}${countryStats.growthRate.toFixed(1)}%`} subtitle="Son 5 yıl ortalaması" icon={Target} color={countryStats.growthRate > 0 ? 'green' : 'red'} />
          </div>

          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <KPICard title="Nüfus" value={formatNumber(countryStats.population)} subtitle={countryStats.population > 0 ? `Kırsal: %${((countryStats.ruralPopulation / countryStats.population) * 100).toFixed(0)}` : '-'} icon={Users} color="purple" />
            <KPICard title="Tarımsal GSYH" value={countryStats.agriculturalGdp > 0 ? formatShort(countryStats.agriculturalGdp) : 'N/A'} subtitle={countryStats.gdp > 0 ? `GSYH'nin %${((countryStats.agriculturalGdp / countryStats.gdp) * 100).toFixed(1)}'i` : '-'} icon={DollarSign} color="blue" />
            <KPICard title="Arazi" value={countryStats.landArea > 0 ? formatNumber(countryStats.landArea) : 'N/A'} subtitle="Hektar" icon={Leaf} color="green" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {animalDistribution.length > 0 && (
              <div className="chart-container">
                <h3 className="chart-title">🐄 Hayvan Stoku Dağılımı</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={animalDistribution} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${formatShort(entry.value)}`} outerRadius={100} dataKey="value">
                      {animalDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumber(value) + ' baş'} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {productionDistribution.length > 0 && (
              <div className="chart-container">
                <h3 className="chart-title">📊 Üretim Dağılımı</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={productionDistribution} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${formatShort(entry.value)}`} outerRadius={100} dataKey="value">
                      {productionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatTon(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {yearlyTrend.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">📈 Yıllık Üretim Trendi (2010-2023)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={yearlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatTon(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" name="Üretim" />
                  <Line type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} name="Trend" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {animalStockTrend.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">🐮 Hayvan Stoku Gelişimi (2013-2023)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={animalStockTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatNumber(value) + ' baş'} />
                  <Legend />
                  <Line type="monotone" dataKey="Sığır" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Koyun" stroke={COLORS[1]} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Keçi" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Tavuk" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {productionByType.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">🥩 Ürün Türüne Göre Üretim</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={productionByType} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatTon(value)} />
                  <Bar dataKey="value" name="Üretim">
                    {productionByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {worldRanking.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">🌍 Dünya Sıralaması (Top 15)</h3>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={worldRanking} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="country" />
                  <Tooltip formatter={(value: number) => formatTon(value)} />
                  <Bar dataKey="value" name="Üretim">
                    {worldRanking.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isSelected ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="chart-container" style={{ background: '#f9fafb' }}>
            <h3 className="chart-title">💡 Yatırımcı Değerlendirmesi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ color: '#22c55e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={20} /> Güçlü Yönler
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, color: '#1f2937' }}>
                  {countryStats.totalStock > 10000000 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Önemli hayvan stoku: {formatNumber(countryStats.totalStock)} baş</li>}
                  {countryStats.growthRate > 2 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Pozitif büyüme trendi: +{countryStats.growthRate.toFixed(1)}% yıllık</li>}
                  {countryStats.gdp > 0 && (countryStats.agriculturalGdp / countryStats.gdp * 100) > 10 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Tarım sektörü GSYH'nin %{((countryStats.agriculturalGdp / countryStats.gdp) * 100).toFixed(1)}'i</li>}
                  {countryStats.population > 20000000 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Büyük iç pazar: {formatNumber(countryStats.population)} nüfus</li>}
                  {countryStats.totalProduction > 1000000 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Yüksek üretim kapasitesi: {formatTon(countryStats.totalProduction)}</li>}
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#f59e0b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={20} /> Dikkat Noktaları
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, color: '#1f2937' }}>
                  {countryStats.totalStock > 0 && countryStats.meatProduction / countryStats.totalStock < 0.05 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Düşük et verimi (stok/üretim oranı düşük)</li>}
                  {countryStats.growthRate < 0 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Negatif büyüme: {countryStats.growthRate.toFixed(1)}%</li>}
                  {countryStats.population > 0 && countryStats.totalStock / countryStats.population < 0.5 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Kişi başı düşük hayvan stoku</li>}
                  {countryStats.totalProduction < 100000 && <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>• Sınırlı üretim kapasitesi</li>}
                </ul>
              </div>
            </div>

            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '2px solid #3b82f6' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '1rem', fontSize: '1.1rem' }}>🎯 Tavsiye Edilen Yatırım Alanları</h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {countryStats.totalStock > 5000000 && countryStats.milkProduction / countryStats.totalStock < 1 && (
                  <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                    <strong>1. Süt İşleme Tesisi</strong>
                    <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Hayvan stoku mevcut ancak süt verimi düşük. Modern süt işleme yatırımı yüksek potansiyel taşıyor.</p>
                  </div>
                )}
                {countryStats.population > 10000000 && countryStats.chickenStock < countryStats.population / 5 && (
                  <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '8px', borderLeft: '4px solid #eab308' }}>
                    <strong>2. Tavukçuluk Entegresi</strong>
                    <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Kişi başı tavuk sayısı düşük. Beyaz et talebinde önemli potansiyel var.</p>
                  </div>
                )}
                {countryStats.meatProduction > 50000 && countryStats.population > 15000000 && (
                  <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                    <strong>3. Et Paketleme & İhracat</strong>
                    <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Üretim kapasitesi mevcut. Modern kesimhane ve soğuk zincir ile ihracat fırsatı.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
