import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAgg, num } from '../../services/d1';

const R = 'tuik/hayvancilik-canlihayvan';
// Toplam/ülke satırları (eski sorgulardaki NOT IN listesi).
const TOPLAM_SATIRLARI = ['TOPLAM', 'Toplam', 'TÜRKİYE', 'Türkiye', 'TOTAL', 'Total'];
const gecerliIl = (yer: unknown) => {
  const v = String(yer ?? '');
  return v !== '' && !TOPLAM_SATIRLARI.includes(v);
};
import {
  COLORS, YEARS, YEAR_COLUMNS,
  formatShort, calculateCAGR, linearRegression, detectAnomalies, getRegion,
} from './tuikLivestockTypes';
import type { CityDataItem, YearlyDataItem, CategoryDataItem, RegionalData, CorrelationData } from './tuikLivestockTypes';

export interface UseTuikLivestockDataReturn {
  selectedYear: string; setSelectedYear: (y: string) => void;
  selectedAnimal: string; setSelectedAnimal: (a: string) => void;
  selectedCategory: string; setSelectedCategory: (c: string) => void;
  selectedRegion: string; setSelectedRegion: (r: string) => void;
  activeTab: 'overview' | 'regional' | 'trends' | 'correlations';
  setActiveTab: (t: 'overview' | 'regional' | 'trends' | 'correlations') => void;
  loading: boolean;
  cityData: CityDataItem[];
  yearlyData: YearlyDataItem[];
  categoryData: CategoryDataItem[];
  categories: string[];
  totalValue: number;
  provinceCount: number;
  groupTotals: { grup: string; total: number }[];
  yearLabel: string;
  topCity: string;
  topCityValue: number;
  avgValue: number;
  yearChange: number;
  groupChartData: { name: string; value: number; fill: string; isSelected: boolean }[];
  growthData: { year: string; growth: number }[];
  regionalAnalysis: RegionalData[];
  cityDataForSelectedRegion: CityDataItem[];
  totalSelectedRegion: number;
  regressionAnalysis: { slope: number; intercept: number; r2: number; predictions: { year: string; value: number; isPrediction: boolean }[] } | null;
  cagrAnalysis: { overall: number; last5Years: number; startYear: string; endYear: string; startValue: number; endValue: number } | null;
  anomalies: { index: number; value: number; deviation: number; year: string }[];
  scatterData: { x: number; y: number; z: number; year: string }[];
  heatmapData: { province: string; value: number; intensity: number }[];
  sankeyData: { nodes: { name: string }[]; links: { source: number; target: number; value: number }[] };
  correlationLinks: CorrelationData[];
}

export function useTuikLivestockData(): UseTuikLivestockDataReturn {
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
  const [groupTotals, setGroupTotals] = useState<{ grup: string; total: number }[]>([]);

  useEffect(() => {
    const loadGroupTotals = async () => {
      try {
        // yer NOT IN (…) / boş süzgeci istemcide; grup toplamı sonra alınıyor.
        const satirlar = await fetchAgg(R, {
          groupBy: ['grup', 'yer'], sum: [selectedYear], where: { duzeykod: 3 },
        });
        const grupToplam = new Map<string, number>();
        for (const r of satirlar) {
          const grup = String(r.grup ?? '');
          if (!grup || !gecerliIl(r.yer)) continue;
          grupToplam.set(grup, (grupToplam.get(grup) ?? 0) + num(r[`sum_${selectedYear}`]));
        }
        const res = { data: [...grupToplam.entries()].sort((a, b) => b[1] - a[1])
          .map(([grup, total]) => ({ grup, total })) };
        {
          setGroupTotals(res.data.map((r) => ({
            grup: String(r.grup), total: Number(r.total) || 0
          })));
        }
      } catch (e) { console.error('Grup toplamları yüklenirken hata:', e); }
    };
    loadGroupTotals();
  }, [selectedYear]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = { data: (await fetchAgg(R, {
          groupBy: ['kategori'], where: { grup: selectedAnimal }, orderBy: 'kategori', dir: 'asc',
        })).filter((r) => String(r.kategori ?? '') !== '') };
        if (res.data) {
          const cats = res.data.map((r: Record<string, string | number>) => String(r.kategori)).filter((c: string) => c.length > 0);
          setCategories(cats);
          setSelectedCategory('Tümü');
        } else { setCategories([]); setSelectedCategory('Tümü'); }
      } catch { setCategories([]); setSelectedCategory('Tümü'); }
    };
    loadCategories();
  }, [selectedAnimal]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const yearCol = selectedYear;
      const kategoriKosulu = selectedCategory !== 'Tümü' ? { kategori: selectedCategory } : {};
      const yilSutunlari = YEAR_COLUMNS;

      // Tüm paneller aynı il×kategori kırılımından türetiliyor (eskiden 5 sorgu).
      const satirlar = (await fetchAgg(R, {
        groupBy: ['yer', 'kategori'], sum: yilSutunlari,
        where: { grup: selectedAnimal, duzeykod: 3, ...kategoriKosulu },
      })).filter((r) => gecerliIl(r.yer));
      // Kategori kırılımı, kategori süzgecinden BAĞIMSIZ (eski catQuery de öyleydi).
      const kategoriSatirlari = selectedCategory !== 'Tümü'
        ? (await fetchAgg(R, {
            groupBy: ['yer', 'kategori'], sum: [yearCol],
            where: { grup: selectedAnimal, duzeykod: 3 },
          })).filter((r) => gecerliIl(r.yer))
        : satirlar;

      const ilToplam = new Map<string, number>();
      for (const r of satirlar) {
        const il = String(r.yer ?? '');
        ilToplam.set(il, (ilToplam.get(il) ?? 0) + num(r[`sum_${yearCol}`]));
      }
      const cityRes = { data: [...ilToplam.entries()].sort((a, b) => b[1] - a[1])
        .map(([il, toplam]) => ({ il, toplam })) };
      const totalRes = { data: [{ toplam: [...ilToplam.values()].reduce((a, b) => a + b, 0) }] };
      const countRes = { data: [{ cnt: ilToplam.size }] };
      const yearlyRes = { data: [Object.fromEntries(yilSutunlari.map((yc) => [
        `v${yc.slice(1)}`, satirlar.reduce((acc, r) => acc + num(r[`sum_${yc}`]), 0),
      ]))] };

      // CASE WHEN kategori IS NULL OR '' THEN 'Genel' karşılığı.
      const katToplam = new Map<string, number>();
      for (const r of kategoriSatirlari) {
        const kat = String(r.kategori ?? '') || 'Genel';
        katToplam.set(kat, (katToplam.get(kat) ?? 0) + num(r[`sum_${yearCol}`]));
      }
      const catRes = { data: [...katToplam.entries()].filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]).map(([kat, toplam]) => ({ kat, toplam })) };

      const turkeyTotal = Number(totalRes.data?.[0]?.toplam) || 0;
      const provinces = Number(countRes.data?.[0]?.cnt) || 0;
      setTotalValue(turkeyTotal);
      setProvinceCount(provinces);

      if (cityRes.data) {
        const shareBase = turkeyTotal || 0;
        setCityData(cityRes.data.map((item: Record<string, unknown>, index: number) => ({
          name: String(item['il'] || ''),
          value: Number(item['toplam']) || 0,
          share: shareBase > 0 ? ((Number(item['toplam']) || 0) / shareBase * 100).toFixed(1) : '0.0',
          fill: COLORS[index % COLORS.length]
        })));
      }

      if (yearlyRes.data && yearlyRes.data[0]) {
        const row = yearlyRes.data[0];
        const mapped: YearlyDataItem[] = [];
        for (const y of YEARS) {
          const val = Number(row[`v${y}`]) || 0;
          if (val > 0) mapped.push({ year: String(y), value: val });
        }
        setYearlyData(mapped);
      }

      if (catRes.data) {
        setCategoryData(catRes.data.map((r: Record<string, string | number>) => ({
          name: String(r.kat || ''), value: Number(r.toplam) || 0
        })).filter((d: CategoryDataItem) => d.value > 0));
      }
    } catch (error) { console.error('Veri yüklenirken hata:', error); }
    finally { setLoading(false); }
  }, [selectedYear, selectedAnimal, selectedCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  const yearLabel = selectedYear.replace('y', '');
  const topCity = cityData[0]?.name || '-';
  const topCityValue = cityData[0]?.value || 0;
  const avgValue = provinceCount > 0 ? totalValue / provinceCount : 0;

  const currentYearIdx = yearlyData.findIndex(y => y.year === yearLabel);
  const prevYearIdx = currentYearIdx > 0 ? currentYearIdx - 1 : -1;
  const yearChange = prevYearIdx >= 0 && yearlyData[prevYearIdx]?.value > 0
    ? ((Number(yearlyData[currentYearIdx]?.value) - Number(yearlyData[prevYearIdx]?.value)) / Number(yearlyData[prevYearIdx]?.value) * 100)
    : 0;

  const groupChartData = useMemo(() => groupTotals.filter(g => g.total > 0).map((g, i) => ({
    name: g.grup, value: g.total, fill: COLORS[i % COLORS.length], isSelected: g.grup === selectedAnimal
  })), [groupTotals, selectedAnimal]);

  const growthData = useMemo(() => {
    if (yearlyData.length < 2) return [];
    return yearlyData.slice(-6).map((item, index, arr) => {
      if (index === 0) return null;
      const prev = arr[index - 1].value;
      return { year: item.year, growth: parseFloat(prev > 0 ? ((item.value - prev) / prev * 100).toFixed(1) : '0') };
    }).filter(Boolean) as { year: string; growth: number }[];
  }, [yearlyData]);

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
    return Array.from(regionMap.entries()).map(([region, data]) => ({
      region, total: data.total, cities: data.cities.size,
      average: data.cities.size > 0 ? data.total / data.cities.size : 0,
      share: totalAllRegions > 0 ? (data.total / totalAllRegions * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }, [cityData]);

  const cityDataForSelectedRegion = useMemo(() => {
    if (selectedRegion === 'Tümü') return [] as CityDataItem[];
    return cityData.filter(city => getRegion(city.name) === selectedRegion).slice().sort((a, b) => b.value - a.value);
  }, [cityData, selectedRegion]);

  const totalSelectedRegion = useMemo(() => cityDataForSelectedRegion.reduce((sum, c) => sum + (Number(c.value) || 0), 0), [cityDataForSelectedRegion]);

  const regressionAnalysis = useMemo(() => {
    if (yearlyData.length < 3) return null;
    const data = yearlyData.map((item, i) => ({ x: i, y: item.value }));
    const { slope, intercept, r2 } = linearRegression(data);
    const predictions = [2026, 2027, 2028].map((year, i) => ({
      year: String(year), value: Math.max(0, slope * (yearlyData.length + i) + intercept), isPrediction: true
    }));
    return { slope, intercept, r2, predictions };
  }, [yearlyData]);

  const cagrAnalysis = useMemo(() => {
    if (yearlyData.length < 2) return null;
    const firstYear = yearlyData[0];
    const lastYear = yearlyData[yearlyData.length - 1];
    const years = yearlyData.length - 1;
    return {
      overall: calculateCAGR(firstYear.value, lastYear.value, years),
      last5Years: yearlyData.length >= 5
        ? calculateCAGR(yearlyData[yearlyData.length - 5].value, lastYear.value, 4)
        : calculateCAGR(firstYear.value, lastYear.value, years),
      startYear: firstYear.year, endYear: lastYear.year,
      startValue: firstYear.value, endValue: lastYear.value
    };
  }, [yearlyData]);

  const anomalies = useMemo(() => {
    if (yearlyData.length < 3) return [];
    return detectAnomalies(yearlyData.map(d => d.value)).map(anomaly => ({
      ...anomaly, year: yearlyData[anomaly.index]?.year || '-'
    }));
  }, [yearlyData]);

  const scatterData = useMemo(() => yearlyData.slice(-10).map((item, idx) => ({
    x: 2015 + idx, y: item.value, z: item.value / 100000, year: item.year
  })), [yearlyData]);

  const heatmapData = useMemo(() => {
    if (cityData.length === 0) return [];
    const maxValue = Math.max(...cityData.map(c => c.value));
    const minValue = Math.min(...cityData.map(c => c.value));
    return cityData.map(city => ({
      province: city.name, value: city.value,
      intensity: maxValue > minValue ? (city.value - minValue) / (maxValue - minValue) : 0.5
    }));
  }, [cityData]);

  const sankeyData = useMemo(() => {
    const nodes: { name: string }[] = [];
    const links: { source: number; target: number; value: number }[] = [];
    const recentYears = yearlyData.slice(-3);
    if (recentYears.length < 2) return { nodes, links };
    recentYears.forEach(y => nodes.push({ name: y.year }));
    nodes.push({ name: selectedAnimal });
    const animalNodeIdx = nodes.length - 1;
    recentYears.forEach((y, idx) => links.push({ source: idx, target: animalNodeIdx, value: y.value }));
    return { nodes, links };
  }, [yearlyData, selectedAnimal]);

  const correlationLinks = useMemo((): CorrelationData[] => {
    const links: CorrelationData[] = [];
    if (selectedAnimal === 'Sığır' || selectedAnimal === 'Manda')
      links.push({ animal: 'Sığır/Manda', production: totalValue, link: '/turkey/milk-production' });
    if (selectedAnimal === 'Koyun' || selectedAnimal === 'Keçi')
      links.push({ animal: 'Koyun/Keçi', production: totalValue, link: '/turkey/other-animal-products' });
    if (selectedAnimal === 'Tavuk') {
      links.push({ animal: 'Tavuk', production: totalValue, link: '/turkey/egg-production' });
      links.push({ animal: 'Beyaz Et', production: totalValue, link: '/turkey/white-meat-production' });
    }
    return links;
  }, [selectedAnimal, totalValue]);

  return {
    selectedYear, setSelectedYear, selectedAnimal, setSelectedAnimal,
    selectedCategory, setSelectedCategory, selectedRegion, setSelectedRegion,
    activeTab, setActiveTab, loading,
    cityData, yearlyData, categoryData, categories,
    totalValue, provinceCount, groupTotals,
    yearLabel, topCity, topCityValue, avgValue, yearChange,
    groupChartData, growthData, regionalAnalysis,
    cityDataForSelectedRegion, totalSelectedRegion,
    regressionAnalysis, cagrAnalysis, anomalies, scatterData,
    heatmapData, sankeyData, correlationLinks,
  };
}

export type { formatShort };
