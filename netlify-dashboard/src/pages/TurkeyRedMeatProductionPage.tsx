import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from 'recharts';
import { fetchQuery } from '../services/api';

// Type Definitions
type YearPoint = {
  year: number;
  totalTon: number;
  cattleTon: number;
  sheepTon: number;
  goatTon: number;
  buffaloTon: number;
  buyukbasToplam: number;
  kucukbasToplam: number;
};

type EconomicData = {
  tarih: string;
  karkas_paritesi: number;
  besi_yemi_fiyatlari_tl_kg: number;
  dolar_kuru_tl: number;
  besilik_dana_fiyatlari_tl_kg: number;
  dana_karkas_maliyet_tl_kg: number;
  dana_karkas_fiyati_tl_kg: number;
  karlilik: number;
  kuzu_karkas_fiyati_tl_kg: number;
  besilik_kucukbas_fiyatlari_tl_kg: number;
  dana_karkas_fiyat_maliyet_farki_tl_kg: number;
};

type WorldCarcassPrices = {
  ingiltere: number;
  abd: number;
  ab_27: number;
  yeni_zelanda: number;
  avustralya: number;
  arjantin: number;
  uruguay: number;
  brezilya: number;
  turkiye: number;
};

type ProductivityComparison = {
  ulke: string;
  karkas_verimi: number;
};

type CarcassWeightData = {
  ulke: string;
  karkas_verimi_kg: number;
};

type ConsumptionData = {
  kirmizi_et_tuketimi_kg: number;
  yumurta_tuketimi_adet: number;
  pilic_eti_kg: number;
  bal_tuketimi_kg: number;
};

type ConsumptionComparison = {
  ulke: string;
  kanatli_eti: number;
  sigir_eti: number;
  koyun_keci_eti: number;
  domuz_eti: number;
  balik_ve_deniz_urunleri: number;
  diger_etler: number;
};

type ImportData = {
  yil: string;
  karkas_et_ithalati_ton: number;
  besilik_sigir_bas: number;
  besilik_kesimlik_kucukbas_sayisi_bas: number;
  toplam_ithalata_odenen_dolar: number;
};

type WorldRankings = {
  cattle: { world: number; eu: number };
  sheep: { world: number; eu: number };
  goat: { world: number; eu: number };
};

const MEAT_COLORS = { 
  Sığır: '#c0392b',   // Koyu kırmızı - Dana eti
  Koyun: '#e67e22',   // Turuncu - Kuzu eti
  Keçi: '#16a085',    // Turkuaz - Keçi
  Manda: '#8e44ad',   // Mor - Manda
  Büyükbaş: '#3b82f6',
  Küçükbaş: '#f59e0b'
};

function extractYear(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const m = raw.match(/(19|20)\d{2}/);
  if (m) return Number(m[0]);
  return Number.parseInt(raw, 10) || 0;
}

function formatTon(value: number): string {
  if (value >= 1e6) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value / 1e6) + ' M ton';
  if (value >= 1e3) return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ' ton';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value) + ' ton';
}

function formatShort(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toFixed(0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);
}

export default function TurkeyRedMeatProductionPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [startYear, setStartYear] = useState<number>(2010);
  const [economicData, setEconomicData] = useState<EconomicData[]>([]);
  const [econStartDate, setEconStartDate] = useState<string>('');
  const [econEndDate, setEconEndDate] = useState<string>('');
  const [worldCarcassPrices, setWorldCarcassPrices] = useState<WorldCarcassPrices | null>(null);
  const [productivityComparison, setProductivityComparison] = useState<ProductivityComparison[]>([]);
  const [carcassWeightData, setCarcassWeightData] = useState<CarcassWeightData[]>([]);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData | null>(null);
  const [consumptionComparison, setConsumptionComparison] = useState<ConsumptionComparison[]>([]);
  const [importData, setImportData] = useState<ImportData[]>([]);
  const [worldRankings, setWorldRankings] = useState<WorldRankings | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ana Üretim Verisi (1961-2024) - oner_hayvansal_urun_uretimi
      const histRes = await fetchQuery('SELECT * FROM oner_hayvansal_urun_uretimi ORDER BY yillar');
      const histData = (histRes.data ?? []) as Record<string, string | number>[];
      
      // 2. Türlere Göre Kırılım (2010-2024) - oner_kirmizi_et_uretimi
      const detailRes = await fetchQuery('SELECT * FROM oner_kirmizi_et_uretimi ORDER BY yil');
      const detailData = (detailRes.data ?? []) as Record<string, string | number>[];
      
      // Ana seriyi oluştur (1961-2024)
      const allPoints = histData.map(row => ({
        year: extractYear(row['yillar']),
        totalTon: Number(row['kirmizi_et_uretimi']) || 0,
        cattleTon: 0,
        sheepTon: 0,
        goatTon: 0,
        buffaloTon: 0,
        buyukbasToplam: 0,
        kucukbasToplam: 0,
      }));

      // Detay verilerini ekle (2010+)
      detailData.forEach(row => {
        const year = Number(row['yil']);
        const point = allPoints.find(p => p.year === year);
        if (point) {
          point.cattleTon = Number(row['sigir']) || 0;
          point.buffaloTon = Number(row['manda']) || 0;
          point.sheepTon = Number(row['koyun']) || 0;
          point.goatTon = Number(row['keci']) || 0;
          point.buyukbasToplam = Number(row['buyukbas_toplam']) || 0;
          point.kucukbasToplam = Number(row['kucukbas_toplam']) || 0;
        }
      });

      setSeries(allPoints.filter(p => p.year > 0).sort((a, b) => a.year - b.year));
      
      // 3. Ekonomik Göstergeler
      const economicQuery = `SELECT 
        DATE_FORMAT(tarih, '%Y-%m') as tarih,
        karkas_paritesi, besi_yemi_fiyatlari_tl_kg, dolar_kuru_tl,
        besilik_dana_fiyatlari_tl_kg, dana_karkas_maliyet_tl_kg,
        dana_karkas_fiyati_tl_kg, karlilik, kuzu_karkas_fiyati_tl_kg,
        besilik_kucukbas_fiyatlari_tl_kg, dana_karkas_fiyat_maliyet_farki_tl_kg
        FROM oner_kirmizi_et_ekonomik_gostergeler 
        ORDER BY tarih DESC LIMIT 60`;
      const economicRes = await fetchQuery(economicQuery);
      if (economicRes.data && economicRes.data.length > 0) {
        const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
          tarih: String(item['tarih'] || ''),
          karkas_paritesi: Number(item['karkas_paritesi']) || 0,
          besi_yemi_fiyatlari_tl_kg: Number(item['besi_yemi_fiyatlari_tl_kg']) || 0,
          dolar_kuru_tl: Number(item['dolar_kuru_tl']) || 0,
          besilik_dana_fiyatlari_tl_kg: Number(item['besilik_dana_fiyatlari_tl_kg']) || 0,
          dana_karkas_maliyet_tl_kg: Number(item['dana_karkas_maliyet_tl_kg']) || 0,
          dana_karkas_fiyati_tl_kg: Number(item['dana_karkas_fiyati_tl_kg']) || 0,
          karlilik: Number(item['karlilik']) || 0,
          kuzu_karkas_fiyati_tl_kg: Number(item['kuzu_karkas_fiyati_tl_kg']) || 0,
          besilik_kucukbas_fiyatlari_tl_kg: Number(item['besilik_kucukbas_fiyatlari_tl_kg']) || 0,
          dana_karkas_fiyat_maliyet_farki_tl_kg: Number(item['dana_karkas_fiyat_maliyet_farki_tl_kg']) || 0,
        }));
        setEconomicData(mapped);
        if (mapped.length > 0) {
          setEconEndDate(mapped[0].tarih);
          setEconStartDate(mapped[Math.min(11, mapped.length - 1)].tarih);
        }
      }

      // 4. Dünya Karkas Fiyatları
      const pricesRes = await fetchQuery('SELECT * FROM oner_dunya_karkas_fiyatlari LIMIT 1');
      if (pricesRes.data && pricesRes.data.length > 0) {
        const row = pricesRes.data[0];
        setWorldCarcassPrices({
          ingiltere: Number(row['ingiltere']) || 0,
          abd: Number(row['abd']) || 0,
          ab_27: Number(row['ab_27']) || 0,
          yeni_zelanda: Number(row['yeni_zelanda']) || 0,
          avustralya: Number(row['avustralya']) || 0,
          arjantin: Number(row['arjantin']) || 0,
          uruguay: Number(row['uruguay']) || 0,
          brezilya: Number(row['brezilya']) || 0,
          turkiye: Number(row['turkiye']) || 0,
        });
      }

      // 5. Verimlilik Karşılaştırma
      try {
        const prodRes = await fetchQuery('SELECT `Ülke` as ulke, REPLACE(`Karkas Verimi (Kg)`, \',\', \'.\') * 1 as karkas_verimi FROM o_dunya_kaarkas_veri ORDER BY karkas_verimi DESC');
        if (prodRes.data) {
          setProductivityComparison(prodRes.data
            .map((r: Record<string, string | number>) => ({
              ulke: String(r['ulke'] || ''),
              karkas_verimi: Number(r['karkas_verimi']) || 0,
            }))
            .filter(d => d.ulke && d.ulke.trim().length > 0));
        }
      } catch (err) {
        console.warn('Verimlilik karşılaştırma tablosu yok:', err);
      }

      // 6. Karkas Ağırlığı Verileri (193 ülke)
      const carcassRes = await fetchQuery('SELECT * FROM oner_dunya_karkas_agirligi_verileri ORDER BY karkas_verimi_kg DESC');
      if (carcassRes.data) {
        setCarcassWeightData(carcassRes.data
          .map((r: Record<string, string | number>) => ({
            ulke: String(r['ulke'] || ''),
            karkas_verimi_kg: Number(r['karkas_verimi_kg']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0));
      }

      // 7. Türkiye Tüketim Verileri
      const consRes = await fetchQuery('SELECT * FROM oner_kisi_basina_guncel_tuketimler LIMIT 1');
      if (consRes.data && consRes.data.length > 0) {
        const row = consRes.data[0];
        setConsumptionData({
          kirmizi_et_tuketimi_kg: Number(row['kirmizi_et_tuketimi_kg']) || 0,
          yumurta_tuketimi_adet: Number(row['yumurta_tuketimi_adet']) || 0,
          pilic_eti_kg: Number(row['pilic_eti_kg']) || 0,
          bal_tuketimi_kg: Number(row['bal_tuketimi_kg']) || 0,
        });
      }

      // 8. Dünya Et Tüketimi Karşılaştırma
      const compRes = await fetchQuery('SELECT * FROM oner_karsilastirma_et_tuketimi');
      if (compRes.data) {
        setConsumptionComparison(compRes.data
          .map((r: Record<string, string | number>) => ({
            ulke: String(r['ulke'] || ''),
            kanatli_eti: Number(r['kanatli_eti']) || 0,
            sigir_eti: Number(r['sigir_eti']) || 0,
            koyun_keci_eti: Number(r['koyun_keci_eti']) || 0,
            domuz_eti: Number(r['domuz_eti']) || 0,
            balik_ve_deniz_urunleri: Number(r['balik_ve_deniz_urunleri']) || 0,
            diger_etler: Number(r['diger_etler']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0));
      }

      // 9. İthalat Verileri
      const importRes = await fetchQuery(`SELECT 
        ithalat as yil,
        COALESCE(column_11, 0) as karkas_et_ithalati_ton,
        COALESCE(column_5, 0) as besilik_sigir_bas,
        COALESCE(column_1, 0) as besilik_kesimlik_kucukbas_sayisi_bas,
        (
          COALESCE(column_2, 0) +
          COALESCE(column_4, 0) +
          COALESCE(column_6, 0) +
          COALESCE(column_8, 0) +
          COALESCE(column_10, 0)
        ) as toplam_ithalata_odenen_dolar
        FROM oner_canli_hayvan_ve_et_ithalati 
        WHERE ithalat >= 2010 
        ORDER BY ithalat`);
      if (importRes.data && importRes.data.length > 0) {
        const mappedData = importRes.data.map((r: Record<string, string | number>) => {
          const karkas = Number(r['karkas_et_ithalati_ton']) || 0;
          const sigir = Number(r['besilik_sigir_bas']) || 0;
          const kucukbas = Number(r['besilik_kesimlik_kucukbas_sayisi_bas']) || 0;
          const harcama = Number(r['toplam_ithalata_odenen_dolar']) || 0;
          
          return {
            yil: String(r['yil'] || ''),
            karkas_et_ithalati_ton: karkas,
            besilik_sigir_bas: sigir,
            besilik_kesimlik_kucukbas_sayisi_bas: kucukbas,
            toplam_ithalata_odenen_dolar: harcama,
          };
        });
        
        console.log('İthalat verileri yüklendi:', mappedData.length, 'kayıt');
        console.log('İlk kayıt:', mappedData[0]);
        console.log('Son kayıt:', mappedData[mappedData.length - 1]);
        
        setImportData(mappedData);
      } else {
        console.warn('İthalat verileri bulunamadı');
      }

      // 10. Dünya Sıralamaları (FAO)
      try {
        const rankingQueries = [
          `SELECT area, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary 
           WHERE year='2023' AND element='Production' AND unit='t' 
           AND item='Meat of cattle with the bone, fresh or chilled'
           AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC`,
          `SELECT area, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary 
           WHERE year='2023' AND element='Production' AND unit='t' 
           AND item='Meat of sheep, fresh or chilled'
           AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC`,
          `SELECT area, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary 
           WHERE year='2023' AND element='Production' AND unit='t' 
           AND item='Meat of goat, fresh or chilled'
           AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC`,
        ];

        const [cattleRes, sheepRes, goatRes] = await Promise.all(
          rankingQueries.map(q => fetchQuery(q).catch(() => ({ data: [] })))
        );

        const findRank = (data: Record<string, string | number>[], isEU: boolean) => {
          if (!data || data.length === 0) return 0;
          const areas = data.map((r: Record<string, string | number>) => String(r.area || ''));
          const turkeyIndex = areas.findIndex(a => a === 'Türkiye' || a === 'Turkey');
          if (turkeyIndex === -1) return 0;
          
          if (isEU) {
            const euCountries = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 
              'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 
              'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 
              'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden'];
            const euList = areas.filter(a => euCountries.includes(a) || a === 'Türkiye' || a === 'Turkey');
            return euList.indexOf('Türkiye') + 1 || euList.indexOf('Turkey') + 1 || 0;
          }
          return turkeyIndex + 1;
        };

        setWorldRankings({
          cattle: { world: findRank(cattleRes.data || [], false), eu: findRank(cattleRes.data || [], true) },
          sheep: { world: findRank(sheepRes.data || [], false), eu: findRank(sheepRes.data || [], true) },
          goat: { world: findRank(goatRes.data || [], false), eu: findRank(goatRes.data || [], true) },
        });
      } catch (e) {
        console.warn('Dünya sıralamaları yüklenemedi:', e);
      }

    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // useMemo calculations
  const availableYears = useMemo(() => series.map((p) => p.year), [series]);
  const minYear = useMemo(() => (availableYears.length ? Math.min(...availableYears) : 0), [availableYears]);
  const maxYear = useMemo(() => (availableYears.length ? Math.max(...availableYears) : 0), [availableYears]);

  const filteredSeries = useMemo(() => {
    if (!startYear) return series;
    return series.filter((p) => p.year >= startYear);
  }, [series, startYear]);

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].totalTon > 0) return series[i];
    }
    return series[series.length - 1];
  }, [series]);

  const prev = useMemo(() => {
    if (!latest) return undefined;
    const idx = series.findIndex((p) => p.year === latest.year);
    if (idx > 0) return series[idx - 1];
    return undefined;
  }, [latest, series]);

  const yoy = useMemo(() => {
    if (!latest || !prev || prev.totalTon <= 0) return 0;
    return ((latest.totalTon - prev.totalTon) / prev.totalTon) * 100;
  }, [latest, prev]);

  const avgLast5 = useMemo(() => {
    if (!series.length) return 0;
    const last = series.slice(-5);
    const values = last.map((p) => p.totalTon).filter((v) => v > 0);
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [series]);

  const peak = useMemo(() => {
    let best: YearPoint | undefined;
    for (const p of series) {
      if (!best || p.totalTon > best.totalTon) best = p;
    }
    return best;
  }, [series]);

  const breakdown = useMemo(() => {
    if (!latest) return [];
    const items = [
      { name: 'Sığır', value: latest.cattleTon, color: MEAT_COLORS['Sığır'] },
      { name: 'Koyun', value: latest.sheepTon, color: MEAT_COLORS['Koyun'] },
      { name: 'Keçi', value: latest.goatTon, color: MEAT_COLORS['Keçi'] },
      { name: 'Manda', value: latest.buffaloTon, color: MEAT_COLORS['Manda'] },
    ];
    return items.filter(item => item.value > 0);
  }, [latest]);

  const buyukbasKucukbasBreakdown = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Büyükbaş', value: latest.buyukbasToplam, color: MEAT_COLORS['Büyükbaş'] },
      { name: 'Küçükbaş', value: latest.kucukbasToplam, color: MEAT_COLORS['Küçükbaş'] },
    ].filter(item => item.value > 0);
  }, [latest]);

  const filteredEconomicData = useMemo(() => {
    if (!econStartDate || !econEndDate) return economicData;
    return economicData.filter(d => d.tarih >= econStartDate && d.tarih <= econEndDate);
  }, [economicData, econStartDate, econEndDate]);

  const worldCarcassPriceTreemap = useMemo(() => {
    if (!worldCarcassPrices) return [];
    return [
      { name: 'İngiltere', value: worldCarcassPrices.ingiltere, fill: '#dc2626' },
      { name: 'ABD', value: worldCarcassPrices.abd, fill: '#ea580c' },
      { name: 'AB-27', value: worldCarcassPrices.ab_27, fill: '#d97706' },
      { name: 'Yeni Zelanda', value: worldCarcassPrices.yeni_zelanda, fill: '#ca8a04' },
      { name: 'Avustralya', value: worldCarcassPrices.avustralya, fill: '#84cc16' },
      { name: 'Arjantin', value: worldCarcassPrices.arjantin, fill: '#22c55e' },
      { name: 'Uruguay', value: worldCarcassPrices.uruguay, fill: '#14b8a6' },
      { name: 'Brezilya', value: worldCarcassPrices.brezilya, fill: '#0ea5e9' },
      { name: 'Türkiye', value: worldCarcassPrices.turkiye, fill: '#6366f1' },
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [worldCarcassPrices]);

  const productivityRadarData = useMemo(() => {
    return productivityComparison.slice(0, 11).map(p => ({
      ulke: p.ulke,
      karkas_verimi: p.karkas_verimi,
    }));
  }, [productivityComparison]);

  const consumptionRadarData = useMemo(() => {
    return consumptionComparison.map(c => ({
      ulke: c.ulke,
      kanatli_eti: c.kanatli_eti,
      sigir_eti: c.sigir_eti,
      koyun_keci_eti: c.koyun_keci_eti,
      domuz_eti: c.domuz_eti,
      balik_ve_deniz_urunleri: c.balik_ve_deniz_urunleri,
    }));
  }, [consumptionComparison]);

  const carcassWeightHistogram = useMemo(() => {
    if (carcassWeightData.length === 0) return [];
    const weights = carcassWeightData.map(d => d.karkas_verimi_kg).filter(w => w > 0);
    if (weights.length === 0) return [];
    
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const binCount = 15;
    const binSize = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}`,
      count: 0,
    }));
    
    weights.forEach(w => {
      const binIndex = Math.min(binCount - 1, Math.floor((w - min) / binSize));
      bins[binIndex].count++;
    });
    
    return bins;
  }, [carcassWeightData]);

  // İthalat Analizleri için Hesaplamalar
  const importAnalytics = useMemo(() => {
    if (importData.length === 0) return null;
    
    const latest = importData[importData.length - 1];
    const previous = importData[importData.length - 2];
    
    // YoY Değişimler
    const calculateYoY = (current: number, prev: number) => {
      if (!prev || prev === 0) return 0;
      return ((current - prev) / prev) * 100;
    };
    
    // Ortalamalar
    const avgCarcass = importData.reduce((sum, d) => sum + d.karkas_et_ithalati_ton, 0) / importData.length;
    const avgCattle = importData.reduce((sum, d) => sum + d.besilik_sigir_bas, 0) / importData.length;
    const avgSmallRuminant = importData.reduce((sum, d) => sum + d.besilik_kesimlik_kucukbas_sayisi_bas, 0) / importData.length;
    const avgSpending = importData.reduce((sum, d) => sum + d.toplam_ithalata_odenen_dolar, 0) / importData.length;
    
    // CAGR hesaplama (2010-2024)
    const calculateCAGR = (start: number, end: number, years: number) => {
      if (!start || start === 0 || !end || end === 0) return 0;
      return (Math.pow(end / start, 1 / years) - 1) * 100;
    };
    
    const firstYear = importData[0];
    const lastYear = importData[importData.length - 1];
    const yearDiff = importData.length - 1;
    
    return {
      latest: {
        carcass: latest.karkas_et_ithalati_ton,
        cattle: latest.besilik_sigir_bas,
        smallRuminant: latest.besilik_kesimlik_kucukbas_sayisi_bas,
        spending: latest.toplam_ithalata_odenen_dolar,
        year: latest.yil,
      },
      yoy: previous ? {
        carcass: calculateYoY(latest.karkas_et_ithalati_ton, previous.karkas_et_ithalati_ton),
        cattle: calculateYoY(latest.besilik_sigir_bas, previous.besilik_sigir_bas),
        smallRuminant: calculateYoY(latest.besilik_kesimlik_kucukbas_sayisi_bas, previous.besilik_kesimlik_kucukbas_sayisi_bas),
        spending: calculateYoY(latest.toplam_ithalata_odenen_dolar, previous.toplam_ithalata_odenen_dolar),
      } : null,
      averages: {
        carcass: avgCarcass,
        cattle: avgCattle,
        smallRuminant: avgSmallRuminant,
        spending: avgSpending,
      },
      cagr: {
        carcass: calculateCAGR(firstYear.karkas_et_ithalati_ton, lastYear.karkas_et_ithalati_ton, yearDiff),
        cattle: calculateCAGR(firstYear.besilik_sigir_bas, lastYear.besilik_sigir_bas, yearDiff),
        smallRuminant: calculateCAGR(firstYear.besilik_kesimlik_kucukbas_sayisi_bas, lastYear.besilik_kesimlik_kucukbas_sayisi_bas, yearDiff),
        spending: calculateCAGR(firstYear.toplam_ithalata_odenen_dolar, lastYear.toplam_ithalata_odenen_dolar, yearDiff),
      },
      unitCost: latest.karkas_et_ithalati_ton > 0 
        ? latest.toplam_ithalata_odenen_dolar / latest.karkas_et_ithalati_ton 
        : 0,
    };
  }, [importData]);

  const importComposition = useMemo(() => {
    if (importData.length === 0) return [];
    const latest = importData[importData.length - 1];
    return [
      { name: 'Karkas Et', value: latest.karkas_et_ithalati_ton, color: '#dc2626' },
      { name: 'Besilik Sığır', value: latest.besilik_sigir_bas, color: '#ea580c' },
      { name: 'Küçükbaş', value: latest.besilik_kesimlik_kucukbas_sayisi_bas, color: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [importData]);

  // Yeterlilik (SSR) Proxy (eldeki verilerle en iyi yaklaşım):
  // Üretim / (Üretim + İthalat(Karkas Et + Canlı Hayvan Karkas Eşdeğeri))
  // Varsayımlar: ihracat=0, stok değişimi=0
  // Canlı hayvan dönüşümü:
  // - Büyükbaş: 300 kg canlı ağırlık, %55 randıman => 165 kg = 0.165 ton/baş
  // - Küçükbaş: 100 kg canlı ağırlık, %50 randıman => 50 kg = 0.05 ton/baş
  const ssrProxyLatest = useMemo(() => {
    if (!importAnalytics) return null;
    const importYear = extractYear(importAnalytics.latest.year);
    if (!importYear) return null;

    // Üretim serisinde ilgili yıl 0/boş olabiliyor (ör. en son yıl henüz girilmemiş).
    // Bu durumda ithalat yılından geriye giderek en son dolu üretim yılını kullan.
    const prodPoint = [...series]
      .filter((p) => p.year <= importYear && p.totalTon > 0)
      .sort((a, b) => a.year - b.year)
      .at(-1);

    const prodYear = prodPoint?.year ?? 0;
    const prod = prodPoint?.totalTon ?? 0;
    if (!prodYear || prod <= 0) return null;

    const carcassImportTon = importAnalytics.latest.carcass ?? 0;
    const cattleHead = importAnalytics.latest.cattle ?? 0;
    const smallRuminantHead = importAnalytics.latest.smallRuminant ?? 0;

    const cattleCweTon = cattleHead * 0.165;
    const smallRuminantCweTon = smallRuminantHead * 0.05;
    const liveCweTon = cattleCweTon + smallRuminantCweTon;

    const totalImportTon = carcassImportTon + liveCweTon;
    const denom = prod + totalImportTon;
    if (denom <= 0) return null;

    const ssr = (prod / denom) * 100;
    const importShare = (totalImportTon / denom) * 100;
    const carcassShare = (carcassImportTon / denom) * 100;
    const liveShare = (liveCweTon / denom) * 100;

    return {
      year: prodYear,
      importYear,
      ssr,
      importShare,
      carcassShare,
      liveShare,
      prod,
      carcassImportTon,
      liveCweTon,
      totalImportTon,
      cattleCweTon,
      smallRuminantCweTon,
    };
  }, [importAnalytics, series]);

  const ssrProxyTrend = useMemo(() => {
    if (importData.length === 0 || series.length === 0) return [] as Array<{
      yil: string;
      ssr: number;
    }>;

    const sortedProd = [...series].filter((p) => p.totalTon > 0).sort((a, b) => a.year - b.year);

    const findProdTon = (year: number) => {
      const exact = sortedProd.find((p) => p.year === year);
      if (exact) return exact.totalTon;
      const fallback = sortedProd.filter((p) => p.year <= year).at(-1);
      return fallback?.totalTon ?? 0;
    };

    return importData
      .map((row) => {
        const y = extractYear(row.yil);
        if (!y) return null;

        const prodTon = findProdTon(y);
        if (prodTon <= 0) return null;

        const carcassImportTon = row.karkas_et_ithalati_ton ?? 0;
        const cattleHead = row.besilik_sigir_bas ?? 0;
        const smallRuminantHead = row.besilik_kesimlik_kucukbas_sayisi_bas ?? 0;

        const liveCweTon = cattleHead * 0.165 + smallRuminantHead * 0.05;
        const totalImportTon = carcassImportTon + liveCweTon;
        const denom = prodTon + totalImportTon;
        if (denom <= 0) return null;

        const ssr = (prodTon / denom) * 100;
        return { yil: String(y), ssr };
      })
      .filter((x): x is { yil: string; ssr: number } => Boolean(x));
  }, [importData, series]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🥩 Türkiye Kırmızı Et Üretimi</h1>
        <p className="page-subtitle">
          Kırmızı et üretimi (ton)
          {minYear && maxYear ? ` (${minYear}–${maxYear})` : ''}
        </p>
      </div>

      {/* Filtre */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Başlangıç Yılı
          </label>
          <select
            className="filter-select"
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value) || 2010)}
            disabled={!availableYears.length}
          >
            <option value={2010}>2010</option>
            <option value={2015}>2015</option>
            <option value={2020}>2020</option>
            {availableYears.includes(minYear) && <option value={minYear}>{minYear} (Tüm Veriler)</option>}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Section 1: KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card large">
              <div className="kpi-header">
                <span className="kpi-title">SON YIL TOPLAM</span>
              </div>
              <div className="kpi-value">{formatTon(latest?.totalTon ?? 0)}</div>
              <div className="kpi-subtitle">({latest?.year ?? '-'})</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">YILLIK DEĞİŞİM</span>
                <div className={`kpi-icon ${yoy >= 0 ? 'green' : 'red'}`}>{yoy >= 0 ? '📈' : '📉'}</div>
              </div>
              <div className="kpi-value" style={{ color: yoy >= 0 ? '#22c55e' : '#ef4444' }}>
                %{yoy.toFixed(1)}
              </div>
              <div className="kpi-subtitle">Önceki yıla göre</div>
            </div>

            {consumptionData && (
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">KIRMIZI ET TÜKETİMİ</span>
                  <div className="kpi-icon red">🥩</div>
                </div>
                <div className="kpi-value">{consumptionData.kirmizi_et_tuketimi_kg.toFixed(1)} kg</div>
                <div className="kpi-subtitle">Kişi başı/yıl</div>
              </div>
            )}

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">ZİRVE</span>
                <div className="kpi-icon orange">🏆</div>
              </div>
              <div className="kpi-value">{formatTon(peak?.totalTon ?? 0)}</div>
              <div className="kpi-subtitle">{peak?.year ? `${peak.year}` : '—'}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">SON 5Y ORT</span>
                <div className="kpi-icon purple">🧮</div>
              </div>
              <div className="kpi-value">{formatTon(avgLast5)}</div>
              <div className="kpi-subtitle">Hareketli ortalama</div>
            </div>

            {worldRankings && (
              <>
                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">SIĞIR ETİ</span>
                    <div className="kpi-icon orange">🐄</div>
                  </div>
                  <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRankings.cattle.world}</div>
                  <div className="kpi-subtitle">AB #{worldRankings.cattle.eu}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">KOYUN ETİ</span>
                    <div className="kpi-icon cyan">🐑</div>
                  </div>
                  <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRankings.sheep.world}</div>
                  <div className="kpi-subtitle">AB #{worldRankings.sheep.eu}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">KEÇİ ETİ</span>
                    <div className="kpi-icon purple">🐐</div>
                  </div>
                  <div className="kpi-value" style={{ fontSize: '1.8rem' }}>Dünya #{worldRankings.goat.world}</div>
                  <div className="kpi-subtitle">AB #{worldRankings.goat.eu}</div>
                </div>
              </>
            )}
          </div>

          {/* Intelligence Panel */}
          {importAnalytics && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginTop: '24px',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 Kırmızı Et Intelligence Özeti
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>ET İTHALAT CAGR</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{importAnalytics.cagr.carcass.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Karkas Et Büyüme</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>YILLIK DEĞİŞİM</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{yoy > 0 ? '+' : ''}{yoy.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Üretim Değişimi</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>BESİLİK SIĞIR İTH. CAGR</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{importAnalytics.cagr.cattle.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>Büyükbaş Büyüme</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500', marginBottom: '8px' }}>HARCAMA CAGR</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{importAnalytics.cagr.spending.toFixed(1)}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>İthalat Giderleri</div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Üretim Trendi */}
          <div className="chart-grid" style={{ marginTop: '30px' }}>
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">📈 Kırmızı Et Üretimi Trendi (1961-2024)</h3>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={filteredSeries} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    labelFormatter={(label) => `Yıl: ${label}`} 
                    formatter={(value: number) => [formatTon(Number(value))]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="totalTon" name="Toplam Üretim" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">🥧 Tür Bazında Dağılım ({latest?.year ?? '-'})</h3>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${formatTon(value)}`}
                    labelLine={true}
                  >
                    {breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatTon(value)]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">📊 Büyükbaş vs Küçükbaş ({latest?.year ?? '-'})</h3>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={buyukbasKucukbasBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                    labelLine={true}
                  >
                    {buyukbasKucukbasBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatTon(value)]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 3: Türlere Göre Detaylı Üretim */}
          <div className="chart-grid" style={{ marginTop: '30px' }}>
            {/* Sığır Üretimi */}
            <div className="chart-card">
              <h3 className="chart-title">🐄 Sığır Eti Üretimi (2010-2024)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  data={filteredSeries.filter(p => p.year >= 2010)} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(Number(value))]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="cattleTon" name="Sığır" fill={MEAT_COLORS['Sığır']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Koyun Üretimi */}
            <div className="chart-card">
              <h3 className="chart-title">🐑 Koyun Eti Üretimi (2010-2024)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  data={filteredSeries.filter(p => p.year >= 2010)} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(Number(value))]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="sheepTon" name="Koyun" fill={MEAT_COLORS['Koyun']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Keçi Üretimi */}
            <div className="chart-card">
              <h3 className="chart-title">🐐 Keçi Eti Üretimi (2010-2024)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  data={filteredSeries.filter(p => p.year >= 2010)} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(Number(value))]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="goatTon" name="Keçi" fill={MEAT_COLORS['Keçi']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Manda Üretimi */}
            <div className="chart-card">
              <h3 className="chart-title">🦬 Manda Eti Üretimi (2010-2024)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  data={filteredSeries.filter(p => p.year >= 2010)} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                  <Tooltip 
                    formatter={(value: number) => [formatTon(Number(value))]}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="buffaloTon" name="Manda" fill={MEAT_COLORS['Manda']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 4: Dünya Karkas Fiyatları */}
          {worldCarcassPriceTreemap.length > 0 && (
            <div className="chart-grid" style={{ marginTop: '30px' }}>
              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">💰 Dünya Karkas Et Fiyatları (USD/kg)</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <Treemap
                    data={worldCarcassPriceTreemap}
                    dataKey="value"
                    stroke="#fff"
                    content={({ x = 0, y = 0, width = 0, height = 0, name, value }) => {
                      return (
                        <g>
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            style={{
                              fill: worldCarcassPriceTreemap.find(d => d.name === name)?.fill || '#ccc',
                              stroke: '#fff',
                              strokeWidth: 2,
                            }}
                          />
                          {width > 80 && height > 40 && name && value && (
                            <>
                              <text
                                x={x + width / 2}
                                y={y + height / 2 - 8}
                                textAnchor="middle"
                                fill="#fff"
                                fontSize={14}
                                fontWeight={600}
                              >
                                {name}
                              </text>
                              <text
                                x={x + width / 2}
                                y={y + height / 2 + 12}
                                textAnchor="middle"
                                fill="#fff"
                                fontSize={16}
                                fontWeight={700}
                              >
                                ${Number(value).toFixed(2)}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    }}
                  />
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Section 5: Verimlilik Karşılaştırması */}
          {productivityRadarData.length > 0 && (
            <div className="chart-grid" style={{ marginTop: '30px' }}>
              <div className="chart-card">
                <h3 className="chart-title">🎯 Verimlilik Karşılaştırması (11 Ülke)</h3>
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={productivityRadarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="ulke" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                    <Radar 
                      name="Karkas Verimi (kg)" 
                      dataKey="karkas_verimi" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.6} 
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)} kg`]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px'  }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="chart-title">🌍 Dünya Karkas Ağırlığı Dağılımı (Histogram)</h3>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={carcassWeightHistogram} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Ülke Sayısı', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} ülke`]}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Section 7: Dünya Et Tüketimi Karşılaştırması */}
          {consumptionRadarData.length > 0 && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  🌏 Dünya Et Tüketimi Karşılaştırması (Kişi Başı/Yıl)
                </h2>
              </div>
              <div className="kpi-grid">
                {consumptionRadarData.map((country, idx) => (
                  <div key={idx} className="kpi-card" style={{ gridColumn: 'span 1' }}>
                    <div className="kpi-header">
                      <span className="kpi-title" style={{ fontSize: '0.95rem', fontWeight: '700' }}>
                        {country.ulke.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🍗 Kanatlı:</span>
                        <span style={{ fontWeight: '600', color: '#dc2626' }}>{country.kanatli_eti.toFixed(1)} kg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🥩 Sığır:</span>
                        <span style={{ fontWeight: '600', color: '#ea580c' }}>{country.sigir_eti.toFixed(1)} kg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🐑 Koyun/Keçi:</span>
                        <span style={{ fontWeight: '600', color: '#ca8a04' }}>{country.koyun_keci_eti.toFixed(1)} kg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🐟 Balık:</span>
                        <span style={{ fontWeight: '600', color: '#14b8a6' }}>{country.balik_ve_deniz_urunleri.toFixed(1)} kg</span>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border)', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Toplam:</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {(country.kanatli_eti + country.sigir_eti + country.koyun_keci_eti + country.balik_ve_deniz_urunleri).toFixed(1)} kg
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Section 8: İthalat Detaylı Analizi */}
          {importData.length > 0 && importAnalytics && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  📦 Kırmızı Et ve Canlı Hayvan İthalat Analizi (2010-2024)
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Türkiye'nin kırmızı et ve canlı hayvan ithalatının detaylı analizi ve etkileri
                </p>
              </div>

              {/* İthalat Özet KPI Kartları */}
              <div className="kpi-grid" style={{ marginBottom: '30px' }}>
                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">KARKAS ET İTHALATI</span>
                    <div className="kpi-icon red">🥩</div>
                  </div>
                  <div className="kpi-value">{formatTon(importAnalytics.latest.carcass)}</div>
                  <div className="kpi-subtitle">
                    {importAnalytics.yoy && (
                      <span style={{ color: importAnalytics.yoy.carcass >= 0 ? '#22c55e' : '#ef4444' }}>
                        {importAnalytics.yoy.carcass >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.carcass).toFixed(1)} YoY
                      </span>
                    )}
                  </div>
                </div>

                {ssrProxyLatest && (
                  <div className="kpi-card">
                    <div className="kpi-header">
                      <span className="kpi-title">YETERLİLİK (PROXY)</span>
                      <div className="kpi-icon green">🏠</div>
                    </div>
                    <div className="kpi-value">%{ssrProxyLatest.ssr.toFixed(1)}</div>
                    <div className="kpi-subtitle">
                      {ssrProxyLatest.year !== ssrProxyLatest.importYear ? `${ssrProxyLatest.year} üretimi` : `${ssrProxyLatest.year}`}{' '}—
                      %{ssrProxyLatest.importShare.toFixed(1)} ithalat payı (karkas: %{ssrProxyLatest.carcassShare.toFixed(1)}, canlı CWE: %{ssrProxyLatest.liveShare.toFixed(1)})
                    </div>
                  </div>
                )}

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">BESİLİK SIĞIR</span>
                    <div className="kpi-icon orange">🐄</div>
                  </div>
                  <div className="kpi-value">{formatNumber(importAnalytics.latest.cattle)} baş</div>
                  <div className="kpi-subtitle">
                    {importAnalytics.yoy && (
                      <span style={{ color: importAnalytics.yoy.cattle >= 0 ? '#22c55e' : '#ef4444' }}>
                        {importAnalytics.yoy.cattle >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.cattle).toFixed(1)} YoY
                      </span>
                    )}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">KÜÇÜKBAŞ</span>
                    <div className="kpi-icon yellow">🐑</div>
                  </div>
                  <div className="kpi-value">{formatNumber(importAnalytics.latest.smallRuminant)} baş</div>
                  <div className="kpi-subtitle">
                    {importAnalytics.yoy && (
                      <span style={{ color: importAnalytics.yoy.smallRuminant >= 0 ? '#22c55e' : '#ef4444' }}>
                        {importAnalytics.yoy.smallRuminant >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.smallRuminant).toFixed(1)} YoY
                      </span>
                    )}
                  </div>
                </div>

                {importAnalytics.latest.spending > 0 && (
                  <>
                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">TOPLAM HARCAMA</span>
                        <div className="kpi-icon blue">💰</div>
                      </div>
                      <div className="kpi-value">${formatShort(importAnalytics.latest.spending)}</div>
                      <div className="kpi-subtitle">
                        {importAnalytics.yoy && (
                          <span style={{ color: importAnalytics.yoy.spending >= 0 ? '#ef4444' : '#22c55e' }}>
                            {importAnalytics.yoy.spending >= 0 ? '↑' : '↓'} %{Math.abs(importAnalytics.yoy.spending).toFixed(1)} YoY
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">BİRİM MALİYET</span>
                        <div className="kpi-icon green">📊</div>
                      </div>
                      <div className="kpi-value">${formatNumber(importAnalytics.unitCost)}</div>
                      <div className="kpi-subtitle">$/ton (karkas et)</div>
                    </div>
                  </>
                )}

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">ET İTHALAT CAGR</span>
                    <div className="kpi-icon purple">📈</div>
                  </div>
                  <div className="kpi-value" style={{ color: importAnalytics.cagr.carcass >= 0 ? '#22c55e' : '#ef4444' }}>
                    %{importAnalytics.cagr.carcass.toFixed(1)}
                  </div>
                  <div className="kpi-subtitle">2010-2024 bileşik</div>
                </div>
              </div>

              {/* Kategori Bazında Ayrı Grafikler */}
              {ssrProxyTrend.length > 0 && (
                <div className="chart-grid" style={{ marginBottom: '20px' }}>
                  <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">🏠 Yeterlilik (Proxy) Trendi (2010-2024)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={ssrProxyTrend} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                        <Tooltip
                          formatter={(value: number) => [`%${Number(value).toFixed(1)}`, 'Yeterlilik (Proxy)']}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ssr"
                          name="Yeterlilik (Proxy)"
                          stroke="#22c55e"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="chart-grid" style={{ marginBottom: '20px' }}>
                <div className="chart-card">
                  <h3 className="chart-title">🥩 Karkas Et İthalatı Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                      <Tooltip 
                        formatter={(value: number) => [`${formatNumber(value)} ton`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="karkas_et_ithalati_ton" 
                        name="Karkas Et" 
                        stroke="#dc2626" 
                        fill="#dc2626" 
                        fillOpacity={0.3} 
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">🐄 Besilik Sığır İthalatı Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                      <Tooltip 
                        formatter={(value: number) => [`${formatNumber(value)} baş`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="besilik_sigir_bas" 
                        name="Besilik Sığır" 
                        stroke="#ea580c" 
                        fill="#ea580c" 
                        fillOpacity={0.3} 
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">🐑 Küçükbaş İthalatı Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                      <Tooltip 
                        formatter={(value: number) => [`${formatNumber(value)} baş`]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="besilik_kesimlik_kucukbas_sayisi_bas" 
                        name="Küçükbaş" 
                        stroke="#f59e0b" 
                        fill="#f59e0b" 
                        fillOpacity={0.3} 
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {importAnalytics.latest.spending > 0 && (
                  <div className="chart-card">
                    <h3 className="chart-title">💰 İthalat Harcama Trendi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={importData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                        <Tooltip 
                          formatter={(value: number) => [`$${formatNumber(value)}`]}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="toplam_ithalata_odenen_dolar" 
                          name="Toplam Harcama" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3} 
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Bileşik İthalat Trendi */}
              <div className="chart-grid" style={{ marginBottom: '20px' }}>
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">📈 Bileşik İthalat Kompozisyonu Trendi</h3>
                  <ResponsiveContainer width="100%" height={380}>
                    <AreaChart data={importData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="yil" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'Karkas Et') return [`${formatNumber(value)} ton`, name];
                          return [`${formatNumber(value)} baş`, name];
                        }}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="karkas_et_ithalati_ton" stackId="1" name="Karkas Et" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="besilik_sigir_bas" stackId="2" name="Besilik Sığır" stroke="#ea580c" fill="#ea580c" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="besilik_kesimlik_kucukbas_sayisi_bas" stackId="2" name="Küçükbaş" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* İthalat Kompozisyonu & Ortalamalar */}
              <div className="chart-grid" style={{ marginBottom: '20px' }}>
                <div className="chart-card">
                  <h3 className="chart-title">🥧 Son Yıl İthalat Dağılımı ({importAnalytics.latest.year})</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={importComposition}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                        labelLine={true}
                      >
                        {importComposition.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'Karkas Et') return [`${formatNumber(value)} ton`];
                          return [`${formatNumber(value)} baş`];
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">📊 Ortalama İthalat Değerleri (2010-2024)</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart 
                      data={[
                        { category: 'Karkas Et', value: importAnalytics.averages.carcass, unit: 'ton', color: '#dc2626' },
                        { category: 'Besilik Sığır', value: importAnalytics.averages.cattle, unit: 'baş', color: '#ea580c' },
                        { category: 'Küçükbaş', value: importAnalytics.averages.smallRuminant, unit: 'baş', color: '#f59e0b' },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="category" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => formatShort(Number(v))} />
                      <Tooltip 
                        formatter={(value: number, _name: string, props: { payload?: { unit?: string; category?: string } }) => [
                          `${formatNumber(value)} ${props.payload?.unit ?? ''}`,
                          props.payload?.category ?? ''
                        ]}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {[
                          { category: 'Karkas Et', value: importAnalytics.averages.carcass, unit: 'ton', color: '#dc2626' },
                          { category: 'Besilik Sığır', value: importAnalytics.averages.cattle, unit: 'baş', color: '#ea580c' },
                          { category: 'Küçükbaş', value: importAnalytics.averages.smallRuminant, unit: 'baş', color: '#f59e0b' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Etki Analizi Özeti */}
              <div style={{ 
                marginTop: '30px', 
                padding: '24px', 
                background: 'var(--bg-card)', 
                borderRadius: '16px',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '700' }}>
                  📝 İthalat Etki Analizi Özeti
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '16px' 
                }}>
                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                      📈 Karkas Et CAGR (2010-2024)
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importAnalytics.cagr.carcass >= 0 ? '#22c55e' : '#ef4444' }}>
                      %{importAnalytics.cagr.carcass.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {importAnalytics.cagr.carcass >= 0 ? 'Artan trend' : 'Azalan trend'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                      🐄 Besilik Sığır CAGR
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importAnalytics.cagr.cattle >= 0 ? '#22c55e' : '#ef4444' }}>
                      %{importAnalytics.cagr.cattle.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Yıllık ortalama değişim
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                      🐑 Küçükbaş CAGR
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: importAnalytics.cagr.smallRuminant >= 0 ? '#22c55e' : '#ef4444' }}>
                      %{importAnalytics.cagr.smallRuminant.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Bileşik büyüme oranı
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                      💰 Harcama CAGR
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
                      %{importAnalytics.cagr.spending.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Döviz etkisi dahil
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                      📊 Ortalama Yıllık Karkas Et
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                      {formatNumber(importAnalytics.averages.carcass)} ton
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      2010-2024 ortalaması
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                      🔢 Ortalama Yıllık Harcama
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                      ${formatShort(importAnalytics.averages.spending)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Toplam ithalat maliyeti (USD)
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Section 9: Ekonomik Göstergeler */}
          {filteredEconomicData.length > 0 && (
            <>
              <div style={{ marginTop: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  💰 Türkiye Kırmızı Et Ekonomik Göstergeleri
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Başlangıç</label>
                    <input
                      type="month"
                      value={econStartDate}
                      onChange={(e) => setEconStartDate(e.target.value)}
                      max={econEndDate}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Bitiş</label>
                    <input
                      type="month"
                      value={econEndDate}
                      onChange={(e) => setEconEndDate(e.target.value)}
                      min={econStartDate}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="kpi-grid" style={{ marginBottom: '30px' }}>
                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">DANA KARKAS FİYATI</span>
                    <div className="kpi-icon red">💵</div>
                  </div>
                  <div className="kpi-value">{filteredEconomicData[0]?.dana_karkas_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
                  <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">KUZU KARKAS FİYATI</span>
                    <div className="kpi-icon green">💵</div>
                  </div>
                  <div className="kpi-value">{filteredEconomicData[0]?.kuzu_karkas_fiyati_tl_kg.toFixed(2)} ₺/kg</div>
                  <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">KARLILIK ORANI</span>
                    <div className="kpi-icon blue">📊</div>
                  </div>
                  <div className="kpi-value" style={{ color: filteredEconomicData[0]?.karlilik >= 0 ? '#22c55e' : '#ef4444' }}>
                    {filteredEconomicData[0]?.karlilik.toFixed(2)}%
                  </div>
                  <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">DOLAR KURU</span>
                    <div className="kpi-icon yellow">💱</div>
                  </div>
                  <div className="kpi-value">{filteredEconomicData[0]?.dolar_kuru_tl.toFixed(2)} ₺</div>
                  <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-title">YEM FİYATI</span>
                    <div className="kpi-icon orange">🌾</div>
                  </div>
                  <div className="kpi-value">{filteredEconomicData[0]?.besi_yemi_fiyatlari_tl_kg.toFixed(2)} ₺/kg</div>
                  <div className="kpi-subtitle">{filteredEconomicData[0]?.tarih}</div>
                </div>
              </div>

              <div className="chart-grid">
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">📈 Karkas Fiyat Trendi</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="tarih" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                      />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="dana_karkas_fiyati_tl_kg" name="Dana Karkas" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
                      <Line type="monotone" dataKey="kuzu_karkas_fiyati_tl_kg" name="Kuzu Karkas" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-grid" style={{ marginTop: '20px' }}>
                <div className="chart-card">
                  <h3 className="chart-title">💰 Maliyet vs Fiyat</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                      />
                      <Legend />
                      <Bar dataKey="dana_karkas_maliyet_tl_kg" name="Dana Maliyet" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="dana_karkas_fiyati_tl_kg" name="Dana Fiyat" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">📊 Karlılık Trendi</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(2)}%`]}
                      />
                      <Area type="monotone" dataKey="karlilik" name="Karlılık (%)" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">💱 Dolar Kuru & Yem Fiyatları</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 40, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'Dolar Kuru') return [`${value.toFixed(2)} ₺`];
                          return [`${value.toFixed(2)} ₺/kg`];
                        }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="dolar_kuru_tl" name="Dolar Kuru" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="besi_yemi_fiyatlari_tl_kg" name="Besi Yemi" stroke="#eab308" strokeWidth={2.5} dot={{ fill: '#eab308', r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Korelasyon Analizi */}
              <div className="chart-grid" style={{ marginTop: '20px' }}>
                <div className="chart-card">
                  <h3 className="chart-title">🔄 Dolar-Fiyat Korelasyonu</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="dolar_kuru_tl" 
                        name="Dolar Kuru" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        label={{ value: 'Dolar Kuru (₺)', position: 'bottom', fill: 'var(--text-secondary)' }}
                      />
                      <YAxis 
                        dataKey="dana_karkas_fiyati_tl_kg" 
                        name="Dana Karkas" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                        label={{ value: 'Dana Karkas Fiyatı (₺/kg)', angle: -90, position: 'left', fill: 'var(--text-secondary)' }}
                      />
                      <ZAxis range={[50, 200]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'Dolar Kuru') return [`${value.toFixed(2)} ₺`];
                          return [`${value.toFixed(2)} ₺/kg`];
                        }}
                      />
                      <Scatter data={filteredEconomicData} fill="#dc2626" name="Dana Karkas" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">📈 Besilik Hayvan Fiyatları</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="besilik_dana_fiyatlari_tl_kg" name="Besilik Dana" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
                      <Line type="monotone" dataKey="besilik_kucukbas_fiyatlari_tl_kg" name="Besilik Küçükbaş" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">📉 Fiyat-Maliyet Farkı</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={filteredEconomicData.slice().reverse()} margin={{ top: 10, right: 24, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="tarih" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
                      <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(2)} ₺/kg`]}
                      />
                      <Bar dataKey="dana_karkas_fiyat_maliyet_farki_tl_kg" name="Fark (Fiyat-Maliyet)" radius={[4, 4, 0, 0]}>
                        {filteredEconomicData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.dana_karkas_fiyat_maliyet_farki_tl_kg >= 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
