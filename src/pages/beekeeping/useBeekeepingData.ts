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
  /* Ulusal bal üretimi — il tablosu bozuk olduğu için tek güvenilir kaynak. */
  const [ulusalBal, setUlusalBal] = useState<{ yil: string; deger: number } | null>(null);

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

        /* Blok dışında da gerekiyor: il sorgusunun yılı buradan seçiliyor. */
        let tuikYearData: TuikKovanYearData[] = [];

        if (tuikRes.data && tuikRes.data.length > 0) {
          const findRow = (urun: string, tur: string) => 
            tuikRes.data!.find((r: Record<string, string | number>) => r.urun === urun && r.tur === tur);
          
          const eskiRow = findRow('Kovan', 'Eski Tip');
          const yeniRow = findRow('Kovan', 'Yeni Tip');
          const balmumuRow = findRow('Balmumu', '');
          
          tuikYearData = tuikYears
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

        /*
         * İl bazlı kovan & balmumu — yıl SABİT DEĞİL.
         *
         * Burada `sum: ['2024']` yazılıydı; tabloya 2025 girdiğinde il kırılımı
         * bir yıl geride kalıyordu. Yıl artık ülke serisinin son dolu yılından
         * geliyor, yani veri ilerledikçe kendiliğinden ilerliyor.
         */
        const ilYili = tuikYearData.at(-1)?.year ?? '2024';
        const provRaw = await fetchAgg(R_URETIM, {
          groupBy: ['yer', 'urun', 'tur'], sum: [ilYili],
          where: { duzeykod: 3 }, whereIn: { urun: ['Balmumu', 'Kovan'] },
        });
        const ilHaritasi = new Map<string, { yer: string; eskiTip: number; yeniTip: number; balmumu: number }>();
        for (const r of provRaw) {
          const yer = String(r.yer ?? '');
          const kayit = ilHaritasi.get(yer) ?? { yer, eskiTip: 0, yeniTip: 0, balmumu: 0 };
          const v = num(r[`sum_${ilYili}`]);
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
        /* Ulusal bal serisi: `tr_hayvansal_urun_uretimi` yıl bazlı tek satır. */
        const balSatirlari = await fetchRows('tr/hayvansal-urun-uretimi', { limit: 200 });
        const sonBal = balSatirlari
          .map((r) => ({ yil: String(r.yil ?? ''), deger: num(r.bal_uretimi) }))
          .filter((r) => r.yil && r.deger > 0)
          .sort((a, b) => a.yil.localeCompare(b.yil))
          .at(-1);
        if (sonBal) setUlusalBal(sonBal);
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

  /*
   * Arıcı sayısı trendi.
   *
   * Yıl listesi burada 2013–2023 diye SABİT YAZILIYDI; tablo 2025'e kadar
   * dolu olduğu hâlde grafik 2023'te bitiyordu. Artık veride hangi yıl varsa
   * o çiziliyor — `gorulenYillar` pivotu zaten her yılı satıra koyuyor.
   */
  const yearTrendData = useMemo<YearTrendData[]>(() => {
    const years = [...new Set(
      beekeeperYearData.flatMap((row) => Object.keys(row).filter((k) => /^\d{4}$/.test(k))),
    )].sort();
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

    /*
     * ─── KOVAN / BAL / BALMUMU ARTIK İL TABLOSUNDAN TOPLANMIYOR ─────────────
     *
     * `il_bal_cesitleri` iki ayrı şekilde bozuk ve toplamı yayımlanabilir
     * değil — ölçüldü:
     *
     *  1) BAL sütunu altı ilde kendi `bal_verimi_kg` sütunuyla çelişiyor.
     *     Adana 47.088 t yazıyor, kovan×verim 12.264 t veriyor; Kocaeli
     *     45.383'e karşı 4.243. Net fazlalık 98.767 ton. 81 ilin toplamı
     *     213.995 t çıkıyordu ve sayfa bunu KPI olarak gösteriyordu —
     *     Türkiye'nin gerçek bal üretiminin iki katından fazla.
     *
     *  2) KOVAN sütunlarında binlik ayracı ondalık nokta olarak okunmuş:
     *     Adıyaman `toplam_kovan` = 77,76 (olması gereken 77.760), Ordu
     *     `yeni_kovan_sayisi` = 611,40 (611.400). 19 ilde toplam ≠ yeni+eski.
     *
     * Tablonun VİNTAJI da 2023: düzeltilmiş bal toplamı 115.228 ≈ TÜİK 2023
     * (114.889) ve balmumu toplamı 3.969 ≈ TÜİK 2023 (3.971). Sayfa ise bu
     * sayıların hepsini arıcı sayısının yılıyla (2025) etiketliyordu.
     *
     * Bu yüzden üç ölçü de TÜİK'in kendi ülke serisinden geliyor. İl tablosu
     * yalnızca BAL ÇEŞİDİ kırılımı için kullanılmaya devam ediyor; oradaki
     * metin alanı bu bozukluklardan etkilenmiyor.
     */
    const sonTuik = tuikKovanYear.at(-1);
    const totalHives = sonTuik?.toplam ?? 0;
    const totalBeeswaxProduction = sonTuik?.balmumu ?? 0;
    const totalHoneyProduction = ulusalBal?.deger ?? 0;

    /* Verim ağırlıklı olmalı: 81 ilin verim ortalamasını almak, iki kovanlık
       ili 800 bin kovanlık ille eşit sayar. Ülke verimi = bal / kovan. */
    const avgYield = totalHives > 0 ? (totalHoneyProduction * 1000) / totalHives : 0;

    return {
      totalBeekeepers: totalBeekeepersSon,
      beekeeperGrowth,
      totalHives,
      totalHoneyProduction,
      totalBeeswaxProduction,
      avgYield,
      kovanYili: sonTuik?.year ?? '',
      balYili: ulusalBal?.yil ?? '',
    };
  }, [beekeeperYearData, tuikKovanYear, ulusalBal, sonYil, oncekiYil]);

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
