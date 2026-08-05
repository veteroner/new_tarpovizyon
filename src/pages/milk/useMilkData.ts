import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRows, num, type Row } from '../../services/d1';
import {
  type YearPoint,
  type MilkEconomicData,
  type IndustrySutData,
  type WorldMilkPrices,
  type Productivity,
  type ProductivityComparison,
  type TuikSutUrunData,
  type WorldRankings,
  parseTrNumber,
  extractYear,
  AY_ADLARI,
  AY_TAM,
} from './milkUtils';

export function useMilkData() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [economicData, setEconomicData] = useState<MilkEconomicData[]>([]);
  const [industrySutData, setIndustrySutData] = useState<IndustrySutData[]>([]);
  const [worldMilkPrices, setWorldMilkPrices] = useState<WorldMilkPrices | null>(null);
  const [productivity, setProductivity] = useState<Productivity[]>([]);
  const [productivityComparison, setProductivityComparison] = useState<ProductivityComparison[]>([]);
  const [sufficiency, setSufficiency] = useState<Record<string, string | number> | null>(null);
  const [worldRankings, setWorldRankings] = useState<WorldRankings | null>(null);
  const [econStartDate, setEconStartDate] = useState<string>('');
  const [econEndDate, setEconEndDate] = useState<string>('');
  const [tuikSutData, setTuikSutData] = useState<TuikSutUrunData[]>([]);
  const [selectedTuikSutUrun, setSelectedTuikSutUrun] = useState<string>('İnek Sütü');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRows('oner/sut-uretimi-veri') as Record<string, unknown>[];

      const points = data
        .map((row) => {
          const year = extractYear(row['Yıl']);
          const cattleTon = parseTrNumber(row['Büyükbaş Süt Üretimi (Ton)']);
          const sheepTon = parseTrNumber(row['Koyun Sütü Üretimi (Ton)']);
          const goatTon = parseTrNumber(row['Keçi Sütü Üretimi (Ton)']);
          const totalTon = parseTrNumber(row['Toplam Süt Üretimi (Ton)']);
          return { year, totalTon, cattleTon, sheepTon, goatTon };
        })
        .filter((p) => p.year > 0)
        .sort((a, b) => a.year - b.year);

      setSeries(points);

      // Ekonomik göstergeleri yükle
      try {
        // DATE_FORMAT(tarih,'%Y-%m') karşılığı: 'YYYY-MM-DD ...' dizisinin ilk
        // 7 karakteri. Eski sorgu en yeni 60 kaydı azalan sırada veriyordu.
        const economicRows = (await fetchRows('oner/cig-sut-ekonomik-gostergeler'))
          .slice(-60).reverse()
          .map((r): Row => ({ ...r, tarih: String(r.tarih ?? '').slice(0, 7) }));
        if (economicRows.length > 0) {
          const mapped = economicRows.map((item) => ({
            tarih: String(item['tarih'] || ''),
            misir_silaji: Number(item['misir_silaji']) || 0,
            yonca: Number(item['yonca']) || 0,
            saman: Number(item['saman']) || 0,
            sut_yemi_19_hp: Number(item['sut_yemi_19_hp']) || 0,
            cig_sut_uretim_maliyeti_tl_lt: Number(item['cig_sut_uretim_maliyeti_tl_lt']) || 0,
            usk_cig_sut_tavsiye_fiyati_tl_lt: Number(item['usk_cig_sut_tavsiye_fiyati_tl_lt']) || 0,
            sut_yem_paritesi: Number(item['sut_yem_paritesi']) || 0,
            litre_basina_cig_sut_destegi_tl: Number(item['litre_basina_cig_sut_destegi_tl']) || 0,
            sut_yem_paritesi_destek_dahil: Number(item['sut_yem_paritesi_destek_dahil']) || 0,
            fiyat_maliyet_farki_tl_lt: Number(item['fiyat_maliyet_farki_tl_lt']) || 0,
            fiyat_maliyet_farki_tl_lt_destek_dahil: Number(item['fiyat_maliyet_farki_tl_lt_destek_dahil']) || 0,
            karlilik: Number(item['karlilik']) || 0,
          }));
          setEconomicData(mapped);
          if (mapped.length > 0) {
            setEconEndDate(mapped[0].tarih);
            setEconStartDate(mapped[Math.min(11, mapped.length - 1)].tarih);
          }
        }
      } catch (economicError) {
        console.warn('Süt ekonomik göstergeleri yüklenemedi:', economicError);
        setEconomicData([]);
      }

      // Sanayiye Giden Süt
      try {
        const industryRows = (await fetchRows('oner/sanayiye-giden-sut'))
          .slice(-24).reverse()
          .map((r): Row => ({ ...r, yil: String(r.yil ?? '').slice(0, 7) }));
        if (industryRows.length > 0) {
          const mapped = industryRows.map((item) => ({
            yil: String(item['yil'] || ''),
            inek_sutu_ton: Number(item['inek_sutu_ton']) || 0,
            yagsiz_sut_tozu_ton: Number(item['yagsiz_sut_tozu_ton']) || 0,
            tereyag_ton: Number(item['tereyag_ton']) || 0,
            inek_peyniri_ton: Number(item['inek_peyniri_ton']) || 0,
            yogurt_ton: Number(item['yogurt_ton']) || 0,
            ayran_ton: Number(item['ayran_ton']) || 0,
            icme_sutu_pastorize_uht_vb_ton: Number(item['icme_sutu_pastorize_uht_vb_ton']) || 0,
          }));
          setIndustrySutData(mapped);
        }
      } catch (err) {
        console.warn('Sanayiye giden süt verileri yüklenemedi:', err);
      }

      // Dünya Süt Fiyatları
      try {
        const worldRows = await fetchRows('oner/dunya-sut-fiyatlari', { limit: 1 });
        if (worldRows.length > 0) {
          const item = worldRows[0];
          setWorldMilkPrices({
            abd_class_3: Number(item['abd_class_3']) || 0,
            ab_27: Number(item['ab_27']) || 0,
            yeni_zelanda: Number(item['yeni_zelanda']) || 0,
            almanya: Number(item['almanya']) || 0,
            italya: Number(item['italya']) || 0,
            turkiye: Number(item['turkiye']) || 0,
          });
        }
      } catch (err) {
        console.warn('Dünya süt fiyatları yüklenemedi:', err);
      }

      // Verimlilik verileri
      try {
        const prodRows = (await fetchRows('oner/verimlilikler'))
          .map((r): Row => ({ ...r, yil: String(r.yil ?? '').slice(0, 4) }));
        if (prodRows.length > 0) {
          const mapped = prodRows.map((item) => ({
            yil: String(item['yil'] || ''),
            cig_sut_verimi_lt: Number(item['cig_sut_verimi_lt']) || 0,
          }));
          setProductivity(mapped);
        }
      } catch (err) {
        console.warn('Verimlilik verileri yüklenemedi:', err);
      }

      // Verimlilik Karşılaştırması
      try {
        // Değerler '99,5' gibi virgüllü metin; REPLACE(...)*1 karşılığı istemcide.
        const compRows = await fetchRows('oner/dunya-karkas-veri');
        if (compRows.length > 0) {
          const mapped = compRows
            .map((item) => ({
              ulke: String(item['Ülke'] ?? ''),
              karkas_verimi: Number(String(item['Karkas Verimi (Kg)'] ?? '').replace(',', '.')) || 0,
            }))
            .filter(d => d.ulke && d.ulke.trim().length > 0)
            .sort((a, b) => b.karkas_verimi - a.karkas_verimi);
          setProductivityComparison(mapped);
        }
      } catch (err) {
        console.warn('Verimlilik karşılaştırma verileri yüklenemedi:', err);
      }

      // Yeterlilikler
      try {
        const suffRows = await fetchRows('oner/yeterlilikler', { limit: 1 });
        if (suffRows.length > 0) {
          setSufficiency(suffRows[0] as Record<string, string | number>);
        }
      } catch (err) {
        console.warn('Yeterlilik verileri yüklenemedi:', err);
      }

      // Dünya Sıralamaları
      try {
        const euCountries = ['Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda', 'Belçika', 'Polonya', 'Romanya', 'Avusturya', 'Bulgaristan', 'Hırvatistan', 'Çekya', 'Danimarka', 'Estonya', 'Finlandiya', 'Yunanistan', 'Macaristan', 'İrlanda', 'Letonya', 'Litvanya', 'Portekiz', 'Slovakya', 'Slovenya', 'İsveç'];

        // Eskiden her ürün için iç içe COUNT(*)+1 alt sorgularıyla sıralama
        // hesaplanıyordu. Tablo küçük: tek seferde çekilip sıra istemcide.
        const dunyaUretim = await fetchRows('oner/dunya-hayvansal-uretim', { limit: 5000 });
        const siraHesapla = (urun: string) => {
          const satirlar = dunyaUretim.filter((r) => String(r.urun ?? '') === urun);
          const turkiye = satirlar.find((r) => String(r.ulke ?? '') === 'Türkiye');
          if (!turkiye) return { world: 0, eu: 0 };
          const trDeger = num(turkiye.uretim_miktari_ton);
          const ustunde = (liste: typeof satirlar) =>
            liste.filter((r) => num(r.uretim_miktari_ton) > trDeger).length + 1;
          return {
            world: ustunde(satirlar),
            eu: ustunde(satirlar.filter((r) => {
              const u = String(r.ulke ?? '');
              return euCountries.includes(u) || u === 'Türkiye';
            })),
          };
        };
        const cattleRank = siraHesapla('Sığırların çiğ sütü');
        const sheepRank = siraHesapla('Koyunların çiğ sütü');
        const goatRank = siraHesapla('Keçilerin çiğ sütü');

        setWorldRankings({ cattle: cattleRank, sheep: sheepRank, goat: goatRank });
      } catch (err) {
        console.warn('Dünya sıralaması verileri yüklenemedi:', err);
      }

      // TÜİK Süt ve Süt Ürünleri
      try {
        const tuikSutRows = (await fetchRows('tuik/sutvesuturunleri', { limit: 2000 }))
          .sort((a, b) => String(a.urun).localeCompare(String(b.urun), 'tr') || Number(a.yil) - Number(b.yil));
        if (tuikSutRows.length > 0) {
          const mapped: TuikSutUrunData[] = tuikSutRows.map((item) => ({
            urun: String(item['urun'] || ''),
            birim: String(item['birim'] || ''),
            yil: Number(item['yil']) || 0,
            toplam: Number(item['TOPLAM']) || 0,
            aylar: [
              Number(item['Ocak']) || 0,
              Number(item['Şubat'] ?? item['Subat']) || 0,
              Number(item['Mart']) || 0,
              Number(item['Nisan']) || 0,
              Number(item['Mayıs'] ?? item['Mayis']) || 0,
              Number(item['Haziran']) || 0,
              Number(item['Temmuz']) || 0,
              Number(item['Ağustos'] ?? item['Agustos']) || 0,
              Number(item['Eylül'] ?? item['Eylul']) || 0,
              Number(item['Ekim']) || 0,
              Number(item['Kasım'] ?? item['Kasim']) || 0,
              Number(item['Aralık'] ?? item['Aralik']) || 0,
            ],
          }));
          setTuikSutData(mapped);
        }
      } catch (err) {
        console.warn('TÜİK süt ürünleri verileri yüklenemedi:', err);
      }
    } catch (e) {
      console.error('Veri yüklenirken hata:', e);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Computed values ──────────────────────────────────────────────── */

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

  const latestBreakdown = useMemo(() => {
    const total = latest?.totalTon ?? 0;
    const rows = [
      { name: 'Büyükbaş', value: latest?.cattleTon ?? 0 },
      { name: 'Koyun', value: latest?.sheepTon ?? 0 },
      { name: 'Keçi', value: latest?.goatTon ?? 0 },
    ].filter((r) => r.value > 0);
    const safeTotal = total > 0 ? total : rows.reduce((s, r) => s + r.value, 0);
    return {
      total: safeTotal,
      rows: rows.map((r) => ({ ...r, share: safeTotal > 0 ? (r.value / safeTotal) * 100 : 0 })),
    };
  }, [latest]);

  const cagr = useMemo(() => {
    if (series.length < 10) return 0;
    const tenYearsAgo = series[series.length - 10];
    if (!tenYearsAgo || !latest || tenYearsAgo.totalTon <= 0) return 0;
    const years = latest.year - tenYearsAgo.year;
    if (years <= 0) return 0;
    return (Math.pow(latest.totalTon / tenYearsAgo.totalTon, 1 / years) - 1) * 100;
  }, [series, latest]);

  const cattleShare = useMemo(() => {
    if (!latest || latest.totalTon <= 0) return 0;
    return (latest.cattleTon / latest.totalTon) * 100;
  }, [latest]);

  const growthRates = useMemo(() => {
    return series.slice(1).map((point, idx) => {
      const prevPoint = series[idx];
      const rate = prevPoint.totalTon > 0
        ? ((point.totalTon - prevPoint.totalTon) / prevPoint.totalTon) * 100
        : 0;
      return { year: point.year, rate };
    });
  }, [series]);

  /* ── TÜİK computed ──────────────────────────────────────────────── */

  const tuikSelectedData = useMemo(() => {
    return tuikSutData.filter(d => d.urun === selectedTuikSutUrun).sort((a, b) => a.yil - b.yil);
  }, [tuikSutData, selectedTuikSutUrun]);

  const tuikLatestYear = useMemo(() => {
    if (tuikSelectedData.length === 0) return undefined;
    for (let i = tuikSelectedData.length - 1; i >= 0; i--) {
      if (tuikSelectedData[i].toplam > 0) return tuikSelectedData[i];
    }
    return tuikSelectedData[tuikSelectedData.length - 1];
  }, [tuikSelectedData]);

  const tuikPrevYear = useMemo(() => {
    if (!tuikLatestYear) return null;
    return tuikSelectedData.find(d => d.yil === tuikLatestYear.yil - 1) ?? null;
  }, [tuikSelectedData, tuikLatestYear]);

  const tuikYoyChange = useMemo(() => {
    if (!tuikLatestYear || !tuikPrevYear || tuikPrevYear.toplam <= 0) return 0;
    return ((tuikLatestYear.toplam - tuikPrevYear.toplam) / tuikPrevYear.toplam) * 100;
  }, [tuikLatestYear, tuikPrevYear]);

  const tuikAllProductsLatest = useMemo(() => {
    if (tuikSutData.length === 0) return [];
    const latestYil = Math.max(...tuikSutData.filter(d => d.toplam > 0).map(d => d.yil));
    return tuikSutData
      .filter(d => d.yil === latestYil && d.toplam > 0)
      .sort((a, b) => b.toplam - a.toplam);
  }, [tuikSutData]);

  const tuikSeasonality = useMemo(() => {
    if (!tuikLatestYear) return [];
    return AY_ADLARI.map((ay, idx) => ({
      ay,
      ayTam: AY_TAM[idx],
      miktar: tuikLatestYear.aylar[idx] || 0,
    }));
  }, [tuikLatestYear]);

  const tuikSeasonHeatmap = useMemo(() => {
    return tuikSelectedData.map(d => ({
      yil: d.yil,
      ...Object.fromEntries(AY_ADLARI.map((ay, idx) => [ay, d.aylar[idx] || 0])),
    }));
  }, [tuikSelectedData]);

  const tuikGrowthRates = useMemo(() => {
    return tuikSelectedData.slice(1).map((d, idx) => {
      const prev = tuikSelectedData[idx];
      const rate = prev.toplam > 0 ? ((d.toplam - prev.toplam) / prev.toplam) * 100 : 0;
      return { yil: d.yil, rate };
    });
  }, [tuikSelectedData]);

  return {
    loading,
    series,
    economicData,
    industrySutData,
    worldMilkPrices,
    productivity,
    productivityComparison,
    sufficiency,
    worldRankings,
    econStartDate, setEconStartDate,
    econEndDate, setEconEndDate,
    selectedTuikSutUrun, setSelectedTuikSutUrun,
    tuikSutData,
    // computed
    latest,
    yoy,
    latestBreakdown,
    cagr,
    cattleShare,
    growthRates,
    tuikSelectedData,
    tuikLatestYear,
    tuikYoyChange,
    tuikAllProductsLatest,
    tuikSeasonality,
    tuikSeasonHeatmap,
    tuikGrowthRates,
  };
}
