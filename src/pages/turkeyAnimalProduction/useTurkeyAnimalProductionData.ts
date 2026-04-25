import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchQuery } from '../../services/api';
import { getRegionByProvince } from '../../utils/productionCategories';
import {
  COLORS, formatValue
} from './turkeyAnimalProductionTypes';
import type { HistoricalData, WorldData, RedMeatData, PoultryData, CityData, MapFilterKey } from './turkeyAnimalProductionTypes';

export interface KpiData {
  redMeat: { value: number; change: number };
  milk: { value: number; change: number };
  egg: { value: number; change: number };
  honey: { value: number; change: number };
}

export interface WorldRankingItem {
  ulke: string;
  uretim: number;
  isTurkey: boolean;
  rank: number;
}

export interface UseTurkeyAnimalProductionDataReturn {
  // State
  loading: boolean;
  yearRange: string;
  setYearRange: (v: string) => void;
  mapFilter: MapFilterKey;
  setMapFilter: (v: MapFilterKey) => void;
  // Raw data
  historicalData: HistoricalData[];
  redMeatData: RedMeatData[];
  poultryData: PoultryData[];
  // Computed
  kpiData: KpiData | null;
  historicalChartData: Record<string, string | number>[];
  redMeatBreakdown: { name: string; value: number; color: string }[];
  redMeatTrendData: Record<string, string | number>[];
  buyukbasKucukbasData: Record<string, string | number>[];
  poultryMonthlyData: Record<string, string | number>[];
  worldBeefRanking: WorldRankingItem[];
  worldMilkRanking: WorldRankingItem[];
  worldChickenRanking: WorldRankingItem[];
  mapData: { name: string; value: number }[];
  // Intelligence metrics
  cagr5Year: number;
  forecastRedMeat: number;
  milkProductivityTrend: number;
  growthStrategy: string;
}

function buildWorldRanking(worldData: WorldData[], urun: string): WorldRankingItem[] {
  const list = worldData
    .filter(d => d.urun === urun)
    .sort((a, b) => b.uretim_miktari_ton - a.uretim_miktari_ton)
    .slice(0, 15);
  const turkeyIdx = list.findIndex(d => d.ulke === 'Türkiye');
  if (turkeyIdx !== -1) {
    return list.map((d, i) => ({ ulke: d.ulke, uretim: d.uretim_miktari_ton, isTurkey: d.ulke === 'Türkiye', rank: i + 1 }));
  }
  return list.slice(0, 10).map((d, i) => ({ ulke: d.ulke, uretim: d.uretim_miktari_ton, isTurkey: false, rank: i + 1 }));
}

export function useTurkeyAnimalProductionData(): UseTurkeyAnimalProductionDataReturn {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [worldData, setWorldData] = useState<WorldData[]>([]);
  const [redMeatData, setRedMeatData] = useState<RedMeatData[]>([]);
  const [poultryData, setPoultryData] = useState<PoultryData[]>([]);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [yearRange, setYearRange] = useState<string>('last10');
  const [mapFilter, setMapFilter] = useState<MapFilterKey>('toplam');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [histRes, worldRes, redMeatRes, poultryRes, cityRes, kovanRes] = await Promise.all([
        fetchQuery(`SELECT * FROM oner_hayvansal_urun_uretimi ORDER BY yillar`),
        fetchQuery(`SELECT * FROM oner_dunya_hayvansal_uretim_miktarla`),
        fetchQuery(`SELECT * FROM oner_kirmizi_et_uretimi ORDER BY yil`),
        fetchQuery(`SELECT * FROM oner_kanatli_uretimleri WHERE tarih >= DATE_SUB(NOW(), INTERVAL 24 MONTH) ORDER BY tarih`),
        fetchQuery(`SELECT il,
          SUM(CASE WHEN grup='Sığır' THEN COALESCE(y2024,0) ELSE 0 END) as sigir,
          SUM(CASE WHEN grup='Manda' THEN COALESCE(y2024,0) ELSE 0 END) as manda,
          SUM(CASE WHEN grup='Koyun' THEN COALESCE(y2024,0) ELSE 0 END) as koyun,
          SUM(CASE WHEN grup='Keçi' THEN COALESCE(y2024,0) ELSE 0 END) as keci,
          SUM(CASE WHEN grup='Tavuk' AND kategori='Et Tavuğu' THEN COALESCE(y2024,0) ELSE 0 END) as etTavugu,
          SUM(CASE WHEN grup='Tavuk' AND kategori='Yumurta Tavuğu' THEN COALESCE(y2024,0) ELSE 0 END) as yumurtaTavugu
          FROM tuik_hayvancilik_canlihayvan
          WHERE duzeykod='3' AND il IS NOT NULL AND il != '' 
            AND il NOT IN ('TOPLAM','Toplam','TÜRKİYE','Türkiye')
          GROUP BY il`),
        fetchQuery(`SELECT yer,
          SUM(CASE WHEN urun='Kovan' THEN CAST(REPLACE(\`2024\`, '.', '') AS UNSIGNED) ELSE 0 END) as kovan,
          SUM(CASE WHEN urun='Balmumu' THEN CAST(\`2024\` AS DECIMAL(10,3)) ELSE 0 END) as balmumu
          FROM tuik_hayvancilik_hayvansaluretim
          WHERE urun IN ('Kovan', 'Balmumu') AND duzeykod = 3
          GROUP BY yer`),
      ]);

      if ((histRes.data?.length ?? 0) > 0) {
        setHistoricalData((histRes.data as Record<string, string | number>[]).map(row => ({
          yillar: String(row['yillar'] || row['Yıllar'] || ''),
          bal_uretimi: parseFloat(String(row['bal_uretimi'] || row['Bal Üretimi'] || '0')) || 0,
          cig_sut_uretimi: parseFloat(String(row['cig_sut_uretimi'] || row['Çiğ Süt Üretimi'] || '0')) || 0,
          kirmizi_et_uretimi: parseFloat(String(row['kirmizi_et_uretimi'] || row['Kırmızı Et Üretimi'] || '0')) || 0,
          yumurta_milyon_adet: parseFloat(String(row['yumurta_milyon_adet'] || row['Yumurta (Milyon Adet)'] || '0')) || 0,
          kanatli_eti_ton: parseFloat(String(row['kanatli_eti_ton'] || row['Kanatlı Eti (Ton)'] || '0')) || 0,
        })));
      }

      if ((worldRes.data?.length ?? 0) > 0) {
        setWorldData((worldRes.data as Record<string, string | number>[])
          .map(row => ({
            ulke: String(row['ulke'] || row['Ülke'] || ''),
            urun: String(row['urun'] || row['Ürün'] || ''),
            uretim_miktari_ton: parseFloat(String(row['uretim_miktari_ton'] || '0')) || 0,
          }))
          .filter(d => d.ulke?.trim().length > 0));
      }

      if ((redMeatRes.data?.length ?? 0) > 0) {
        setRedMeatData((redMeatRes.data as Record<string, string | number>[]).map(row => ({
          yil: parseInt(String(row['yil'] || '0')) || 0,
          sigir: parseFloat(String(row['sigir'] || '0')) || 0,
          manda: parseFloat(String(row['manda'] || '0')) || 0,
          buyukbas_toplam: parseFloat(String(row['buyukbas_toplam'] || '0')) || 0,
          koyun: parseFloat(String(row['koyun'] || '0')) || 0,
          keci: parseFloat(String(row['keci'] || '0')) || 0,
          kucukbas_toplam: parseFloat(String(row['kucukbas_toplam'] || '0')) || 0,
          toplam: parseFloat(String(row['toplam'] || '0')) || 0,
        })));
      }

      if ((poultryRes.data?.length ?? 0) > 0) {
        setPoultryData((poultryRes.data as Record<string, string | number>[]).map(row => ({
          tarih: String(row['tarih'] || ''),
          tavuk_yumurtasi_bin_adet: parseFloat(String(row['tavuk_yumurtasi_bin_adet'] || '0')) || 0,
          tavuk_eti_ton: parseFloat(String(row['tavuk_eti_ton'] || '0')) || 0,
        })));
      }

      if ((cityRes.data?.length ?? 0) > 0) {
        const cityMap = new Map<string, CityData>();
        (cityRes.data as Record<string, string | number>[]).forEach(row => {
          const il = String(row['il'] || '').toUpperCase();
          const sigir = Number(row['sigir']) || 0;
          const manda = Number(row['manda']) || 0;
          const koyun = Number(row['koyun']) || 0;
          const keci = Number(row['keci']) || 0;
          const etTavugu = Number(row['etTavugu']) || 0;
          const yumurtaTavugu = Number(row['yumurtaTavugu']) || 0;
          const existing = cityMap.get(il);
          if (existing) {
            existing.sigir += sigir; existing.manda += manda;
            existing.koyun += koyun; existing.keci += keci;
            existing.etTavugu += etTavugu; existing.yumurtaTavugu += yumurtaTavugu;
          } else {
            cityMap.set(il, { il, sigir, manda, koyun, keci, balUretimi: 0, kovan: 0, balmumu: 0, etTavugu, yumurtaTavugu });
          }
        });
        if ((kovanRes.data?.length ?? 0) > 0) {
          (kovanRes.data as Record<string, string | number>[]).forEach(row => {
            const yer = String(row['yer'] || '').toUpperCase();
            if (!yer || yer === 'TOPLAM' || yer === 'TÜRKİYE') return;
            const kovan = Number(row['kovan']) || 0;
            const balmumu = Number(row['balmumu']) || 0;
            const existing = cityMap.get(yer);
            if (existing) {
              existing.kovan = kovan; existing.balmumu = balmumu; existing.balUretimi = kovan;
            } else {
              cityMap.set(yer, { il: yer, sigir: 0, manda: 0, koyun: 0, keci: 0, balUretimi: kovan, kovan, balmumu, etTavugu: 0, yumurtaTavugu: 0 });
            }
          });
        }
        setCityData(Array.from(cityMap.values()));
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const latestHistorical = useMemo(() => historicalData[historicalData.length - 1], [historicalData]);
  const previousHistorical = useMemo(() => historicalData[historicalData.length - 2], [historicalData]);

  const kpiData = useMemo((): KpiData | null => {
    if (!latestHistorical || !previousHistorical) return null;
    const calc = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    return {
      redMeat: { value: latestHistorical.kirmizi_et_uretimi, change: calc(latestHistorical.kirmizi_et_uretimi, previousHistorical.kirmizi_et_uretimi) },
      milk: { value: latestHistorical.cig_sut_uretimi, change: calc(latestHistorical.cig_sut_uretimi, previousHistorical.cig_sut_uretimi) },
      egg: { value: latestHistorical.yumurta_milyon_adet, change: calc(latestHistorical.yumurta_milyon_adet, previousHistorical.yumurta_milyon_adet) },
      honey: { value: latestHistorical.bal_uretimi, change: calc(latestHistorical.bal_uretimi, previousHistorical.bal_uretimi) },
    };
  }, [latestHistorical, previousHistorical]);

  const filteredHistoricalData = useMemo(() => {
    if (yearRange === 'all') return historicalData;
    const yearsMap: Record<string, number> = { 'last5': 5, 'last10': 10, 'last20': 20 };
    return historicalData.slice(-(yearsMap[yearRange] || 10));
  }, [historicalData, yearRange]);

  const historicalChartData = useMemo(() => filteredHistoricalData.map(d => ({
    yil: d.yillar.substring(0, 4),
    'Süt (M ton)': (d.cig_sut_uretimi / 1_000_000).toFixed(2),
    'Kırmızı Et (K ton)': (d.kirmizi_et_uretimi / 1_000).toFixed(0),
    'Kanatlı (K ton)': (d.kanatli_eti_ton / 1_000).toFixed(0),
    'Yumurta (M adet)': d.yumurta_milyon_adet.toFixed(1),
    'Bal (K ton)': (d.bal_uretimi / 1_000).toFixed(1),
  })), [filteredHistoricalData]);

  const redMeatBreakdown = useMemo(() => {
    const latest = redMeatData[redMeatData.length - 1];
    if (!latest) return [];
    return [
      { name: 'Sığır', value: latest.sigir, color: COLORS['Sığır'] },
      { name: 'Koyun', value: latest.koyun, color: COLORS['Koyun'] },
      { name: 'Keçi', value: latest.keci, color: COLORS['Keçi'] },
      { name: 'Manda', value: latest.manda, color: COLORS['Manda'] },
    ].filter(i => i.value > 0);
  }, [redMeatData]);

  const redMeatTrendData = useMemo(() => redMeatData.slice(-5).map(d => ({
    yil: String(d.yil), Sığır: d.sigir, Koyun: d.koyun, Keçi: d.keci, Manda: d.manda,
  })), [redMeatData]);

  const buyukbasKucukbasData = useMemo(() => redMeatData.slice(-10).map(d => ({
    yil: String(d.yil), 'Büyükbaş': d.buyukbas_toplam, 'Küçükbaş': d.kucukbas_toplam,
  })), [redMeatData]);

  const poultryMonthlyData = useMemo(() => poultryData.map(d => ({
    ay: d.tarih.substring(0, 7),
    'Tavuk Eti (ton)': d.tavuk_eti_ton,
    'Yumurta (M adet)': (d.tavuk_yumurtasi_bin_adet / 1_000).toFixed(1),
  })), [poultryData]);

  const worldBeefRanking = useMemo(() => buildWorldRanking(worldData, 'Sığır Eti (Manda Hariç)'), [worldData]);
  const worldMilkRanking = useMemo(() => buildWorldRanking(worldData, 'Sığırların çiğ sütü'), [worldData]);
  const worldChickenRanking = useMemo(() => buildWorldRanking(worldData, 'Tavuk eti'), [worldData]);

  const mapData = useMemo(() => {
    const regionMap = new Map<string, number>();
    cityData.forEach(item => {
      const region = getRegionByProvince(item.il);
      const cur = regionMap.get(region) || 0;
      let v: number;
      switch (mapFilter) {
        case 'sigir': v = item.sigir; break;
        case 'manda': v = item.manda; break;
        case 'koyun': v = item.koyun; break;
        case 'keci': v = item.keci; break;
        case 'kovan': v = item.kovan; break;
        case 'etTavugu': v = item.etTavugu; break;
        case 'yumurtaTavugu': v = item.yumurtaTavugu; break;
        default: v = item.sigir + item.manda + item.koyun + item.keci;
      }
      regionMap.set(region, cur + v);
    });
    return Array.from(regionMap.entries()).map(([name, value]) => ({ name, value }));
  }, [cityData, mapFilter]);

  // ─── Intelligence Metrics ─────────────────────────────────────────────────

  const cagr5Year = useMemo(() => {
    if (historicalData.length < 6) return 0;
    const recent = historicalData.slice(-6);
    const start = recent[0].kirmizi_et_uretimi;
    const end = recent[recent.length - 1].kirmizi_et_uretimi;
    if (start === 0) return 0;
    return (Math.pow(end / start, 1 / 5) - 1) * 100;
  }, [historicalData]);

  const forecastRedMeat = useMemo(() => {
    if (historicalData.length < 5) return 0;
    const recent = historicalData.slice(-5);
    const n = recent.length;
    const sumX = recent.reduce((s, _, i) => s + i, 0);
    const sumY = recent.reduce((s, d) => s + d.kirmizi_et_uretimi, 0);
    const sumXY = recent.reduce((s, d, i) => s + i * d.kirmizi_et_uretimi, 0);
    const sumX2 = recent.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return slope * n + intercept;
  }, [historicalData]);

  const milkProductivityTrend = useMemo(() => {
    if (historicalData.length < 4) return 0;
    const recent = historicalData.slice(-4);
    const avg3 = (recent[0].cig_sut_uretimi + recent[1].cig_sut_uretimi + recent[2].cig_sut_uretimi) / 3;
    const last = recent[recent.length - 1].cig_sut_uretimi;
    if (avg3 === 0) return 0;
    return ((last - avg3) / avg3) * 100;
  }, [historicalData]);

  const growthStrategy = useMemo(() => {
    if (redMeatData.length < 3) return '📊 Veri yetersiz';
    const recent = redMeatData.slice(-3);
    const first = recent[0]; const last = recent[recent.length - 1];
    const meatGrowth = last.toplam - first.toplam;
    if (Math.abs(meatGrowth) < 100) return '⚪ Stabil üretim';
    const buyukbasGrowth = last.buyukbas_toplam - first.buyukbas_toplam;
    const kucukbasGrowth = last.kucukbas_toplam - first.kucukbas_toplam;
    if (Math.abs(buyukbasGrowth) > Math.abs(kucukbasGrowth) * 1.5) return meatGrowth > 0 ? '🐮 Büyükbaş odaklı büyüme' : '🔴 Büyükbaş azalışı';
    if (Math.abs(kucukbasGrowth) > Math.abs(buyukbasGrowth) * 1.5) return meatGrowth > 0 ? '🐑 Küçükbaş odaklı büyüme' : '🔴 Küçükbaş azalışı';
    return meatGrowth > 0 ? '🟢 Dengeli büyüme' : '🟡 Karma trend';
  }, [redMeatData]);

  // suppress unused import warning
  void formatValue;

  return {
    loading, yearRange, setYearRange, mapFilter, setMapFilter,
    historicalData, redMeatData, poultryData,
    kpiData, historicalChartData, redMeatBreakdown, redMeatTrendData,
    buyukbasKucukbasData, poultryMonthlyData,
    worldBeefRanking, worldMilkRanking, worldChickenRanking, mapData,
    cagr5Year, forecastRedMeat, milkProductivityTrend, growthStrategy,
  };
}
