import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { fetchQuery } from '../services/api';
import { translateCountry } from '../utils/countryTranslations';
import { KPICard } from '../components/KPICard';
import { Loading } from '../components/Loading';
import { TrendingUp, Globe, Target, Award, AlertCircle, CheckCircle } from 'lucide-react';

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
  worldRankMeat: number;
  worldRankMilk: number;
}

interface TrendData {
  year: string;
  [country: string]: string | number;
}

const POPULAR_COUNTRIES = [
  'Turkey', 'Sudan', 'Kenya', 'Ethiopia', 'Egypt', 'United States of America', 
  'China, mainland', 'India', 'Brazil', 'Argentina', 'Australia', 'Russian Federation',
  'Pakistan', 'Nigeria', 'South Africa', 'Tanzania', 'Uganda'
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

// Yatırım skoru hesaplama
function calculateInvestmentScore(stats: CountryStats): number {
  let score = 0;
  
  // Büyüme hızı (25 puan)
  const growthScore = Math.min(25, Math.max(0, stats.growthRate * 2.5));
  score += growthScore;
  
  // Hayvan stoku artış potansiyeli (20 puan)
  const stockScore = Math.min(20, (stats.totalStock / 100000000) * 10);
  score += stockScore;
  
  // Tarımsal GSYH payı (15 puan)
  const agriGdpPercent = stats.gdp > 0 ? (stats.agriculturalGdp / stats.gdp) * 100 : 0;
  const agriScore = Math.min(15, agriGdpPercent * 0.5);
  score += agriScore;
  
  // Nüfus ve pazar potansiyeli (15 puan)
  const popScore = Math.min(15, (stats.population / 100000000) * 5);
  score += popScore;
  
  // Üretim kapasitesi (15 puan)
  const prodScore = Math.min(15, (stats.totalProduction / 10000000) * 5);
  score += prodScore;
  
  // Kırsal nüfus (işgücü) (10 puan)
  const ruralPercent = stats.population > 0 ? (stats.ruralPopulation / stats.population) * 100 : 0;
  const ruralScore = Math.min(10, ruralPercent * 0.2);
  score += ruralScore;
  
  return Math.round(score);
}

export default function CountryInvestmentAnalysisPage() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['Turkey', 'Sudan']);
  const [countrySearch, setCountrySearch] = useState('');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<TrendData[]>([]);
  const [selectedYear] = useState('2022');

  // Ülke listesini yükle
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const result = await fetchQuery(
          `SELECT DISTINCT area FROM fao_uretim_canlihayvan WHERE area != '' ORDER BY area`
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
      // Hayvan stokları (baş)
      const stockQuery = `
        SELECT 
          SUM(CASE WHEN item_tr='Sığır' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as cattle,
          SUM(CASE WHEN item_tr='Koyun' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as sheep,
          SUM(CASE WHEN item_tr='Keçi' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as goat,
          SUM(CASE WHEN item_tr='Tavuk' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as chicken
        FROM fao_uretim_canlihayvan 
        WHERE area='${country}' AND year='${year}' AND element_tr='Stoklar'
      `;

      // Hayvansal üretim (ton)
      const livestockQuery = `
        SELECT 
          SUM(CASE WHEN item LIKE '%Meat%' OR item LIKE '%meat%' THEN CAST(REPLACE(value,',','.') AS DECIMAL(20,2)) ELSE 0 END) as meat,
          SUM(CASE WHEN item LIKE '%milk%' THEN CAST(REPLACE(value,',','.') AS DECIMAL(20,2)) ELSE 0 END) as milk,
          SUM(CASE WHEN item LIKE '%egg%' AND item NOT LIKE '%Eggplant%' THEN CAST(REPLACE(value,',','.') AS DECIMAL(20,2)) ELSE 0 END) as eggs
        FROM fao_livestock_primary 
        WHERE area='${country}' AND year='${year}' AND element='Production'
      `;

      // Bitkisel üretim (ton)
      const cropQuery = `
        SELECT SUM(CAST(deger AS DECIMAL(20,2))) as total
        FROM fao_uretim_son
        WHERE ulke='${country}' AND yil='${year}'
      `;

      // Nüfus ve ekonomik veriler
      const populationQuery = `
        SELECT SUM(CAST(value AS DECIMAL(20,2))) as total
        FROM fao_nufus
        WHERE area='${country}' AND year='${year}' AND element='Total Population - Both sexes'
      `;

      const ruralPopQuery = `
        SELECT SUM(CAST(value AS DECIMAL(20,2))) as total
        FROM fao_nufus
        WHERE area='${country}' AND year='${year}' AND element='Rural population'
      `;

      const gdpQuery = `
        SELECT SUM(CAST(value AS DECIMAL(20,2))) as total
        FROM fao_makro_1
        WHERE area='${country}' AND year='${year}' AND item='Gross Domestic Product'
      `;

      const agriGdpQuery = `
        SELECT SUM(CAST(value AS DECIMAL(20,2))) as total
        FROM fao_makro_1
        WHERE area='${country}' AND year='${year}' AND item LIKE '%Agriculture%GDP%'
      `;

      // Arazi
      const landQuery = `
        SELECT SUM(CAST(value AS DECIMAL(20,2))) as total
        FROM fao_land_use
        WHERE area='${country}' AND year='${year}' AND item='Country area'
      `;

      // Büyüme hızı (son 5 yıl)
      const growthQuery = `
        SELECT year, SUM(CAST(REPLACE(value,',','.') AS DECIMAL(20,2))) as total
        FROM fao_livestock_primary 
        WHERE area='${country}' AND element='Production' AND year >= '${parseInt(year) - 5}'
        GROUP BY year ORDER BY year
      `;

      const [stockRes, livestockRes, cropRes, popRes, ruralRes, gdpRes, agriGdpRes, landRes, growthRes] = await Promise.all([
        fetchQuery(stockQuery),
        fetchQuery(livestockQuery),
        fetchQuery(cropQuery),
        fetchQuery(populationQuery),
        fetchQuery(ruralPopQuery),
        fetchQuery(gdpQuery),
        fetchQuery(agriGdpQuery),
        fetchQuery(landQuery),
        fetchQuery(growthQuery)
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
      const cropProd = parseFloat(String(cropRes.data?.[0]?.total || 0));
      const population = parseFloat(String(popRes.data?.[0]?.total || 0));
      const ruralPop = parseFloat(String(ruralRes.data?.[0]?.total || 0));
      const gdp = parseFloat(String(gdpRes.data?.[0]?.total || 0));
      const agriGdp = parseFloat(String(agriGdpRes.data?.[0]?.total || 0));
      const land = parseFloat(String(landRes.data?.[0]?.total || 0));

      // Büyüme oranı hesaplama
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
        country,
        cattleStock,
        sheepStock,
        goatStock,
        chickenStock,
        totalStock: cattleStock + sheepStock + goatStock + chickenStock,
        meatProduction: meatProd,
        milkProduction: milkProd,
        eggProduction: eggProd,
        totalProduction: meatProd + milkProd + eggProd,
        cropProduction: cropProd,
        population,
        gdp,
        agriculturalGdp: agriGdp,
        landArea: land,
        ruralPopulation: ruralPop,
        investmentScore: 0,
        growthRate,
        worldRankMeat: 0,
        worldRankMilk: 0
      };

      stats.investmentScore = calculateInvestmentScore(stats);

      return stats;
    } catch (error) {
      console.error(`Error loading data for ${country}:`, error);
      return null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (selectedCountries.length === 0) {
      setCountryStats([]);
      return;
    }

    setLoading(true);
    try {
      const statsPromises = selectedCountries.map(country => loadCountryData(country, selectedYear));
      const results = await Promise.all(statsPromises);
      const validStats = results.filter((s): s is CountryStats => s !== null);
      setCountryStats(validStats);

      // Yıllık trend verileri
      const trendQuery = `
        SELECT year, area, SUM(CAST(REPLACE(value,',','.') AS DECIMAL(20,2))) as total
        FROM fao_livestock_primary 
        WHERE area IN (${selectedCountries.map(c => `'${c}'`).join(',')}) 
          AND element='Production' 
          AND year >= '2010'
        GROUP BY year, area 
        ORDER BY year
      `;
      
      const trendRes = await fetchQuery(trendQuery);
      if (trendRes.data) {
        const trendMap: { [year: string]: TrendData } = {};
        trendRes.data.forEach((row: any) => {
          const year = String(row.year);
          if (!trendMap[year]) {
            trendMap[year] = { year };
          }
          trendMap[year][String(row.area)] = parseFloat(String(row.total || 0));
        });
        setYearlyTrend(Object.values(trendMap));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCountries, selectedYear, loadCountryData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country].slice(0, 5) // Max 5 ülke
    );
  };

  const filteredCountries = availableCountries.filter(country =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Görüntüleme için ülkeleri filtrele
  const displayCountries = countrySearch ? filteredCountries : POPULAR_COUNTRIES.filter(c => availableCountries.includes(c));

  // Karşılaştırma verileri
  const comparisonData = countryStats.map(stat => ({
    name: translateCountry(stat.country),
    'Hayvan Stoku (M baş)': stat.totalStock / 1000000,
    'Et (K ton)': stat.meatProduction / 1000,
    'Süt (K ton)': stat.milkProduction / 1000,
    'Yumurta (K ton)': stat.eggProduction / 1000,
  }));

  // Radar chart verisi
  const radarData = ['Büyüme', 'Stok', 'Üretim', 'Nüfus', 'Arazi'].map((metric) => {
    const data: any = { metric };
    countryStats.forEach(stat => {
      const country = translateCountry(stat.country);
      if (metric === 'Büyüme') data[country] = Math.abs(stat.growthRate);
      if (metric === 'Stok') data[country] = stat.totalStock / 10000000;
      if (metric === 'Üretim') data[country] = stat.totalProduction / 1000000;
      if (metric === 'Nüfus') data[country] = stat.population / 10000000;
      if (metric === 'Arazi') data[country] = stat.landArea / 100000;
    });
    return data;
  });

  if (loading) {
    return <Loading />;
  }

  // Ortalama skor
  const avgScore = countryStats.length > 0 
    ? countryStats.reduce((sum, s) => sum + s.investmentScore, 0) / countryStats.length 
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌍 Ülke Yatırım Analizi</h1>
        <p className="page-subtitle">Tarım ve Hayvancılık Sektörü - Yatırımcı Perspektifi</p>
      </div>

      {/* Ülke Seçimi */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>📍 Ülke Seçimi (Max 5)</h3>
        <input
          type="text"
          placeholder="Ülke ara..."
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
          {displayCountries.map(country => (
            <button
              key={country}
              onClick={() => toggleCountry(country)}
              style={{
                padding: '0.5rem 1rem',
                border: selectedCountries.includes(country) ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                background: selectedCountries.includes(country) ? '#3b82f6' : 'white',
                color: selectedCountries.includes(country) ? 'white' : '#1f2937',
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
        {selectedCountries.length > 0 && (
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Seçili: {selectedCountries.map(translateCountry).join(', ')}
          </div>
        )}
      </div>

      {selectedCountries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Globe size={48} style={{ margin: '0 auto 1rem' }} />
          <p>Analiz için en az 1 ülke seçin</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <KPICard
              title="Ortalama Yatırım Skoru"
              value={`${avgScore.toFixed(0)}/100`}
              subtitle={avgScore >= 70 ? 'Yüksek Potansiyel' : avgScore >= 50 ? 'Orta Potansiyel' : 'Düşük Potansiyel'}
              icon={Award}
              color="blue"
              large
            />
            <KPICard
              title="En Yüksek Skor"
              value={countryStats.length > 0 ? translateCountry(countryStats.reduce((max, s) => s.investmentScore > max.investmentScore ? s : max).country) : '-'}
              subtitle={`${countryStats.length > 0 ? Math.max(...countryStats.map(s => s.investmentScore)) : 0} puan`}
              icon={Target}
              color="green"
            />
            <KPICard
              title="Toplam Hayvan Stoku"
              value={formatShort(countryStats.reduce((sum, s) => sum + s.totalStock, 0))}
              subtitle="Baş (tüm hayvanlar)"
              icon={TrendingUp}
              color="orange"
            />
            <KPICard
              title="Toplam Üretim"
              value={formatShort(countryStats.reduce((sum, s) => sum + s.totalProduction, 0))}
              subtitle="Ton (et+süt+yumurta)"
              icon={Globe}
              color="purple"
            />
          </div>

          {/* Detaylı Karşılaştırma Tablosu */}
          <div className="chart-container">
            <h3 className="chart-title">📊 Ülke Karşılaştırma Tablosu</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Ülke</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Yatırım Skoru</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Hayvan Stoku</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Et Üretimi</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Süt Üretimi</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Yumurta</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Büyüme</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Nüfus</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.sort((a, b) => b.investmentScore - a.investmentScore).map((stat, idx) => (
                    <tr key={stat.country} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{translateCountry(stat.country)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '12px', 
                          background: stat.investmentScore >= 70 ? '#dcfce7' : stat.investmentScore >= 50 ? '#fef3c7' : '#fee2e2',
                          color: stat.investmentScore >= 70 ? '#15803d' : stat.investmentScore >= 50 ? '#92400e' : '#991b1b',
                          fontWeight: 600
                        }}>
                          {stat.investmentScore}/100
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{formatNumber(stat.totalStock)} baş</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{formatTon(stat.meatProduction)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{formatTon(stat.milkProduction)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{formatTon(stat.eggProduction)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: stat.growthRate > 0 ? '#22c55e' : '#ef4444' }}>
                        {stat.growthRate > 0 ? '+' : ''}{stat.growthRate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{formatNumber(stat.population)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Üretim Karşılaştırması */}
          <div className="chart-container">
            <h3 className="chart-title">📈 Üretim Kapasitesi Karşılaştırması</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Hayvan Stoku (M baş)" fill={COLORS[0]} />
                <Bar dataKey="Et (K ton)" fill={COLORS[1]} />
                <Bar dataKey="Süt (K ton)" fill={COLORS[2]} />
                <Bar dataKey="Yumurta (K ton)" fill={COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 10 Yıllık Trend */}
          {yearlyTrend.length > 0 && (
            <div className="chart-container">
              <h3 className="chart-title">📊 10 Yıllık Üretim Trendi</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={yearlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatTon(Number(value))} />
                  <Legend />
                  {selectedCountries.map((country, idx) => (
                    <Line 
                      key={country}
                      type="monotone" 
                      dataKey={country} 
                      stroke={COLORS[idx % COLORS.length]} 
                      strokeWidth={2}
                      name={translateCountry(country)}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Radar Chart - Çok Boyutlu Karşılaştırma */}
          {countryStats.length > 1 && (
            <div className="chart-container">
              <h3 className="chart-title">🎯 Çok Boyutlu Yatırım Analizi</h3>
              <ResponsiveContainer width="100%" height={450}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  <Tooltip />
                  <Legend />
                  {countryStats.map((stat, idx) => (
                    <Radar
                      key={stat.country}
                      name={translateCountry(stat.country)}
                      dataKey={translateCountry(stat.country)}
                      stroke={COLORS[idx % COLORS.length]}
                      fill={COLORS[idx % COLORS.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', marginTop: '1rem' }}>
                * Değerler normalize edilmiştir. Büyük değer = Yüksek potansiyel
              </p>
            </div>
          )}

          {/* Yatırımcı Önerileri */}
          {countryStats.map(stat => (
            <div key={stat.country} className="chart-container" style={{ background: '#f9fafb' }}>
              <h3 className="chart-title">💡 {translateCountry(stat.country)} - Yatırımcı Değerlendirmesi</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Güçlü Yönler */}
                <div>
                  <h4 style={{ color: '#22c55e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} /> Güçlü Yönler
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, color: '#1f2937' }}>
                    {stat.totalStock > 50000000 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Büyük hayvan stoku: {formatNumber(stat.totalStock)} baş
                      </li>
                    )}
                    {stat.growthRate > 5 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Yüksek büyüme hızı: +{stat.growthRate.toFixed(1)}% yıllık
                      </li>
                    )}
                    {(stat.agriculturalGdp / stat.gdp * 100) > 20 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Güçlü tarım sektörü: GSYH'nin %{((stat.agriculturalGdp / stat.gdp) * 100).toFixed(1)}'i
                      </li>
                    )}
                    {stat.population > 50000000 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Büyük iç pazar: {formatNumber(stat.population)} nüfus
                      </li>
                    )}
                  </ul>
                </div>

                {/* Dikkat Edilmesi Gerekenler */}
                <div>
                  <h4 style={{ color: '#f59e0b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={20} /> Dikkat Edilmesi Gerekenler
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, color: '#1f2937' }}>
                    {stat.meatProduction / stat.totalStock < 0.05 && stat.totalStock > 0 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Düşük et verimi (stok/üretim oranı)
                      </li>
                    )}
                    {stat.milkProduction / stat.totalStock < 0.5 && stat.totalStock > 0 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Düşük süt verimi potansiyeli
                      </li>
                    )}
                    {stat.growthRate < 0 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Negatif büyüme trendi: {stat.growthRate.toFixed(1)}%
                      </li>
                    )}
                    {stat.gdp > 0 && stat.gdp < 100000000000 && (
                      <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        • Sınırlı ekonomik kapasite
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Yatırım Tavsiyeleri */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '2px solid #3b82f6' }}>
                <h4 style={{ color: '#3b82f6', marginBottom: '1rem', fontSize: '1.1rem' }}>🎯 Tavsiye Edilen Yatırım Alanları</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {stat.totalStock > 10000000 && stat.milkProduction / stat.totalStock < 1 && (
                    <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <strong>1. Süt İşleme Tesisi</strong>
                      <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                        Büyük hayvan stoku mevcut ancak süt verimi düşük. Modern süt işleme ve soğuk zincir yatırımı yüksek getiri sağlayabilir.
                      </p>
                    </div>
                  )}
                  {stat.chickenStock < stat.population / 10 && stat.population > 10000000 && (
                    <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '8px', borderLeft: '4px solid #eab308' }}>
                      <strong>2. Tavukçuluk Entegresi</strong>
                      <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                        Kişi başı tavuk sayısı düşük, nüfusa göre önemli talep potansiyeli var. Beyaz et üretimi karlı olabilir.
                      </p>
                    </div>
                  )}
                  {stat.meatProduction > 100000 && stat.population > 20000000 && (
                    <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                      <strong>3. Et Paketleme & İhracat</strong>
                      <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                        Önemli üretim kapasitesi mevcut. Modern kesimhane ve paketleme tesisi ile ihracat yapılabilir.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
