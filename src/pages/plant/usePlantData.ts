import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchQuery } from '../../services/api';
import {
  COLORS, TURKEY_REGIONS, YEARS, UNSUR_OPTIONS, buildSumCols, pct,
} from './plantTypes';
import type {
  CityRow, YearRow, RegionRow, ProductRow, ScatterRow, DistrictRow, YieldTrendRow,
  TuikPlantCategoryPageProps,
} from './plantTypes';

type ProductItem = { id: string; name: string; nameTR: string };

export interface UsePlantDataResult {
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  selectedUnsur: string;
  setSelectedUnsur: (u: string) => void;
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  selectedProvince: string;
  setSelectedProvince: (p: string) => void;
  selectedProducts: string[];
  setSelectedProducts: (p: string[]) => void;
  productList: ProductItem[];
  loading: boolean;
  cityData: CityRow[];
  yearlyData: YearRow[];
  regionData: RegionRow[];
  productCompareData: ProductRow[];
  scatterData: ScatterRow[];
  districtData: DistrictRow[];
  yieldTrendData: YieldTrendRow[];
  radarData: { il: string; [key: string]: string | number }[];
  filteredUnsurOptions: typeof UNSUR_OPTIONS;
  currentBirim: string;
  provinceList: string[];
  radarYears: number[];
  totalValue: number;
  topCity: string;
  topCityValue: number;
  productCount: number;
  yoyChange: number;
  cagr5Year: number;
  forecast: number;
  yieldTrend: number;
  growthDriver: string;
}

export function usePlantData({
  urunGrup, urunFilter, defaultProducts, showTreeMetrics = false
}: Pick<TuikPlantCategoryPageProps, 'urunGrup' | 'urunFilter' | 'defaultProducts' | 'showTreeMetrics'>): UsePlantDataResult {

  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedUnsur, setSelectedUnsur] = useState('Üretim');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(defaultProducts || []);
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [cityData, setCityData] = useState<CityRow[]>([]);
  const [yearlyData, setYearlyData] = useState<YearRow[]>([]);
  const [regionData, setRegionData] = useState<RegionRow[]>([]);
  const [productCompareData, setProductCompareData] = useState<ProductRow[]>([]);
  const [scatterData, setScatterData] = useState<ScatterRow[]>([]);
  const [districtData, setDistrictData] = useState<DistrictRow[]>([]);
  const [yieldTrendData, setYieldTrendData] = useState<YieldTrendRow[]>([]);
  const [radarData, setRadarData] = useState<{ il: string; [key: string]: string | number }[]>([]);

  const filteredUnsurOptions = useMemo(() =>
    showTreeMetrics ? UNSUR_OPTIONS : UNSUR_OPTIONS.filter(o =>
      !['Meyve Veren Yaşta Ağaç Sayısı', 'Meyve Vermeyen Yaşta Ağaç Sayısı', 'Toplu Meyveliklerin Alanı'].includes(o.id)
    ), [showTreeMetrics]);

  const currentBirim = filteredUnsurOptions.find(o => o.id === selectedUnsur)?.birim || 'ton';

  const provinceList = useMemo(() => {
    if (!selectedRegion) {
      return Object.values(TURKEY_REGIONS).flat().filter((v, i, a) => a.indexOf(v) === i).sort();
    }
    return TURKEY_REGIONS[selectedRegion] || [];
  }, [selectedRegion]);

  /* ─── ürün listesi yükle ─── */
  useEffect(() => {
    (async () => {
      try {
        const filter = urunFilter
          ? `urun IN (${urunFilter.map(u => `'${u}'`).join(',')})`
          : `urun_grup = '${urunGrup}'`;
        const sql = `SELECT DISTINCT urun FROM tuik_bitkisel_uretim WHERE ${filter} ORDER BY urun`;
        const res = await fetchQuery(sql);
        if (res.data) {
          const list = res.data.map(r => ({ id: String(r.urun), name: String(r.urun), nameTR: String(r.urun) }));
          setProductList(list);
          if (defaultProducts && defaultProducts.length > 0) {
            setSelectedProducts(defaultProducts.filter(p => list.some(l => l.id === p)));
          } else if (list.length > 0) {
            setSelectedProducts(list.slice(0, Math.min(3, list.length)).map(l => l.id));
          }
        }
      } catch (e) { console.error('Ürün listesi yüklenirken hata:', e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urunGrup, JSON.stringify(urunFilter)]);

  /* ─── ana veri yükleme ─── */
  const loadData = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setCityData([]); setYearlyData([]); setRegionData([]);
      setProductCompareData([]); setScatterData([]); setDistrictData([]);
      setYieldTrendData([]); setRadarData([]);
      return;
    }
    setLoading(true);
    try {
      const prods = selectedProducts.map(p => `'${p.replace(/'/g, "''")}'`).join(',');
      const yCol = `y${selectedYear}`;

      let geoFilter = '';
      let geoFilterIl = '';
      if (selectedProvince) {
        geoFilter = ` AND yer='${selectedProvince}'`;
        geoFilterIl = ` AND ili='${selectedProvince}'`;
      } else if (selectedRegion && TURKEY_REGIONS[selectedRegion]) {
        const iller = TURKEY_REGIONS[selectedRegion].map(i => `'${i}'`).join(',');
        geoFilter = ` AND yer IN (${iller})`;
        geoFilterIl = ` AND ili IN (${iller})`;
      }

      const q1 = `SELECT yer, SUM(CAST(${yCol} AS DECIMAL(20,2))) as toplam
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}
        GROUP BY yer HAVING toplam > 0 ORDER BY toplam DESC LIMIT 20`;

      const q2 = `SELECT ${buildSumCols()}
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}`;

      const regionCases = Object.entries(TURKEY_REGIONS)
        .map(([name, iller]) => {
          const inList = iller.map(i => `'${i}'`).join(',');
          return `SUM(CASE WHEN ili IN (${inList}) THEN CAST(${yCol} AS DECIMAL(20,2)) ELSE 0 END) as '${name}'`;
        }).join(',');
      const q3 = `SELECT ${regionCases}
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'`;

      const q4 = `SELECT urun, SUM(CAST(${yCol} AS DECIMAL(20,2))) as toplam
        FROM tuik_bitkisel_uretim
        WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}
        GROUP BY urun HAVING toplam > 0 ORDER BY toplam DESC`;

      const q5 = `SELECT a.yer,
        SUM(CAST(a.${yCol} AS DECIMAL(20,2))) as uretim,
        IFNULL(b.alan, 0) as alan,
        IFNULL(c.verim, 0) as verim
        FROM tuik_bitkisel_uretim a
        LEFT JOIN (SELECT yer, SUM(CAST(${yCol} AS DECIMAL(20,2))) as alan FROM tuik_bitkisel_uretim WHERE unsur='Ekilen Alan' AND urun IN (${prods}) AND duzeykod='3'${geoFilter} GROUP BY yer) b ON a.yer=b.yer
        LEFT JOIN (SELECT yer, AVG(CAST(${yCol} AS DECIMAL(20,2))) as verim FROM tuik_bitkisel_uretim WHERE unsur='Verim' AND urun IN (${prods}) AND duzeykod='3'${geoFilter} GROUP BY yer) c ON a.yer=c.yer
        WHERE a.unsur='Üretim' AND a.urun IN (${prods}) AND a.duzeykod='3'${geoFilter}
        GROUP BY a.yer HAVING uretim > 0
        ORDER BY uretim DESC LIMIT 30`;

      const q6Promise = selectedProvince
        ? fetchQuery(`SELECT yer, SUM(CAST(${yCol} AS DECIMAL(20,2))) as toplam
            FROM tuik_bitkisel_uretim
            WHERE unsur='${selectedUnsur}' AND urun IN (${prods}) AND duzeykod='4'${geoFilterIl}
            GROUP BY yer HAVING toplam > 0 ORDER BY toplam DESC LIMIT 15`)
        : Promise.resolve({ data: [] as Record<string, unknown>[] });

      const uretimCols = YEARS.map(y => `SUM(CASE WHEN unsur='Üretim' THEN CAST(y${y} AS DECIMAL(20,2)) END) as uretim${y}`).join(',');
      const ekilenCols = YEARS.map(y => `SUM(CASE WHEN unsur='Ekilen Alan' THEN CAST(y${y} AS DECIMAL(20,2)) END) as ekilen${y}`).join(',');
      const verimCols = YEARS.map(y => `AVG(CASE WHEN unsur='Verim' THEN CAST(y${y} AS DECIMAL(20,2)) END) as verim${y}`).join(',');
      const q7 = `SELECT ${uretimCols}, ${ekilenCols}, ${verimCols}
        FROM tuik_bitkisel_uretim
        WHERE urun IN (${prods}) AND duzeykod='3'${geoFilter}`;

      const radarYears = [selectedYear, Math.max(selectedYear - 5, 2004), Math.max(selectedYear - 10, 2004)];
      const radarCols = radarYears.map(y => `SUM(CAST(y${y} AS DECIMAL(20,2))) as v${y}`).join(',');
      const q8 = `SELECT yer, ${radarCols}
        FROM tuik_bitkisel_uretim
        WHERE unsur='Üretim' AND urun IN (${prods}) AND duzeykod='3'${geoFilter}
        GROUP BY yer ORDER BY SUM(CAST(${yCol} AS DECIMAL(20,2))) DESC LIMIT 6`;

      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        fetchQuery(q1), fetchQuery(q2), fetchQuery(q3), fetchQuery(q4),
        fetchQuery(q5), q6Promise, fetchQuery(q7), fetchQuery(q8)
      ]);

      if (r1.data) {
        const total = r1.data.reduce((s, r) => s + (Number(r.toplam) || 0), 0);
        setCityData(r1.data.map((r, i) => ({
          name: String(r.yer), value: Number(r.toplam) || 0,
          share: total > 0 ? ((Number(r.toplam) || 0) / total * 100).toFixed(1) : '0',
          fill: COLORS[i % COLORS.length]
        })));
      }

      if (r2.data?.[0]) {
        const row = r2.data[0];
        const arr: YearRow[] = [];
        for (const y of YEARS.slice().reverse()) {
          const val = Number(row[`v${y}`]) || 0;
          const prev = y > 2004 ? (Number(row[`v${y - 1}`]) || 0) : val;
          arr.push({ year: String(y), value: val, change: pct(val, prev) });
        }
        setYearlyData(arr);
      }

      if (r3.data?.[0]) {
        const row = r3.data[0];
        const regions = Object.keys(TURKEY_REGIONS).map(name => ({
          name, value: Number(row[name]) || 0
        })).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
        setRegionData(regions);
      }

      if (r4.data) {
        setProductCompareData(r4.data.map((r, i) => ({
          name: String(r.urun), value: Number(r.toplam) || 0, fill: COLORS[i % COLORS.length]
        })));
      }

      if (r5.data) {
        setScatterData(r5.data.map(r => ({
          name: String(r.yer),
          area: Number(r.alan) || 0,
          production: Number(r.uretim) || 0,
          verim: Number(r.verim) || 0
        })).filter(r => r.area > 0 && r.production > 0));
      }

      if (r6.data) {
        setDistrictData(r6.data.map((r, i) => ({
          name: String(r.yer), value: Number(r.toplam) || 0, fill: COLORS[i % COLORS.length]
        })));
      } else {
        setDistrictData([]);
      }

      if (r7.data?.[0]) {
        const row = r7.data[0];
        const rawData = YEARS.slice().reverse().map(y => ({
          year: String(y),
          uretim: Number(row[`uretim${y}`]) || 0,
          alan: Number(row[`ekilen${y}`]) || 0,
          verim: Number(row[`verim${y}`]) || 0
        }));
        const arr = rawData.map((d, i) => {
          if (i === 0) return { ...d, alanEtkisi: 0, verimEtkisi: 0, etkilesim: 0, uretimDegisimi: 0 };
          const prev = rawData[i - 1];
          const uretimDegisimi = d.uretim - prev.uretim;
          if (d.alan > 0 && d.verim > 0 && prev.alan > 0 && prev.verim > 0) {
            const alanDiff = d.alan - prev.alan;
            const verimDiff = d.verim - prev.verim;
            const alanEtkisi = alanDiff * prev.verim;
            const verimEtkisi = verimDiff * prev.alan;
            const etkilesim = alanDiff * verimDiff;
            return { ...d, alanEtkisi, verimEtkisi, etkilesim, uretimDegisimi };
          } else {
            return { ...d, alanEtkisi: 0, verimEtkisi: 0, etkilesim: uretimDegisimi, uretimDegisimi };
          }
        });
        setYieldTrendData(arr);
      }

      if (r8.data) {
        setRadarData(r8.data.map(r => {
          const obj: { il: string; [key: string]: string | number } = { il: String(r.yer) };
          radarYears.forEach(y => { obj[String(y)] = Number(r[`v${y}`]) || 0; });
          return obj;
        }));
      }

    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedYear, selectedUnsur, selectedRegion, selectedProvince]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── türetilmiş KPI'lar ─── */
  const totalValue = cityData.reduce((s, c) => s + c.value, 0);
  const topCity = cityData[0]?.name || '-';
  const topCityValue = cityData[0]?.value || 0;
  const productCount = productCompareData.length;

  const currentYearData = yearlyData.find(y => y.year === String(selectedYear));
  const prevYearData = yearlyData.find(y => y.year === String(selectedYear - 1));
  const yoyChange = currentYearData && prevYearData
    ? pct(currentYearData.value, prevYearData.value) : 0;

  const cagr5Year = useMemo(() => {
    const year5ago = yearlyData.find(y => y.year === String(selectedYear - 5));
    if (!currentYearData || !year5ago || year5ago.value === 0) return 0;
    return (Math.pow(currentYearData.value / year5ago.value, 1 / 5) - 1) * 100;
  }, [yearlyData, selectedYear, currentYearData]);

  const forecast = useMemo(() => {
    if (yearlyData.length < 5) return 0;
    const recent = yearlyData.slice(-5);
    const n = recent.length;
    const sumX = recent.reduce((s, _, i) => s + i, 0);
    const sumY = recent.reduce((s, d) => s + d.value, 0);
    const sumXY = recent.reduce((s, d, i) => s + i * d.value, 0);
    const sumX2 = recent.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return slope * n + intercept;
  }, [yearlyData]);

  const yieldTrend = useMemo(() => {
    const recent = yieldTrendData.slice(-3);
    if (recent.length < 2) return 0;
    const first = recent[0].verim;
    const last = recent[recent.length - 1].verim;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [yieldTrendData]);

  const growthDriver = useMemo(() => {
    const recent = yieldTrendData.filter(d => d.alanEtkisi !== undefined).slice(-5);
    if (recent.length === 0) return 'Veri yetersiz';
    const totalAreaEffect = recent.reduce((s, d) => s + Math.abs(d.alanEtkisi || 0), 0);
    const totalYieldEffect = recent.reduce((s, d) => s + Math.abs(d.verimEtkisi || 0), 0);
    if (totalAreaEffect < 0.01 && totalYieldEffect < 0.01) {
      const recentProduction = yieldTrendData.slice(-5);
      if (recentProduction.length < 2) return '📊 Analiz için veri yetersiz';
      const firstYear = recentProduction[0].uretim;
      const lastYear = recentProduction[recentProduction.length - 1].uretim;
      const change = lastYear - firstYear;
      if (Math.abs(change) < 0.01) return '⚪ Stabil üretim';
      return change > 0 ? '🟢 Üretim artışı (Kaynak belirlenemedi)' : '🔴 Üretim düşüşü';
    }
    if (totalAreaEffect > totalYieldEffect * 1.5) return '🟢 Alan genişlemesi odaklı';
    if (totalYieldEffect > totalAreaEffect * 1.5) return '🟡 Verim artışı odaklı';
    return '🔵 Dengeli büyüme';
  }, [yieldTrendData]);

  const radarYears = useMemo(() => [
    selectedYear, Math.max(selectedYear - 5, 2004), Math.max(selectedYear - 10, 2004)
  ], [selectedYear]);

  return {
    selectedYear, setSelectedYear,
    selectedUnsur, setSelectedUnsur,
    selectedRegion, setSelectedRegion,
    selectedProvince, setSelectedProvince,
    selectedProducts, setSelectedProducts,
    productList, loading,
    cityData, yearlyData, regionData, productCompareData,
    scatterData, districtData, yieldTrendData, radarData,
    filteredUnsurOptions, currentBirim, provinceList, radarYears,
    totalValue, topCity, topCityValue, productCount, yoyChange,
    cagr5Year, forecast, yieldTrend, growthDriver,
  };
}
