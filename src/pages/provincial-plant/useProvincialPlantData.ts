import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchQuery } from '../../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getRegionByProvince } from '../../utils/productionCategories';
import type {
  ProvincialData,
  DistrictData,
  YearlyTrendData,
  RegionalSummary,
  AggregatedMetrics,
} from './provincialPlantUtils';
import {
  TABLE_NAME,
  YEARS,
  DEFAULT_PRODUCTS,
  REGION_COLORS,
  DEFAULT_METRICS,
} from './provincialPlantUtils';

export interface ProvincialPlantData {
  pageRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
  activeTab: string;
  setActiveTab: (v: string) => void;
  selectedYear: string;
  setSelectedYear: (v: string) => void;
  selectedProducts: string[];
  setSelectedProducts: (v: string[]) => void;
  selectedUnsur: string;
  setSelectedUnsur: (v: string) => void;
  selectedRegion: string;
  setSelectedRegion: (v: string) => void;
  selectedProvince: string | null;
  setSelectedProvince: (v: string | null) => void;
  yearRange: [number, number];
  setYearRange: (v: [number, number]) => void;
  productList: string[];
  provincialData: ProvincialData[];
  districtData: DistrictData[];
  yearlyTrendData: YearlyTrendData[];
  regionalSummary: RegionalSummary[];
  metrics: AggregatedMetrics;
  filteredProvincialData: ProvincialData[];
  top10Provinces: ProvincialData[];
  exportToExcel: () => void;
  exportToPDF: () => Promise<void>;
}

export function useProvincialPlantData(): ProvincialPlantData {
  const pageRef = useRef<HTMLDivElement>(null);

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
  const [metrics, setMetrics] = useState<AggregatedMetrics>(DEFAULT_METRICS);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load product list from database
  useEffect(() => {
    const loadProducts = async () => {
      try {
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

        const defaultSelection = DEFAULT_PRODUCTS.filter(p => products.includes(p));
        if (defaultSelection.length > 0) {
          setSelectedProducts(defaultSelection);
        } else if (products.length > 0) {
          setSelectedProducts(products.slice(0, Math.min(3, products.length)));
        }
      } catch (error) {
        console.error('Ürün listesi yüklenirken hata:', error);
        setProductList([]);
      }
    };

    loadProducts();
  }, []);

  // Data Loading Functions
  const loadProvincialData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setProvincialData([]);
      setRegionalSummary([]);
      setMetrics(DEFAULT_METRICS);
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
    if (!pageRef.current) return;
    const canvas = await html2canvas(pageRef.current);
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

  return {
    pageRef,
    loading,
    activeTab,
    setActiveTab,
    selectedYear,
    setSelectedYear,
    selectedProducts,
    setSelectedProducts,
    selectedUnsur,
    setSelectedUnsur,
    selectedRegion,
    setSelectedRegion,
    selectedProvince,
    setSelectedProvince,
    yearRange,
    setYearRange,
    productList,
    provincialData,
    districtData,
    yearlyTrendData,
    regionalSummary,
    metrics,
    filteredProvincialData,
    top10Provinces,
    exportToExcel,
    exportToPDF,
  };
}
