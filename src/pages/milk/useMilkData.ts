import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchQuery } from '../../services/api';
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
      const res = await fetchQuery('SELECT * FROM o_sur_uretimi_veri');
      const data = (res.data ?? []) as Record<string, unknown>[];

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
        const economicQuery = `SELECT 
          DATE_FORMAT(tarih, '%Y-%m') as tarih,
          misir_silaji, yonca, saman, sut_yemi_19_hp,
          cig_sut_uretim_maliyeti_tl_lt, usk_cig_sut_tavsiye_fiyati_tl_lt,
          sut_yem_paritesi, litre_basina_cig_sut_destegi_tl,
          sut_yem_paritesi_destek_dahil, fiyat_maliyet_farki_tl_lt,
          fiyat_maliyet_farki_tl_lt_destek_dahil, karlilik
          FROM oner_cig_sut_ekonomik_gostergeler 
          ORDER BY tarih DESC LIMIT 60`;
        const economicRes = await fetchQuery(economicQuery);
        if (economicRes.data && economicRes.data.length > 0) {
          const mapped = economicRes.data.map((item: Record<string, string | number>) => ({
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
        const industryQuery = `SELECT 
          DATE_FORMAT(yil, '%Y-%m') as yil,
          inek_sutu_ton, yagsiz_sut_tozu_ton, tereyag_ton, inek_peyniri_ton,
          yogurt_ton, ayran_ton, icme_sutu_pastorize_uht_vb_ton
          FROM oner_sanayiye_giden_sut_ve_sut_urunu 
          ORDER BY yil DESC LIMIT 24`;
        const industryRes = await fetchQuery(industryQuery);
        if (industryRes.data && industryRes.data.length > 0) {
          const mapped = industryRes.data.map((item: Record<string, string | number>) => ({
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
        const worldPricesQuery = 'SELECT * FROM oner_dunya_sut_fiyatlari LIMIT 1';
        const worldRes = await fetchQuery(worldPricesQuery);
        if (worldRes.data && worldRes.data.length > 0) {
          const item = worldRes.data[0];
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
        const productivityQuery = `SELECT 
          DATE_FORMAT(yil, '%Y') as yil,
          cig_sut_verimi_lt 
          FROM oner_verimlilikler 
          ORDER BY yil ASC`;
        const prodRes = await fetchQuery(productivityQuery);
        if (prodRes.data && prodRes.data.length > 0) {
          const mapped = prodRes.data.map((item: Record<string, string | number>) => ({
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
        const compQuery = 'SELECT `Ülke` as ulke, REPLACE(`Karkas Verimi (Kg)`, \',\', \'.\') * 1 as karkas_verimi FROM o_dunya_kaarkas_veri ORDER BY karkas_verimi DESC';
        const compRes = await fetchQuery(compQuery);
        if (compRes.data && compRes.data.length > 0) {
          const mapped = compRes.data
            .map((item: Record<string, string | number>) => ({
              ulke: String(item['ulke'] || ''),
              karkas_verimi: Number(item['karkas_verimi']) || 0,
            }))
            .filter(d => d.ulke && d.ulke.trim().length > 0);
          setProductivityComparison(mapped);
        }
      } catch (err) {
        console.warn('Verimlilik karşılaştırma verileri yüklenemedi:', err);
      }

      // Yeterlilikler
      try {
        const suffQuery = 'SELECT * FROM oner_yeterlilikler LIMIT 1';
        const suffRes = await fetchQuery(suffQuery);
        if (suffRes.data && suffRes.data.length > 0) {
          setSufficiency(suffRes.data[0]);
        }
      } catch (err) {
        console.warn('Yeterlilik verileri yüklenemedi:', err);
      }

      // Dünya Sıralamaları
      try {
        const euCountries = ['Almanya', 'Fransa', 'İtalya', 'İspanya', 'Hollanda', 'Belçika', 'Polonya', 'Romanya', 'Avusturya', 'Bulgaristan', 'Hırvatistan', 'Çekya', 'Danimarka', 'Estonya', 'Finlandiya', 'Yunanistan', 'Macaristan', 'İrlanda', 'Letonya', 'Litvanya', 'Portekiz', 'Slovakya', 'Slovenya', 'İsveç'];
        const euList = euCountries.map(c => `'${c}'`).join(',');

        const cattleQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Sığırların çiğ sütü' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Sığırların çiğ sütü')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Sığırların çiğ sütü' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Sığırların çiğ sütü')) as eu_rank
        `;
        const cattleRes = await fetchQuery(cattleQuery);

        const sheepQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Koyunların çiğ sütü' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Koyunların çiğ sütü')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Koyunların çiğ sütü' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Koyunların çiğ sütü')) as eu_rank
        `;
        const sheepRes = await fetchQuery(sheepQuery);

        const goatQuery = `
          SELECT 
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Keçilerin çiğ sütü' 
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Keçilerin çiğ sütü')) as world_rank,
            (SELECT COUNT(*) + 1 FROM oner_dunya_hayvansal_uretim_miktarla 
             WHERE urun = 'Keçilerin çiğ sütü' 
             AND ulke IN (${euList}, 'Türkiye')
             AND uretim_miktari_ton > (SELECT uretim_miktari_ton FROM oner_dunya_hayvansal_uretim_miktarla WHERE ulke = 'Türkiye' AND urun = 'Keçilerin çiğ sütü')) as eu_rank
        `;
        const goatRes = await fetchQuery(goatQuery);

        if (cattleRes.data && sheepRes.data && goatRes.data) {
          setWorldRankings({
            cattle: {
              world: Number(cattleRes.data[0]?.world_rank) || 0,
              eu: Number(cattleRes.data[0]?.eu_rank) || 0,
            },
            sheep: {
              world: Number(sheepRes.data[0]?.world_rank) || 0,
              eu: Number(sheepRes.data[0]?.eu_rank) || 0,
            },
            goat: {
              world: Number(goatRes.data[0]?.world_rank) || 0,
              eu: Number(goatRes.data[0]?.eu_rank) || 0,
            },
          });
        }
      } catch (err) {
        console.warn('Dünya sıralaması verileri yüklenemedi:', err);
      }

      // TÜİK Süt ve Süt Ürünleri
      try {
        const tuikSutQuery = `SELECT * FROM tuik_hayavancilik_sutvesuturunleri ORDER BY urun, yil`;
        const tuikSutRes = await fetchQuery(tuikSutQuery);
        if (tuikSutRes.data && tuikSutRes.data.length > 0) {
          const mapped: TuikSutUrunData[] = tuikSutRes.data.map((item: Record<string, string | number>) => ({
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
    if (tuikSelectedData.length === 0) return null;
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
