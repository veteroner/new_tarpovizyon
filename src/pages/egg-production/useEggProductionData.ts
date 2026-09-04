import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEggPrices } from '../../services/api';
import { fetchRows, fetchAgg, latestYear, num, type Row } from '../../services/d1';

const R_KUMES = 'tuik/hayvancilik-kumeshayvanciligi';
const R_FAO_HAY = 'fao/uretim-hayvansal-birincil';
const FAO_YUMURTA = 'Hen eggs in shell, fresh';
// FAO ülke adları İngilizce; AB-27 listesi de İngilizce olmalı.
const AB27_EN = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark',
  'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia',
  'Lithuania', 'Luxembourg', 'Malta', 'Netherlands (Kingdom of the)', 'Poland', 'Portugal',
  'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden'];
import {
  type YearPoint,
  type TuikTab,
  type TuikEggData,
  type MonthlyEggData,
  type EggEconomicData,
  type EggTradeData,
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
      const [data, kumesTum] = await Promise.all([
        /*
         * Donmuş ikizden çıkıldı. `o_toplam_uretim_veri`'nin son satırı
         * BOZUKTU (aşağıdaki yoruma bakınız: 2025 yumurta 14,6 Mr, gerçeği
         * 19,9 Mr; bal ve süt sütunları da 0/boş). `tr_hayvansal_urun_uretimi`
         * aynı 65 yılı doğru değerlerle ve sayısal sütunlarla veriyor.
         */
        fetchRows('tr/hayvansal-urun-uretimi'),
        fetchRows(R_KUMES, { limit: 2000 }),
      ]);

      const points = data
        .map((row) => {
          const year = Number(row['yil']) || 0;
          const eggsMillion = Number(row['yumurta_milyon_adet']) || 0;
          return { year, eggsMillion };
        })
        .filter((p) => p.year > 0 && p.eggsMillion > 0)
        .sort((a, b) => a.year - b.year);

      // TÜİK'i özet tablonun ÜZERİNE yaz. Eskiden yalnızca özet tabloda
      // olmayan yıllar ekleniyordu; ama o_toplam_uretim_veri'nin son satırı
      // yarım kalmış oluyor (2025: 14,6 Mr adet — TÜİK'in tam değeri 19,9 Mr)
      // ve sayfa uydurma bir "%-24,9 düşüş" gösteriyordu. TÜİK'te TOPLAM'ı
      // dolu olan her yıl için yetkili kaynak TÜİK.
      const tuikNewRows = kumesTum
        .filter((r) => r.urun === 'Tavuk Yumurtası' && r.TOPLAM != null && num(r.TOPLAM) > 1000)
        .sort((a, b) => Number(a.yil) - Number(b.yil));
      {
        tuikNewRows.forEach(row => {
          const year = Number(row['yil']) || 0;
          const totalBinAdet = num(row['TOPLAM']);
          const eggsMillion = totalBinAdet / 1000;
          if (year > 0 && eggsMillion > 0) {
            const mevcut = points.find(p => p.year === year);
            if (mevcut) mevcut.eggsMillion = eggsMillion;
            else points.push({ year, eggsMillion });
          }
        });
        points.sort((a, b) => a.year - b.year);
      }

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        /*
         * ─── DONMUŞ İKİZDEN ÇIKILDI ───────────────────────────────────────
         * Önce `oner/yumurta-maliyeti-fiyati` okunuyordu: MySQL'den bir kez
         * alınmış, hiçbir senkron işinin YAZMADIĞI donmuş kopya. Son verisi
         * 2026-02'de kalmıştı; günlük iş `yumurta_maliyet_fiyat` tablosunu
         * besliyor ve orası 2026-08'de. Yani ekran ALTI AY geride çalışıyordu.
         *
         * Sütun adları iki tabloda farklı; aşağıdaki eşleme onları çeviriyor.
         * Çıktı şekli AYNI bırakıldı — grafikler ve alt bileşenler
         * değişmeden çalışmaya devam ediyor.
         */
        const economicRes = { data: (await fetchRows('yumurta/maliyet-fiyat'))
          .slice(-60).reverse()
          .map((r): Row => ({ ...r, tarih: String(r.tarih ?? '').slice(0, 7) })) };
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
            tarih: String(item['tarih'] || ''),
            yumurta_maliyet_tl_kg: Number(item['maliyet_tl_kg']) || 0,
            yumurta_uretici_fiyati_tl_kg: Number(item['uretici_fiyati_tl_kg']) || 0,
            yumurtaci_tavuk_yemi_tl_kg: Number(item['yem_fiyati_tl_kg']) || 0,
            tuketici_fiyati_tl: Number(item['tuketici_fiyati_tl']) || 0,
            karlilik: Number(item['karlilik']) || 0,
            uretici_fiyati_maliyet_farki_tl_kg: Number(item['uretici_fiyati_maliyet_farki_tl_kg']) || 0,
            parite_yumurta_yem_paritesi: Number(item['yem_paritesi']) || 0,
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
        const tuikRes = { data: kumesTum
          .filter((r) => r.urun === 'Tavuk Yumurtası' && r.TOPLAM != null)
          .map((r): Row => ({ yil: r.yil, value: num(r.TOPLAM), urun: r.urun }))
          .sort((a, b) => Number(b.yil) - Number(a.yil)) };

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
            const yearData = yearMap.get(year)!;
            const urun = String(row.urun);
            const value = Number(row.value) || 0;
            if (urun === 'Tavuk Yumurtası') yearData.eggProduction = value;
            else if (urun.includes('Kuluçkaya Basılan')) yearData.hatchedEggs = value;
          });

          // tuik_hayvancilik_canlihayvan tablosundan yıllık layer count çek
          const canlihayvanRes = { data: (await fetchRows('tuik/hayvancilik-canlihayvan', { limit: 5000 })
            .catch(() => []))
            .filter((r) => String(r.grup ?? '') === 'Tavuk'
              && /Yumurta/i.test(String(r.kategori ?? ''))
              && (['TÜRKİYE', 'Türkiye'].includes(String(r.yer ?? ''))
                || /lke/i.test(String(r.duzey ?? ''))))
            .slice(0, 3) };

          if (canlihayvanRes.data && canlihayvanRes.data.length > 0) {
            const row = canlihayvanRes.data[0] as Record<string, unknown>;
            // y2010, y2011, ..., y2025 gibi sütunları çek
            Object.entries(row).forEach(([key, val]) => {
              const m = key.match(/^y(\d{4})$/);
              if (m) {
                const yr = m[1];
                const count = Number(String(val || '0').replace(/\./g, '')) || 0;
                if (count > 0) {
                  if (!yearMap.has(yr)) {
                    yearMap.set(yr, { year: yr, eggProduction: 0, layerCount: 0, yieldPerBird: 0, nativeLayer: 0, hybridLayer: 0, hatchedEggs: 0 });
                  }
                  yearMap.get(yr)!.layerCount = count;
                }
              }
            });
          }

          const tuikDataArray: TuikEggData[] = Array.from(yearMap.values())
            .filter(d => d.eggProduction > 0)
            .map((d) => ({
              ...d,
              yieldPerBird: d.layerCount > 0 ? d.eggProduction / d.layerCount : 0,
            }))
            .sort((a, b) => Number(b.year) - Number(a.year));

          setTuikData(tuikDataArray);
        }

        // Aylık dağılım - NULL olmayan en son yıl için
        // TOPLAM'ı boş olan yıl (henüz dolmamış) elenir.
        const doluYumurtaYillari = kumesTum
          .filter((r) => r.urun === 'Tavuk Yumurtası' && r.TOPLAM != null && num(r.TOPLAM) > 1000)
          .map((r) => Number(r.yil));
        const latestYear = String(doluYumurtaYillari.length ? Math.max(...doluYumurtaYillari) : 2025);

        const monthlyRes = { data: kumesTum.filter((r) =>
          String(r.yil) === latestYear
          && ['Tavuk Yumurtası', 'Yumurtacı Tavuk Sayısı'].includes(String(r.urun ?? ''))) };

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
        const buYil = new Date().getFullYear();
        const eggTradeRes = { data: (await fetchAgg('tuik/ticaret-hayvansal', {
          groupBy: ['yil'], sum: ['ihracat_deger', 'ithalat_deger'],
          where: { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' },
          like: { ana_urun: '%Yumurta%' },
          whereGte: { yil: 2015 }, whereLte: { yil: buYil }, orderBy: 'yil', dir: 'asc',
        })).map((r): Row => ({
          yil: r.yil,
          ihracat_musd: Math.round(num(r.sum_ihracat_deger) / 1e5) / 10,
          ithalat_musd: Math.round(num(r.sum_ithalat_deger) / 1e5) / 10,
        })) };
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
        // Eski sorgu oner_dunya_hayvansal_uretim_miktarla'ya bakıyordu; o tabloda
        // YUMURTA HİÇ YOK. Üstelik parantezleme hatalıydı
        // (… LIKE '%umurta%' OR … AND uretim > X), bu yüzden COUNT(*)+1 daima 1
        // dönüyor ve sayfa Türkiye'yi "Dünya #1" gösteriyordu. Gerçek kaynak
        // FAO tavuk yumurtası üretimi; Türkiye 2024'te 9. sırada.
        const faoYil = await latestYear(R_FAO_HAY, 'year', { where: { urunad: FAO_YUMURTA } });
        const faoSira = await fetchAgg(R_FAO_HAY, {
          groupBy: ['ulkead'], sum: ['uretim_deger'],
          where: { year: faoYil, urunad: FAO_YUMURTA },
          positive: ['uretim_deger'], exclude: { preset: 'v1', col: 'ulkead' },
          orderBy: 'sum_uretim_deger', dir: 'desc',
        });
        const ulkeler = faoSira.map((r) => String(r.ulkead ?? ''));
        const dunyaSira = ulkeler.indexOf('Türkiye') + 1;
        const abSira = ulkeler
          .filter((u) => AB27_EN.includes(u) || u === 'Türkiye')
          .indexOf('Türkiye') + 1;
        const eggRes = { data: dunyaSira > 0 ? [{ world_rank: dunyaSira, eu_rank: abSira }] : [] };

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
        console.log('Fetching egg prices...');
        const res = await fetchEggPrices();
        console.log('Egg prices response:', res);

        if (!cancelled) {
          if (res.prices && Object.keys(res.prices).length > 0) {
            setEggPrices(res.prices);
            setEggPriceError(null);
          } else {
            console.warn('No prices returned from API');
            setEggPriceError('Fiyatlar yüklenemedi');
          }
          if (res.date) setEggPriceDate(res.date);
        }
      } catch (error) {
        console.error('Egg prices fetch error:', error);
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
