/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchAgg, latestYear, num, type Row } from '../../services/d1';

const R_BIT = 'tuik/ticaret-bitkisel';
const R_HAY = 'tuik/ticaret-hayvansal';

// Bitkisel tabloda ülke×ürün kırılımı AYLIK satırlarda, hayvansalda YILLIK
// satırlarda tutuluyor. Eski SQL de bu iki farklı düzeyi UNION ALL ile
// birleştiriyordu; buradaki filtreler birebir aynı.
const BIT_ULKE = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'ay' };
const HAY_ULKE = { duzey_1: 'ülke', duzey_2: 'ürün', duzey_3: 'yil' };
const HAY_TUM_YIL = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'yil' };
const HAY_TUM_AY = { duzey_1: 'tüm', duzey_2: 'ürün', duzey_3: 'ay' };

/**
 * İki tabloyu tek listede toplar (eski UNION ALL'ın karşılığı). Anahtar
 * sütununa göre gruplayıp ihracat/ithalat toplamlarını birleştirir.
 */
function birlestir(
  parcalar: { satirlar: Row[]; kategori: string }[],
  anahtar: string,
): { ad: string; exp: number; imp: number; kategori: string }[] {
  const harita = new Map<string, { ad: string; exp: number; imp: number; kategori: string }>();
  for (const { satirlar, kategori } of parcalar) {
    for (const r of satirlar) {
      const ad = String(r[anahtar] ?? '');
      const kayit = harita.get(ad) ?? { ad, exp: 0, imp: 0, kategori };
      kayit.exp += num(r.sum_ihracat_deger);
      kayit.imp += num(r.sum_ithalat_deger);
      harita.set(ad, kayit);
    }
  }
  return [...harita.values()];
}

const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

const COLORS_EXPORT = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#047857', '#065f46', '#064e3b', '#022c22'];
const COLORS_IMPORT = ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#b45309', '#92400e', '#78350f', '#451a03'];

export type TradeGroupFilter = 'all' | 'bitkisel' | 'hayvansal';

export function useTradeOverviewData() {
  const [loading, setLoading] = useState(true);
  // Başlangıç yılı kodda '2025' diye sabitti. Artık son TAM yıl veriden
  // seçiliyor: içinde bulunulan yıl (ör. 2026) henüz yarım olduğu için
  // minShare 0.9 ile eleniyor, yıllık kıyaslar yanıltıcı olmuyor.
  const [selectedYear, setSelectedYear] = useState('');
  const [productGroupFilter, setProductGroupFilter] = useState<TradeGroupFilter>('all');
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [expTotal, setExpTotal] = useState(0);
  const [impTotal, setImpTotal] = useState(0);
  const [plantExp, setPlantExp] = useState(0);
  const [, setPlantImp] = useState(0);
  const [, setAnimalExp] = useState(0);
  const [, setAnimalImp] = useState(0);
  const [prevYearExp, setPrevYearExp] = useState(0);
  const [, setPrevYearImp] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ay: string; exp: number; imp: number}[]>([]);
  const [yearlyData, setYearlyData] = useState<{yil: string; exp: number; imp: number; denge: number}[]>([]);
  const [topExpProducts, setTopExpProducts] = useState<{name: string; value: number; category: string}[]>([]);
  const [topImpProducts, setTopImpProducts] = useState<{name: string; value: number; category: string}[]>([]);
  const [topExpCountries, setTopExpCountries] = useState<{name: string; exp: number; imp: number}[]>([]);
  const [topImpCountries, setTopImpCountries] = useState<{name: string; exp: number; imp: number}[]>([]);
  const [fastestGrowing, setFastestGrowing] = useState<{name: string; growth: number} | null>(null);
  const [biggestImportIncrease, setBiggestImportIncrease] = useState<{name: string; growth: number} | null>(null);
  const [top5CountryShare, setTop5CountryShare] = useState(0);

  const loadYears = useCallback(async () => {
    const [rows, tamYil] = await Promise.all([
      fetchAgg(R_BIT, { groupBy: ['yil'], orderBy: 'yil', dir: 'desc' }),
      latestYear(R_BIT, 'yil', { minShare: 0.9 }),
    ]);
    const years = rows.map((r) => String(r.yil)).filter(Boolean);
    setYearOptions(years);
    setSelectedYear((mevcut) => {
      if (mevcut && years.includes(mevcut)) return mevcut;
      return tamYil ? String(tamYil) : (years[0] ?? '');
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const yr = selectedYear;
      const prevYr = String(Number(yr) - 1);
      const bitkiselAcik = productGroupFilter !== 'hayvansal';
      const hayvansalAcik = productGroupFilter !== 'bitkisel';

      // Seçili gruba göre ülke×ürün kırılımını iki tablodan toplayan yardımcı.
      const kirilim = async (anahtar: 'ana_urun' | 'ulke', yil: string) => {
        const parcalar: { satirlar: Row[]; kategori: string }[] = [];
        if (bitkiselAcik) {
          parcalar.push({ kategori: 'bitkisel', satirlar: await fetchAgg(R_BIT, {
            groupBy: [anahtar], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE, yil },
          }) });
        }
        if (hayvansalAcik) {
          parcalar.push({ kategori: 'hayvansal', satirlar: await fetchAgg(R_HAY, {
            groupBy: [anahtar], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_ULKE, yil },
          }) });
        }
        return birlestir(parcalar, anahtar);
      };

      const [plantKpi, animalKpi, plantKpiPrev, animalKpiPrev] = await Promise.all([
        fetchAgg(R_BIT, { sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE, yil: yr } }),
        fetchAgg(R_HAY, { sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_TUM_YIL, yil: yr } }),
        fetchAgg(R_BIT, { sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE, yil: prevYr } }),
        fetchAgg(R_HAY, { sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_TUM_YIL, yil: prevYr } }),
      ]);

      const pe = num(plantKpi[0]?.sum_ihracat_deger);
      const pi = num(plantKpi[0]?.sum_ithalat_deger);
      const ae = num(animalKpi[0]?.sum_ihracat_deger);
      const ai = num(animalKpi[0]?.sum_ithalat_deger);
      setPlantExp(pe); setPlantImp(pi); setAnimalExp(ae); setAnimalImp(ai);
      setExpTotal(pe + ae); setImpTotal(pi + ai);

      const prevE = num(plantKpiPrev[0]?.sum_ihracat_deger) + num(animalKpiPrev[0]?.sum_ihracat_deger);
      const prevI = num(plantKpiPrev[0]?.sum_ithalat_deger) + num(animalKpiPrev[0]?.sum_ithalat_deger);
      setPrevYearExp(prevE); setPrevYearImp(prevI);

      // Aylık seri: bitkisel ülke-ay + hayvansal tüm-ay (eski UNION ALL).
      const [bitAy, hayAy] = await Promise.all([
        fetchAgg(R_BIT, { groupBy: ['ay'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE, yil: yr } }),
        fetchAgg(R_HAY, { groupBy: ['ay'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_TUM_AY, yil: yr } }),
      ]);
      setMonthlyData(
        birlestir([{ satirlar: bitAy, kategori: 'bitkisel' }, { satirlar: hayAy, kategori: 'hayvansal' }], 'ay')
          .sort((a, b) => Number(a.ad) - Number(b.ad))
          .map((r) => ({ ay: MONTHS_TR[r.ad] || r.ad, exp: r.exp, imp: r.imp })),
      );

      const [bitYil, hayYil] = await Promise.all([
        fetchAgg(R_BIT, { groupBy: ['yil'], sum: ['ihracat_deger', 'ithalat_deger'], where: BIT_ULKE }),
        fetchAgg(R_HAY, { groupBy: ['yil'], sum: ['ihracat_deger', 'ithalat_deger'], where: HAY_TUM_YIL }),
      ]);
      setYearlyData(
        birlestir([{ satirlar: bitYil, kategori: 'bitkisel' }, { satirlar: hayYil, kategori: 'hayvansal' }], 'yil')
          .sort((a, b) => Number(a.ad) - Number(b.ad))
          .map((r) => ({ yil: r.ad, exp: r.exp, imp: r.imp, denge: r.exp - r.imp })),
      );

      const urunler = await kirilim('ana_urun', yr);
      setTopExpProducts([...urunler].sort((a, b) => b.exp - a.exp).slice(0, 15)
        .map((r) => ({ name: r.ad, value: r.exp, category: r.kategori })));
      setTopImpProducts([...urunler].sort((a, b) => b.imp - a.imp).slice(0, 15)
        .map((r) => ({ name: r.ad, value: r.imp, category: r.kategori })));

      const ulkeler = (await kirilim('ulke', yr)).filter((r) => r.ad !== '');
      setTopExpCountries([...ulkeler].sort((a, b) => b.exp - a.exp).slice(0, 10)
        .map((r) => ({ name: r.ad, exp: r.exp, imp: r.imp })));
      setTopImpCountries([...ulkeler].sort((a, b) => b.imp - a.imp).slice(0, 10)
        .map((r) => ({ name: r.ad, exp: r.exp, imp: r.imp })));

      // Eskiden iki alt sorgunun JOIN'i + HAVING val > 10.000.000 ile bulunuyordu.
      // Aynı eşik ve aynı "iki yılda da var olma" koşulu istemcide uygulanıyor.
      const ESIK = 10_000_000;
      const [urunBu, urunOnceki] = await Promise.all([
        (async () => birlestir([
          { kategori: 'bitkisel', satirlar: await fetchAgg(R_BIT, { groupBy: ['ana_urun'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE, yil: yr } }) },
          { kategori: 'hayvansal', satirlar: await fetchAgg(R_HAY, { groupBy: ['ana_urun'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_TUM_YIL, yil: yr } }) },
        ], 'ana_urun'))(),
        (async () => birlestir([
          { kategori: 'bitkisel', satirlar: await fetchAgg(R_BIT, { groupBy: ['ana_urun'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE, yil: prevYr } }) },
          { kategori: 'hayvansal', satirlar: await fetchAgg(R_HAY, { groupBy: ['ana_urun'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_TUM_YIL, yil: prevYr } }) },
        ], 'ana_urun'))(),
      ]);
      const oncekiHarita = new Map(urunOnceki.map((r) => [r.ad, r]));
      const buyume = (alan: 'exp' | 'imp') => urunBu
        .filter((r) => r[alan] > ESIK)
        .map((r) => {
          const onceki = oncekiHarita.get(r.ad);
          if (!onceki || onceki[alan] <= ESIK) return null;
          return { name: r.ad, growth: ((r[alan] - onceki[alan]) / onceki[alan]) * 100 };
        })
        .filter((x): x is { name: string; growth: number } => x !== null)
        .sort((a, b) => b.growth - a.growth)[0] ?? null;
      setFastestGrowing(buyume('exp'));
      setBiggestImportIncrease(buyume('imp'));

      // İlk 5 ülkenin ihracat payı — hayvansalda ülke kırılımı YILLIK satırlarda.
      const [bitUlke, hayUlke] = await Promise.all([
        fetchAgg(R_BIT, { groupBy: ['ulke'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...BIT_ULKE, yil: yr } }),
        fetchAgg(R_HAY, { groupBy: ['ulke'], sum: ['ihracat_deger', 'ithalat_deger'], where: { ...HAY_ULKE, yil: yr } }),
      ]);
      const top5Val = birlestir([{ satirlar: bitUlke, kategori: 'bitkisel' }, { satirlar: hayUlke, kategori: 'hayvansal' }], 'ulke')
        .filter((r) => r.ad !== '')
        .sort((a, b) => b.exp - a.exp)
        .slice(0, 5)
        .reduce((acc, r) => acc + r.exp, 0);
      setTop5CountryShare(pe + ae > 0 ? (top5Val / (pe + ae)) * 100 : 0);

    } catch (e) {
      console.error('TradeOverview error:', e);
    } finally {
      setLoading(false);
    }
  }, [productGroupFilter, selectedYear]);

  useEffect(() => { loadYears(); }, [loadYears]);
  useEffect(() => { loadData(); }, [loadData]);

  const balance = expTotal - impTotal;
  const ratio = impTotal > 0 ? expTotal / impTotal : 0;
  const yoyExpGrowth = prevYearExp > 0 ? ((expTotal - prevYearExp) / prevYearExp * 100) : 0;
  const plantShare = expTotal > 0 ? ((plantExp / expTotal) * 100) : 0;

  const treemapExpData = useMemo(() => topExpProducts.filter(p => p.value > 0).map((p, i) => ({
    name: p.name,
    size: p.value,
    value: p.value,
    fill: p.category === 'bitkisel' ? COLORS_EXPORT[i % COLORS_EXPORT.length] : ['#ef4444', '#dc2626', '#f87171', '#fca5a5', '#fee2e2', '#b91c1c', '#991b1b'][i % 7],
  })), [topExpProducts]);

  const treemapImpData = useMemo(() => topImpProducts.filter(p => p.value > 0).map((p, i) => ({
    name: p.name,
    size: p.value,
    value: p.value,
    fill: p.category === 'bitkisel' ? COLORS_IMPORT[i % COLORS_IMPORT.length] : ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#6d28d9', '#5b21b6'][i % 7],
  })), [topImpProducts]);

  return {
    loading,
    selectedYear, setSelectedYear, yearOptions,
    productGroupFilter, setProductGroupFilter,
    expTotal, impTotal, prevYearExp,
    plantExp,
    monthlyData, yearlyData,
    topExpProducts, topImpProducts, topExpCountries, topImpCountries,
    fastestGrowing, biggestImportIncrease, top5CountryShare,
    balance, ratio, yoyExpGrowth, plantShare,
    treemapExpData, treemapImpData,
  };
}
