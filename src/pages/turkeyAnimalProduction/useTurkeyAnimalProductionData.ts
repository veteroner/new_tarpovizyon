import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchRows, fetchAgg, num } from '../../services/d1';

const R_CANLI = 'tuik/hayvancilik-canlihayvan';
const R_URETIM = 'tuik/hayvancilik-hayvansaluretim';
const TOPLAM_SATIRLARI = ['TOPLAM', 'Toplam', 'TÜRKİYE', 'Türkiye'];
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
  // null taşır: TÜİK yayımlamamış ay grafikte boşluk olarak çizilir
  poultryMonthlyData: Record<string, string | number | null>[];
  worldBeefRanking: WorldRankingItem[];
  worldMilkRanking: WorldRankingItem[];
  worldChickenRanking: WorldRankingItem[];
  mapData: { name: string; value: number }[];
  /** İl bazında ham veri — Basic'in iniş sayfası il haritası çiziyor. */
  cityData: CityData[];
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

/** Değer yoksa null döner; 0 DÖNMEZ — "veri yok" ile "üretim sıfır" aynı şey değil. */
function sayiVeyaBos(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
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
      const [histRows, worldRows, redMeatRows, poultryRows, cityRaw, kovanRaw] = await Promise.all([
        fetchRows('oner/hayvansal-urun-uretimi', { limit: 200 }),
        fetchRows('oner/dunya-hayvansal-uretim', { limit: 5000 }),
        fetchRows('oner/kirmizi-et-uretimi', { limit: 200 }),
        /*
         * DİKKAT — 'oner/kanatli-uretimleri' DEĞİL.
         *
         * İki tablo aynı veriyi tutuyor: oner_kanatli_uretimleri eski MySQL
         * göçünden kalma DONMUŞ kopya (2025-11'de duruyor, üstelik 5 tane
         * tamamı boş satırı var), kanatli_uretimleri ise günlük TÜİK senkron
         * işinin (scripts/tuik-sync) güncel tuttuğu tablo — 2026-05'e kadar
         * dolu. Örtüşen 196 ayın 12'sinde de değerler farklı; TÜİK aylık
         * rakamları revize ediyor ve doğru olan senkron tablosundaki.
         */
        fetchRows('kanatli/uretimleri', { limit: 500 }),
        // SUM(CASE WHEN grup=… ) pivotu: grup/kategori kırılımı çekilip
        // istemcide pivotlanıyor.
        /*
           * DİKKAT — 'il' DEĞİL 'yer'. duzeykod=3 (il düzeyi) satırlarında il
           * adı `yer` sütununda duruyor ve `il` BOŞ; ilçe satırlarında tam
           * tersi. 'il' ile gruplayınca tek bir boş anahtar dönüyor ve harita
           * sessizce boş kalıyordu.
           */
          fetchAgg(R_CANLI, { groupBy: ['yer', 'grup', 'kategori'], sum: ['y2024'], where: { duzeykod: 3 } }),
        // NOT: MySQL'de Kovan sayıları '487.085' gibi METİNDİ ve sorgu
        // REPLACE(…,'.','') uyguluyordu. D1'de sayısal — nokta silmek ondalıklı
        // Balmumu değerini bozardı, doğrudan toplanıyor.
        fetchAgg(R_URETIM, { groupBy: ['yer', 'urun'], sum: ['2024'],
          where: { duzeykod: 3 }, whereIn: { urun: ['Kovan', 'Balmumu'] } }),
      ]);

      const histRes = { data: [...histRows].sort((a, b) => String(a.yillar).localeCompare(String(b.yillar))) };
      const worldRes = { data: worldRows };
      const redMeatRes = { data: [...redMeatRows].sort((a, b) => Number(a.yil) - Number(b.yil)) };
      // DATE_SUB(NOW(), INTERVAL 24 MONTH) karşılığı.
      const yirmiDortAyOnce = new Date();
      yirmiDortAyOnce.setMonth(yirmiDortAyOnce.getMonth() - 24);
      const esik = yirmiDortAyOnce.toISOString().slice(0, 10);
      const poultryRes = { data: poultryRows
        .filter((r) => String(r.tarih ?? '').slice(0, 10) >= esik)
        .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih))) };

      const ilHaritasi = new Map<string, Record<string, number | string>>();
      for (const r of cityRaw) {
        // Sorgu `yer` ile gruplanıyor: duzeykod=3'te il adı orada, `il` BOŞ.
          const il = String(r.yer ?? '');
        if (!il || TOPLAM_SATIRLARI.includes(il)) continue;
        const kayit = ilHaritasi.get(il) ?? { il, sigir: 0, manda: 0, koyun: 0, keci: 0, etTavugu: 0, yumurtaTavugu: 0 };
        const grup = String(r.grup ?? '');
        const kategori = String(r.kategori ?? '');
        const v = num(r.sum_y2024);
        if (grup === 'Sığır') kayit.sigir = (kayit.sigir as number) + v;
        else if (grup === 'Manda') kayit.manda = (kayit.manda as number) + v;
        else if (grup === 'Koyun') kayit.koyun = (kayit.koyun as number) + v;
        else if (grup === 'Keçi') kayit.keci = (kayit.keci as number) + v;
        else if (grup === 'Tavuk' && kategori === 'Et Tavuğu') kayit.etTavugu = (kayit.etTavugu as number) + v;
        else if (grup === 'Tavuk' && kategori === 'Yumurta Tavuğu') kayit.yumurtaTavugu = (kayit.yumurtaTavugu as number) + v;
        ilHaritasi.set(il, kayit);
      }
      const cityRes = { data: [...ilHaritasi.values()] };

      const kovanHaritasi = new Map<string, Record<string, number | string>>();
      for (const r of kovanRaw) {
        const yer = String(r.yer ?? '');
        const kayit = kovanHaritasi.get(yer) ?? { yer, kovan: 0, balmumu: 0 };
        const v = num(r['sum_2024']);
        if (String(r.urun ?? '') === 'Kovan') kayit.kovan = (kayit.kovan as number) + v;
        else kayit.balmumu = (kayit.balmumu as number) + v;
        kovanHaritasi.set(yer, kayit);
      }
      const kovanRes = { data: [...kovanHaritasi.values()] };

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
          /*
           * NULL'u 0'a çevirmek YANLIŞ: TÜİK'in henüz yayımlamadığı aylar
           * "üretim sıfır" diye çiziliyordu. Veri yoksa null kalmalı —
           * Recharts null'da çizgiyi kesip boşluk bırakıyor.
           */
          tavuk_yumurtasi_bin_adet: sayiVeyaBos(row['tavuk_yumurtasi_bin_adet']),
          tavuk_eti_ton: sayiVeyaBos(row['tavuk_eti_ton']),
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
      // Kaynak sütun MİLYON adet cinsinden; kart 'Milyar adet' yazdığı için
      // gösterimde 1000'e bölünüyor (19.892,7 milyon = 19,89 milyar).
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
    // toFixed bir METİN üretiyordu; Recharts metni sayı sanıp ölçekliyor ama
    // null olan ayda "null" metni çıkıyordu. Sayı bırakıp null'u koruyoruz.
    'Yumurta (M adet)': d.tavuk_yumurtasi_bin_adet === null
      ? null
      : Math.round(d.tavuk_yumurtasi_bin_adet / 100) / 10,
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
    // Basic'in iniş sayfası İL bazında harita çiziyor; mapData bölgeye toplanmış
    // olduğu için ham il verisi de veriliyor. Yalnızca ekleme, Pro etkilenmiyor.
    cityData,
    cagr5Year, forecastRedMeat, milkProductivityTrend, growthStrategy,
  };
}
