/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchQuery, TRADE_TABLES } from '../../services/api';

const MONTHS_TR: Record<string, string> = {
  '1': 'Oca', '2': 'Şub', '3': 'Mar', '4': 'Nis', '5': 'May', '6': 'Haz',
  '7': 'Tem', '8': 'Ağu', '9': 'Eyl', '10': 'Eki', '11': 'Kas', '12': 'Ara',
};

const COLORS_EXPORT = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#047857', '#065f46', '#064e3b', '#022c22'];
const COLORS_IMPORT = ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#b45309', '#92400e', '#78350f', '#451a03'];

export function useTradeOverviewData() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2024');
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
  const [fastestGrowing, setFastestGrowing] = useState<{name: string; growth: number} | null>(null);
  const [biggestImportIncrease, setBiggestImportIncrease] = useState<{name: string; growth: number} | null>(null);
  const [top5CountryShare, setTop5CountryShare] = useState(0);

  const loadYears = useCallback(async () => {
    const res = await fetchQuery(`SELECT DISTINCT yil FROM ${TRADE_TABLES.PLANT} ORDER BY yil DESC`);
    const years = (res.data || []).map((r: any) => String(r.yil)).filter(Boolean);
    setYearOptions(years);
    if (years.length && !years.includes(selectedYear)) setSelectedYear(years[0]);
  }, [selectedYear]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const yr = selectedYear;
      const prevYr = String(Number(yr) - 1);

      const [plantKpi, animalKpi, plantKpiPrev, animalKpiPrev] = await Promise.all([
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}'`),
        fetchQuery(`SELECT SUM(ihracat_deger) as exp, SUM(ithalat_deger) as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}'`),
      ]);

      const pe = Number(plantKpi.data?.[0]?.exp) || 0;
      const pi = Number(plantKpi.data?.[0]?.imp) || 0;
      const ae = Number(animalKpi.data?.[0]?.exp) || 0;
      const ai = Number(animalKpi.data?.[0]?.imp) || 0;
      setPlantExp(pe); setPlantImp(pi); setAnimalExp(ae); setAnimalImp(ai);
      setExpTotal(pe + ae); setImpTotal(pi + ai);

      const prevE = (Number(plantKpiPrev.data?.[0]?.exp) || 0) + (Number(animalKpiPrev.data?.[0]?.exp) || 0);
      const prevI = (Number(plantKpiPrev.data?.[0]?.imp) || 0) + (Number(animalKpiPrev.data?.[0]?.imp) || 0);
      setPrevYearExp(prevE); setPrevYearImp(prevI);

      const monthRes = await fetchQuery(`
        SELECT ay, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT ay, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ay, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
        ) t GROUP BY ay ORDER BY CAST(ay AS UNSIGNED)
      `);
      setMonthlyData((monthRes.data || []).map((r: any) => ({
        ay: MONTHS_TR[String(r.ay)] || String(r.ay),
        exp: Number(r.exp) || 0,
        imp: Number(r.imp) || 0,
      })));

      const yearRes = await fetchQuery(`
        SELECT yil, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT yil, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay'
          UNION ALL
          SELECT yil, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil'
        ) t GROUP BY yil ORDER BY yil
      `);
      setYearlyData((yearRes.data || []).map((r: any) => {
        const e = Number(r.exp) || 0;
        const i = Number(r.imp) || 0;
        return { yil: String(r.yil), exp: e, imp: i, denge: e - i };
      }));

      const expProdRes = await fetchQuery(`
        SELECT ana_urun, SUM(ihracat_deger) as val, kategori FROM (
          SELECT ana_urun, ihracat_deger, 'bitkisel' as kategori FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ana_urun, ihracat_deger, 'hayvansal' as kategori FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
        ) t GROUP BY ana_urun, kategori ORDER BY val DESC LIMIT 15
      `);
      setTopExpProducts((expProdRes.data || []).map((r: any) => ({
        name: String(r.ana_urun), value: Number(r.val) || 0, category: String(r.kategori),
      })));

      const impProdRes = await fetchQuery(`
        SELECT ana_urun, SUM(ithalat_deger) as val, kategori FROM (
          SELECT ana_urun, ithalat_deger, 'bitkisel' as kategori FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ana_urun, ithalat_deger, 'hayvansal' as kategori FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
        ) t GROUP BY ana_urun, kategori ORDER BY val DESC LIMIT 15
      `);
      setTopImpProducts((impProdRes.data || []).map((r: any) => ({
        name: String(r.ana_urun), value: Number(r.val) || 0, category: String(r.kategori),
      })));

      const countryRes = await fetchQuery(`
        SELECT ulke, SUM(exp) as exp, SUM(imp) as imp FROM (
          SELECT ulke, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
          UNION ALL
          SELECT ulke, ihracat_deger as exp, ithalat_deger as imp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
        ) t WHERE ulke != '' GROUP BY ulke ORDER BY exp DESC LIMIT 10
      `);
      setTopExpCountries((countryRes.data || []).map((r: any) => ({
        name: String(r.ulke), exp: Number(r.exp) || 0, imp: Number(r.imp) || 0,
      })));

      const growthRes = await fetchQuery(`
        SELECT a.ana_urun, a.val as curr, b.val as prev, 
          ((a.val - b.val) / NULLIF(b.val, 0) * 100) as growth
        FROM (
          SELECT ana_urun, SUM(ihracat_deger) as val FROM (
            SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
            UNION ALL SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) a
        JOIN (
          SELECT ana_urun, SUM(ihracat_deger) as val FROM (
            SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}'
            UNION ALL SELECT ana_urun, ihracat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) b ON a.ana_urun = b.ana_urun
        ORDER BY growth DESC LIMIT 1
      `);
      if (growthRes.data?.[0]) {
        setFastestGrowing({ name: String(growthRes.data[0].ana_urun), growth: Number(growthRes.data[0].growth) || 0 });
      }

      const impGrowthRes = await fetchQuery(`
        SELECT a.ana_urun, a.val as curr, b.val as prev, 
          ((a.val - b.val) / NULLIF(b.val, 0) * 100) as growth
        FROM (
          SELECT ana_urun, SUM(ithalat_deger) as val FROM (
            SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
            UNION ALL SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) a
        JOIN (
          SELECT ana_urun, SUM(ithalat_deger) as val FROM (
            SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${prevYr}'
            UNION ALL SELECT ana_urun, ithalat_deger FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='tüm' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${prevYr}'
          ) t GROUP BY ana_urun HAVING val > 10000000
        ) b ON a.ana_urun = b.ana_urun
        ORDER BY growth DESC LIMIT 1
      `);
      if (impGrowthRes.data?.[0]) {
        setBiggestImportIncrease({ name: String(impGrowthRes.data[0].ana_urun), growth: Number(impGrowthRes.data[0].growth) || 0 });
      }

      const concRes = await fetchQuery(`
        SELECT SUM(total_exp) as top5 FROM (
          SELECT SUM(exp) as total_exp FROM (
            SELECT ulke, ihracat_deger as exp FROM ${TRADE_TABLES.PLANT} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='ay' AND yil='${yr}'
            UNION ALL SELECT ulke, ihracat_deger as exp FROM ${TRADE_TABLES.ANIMAL} WHERE duzey_1='ülke' AND duzey_2='ürün' AND duzey_3='yil' AND yil='${yr}'
          ) t WHERE ulke != '' GROUP BY ulke ORDER BY total_exp DESC LIMIT 5
        ) top
      `);
      const top5Val = Number(concRes.data?.[0]?.top5) || 0;
      setTop5CountryShare(pe + ae > 0 ? (top5Val / (pe + ae)) * 100 : 0);

    } catch (e) {
      console.error('TradeOverview error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

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
    expTotal, impTotal, prevYearExp,
    plantExp,
    monthlyData, yearlyData,
    topExpProducts, topImpProducts, topExpCountries,
    fastestGrowing, biggestImportIncrease, top5CountryShare,
    balance, ratio, yoyExpGrowth, plantShare,
    treemapExpData, treemapImpData,
  };
}
