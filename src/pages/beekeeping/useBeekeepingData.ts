import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRows, fetchAgg, num } from '../../services/d1';

const R_URETIM = 'tuik/hayvancilik-hayvansaluretim';
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
      /*
       * ─── DONMUŞ İKİZDEN ÇIKILDI (GENİŞ → UZUN) ─────────────────────────
       * `oner/illere-gore-arici-sayisi` MySQL göçünden kalma kopyaydı ve
       * GENİŞ biçimdeydi: her yıl ayrı bir sütun (`2013_01_01_00_00_00` …).
       * Yeni yıl eklendiğinde tabloya SÜTUN eklemek gerekiyordu, bu yüzden
       * de hiç eklenmedi — 2023'te dondu.
       *
       * `il/arici-sayisi-yillik` UZUN biçimde: her satır bir il-yıl çifti
       * (`il`, `yil`, `arici_sayisi`). Yeni yıl yalnızca yeni SATIR demek.
       * Aşağıdaki pivot uzun biçimi bileşenin beklediği geniş şekle
       * çeviriyor — böylece grafik ve tablolar değişmeden çalışıyor ve
       * yıl listesi artık veriden geliyor, kodda sabit değil.
       */
      const uzunSatirlar = await fetchRows('il/arici-sayisi-yillik', { limit: 5000 }) as Record<string, unknown>[];

      const ileGore = new Map<string, Record<string, number | string>>();
      const gorulenYillar = new Set<string>();
      uzunSatirlar.forEach((r) => {
        const il = String(r['il'] ?? '');
        const yil = String(r['yil'] ?? '');
        if (!il || !yil) return;
        gorulenYillar.add(yil);
        if (!ileGore.has(il)) ileGore.set(il, { il });
        ileGore.get(il)![yil] = parseNumber(r['arici_sayisi']);
      });

      // Bir ilde eksik yıl varsa 0 ile doldur — grafikte delik kalmasın.
      const yillar = [...gorulenYillar].sort();
      const parsedYearData = [...ileGore.values()].map((satir) => {
        yillar.forEach((y) => { if (satir[y] === undefined) satir[y] = 0; });
        return satir;
      }) as Parameters<typeof setBeekeeperYearData>[0];
      setBeekeeperYearData(parsedYearData);

      // Load province detailed data
      /* Donmuş ikizden çıkıldı; yeni tabloda `_adet` sonekleri yok. */
      const provData = await fetchRows('il/bal-cesitleri', { limit: 2000 }) as Record<string, unknown>[];

      const parsedProvData = provData.map(row => ({
        il: String(row['il'] || ''),
        balin_cesiti: String(row['balin_cesiti'] || ''),
        aricilik_yapan_isletme_sayisi_adet: parseNumber(row['aricilik_yapan_isletme_sayisi']),
        yeni_kovan_sayisi_adet: parseNumber(row['yeni_kovan_sayisi']),
        eski_kovan_sayisi_adet: parseNumber(row['eski_kovan_sayisi']),
        toplam_kovan_adet: parseNumber(row['toplam_kovan']),
        bal_uretimi_ton: parseNumber(row['bal_uretimi_ton']),
        balmumu_uretimi_ton: parseNumber(row['balmumu_uretimi_ton']),
        bal_verimi_kg: parseNumber(row['bal_verimi_kg']),
      }));
      setProvinceData(parsedProvData);

      // TÜİK Kovan & Balmumu Verileri - Ülke Düzeyi (2004-2025)
      try {
        const tuikYears = ['2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025'];
        const tuikRes = { data: await fetchRows(R_URETIM, { duzeykod: 1, limit: 500 })
          .then((rows) => rows.filter((r) => ['Balmumu', 'Kovan'].includes(String(r.urun ?? '')))) };
        
        if (tuikRes.data && tuikRes.data.length > 0) {
          const findRow = (urun: string, tur: string) => 
            tuikRes.data!.find((r: Record<string, string | number>) => r.urun === urun && r.tur === tur);
          
          const eskiRow = findRow('Kovan', 'Eski Tip');
          const yeniRow = findRow('Kovan', 'Yeni Tip');
          const balmumuRow = findRow('Balmumu', '');
          
          const tuikYearData: TuikKovanYearData[] = tuikYears
            .map(year => {
              // NOT: MySQL'de kovan sayıları '1.234.567' biçiminde METİNDİ,
              // sorgular nokta siliyordu. D1'de sayısal — silmek ondalıklı
              // değeri bozardı.
              const eski = num(eskiRow?.[year]);
              const yeni = num(yeniRow?.[year]);
              const balmumu = num(balmumuRow?.[year]);
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
        // SUM(CASE WHEN …) pivotu istemcide; sıralama toplam kovana göre.
        const provRaw = await fetchAgg(R_URETIM, {
          groupBy: ['yer', 'urun', 'tur'], sum: ['2024'],
          where: { duzeykod: 3 }, whereIn: { urun: ['Balmumu', 'Kovan'] },
        });
        const ilHaritasi = new Map<string, { yer: string; eskiTip: number; yeniTip: number; balmumu: number }>();
        for (const r of provRaw) {
          const yer = String(r.yer ?? '');
          const kayit = ilHaritasi.get(yer) ?? { yer, eskiTip: 0, yeniTip: 0, balmumu: 0 };
          const v = num(r['sum_2024']);
          const urun = String(r.urun ?? '');
          const tur = String(r.tur ?? '');
          if (urun === 'Kovan' && tur === 'Eski Tip') kayit.eskiTip += v;
          else if (urun === 'Kovan' && tur === 'Yeni Tip') kayit.yeniTip += v;
          else if (urun === 'Balmumu') kayit.balmumu += v;
          ilHaritasi.set(yer, kayit);
        }
        const provRes = { data: [...ilHaritasi.values()]
          .sort((a, b) => (b.eskiTip + b.yeniTip) - (a.eskiTip + a.yeniTip)) };
        
        if (provRes.data && provRes.data.length > 0) {
          const provKovan: TuikProvinceKovan[] = provRes.data.map((row) => ({
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

  /*
   * ─── YILLAR VERİDEN TÜRETİLİYOR ─────────────────────────────────────────
   * Burada `row['2023']` ve `row['2022']` SABİT YAZILIYDI. Veri borusu
   * dinamikti (`gorulenYillar`), ama KPI hesabı 2023'e çivilenmişti: uca
   * 2024 ve 2025 eklendiğinde sayfa yine 2023 toplamını gösteriyordu.
   * Etiketler de ("Aktif Kovan (2023)", "Arıcılık Gelişimi (2013-2023)")
   * aynı sabitleri taşıyordu, yani sayı eskiyince yazı da yalan söylüyordu.
   *
   * Artık mevcut yıl anahtarlarından en büyüğü ve bir öncekisi alınıyor;
   * yeni yıl geldiğinde hem hesap hem etiket kendiliğinden ilerliyor.
   */
  const { sonYil, oncekiYil, ilkYil } = useMemo(() => {
    const yillar = new Set<string>();
    beekeeperYearData.forEach((row) => {
      Object.keys(row).forEach((k) => { if (/^\d{4}$/.test(k)) yillar.add(k); });
    });
    const sirali = [...yillar].sort();
    return {
      ilkYil: sirali[0] ?? '',
      sonYil: sirali[sirali.length - 1] ?? '',
      oncekiYil: sirali[sirali.length - 2] ?? '',
    };
  }, [beekeeperYearData]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo<KpiMetrics>(() => {
    /* Dizin imzası `number | string` veriyor (`il` alanı yüzünden); yıl
       anahtarları her zaman sayı, okurken daraltılıyor. */
    const yilDegeri = (row: BeekeeperYearData, y: string) =>
      (typeof row[y] === 'number' ? row[y] : 0);
    const toplaYil = (y: string) =>
      y ? beekeeperYearData.reduce((sum, row) => sum + yilDegeri(row, y), 0) : 0;
    const totalBeekeepersSon = toplaYil(sonYil);
    const totalBeekeepersOnceki = toplaYil(oncekiYil);
    const beekeeperGrowth = totalBeekeepersOnceki > 0
      ? ((totalBeekeepersSon - totalBeekeepersOnceki) / totalBeekeepersOnceki * 100)
      : 0;

    const totalHives = provinceData.reduce((sum, row) => sum + row.toplam_kovan_adet, 0);
    const totalHoneyProduction = provinceData.reduce((sum, row) => sum + row.bal_uretimi_ton, 0);
    const totalBeeswaxProduction = provinceData.reduce((sum, row) => sum + row.balmumu_uretimi_ton, 0);
    const avgYield = provinceData.length > 0 
      ? provinceData.reduce((sum, row) => sum + row.bal_verimi_kg, 0) / provinceData.length 
      : 0;

    return {
      totalBeekeepers: totalBeekeepersSon,
      beekeeperGrowth,
      totalHives,
      totalHoneyProduction,
      totalBeeswaxProduction,
      avgYield,
    };
  }, [beekeeperYearData, provinceData, sonYil, oncekiYil]);

  // Top provinces by beekeepers
  const topBeekeepers = useMemo(() => {
    return beekeeperYearData
      .map(row => ({ il: row.il, count: typeof row[sonYil] === 'number' ? row[sonYil] : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [beekeeperYearData, sonYil]);

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
    /* Etiketler bu üçünü kullanıyor; sabit yıl yazmak yerine veriden gelen
       değer gösteriliyor. */
    ilkYil,
    sonYil,
    oncekiYil,
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
