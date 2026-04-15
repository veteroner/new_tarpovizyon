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
const TABLE_NAME = 'tuik_bitkisel_uretim';
const YEARS = Array.from({ length: 21 }, (_, i) => 2004 + i); // 2004-2024

// Populer ürünler için varsayılan seçimler (veritabanındaki gerçek isimler)
const DEFAULT_PRODUCTS = [
  'Buğday, Durum Buğdayı Hariç',
  'Mısır',
  'Ayçiçeği Tohumu (Yağlık)'
];

const UNSUR_OPTIONS = [
  { id: 'Üretim', label: 'Üretim', unit: 'ton' },
  { id: 'Ekilen Alan', label: 'Ekilen Alan', unit: 'dekar' },
  { id: 'Verim', label: 'Verim', unit: 'kg/dekar' },
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
  totalProduction: number;
  growthRate: number;
  dominantProduct: string;
  productAmounts: Record<string, number>;
  marketShare: number;
  rank: number;
}

interface DistrictData {
  district: string;
  province: string;
  totalProduction: number;
  provinceShare: number;
  dominantProduct: string;
  growthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface YearlyTrendData {
  year: number;
  value: number;
}

interface RegionalSummary {
  region: string;
  totalProduction: number;
  provinceCount: number;
  averagePerProvince: number;
  growthRate: number;
  color: string;
}

interface AggregatedMetrics {
  totalProduction: number;
  leaderProvince: string;
  fastestGrowing: string;
  activeProvinces: number;
  avgGrowthRate: number;
}

export default function TurkeyProvincialPlantPage() {
  const [selectedYear, setSelectedYear] = useState('y2024');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedUnsur, setSelectedUnsur] = useState('Üretim');
  const [selectedRegion, setSelectedRegion] = useState('Tümü');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([2019, 2024]);
  
  const [productList, setProductList] = useState<string[]>([]);
  const [provincialData, setProvincialData] = useState<ProvincialData[]>([]);
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [yearlyTrendData, setYearlyTrendData] = useState<YearlyTrendData[]>([]);
  const [regionalSummary, setRegionalSummary] = useState<RegionalSummary[]>([]);
  const [metrics, setMetrics] = useState<AggregatedMetrics>({
    totalProduction: 0,
    leaderProvince: '',
    fastestGrowing: '',
    activeProvinces: 0,
    avgGrowthRate: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  // Utility Functions
  const formatNumber = (value: number): string => {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Milyar';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + ' Milyon';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + ' Bin';
    return value.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  };

  const formatShort = (value: number): string => {
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
    return value.toFixed(0);
  };

  // Load product list from database
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // En popüler ürünleri getir (üretim miktarına göre)
        const query = `
          SELECT DISTINCT urun, 
                 SUM(CAST(y2024 AS DECIMAL(20,2))) as total_production
          FROM ${TABLE_NAME}
          WHERE duzeykod='3' 
            AND unsur='Üretim'
            AND yer NOT IN ('TOPLAM', 'Toplam', 'TÜRKİYE', 'Türkiye')
          GROUP BY urun
          HAVING total_production > 0
          ORDER BY total_production DESC
          LIMIT 50
        `;
        
        const response = await fetchQuery(query);
        const products = (response.data || []).map((row: Record<string, string | number>) => String(row.urun));
        
        setProductList(products);
        
        // Varsayılan ürünleri seç (eğer listede varsa)
        const defaultSelection = DEFAULT_PRODUCTS.filter(p => products.includes(p));
        if (defaultSelection.length > 0) {
          setSelectedProducts(defaultSelection);
        } else if (products.length > 0) {
          // Eğer varsayılan ürünler yoksa, ilk 3 ürünü seç
          setSelectedProducts(products.slice(0, Math.min(3, products.length)));
        }
      } catch (error) {
        console.error('Ürün listesi yüklenirken hata:', error);
        setProductList([]);
      }
    };
    
    loadProducts();
  }, []);

  const calculateCAGR = (startValue: number, endValue: number, years: number): number => {
    if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  };

  // Ürün renk ve icon yardımcıları
  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
  ];

  const getProductColor = (name: string): string => {
    // Ürün adına göre tutarlı renk ata
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLORS[hash % COLORS.length];
  };

  const getProductIcon = (name: string): string => {
    // Ürün türüne göre icon
    const nameLower = name.toLowerCase();
    if (nameLower.includes('buğday')) return '🌾';
    if (nameLower.includes('arpa')) return '🌾';
    if (nameLower.includes('mısır')) return '🌽';
    if (nameLower.includes('çeltik')) return '🌾';
    if (nameLower.includes('ayçiçeği')) return '🌻';
    if (nameLower.includes('pamuk')) return '☁️';
    if (nameLower.includes('domates')) return '🍅';
    if (nameLower.includes('patates')) return '🥔';
    if (nameLower.includes('soğan')) return '🧅';
    if (nameLower.includes('pancar')) return '🥕';
    if (nameLower.includes('elma')) return '🍎';
    if (nameLower.includes('portakal')) return '🍊';
    if (nameLower.includes('üzüm')) return '🍇';
    if (nameLower.includes('meyve') || nameLower.includes('meyve')) return '🍎';
    if (nameLower.includes('sebze')) return '🥬';
    return '🌾';
  };

  // Data Loading Functions
  const loadProvincialData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setProvincialData([]);
      setRegionalSummary([]);
      setMetrics({
        totalProduction: 0,
        leaderProvince: '',
        fastestGrowing: '',
        activeProvinces: 0,
        avgGrowthRate: 0
      });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const productFilter = selectedProducts.map(p => `'${p}'`).join(',');
      const prevYear = `y${parseInt(selectedYear.substring(1)) - 1}`;
      
      const query = `
        SELECT 
          yer as province,
          SUM(CAST(${selectedYear} AS DECIMAL(20,2))) as current_value,
          SUM(CAST(${prevYear} AS DECIMAL(20,2))) as prev_value
        FROM ${TABLE_NAME}
        WHERE unsur='${selectedUnsur}' 
          AND urun IN (${productFilter})
          AND duzeykod='3'
          AND yer NOT IN ('TOPLAM', 'Toplam', 'TÜRKİYE', 'Türkiye')
        GROUP BY yer
        HAVING current_value > 0
        ORDER BY current_value DESC
      `;

      const response = await fetchQuery(query);
      const data = response.data || [];

      const total = data.reduce((sum: number, row: Record<string, string | number>) => sum + (parseFloat(String(row.current_value)) || 0), 0);
      
      const processed: ProvincialData[] = data.map((row: Record<string, string | number>, idx: number) => {
        const currentVal = parseFloat(String(row.current_value)) || 0;
        const prevVal = parseFloat(String(row.prev_value)) || 0;
        const growth = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
        const region = getRegionByProvince(String(row.province)) || 'Diğer';

        return {
          province: String(row.province),
          region,
          totalProduction: currentVal,
          growthRate: growth,
          dominantProduct: selectedProducts[0] || 'Bilinmiyor',
          productAmounts: { [selectedProducts[0] || 'default']: currentVal },
          marketShare: (currentVal / total) * 100,
          rank: idx + 1
        };
      });

      setProvincialData(processed);

      // Regional Summary
      const regionMap = new Map<string, { total: number; count: number; growths: number[] }>();
      processed.forEach(p => {
        const existing = regionMap.get(p.region) || { total: 0, count: 0, growths: [] };
        existing.total += p.totalProduction;
        existing.count += 1;
        existing.growths.push(p.growthRate);
        regionMap.set(p.region, existing);
      });

      const regions: RegionalSummary[] = Array.from(regionMap.entries()).map(([region, data]) => ({
        region,
        totalProduction: data.total,
        provinceCount: data.count,
        averagePerProvince: data.total / data.count,
        growthRate: data.growths.reduce((a, b) => a + b, 0) / data.growths.length,
        color: REGION_COLORS[region] || '#64748b'
      }));

      setRegionalSummary(regions);

      // Metrics
      const leader = processed[0]?.province || '';
      const fastest = processed.reduce((max, p) => p.growthRate > max.growthRate ? p : max, processed[0] || { growthRate: 0, province: '' });
      
      setMetrics({
        totalProduction: total,
        leaderProvince: leader,
        fastestGrowing: fastest?.province || '',
        activeProvinces: processed.length,
        avgGrowthRate: processed.reduce((sum, p) => sum + p.growthRate, 0) / processed.length
      });

    } catch (error) {
      console.error('Error loading provincial data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedProducts, selectedUnsur]);

  const loadDistrictData = useCallback(async () => {
    if (!selectedProvince || selectedProducts.length === 0) {
      setDistrictData([]);
      return;
    }

    setLoading(true);
    try {
      const productFilter = selectedProducts.map(p => `'${p}'`).join(',');
      const prevYear = `y${parseInt(selectedYear.substring(1)) - 1}`;

      const query = `
        SELECT 
          yer as district,
          SUM(CAST(${selectedYear} AS DECIMAL(20,2))) as current_value,
          SUM(CAST(${prevYear} AS DECIMAL(20,2))) as prev_value
        FROM ${TABLE_NAME}
        WHERE unsur='${selectedUnsur}'
          AND urun IN (${productFilter})
          AND duzeykod='4'
          AND ili='${selectedProvince}'
          AND yer IS NOT NULL
          AND yer != ''
          AND yer NOT IN ('TOPLAM', 'Toplam')
        GROUP BY yer
        HAVING current_value > 0
        ORDER BY current_value DESC
      `;

      const response = await fetchQuery(query);
      const data = response.data || [];

      const provinceTotal = data.reduce((sum: number, row: Record<string, string | number>) => sum + (parseFloat(String(row.current_value)) || 0), 0);

      const processed: DistrictData[] = data.map((row: Record<string, string | number>) => {
        const currentVal = parseFloat(String(row.current_value)) || 0;
        const prevVal = parseFloat(String(row.prev_value)) || 0;
        const growth = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
        
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (growth > 2) trend = 'increasing';
        else if (growth < -2) trend = 'decreasing';

        return {
          district: String(row.district),
          province: selectedProvince,
          totalProduction: currentVal,
          provinceShare: (currentVal / provinceTotal) * 100,
          dominantProduct: selectedProducts[0] || 'Bilinmiyor',
          growthRate: growth,
          trend
        };
      });

      setDistrictData(processed);
    } catch (error) {
      console.error('Error loading district data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProvince, selectedYear, selectedProducts, selectedUnsur]);

  const loadYearlyTrend = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setYearlyTrendData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const productFilter = selectedProducts.map(p => `'${p}'`).join(',');
      const yearCols = YEARS.map(y => `SUM(CAST(y${y} AS DECIMAL(20,2))) as y${y}`).join(', ');

      const query = `
        SELECT ${yearCols}
        FROM ${TABLE_NAME}
        WHERE unsur='${selectedUnsur}'
          AND urun IN (${productFilter})
          AND duzeykod='3'
          AND yer NOT IN ('TOPLAM', 'Toplam', 'TÜRKİYE', 'Türkiye')
      `;

      const response = await fetchQuery(query);
      if (response.data && response.data.length > 0) {
        const row = response.data[0];
        const trendData: YearlyTrendData[] = YEARS.map(year => ({
          year,
          value: parseFloat(String(row[`y${year}`])) || 0
        }));

        setYearlyTrendData(trendData);
      }
    } catch (error) {
      console.error('Error loading yearly trend:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedUnsur]);

  // Effects
  useEffect(() => {
    loadProvincialData();
  }, [loadProvincialData]);

  useEffect(() => {
    loadDistrictData();
  }, [loadDistrictData]);

  useEffect(() => {
    if (activeTab === 'trends') {
      loadYearlyTrend();
    }
  }, [activeTab, loadYearlyTrend]);

  // Export Functions
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(provincialData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'İl Bitkisel Üretim');
    XLSX.writeFile(wb, `il-bitkisel-uretim-${selectedYear}.xlsx`);
  };

  const exportToPDF = async () => {
    if (!contentRef.current) return;
    const canvas = await html2canvas(contentRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`il-bitkisel-uretim-${selectedYear}.pdf`);
  };

  // Filtered Data
  const filteredProvincialData = useMemo(() => {
    let filtered = provincialData;
    if (selectedRegion !== 'Tümü') {
      filtered = filtered.filter(p => p.region === selectedRegion);
    }
    return filtered;
  }, [provincialData, selectedRegion]);

  const top10Provinces = useMemo(() => filteredProvincialData.slice(0, 10), [filteredProvincialData]);

  if (loading && provincialData.length === 0) return <Loading />;

  return (
    <div ref={contentRef} style={{ padding: '24px', background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '36px' }}>🌾</span>
          İl ve İlçe Bazlı Bitkisel Üretim Analizi
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Detaylı coğrafi analiz, trend izleme ve tahmin platformu
        </p>
      </div>

      {/* KPI Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* KPI 1: Toplam Üretim */}
        <div style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(34, 197, 94, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            {selectedUnsur === 'Üretim' ? '🌾 Toplam Üretim' : selectedUnsur === 'Ekilen Alan' ? '📏 Toplam Ekilen Alan' : '📊 Toplam Verim'}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>
            {formatNumber(metrics.totalProduction)}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            {UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || 'birim'}
          </div>
        </div>

        {/* KPI 2: Lider İl */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            🏆 Lider İl
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
            {metrics.leaderProvince}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            En yüksek üretim
          </div>
        </div>

        {/* KPI 3: En Hızlı Büyüyen */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            📈 En Hızlı Büyüyen
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
            {metrics.fastestGrowing}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            Yıllık büyüme bazlı
          </div>
        </div>

        {/* KPI 4: Aktif İl Sayısı */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          boxShadow: '0 8px 16px rgba(139, 92, 246, 0.2)'
        }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 600 }}>
            🗺️ Aktif İl Sayısı
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>
            {metrics.activeProvinces}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            İl verileri yükleniyor
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          alignItems: 'end'
        }}>
          {/* Year Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📅 YIL SEÇİMİ
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {[...YEARS].reverse().map(year => (
                <option key={year} value={`y${year}`}>{year}</option>
              ))}
            </select>
          </div>

          {/* Unsur Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📊 UNSUR
            </label>
            <select
              value={selectedUnsur}
              onChange={(e) => setSelectedUnsur(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {UNSUR_OPTIONS.map(unsur => (
                <option key={unsur.id} value={unsur.id}>{unsur.label}</option>
              ))}
            </select>
          </div>

          {/* Product Multi-Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              🌾 ÜRÜN SEÇİMİ (Max 5)
            </label>
            <div style={{ position: 'relative' }}>
              <select
                multiple
                value={selectedProducts}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  if (selected.length <= 5) {
                    setSelectedProducts(selected);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '48px'
                }}
              >
                {productList.map(product => (
                  <option key={product} value={product}>
                    {getProductIcon(product)} {product}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Region Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              🗺️ BÖLGE FİLTRESİ
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="Tümü">Tüm Bölgeler</option>
              {Object.keys(REGION_COLORS).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Province Selector for Districts */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              🏙️ İLÇE ANALİZİ İÇİN İL
            </label>
            <select
              value={selectedProvince || ''}
              onChange={(e) => setSelectedProvince(e.target.value || null)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="">İl Seçiniz</option>
              {provincialData.slice(0, 30).map(p => (
                <option key={p.province} value={p.province}>{p.province}</option>
              ))}
            </select>
          </div>

          {/* Export Menu */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📥 DIŞA AKTAR
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={exportToExcel}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #22c55e',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📊 Excel
              </button>
              <button
                onClick={exportToPDF}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📄 PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'overview', icon: '🗺️', label: 'İl Genel Bakış', desc: 'Provincial Overview' },
          { id: 'districts', icon: '📍', label: 'İlçe Detayları', desc: 'District Deep Dive' },
          { id: 'trends', icon: '📈', label: 'Zaman Serisi', desc: 'Time Series & Trends' },
          { id: 'comparison', icon: '⚖️', label: 'Karşılaştırma', desc: 'Comparative Analysis' },
          { id: 'correlation', icon: '🔗', label: 'Korelasyon', desc: 'Ürünler arası içgörü' },
          { id: 'forecast', icon: '🔮', label: 'Tahmin', desc: 'Forecasting & Projection' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '16px 24px',
              borderRadius: '12px',
              border: activeTab === tab.id ? '2px solid #3b82f6' : '1px solid var(--border)',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-bg)',
              color: activeTab === tab.id ? '#3b82f6' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              minWidth: '180px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
            <div style={{ fontSize: '10px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {tab.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
            🗺️ İl Genel Bakış
          </h2>

          {/* Top 10 Provinces Intelligence Table */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🏆 Top 10 İl
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRETİM</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BASKIN ÜRÜN</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BÜYÜME</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>PAZAR PAYI</th>
                  </tr>
                </thead>
                <tbody>
                  {top10Provinces.map((province, idx) => (
                    <tr
                      key={province.province}
                      onClick={() => {
                        setSelectedProvince(province.province);
                        setActiveTab('districts');
                      }}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(100, 116, 139, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: idx < 3 ? `linear-gradient(135deg, ${['#fbbf24', '#94a3b8', '#cd7f32'][idx]} 0%, ${['#f59e0b', '#64748b', '#a0522d'][idx]} 100%)` : 'rgba(100, 116, 139, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 800,
                          color: idx < 3 ? 'white' : 'var(--text-secondary)'
                        }}>
                          {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {province.province}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: `${REGION_COLORS[province.region] || '#64748b'}15`,
                          color: REGION_COLORS[province.region] || '#64748b',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {province.region}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatNumber(province.totalProduction)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || ''}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: `${getProductColor(province.dominantProduct)}15`,
                          color: getProductColor(province.dominantProduct),
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          <span>{getProductIcon(province.dominantProduct)}</span>
                          <span>{province.dominantProduct}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: province.growthRate >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                          <span>{province.growthRate >= 0 ? '↗' : '↘'}</span>
                          <span>{province.growthRate >= 0 ? '+' : ''}{province.growthRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          {province.marketShare.toFixed(2)}%
                        </div>
                        <div style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(100, 116, 139, 0.1)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(province.marketShare * 5, 100)}%`,
                            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: '3px'
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regional Distribution Pie Chart */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px'
          }}>
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={regionalSummary}
                    dataKey="totalProduction"
                    nameKey="region"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ percent }: { percent?: number }) => percent ? `${(percent * 100).toFixed(1)}%` : ''}
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
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                📊 İl Dağılımı (Top 15)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={filteredProvincialData.slice(0, 15)}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="category"
                    dataKey="province"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    type="number"
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
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Bar
                    dataKey="totalProduction"
                    radius={[8, 8, 0, 0]}
                  >
                    {filteredProvincialData.slice(0, 15).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[entry.region] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '24px'
          }}>
            {regionalSummary.map(region => (
              <div
                key={region.region}
                onClick={() => setSelectedRegion(region.region)}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${region.color}15 0%, ${region.color}05 100%)`,
                  border: `2px solid ${selectedRegion === region.region ? region.color : `${region.color}30`}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: region.color,
                  marginBottom: '8px'
                }}>
                  {region.region}
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>
                  {formatShort(region.totalProduction)}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)'
                }}>
                  {region.provinceCount} il • Ort: {formatShort(region.averagePerProvince)}
                </div>
              </div>
            ))}
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
                  value: item.totalProduction, 
                  unit: UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || 'ton'
                }))}
                unitLabel={UNSUR_OPTIONS.find(u => u.id === selectedUnsur)?.unit || 'ton'}
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
            <>
              {/* Province Header */}
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                color: 'white'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>
                  {selectedProvince}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Toplam İlçe Üretimi</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {formatNumber(districtData.reduce((sum, d) => sum + d.totalProduction, 0))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>İlçe Başına Ortalama</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {formatShort(districtData.reduce((sum, d) => sum + d.totalProduction, 0) / (districtData.length || 1))}
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
                  📋 İlçe Detayları
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SIRA</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İLÇE</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ÜRETİM</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BASKIN ÜRÜN</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>İL PAYI</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>BÜYÜME</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>TREND</th>
                      </tr>
                    </thead>
                    <tbody>
                      {districtData.map((district, idx) => (
                        <tr
                          key={district.district}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: idx < 3 ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: idx < 3 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.08)',
                              color: idx < 3 ? '#3b82f6' : 'var(--text-secondary)',
                              fontSize: '12px',
                              fontWeight: 700
                            }}>
                              #{idx + 1}
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {district.district}
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {formatNumber(district.totalProduction)}
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: `${getProductColor(district.dominantProduct)}15`,
                              color: getProductColor(district.dominantProduct),
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              <span>{getProductIcon(district.dominantProduct)}</span>
                              <span>{district.dominantProduct}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                              {district.provinceShare.toFixed(2)}%
                            </div>
                            <div style={{
                              height: '6px',
                              borderRadius: '3px',
                              background: 'rgba(100, 116, 139, 0.1)',
                              overflow: 'hidden',
                              width: '80px',
                              marginLeft: 'auto'
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(district.provinceShare, 100)}%`,
                                background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                                borderRadius: '3px'
                              }} />
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: district.growthRate >= 0 ? '#22c55e' : '#ef4444'
                            }}>
                              {district.growthRate >= 0 ? '+' : ''}{district.growthRate.toFixed(1)}%
                            </div>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: district.trend === 'increasing' ? 'rgba(34, 197, 94, 0.1)' : district.trend === 'decreasing' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.08)',
                              color: district.trend === 'increasing' ? '#22c55e' : district.trend === 'decreasing' ? '#ef4444' : 'var(--text-secondary)',
                              fontSize: '11px',
                              fontWeight: 600
                            }}>
                              <span>{district.trend === 'increasing' ? '📈' : district.trend === 'decreasing' ? '📉' : '➡️'}</span>
                              <span>{district.trend === 'increasing' ? 'Artış' : district.trend === 'decreasing' ? 'Düşüş' : 'Sabit'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* District Charts */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '24px'
              }}>
                <div style={{
                  background: 'var(--card-bg)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    📊 İlçe Üretim (Top 10)
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
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Bar
                        dataKey="totalProduction"
                        radius={[0, 8, 8, 0]}
                        fill="#3b82f6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{
                  background: 'var(--card-bg)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    🥧 İl Payı Dağılımı (Top 10)
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={districtData.slice(0, 10)}
                        dataKey="provinceShare"
                        nameKey="district"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={(entry: unknown) => {
                          const data = entry as Record<string, string | number>;
                          return `${data.district}: ${(data.provinceShare as number).toFixed(1)}%`;
                        }}
                        labelLine={{stroke: 'var(--text-secondary)', strokeWidth: 1}}
                      >
                        {districtData.slice(0, 10).map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={REGION_COLORS[Object.keys(REGION_COLORS)[index % 7]]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => `${value.toFixed(2)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                İlçe bazlı analiz için lütfen bir il seçiniz
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Yukarıdaki filtre panelinden "İLÇE ANALİZİ İÇİN İL" dropdown'ından seçim yapabilirsiniz.
              </p>
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
            border: '1px solid var(--border)'
          }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>
              📅 YIL ARALIĞI
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { label: 'Son 5 Yıl', years: 5 },
                { label: 'Son 10 Yıl', years: 10 },
                { label: 'Son 15 Yıl', years: 15 },
                { label: 'Tüm Veri (22 Yıl)', years: 22 }
              ].map(preset => (
                <button
                  key={preset.years}
                  onClick={() => {
                    setYearRange([2025 - preset.years + 1, 2025]);
                    console.log(`Year range set to ${preset.years} years`);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: yearRange[1] - yearRange[0] + 1 === preset.years ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg)',
                    color: yearRange[1] - yearRange[0] + 1 === preset.years ? '#3b82f6' : 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trend KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {(() => {
              const filteredTrend = yearlyTrendData.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]);
              const startValue = filteredTrend[0]?.value || 0;
              const currentValue = filteredTrend[filteredTrend.length - 1]?.value || 0;
              const cagr = calculateCAGR(startValue, currentValue, filteredTrend.length - 1);
              const totalChange = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;

              return (
                <>
                  <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Başlangıç Değeri ({yearRange[0]})
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatNumber(startValue)}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Güncel Değer ({yearRange[1]})
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatNumber(currentValue)}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      CAGR (Bileşik Büyüme)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: cagr >= 0 ? '#22c55e' : '#ef4444' }}>
                      {cagr >= 0 ? '+' : ''}{cagr.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Toplam Değişim
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: totalChange >= 0 ? '#22c55e' : '#ef4444' }}>
                      {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(1)}%
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* 22-Year Trend Area Chart */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📈 22 Yıllık Trend (2004-2025)
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={yearlyTrendData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                  formatter={(value: number) => formatNumber(value)}
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

          {/* Year-over-Year Growth */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📊 Yıllık Büyüme Oranları
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={yearlyTrendData.map((d, idx) => {
                  if (idx === 0) return { year: d.year, growth: 0 };
                  const prevValue = yearlyTrendData[idx - 1].value;
                  const growth = prevValue > 0 ? ((d.value - prevValue) / prevValue) * 100 : 0;
                  return { year: d.year, growth };
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
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Bar
                  dataKey="growth"
                  radius={[8, 8, 0, 0]}
                >
                  {yearlyTrendData.map((_entry, index) => {
                    if (index === 0) return <Cell key={`cell-${index}`} fill="#64748b" />;
                    const prevValue = yearlyTrendData[index - 1].value;
                    const currentValue = yearlyTrendData[index].value;
                    const growth = currentValue - prevValue;
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
                    return [formatNumber(value), `Üretim (${payload.marketShare.toFixed(2)}% pazar payı)`];
                  }}
                />
                <Bar 
                  dataKey="totalProduction" 
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
                        Toplam Üretim
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatNumber(region.totalProduction)}
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
            🔗 Ürün Türleri Korelasyon Analizi
          </h2>

          {/* Product Distribution by Top Provinces */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🌾 Ürün Türü Dağılımı (Top 10 İl)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      İL
                    </th>
                    {selectedProducts.map(product => (
                      <th key={product} style={{ padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: getProductColor(product) }}>
                        {getProductIcon(product)} {product}
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
                      {selectedProducts.map(product => (
                        <td key={product} style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {formatNumber(province.productAmounts[product] || 0)}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            {province.totalProduction > 0 ? 
                              ((province.productAmounts[product] || 0) / province.totalProduction * 100).toFixed(1) : 
                              '0.0'
                            }%
                          </div>
                        </td>
                      ))}
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatNumber(province.totalProduction)}
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
                const diversityScore = Object.keys(province.productAmounts).length;
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
                      farklı ürün türü
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
                    const current = province.totalProduction;
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
              const totalCurrent = metrics.totalProduction;
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
