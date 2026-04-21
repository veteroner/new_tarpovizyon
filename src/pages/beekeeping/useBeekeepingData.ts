import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchQuery } from '../../services/api';
import {
  type BeekeeperYearData,
  type ProvinceData,
  type YearTrendData,
  type TuikKovanYearData,
  type TuikProvinceKovan,
  type TuikKovanKpi,
  type KpiMetrics,
  parseNumber,
} from './beekeepingTypes';

export function useBeekeepingData() {
  const [loading, setLoading] = useState(true);
  const [beekeeperYearData, setBeekeeperYearData] = useState<BeekeeperYearData[]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([]);
  const [tuikKovanYear, setTuikKovanYear] = useState<TuikKovanYearData[]>([]);
  const [tuikProvinceKovan, setTuikProvinceKovan] = useState<TuikProvinceKovan[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load beekeeper trend data (2013-2023)
      const res1 = await fetchQuery('SELECT * FROM oner_i_llere_gore_arici_sayisi');
      const yearData = (res1.data ?? []) as Record<string, unknown>[];
      
      const parsedYearData = yearData.map(row => ({
        il: String(row['il'] || ''),
        '2013': parseNumber(row['2013_01_01_00_00_00']),
        '2014': parseNumber(row['2014_01_01_00_00_00']),
        '2015': parseNumber(row['2015_01_01_00_00_00']),
        '2016': parseNumber(row['2016_01_01_00_00_00']),
        '2017': parseNumber(row['2017_01_01_00_00_00']),
        '2018': parseNumber(row['2018_01_01_00_00_00']),
        '2019': parseNumber(row['2019_01_01_00_00_00']),
        '2020': parseNumber(row['2020_01_01_00_00_00']),
        '2021': parseNumber(row['2021_01_01_00_00_00']),
        '2022': parseNumber(row['2022_01_01_00_00_00']),
        '2023': parseNumber(row['2023_01_01_00_00_00']),
      }));
      setBeekeeperYearData(parsedYearData);

      // Load province detailed data
      const res2 = await fetchQuery('SELECT * FROM oner_i_llerin_bal_cesitleri');
      const provData = (res2.data ?? []) as Record<string, unknown>[];
      
      const parsedProvData = provData.map(row => ({
        il: String(row['il'] || ''),
        balin_cesiti: String(row['balin_cesiti'] || ''),
        aricilik_yapan_isletme_sayisi_adet: parseNumber(row['aricilik_yapan_isletme_sayisi_adet']),
        yeni_kovan_sayisi_adet: parseNumber(row['yeni_kovan_sayisi_adet']),
        eski_kovan_sayisi_adet: parseNumber(row['eski_kovan_sayisi_adet']),
        toplam_kovan_adet: parseNumber(row['toplam_kovan_adet']),
        bal_uretimi_ton: parseNumber(row['bal_uretimi_ton']),
        balmumu_uretimi_ton: parseNumber(row['balmumu_uretimi_ton']),
        bal_verimi_kg: parseNumber(row['bal_verimi_kg']),
      }));
      setProvinceData(parsedProvData);

      // TÜİK Kovan & Balmumu Verileri - Ülke Düzeyi (2004-2025)
      try {
        const tuikYears = ['2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'];
        const yearCols = tuikYears.map(y => '`' + y + '`').join(', ');
        const tuikQuery = `SELECT urun, tur, birim, ${yearCols} FROM tuik_hayvancilik_hayvansaluretim WHERE urun IN ('Balmumu', 'Kovan') AND duzeykod = 1`;
        const tuikRes = await fetchQuery(tuikQuery);
        
        if (tuikRes.data && tuikRes.data.length > 0) {
          const findRow = (urun: string, tur: string) => 
            tuikRes.data!.find((r: Record<string, string | number>) => r.urun === urun && r.tur === tur);
          
          const eskiRow = findRow('Kovan', 'Eski Tip');
          const yeniRow = findRow('Kovan', 'Yeni Tip');
          const balmumuRow = findRow('Balmumu', '');
          
          const tuikYearData: TuikKovanYearData[] = tuikYears
            .map(year => {
              const eski = Number(String(eskiRow?.[year] || '0').replace(/\./g, '')) || 0;
              const yeni = Number(String(yeniRow?.[year] || '0').replace(/\./g, '')) || 0;
              const balmumu = parseFloat(String(balmumuRow?.[year] || '0')) || 0;
              return {
                year,
                eskiTip: eski,
                yeniTip: yeni,
                toplam: eski + yeni,
                balmumu,
              };
            })
            .filter(d => d.toplam > 0 || d.balmumu > 0);
          
          setTuikKovanYear(tuikYearData);
        }

        // İl bazlı kovan & balmumu (en güncel yıl)
        const provQuery = `SELECT yer, 
          SUM(CASE WHEN urun='Kovan' AND tur='Eski Tip' THEN CAST(REPLACE(\`2024\`, '.', '') AS UNSIGNED) ELSE 0 END) as eskiTip,
          SUM(CASE WHEN urun='Kovan' AND tur='Yeni Tip' THEN CAST(REPLACE(\`2024\`, '.', '') AS UNSIGNED) ELSE 0 END) as yeniTip,
          SUM(CASE WHEN urun='Balmumu' THEN CAST(\`2024\` AS DECIMAL(10,3)) ELSE 0 END) as balmumu
          FROM tuik_hayvancilik_hayvansaluretim 
          WHERE urun IN ('Balmumu', 'Kovan') AND duzeykod = 3
          GROUP BY yer
          ORDER BY (SUM(CASE WHEN urun='Kovan' THEN CAST(REPLACE(\`2024\`, '.', '') AS UNSIGNED) ELSE 0 END)) DESC`;
        const provRes = await fetchQuery(provQuery);
        
        if (provRes.data && provRes.data.length > 0) {
          const provKovan: TuikProvinceKovan[] = provRes.data.map((row: Record<string, string | number>) => ({
            il: String(row.yer || ''),
            eskiTip: Number(row.eskiTip) || 0,
            yeniTip: Number(row.yeniTip) || 0,
            toplam: (Number(row.eskiTip) || 0) + (Number(row.yeniTip) || 0),
            balmumu: parseFloat(String(row.balmumu)) || 0,
          }));
          setTuikProvinceKovan(provKovan);
        }
      } catch (tuikError) {
        console.warn('TÜİK kovan/balmumu verileri yüklenemedi:', tuikError);
      }

    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate year trend data
  const yearTrendData = useMemo<YearTrendData[]>(() => {
    const years = ['2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
    return years.map(year => {
      const totalBeekeepers = beekeeperYearData.reduce((sum, row) => sum + (row[year as keyof BeekeeperYearData] as number || 0), 0);
      return {
        year,
        beekeepers: totalBeekeepers,
        totalHives: 0,
        newHives: 0,
        oldHives: 0,
      };
    });
  }, [beekeeperYearData]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo<KpiMetrics>(() => {
    const totalBeekeepers2023 = beekeeperYearData.reduce((sum, row) => sum + (row['2023'] || 0), 0);
    const totalBeekeepers2022 = beekeeperYearData.reduce((sum, row) => sum + (row['2022'] || 0), 0);
    const beekeeperGrowth = totalBeekeepers2022 > 0 
      ? ((totalBeekeepers2023 - totalBeekeepers2022) / totalBeekeepers2022 * 100) 
      : 0;

    const totalHives = provinceData.reduce((sum, row) => sum + row.toplam_kovan_adet, 0);
    const totalHoneyProduction = provinceData.reduce((sum, row) => sum + row.bal_uretimi_ton, 0);
    const totalBeeswaxProduction = provinceData.reduce((sum, row) => sum + row.balmumu_uretimi_ton, 0);
    const avgYield = provinceData.length > 0 
      ? provinceData.reduce((sum, row) => sum + row.bal_verimi_kg, 0) / provinceData.length 
      : 0;

    return {
      totalBeekeepers: totalBeekeepers2023,
      beekeeperGrowth,
      totalHives,
      totalHoneyProduction,
      totalBeeswaxProduction,
      avgYield,
    };
  }, [beekeeperYearData, provinceData]);

  // Top provinces by beekeepers
  const topBeekeepers = useMemo(() => {
    return beekeeperYearData
      .map(row => ({ il: row.il, count: row['2023'] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [beekeeperYearData]);

  // Top provinces by honey production
  const topProducers = useMemo(() => {
    return provinceData
      .map(row => ({ il: row.il, production: row.bal_uretimi_ton }))
      .sort((a, b) => b.production - a.production)
      .slice(0, 10);
  }, [provinceData]);

  // Top provinces by yield
  const topYield = useMemo(() => {
    return provinceData
      .filter(row => row.bal_verimi_kg > 0)
      .map(row => ({ il: row.il, yield: row.bal_verimi_kg }))
      .sort((a, b) => b.yield - a.yield)
      .slice(0, 10);
  }, [provinceData]);

  // Honey types distribution
  const honeyTypesData = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    provinceData.forEach(row => {
      const types = row.balin_cesiti.split(',').map(t => t.trim());
      types.forEach(type => {
        if (type && type !== '-') {
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        }
      });
    });

    return Array.from(typeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [provinceData]);

  // Treemap data for productivity analysis
  const treemapData = useMemo(() => {
    const data = provinceData
      .filter(row => row.bal_uretimi_ton > 0)
      .map(row => ({
        name: row.il,
        size: row.bal_uretimi_ton,
        yield: row.bal_verimi_kg,
        hives: row.toplam_kovan_adet,
        beekeepers: row.aricilik_yapan_isletme_sayisi_adet,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 30);
    
    return [{ name: 'Türkiye', children: data }];
  }, [provinceData]);

  // TÜİK Kovan KPI'ları
  const tuikKovanKpi = useMemo<TuikKovanKpi | null>(() => {
    if (tuikKovanYear.length === 0) return null;
    const latest = tuikKovanYear[tuikKovanYear.length - 1];
    const prev = tuikKovanYear.length >= 2 ? tuikKovanYear[tuikKovanYear.length - 2] : null;
    const first = tuikKovanYear[0];
    const yoy = prev && prev.toplam > 0 ? ((latest.toplam - prev.toplam) / prev.toplam * 100) : 0;
    const balmumuYoy = prev && prev.balmumu > 0 ? ((latest.balmumu - prev.balmumu) / prev.balmumu * 100) : 0;
    const years = tuikKovanYear.length - 1;
    const cagr = years > 0 && first.toplam > 0 ? (Math.pow(latest.toplam / first.toplam, 1 / years) - 1) * 100 : 0;
    const peak = tuikKovanYear.reduce((best, cur) => cur.toplam > best.toplam ? cur : best, tuikKovanYear[0]);
    const eskiPay = latest.toplam > 0 ? (latest.eskiTip / latest.toplam * 100) : 0;
    return { latest, prev, yoy, balmumuYoy, cagr, peak, eskiPay };
  }, [tuikKovanYear]);

  // Top 10 provinces by total kovan
  const tuikTopKovan = useMemo(() => {
    return tuikProvinceKovan.slice(0, 10);
  }, [tuikProvinceKovan]);

  // Top 10 provinces by balmumu
  const tuikTopBalmumu = useMemo(() => {
    return [...tuikProvinceKovan]
      .sort((a, b) => b.balmumu - a.balmumu)
      .slice(0, 10);
  }, [tuikProvinceKovan]);

  return {
    loading,
    yearTrendData,
    kpiMetrics,
    topBeekeepers,
    topProducers,
    topYield,
    honeyTypesData,
    treemapData,
    tuikKovanYear,
    tuikKovanKpi,
    tuikTopKovan,
    tuikTopBalmumu,
  };
}
