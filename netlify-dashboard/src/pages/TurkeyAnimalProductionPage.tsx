import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Download, TrendingUp, Award } from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend,
  Area, ComposedChart, Line
} from 'recharts';
import { TurkeyHeatMap } from '../components/TurkeyHeatMap';
import { Loading } from '../components/Loading';
import { fetchQuery } from '../services/api';
import { getRegionByProvince } from '../utils/productionCategories';

// Data Interfaces
interface HistoricalData {
  yillar: string;
  bal_uretimi: number;
  cig_sut_uretimi: number;
  kirmizi_et_uretimi: number;
  yumurta_milyon_adet: number;
  kanatli_eti_ton: number;
}

interface WorldData {
  ulke: string;
  urun: string;
  uretim_miktari_ton: number;
}

interface RedMeatData {
  yil: number;
  sigir: number;
  manda: number;
  buyukbas_toplam: number;
  koyun: number;
  keci: number;
  kucukbas_toplam: number;
  toplam: number;
}

interface PoultryData {
  tarih: string;
  tavuk_yumurtasi_bin_adet: number;
  tavuk_eti_ton: number;
}

interface CityData {
  il: string;
  sigir: number;
  manda: number;
  koyun: number;
  keci: number;
  balUretimi: number;
  kovan: number;
  balmumu: number;
  etTavugu: number;
  yumurtaTavugu: number;
}

const COLORS: Record<string, string> = {
  'Bal': '#f59e0b',
  'Süt': '#3b82f6',
  'Kırmızı Et': '#ef4444',
  'Yumurta': '#fbbf24',
  'Kanatlı': '#10b981',
  'Sığır': '#8b4513',
  'Koyun': '#a0522d',
  'Keçi': '#d2691e',
  'Manda': '#654321',
};

const TurkeyAnimalProductionPage: React.FC = () => {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [worldData, setWorldData] = useState<WorldData[]>([]);
  const [redMeatData, setRedMeatData] = useState<RedMeatData[]>([]);
  const [poultryData, setPoultryData] = useState<PoultryData[]>([]);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [yearRange, setYearRange] = useState<string>('last10');
  const [mapFilter, setMapFilter] = useState<'toplam' | 'sigir' | 'manda' | 'koyun' | 'keci' | 'kovan' | 'etTavugu' | 'yumurtaTavugu'>('toplam');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Paralel veri yükleme
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
          GROUP BY yer`)
      ]);

      // Historical data
      if (histRes.data && histRes.data.length > 0) {
        const processed = (histRes.data as Record<string, string | number>[]).map(row => ({
          yillar: String(row['yillar'] || row['Yıllar'] || ''),
          bal_uretimi: parseFloat(String(row['bal_uretimi'] || row['Bal Üretimi'] || '0')) || 0,
          cig_sut_uretimi: parseFloat(String(row['cig_sut_uretimi'] || row['Çiğ Süt Üretimi'] || '0')) || 0,
          kirmizi_et_uretimi: parseFloat(String(row['kirmizi_et_uretimi'] || row['Kırmızı Et Üretimi'] || '0')) || 0,
          yumurta_milyon_adet: parseFloat(String(row['yumurta_milyon_adet'] || row['Yumurta (Milyon Adet)'] || '0')) || 0,
          kanatli_eti_ton: parseFloat(String(row['kanatli_eti_ton'] || row['Kanatlı Eti (Ton)'] || '0')) || 0,
        }));
        setHistoricalData(processed);
      }

      // World data
      if (worldRes.data && worldRes.data.length > 0) {
        const processed = (worldRes.data as Record<string, string | number>[])
          .map(row => ({
            ulke: String(row['ulke'] || row['Ülke'] || ''),
            urun: String(row['urun'] || row['Ürün'] || ''),
            uretim_miktari_ton: parseFloat(String(row['uretim_miktari_ton'] || row['Üretim Miktarı (Ton)'] || '0')) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0);
        setWorldData(processed);
      }

      // Red meat data
      if (redMeatRes.data && redMeatRes.data.length > 0) {
        const processed = (redMeatRes.data as Record<string, string | number>[]).map(row => ({
          yil: parseInt(String(row['yil'] || row['Yıl'] || '0')) || 0,
          sigir: parseFloat(String(row['sigir'] || row['Sığır'] || '0')) || 0,
          manda: parseFloat(String(row['manda'] || row['Manda'] || '0')) || 0,
          buyukbas_toplam: parseFloat(String(row['buyukbas_toplam'] || row['Büyükbaş Toplam'] || '0')) || 0,
          koyun: parseFloat(String(row['koyun'] || row['Koyun'] || '0')) || 0,
          keci: parseFloat(String(row['keci'] || row['Keçi'] || '0')) || 0,
          kucukbas_toplam: parseFloat(String(row['kucukbas_toplam'] || row['Küçükbaş Toplam'] || '0')) || 0,
          toplam: parseFloat(String(row['toplam'] || row['Toplam'] || '0')) || 0,
        }));
        setRedMeatData(processed);
      }

      // Poultry data
      if (poultryRes.data && poultryRes.data.length > 0) {
        const processed = (poultryRes.data as Record<string, string | number>[]).map(row => ({
          tarih: String(row['tarih'] || row['Tarih'] || ''),
          tavuk_yumurtasi_bin_adet: parseFloat(String(row['tavuk_yumurtasi_bin_adet'] || row['Tavuk Yumurtası (Bin Adet)'] || '0')) || 0,
          tavuk_eti_ton: parseFloat(String(row['tavuk_eti_ton'] || row['Tavuk Eti (Ton)'] || '0')) || 0,
        }));
        setPoultryData(processed);
      }

      // City data for map
      if (cityRes.data && cityRes.data.length > 0) {
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
            existing.sigir += sigir;
            existing.manda += manda;
            existing.koyun += koyun;
            existing.keci += keci;
            existing.etTavugu += etTavugu;
            existing.yumurtaTavugu += yumurtaTavugu;
          } else {
            cityMap.set(il, { il, sigir, manda, koyun, keci, balUretimi: 0, kovan: 0, balmumu: 0, etTavugu, yumurtaTavugu });
          }
        });

        // Kovan ve balmumu verilerini ekle (hayvansaluretim tablosundan)
        if (kovanRes.data && kovanRes.data.length > 0) {
          (kovanRes.data as Record<string, string | number>[]).forEach(row => {
            const yer = String(row['yer'] || '').toUpperCase();
            if (!yer || yer === 'TOPLAM' || yer === 'TÜRKİYE') return;
            const kovan = Number(row['kovan']) || 0;
            const balmumu = Number(row['balmumu']) || 0;
            const existing = cityMap.get(yer);
            if (existing) {
              existing.kovan = kovan;
              existing.balmumu = balmumu;
              existing.balUretimi = kovan; // balUretimi = toplam kovan
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

  // KPI Calculations
  const latestHistorical = useMemo(() => historicalData[historicalData.length - 1], [historicalData]);
  const previousHistorical = useMemo(() => historicalData[historicalData.length - 2], [historicalData]);

  const kpiData = useMemo(() => {
    if (!latestHistorical || !previousHistorical) return null;
    
    const calculateChange = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : 0;
    
    return {
      redMeat: {
        value: latestHistorical.kirmizi_et_uretimi,
        change: calculateChange(latestHistorical.kirmizi_et_uretimi, previousHistorical.kirmizi_et_uretimi)
      },
      milk: {
        value: latestHistorical.cig_sut_uretimi,
        change: calculateChange(latestHistorical.cig_sut_uretimi, previousHistorical.cig_sut_uretimi)
      },
      egg: {
        value: latestHistorical.yumurta_milyon_adet,
        change: calculateChange(latestHistorical.yumurta_milyon_adet, previousHistorical.yumurta_milyon_adet)
      },
      honey: {
        value: latestHistorical.bal_uretimi,
        change: calculateChange(latestHistorical.bal_uretimi, previousHistorical.bal_uretimi)
      }
    };
  }, [latestHistorical, previousHistorical]);

  // Filtered historical data based on year range
  const filteredHistoricalData = useMemo(() => {
    if (yearRange === 'all') return historicalData;
    const yearsMap: Record<string, number> = { 'last5': 5, 'last10': 10, 'last20': 20 };
    const years = yearsMap[yearRange] || 10;
    return historicalData.slice(-years);
  }, [historicalData, yearRange]);

  // Chart data for historical trends
  const historicalChartData = useMemo(() => {
    return filteredHistoricalData.map(d => ({
      yil: d.yillar.substring(0, 4),
      'Süt (M ton)': (d.cig_sut_uretimi / 1000000).toFixed(2),
      'Kırmızı Et (K ton)': (d.kirmizi_et_uretimi / 1000).toFixed(0),
      'Kanatlı (K ton)': (d.kanatli_eti_ton / 1000).toFixed(0),
      'Yumurta (M adet)': d.yumurta_milyon_adet.toFixed(1),
      'Bal (K ton)': (d.bal_uretimi / 1000).toFixed(1),
    }));
  }, [filteredHistoricalData]);

  // Red meat breakdown
  const redMeatBreakdown = useMemo(() => {
    const latest = redMeatData[redMeatData.length - 1];
    if (!latest) return [];
    
    return [
      { name: 'Sığır', value: latest.sigir, color: COLORS['Sığır'] },
      { name: 'Koyun', value: latest.koyun, color: COLORS['Koyun'] },
      { name: 'Keçi', value: latest.keci, color: COLORS['Keçi'] },
      { name: 'Manda', value: latest.manda, color: COLORS['Manda'] },
    ].filter(item => item.value > 0);
  }, [redMeatData]);

  // Red meat trend - last 5 years
  const redMeatTrendData = useMemo(() => {
    return redMeatData.slice(-5).map(d => ({
      yil: String(d.yil),
      Sığır: d.sigir,
      Koyun: d.koyun,
      Keçi: d.keci,
      Manda: d.manda,
    }));
  }, [redMeatData]);

  // Büyükbaş vs Küçükbaş
  const buyukbasKucukbasData = useMemo(() => {
    return redMeatData.slice(-10).map(d => ({
      yil: String(d.yil),
      'Büyükbaş': d.buyukbas_toplam,
      'Küçükbaş': d.kucukbas_toplam,
    }));
  }, [redMeatData]);

  // Poultry monthly average
  const poultryMonthlyData = useMemo(() => {
    return poultryData.map(d => ({
      ay: d.tarih.substring(0, 7),
      'Tavuk Eti (ton)': d.tavuk_eti_ton,
      'Yumurta (M adet)': (d.tavuk_yumurtasi_bin_adet / 1000).toFixed(1),
    }));
  }, [poultryData]);

  // World rankings
  const worldBeefRanking = useMemo(() => {
    const beef = worldData
      .filter(d => d.urun === 'Sığır Eti (Manda Hariç)')
      .sort((a, b) => b.uretim_miktari_ton - a.uretim_miktari_ton)
      .slice(0, 15);
    
    const turkeyIndex = beef.findIndex(d => d.ulke === 'Türkiye');
    if (turkeyIndex !== -1) {
      return beef.map((d, i) => ({
        ulke: d.ulke,
        uretim: d.uretim_miktari_ton,
        isTurkey: d.ulke === 'Türkiye',
        rank: i + 1
      }));
    }
    return beef.slice(0, 10).map((d, i) => ({
      ulke: d.ulke,
      uretim: d.uretim_miktari_ton,
      isTurkey: false,
      rank: i + 1
    }));
  }, [worldData]);

  const worldMilkRanking = useMemo(() => {
    const milk = worldData
      .filter(d => d.urun === 'Sığırların çiğ sütü')
      .sort((a, b) => b.uretim_miktari_ton - a.uretim_miktari_ton)
      .slice(0, 15);
    
    const turkeyIndex = milk.findIndex(d => d.ulke === 'Türkiye');
    if (turkeyIndex !== -1) {
      return milk.map((d, i) => ({
        ulke: d.ulke,
        uretim: d.uretim_miktari_ton,
        isTurkey: d.ulke === 'Türkiye',
        rank: i + 1
      }));
    }
    return milk.slice(0, 10).map((d, i) => ({
      ulke: d.ulke,
      uretim: d.uretim_miktari_ton,
      isTurkey: false,
      rank: i + 1
    }));
  }, [worldData]);

  const worldChickenRanking = useMemo(() => {
    const chicken = worldData
      .filter(d => d.urun === 'Tavuk eti')
      .sort((a, b) => b.uretim_miktari_ton - a.uretim_miktari_ton)
      .slice(0, 15);
    
    const turkeyIndex = chicken.findIndex(d => d.ulke === 'Türkiye');
    if (turkeyIndex !== -1) {
      return chicken.map((d, i) => ({
        ulke: d.ulke,
        uretim: d.uretim_miktari_ton,
        isTurkey: d.ulke === 'Türkiye',
        rank: i + 1
      }));
    }
    return chicken.slice(0, 10).map((d, i) => ({
      ulke: d.ulke,
      uretim: d.uretim_miktari_ton,
      isTurkey: false,
      rank: i + 1
    }));
  }, [worldData]);

  // Map data
  const mapData = useMemo(() => {
    const regionMap = new Map<string, number>();
    
    cityData.forEach(item => {
      const region = getRegionByProvince(item.il);
      const currentValue = regionMap.get(region) || 0;
      let itemValue: number;
      
      switch (mapFilter) {
        case 'sigir':
          itemValue = item.sigir;
          break;
        case 'manda':
          itemValue = item.manda;
          break;
        case 'koyun':
          itemValue = item.koyun;
          break;
        case 'keci':
          itemValue = item.keci;
          break;
        case 'kovan':
          itemValue = item.kovan;
          break;
        case 'etTavugu':
          itemValue = item.etTavugu;
          break;
        case 'yumurtaTavugu':
          itemValue = item.yumurtaTavugu;
          break;
        case 'toplam':
        default:
          itemValue = item.sigir + item.manda + item.koyun + item.keci;
      }
      
      regionMap.set(region, currentValue + itemValue);
    });
    
    return Array.from(regionMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [cityData, mapFilter]);

  // Helper functions
  const formatValue = (v: number) => 
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : 
    v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : 
    v.toFixed(0);

  const formatShort = (v: number) => 
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : 
    v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : 
    v.toString();

  /* ─── 🧠 Intelligence Metrics ─── */
  // 5-year CAGR (Compound Annual Growth Rate) - Kırmızı Et Üretimi
  const cagr5Year = useMemo(() => {
    if (historicalData.length < 6) return 0;
    const recent = historicalData.slice(-6);
    const year5ago = recent[0].kirmizi_et_uretimi;
    const current = recent[recent.length - 1].kirmizi_et_uretimi;
    if (year5ago === 0) return 0;
    return (Math.pow(current / year5ago, 1/5) - 1) * 100;
  }, [historicalData]);

  // Linear Regression Forecast - Next year red meat production
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

  // Verimlilik Trendi - Süt üretimi son 3 yıl artışı
  const milkProductivityTrend = useMemo(() => {
    if (historicalData.length < 4) return 0;
    const recent = historicalData.slice(-4);
    const first3Year = (recent[0].cig_sut_uretimi + recent[1].cig_sut_uretimi + recent[2].cig_sut_uretimi) / 3;
    const last = recent[recent.length - 1].cig_sut_uretimi;
    if (first3Year === 0) return 0;
    return ((last - first3Year) / first3Year) * 100;
  }, [historicalData]);

  // Büyüme Stratejisi - Kırmızı et büyüme kompozisyonu
  const growthStrategy = useMemo(() => {
    if (redMeatData.length < 3) return '📊 Veri yetersiz';
    const recent = redMeatData.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    // Toplam et artışı
    const meatGrowth = last.toplam - first.toplam;
    
    // Eğer artış yoksa
    if (Math.abs(meatGrowth) < 100) return '⚪ Stabil üretim';
    
    // Büyükbaş vs Küçükbaş artış analizi
    const buyukbasGrowth = last.buyukbas_toplam - first.buyukbas_toplam;
    const kucukbasGrowth = last.kucukbas_toplam - first.kucukbas_toplam;
    
    if (Math.abs(buyukbasGrowth) > Math.abs(kucukbasGrowth) * 1.5) {
      return meatGrowth > 0 ? '🐮 Büyükbaş odaklı büyüme' : '🔴 Büyükbaş azalışı';
    }
    if (Math.abs(kucukbasGrowth) > Math.abs(buyukbasGrowth) * 1.5) {
      return meatGrowth > 0 ? '🐑 Küçükbaş odaklı büyüme' : '🔴 Küçükbaş azalışı';
    }
    return meatGrowth > 0 ? '🟢 Dengeli büyüme' : '🟡 Karma trend';
  }, [redMeatData]);

  const exportCSV = () => {
    const headers = ['Yıl', 'Kırmızı Et (ton)', 'Süt (ton)', 'Yumurta (M adet)', 'Kanatlı (ton)', 'Bal (ton)'];
    const rows = historicalData.map(d => [
      d.yillar.substring(0, 4),
      d.kirmizi_et_uretimi,
      d.cig_sut_uretimi,
      d.yumurta_milyon_adet,
      d.kanatli_eti_ton,
      d.bal_uretimi
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hayvansal_uretim_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return <Loading />;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
            <Package size={36} color="#ef4444" />
            Hayvansal Üretim Dashboard
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Türkiye hayvansal ürün üretim verileri • 1961-2024 tarihsel analiz
          </p>
        </div>
        <button 
          onClick={exportCSV} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 24px', 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          <Download size={18} />
          CSV İndir
        </button>
      </div>

      {/* Hero KPI Cards */}
      {kpiData && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '20px', 
          marginBottom: '48px' 
        }}>
          {/* Red Meat */}
          <div style={{ 
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
            padding: '24px', 
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🥩</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                TOPLAM KIRMIZI ET
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                {formatValue(kpiData.redMeat.value)} ton
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {kpiData.redMeat.change >= 0 ? '+' : ''}{kpiData.redMeat.change.toFixed(1)}% YoY
              </div>
            </div>
          </div>

          {/* Milk */}
          <div style={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
            padding: '24px', 
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🥛</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                TOPLAM SÜT ÜRETİMİ
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                {formatValue(kpiData.milk.value)} ton
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {kpiData.milk.change >= 0 ? '+' : ''}{kpiData.milk.change.toFixed(1)}% YoY
              </div>
            </div>
          </div>

          {/* Egg */}
          <div style={{ 
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
            padding: '24px', 
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🥚</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                TOPLAM YUMURTA
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                {kpiData.egg.value.toFixed(1)}B adet
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {kpiData.egg.change >= 0 ? '+' : ''}{kpiData.egg.change.toFixed(1)}% YoY
              </div>
            </div>
          </div>

          {/* Honey */}
          <div style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
            padding: '24px', 
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '6rem', opacity: 0.1 }}>🍯</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                TOPLAM BAL ÜRETİMİ
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                {formatValue(kpiData.honey.value)} ton
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '10px', fontWeight: '600' }}>
                <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {kpiData.honey.change >= 0 ? '+' : ''}{kpiData.honey.change.toFixed(1)}% YoY
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 🧠 Intelligence Panel ─── */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '48px',
        color: 'white'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🧠 Hayvansal Üretim Intelligence Özeti
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>5 YILLIK CAGR (KIRMIZI ET)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{cagr5Year >= 0 ? '+' : ''}{cagr5Year.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Yıllık bileşik büyüme</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>SÜT VERİMLİLİK TRENDİ</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{milkProductivityTrend >= 0 ? '+' : ''}{milkProductivityTrend.toFixed(1)}%</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 3 yıl büyüme</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>TAHMİN (KIRMIZI ET)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{forecastRedMeat > 0 ? formatValue(forecastRedMeat) : '-'} ton</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Linear trend tahmini</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>BÜYÜME STRATEJİSİ</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{growthStrategy}</div>
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Son 3 yıl analizi</div>
          </div>
        </div>
      </div>

      {/* Historical Trends */}
      {historicalChartData.length > 0 && (
        <>
          <div style={{ marginTop: '48px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                📈 Tarihsel Üretim Trendleri
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                1961-2024 dönemi hayvansal ürün üretim trendleri
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['last5', 'last10', 'last20', 'all'].map(range => (
                <button
                  key={range}
                  onClick={() => setYearRange(range)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: yearRange === range ? 'none' : '1px solid var(--border)',
                    background: yearRange === range ? 'var(--primary)' : 'var(--bg-card)',
                    color: yearRange === range ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  {range === 'all' ? 'Tüm Veri' : `Son ${range.replace('last', '')} Yıl`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '48px',
            gridColumn: 'span 2'
          }}>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={historicalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="yil" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="Süt (M ton)"
                  fill="#3b82f6"
                  stroke="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Kırmızı Et (K ton)"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Kanatlı (K ton)"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Yumurta (M adet)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ fill: '#fbbf24', r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Bal (K ton)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Red Meat Analysis */}
      {redMeatBreakdown.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🥩 Kırmızı Et Üretim Analizi
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Türkiye kırmızı et üretimi detaylı dağılım ve trend analizi
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '48px'
          }}>
            {/* Red Meat Breakdown Pie */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Kırmızı Et Türlerine Göre Dağılım
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie 
                    data={redMeatBreakdown} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={100} 
                    paddingAngle={3} 
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                  >
                    {redMeatBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Red Meat Stacked Trend */}
            {redMeatTrendData.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 Kırmızı Et Türleri (Son 5 Yıl)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={redMeatTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                    <Legend />
                    <Bar dataKey="Sığır" stackId="a" fill={COLORS['Sığır']} />
                    <Bar dataKey="Koyun" stackId="a" fill={COLORS['Koyun']} />
                    <Bar dataKey="Keçi" stackId="a" fill={COLORS['Keçi']} />
                    <Bar dataKey="Manda" stackId="a" fill={COLORS['Manda']} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Büyükbaş vs Küçükbaş */}
            {buyukbasKucukbasData.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                gridColumn: 'span 2'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🐂 Büyükbaş vs Küçükbaş Karşılaştırması
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={buyukbasKucukbasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Büyükbaş"
                      fill="#3b82f6"
                      stroke="#3b82f6"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Küçükbaş"
                      fill="#f59e0b"
                      stroke="#f59e0b"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Poultry Production */}
      {poultryMonthlyData.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🍗 Kanatlı Ürün Üretimi
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Tavuk eti ve yumurta üretimi - Son 24 ay detaylı analiz
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '48px'
          }}>
            {/* Chicken Meat */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🍗 Tavuk Eti Üretimi (Aylık Trend)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={poultryMonthlyData} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="ay" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                  <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                  <Area
                    type="monotone"
                    dataKey="Tavuk Eti (ton)"
                    fill="#10b981"
                    stroke="#10b981"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="Tavuk Eti (ton)"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ fill: '#059669', r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Egg Production */}
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🥚 Yumurta Üretimi (Aylık Trend)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={poultryMonthlyData} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="ay" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => `${v} M adet`} />
                  <Area
                    type="monotone"
                    dataKey="Yumurta (M adet)"
                    fill="#fbbf24"
                    stroke="#fbbf24"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="Yumurta (M adet)"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* World Rankings */}
      {(worldBeefRanking.length > 0 || worldMilkRanking.length > 0 || worldChickenRanking.length > 0) && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🌍 Dünya Sıralaması
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Türkiye'nin dünya hayvansal üretim sıralamasındaki yeri
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '48px'
          }}>
            {/* Beef Ranking */}
            {worldBeefRanking.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#ef4444" />
                  Sığır Eti - Dünya Top 10
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={worldBeefRanking.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <YAxis type="category" dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                    <Bar dataKey="uretim" radius={[0, 6, 6, 0]}>
                      {worldBeefRanking.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isTurkey ? '#ef4444' : '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Milk Ranking */}
            {worldMilkRanking.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#3b82f6" />
                  Süt Üretimi - Dünya Top 10
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={worldMilkRanking.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <YAxis type="category" dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                    <Bar dataKey="uretim" radius={[0, 6, 6, 0]}>
                      {worldMilkRanking.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isTurkey ? '#3b82f6' : '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chicken Ranking */}
            {worldChickenRanking.length > 0 && (
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#10b981" />
                  Tavuk Eti - Dünya Top 10
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={worldChickenRanking.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={formatShort} />
                    <YAxis type="category" dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: unknown) => `${formatValue(Number(v))} ton`} />
                    <Bar dataKey="uretim" radius={[0, 6, 6, 0]}>
                      {worldChickenRanking.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isTurkey ? '#10b981' : '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Map */}
      {mapData.length > 0 && (
        <>
          <div style={{ marginTop: '40px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🗺️ İl Bazlı Dağılım
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {mapFilter === 'toplam' 
                ? 'Bölgelere göre toplam hayvan sayısı (Sığır + Manda + Koyun + Keçi)'
                : mapFilter === 'kovan'
                ? 'Bölgelere göre kovan sayısı'
                : mapFilter === 'etTavugu'
                ? 'Bölgelere göre et tavuğu sayısı'
                : mapFilter === 'yumurtaTavugu'
                ? 'Bölgelere göre yumurta tavuğu sayısı'
                : `Bölgelere göre ${mapFilter === 'sigir' ? 'sığır' : mapFilter === 'manda' ? 'manda' : mapFilter === 'koyun' ? 'koyun' : 'keçi'} sayısı`}
            </p>
            
            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { key: 'toplam' as const, label: '🐄 Toplam', color: '#6b7280' },
                { key: 'sigir' as const, label: '🐄 Sığır', color: COLORS['Sığır'] },
                { key: 'manda' as const, label: '🐃 Manda', color: COLORS['Manda'] },
                { key: 'koyun' as const, label: '🐑 Koyun', color: COLORS['Koyun'] },
                { key: 'keci' as const, label: '🐐 Keçi', color: COLORS['Keçi'] },
                { key: 'kovan' as const, label: '🐝 Kovan', color: COLORS['Bal'] },
                { key: 'etTavugu' as const, label: '🍗 Et Tavuğu', color: '#ef4444' },
                { key: 'yumurtaTavugu' as const, label: '🥚 Yumurta Tavuğu', color: '#fbbf24' },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setMapFilter(filter.key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: mapFilter === filter.key ? `2px solid ${filter.color}` : '1px solid var(--border)',
                    background: mapFilter === filter.key ? `${filter.color}15` : 'var(--bg-card)',
                    color: mapFilter === filter.key ? filter.color : 'var(--text-secondary)',
                    fontWeight: mapFilter === filter.key ? '600' : '500',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '48px'
          }}>
            <TurkeyHeatMap regionTotals={mapData} unitLabel="Baş" height={450} />
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important; }
      `}</style>
    </div>
  );
};

export default TurkeyAnimalProductionPage;
