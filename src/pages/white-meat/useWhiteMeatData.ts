import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchQuery } from '../../services/api';
import type { RegionTotal } from '../../components/TurkeyHeatMap';
import type {
  YearPoint,
  TuikTab,
  PoultryEconomicData,
  TuikChickenData,
  MonthlyData,
  TuikTurkeyMeatData,
  PoultryMapType,
  PoultryTradeData,
  WhiteMeatData,
} from './whiteMeatUtils';

export function useWhiteMeatData(): WhiteMeatData {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [economicData, setEconomicData] = useState<PoultryEconomicData[]>([]);
  const [econStartDate, setEconStartDate] = useState<string>('');
  const [econEndDate, setEconEndDate] = useState<string>('');
  const [worldRanking, setWorldRanking] = useState<{ world: number; eu: number } | null>(null);
  const [provincialPoultry, setProvincialPoultry] = useState<RegionTotal[]>([]);
  const [provincialBroilers, setProvincialBroilers] = useState<RegionTotal[]>([]);
  const [provincialLayers, setProvincialLayers] = useState<RegionTotal[]>([]);
  const [poultryMapType, setPoultryMapType] = useState<PoultryMapType>('total');
  const [activeTuikTab, setActiveTuikTab] = useState<TuikTab>('overview');
  const [tuikData, setTuikData] = useState<TuikChickenData[]>([]);
  const [monthlySlaughter, setMonthlySlaughter] = useState<MonthlyData[]>([]);
  const [monthlyMeat, setMonthlyMeat] = useState<MonthlyData[]>([]);
  const [turkeyMeatData, setTurkeyMeatData] = useState<TuikTurkeyMeatData[]>([]);
  const [monthlyTurkeyMeat, setMonthlyTurkeyMeat] = useState<MonthlyData[]>([]);
  const [quailMeatData, setQuailMeatData] = useState<TuikTurkeyMeatData[]>([]);
  const [monthlyQuailMeat, setMonthlyQuailMeat] = useState<MonthlyData[]>([]);
  const [quailSlaughterData, setQuailSlaughterData] = useState<TuikTurkeyMeatData[]>([]);
  const [tradeData, setTradeData] = useState<PoultryTradeData[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const productionQuery = `SELECT
        DATE_FORMAT(yillar, '%Y') as year,
        kanatli_eti_ton
      FROM oner_hayvansal_urun_uretimi
      ORDER BY yillar`;

      const res = await fetchQuery(productionQuery);
      const data = (res.data ?? []) as Array<Record<string, unknown>>;

      const points: YearPoint[] = data
        .map((row) => ({
          year: Number(row.year) || 0,
          poultryTon: Number(row.kanatli_eti_ton) || 0,
        }))
        .filter((p) => p.year > 0)
        .sort((a, b) => a.year - b.year);

      // TÜİK tablosundan hist tablosunda olmayan yılları ekle (örn. 2025+)
      const histMaxYear = points.length > 0 ? Math.max(...points.map(p => p.year)) : 2024;
      const tuikNewRes = await fetchQuery(
        `SELECT yil, CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) as kanatlı_ton
         FROM tuik_hayvancilik_kumeshayvanciligi
         WHERE urun = 'Tavuk Eti' AND TOPLAM IS NOT NULL
           AND CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) > 1000
           AND yil > '${histMaxYear}'
         ORDER BY yil`
      ).catch(() => ({ data: [] }));
      if (tuikNewRes.data) {
        (tuikNewRes.data as Record<string, unknown>[]).forEach(row => {
          const year = Number(row['yil']) || 0;
          const kanatlı = Number(row['kanatlı_ton']) || 0;
          if (year > 0 && kanatlı > 0 && !points.find(p => p.year === year)) {
            points.push({ year, poultryTon: kanatlı });
          }
        });
        points.sort((a, b) => a.year - b.year);
      }

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        const economicQuery = `SELECT 
          DATE_FORMAT(tarih, '%Y-%m') as tarih,
          etlik_pilic_maliyet_tl_kg, uretici_fiyati_tl_kg,
          etlik_pilic_yemi_tl_kg, tuketici_fiyati_tl_kg,
          karlilik, uretici_fiyati_maliyet_farki_tl_kg,
          parite_etlik_pilic_yem_paritesi
          FROM oner_kanatli_eti_maliyeti_fiyati 
          ORDER BY tarih DESC LIMIT 60`;
        
        const economicRes = await fetchQuery(economicQuery);
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
            tarih: String(item['tarih'] || ''),
            etlik_pilic_maliyet_tl_kg: Number(item['etlik_pilic_maliyet_tl_kg']) || 0,
            uretici_fiyati_tl_kg: Number(item['uretici_fiyati_tl_kg']) || 0,
            etlik_pilic_yemi_tl_kg: Number(item['etlik_pilic_yemi_tl_kg']) || 0,
            tuketici_fiyati_tl_kg: Number(item['tuketici_fiyati_tl_kg']) || 0,
            karlilik: Number(item['karlilik']) || 0,
            uretici_fiyati_maliyet_farki_tl_kg: Number(item['uretici_fiyati_maliyet_farki_tl_kg']) || 0,
            parite_etlik_pilic_yem_paritesi: Number(item['parite_etlik_pilic_yem_paritesi']) || 0,
          }));
          setEconomicData(mapped);
          if (mapped.length > 0) {
            setEconEndDate(mapped[0].tarih);
            setEconStartDate(mapped[Math.min(11, mapped.length - 1)].tarih);
          }
        }
      } catch (economicError) {
        console.warn('Kanatlı eti ekonomik göstergeleri yüklenemedi:', economicError);
        setEconomicData([]);
      }

      // Dünya Sıralaması
      try {
        const euCountries = ['Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda', 'Belçika', 'Polonya', 'Romanya', 'Avusturya', 'Bulgaristan', 'Hırvatistan', 'Çekya', 'Danimarka', 'Estonya', 'Finlandiya', 'Yunanistan', 'Macaristan', 'İrlanda', 'Letonya', 'Litvanya', 'Portekiz', 'Slovakya', 'Slovenya', 'İsveç'];
        const euList = euCountries.map(c => `'${c}'`).join(',');

        const chickenQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Tavuk eti' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Tavuk eti')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Tavuk eti' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Tavuk eti')) as eu_rank
        `;
        const chickenRes = await fetchQuery(chickenQuery);
        if (chickenRes.data && chickenRes.data.length > 0) {
          setWorldRanking({
            world: Number(chickenRes.data[0]?.world_rank) || 0,
            eu: Number(chickenRes.data[0]?.eu_rank) || 0
          });
        }
      } catch (err) {
        console.warn('Dünya sıralaması verileri yüklenemedi:', err);
      }

      // İl bazlı kanatlı hayvan varlığı
      try {
        const provincialQuery = `
          SELECT 
            il as province,
            CAST(et_tavugu_sayisi AS UNSIGNED) as broiler_count,
            CAST(yumurta_tavugu_sayisi AS UNSIGNED) as layer_count,
            (CAST(et_tavugu_sayisi AS UNSIGNED) + CAST(yumurta_tavugu_sayisi AS UNSIGNED)) as total_poultry
          FROM oner_i_llerin_hayvan_sayisi
          WHERE tarih = (SELECT MAX(tarih) FROM oner_i_llerin_hayvan_sayisi)
          ORDER BY il
        `;
        const provincialRes = await fetchQuery(provincialQuery);
        if (provincialRes.data && provincialRes.data.length > 0) {
          const totalMapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.total_poultry) || 0,
            unit: 'baş'
          }));
          const broilerMapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.broiler_count) || 0,
            unit: 'baş'
          }));
          const layerMapped: RegionTotal[] = provincialRes.data.map((row: Record<string, string | number>) => ({
            name: String(row.province || ''),
            value: Number(row.layer_count) || 0,
            unit: 'baş'
          }));
          setProvincialPoultry(totalMapped);
          setProvincialBroilers(broilerMapped);
          setProvincialLayers(layerMapped);
          console.log('Provincial poultry data loaded:', totalMapped.length, 'provinces');
        }
      } catch (err) {
        console.error('İl bazlı kanatlı hayvan verileri yüklenemedi:', err);
      }

      // TÜİK Kümes Hayvancılığı Verileri
      try {
        const tuikQuery = `
          SELECT
            yil,
            CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) as value,
            urun
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun IN ('Kesilen Tavuk', 'Tavuk Eti', 'Etlik Piliç (Broiler) civivi Üretimi İçin Kuluçkaya Basılan Yumurta', 'Üretilen Broiler civivi')
          ORDER BY yil DESC, urun
        `;
        const tuikRes = await fetchQuery(tuikQuery);
        
        if (tuikRes.data && tuikRes.data.length > 0) {
          const yearMap = new Map<string, Omit<TuikChickenData, 'year'> & { year: string }>();
          
          tuikRes.data.forEach((row: Record<string, string | number>) => {
            const year = String(row.yil);
            if (!yearMap.has(year)) {
              yearMap.set(year, {
                year,
                slaughtered: 0,
                meatProduction: 0,
                hatchedEggs: 0,
                producedChicks: 0,
                hatchRate: 0,
                yieldPerBird: 0
              });
            }
            
            const yearData = yearMap.get(year);
            if (yearData) {
              const urun = String(row.urun);
              const value = Number(row.value) || 0;
              
              if (urun === 'Kesilen Tavuk') {
                yearData.slaughtered = value;
              } else if (urun === 'Tavuk Eti') {
                yearData.meatProduction = value;
              } else if (urun.includes('Kuluçkaya Basılan')) {
                yearData.hatchedEggs = value;
              } else if (urun.includes('Üretilen Broiler')) {
                yearData.producedChicks = value;
              }
            }
          });
          
          const tuikDataArray: TuikChickenData[] = Array.from(yearMap.values())
            .filter(d => d.slaughtered > 0 || d.meatProduction > 0) // Boş yılları çıkar (NULL TOPLAM'lı 2026 vb.)
            .map(d => ({
              ...d,
              hatchRate: d.hatchedEggs > 0 ? (d.producedChicks / d.hatchedEggs) * 100 : 0,
              yieldPerBird: d.slaughtered > 0 ? (d.meatProduction * 1000) / (d.slaughtered * 1000) : 0
            }))
            .sort((a, b) => Number(b.year) - Number(a.year));
          
          setTuikData(tuikDataArray);
          console.log('TÜİK data loaded:', tuikDataArray.length, 'years');
        }

        // Aylık dağılım — NULL TOPLAM olan yılları hariç tut (2026 gibi boş yıllar)
        const latestYearQuery = `
          SELECT MAX(yil) as max_year FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun = 'Tavuk Eti' AND TOPLAM IS NOT NULL
            AND CAST(REPLACE(TOPLAM, '.', '') AS UNSIGNED) > 1000`;
        const latestYearRes = await fetchQuery(latestYearQuery);
        const latestYear = String(latestYearRes.data?.[0]?.max_year || '2025');
        
        const monthlyQuery = `
          SELECT urun, birim, Ocak, Şubat, Mart, Nisan, Mayıs, Haziran, Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE yil = '${latestYear}' AND urun IN ('Kesilen Tavuk', 'Tavuk Eti')
        `;
        const monthlyRes = await fetchQuery(monthlyQuery);
        
        if (monthlyRes.data && monthlyRes.data.length > 0) {
          const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
          
          monthlyRes.data.forEach((row: Record<string, string | number>) => {
            const urun = String(row.urun);
            const monthlyValues = months.map(month => ({
              month,
              value: Number(String(row[month] || '0').replace(/\./g, '')) || 0
            }));
            
            if (urun === 'Kesilen Tavuk') {
              setMonthlySlaughter(monthlyValues);
            } else if (urun === 'Tavuk Eti') {
              setMonthlyMeat(monthlyValues);
            }
          });
        }
      } catch (tuikError) {
        console.warn('TÜİK kümes hayvancılığı verileri yüklenemedi:', tuikError);
      }

      // Hindi Eti Verileri
      try {
        const turkeyQuery = `
          SELECT
            yil,
            CAST(REPLACE(IFNULL(TOPLAM, '0'), '.', '') AS UNSIGNED) as total_production,
            Ocak, Şubat, Mart, Nisan, Mayıs, Haziran,
            Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun = 'Hindi Eti' AND TOPLAM IS NOT NULL
          ORDER BY yil DESC
        `;
        const turkeyRes = await fetchQuery(turkeyQuery);
        
        if (turkeyRes.data && turkeyRes.data.length > 0) {
          const turkeyYearData: TuikTurkeyMeatData[] = [];
          
          turkeyRes.data.forEach((row: Record<string, string | number>) => {
            const year = String(row.yil);
            let production = Number(row.total_production) || 0;
            
            if (production < 1000) {
              const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                             'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
              let monthlySum = 0;
              months.forEach(month => {
                const val = Number(String(row[month] || '0').replace(/\./g, '')) || 0;
                monthlySum += val;
              });
              if (monthlySum > 0) {
                production = monthlySum;
              }
            }
            
            if (production > 0) {
              turkeyYearData.push({ year, production });
            }
          });
          
          setTurkeyMeatData(turkeyYearData);
          
          // 2025 aylık verilerini al
          const latest2025 = turkeyRes.data.find((r: Record<string, string | number>) => String(r.yil) === '2025');
          if (latest2025) {
            const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                           'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            const monthlyValues: number[] = [];
            let totalKnown = 0;
            let knownCount = 0;
            
            months.forEach(month => {
              const val = Number(String(latest2025[month] || '0').replace(/\./g, '')) || 0;
              monthlyValues.push(val);
              if (val > 0) {
                totalKnown += val;
                knownCount++;
              }
            });
            
            const totalProduction = Number(latest2025.total_production) || 0;
            if (knownCount > 0 && knownCount < 12 && totalProduction > totalKnown) {
              const remaining = totalProduction - totalKnown;
              const missingCount = 12 - knownCount;
              const avgMissing = remaining / missingCount;
              
              for (let i = 0; i < monthlyValues.length; i++) {
                if (monthlyValues[i] === 0) {
                  monthlyValues[i] = avgMissing;
                }
              }
            }
            
            const monthlyTurkey = months.map((month, idx) => ({
              month,
              value: monthlyValues[idx]
            }));
            
            setMonthlyTurkeyMeat(monthlyTurkey);
          }
        }
      } catch (turkeyError) {
        console.warn('Hindi eti verileri yüklenemedi:', turkeyError);
      }

      // Bıldırcın Eti Verileri
      try {
        const quailQuery = `
          SELECT yil, urun,
            CAST(REPLACE(IFNULL(TOPLAM, '0'), '.', '') AS UNSIGNED) as total_val,
            Ocak, Şubat, Mart, Nisan, Mayıs, Haziran,
            Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık
          FROM tuik_hayvancilik_kumeshayvanciligi
          WHERE urun IN ('Bıldırcın Eti', 'Kesilen Bıldırcın') AND TOPLAM IS NOT NULL
          ORDER BY urun, yil DESC
        `;
        const quailRes = await fetchQuery(quailQuery);
        
        if (quailRes.data && quailRes.data.length > 0) {
          const quailMeat: TuikTurkeyMeatData[] = [];
          const quailSlaughter: TuikTurkeyMeatData[] = [];
          const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                         'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
          
          quailRes.data.forEach((row: Record<string, string | number>) => {
            const urun = String(row.urun || '');
            const year = String(row.yil);
            let production = Number(row.total_val) || 0;
            
            if (production < 10) {
              let monthlySum = 0;
              months.forEach(month => {
                const val = Number(String(row[month] || '0').replace(/\./g, '')) || 0;
                monthlySum += val;
              });
              if (monthlySum > 0) production = monthlySum;
            }
            
            if (production > 0) {
              if (urun === 'Bıldırcın Eti') {
                quailMeat.push({ year, production });
              } else if (urun === 'Kesilen Bıldırcın') {
                quailSlaughter.push({ year, production });
              }
            }
          });
          
          setQuailMeatData(quailMeat);
          setQuailSlaughterData(quailSlaughter);
          
          const latestQuail = quailRes.data.find((r: Record<string, string | number>) => String(r.urun) === 'Bıldırcın Eti' && Number(r.total_val) > 0);
          if (latestQuail) {
            const monthlyValues = months.map(month => ({
              month,
              value: Number(String(latestQuail[month] || '0').replace(/\./g, '')) || 0
            }));
            setMonthlyQuailMeat(monthlyValues);
          }
        }
      } catch (quailError) {
        console.warn('Bıldırcın eti verileri yüklenemedi:', quailError);
      }
      // Piliç Eti Dış Ticaret Verisi
      try {
        const tradeRes = await fetchQuery(
          `SELECT yil,
             ROUND(SUM(ihracat_deger)/1000000, 1) as ihracat_musd,
             ROUND(SUM(ithalat_deger)/1000000, 1) as ithalat_musd
           FROM tuik_ticaret_hayvansal
           WHERE ana_urun = 'Piliç Eti' AND yil >= 2015 AND yil < YEAR(CURDATE()) + 1
           GROUP BY yil ORDER BY yil`
        );
        if (tradeRes.data && tradeRes.data.length > 0) {
          setTradeData((tradeRes.data as Record<string, unknown>[]).map(r => ({
            yil: Number(r['yil']) || 0,
            ihracat_musd: Number(r['ihracat_musd']) || 0,
            ithalat_musd: Number(r['ithalat_musd']) || 0,
          })).filter(d => d.yil > 0));
        }
      } catch (tradeErr) {
        console.warn('Piliç eti ticaret verileri yüklenemedi:', tradeErr);
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

  const latest = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].poultryTon > 0) return series[i];
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
    if (!latest || !prev || prev.poultryTon <= 0) return 0;
    return ((latest.poultryTon - prev.poultryTon) / prev.poultryTon) * 100;
  }, [latest, prev]);

  return {
    loading,
    series,
    economicData,
    econStartDate, setEconStartDate,
    econEndDate, setEconEndDate,
    worldRanking,
    provincialPoultry,
    provincialBroilers,
    provincialLayers,
    poultryMapType, setPoultryMapType,
    activeTuikTab, setActiveTuikTab,
    tuikData,
    monthlySlaughter,
    monthlyMeat,
    turkeyMeatData,
    monthlyTurkeyMeat,
    quailMeatData,
    monthlyQuailMeat,
    quailSlaughterData,
    tradeData,
    latest,
    prev,
    yoy,
  };
}
