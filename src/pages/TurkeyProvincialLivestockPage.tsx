import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from 'recharts';
import { fetchQuery } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Loading } from '../components/Loading';
import { getRegionByProvince } from '../utils/productionCategories';
import { TurkeyHeatMap } from '../components/TurkeyHeatMap';

// Constants
const TABLE_NAME = 'tuik_hayvancilik_canlihayvan';
const YEARS = Array.from({ length: 22 }, (_, i) => 2004 + i); // 2004-2025
const YEAR_COLUMNS = YEARS.map(y => `y${y}`);

const ANIMAL_GROUPS = [
  { id: 'Sığır', name: 'Sığır (Büyükbaş)', icon: '🐄', color: '#22c55e' },
  { id: 'Manda', name: 'Manda', icon: '🐃', color: '#14b8a6' },
  { id: 'Koyun', name: 'Koyun', icon: '🐑', color: '#3b82f6' },
  { id: 'Keçi', name: 'Keçi', icon: '🐐', color: '#8b5cf6' },
  { id: 'Tavuk', name: 'Tavuk', icon: '🐔', color: '#f59e0b' },
  { id: 'Hindi', name: 'Hindi', icon: '🦃', color: '#ef4444' },
  { id: 'Ördek', name: 'Ördek', icon: '🦆', color: '#06b6d4' },
  { id: 'Kaz', name: 'Kaz', icon: '🪿', color: '#84cc16' },
  { id: 'At', name: 'At', icon: '🐴', color: '#f97316' },
  { id: 'Eşek', name: 'Eşek', icon: '🫏', color: '#6366f1' },
  { id: 'Katır', name: 'Katır', icon: '🐴', color: '#a3e635' },
  { id: 'Deve', name: 'Deve', icon: '🐪', color: '#d946ef' },
  { id: 'Domuz', name: 'Domuz', icon: '🐷', color: '#ec4899' },
];

const REGION_COLORS: Record<string, string> = {
  'Marmara': '#3b82f6',
  'Ege': '#22c55e',
  'Akdeniz': '#f59e0b',
  'İç Anadolu': '#ef4444',
  'Karadeniz': '#8b5cf6',
  'Doğu Anadolu': '#ec4899',
  'Güneydoğu Anadolu': '#14b8a6'
};

// Types
interface ProvincialData {
  province: string;
  region: string;
  totalPopulation: number;
  growthRate: number;
  dominantAnimal: string;
  animalCounts: Record<string, number>;
  marketShare: number;
  rank: number;
}

interface DistrictData {
  district: string;
  province: string;
  totalPopulation: number;
  provinceShare: number;
  dominantAnimal: string;
  growthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  maxAnimalCount?: number;
}

interface YearlyTrendData {
  year: number;
  value: number;
}

interface RegionalSummary {
  region: string;
  totalPopulation: number;
  provinceCount: number;
  averagePerProvince: number;
  topAnimal: string;
  growthRate: number;
  color: string;
}

interface AggregatedMetrics {
  totalPopulation: number;
  provinceCount: number;
  districtCount: number;
  animalTypeCount: number;
  avgGrowthRate: number;
  topProvince: string;
  fastestGrowingProvince: string;
  diversityScore: number;
}

// Utility Functions
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

function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

function getAnimalColor(animalName: string): string {
  const animal = ANIMAL_GROUPS.find(a => a.id === animalName);
  return animal?.color || '#64748b';
}

function getAnimalIcon(animalName: string): string {
  const animal = ANIMAL_GROUPS.find(a => a.id === animalName);
  return animal?.icon || '🐾';
}

export default function TurkeyProvincialLivestockPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'districts' | 'trends' | 'comparison' | 'correlation' | 'forecast'>('overview');
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('y2025');
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>(['Sığır']);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('Tümü');
  const [yearRange] = useState<[number, number]>([2020, 2025]);
  
  // Data States
  const [provincialData, setProvincialData] = useState<ProvincialData[]>([]);
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [yearlyTrendData, setYearlyTrendData] = useState<YearlyTrendData[]>([]);
  const [regionalSummary, setRegionalSummary] = useState<RegionalSummary[]>([]);
  const [metrics, setMetrics] = useState<AggregatedMetrics>({
    totalPopulation: 0,
    provinceCount: 0,
    districtCount: 0,
    animalTypeCount: 0,
    avgGrowthRate: 0,
    topProvince: '',
    fastestGrowingProvince: '',
    diversityScore: 0
  });
  
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Load Provincial Data (Main Data Loader)
  const loadProvincialData = useCallback(async () => {
    setLoading(true);
    try {
      const yearCol = selectedYear;
      const prevYearCol = `y${parseInt(selectedYear.substring(1)) - 1}`;
      const animalFilter = selectedAnimals.length > 0 
        ? `AND grup IN (${selectedAnimals.map(a => `'${a}'`).join(',')})` 
        : '';
      
      // Query 1: Provincial totals with growth rate
      const provincialQuery = `
        SELECT 
          yer as province,
          grup as animal,
          SUM(CAST(COALESCE(${yearCol}, 0) AS DECIMAL(20,2))) as current_value,
          SUM(CAST(COALESCE(${prevYearCol}, 0) AS DECIMAL(20,2))) as prev_value
        FROM ${TABLE_NAME}
        WHERE duzeykod = '3'
          AND yer IS NOT NULL 
          AND yer != ''
          AND yer NOT IN ('TOPLAM', 'Toplam', 'TÜRKİYE', 'Türkiye', 'TOTAL', 'Total')
          ${animalFilter}
        GROUP BY yer, grup
        ORDER BY current_value DESC
      `;
      
      const [provincialRes] = await Promise.all([
        fetchQuery(provincialQuery)
      ]);

      if (provincialRes.data) {
        // Process provincial data
        const provinceMap = new Map<string, ProvincialData>();
        let totalNational = 0;

        provincialRes.data.forEach((row: Record<string, string | number>) => {
          const province = String(row.province);
          const animal = String(row.animal);
          const currentVal = Number(row.current_value) || 0;
          const prevVal = Number(row.prev_value) || 0;
          
          totalNational += currentVal;

          if (!provinceMap.has(province)) {
            provinceMap.set(province, {
              province,
              region: getRegionByProvince(province),
              totalPopulation: 0,
              growthRate: 0,
              dominantAnimal: '',
              animalCounts: {},
              marketShare: 0,
              rank: 0
            });
          }

          const pData = provinceMap.get(province)!;
          pData.totalPopulation += currentVal;
          pData.animalCounts[animal] = currentVal;
          
          // Calculate growth rate
          const growth = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
          pData.growthRate += growth;
        });

        // Post-process: find dominant animal, calculate market share
        const provinceArray = Array.from(provinceMap.values());
        provinceArray.forEach(p => {
          // Find dominant animal
          let maxCount = 0;
          Object.entries(p.animalCounts).forEach(([animal, count]) => {
            if (count > maxCount) {
              maxCount = count;
              p.dominantAnimal = animal;
            }
          });
          
          // Calculate market share
          p.marketShare = totalNational > 0 ? (p.totalPopulation / totalNational) * 100 : 0;
          
          // Average growth rate
          const animalCount = Object.keys(p.animalCounts).length;
          if (animalCount > 0) {
            p.growthRate = p.growthRate / animalCount;
          }
        });

        // Sort and rank
        provinceArray.sort((a, b) => b.totalPopulation - a.totalPopulation);
        provinceArray.forEach((p, idx) => p.rank = idx + 1);

        setProvincialData(provinceArray);

        // Calculate metrics
        const topProvince = provinceArray[0]?.province || '';
        const fastestGrowing = [...provinceArray].sort((a, b) => b.growthRate - a.growthRate)[0]?.province || '';
        const avgGrowth = provinceArray.reduce((sum, p) => sum + p.growthRate, 0) / (provinceArray.length || 1);
        
        // Diversity score (average number of animal types per province)
        const diversityScore = provinceArray.reduce((sum, p) => sum + Object.keys(p.animalCounts).length, 0) / (provinceArray.length || 1);

        setMetrics({
          totalPopulation: totalNational,
          provinceCount: provinceArray.length,
          districtCount: 0, // Will be calculated separately
          animalTypeCount: selectedAnimals.length,
          avgGrowthRate: avgGrowth,
          topProvince,
          fastestGrowingProvince: fastestGrowing,
          diversityScore
        });

        // Calculate regional summary
        const regionMap = new Map<string, RegionalSummary>();
        provinceArray.forEach(p => {
          if (!regionMap.has(p.region)) {
            regionMap.set(p.region, {
              region: p.region,
              totalPopulation: 0,
              provinceCount: 0,
              averagePerProvince: 0,
              topAnimal: '',
              growthRate: 0,
              color: REGION_COLORS[p.region] || '#64748b'
            });
          }
          const r = regionMap.get(p.region)!;
          r.totalPopulation += p.totalPopulation;
          r.provinceCount += 1;
          r.growthRate += p.growthRate;
        });

        const regionArray = Array.from(regionMap.values());
        regionArray.forEach(r => {
          r.averagePerProvince = r.totalPopulation / r.provinceCount;
          r.growthRate = r.growthRate / r.provinceCount;
        });

        setRegionalSummary(regionArray);
      }
    } catch (error) {
      console.error('Error loading provincial data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedAnimals]);

  // Load District Data (when province selected)
  const loadDistrictData = useCallback(async () => {
    if (!selectedProvince) {
      setDistrictData([]);
      return;
    }

    try {
      const yearCol = selectedYear;
      const prevYearCol = `y${parseInt(selectedYear.substring(1)) - 1}`;
      const animalFilter = selectedAnimals.length > 0 
        ? `AND grup IN (${selectedAnimals.map(a => `'${a}'`).join(',')})` 
        : '';

      const districtQuery = `
        SELECT 
          ilce as district,
          grup as animal,
          SUM(CAST(COALESCE(${yearCol}, 0) AS DECIMAL(20,2))) as current_value,
          SUM(CAST(COALESCE(${prevYearCol}, 0) AS DECIMAL(20,2))) as prev_value
        FROM ${TABLE_NAME}
        WHERE il = '${selectedProvince}'
          AND ilce IS NOT NULL
          AND ilce != ''
          AND ilce NOT IN ('TOPLAM', 'Toplam')
          ${animalFilter}
        GROUP BY ilce, grup
        ORDER BY current_value DESC
      `;

      const districtRes = await fetchQuery(districtQuery);

      if (districtRes.data) {
        const districtMap = new Map<string, DistrictData>();
        let provinceTotal = 0;

        districtRes.data.forEach((row: Record<string, string | number>) => {
          const district = String(row.district);
          const animal = String(row.animal);
          const currentVal = Number(row.current_value) || 0;
          const prevVal = Number(row.prev_value) || 0;

          provinceTotal += currentVal;

          if (!districtMap.has(district)) {
            districtMap.set(district, {
              district,
              province: selectedProvince,
              totalPopulation: 0,
              provinceShare: 0,
              dominantAnimal: '',
              growthRate: 0,
              trend: 'stable'
            });
          }

          const dData = districtMap.get(district)!;
          dData.totalPopulation += currentVal;

          // Track dominant animal
          if (currentVal > (dData.maxAnimalCount || 0)) {
            dData.maxAnimalCount = currentVal;
            dData.dominantAnimal = animal;
          }

          // Calculate growth
          const growth = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
          dData.growthRate += growth;
        });

        const districtArray = Array.from(districtMap.values());
        districtArray.forEach(d => {
          d.provinceShare = provinceTotal > 0 ? (d.totalPopulation / provinceTotal) * 100 : 0;
          d.trend = d.growthRate > 2 ? 'increasing' : d.growthRate < -2 ? 'decreasing' : 'stable';
        });

        districtArray.sort((a, b) => b.totalPopulation - a.totalPopulation);
        setDistrictData(districtArray);

        // Update district count in metrics
        setMetrics(prev => ({ ...prev, districtCount: districtArray.length }));
      }
    } catch (error) {
      console.error('Error loading district data:', error);
    }
  }, [selectedProvince, selectedYear, selectedAnimals]);

  // Load Yearly Trend Data
  const loadYearlyTrend = useCallback(async () => {
    try {
      const animalFilter = selectedAnimals.length > 0 
        ? `AND grup IN (${selectedAnimals.map(a => `'${a}'`).join(',')})` 
        : '';

      const yearColumns = YEAR_COLUMNS.filter(yc => {
        const year = parseInt(yc.substring(1));
        return year >= yearRange[0] && year <= yearRange[1];
      });

      const yearSelects = yearColumns.map(yc => `SUM(CAST(COALESCE(${yc}, 0) AS DECIMAL(20,2))) as ${yc}`).join(', ');

      const trendQuery = `
        SELECT ${yearSelects}
        FROM ${TABLE_NAME}
        WHERE duzeykod = '3'
          AND yer IS NOT NULL 
          AND yer NOT IN ('TOPLAM', 'TÜRKİYE')
          ${animalFilter}
      `;

      const trendRes = await fetchQuery(trendQuery);

      if (trendRes.data && trendRes.data.length > 0) {
        const row = trendRes.data[0];
        const trendData: YearlyTrendData[] = yearColumns.map(yc => ({
          year: parseInt(yc.substring(1)),
          value: Number(row[yc]) || 0
        }));

        setYearlyTrendData(trendData);
      }
    } catch (error) {
      console.error('Error loading yearly trend:', error);
    }
  }, [selectedAnimals, yearRange]);

  // Effects
  useEffect(() => {
    loadProvincialData();
  }, [loadProvincialData]);

  useEffect(() => {
    if (selectedProvince) {
      loadDistrictData();
    }
  }, [loadDistrictData, selectedProvince]);

  useEffect(() => {
    if (activeTab === 'trends') {
      loadYearlyTrend();
    }
  }, [activeTab, loadYearlyTrend]);

  // Export Functions
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Provincial data sheet
      const provincialWS = XLSX.utils.json_to_sheet(provincialData.map(p => ({
        'İl': p.province,
        'Bölge': p.region,
        'Toplam Popülasyon': p.totalPopulation,
        'Büyüme Oranı (%)': p.growthRate.toFixed(2),
        'Baskın Hayvan': p.dominantAnimal,
        'Pazar Payı (%)': p.marketShare.toFixed(2),
        'Sıra': p.rank
      })));
      XLSX.utils.book_append_sheet(wb, provincialWS, 'İller');
      
      // District data sheet (if available)
      if (districtData.length > 0) {
        const districtWS = XLSX.utils.json_to_sheet(districtData.map(d => ({
          'İlçe': d.district,
          'İl': d.province,
          'Toplam Popülasyon': d.totalPopulation,
          'İl İçi Pay (%)': d.provinceShare.toFixed(2),
          'Baskın Hayvan': d.dominantAnimal,
          'Büyüme Oranı (%)': d.growthRate.toFixed(2),
          'Trend': d.trend
        })));
        XLSX.utils.book_append_sheet(wb, districtWS, 'İlçeler');
      }
      
      XLSX.writeFile(wb, `provincial_livestock_${selectedYear}_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel oluşturma hatası');
    }
  };

  const exportToPDF = async () => {
    if (!pageRef.current) return;
    try {
      const canvas = await html2canvas(pageRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`provincial_livestock_${selectedYear}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF oluşturma hatası');
    }
  };

  // Filtered Data
  const filteredProvincialData = useMemo(() => {
    let filtered = [...provincialData];
    
    if (selectedRegion !== 'Tümü') {
      filtered = filtered.filter(p => p.region === selectedRegion);
    }
    
    return filtered;
  }, [provincialData, selectedRegion]);

  // Top 10 Provinces for Intelligence Table
  const top10Provinces = useMemo(() => {
    return filteredProvincialData.slice(0, 10);
  }, [filteredProvincialData]);

  if (loading) return <Loading />;

  return (
    <div ref={pageRef} style={{ padding: '24px', background: 'var(--background)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">🗺️ İl ve İlçe Bazlı Hayvancılık Analizi</h1>
        <p className="page-subtitle">
          Detaylı coğrafi analiz, trend izleme ve tahmin platformu
        </p>
      </div>

      {/* KPI Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Population Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🐄</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Toplam Hayvan Popülasyonu
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {formatNumber(metrics.totalPopulation)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {selectedYear.substring(1)} Yılı
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: '8px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: metrics.avgGrowthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: metrics.avgGrowthRate >= 0 ? '#22c55e' : '#ef4444'
          }}>
            {metrics.avgGrowthRate >= 0 ? '+' : ''}{metrics.avgGrowthRate.toFixed(1)}%
          </div>
        </div>

        {/* Leader Province Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Lider İl
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {metrics.topProvince || '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            En yüksek popülasyon
          </div>
        </div>

        {/* Fastest Growing Province Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            En Hızlı Büyüyen İl
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {metrics.fastestGrowingProvince || '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Yıllık büyüme bazlı
          </div>
        </div>

        {/* Active Province Count Card */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
            Aktif İl Sayısı
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {metrics.provinceCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {metrics.districtCount > 0 ? `${metrics.districtCount} ilçe` : 'İlçe verileri yükleniyor'}
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Year Selector */}
          <div className="filter-group">
            <label className="filter-label">Yıl Seçimi</label>
            <select 
              className="filter-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEAR_COLUMNS.map(yc => (
                <option key={yc} value={yc}>{yc.substring(1)}</option>
              ))}
            </select>
          </div>

          {/* Animal Multi-Selector */}
          <div className="filter-group">
            <label className="filter-label">Hayvan Türleri (Max 5)</label>
            <div style={{ position: 'relative' }}>
              <div 
                className="filter-select"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => {
                  const dropdown = document.getElementById('animal-dropdown');
                  if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                }}
              >
                {selectedAnimals.length > 0 ? `${selectedAnimals.length} hayvan seçildi` : 'Hayvan seçin'}
              </div>
              <div 
                id="animal-dropdown"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  padding: '8px'
                }}
              >
                {ANIMAL_GROUPS.map(animal => (
                  <label
                    key={animal.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnimals.includes(animal.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (selectedAnimals.length < 5) {
                            setSelectedAnimals([...selectedAnimals, animal.id]);
                          }
                        } else {
                          setSelectedAnimals(selectedAnimals.filter(a => a !== animal.id));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ marginRight: '8px' }}>{animal.icon}</span>
                    <span>{animal.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Region Filter */}
          <div className="filter-group">
            <label className="filter-label">Bölge Filtresi</label>
            <select 
              className="filter-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="Tümü">Tüm Bölgeler</option>
              {Object.keys(REGION_COLORS).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Province Selector */}
          <div className="filter-group">
            <label className="filter-label">İl Seçimi (İlçe Analizi İçin)</label>
            <select 
              className="filter-select"
              value={selectedProvince || ''}
              onChange={(e) => setSelectedProvince(e.target.value || null)}
            >
              <option value="">İl Seçin</option>
              {provincialData.map(p => (
                <option key={p.province} value={p.province}>{p.province}</option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <button
                className="btn btn-primary"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📤 Dışa Aktar
              </button>
              {exportMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  minWidth: '150px'
                }}>
                  <button
                    onClick={() => { exportToExcel(); setExportMenuOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={() => { exportToPDF(); setExportMenuOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    📄 PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: '🗺️ İl Genel Bakış', desc: 'Provincial Overview' },
          { id: 'districts', label: '📍 İlçe Detayları', desc: 'District Deep Dive' },
          { id: 'trends', label: '📈 Zaman Serisi', desc: 'Time Series' },
          { id: 'comparison', label: '⚖️ Karşılaştırma', desc: 'Comparative Analysis' },
          { id: 'correlation', label: '🔗 Korelasyon', desc: 'Cross-Animal Intelligence' },
          { id: 'forecast', label: '🔮 Tahmin', desc: 'Forecasting' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'districts' | 'trends' | 'comparison' | 'correlation' | 'forecast')}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <div>{tab.label}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            🗺️ İl Genel Bakış
          </h2>
          
          {/* Top 10 İller - Intelligence Format Table */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🏆 Top 10 İl - Hayvan Popülasyonu Sıralaması
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      SIRA
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      İL
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      TOPLAM POPÜLASYON
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      BASKIN HAYVAN
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      BÜYÜME
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      PAZAR PAYI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top10Provinces.map((province, idx) => (
                    <tr 
                      key={province.province}
                      style={{ 
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => setSelectedProvince(province.province)}
                    >
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: idx === 0 ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' :
                                     idx === 1 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' :
                                     idx === 2 ? 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)' :
                                     'rgba(100, 116, 139, 0.08)',
                          color: idx < 3 ? 'white' : 'var(--text-primary)',
                          fontSize: '14px',
                          fontWeight: 700
                        }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {province.province}
                          </div>
                          <div style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: `${REGION_COLORS[province.region]}15`,
                            color: REGION_COLORS[province.region]
                          }}>
                            {province.region}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatNumber(province.totalPopulation)}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: `${getAnimalColor(province.dominantAnimal)}15`,
                          border: `1px solid ${getAnimalColor(province.dominantAnimal)}30`
                        }}>
                          <span style={{ fontSize: '16px' }}>{getAnimalIcon(province.dominantAnimal)}</span>
                          <span style={{ 
                            fontSize: '13px', 
                            fontWeight: 600,
                            color: getAnimalColor(province.dominantAnimal)
                          }}>
                            {province.dominantAnimal}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: province.growthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: province.growthRate >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {province.growthRate >= 0 ? '↗' : '↘'} {Math.abs(province.growthRate).toFixed(1)}%
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {province.marketShare.toFixed(2)}%
                        </div>
                        <div style={{
                          marginTop: '4px',
                          height: '4px',
                          borderRadius: '2px',
                          background: 'rgba(100, 116, 139, 0.1)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(province.marketShare * 10, 100)}%`,
                            background: 'linear-gradient(90deg, #3b82f6 0%, #22c55e 100%)',
                            borderRadius: '2px'
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Provincial Distribution Bar Chart */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                📊 İl Bazında Dağılım (Top 15)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={filteredProvincialData.slice(0, 15)}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="province" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => formatShort(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatNumber(value), 'Popülasyon']}
                  />
                  <Bar 
                    dataKey="totalPopulation" 
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Regional Distribution Pie Chart */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                🥧 Bölgesel Dağılım
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={regionalSummary}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }: { percent?: number }) => percent ? `${(percent * 100).toFixed(1)}%` : ''}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalPopulation"
                    nameKey="region"
                  >
                    {regionalSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatNumber(value), 'Popülasyon']}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Summary Cards */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🌍 Bölgesel Özet
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {regionalSummary.map(region => (
                <div
                  key={region.region}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: `${region.color}08`,
                    border: `1px solid ${region.color}30`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${region.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => setSelectedRegion(region.region)}
                >
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: region.color,
                    marginBottom: '8px'
                  }}>
                    {region.region}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '4px'
                  }}>
                    {formatNumber(region.totalPopulation)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px'
                  }}>
                    {region.provinceCount} il • Ort. {formatShort(region.averagePerProvince)}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: region.growthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: region.growthRate >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {region.growthRate >= 0 ? '↗' : '↘'} {Math.abs(region.growthRate).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Turkey Heatmap */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🗺️ Türkiye İl Dağılım Haritası (Coğrafi Bölgeler)
            </h3>
            {filteredProvincialData.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
                İl verileri yükleniyor…
              </div>
            ) : (
              <TurkeyHeatMap
                regionTotals={filteredProvincialData.map((item) => ({ 
                  name: item.province, 
                  value: item.totalPopulation, 
                  unit: 'baş' 
                }))}
                unitLabel="baş"
                height={450}
                fillMode="region"
                regionColors={REGION_COLORS}
                highlightRegion={selectedRegion !== 'Tümü' ? selectedRegion : undefined}
                dimNonSelected={selectedRegion !== 'Tümü'}
              />
            )}
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              * İller coğrafi bölgesine göre renklidir; tooltip'te il değerini görebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'districts' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            📍 İlçe Detay Analizi
          </h2>
          {selectedProvince ? (
            <div>
              {/* Province Info Header */}
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>Seçili İl</div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>{selectedProvince}</div>
                    <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>
                      {districtData.length} ilçe • {selectedAnimals.join(', ')} • {selectedYear.substring(1)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.85 }}>Toplam Popülasyon</div>
                      <div style={{ fontSize: '24px', fontWeight: 700 }}>
                        {formatNumber(districtData.reduce((sum, d) => sum + d.totalPopulation, 0))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.85 }}>Ortalama/İlçe</div>
                      <div style={{ fontSize: '24px', fontWeight: 700 }}>
                        {formatNumber(districtData.reduce((sum, d) => sum + d.totalPopulation, 0) / (districtData.length || 1))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* District Intelligence Table */}
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                  📊 İlçeler Detay Tablosu
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          SIRA
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          İLÇE
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          POPÜLASYON
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          BASKIN HAYVAN
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          İL İÇİ PAY
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          BÜYÜME
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          TREND
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {districtData.map((district, idx) => (
                        <tr 
                          key={district.district}
                          style={{ 
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: idx < 3 ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'rgba(100, 116, 139, 0.08)',
                              color: idx < 3 ? 'white' : 'var(--text-primary)',
                              fontSize: '13px',
                              fontWeight: 700
                            }}>
                              {idx + 1}
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {district.district}
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {formatNumber(district.totalPopulation)}
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: `${getAnimalColor(district.dominantAnimal)}15`,
                              border: `1px solid ${getAnimalColor(district.dominantAnimal)}30`
                            }}>
                              <span style={{ fontSize: '16px' }}>{getAnimalIcon(district.dominantAnimal)}</span>
                              <span style={{ 
                                fontSize: '13px', 
                                fontWeight: 600,
                                color: getAnimalColor(district.dominantAnimal)
                              }}>
                                {district.dominantAnimal}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                              {district.provinceShare.toFixed(2)}%
                            </div>
                            <div style={{
                              height: '4px',
                              borderRadius: '2px',
                              background: 'rgba(100, 116, 139, 0.1)',
                              overflow: 'hidden',
                              width: '80px',
                              marginLeft: 'auto'
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(district.provinceShare, 100)}%`,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                                borderRadius: '2px'
                              }} />
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              background: district.growthRate >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: district.growthRate >= 0 ? '#22c55e' : '#ef4444'
                            }}>
                              {district.growthRate >= 0 ? '↗' : '↘'} {Math.abs(district.growthRate).toFixed(1)}%
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: district.trend === 'increasing' ? 'rgba(34, 197, 94, 0.1)' : 
                                         district.trend === 'decreasing' ? 'rgba(239, 68, 68, 0.1)' : 
                                         'rgba(100, 116, 139, 0.1)',
                              color: district.trend === 'increasing' ? '#22c55e' : 
                                    district.trend === 'decreasing' ? '#ef4444' : 
                                    '#64748b'
                            }}>
                              {district.trend === 'increasing' ? '📈 Artış' : 
                               district.trend === 'decreasing' ? '📉 Düşüş' : 
                               '➡️ Sabit'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                gap: '24px'
              }}>
                {/* District Bar Chart */}
                <div style={{
                  background: 'var(--card-bg)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    📊 İlçe Popülasyon Dağılımı
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={districtData.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        type="number"
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                        tickFormatter={(value) => formatShort(value)}
                      />
                      <YAxis 
                        type="category"
                        dataKey="district" 
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [formatNumber(value), 'Popülasyon']}
                      />
                      <Bar 
                        dataKey="totalPopulation" 
                        fill="#8b5cf6"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Province Share Pie Chart */}
                <div style={{
                  background: 'var(--card-bg)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    🥧 İl İçi Pay Dağılımı (Top 10)
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={districtData.slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: unknown) => {
                          const data = entry as Record<string, string | number>;
                          return `${data.district} (${(data.provinceShare as number).toFixed(1)}%)`;
                        }}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="totalPopulation"
                      >
                        {districtData.slice(0, 10).map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${(index * 36) % 360}, 70%, 60%)`} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [formatNumber(value), 'Popülasyon']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '60px 40px',
              textAlign: 'center',
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📍</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                İl Seçimi Gerekli
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                İlçe detay analizi için lütfen yukarıdaki filtrelerden bir il seçin
              </p>
              <div style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                fontSize: '13px',
                fontWeight: 600
              }}>
                💡 İpucu: Tab 1'deki tabloda bir ile tıklayarak da seçebilirsiniz
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            📈 Zaman Serisi & Trendler
          </h2>

          {/* Year Range Selector */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Zaman Aralığı Presetleri
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { label: 'Son 5 Yıl', years: 5 },
                    { label: 'Son 10 Yıl', years: 10 },
                    { label: 'Son 15 Yıl', years: 15 },
                    { label: 'Tüm Veri (22 Yıl)', years: 22 }
                  ].map(preset => (
                    <button
                      key={preset.years}
                      onClick={() => {
                        // Future: setYearRange with preset values
                        // For now, just visual feedback
                        console.log(`Selected preset: ${preset.label}`);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--card-bg)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trend KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Başlangıç ({yearRange[0]})
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {yearlyTrendData.length > 0 ? formatNumber(yearlyTrendData[0].value) : '-'}
              </div>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Güncel ({yearRange[1]})
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {yearlyTrendData.length > 0 ? formatNumber(yearlyTrendData[yearlyTrendData.length - 1].value) : '-'}
              </div>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📈</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                CAGR (Bileşik Büyüme)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {yearlyTrendData.length > 1 ? (
                  <span style={{
                    color: calculateCAGR(yearlyTrendData[0].value, yearlyTrendData[yearlyTrendData.length - 1].value, yearlyTrendData.length - 1) >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {calculateCAGR(yearlyTrendData[0].value, yearlyTrendData[yearlyTrendData.length - 1].value, yearlyTrendData.length - 1).toFixed(2)}%/yıl
                  </span>
                ) : '-'}
              </div>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>💹</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Toplam Değişim
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {yearlyTrendData.length > 1 ? (
                  <span style={{
                    color: (yearlyTrendData[yearlyTrendData.length - 1].value - yearlyTrendData[0].value) >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {((yearlyTrendData[yearlyTrendData.length - 1].value - yearlyTrendData[0].value) / yearlyTrendData[0].value * 100).toFixed(1)}%
                  </span>
                ) : '-'}
              </div>
            </div>
          </div>

          {/* Time Series Chart */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📊 {yearRange[0]}-{yearRange[1]} Yılları Arası Hayvan Popülasyon Trendi
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={yearlyTrendData}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => formatShort(value)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Popülasyon']}
                  labelFormatter={(label) => `Yıl: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Year-over-Year Growth Chart */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📊 Yıllık Büyüme Oranları (YoY %)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={yearlyTrendData.map((item, idx) => {
                  if (idx === 0) return { year: item.year, growth: 0 };
                  const prevValue = yearlyTrendData[idx - 1].value;
                  const growth = prevValue > 0 ? ((item.value - prevValue) / prevValue) * 100 : 0;
                  return { year: item.year, growth };
                })}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Büyüme']}
                  labelFormatter={(label) => `Yıl: ${label}`}
                />
                <Bar 
                  dataKey="growth" 
                  fill="#22c55e"
                  radius={[8, 8, 0, 0]}
                >
                  {yearlyTrendData.map((entry, index) => {
                    if (index === 0) return <Cell key={`cell-${index}`} fill="#94a3b8" />;
                    const prevValue = yearlyTrendData[index - 1].value;
                    const growth = prevValue > 0 ? ((entry.value - prevValue) / prevValue) * 100 : 0;
                    return <Cell key={`cell-${index}`} fill={growth >= 0 ? '#22c55e' : '#ef4444'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            ⚖️ İller Arası Karşılaştırma
          </h2>

          {/* Top 20 Provinces Comparison */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📊 Top 20 İl Karşılaştırma
            </h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={filteredProvincialData.slice(0, 20)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => formatShort(value)}
                />
                <YAxis 
                  type="category"
                  dataKey="province" 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, _name: string, props: unknown) => {
                    const payload = (props as Record<string, Record<string, number>>).payload;
                    return [formatNumber(value), `Popülasyon (${payload.marketShare.toFixed(2)}% pazar payı)`];
                  }}
                />
                <Bar 
                  dataKey="totalPopulation" 
                  radius={[0, 8, 8, 0]}
                >
                  {filteredProvincialData.slice(0, 20).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Regional Comparison Cards */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🌍 Bölgesel Karşılaştırma Metrikleri
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {regionalSummary.map(region => (
                <div
                  key={region.region}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${region.color}15 0%, ${region.color}05 100%)`,
                    border: `2px solid ${region.color}30`
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: region.color,
                    marginBottom: '12px'
                  }}>
                    {region.region}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Toplam Popülasyon
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatNumber(region.totalPopulation)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        İl Sayısı
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {region.provinceCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Ortalama/İl
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatShort(region.averagePerProvince)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Büyüme
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: region.growthRate >= 0 ? '#22c55e' : '#ef4444'
                      }}>
                        {region.growthRate >= 0 ? '+' : ''}{region.growthRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'correlation' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            🔗 Hayvan Türleri Korelasyon Analizi
          </h2>

          {/* Animal Distribution by Top Provinces */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🐾 Hayvan Türü Dağılımı (Top 10 İl)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      İL
                    </th>
                    {selectedAnimals.map(animal => (
                      <th key={animal} style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: getAnimalColor(animal) }}>
                        {getAnimalIcon(animal)} {animal}
                      </th>
                    ))}
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      TOPLAM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top10Provinces.map(province => (
                    <tr 
                      key={province.province}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {province.province}
                        </div>
                      </td>
                      {selectedAnimals.map(animal => (
                        <td key={animal} style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {formatNumber(province.animalCounts[animal] || 0)}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            {province.totalPopulation > 0 ? 
                              ((province.animalCounts[animal] || 0) / province.totalPopulation * 100).toFixed(1) : 
                              '0.0'
                            }%
                          </div>
                        </td>
                      ))}
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatNumber(province.totalPopulation)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diversity Score Cards */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🌈 Çeşitlilik Skorları (Top 10)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {top10Provinces.map((province, idx) => {
                const diversityScore = Object.keys(province.animalCounts).length;
                return (
                  <div
                    key={province.province}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {province.province}
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: idx < 3 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                        color: idx < 3 ? '#22c55e' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        #{idx + 1}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: '#8b5cf6',
                      marginBottom: '4px'
                    }}>
                      {diversityScore}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      farklı hayvan türü
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            🔮 Tahmin & Projeksiyon
          </h2>

          {/* Forecast Info Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              📊 Gelecek Projeksiyonları
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Geçmiş trendlere dayalı olarak {yearRange[0]}-{yearRange[1]} yılları arasındaki büyüme oranları kullanılarak
              gelecek 3-5 yıl için tahminler yapılmaktadır.
            </div>
          </div>

          {/* Growth Projections for Top 5 Provinces */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📈 Top 5 İl Büyüme Projeksiyonları (2026-2028)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      İL
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      GÜNCEL (2025)
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      TAHMİN 2026
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      TAHMİN 2027
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      TAHMİN 2028
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      TREND
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top10Provinces.slice(0, 5).map(province => {
                    const growthRate = province.growthRate / 100;
                    const current = province.totalPopulation;
                    const forecast2026 = current * (1 + growthRate);
                    const forecast2027 = forecast2026 * (1 + growthRate);
                    const forecast2028 = forecast2027 * (1 + growthRate);

                    return (
                      <tr 
                        key={province.province}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '16px 8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {province.province}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            Büyüme: {province.growthRate.toFixed(1)}%/yıl
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatNumber(current)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>
                            {formatNumber(forecast2026)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>
                            {formatNumber(forecast2027)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#8b5cf6' }}>
                            {formatNumber(forecast2028)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '20px',
                            background: growthRate > 0 ? 'rgba(34, 197, 94, 0.1)' : growthRate < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)'
                          }}>
                            {growthRate > 0 ? '🚀' : growthRate < 0 ? '📉' : '➡️'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenario Analysis */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {['Optimistic', 'Realistic', 'Pessimistic'].map((scenario, idx) => {
              const multipliers = [1.5, 1.0, 0.5];
              const totalCurrent = metrics.totalPopulation;
              const avgGrowth = metrics.avgGrowthRate / 100;
              const scenarioGrowth = avgGrowth * multipliers[idx];
              const forecast2028 = totalCurrent * Math.pow(1 + scenarioGrowth, 3);
              const colors = ['#22c55e', '#3b82f6', '#f59e0b'];

              return (
                <div
                  key={scenario}
                  style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: `2px solid ${colors[idx]}30`
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: colors[idx],
                    marginBottom: '12px'
                  }}>
                    {scenario === 'Optimistic' ? '🌟 İyimser Senaryo' : 
                     scenario === 'Realistic' ? '🎯 Gerçekçi Senaryo' : 
                     '⚠️ Kart Senaryo'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '16px'
                  }}>
                    Yıllık büyüme: <strong>{(scenarioGrowth * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '8px'
                  }}>
                    {formatNumber(forecast2028)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    2028 Tahmini
                  </div>
                  <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: `${colors[idx]}10`,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors[idx],
                    textAlign: 'center'
                  }}>
                    {((forecast2028 - totalCurrent) / totalCurrent * 100).toFixed(1)}% artış
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
