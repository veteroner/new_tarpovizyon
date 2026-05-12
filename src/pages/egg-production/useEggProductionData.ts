import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEggPrices, fetchQuery } from '../../services/api';
import {
  type YearPoint,
  type TuikTab,
  type TuikEggData,
  type MonthlyEggData,
  type EggEconomicData,
  type EggTradeData,
  parseTrNumber,
  extractYear,
} from './eggProductionTypes';

export function useEggProductionData() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [economicData, setEconomicData] = useState<EggEconomicData[]>([]);
  const [econStartDate, setEconStartDate] = useState<string>('');
  const [econEndDate, setEconEndDate] = useState<string>('');
  const [worldRanking, setWorldRanking] = useState<{ world: number; eu: number } | null>(null);
  const [eggPrices, setEggPrices] = useState<Partial<Record<string, number>>>({});
  const [eggPriceDate, setEggPriceDate] = useState<string | null>(null);
  const [eggPriceError, setEggPriceError] = useState<string | null>(null);

  const [activeTuikTab, setActiveTuikTab] = useState<TuikTab>('overview');
  const [tuikData, setTuikData] = useState<TuikEggData[]>([]);
  const [monthlyEgg, setMonthlyEgg] = useState<MonthlyEggData[]>([]);
  const [monthlyLayer, setMonthlyLayer] = useState<MonthlyEggData[]>([]);
  const [eggTradeData, setEggTradeData] = useState<EggTradeData[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchQuery('SELECT * FROM o_toplam_uretim_veri');
      const data = (res.data ?? []) as Record<string, unknown>[];

      const points = data
        .map((row) => {
          const year = extractYear(row['Yıllar']);
          const eggsMillion = parseTrNumber(row['Yumurta (Milyon Adet)']);
          return { year, eggsMillion };
        })
        .filter((p) => p.year > 0)
        .sort((a, b) => a.year - b.year);

      // TÜİK tablosundan hist tablosunda olmayan yılları ekle (örn. 2025+)
      const histMaxYear = points.length > 0 ? Math.max(...points.map(p => p.year)) : 2024;
      const tuikNewRes = await fetchQuery(
        `SELECT yil, CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) as total_bin_adet
         FROM tuik_hayvancilik_kumeshayvanciligi
         WHERE urun = 'Tavuk Yumurtası' AND TOPLAM IS NOT NULL
           AND CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) > 1000
           AND yil > '${histMaxYear}'
         ORDER BY yil`
      ).catch(() => ({ data: [] }));
      if (tuikNewRes.data) {
        (tuikNewRes.data as Record<string, unknown>[]).forEach(row => {
          const year = Number(row['yil']) || 0;
          const totalBinAdet = Number(row['total_bin_adet']) || 0;
          const eggsMillion = totalBinAdet / 1000;
          if (year > 0 && eggsMillion > 0 && !points.find(p => p.year === year)) {
            points.push({ year, eggsMillion });
          }
        });
        points.sort((a, b) => a.year - b.year);
      }

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        const economicQuery = `SELECT 
          DATE_FORMAT(tarih, '%Y-%m') as tarih,
          yumurta_maliyet_tl_kg, yumurta_uretici_fiyati_tl_kg,
          yumurtaci_tavuk_yemi_tl_kg, tuketici_fiyati_tl,
          karlilik, uretici_fiyati_maliyet_farki_tl_kg,
          parite_yumurta_yem_paritesi
          FROM oner_yumurta_maliyeti_fiyati 
          ORDER BY tarih DESC LIMIT 60`;

        const economicRes = await fetchQuery(economicQuery);
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
            tarih: String(item['tarih'] || ''),
            yumurta_maliyet_tl_kg: Number(item['yumurta_maliyet_tl_kg']) || 0,
            yumurta_uretici_fiyati_tl_kg: Number(item['yumurta_uretici_fiyati_tl_kg']) || 0,
            yumurtaci_tavuk_yemi_tl_kg: Number(item['yumurtaci_tavuk_yemi_tl_kg']) || 0,
            tuketici_fiyati_tl: Number(item['tuketici_fiyati_tl']) || 0,
            karlilik: Number(item['karlilik']) || 0,
            uretici_fiyati_maliyet_farki_tl_kg: Number(item['uretici_fiyati_maliyet_farki_tl_kg']) || 0,
            parite_yumurta_yem_paritesi: Number(item['parite_yumurta_yem_paritesi']) || 0,
          }));
          setEconomicData(mapped);
          if (mapped.length > 0) {
            setEconEndDate(mapped[0].tarih);
            setEconStartDate(mapped[Math.min(11, mapped.length - 1)].tarih);
          }
        }
      } catch (economicError) {
        console.warn('Yumurta ekonomik göstergeleri yüklenemedi:', economicError);
        setEconomicData([]);
      }

      // TÜİK Yumurta Üretim Verileri
      try {
        const tuikQuery = `
          SELECT
            yil,
            CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) as value,
            urun
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun IN (
            'Tavuk Yumurtası', 
            'Yumurtacı Tavuk Sayısı',
            'Yerli Yumurtacı Tavuk',
            'Hibrit Yumurtacı Tavuk',
            'Yumurtacı Tavuk (Layer) civivi Üretimi için Kuluçkaya Basılan Yumurta'
          )
          ORDER BY yil DESC, urun
        `;
        const tuikRes = await fetchQuery(tuikQuery);

        if (tuikRes.data && tuikRes.data.length > 0) {
          const yearMap = new Map<string, Omit<TuikEggData, 'year'> & { year: string }>();

          tuikRes.data.forEach((row: Record<string, string | number>) => {
            const year = String(row.yil);
            if (!yearMap.has(year)) {
              yearMap.set(year, {
                year,
                eggProduction: 0,
                layerCount: 0,
                yieldPerBird: 0,
                nativeLayer: 0,
                hybridLayer: 0,
                hatchedEggs: 0,
              });
            }

            const yearData = yearMap.get(year);
            if (yearData) {
              const urun = String(row.urun);
              const value = Number(row.value) || 0;

              if (urun === 'Tavuk Yumurtası') {
                yearData.eggProduction = value;
              } else if (urun === 'Yumurtacı Tavuk Sayısı') {
                yearData.layerCount = value;
              } else if (urun === 'Yerli Yumurtacı Tavuk') {
                yearData.nativeLayer = value;
              } else if (urun === 'Hibrit Yumurtacı Tavuk') {
                yearData.hybridLayer = value;
              } else if (urun.includes('Kuluçkaya Basılan')) {
                yearData.hatchedEggs = value;
              }
            }
          });

          const tuikDataArray: TuikEggData[] = Array.from(yearMap.values())
            .filter(d => d.eggProduction > 0)
            .map((d) => ({
              ...d,
              yieldPerBird: d.layerCount > 0 ? (d.eggProduction * 1000) / (d.layerCount * 1000) : 0,
            }))
            .sort((a, b) => Number(b.year) - Number(a.year));

          setTuikData(tuikDataArray);
          console.log('TÜİK Yumurta data loaded:', tuikDataArray.length, 'years');
        }

        // Aylık dağılım - NULL olmayan en son yıl için
        const latestYearQuery = `
          SELECT MAX(yil) as max_year FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun = 'Tavuk Yumurtası' AND TOPLAM IS NOT NULL
            AND CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) > 1000`;
        const latestYearRes = await fetchQuery(latestYearQuery);
        const latestYear = String(latestYearRes.data?.[0]?.max_year || '2025');

        const monthlyQuery = `
          SELECT urun, birim, Ocak, Şubat, Mart, Nisan, Mayıs, Haziran, Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE yil = '${latestYear}' AND urun IN ('Tavuk Yumurtası', 'Yumurtacı Tavuk Sayısı')
        `;
        const monthlyRes = await fetchQuery(monthlyQuery);

        if (monthlyRes.data && monthlyRes.data.length > 0) {
          const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

          monthlyRes.data.forEach((row: Record<string, string | number>) => {
            const urun = String(row.urun);
            const monthlyValues = months.map((month) => ({
              month,
              value: Number(String(row[month] || '0').replace(/\./g, '')) || 0,
            }));

            if (urun === 'Tavuk Yumurtası') {
              setMonthlyEgg(monthlyValues);
            } else if (urun === 'Yumurtacı Tavuk Sayısı') {
              setMonthlyLayer(monthlyValues);
            }
          });
        }
      } catch (tuikError) {
        console.warn('TÜİK yumurta verileri yüklenemedi:', tuikError);
      }

      // Yumurta Dış Ticaret Verisi
      try {
        const eggTradeRes = await fetchQuery(
          `SELECT yil,
             ROUND(SUM(ihracat_deger)/1000000, 1) as ihracat_musd,
             ROUND(SUM(ithalat_deger)/1000000, 1) as ithalat_musd
           FROM tuik_ticaret_hayvansal
           WHERE urun LIKE '%Yumurta%' AND yil >= 2015 AND yil < YEAR(CURDATE()) + 1
           GROUP BY yil ORDER BY yil`
        );
        if (eggTradeRes.data && eggTradeRes.data.length > 0) {
          setEggTradeData((eggTradeRes.data as Record<string, unknown>[]).map(r => ({
            yil: Number(r['yil']) || 0,
            ihracat_musd: Number(r['ihracat_musd']) || 0,
            ithalat_musd: Number(r['ithalat_musd']) || 0,
          })).filter(d => d.yil > 0));
        }
      } catch (tradeErr) {
        console.warn('Yumurta ticaret verileri yüklenemedi:', tradeErr);
      }

      // Dünya Sıralaması
      try {
        const euCountries = ['Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda', 'Belçika', 'Polonya', 'Romanya', 'Avusturya', 'Bulgaristan', 'Hırvatistan', 'Çekya', 'Danimarka', 'Estonya', 'Finlandiya', 'Yunanistan', 'Macaristan', 'İrlanda', 'Letonya', 'Litvanya', 'Portekiz', 'Slovakya', 'Slovenya', 'İsveç'];
        const euList = euCountries.map((c) => `'${c}'`).join(',');

        const eggQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun LIKE '%umurta%' OR urun LIKE 'Egg%'
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND (urun LIKE '%umurta%' OR urun LIKE 'Egg%') LIMIT 1)) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE (urun LIKE '%umurta%' OR urun LIKE 'Egg%') 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND (urun LIKE '%umurta%' OR urun LIKE 'Egg%') LIMIT 1)) as eu_rank
        `;
        const eggRes = await fetchQuery(eggQuery);

        if (eggRes.data && eggRes.data.length > 0 && eggRes.data[0]?.world_rank) {
          setWorldRanking({
            world: Number(eggRes.data[0]?.world_rank) || 0,
            eu: Number(eggRes.data[0]?.eu_rank) || 0,
          });
        }
      } catch {
        // Yumurta verisi henüz tabloda yok
      }
    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    const loadEggPrices = async () => {
      try {
        console.log('🥚 Fetching egg prices...');
        const res = await fetchEggPrices();
        console.log('🥚 Egg prices response:', res);

        if (!cancelled) {
          if (res.prices && Object.keys(res.prices).length > 0) {
            setEggPrices(res.prices);
            setEggPriceError(null);
          } else {
            console.warn('⚠️ No prices returned from API');
            setEggPriceError('Fiyatlar yüklenemedi');
          }
          if (res.date) setEggPriceDate(res.date);
        }
      } catch (error) {
        console.error('❌ Egg prices fetch error:', error);
        if (!cancelled) setEggPriceError('API hatası');
      }
    };

    loadEggPrices();
    const intervalId = window.setInterval(loadEggPrices, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].eggsMillion > 0) return series[i];
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
    if (!latest || !prev || prev.eggsMillion <= 0) return 0;
    return ((latest.eggsMillion - prev.eggsMillion) / prev.eggsMillion) * 100;
  }, [latest, prev]);

  const peak = useMemo(() => {
    return series.reduce<YearPoint | undefined>((best, cur) => {
      if (!best) return cur;
      return cur.eggsMillion > best.eggsMillion ? cur : best;
    }, undefined);
  }, [series]);

  return {
    loading,
    series,
    economicData,
    econStartDate,
    setEconStartDate,
    econEndDate,
    setEconEndDate,
    worldRanking,
    eggPrices,
    eggPriceDate,
    eggPriceError,
    activeTuikTab,
    setActiveTuikTab,
    tuikData,
    monthlyEgg,
    monthlyLayer,
    eggTradeData,
    latest,
    prev,
    yoy,
    peak,
  };
}
