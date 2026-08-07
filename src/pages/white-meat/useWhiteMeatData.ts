import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRows, fetchAgg, num, type Row } from '../../services/d1';

const R_KUMES = 'tuik/hayvancilik-kumeshayvanciligi';
// TÜİK kümes tablosu 209 satır — bir kez çekilip tüm bölümlerde süzülüyor.
// NOT: MySQL'de sayılar '2.345.678' biçiminde METİNDİ ve sorgular
// REPLACE(TOPLAM,'.','') uyguluyordu. D1'de sütunlar sayısal; nokta silmek
// ondalıklı bir değeri bozardı, bu yüzden doğrudan sayıya çevriliyor.
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
  /*
   * İl bazlı kanatlı sayıları TÜİK SDMX'te YOK (yalnızca MEDAS'ta); tablo
   * 2024'te duruyor. Veri yılı başlıkta gösteriliyor ki güncel sanılmasın.
   */
  const [provincialYear, setProvincialYear] = useState<string>('');
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
      const data = await fetchRows('oner/hayvansal-urun-uretimi');
      const kumesTum = await fetchRows(R_KUMES, { limit: 2000 });

      const points: YearPoint[] = data
        .map((row) => ({
          year: Number(String(row.yillar ?? '').slice(0, 4)) || 0,
          poultryTon: num(row.kanatli_eti_ton),
        }))
        .filter((p) => p.year > 0)
        .sort((a, b) => a.year - b.year);

      // TÜİK tablosundan hist tablosunda olmayan yılları ekle (örn. 2025+)
      const histMaxYear = points.length > 0 ? Math.max(...points.map(p => p.year)) : 2024;
      const tuikNewRows = kumesTum
        .filter((r) => r.urun === 'Tavuk Eti' && r.TOPLAM != null && num(r.TOPLAM) > 1000
          && Number(r.yil) > histMaxYear)
        .sort((a, b) => Number(a.yil) - Number(b.yil));
      {
        tuikNewRows.forEach(row => {
          const year = Number(row['yil']) || 0;
          const kanatlı = num(row['TOPLAM']);
          if (year > 0 && kanatlı > 0 && !points.find(p => p.year === year)) {
            points.push({ year, poultryTon: kanatlı });
          }
        });
        points.sort((a, b) => a.year - b.year);
      }

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        const economicRes = { data: (await fetchRows('oner/kanatli-eti-maliyeti-fiyati'))
          .slice(-60).reverse()
          .map((r): Row => ({ ...r, tarih: String(r.tarih ?? '').slice(0, 7) })) };
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item) => ({
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

        // Eskiden iç içe COUNT(*)+1 alt sorgularıyla; tablo küçük, sıra istemcide.
        const dunyaUretim = await fetchRows('oner/dunya-hayvansal-uretim', { limit: 5000 });
        const tavuk = dunyaUretim.filter((r) => String(r.urun ?? '') === 'Tavuk eti');
        const trDeger = num(tavuk.find((r) => String(r.ulke ?? '') === 'Türkiye')?.uretim_miktari_ton);
        const ustunde = (liste: typeof tavuk) =>
          liste.filter((r) => num(r.uretim_miktari_ton) > trDeger).length + 1;
        const chickenRes = { data: [{
          world_rank: ustunde(tavuk),
          eu_rank: ustunde(tavuk.filter((r) => {
            const u = String(r.ulke ?? '');
            return euCountries.includes(u) || u === 'Türkiye';
          })),
        }] };
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
        // WHERE tarih = (SELECT MAX(tarih) …) karşılığı: en yeni tarih istemcide.
        const ilHayvan = await fetchRows('oner/illerin-hayvan-sayisi', { limit: 2000 });
        const sonTarih = ilHayvan.reduce((en, r) => {
          const t = String(r.tarih ?? '');
          return t > en ? t : en;
        }, '');
        const provincialRes = { data: ilHayvan
          .filter((r) => String(r.tarih ?? '') === sonTarih)
          .sort((a, b) => String(a.il).localeCompare(String(b.il), 'tr'))
          .map((r) => ({
            province: String(r.il ?? ''),
            broiler_count: num(r.et_tavugu_sayisi),
            layer_count: num(r.yumurta_tavugu_sayisi),
            total_poultry: num(r.et_tavugu_sayisi) + num(r.yumurta_tavugu_sayisi),
          })) };
        setProvincialYear(sonTarih.slice(0, 4));
        if (provincialRes.data && provincialRes.data.length > 0) {
          const totalMapped: RegionTotal[] = provincialRes.data.map((row) => ({
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
        const TUIK_URUNLER = ['Kesilen Tavuk', 'Tavuk Eti',
          'Etlik Piliç (Broiler) civivi Üretimi İçin Kuluçkaya Basılan Yumurta', 'Üretilen Broiler civivi'];
        const tuikRes = { data: kumesTum
          .filter((r) => TUIK_URUNLER.includes(String(r.urun ?? '')))
          .map((r): Row => ({ yil: r.yil, value: num(r.TOPLAM), urun: r.urun }))
          .sort((a, b) => Number(b.yil) - Number(a.yil)
            || String(a.urun).localeCompare(String(b.urun), 'tr')) };
        
        if (tuikRes.data && tuikRes.data.length > 0) {
          const yearMap = new Map<string, Omit<TuikChickenData, 'year'> & { year: string }>();
          
          tuikRes.data.forEach((row) => {
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
        // TOPLAM'ı boş/çok küçük olan yıllar (henüz dolmamış) elenir.
        const doluTavukYillari = kumesTum
          .filter((r) => r.urun === 'Tavuk Eti' && r.TOPLAM != null && num(r.TOPLAM) > 1000)
          .map((r) => Number(r.yil));
        const latestYear = String(doluTavukYillari.length ? Math.max(...doluTavukYillari) : 2025);

        const monthlyRes = { data: kumesTum.filter((r) =>
          String(r.yil) === latestYear && ['Kesilen Tavuk', 'Tavuk Eti'].includes(String(r.urun ?? ''))) };
        
        if (monthlyRes.data && monthlyRes.data.length > 0) {
          const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
          
          monthlyRes.data.forEach((row) => {
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
        const turkeyRes = { data: kumesTum
          .filter((r) => r.urun === 'Hindi Eti' && r.TOPLAM != null)
          .map((r): Row => ({ ...r, total_production: num(r.TOPLAM) }))
          .sort((a, b) => Number(b.yil) - Number(a.yil)) };
        
        if (turkeyRes.data && turkeyRes.data.length > 0) {
          const turkeyYearData: TuikTurkeyMeatData[] = [];
          
          turkeyRes.data.forEach((row) => {
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
        const quailRes = { data: kumesTum
          .filter((r) => ['Bıldırcın Eti', 'Kesilen Bıldırcın'].includes(String(r.urun ?? '')) && r.TOPLAM != null)
          .map((r): Row => ({ ...r, total_val: num(r.TOPLAM) }))
          .sort((a, b) => String(a.urun).localeCompare(String(b.urun), 'tr') || Number(b.yil) - Number(a.yil)) };
        
        if (quailRes.data && quailRes.data.length > 0) {
          const quailMeat: TuikTurkeyMeatData[] = [];
          const quailSlaughter: TuikTurkeyMeatData[] = [];
          const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                         'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
          
          quailRes.data.forEach((row) => {
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
        // yil >= 2015 ve içinde bulunulan yıla kadar (eski: yil < YEAR(CURDATE())+1).
        const buYil = new Date().getFullYear();
        const tradeRes = { data: (await fetchAgg('tuik/ticaret-hayvansal', {
          groupBy: ['yil'], sum: ['ihracat_deger', 'ithalat_deger'],
          where: { ana_urun: 'Piliç Eti', duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' },
          whereGte: { yil: 2015 }, whereLte: { yil: buYil }, orderBy: 'yil', dir: 'asc',
        })).map((r) => ({
          yil: r.yil,
          ihracat_musd: Math.round(num(r.sum_ihracat_deger) / 1e5) / 10,
          ithalat_musd: Math.round(num(r.sum_ithalat_deger) / 1e5) / 10,
        })) };
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
    provincialYear,
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
