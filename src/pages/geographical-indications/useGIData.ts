import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fetchRows } from '../../services/d1';

// Coğrafi işaret listesinden çıkarılan gıda dışı ürün grupları.
const HARIC_URUN_GRUPLARI = [
  'Halılar, kilimler ve dokumalar dışında kalan el sanatı ürünleri',
  'Dokumalar',
  'Halılar ve kilimler',
  'Tütün',
];
import { getRegionByProvince } from '../../utils/productionCategories';
import type { GIProduct, ProvinceData, ProductGroupData, YearlyTrend, GIMetrics } from './giTypes';

export type TabId = 'overview' | 'provinces' | 'products' | 'trends' | 'table';

export function useGIData() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedProvince, setSelectedProvince] = useState<string>('Tümü');
  const [selectedStatus, setSelectedStatus] = useState<string>('Tümü');
  const [selectedType, setSelectedType] = useState<string>('Tümü');
  const [selectedGroup, setSelectedGroup] = useState<string>('Tümü');
  const [searchTerm, setSearchTerm] = useState('');

  const [allProducts, setAllProducts] = useState<GIProduct[]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([]);
  const [productGroupData, setProductGroupData] = useState<ProductGroupData[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<YearlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Sütun adlarında Türkçe karakter ve boşluk var; takma adlar ve
      // NOT IN / IS NOT NULL süzgeçleri istemcide.
      const satirlar = (await fetchRows('tr/cografi-isaret', { limit: 10000 }))
        .map((r) => ({
          id: r.id,
          name: String(r['Coğrafi Işaretin Adı'] ?? ''),
          fileNumber: String(r['Dosya Numarası'] ?? ''),
          applicationDate: String(r['Başvuru Tarihi'] ?? ''),
          registrationNumber: String(r['Tescil Numarası'] ?? ''),
          registrationDate: String(r['Tescil Tarihi'] ?? ''),
          type: String(r['Türü'] ?? ''),
          productGroup: String(r['Ürün grubu'] ?? ''),
          province: String(r['İl'] ?? ''),
          applicant: String(r['Başvuru Yapan/Tescil Ettiren'] ?? ''),
          status: String(r['Durumu'] ?? ''),
        }))
        .filter((r) => r.productGroup !== '' && !HARIC_URUN_GRUPLARI.includes(r.productGroup)
          && r.province !== 'Yurtdışı')
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

      const products: GIProduct[] = satirlar.map((row) => {
        let province = String(row.province || '');
        if (province === 'Zinguldak') province = 'Zonguldak';

        return {
          id: String(row.id),
          name: String(row.name || ''),
          fileNumber: String(row.fileNumber || ''),
          applicationDate: String(row.applicationDate || ''),
          registrationNumber: String(row.registrationNumber || ''),
          registrationDate: String(row.registrationDate || ''),
          type: String(row.type || ''),
          productGroup: String(row.productGroup || ''),
          province,
          applicant: String(row.applicant || ''),
          status: String(row.status || '')
        };
      });

      setAllProducts(products);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Calculate province statistics
  useEffect(() => {
    if (allProducts.length === 0) return;

    const provinceMap = new Map<string, { total: number; registered: number; pending: number }>();

    allProducts.forEach(product => {
      if (product.province && product.province !== 'Yurtdışı') {
        const current = provinceMap.get(product.province) || { total: 0, registered: 0, pending: 0 };
        current.total++;
        if (product.status === 'Tescilli') {
          current.registered++;
        } else {
          current.pending++;
        }
        provinceMap.set(product.province, current);
      }
    });

    const data: ProvinceData[] = Array.from(provinceMap.entries()).map(([province, stats]) => ({
      province,
      totalProducts: stats.total,
      registered: stats.registered,
      pending: stats.pending,
      region: getRegionByProvince(province)
    })).sort((a, b) => b.totalProducts - a.totalProducts);

    setProvinceData(data);
  }, [allProducts]);

  // Calculate product group statistics
  useEffect(() => {
    if (allProducts.length === 0) return;

    const groupMap = new Map<string, { total: number; registered: number; pending: number }>();

    allProducts.forEach(product => {
      if (product.productGroup) {
        const current = groupMap.get(product.productGroup) || { total: 0, registered: 0, pending: 0 };
        current.total++;
        if (product.status === 'Tescilli') {
          current.registered++;
        } else {
          current.pending++;
        }
        groupMap.set(product.productGroup, current);
      }
    });

    const data: ProductGroupData[] = Array.from(groupMap.entries()).map(([group, stats]) => ({
      group,
      count: stats.total,
      registered: stats.registered,
      pending: stats.pending
    })).sort((a, b) => b.count - a.count);

    setProductGroupData(data);
  }, [allProducts]);

  // Calculate yearly trends
  useEffect(() => {
    if (allProducts.length === 0) return;

    const yearMap = new Map<string, { registered: number; applications: number }>();

    allProducts.forEach(product => {
      if (product.registrationDate && product.registrationDate !== '-') {
        const year = product.registrationDate.split('.')[2] || product.registrationDate.split('/')[2];
        if (year && year.length === 4) {
          const current = yearMap.get(year) || { registered: 0, applications: 0 };
          current.registered++;
          yearMap.set(year, current);
        }
      }

      if (product.applicationDate) {
        const year = product.applicationDate.split('.')[2] || product.applicationDate.split('/')[2];
        if (year && year.length === 4) {
          const current = yearMap.get(year) || { registered: 0, applications: 0 };
          current.applications++;
          yearMap.set(year, current);
        }
      }
    });

    const data: YearlyTrend[] = Array.from(yearMap.entries())
      .map(([year, stats]) => ({ year, registered: stats.registered, applications: stats.applications }))
      .filter(d => parseInt(d.year) >= 2000)
      .sort((a, b) => a.year.localeCompare(b.year));

    setYearlyTrend(data);
  }, [allProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      if (selectedProvince !== 'Tümü' && product.province !== selectedProvince) return false;
      if (selectedStatus !== 'Tümü' && product.status !== selectedStatus) return false;
      if (selectedType !== 'Tümü' && product.type !== selectedType) return false;
      if (selectedGroup !== 'Tümü' && product.productGroup !== selectedGroup) return false;
      if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [allProducts, selectedProvince, selectedStatus, selectedType, selectedGroup, searchTerm]);

  // Type distribution for pie chart
  const typeData = useMemo(() => {
    const typeMap = new Map<string, number>();
    allProducts.forEach(p => {
      if (p.type) typeMap.set(p.type, (typeMap.get(p.type) || 0) + 1);
    });
    return Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [allProducts]);

  // KPI Metrics
  const metrics = useMemo<GIMetrics>(() => {
    const total = allProducts.length;
    const registered = allProducts.filter(p => p.status === 'Tescilli').length;
    const pending = allProducts.filter(p => p.status === 'Başvuru').length;
    const provinceCount = new Set(allProducts.filter(p => p.province !== 'Yurtdışı').map(p => p.province)).size;
    const productGroupCount = new Set(allProducts.map(p => p.productGroup)).size;
    const typeCount = new Set(allProducts.map(p => p.type)).size;

    return { total, registered, pending, provinceCount, productGroupCount, typeCount };
  }, [allProducts]);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredProducts.map(p => ({
      'Adı': p.name,
      'Dosya No': p.fileNumber,
      'Başvuru Tarihi': p.applicationDate,
      'Tescil No': p.registrationNumber,
      'Tescil Tarihi': p.registrationDate,
      'Tür': p.type,
      'Ürün Grubu': p.productGroup,
      'İl': p.province,
      'Başvuran': p.applicant,
      'Durum': p.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Coğrafi İşaretli Gıda');
    XLSX.writeFile(wb, `cografi-isaretli-gida-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return {
    loading,
    activeTab,
    setActiveTab,
    selectedProvince,
    setSelectedProvince,
    selectedStatus,
    setSelectedStatus,
    selectedType,
    setSelectedType,
    selectedGroup,
    setSelectedGroup,
    searchTerm,
    setSearchTerm,
    allProducts,
    provinceData,
    productGroupData,
    yearlyTrend,
    filteredProducts,
    metrics,
    typeData,
    exportToExcel,
  };
}
