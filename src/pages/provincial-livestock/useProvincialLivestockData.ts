import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchQuery } from '../../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getRegionByProvince } from '../../utils/productionCategories';
import type {
  TabId,
  ProvincialData,
  DistrictData,
  YearlyTrendData,
  RegionalSummary,
  AggregatedMetrics,
} from './provincialLivestockUtils';
import {
  TABLE_NAME,
  YEAR_COLUMNS,
  REGION_COLORS,
  DEFAULT_METRICS,
} from './provincialLivestockUtils';

export interface ProvincialLivestockData {
  pageRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
  activeTab: TabId;
  setActiveTab: (v: TabId) => void;
  selectedYear: string;
  setSelectedYear: (v: string) => void;
  selectedAnimals: string[];
  setSelectedAnimals: (v: string[]) => void;
  selectedProvince: string | null;
  setSelectedProvince: (v: string | null) => void;
  selectedRegion: string;
  setSelectedRegion: (v: string) => void;
  yearRange: [number, number];
  provincialData: ProvincialData[];
  districtData: DistrictData[];
  yearlyTrendData: YearlyTrendData[];
  regionalSummary: RegionalSummary[];
  metrics: AggregatedMetrics;
  exportMenuOpen: boolean;
  setExportMenuOpen: (v: boolean) => void;
  filteredProvincialData: ProvincialData[];
  top10Provinces: ProvincialData[];
  exportToExcel: () => void;
  exportToPDF: () => Promise<void>;
}

export function useProvincialLivestockData(): ProvincialLivestockData {
  const pageRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [selectedYear, setSelectedYear] = useState<string>('y2024');
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>(['Sığır']);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('Tümü');
  const [yearRange] = useState<[number, number]>([2020, 2025]);

  const [provincialData, setProvincialData] = useState<ProvincialData[]>([]);
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const [yearlyTrendData, setYearlyTrendData] = useState<YearlyTrendData[]>([]);
  const [regionalSummary, setRegionalSummary] = useState<RegionalSummary[]>([]);
  const [metrics, setMetrics] = useState<AggregatedMetrics>(DEFAULT_METRICS);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Load Provincial Data
  const loadProvincialData = useCallback(async () => {
    setLoading(true);
    try {
      const yearCol = selectedYear;
      const prevYearCol = `y${parseInt(selectedYear.substring(1)) - 1}`;
      const animalFilter = selectedAnimals.length > 0
        ? `AND grup IN (${selectedAnimals.map(a => `'${a}'`).join(',')})`
        : '';

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

          const growth = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
          pData.growthRate += growth;
        });

        const provinceArray = Array.from(provinceMap.values());
        provinceArray.forEach(p => {
          let maxCount = 0;
          Object.entries(p.animalCounts).forEach(([animal, count]) => {
            if (count > maxCount) {
              maxCount = count;
              p.dominantAnimal = animal;
            }
          });
          p.marketShare = totalNational > 0 ? (p.totalPopulation / totalNational) * 100 : 0;
          const animalCount = Object.keys(p.animalCounts).length;
          if (animalCount > 0) {
            p.growthRate = p.growthRate / animalCount;
          }
        });

        provinceArray.sort((a, b) => b.totalPopulation - a.totalPopulation);
        provinceArray.forEach((p, idx) => p.rank = idx + 1);
        setProvincialData(provinceArray);

        const topProvince = provinceArray[0]?.province || '';
        const fastestGrowing = [...provinceArray].sort((a, b) => b.growthRate - a.growthRate)[0]?.province || '';
        const avgGrowth = provinceArray.reduce((sum, p) => sum + p.growthRate, 0) / (provinceArray.length || 1);
        const diversityScore = provinceArray.reduce((sum, p) => sum + Object.keys(p.animalCounts).length, 0) / (provinceArray.length || 1);

        setMetrics({
          totalPopulation: totalNational,
          provinceCount: provinceArray.length,
          districtCount: 0,
          animalTypeCount: selectedAnimals.length,
          avgGrowthRate: avgGrowth,
          topProvince,
          fastestGrowingProvince: fastestGrowing,
          diversityScore
        });

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

  // Load District Data
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

          if (currentVal > (dData.maxAnimalCount || 0)) {
            dData.maxAnimalCount = currentVal;
            dData.dominantAnimal = animal;
          }

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
        setMetrics(prev => ({ ...prev, districtCount: districtArray.length }));
      }
    } catch (error) {
      console.error('Error loading district data:', error);
    }
  }, [selectedProvince, selectedYear, selectedAnimals]);

  // Load Yearly Trend
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
  const exportToExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();

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
  }, [provincialData, districtData, selectedYear]);

  const exportToPDF = useCallback(async () => {
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
  }, [selectedYear]);

  // Computed
  const filteredProvincialData = useMemo(() => {
    let filtered = [...provincialData];
    if (selectedRegion !== 'Tümü') {
      filtered = filtered.filter(p => p.region === selectedRegion);
    }
    return filtered;
  }, [provincialData, selectedRegion]);

  const top10Provinces = useMemo(() => {
    return filteredProvincialData.slice(0, 10);
  }, [filteredProvincialData]);

  return {
    pageRef,
    loading,
    activeTab, setActiveTab,
    selectedYear, setSelectedYear,
    selectedAnimals, setSelectedAnimals,
    selectedProvince, setSelectedProvince,
    selectedRegion, setSelectedRegion,
    yearRange,
    provincialData,
    districtData,
    yearlyTrendData,
    regionalSummary,
    metrics,
    exportMenuOpen, setExportMenuOpen,
    filteredProvincialData,
    top10Provinces,
    exportToExcel,
    exportToPDF,
  };
}
