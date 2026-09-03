import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAgg, num, type Row } from '../../services/d1';

const R = 'tuik/bitkisel-uretim';
import {
  COLORS, TURKEY_REGIONS, YEARS, UNSUR_OPTIONS, pct, VARSAYILAN_YIL,
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

  const [selectedYear, setSelectedYear] = useState(VARSAYILAN_YIL);
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
        // Sayfa ya belirli ürünlerle ya da bir ürün grubuyla sınırlanıyor.
        const res = { data: await fetchAgg(R, {
          groupBy: ['urun'], orderBy: 'urun', dir: 'asc',
          ...(urunFilter ? { whereIn: { urun: urunFilter } } : { where: { urun_grup: urunGrup } }),
        }) };
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
      const yCol = `y${selectedYear}`;


      // Tüm paneller aynı il×unsur×ürün kırılımından türetiliyor; eskiden 8
      // ayrı sorgu (biri LEFT JOIN'li, biri 63 CASE WHEN sütunlu) atılıyordu.
      const YIL_SUTUNLARI = YEARS.map((y) => `y${y}`);
      const ilKosulu = {
        where: { duzeykod: 3, ...(selectedProvince ? { yer: selectedProvince } : {}) },
        whereIn: {
          urun: selectedProducts,
          ...(!selectedProvince && selectedRegion && TURKEY_REGIONS[selectedRegion]
            ? { yer: TURKEY_REGIONS[selectedRegion] } : {}),
        },
      };

      const [ilSatirlari, ilceSatirlari, bolgeSatirlari] = await Promise.all([
        fetchAgg(R, { groupBy: ['yer', 'unsur', 'urun'], sum: YIL_SUTUNLARI, ...ilKosulu }),
        selectedProvince
          ? fetchAgg(R, { groupBy: ['yer'], sum: [yCol],
              where: { duzeykod: 4, unsur: selectedUnsur, ili: selectedProvince },
              whereIn: { urun: selectedProducts } })
          : Promise.resolve([] as Row[]),
        // Bölge dağılımı coğrafi süzgeçten bağımsız (eski q3 de öyleydi).
        fetchAgg(R, { groupBy: ['ili'], sum: [yCol],
          where: { duzeykod: 3, unsur: selectedUnsur }, whereIn: { urun: selectedProducts } }),
      ]);

      const topla = (satirlar: Row[], alan: string) =>
        satirlar.reduce((acc, r) => acc + num(r[`sum_${alan}`]), 0);
      const grupla = (satirlar: Row[], anahtar: string, alan: string) => {
        const h = new Map<string, number>();
        for (const r of satirlar) {
          const k = String(r[anahtar] ?? '');
          h.set(k, (h.get(k) ?? 0) + num(r[`sum_${alan}`]));
        }
        return [...h.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      };

      const secilenUnsur = ilSatirlari.filter((r) => String(r.unsur ?? '') === selectedUnsur);
      const uretimSatirlari = ilSatirlari.filter((r) => String(r.unsur ?? '') === 'Üretim');
      const alanSatirlari = ilSatirlari.filter((r) => String(r.unsur ?? '') === 'Ekilen Alan');
      const verimSatirlari = ilSatirlari.filter((r) => String(r.unsur ?? '') === 'Verim');

      const r1 = { data: grupla(secilenUnsur, 'yer', yCol).slice(0, 20)
        .map(([yer, toplam]) => ({ yer, toplam })) };

      const r2 = { data: [Object.fromEntries(
        YEARS.map((y) => [`v${y}`, topla(secilenUnsur, `y${y}`)])) as Row] };

      const r3 = { data: [Object.fromEntries(Object.entries(TURKEY_REGIONS).map(([ad, iller]) => [
        ad, bolgeSatirlari.filter((r) => iller.includes(String(r.ili ?? '')))
          .reduce((acc, r) => acc + num(r[`sum_${yCol}`]), 0),
      ])) as Row] };

      const r4 = { data: grupla(secilenUnsur, 'urun', yCol).map(([urun, toplam]) => ({ urun, toplam })) };

      // Eski q5 üç alt sorgunun LEFT JOIN'iydi; unsur'a göre süzülüp eşleştiriliyor.
      const alanHaritasi = new Map(grupla(alanSatirlari, 'yer', yCol));
      const verimIlSayisi = new Map<string, { toplam: number; adet: number }>();
      for (const r of verimSatirlari) {
        const k = String(r.yer ?? '');
        const kayit = verimIlSayisi.get(k) ?? { toplam: 0, adet: 0 };
        kayit.toplam += num(r[`sum_${yCol}`]); kayit.adet += 1;
        verimIlSayisi.set(k, kayit);
      }
      const r5 = { data: grupla(uretimSatirlari, 'yer', yCol).slice(0, 30).map(([yer, uretim]) => ({
        yer, uretim,
        alan: alanHaritasi.get(yer) ?? 0,
        verim: (() => { const v = verimIlSayisi.get(yer); return v && v.adet ? v.toplam / v.adet : 0; })(),
      })) };

      const r6 = { data: grupla(ilceSatirlari, 'yer', yCol).slice(0, 15)
        .map(([yer, toplam]) => ({ yer, toplam })) };

      const r7 = { data: [Object.fromEntries(YEARS.flatMap((y) => {
        const verimAdet = verimSatirlari.filter((r) => num(r[`sum_y${y}`]) !== 0).length;
        return [
          [`uretim${y}`, topla(uretimSatirlari, `y${y}`)],
          [`ekilen${y}`, topla(alanSatirlari, `y${y}`)],
          [`verim${y}`, verimAdet ? topla(verimSatirlari, `y${y}`) / verimAdet : 0],
        ];
      })) as Row] };

      const radarYears = [selectedYear, Math.max(selectedYear - 5, 2004), Math.max(selectedYear - 10, 2004)];
      const r8 = { data: grupla(uretimSatirlari, 'yer', yCol).slice(0, 6).map(([yer]) => {
        const satir: Row = { yer };
        radarYears.forEach((y) => {
          satir[`v${y}`] = uretimSatirlari.filter((r) => String(r.yer ?? '') === yer)
            .reduce((acc, r) => acc + num(r[`sum_y${y}`]), 0);
        });
        return satir;
      }) };

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
