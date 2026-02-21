import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend,
  Line, ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, ReferenceLine, Sankey
} from 'recharts';
import { fetchQuery } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TurkeyHeatMap } from '../components/TurkeyHeatMap';
import { getRegionByProvince } from '../utils/productionCategories';

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#0ea5e9', '#d946ef', '#a3e635'];

const REGION_COLORS: Record<string, string> = {
  'Marmara': '#3b82f6',
  'Ege': '#22c55e',
  'Akdeniz': '#f59e0b',
  'İç Anadolu': '#ef4444',
  'Karadeniz': '#8b5cf6',
  'Doğu Anadolu': '#ec4899',
  'Güneydoğu Anadolu': '#14b8a6'
};

const getRegion = (cityName: string): string => getRegionByProvince(cityName);

interface YearlyDataItem {
  year: string;
  value: number;
}

interface CityDataItem {
  name: string;
  value: number;
  share: string;
  fill: string;
}

interface CategoryDataItem {
  name: string;
  value: number;
}

interface RegionalData {
  region: string;
  total: number;
  cities: number;
  average: number;
  share: number;
}

interface CorrelationData {
  animal: string;
  production?: number;
  correlation?: number;
  link?: string;
}

const ANIMAL_GROUPS = [
  { id: 'Sığır', name: 'Sığır (Büyükbaş)', icon: '🐄' },
  { id: 'Manda', name: 'Manda', icon: '🐃' },
  { id: 'Koyun', name: 'Koyun', icon: '🐑' },
  { id: 'Keçi', name: 'Keçi', icon: '🐐' },
  { id: 'Tavuk', name: 'Tavuk', icon: '🐔' },
  { id: 'Hindi', name: 'Hindi', icon: '🦃' },
  { id: 'Ördek', name: 'Ördek', icon: '🦆' },
  { id: 'Kaz', name: 'Kaz', icon: '🪿' },
  { id: 'At', name: 'At', icon: '🐴' },
  { id: 'Eşek', name: 'Eşek', icon: '🫏' },
  { id: 'Katır', name: 'Katır', icon: '🐴' },
  { id: 'Deve', name: 'Deve', icon: '🐪' },
  { id: 'Domuz', name: 'Domuz', icon: '🐷' },
];

const TABLE_NAME = 'tuik_hayvancilik_canlihayvan';
const YEARS = Array.from({ length: 22 }, (_, i) => 2004 + i); // 2004-2025
const YEAR_COLUMNS = YEARS.map(y => `y${y}`);

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

// Analitik Fonksiyonlar
function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

function linearRegression(data: {x: number; y: number}[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const yMean = sumY / n;
  const ssRes = data.reduce((sum, d) => sum + Math.pow(d.y - (slope * d.x + intercept), 2), 0);
  const ssTot = data.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0);
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  
  return { slope, intercept, r2 };
}

function detectAnomalies(data: number[]): { index: number; value: number; deviation: number }[] {
  if (data.length < 3) return [];
  const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
  const stdDev = Math.sqrt(data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length);
  
  return data.map((value, index) => ({
    index,
    value,
    deviation: Math.abs(value - mean) / (stdDev || 1)
  })).filter(item => item.deviation > 2); // 2 sigma
}

export default function TuikLivestockPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState('y2025');
  const [selectedAnimal, setSelectedAnimal] = useState('Sığır');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedRegion, setSelectedRegion] = useState('Tümü');
  const [activeTab, setActiveTab] = useState<'overview' | 'regional' | 'trends' | 'correlations'>('overview');
  const [loading, setLoading] = useState(true);
  const [cityData, setCityData] = useState<CityDataItem[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDataItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [provinceCount, setProvinceCount] = useState(0);
  const [groupTotals, setGroupTotals] = useState<{grup: string; total: number}[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // İlk yükleme: Tüm hayvan gruplarının toplam değerlerini getir (özet barlar için)
  useEffect(() => {
    const loadGroupTotals = async () => {
      try {
        const latestYear = selectedYear;
        const res = await fetchQuery(`
          SELECT grup, SUM(CAST(COALESCE(${latestYear},0) AS DECIMAL(20,2))) as total
          FROM ${TABLE_NAME}
          WHERE duzeykod='3'
            AND yer IS NOT NULL AND yer != '' 
            AND yer NOT IN ('TOPLAM','Toplam','TÜRKİYE','Türkiye','TOTAL','Total')
            AND grup != ''
          GROUP BY grup 
          ORDER BY total DESC
        `);
        if (res.data) {
          setGroupTotals(res.data.map((r: Record<string, string | number>) => ({
            grup: String(r.grup),
            total: Number(r.total) || 0
          })));
        }
      } catch (e) {
        console.error('Grup toplamları yüklenirken hata:', e);
      }
    };
    loadGroupTotals();
  }, [selectedYear]);

  // Seçilen hayvan grubunun kategorilerini yükle
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchQuery(`
          SELECT DISTINCT kategori 
          FROM ${TABLE_NAME} 
          WHERE grup='${selectedAnimal}' AND kategori IS NOT NULL AND kategori != '' 
          ORDER BY kategori
        `);
        if (res.data) {
          const cats = res.data.map((r: Record<string, string | number>) => String(r.kategori)).filter((c: string) => c.length > 0);
          setCategories(cats);
          setSelectedCategory('Tümü');
        } else {
          setCategories([]);
          setSelectedCategory('Tümü');
        }
      } catch {
        setCategories([]);
        setSelectedCategory('Tümü');
      }
    };
    loadCategories();
  }, [selectedAnimal]);

  // Export Functions
  const exportToPDF = async () => {
    if (!pageRef.current) return;
    try {
      const canvas = await html2canvas(pageRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`livestock_${selectedAnimal}_${selectedYear}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('PDF oluşturma hatası');
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // City data sheet
      const cityWS = XLSX.utils.json_to_sheet(cityData.map(c => ({
        'İl': c.name,
        'Değer': c.value,
        'Pay (%)': c.share
      })));
      XLSX.utils.book_append_sheet(wb, cityWS, 'İller');
      
      // Yearly data sheet
      const yearWS = XLSX.utils.json_to_sheet(yearlyData);
      XLSX.utils.book_append_sheet(wb, yearWS, 'Yıllık');
      
      XLSX.writeFile(wb, `livestock_${selectedAnimal}_${selectedYear}.xlsx`);
    } catch (e) {
      console.error('Excel export error:', e);
      alert('Excel oluşturma hatası');
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const yearCol = selectedYear;
      const excludedIlList = "('TOPLAM','Toplam','TÜRKİYE','Türkiye','TOTAL','Total')";
      const categoryFilter = selectedCategory !== 'Tümü' ? ` AND kategori='${selectedCategory}'` : '';

      // İl bazında hayvan sayıları
      const cityQuery = `SELECT yer as il, SUM(CAST(COALESCE(${yearCol},0) AS DECIMAL(20,2))) as toplam 
        FROM ${TABLE_NAME} 
        WHERE grup='${selectedAnimal}' AND duzeykod='3'
          AND yer IS NOT NULL AND yer != ''
          AND yer NOT IN ${excludedIlList}
          ${categoryFilter}
        GROUP BY yer ORDER BY toplam DESC`;

      // Türkiye toplamı
      const totalQuery = `SELECT SUM(CAST(COALESCE(${yearCol},0) AS DECIMAL(20,2))) as toplam 
        FROM ${TABLE_NAME} 
        WHERE grup='${selectedAnimal}' AND duzeykod='3'
          AND yer IS NOT NULL AND yer != ''
          AND yer NOT IN ${excludedIlList}
          ${categoryFilter}`;

      const countQuery = `SELECT COUNT(DISTINCT yer) as cnt
        FROM ${TABLE_NAME}
        WHERE grup='${selectedAnimal}' AND duzeykod='3'
          AND yer IS NOT NULL AND yer != ''
          AND yer NOT IN ${excludedIlList}
          ${categoryFilter}`;

      // Yıllık trend (Türkiye toplamı) - 2004-2025
      const yearSums = YEAR_COLUMNS.map(yc => `SUM(CAST(COALESCE(${yc},0) AS DECIMAL(20,2))) as v${yc.slice(1)}`).join(',\n        ');
      const yearlyQuery = `SELECT 
        ${yearSums}
        FROM ${TABLE_NAME} 
        WHERE grup='${selectedAnimal}' AND duzeykod='3'
          AND yer IS NOT NULL AND yer != ''
          AND yer NOT IN ${excludedIlList}
          ${categoryFilter}`;

      // Kategori bazlı kırılım (seçili yıl)
      const catQuery = `SELECT 
          CASE WHEN kategori IS NULL OR kategori = '' THEN 'Genel' ELSE kategori END as kat,
          SUM(CAST(COALESCE(${yearCol},0) AS DECIMAL(20,2))) as toplam
        FROM ${TABLE_NAME}
        WHERE grup='${selectedAnimal}' AND duzeykod='3'
          AND yer IS NOT NULL AND yer != ''
          AND yer NOT IN ${excludedIlList}
        GROUP BY kat
        HAVING toplam > 0
        ORDER BY toplam DESC`;

      const [cityRes, totalRes, countRes, yearlyRes, catRes] = await Promise.all([
        fetchQuery(cityQuery),
        fetchQuery(totalQuery),
        fetchQuery(countQuery),
        fetchQuery(yearlyQuery),
        fetchQuery(catQuery)
      ]);

      const turkeyTotal = Number(totalRes.data?.[0]?.toplam) || 0;
      const provinces = Number(countRes.data?.[0]?.cnt) || 0;
      setTotalValue(turkeyTotal);
      setProvinceCount(provinces);

      console.log('[TuikLivestock] Yüklenen veriler:', {
        animal: selectedAnimal,
        year: selectedYear,
        totalValue: turkeyTotal,
        provinceCount: provinces,
        cityDataCount: cityRes.data?.length || 0,
        yearlyDataCount: yearlyRes.data?.length || 0
      });

      if (cityRes.data) {
        const shareBase = turkeyTotal || 0;
        const mapped = cityRes.data.map((item: any, index: number) => ({
          name: String(item['il'] || ''),
          value: Number(item['toplam']) || 0,
          share: shareBase > 0 ? ((Number(item['toplam']) || 0) / shareBase * 100).toFixed(1) : '0.0',
          fill: COLORS[index % COLORS.length]
        }));
        setCityData(mapped);
      }

      if (yearlyRes.data && yearlyRes.data[0]) {
        const row = yearlyRes.data[0];
        const mapped: YearlyDataItem[] = [];
        for (const y of YEARS) {
          const val = Number(row[`v${y}`]) || 0;
          if (val > 0) {
            mapped.push({ year: String(y), value: val });
          }
        }
        setYearlyData(mapped);
      }

      if (catRes.data) {
        setCategoryData(catRes.data.map((r: Record<string, string | number>) => ({
          name: String(r.kat || ''),
          value: Number(r.toplam) || 0
        })).filter((d: CategoryDataItem) => d.value > 0));
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedAnimal, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const yearLabel = selectedYear.replace('y', '');
  const topCity = cityData[0]?.name || '-';
  const topCityValue = cityData[0]?.value || 0;
  const avgValue = provinceCount > 0 ? totalValue / provinceCount : 0;

  // Yıllık değişim
  const currentYearIdx = yearlyData.findIndex(y => y.year === yearLabel);
  const prevYearIdx = currentYearIdx > 0 ? currentYearIdx - 1 : -1;
  const yearChange = prevYearIdx >= 0 && yearlyData[prevYearIdx]?.value > 0
    ? ((Number(yearlyData[currentYearIdx]?.value) - Number(yearlyData[prevYearIdx]?.value)) / Number(yearlyData[prevYearIdx]?.value) * 100)
    : 0;

  // Grup özet verileri (bar chart için)
  const groupChartData = useMemo(() => {
    return groupTotals
      .filter(g => g.total > 0)
      .map((g, i) => ({
        name: g.grup,
        value: g.total,
        fill: COLORS[i % COLORS.length],
        isSelected: g.grup === selectedAnimal
      }));
  }, [groupTotals, selectedAnimal]);

  // Büyüme oranları (son 5 yıl)
  const growthData = useMemo(() => {
    if (yearlyData.length < 2) return [];
    return yearlyData.slice(-6).map((item, index, arr) => {
      if (index === 0) return null;
      const prev = arr[index - 1].value;
      const growth = prev > 0 ? ((item.value - prev) / prev * 100) : 0;
      return { year: item.year, growth: parseFloat(growth.toFixed(1)) };
    }).filter(Boolean) as {year: string; growth: number}[];
  }, [yearlyData]);

  // Bölgesel Analiz
  const regionalAnalysis = useMemo((): RegionalData[] => {
    const regionMap = new Map<string, { total: number; cities: Set<string> }>();

    cityData.forEach(city => {
      const region = getRegion(city.name);
      const existing = regionMap.get(region) || { total: 0, cities: new Set() };
      existing.total += city.value;
      existing.cities.add(city.name);
      regionMap.set(region, existing);
    });

    const totalAllRegions = Array.from(regionMap.values()).reduce((sum, r) => sum + r.total, 0);
    
    return Array.from(regionMap.entries())
      .map(([region, data]) => ({
        region,
        total: data.total,
        cities: data.cities.size,
        average: data.cities.size > 0 ? data.total / data.cities.size : 0,
        share: totalAllRegions > 0 ? (data.total / totalAllRegions * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [cityData]);

  const cityDataForSelectedRegion = useMemo(() => {
    if (selectedRegion === 'Tümü') return [] as CityDataItem[];
    return cityData
      .filter((city) => getRegion(city.name) === selectedRegion)
      .slice()
      .sort((a, b) => b.value - a.value);
  }, [cityData, selectedRegion]);

  const totalSelectedRegion = useMemo(() => {
    return cityDataForSelectedRegion.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  }, [cityDataForSelectedRegion]);

  // Regression Analizi (Trend Tahmini)
  const regressionAnalysis = useMemo(() => {
    if (yearlyData.length < 3) return null;
    
    const data = yearlyData.map((item, i) => ({ x: i, y: item.value }));
    const { slope, intercept, r2 } = linearRegression(data);
    
    // 3 yıllık projeksiyon
    const nextYears = [2026, 2027, 2028];
    const predictions = nextYears.map((year, i) => ({
      year: String(year),
      value: Math.max(0, slope * (yearlyData.length + i) + intercept),
      isPrediction: true
    }));
    
    return { slope, intercept, r2, predictions };
  }, [yearlyData]);

  // CAGR Hesaplaması
  const cagrAnalysis = useMemo(() => {
    if (yearlyData.length < 2) return null;
    
    const firstYear = yearlyData[0];
    const lastYear = yearlyData[yearlyData.length - 1];
    const years = yearlyData.length - 1;
    
    const cagr = calculateCAGR(firstYear.value, lastYear.value, years);
    const last5Years = yearlyData.slice(-5);
    const cagr5 = last5Years.length >= 2 
      ? calculateCAGR(last5Years[0].value, last5Years[last5Years.length - 1].value, last5Years.length - 1)
      : 0;
    
    return {
      overall: cagr,
      last5Years: cagr5,
      startYear: firstYear.year,
      endYear: lastYear.year,
      startValue: firstYear.value,
      endValue: lastYear.value
    };
  }, [yearlyData]);

  // Anomali Tespiti
  const anomalies = useMemo(() => {
    if (yearlyData.length < 3) return [];
    const values = yearlyData.map(d => d.value);
    return detectAnomalies(values).map(anomaly => ({
      ...anomaly,
      year: yearlyData[anomaly.index]?.year || '-'
    }));
  }, [yearlyData]);

  // Scatter Plot Data (Year vs Animal Count Correlation)
  const scatterData = useMemo(() => {
    return yearlyData.slice(-10).map((item, idx) => ({
      x: 2015 + idx,
      y: item.value,
      z: item.value / 100000, // Bubble size
      year: item.year
    }));
  }, [yearlyData]);

  // Heatmap Data (Turkey Map - Province intensity)
  const heatmapData = useMemo(() => {
    if (cityData.length === 0) return [];
    const maxValue = Math.max(...cityData.map(c => c.value));
    const minValue = Math.min(...cityData.map(c => c.value));
    return cityData.map(city => ({
      province: city.name,
      value: city.value,
      intensity: maxValue > minValue ? (city.value - minValue) / (maxValue - minValue) : 0.5
    }));
  }, [cityData]);

  // Sankey Data (Animal Flow over Recent Years)
  const sankeyData = useMemo(() => {
    const nodes: { name: string }[] = [];
    const links: { source: number; target: number; value: number }[] = [];
    
    // Use recent 3 years for simplicity
    const recentYears = yearlyData.slice(-3);
    if (recentYears.length < 2) return { nodes, links };
    
    // Create nodes: years and animal type
    recentYears.forEach(y => nodes.push({ name: y.year }));
    nodes.push({ name: selectedAnimal });
    
    // Create links from years to animal
    const animalNodeIdx = nodes.length - 1;
    recentYears.forEach((y, idx) => {
      links.push({
        source: idx,
        target: animalNodeIdx,
        value: y.value
      });
    });
    
    return { nodes, links };
  }, [yearlyData, selectedAnimal]);

  // Korelasyon Verileri (Hayvan -> Üretim bağlantıları)
  const correlationLinks = useMemo((): CorrelationData[] => {
    const links: CorrelationData[] = [];
    if (selectedAnimal === 'Sığır' || selectedAnimal === 'Manda') {
      links.push({ animal: 'Sığır/Manda', production: totalValue, link: '/turkey/milk-production' });
    }
    if (selectedAnimal === 'Koyun' || selectedAnimal === 'Keçi') {
      links.push({ animal: 'Koyun/Keçi', production: totalValue, link: '/turkey/other-animal-products' });
    }
    if (selectedAnimal === 'Tavuk') {
      links.push({ animal: 'Tavuk', production: totalValue, link: '/turkey/egg-production' });
      links.push({ animal: 'Beyaz Et', production: totalValue, link: '/turkey/white-meat-production' });
    }
    return links;
  }, [selectedAnimal, totalValue]);

  return (
    <div ref={pageRef}>
      <div className="page-header" style={{ position: 'relative' }}>
        <h1 className="page-title">📊 TÜİK Canlı Hayvan Envanteri ve Trend Analizi</h1>
        <p className="page-subtitle">Türkiye İl ve Bölge Bazında Kapsamlı Hayvancılık İstatistikleri — {yearLabel} (Kaynak: TÜİK)</p>
        
        {/* Export Menu */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.5 : 1
            }}
          >
            📥 Export
          </button>
          {exportMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '150px'
            }}>
              <button
                onClick={() => { exportToPDF(); setExportMenuOpen(false); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                📄 PDF
              </button>
              <button
                onClick={() => { exportToExcel(); setExportMenuOpen(false); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  borderTop: '1px solid var(--border)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                📊 Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        {([
          { key: 'overview', label: '📋 Genel Bakış' },
          { key: 'regional', label: '🗺️ Bölgesel Analiz' },
          { key: 'trends', label: '📈 Trend & Tahmin' },
          { key: 'correlations', label: '🔗 Korelasyonlar' }
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.key ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #f59e0b' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? '700' : '600',
              fontSize: '0.95rem',
              transition: 'all 0.2s',
              borderRadius: '8px 8px 0 0'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">Hayvan Grubu</label>
          <select className="filter-select" value={selectedAnimal} onChange={(e) => setSelectedAnimal(e.target.value)}>
            {ANIMAL_GROUPS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.icon} {opt.name}</option>
            ))}
          </select>
        </div>
        {activeTab === 'regional' && (
          <div className="filter-group">
            <label className="filter-label">Bölge</label>
            <select className="filter-select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              <option value="Tümü">Tüm Bölgeler</option>
              {Object.keys(REGION_COLORS).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        )}
        {categories.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">Alt Kategori</label>
            <select className="filter-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="Tümü">Tümü</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
        <div className="filter-group">
          <label className="filter-label">Yıl</label>
          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {[...YEARS].reverse().map(year => (
              <option key={year} value={`y${year}`}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div><p>Veriler yükleniyor...</p></div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* KPI Kartları */}
              <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header"><span className="kpi-title">TÜRKİYE TOPLAMI</span></div>
              <div className="kpi-value">{formatNumber(totalValue)}</div>
              <div className="kpi-subtitle">{selectedAnimal} — {yearLabel}{selectedCategory !== 'Tümü' ? ` (${selectedCategory})` : ''}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">YILLIK DEĞİŞİM</span><div className={`kpi-icon ${yearChange >= 0 ? 'green' : 'red'}`}>{yearChange >= 0 ? '📈' : '📉'}</div></div>
              <div className="kpi-value" style={{ color: yearChange >= 0 ? '#22c55e' : '#ef4444' }}>%{yearChange.toFixed(1)}</div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">LİDER İL</span><div className="kpi-icon orange">🏆</div></div>
              <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{topCity}</div>
              <div className="kpi-subtitle">{formatNumber(topCityValue)} baş</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header"><span className="kpi-title">İL ORTALAMASI</span><div className="kpi-icon blue">📊</div></div>
              <div className="kpi-value">{formatNumber(avgValue)}</div>
              <div className="kpi-subtitle">baş/il ({provinceCount} il)</div>
            </div>
          </div>

          {/* Intelligence Panel */}
          {cagrAnalysis && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginTop: '24px',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 Hayvan Varlığı Intelligence Özeti
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>CAGR (TÜM DÖNEM)</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{cagrAnalysis.overall.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>{cagrAnalysis.startYear} - {cagrAnalysis.endYear}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>CAGR (5 YIL)</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{cagrAnalysis.last5Years.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Son 5 Yıl</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>TOPLAM BÜYÜME</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{((cagrAnalysis.endValue - cagrAnalysis.startValue) / cagrAnalysis.startValue * 100).toFixed(0)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Dönem Artışı</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>YILLIK DEĞİŞİM</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{yearChange > 0 ? '+' : ''}{yearChange.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Son Yıl</div>
                </div>
              </div>
            </div>
          )}

          {/* BÖLÜM 1: Genel Hayvan Varlığı Özeti */}
          {groupChartData.length > 0 && (
            <div className="chart-grid">
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">📊 Türkiye Hayvan Varlığı Özeti ({yearLabel})</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={groupChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={80} />
                    <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, 'Hayvan Sayısı']} />
                    <Bar dataKey="value" name="Hayvan Sayısı" radius={[0, 4, 4, 0]}>
                      {groupChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isSelected ? '#f59e0b' : '#64748b'} 
                          fillOpacity={entry.isSelected ? 1 : 0.5}
                          stroke={entry.isSelected ? '#f59e0b' : 'none'}
                          strokeWidth={entry.isSelected ? 2 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* BÖLÜM 2: Yıllık Trend + Büyüme */}
          <div className="chart-grid">
            <div className="chart-card" style={{ gridColumn: yearlyData.length > 0 && growthData.length > 0 ? 'span 1' : 'span 2' }}>
              <h3 className="chart-title">📅 Yıllık {selectedAnimal} Sayısı Trendi ({yearlyData[0]?.year || '2004'}-{yearlyData[yearlyData.length-1]?.year || '2025'})</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {growthData.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">📈 Yıllık Büyüme Oranı (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `%${v}`} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`%${value.toFixed(1)}`, 'Büyüme']} />
                    <Bar dataKey="growth" name="Büyüme" radius={[4, 4, 0, 0]}>
                      {growthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* BÖLÜM 3: Kategori Dağılımı (varsa) */}
          {categoryData.length > 1 && (
            <div className="chart-grid">
              <div className="chart-card">
                <h3 className="chart-title">🥧 {selectedAnimal} — Kategori Dağılımı ({yearLabel})</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie 
                      data={categoryData} 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={120}
                      innerRadius={50}
                      dataKey="value" 
                      label={({ name, percent }) => `${name?.substring(0, 18)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">📊 Kategori Karşılaştırma</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                    <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
                    <Bar dataKey="value" name="Hayvan Sayısı" radius={[0, 4, 4, 0]}>
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* BÖLÜM 4: İl Bazlı Bar + Pie */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3 className="chart-title">🏙️ İl Bazında {selectedAnimal} Sayısı ({yearLabel})</h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                  <Bar dataKey="value" name={selectedAnimal} radius={[0, 4, 4, 0]}>
                    {cityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 İl Payları Dağılımı (Top 10)</h3>
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie 
                    data={cityData.slice(0, 10)} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={140} 
                    innerRadius={40}
                    dataKey="value" 
                    label={({ name, percent }) => `${name?.substring(0, 8)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {cityData.slice(0, 10).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* İl Sıralama Tablosu */}
          <div className="data-table">
            <h3 className="data-table-title">📋 İl Sıralaması — {selectedAnimal} Sayısı ({yearLabel}){selectedCategory !== 'Tümü' ? ` — ${selectedCategory}` : ''}</h3>
            {cityData.map((city, index) => (
              <div className="table-row" key={city.name}>
                <div className={`table-rank ${index < 3 ? 'orange' : ''}`}>{index + 1}</div>
                <div className="table-info">
                  <div className="table-name">{city.name}</div>
                  <div className="table-subtext">Pay: %{city.share}</div>
                </div>
                <div className="table-value orange">{formatNumber(city.value)} baş</div>
              </div>
            ))}
          </div>
            </>
          )}

          {/* REGIONAL TAB */}
          {activeTab === 'regional' && regionalAnalysis.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>🗺️ Bölgesel Dağılım Analizi</h2>
              
              {/* Bölgesel KPI'lar */}
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {regionalAnalysis.slice(0, 7).map((region) => (
                  <div key={region.region} className="kpi-card" style={{ background: `linear-gradient(135deg, ${REGION_COLORS[region.region] || '#6b7280'} 0%, ${REGION_COLORS[region.region] || '#4b5563'} 100%)`, color: 'white' }}>
                    <div className="kpi-header"><span className="kpi-title">{region.region.toUpperCase()}</span></div>
                    <div className="kpi-value">{formatShort(region.total)}</div>
                    <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>{region.cities} il • Ort: {formatShort(region.average)}</div>
                  </div>
                ))}
              </div>

              {selectedRegion === 'Tümü' ? (
                <>
                  {/* Bölge Karşılaştırma Chart */}
                  <div className="chart-grid">
                    <div className="chart-card">
                      <h3 className="chart-title">📊 Bölgelere Göre {selectedAnimal} Dağılımı</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={regionalAnalysis}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="region" angle={-15} textAnchor="end" height={100} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, 'Toplam']} />
                          <Bar dataKey="total" name="Toplam Hayvan" radius={[8, 8, 0, 0]}>
                            {regionalAnalysis.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || '#6b7280'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                      <h3 className="chart-title">🥧 Bölgesel Pay Dağılımı (%)</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie 
                            data={regionalAnalysis} 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={130}
                            innerRadius={50}
                            dataKey="total" 
                            label={(props) => {
                              const payload = (props as any)?.payload as any;
                              const region = String(payload?.region ?? '').trim();
                              const share = Number(payload?.share ?? 0);
                              return region ? `${region} %${share.toFixed(1)}` : '';
                            }}
                            labelLine={true}
                          >
                            {regionalAnalysis.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Radar Chart - Bölgesel Karşılaştırma */}
                  <div className="chart-card">
                    <h3 className="chart-title">🎯 Çok Boyutlu Bölge Karşılaştırması</h3>
                    <ResponsiveContainer width="100%" height={450}>
                      <RadarChart data={regionalAnalysis}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="region" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                        <Radar name="Toplam" dataKey="total" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                        <Radar name="Ortalama" dataKey="average" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        <Tooltip formatter={(value: number) => [formatNumber(value), '']} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <>
                  <div className="chart-grid">
                    <div className="chart-card">
                      <h3 className="chart-title">🏙️ {selectedRegion} — İllere Göre {selectedAnimal} Dağılımı (Top 20)</h3>
                      <ResponsiveContainer width="100%" height={420}>
                        <BarChart data={cityDataForSelectedRegion.slice(0, 20)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={120} />
                          <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, selectedAnimal]} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {cityDataForSelectedRegion.slice(0, 20).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={REGION_COLORS[selectedRegion] || COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                      <h3 className="chart-title">🥧 {selectedRegion} — İl Pay Dağılımı (%) (Top 10)</h3>
                      <ResponsiveContainer width="100%" height={420}>
                        <PieChart>
                          <Pie
                            data={cityDataForSelectedRegion.slice(0, 10).map((c) => ({
                              name: c.name,
                              value: c.value,
                              share: totalSelectedRegion > 0 ? (c.value / totalSelectedRegion * 100) : 0,
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={140}
                            innerRadius={55}
                            dataKey="value"
                            label={(props) => {
                              const payload = (props as any)?.payload as any;
                              const name = String(payload?.name ?? '').trim();
                              const share = Number(payload?.share ?? 0);
                              return name ? `${name} %${share.toFixed(1)}` : '';
                            }}
                            labelLine={true}
                          >
                            {cityDataForSelectedRegion.slice(0, 10).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${formatNumber(value)} baş`, '']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* Turkey Heatmap */}
              <div className="chart-card" style={{ marginTop: '24px' }}>
                <h3 className="chart-title">🗺️ Türkiye İl Dağılım Haritası (Coğrafi Bölgeler)</h3>
                {heatmapData.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>İl verileri yükleniyor…</div>
                ) : (
                  <TurkeyHeatMap
                    regionTotals={heatmapData.map((item) => ({ name: item.province, value: item.value, unit: 'baş' }))}
                    unitLabel="baş"
                    height={450}
                    fillMode="region"
                    regionColors={REGION_COLORS}
                    highlightRegion={selectedRegion !== 'Tümü' ? selectedRegion : undefined}
                    dimNonSelected={selectedRegion !== 'Tümü'}
                  />
                )}
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                  * İller coğrafi bölgesine göre renklidir; tooltip’te il değerini görebilirsiniz.
                </p>
              </div>
            </>
          )}

          {/* TRENDS & PREDICTION TAB */}
          {activeTab === 'trends' && (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>📈 Trend Analizi ve Tahminler</h2>
              
              {/* CAGR KPI'lar */}
              {cagrAnalysis && (
                <div className="kpi-grid">
                  <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', color: 'white' }}>
                    <div className="kpi-header"><span className="kpi-title">CAGR (TÜM DÖNEM)</span></div>
                    <div className="kpi-value">%{cagrAnalysis.overall.toFixed(2)}</div>
                    <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>{cagrAnalysis.startYear} - {cagrAnalysis.endYear}</div>
                  </div>
                  <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', color: 'white' }}>
                    <div className="kpi-header"><span className="kpi-title">CAGR (SON 5 YIL)</span></div>
                    <div className="kpi-value">%{cagrAnalysis.last5Years.toFixed(2)}</div>
                    <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>Son 5 yıllık büyüme</div>
                  </div>
                  <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                    <div className="kpi-header"><span className="kpi-title">BAŞLANGIÇ ({cagrAnalysis.startYear})</span></div>
                    <div className="kpi-value">{formatShort(cagrAnalysis.startValue)}</div>
                    <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>baş</div>
                  </div>
                  <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: 'white' }}>
                    <div className="kpi-header"><span className="kpi-title">GÜNCEL ({cagrAnalysis.endYear})</span></div>
                    <div className="kpi-value">{formatShort(cagrAnalysis.endValue)}</div>
                    <div className="kpi-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>baş</div>
                  </div>
                </div>
              )}

              {/* Trend Line with Predictions */}
              {regressionAnalysis && (
                <div className="chart-card">
                  <h3 className="chart-title">📉 Trend Çizgisi ve 3 Yıllık Projeksiyon (R² = {regressionAnalysis.r2.toFixed(3)})</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={[...yearlyData, ...regressionAnalysis.predictions]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip formatter={(value: number, name: string) => [`${formatNumber(value)} baş`, name]} />
                      <Legend />
                      <Area type="monotone" dataKey="value" name="Gerçek Veri" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.3} />
                      <Line type="monotone" dataKey="value" strokeDasharray="5 5" stroke="#f59e0b" strokeWidth={2} name="Tahmin" dot={{ fill: '#f59e0b', r: 4 }} />
                      <ReferenceLine x={yearLabel} stroke="#ef4444" strokeDasharray="3 3" label="Güncel" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Anomali Tespiti */}
              {anomalies.length > 0 && (
                <div className="chart-card">
                  <h3 className="chart-title">⚠️ Anomali Tespiti (Beklenmedik Değişimler)</h3>
                  <div style={{ padding: '20px' }}>
                    {anomalies.map((anomaly, idx) => (
                      <div key={idx} style={{ padding: '12px', marginBottom: '8px', background: 'var(--card-bg)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>📍 {anomaly.year} Yılı</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Değer: {formatNumber(anomaly.value)} baş • Sapma: {anomaly.deviation.toFixed(2)} sigma
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sankey Diagram - Animal Flow across Years */}
              {sankeyData.nodes.length > 0 && (
                <div className="chart-card" style={{ marginTop: '24px' }}>
                  <h3 className="chart-title">🌊 Hayvan Akış Diyagramı (Son 3 Yıl)</h3>
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Yıllar arası {selectedAnimal} sayısının akışı
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                      <Sankey
                        data={sankeyData}
                        node={{ fill: '#f59e0b', fillOpacity: 0.8 } as any}
                        link={{ stroke: '#d97706', strokeOpacity: 0.4 } as any}
                        nodePadding={50}
                        margin={{ top: 20, right: 60, bottom: 20, left: 60 }}
                      >
                        <Tooltip 
                          content={({active, payload}: any) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div style={{ background: 'var(--bg-secondary)', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                  <p style={{ margin: 0, fontWeight: '600' }}>
                                    {data.source?.name || data.name} → {data.target?.name || ''}
                                  </p>
                                  <p style={{ margin: 0, color: 'var(--primary)' }}>
                                    {formatShort(data.value || 0)} baş
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </Sankey>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          {/* CORRELATIONS TAB */}
          {activeTab === 'correlations' && correlationLinks.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>🔗 Üretim Korelasyonları</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                {selectedAnimal} hayvan sayıları ile ilgili üretim sayfalarına hızlı erişim
              </p>

              <div className="kpi-grid">
                {correlationLinks.map((link, idx) => (
                  <a key={idx} href={link.link} style={{ textDecoration: 'none' }}>
                    <div className="kpi-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                      <div className="kpi-header"><span className="kpi-title">{link.animal}</span><div className="kpi-icon orange">🔗</div></div>
                      <div className="kpi-value">{formatShort(link.production || 0)}</div>
                      <div className="kpi-subtitle">baş • İlgili sayfaya git →</div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Scatter Plot: Yearly Trend Correlation */}
              {scatterData.length > 0 && (
                <div className="chart-card" style={{ marginTop: '24px' }}>
                  <h3 className="chart-title">📊 Yıllık Değer Korelasyon Grafiği (Scatter Plot)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="x" type="number" name="Yıl" stroke="var(--text-secondary)" />
                      <YAxis dataKey="y" type="number" name="Hayvan Sayısı" stroke="var(--text-secondary)" />
                      <ZAxis dataKey="z" range={[50, 400]} />
                      <Tooltip 
                        content={({active, payload}) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div style={{ background: 'var(--bg-secondary)', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                <p style={{ margin: 0, fontWeight: '600' }}>{data.year}</p>
                                <p style={{ margin: 0, color: 'var(--primary)' }}>{formatShort(data.y)} baş</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter name="Hayvan Sayısı" data={scatterData} fill="#f59e0b" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="chart-card" style={{ marginTop: '24px' }}>
                <h3 className="chart-title">ℹ️ Korelasyon Bilgisi</h3>
                <div style={{ padding: '20px', lineHeight: '1.8' }}>
                  <p><strong>🐄 Sığır/Manda:</strong> Süt üretimi sayfasında bu hayvanların süt verimliliği analiz edilir.</p>
                  <p><strong>🐑 Koyun/Keçi:</strong> Diğer hayvansal ürünler sayfasında yapağı, kıl, tiftik üretimi görüntülenebilir.</p>
                  <p><strong>🐔 Tavuk:</strong> Yumurta üretimi ve beyaz et üretimi sayfalarında detaylı analizler mevcuttur.</p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
