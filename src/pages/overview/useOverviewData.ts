import { useState, useEffect, useCallback } from 'react';
import { fetchQuery } from '../../services/api';
import {
  COLORS,
  translateMilkItem, translateMeatItem, translateEggItem,
} from './overviewTypes';
import type { OverviewData, DataItem, YearlyData } from './overviewTypes';

export interface UseOverviewDataReturn {
  data: OverviewData | null;
  loading: boolean;
}

export function useOverviewData(): UseOverviewDataReturn {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        populationRes, gdpRes, gdpPerCapitaRes, landRes,
        milkTotalRes, milkBreakdownRes, milkYearlyRes,
        redMeatBreakdownRes, whiteMeatBreakdownRes, meatYearlyRes,
        eggTotalRes, eggBreakdownRes, eggYearlyRes,
        agriGdpRes, agriGdpShareRes, agriEmpRes, agriEmpShareRes,
        livestockStocksRes, regionalCattleRes, regionalSheepRes, regionalGoatRes, regionalPoultryRes,
      ] = await Promise.all([
        fetchQuery(`SELECT total_v, kirsal_v, sehir_v FROM fao_nufus WHERE year=2023 AND area='Türkiye' LIMIT 1`),
        fetchQuery(`SELECT value FROM fao_ME_indicator WHERE year='2023' AND area='Türkiye' AND item='Gross Domestic Product' AND elementcode=6110 AND unit='million USD' LIMIT 1`),
        fetchQuery(`SELECT value FROM fao_ME_indicator WHERE year='2023' AND area='Türkiye' AND item='Gross Domestic Product' AND elementcode=6119 AND unit='USD' LIMIT 1`),
        fetchQuery(`SELECT item_tr, value FROM fao_land_use WHERE year=2022 AND area='Türkiye'`),
        fetchQuery(`SELECT SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%milk%'`),
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%milk%' GROUP BY item ORDER BY total DESC`),
        fetchQuery(`SELECT year, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%milk%' AND year >= 2010 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item IN ('Meat of cattle with the bone, fresh or chilled', 'Meat of sheep, fresh or chilled', 'Meat of goat, fresh or chilled', 'Meat of buffalo, fresh or chilled') GROUP BY item`),
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='t' AND item IN ('Meat of chickens, fresh or chilled', 'Meat of turkeys, fresh or chilled') GROUP BY item`),
        fetchQuery(`SELECT year, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary WHERE area='Türkiye' AND element='Production' AND unit='t' AND item LIKE '%meat%' AND year >= 2010 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT SUM(REPLACE(value,',','.') * 1000) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='1000 No' AND item LIKE '%egg%'`),
        fetchQuery(`SELECT item, SUM(REPLACE(value,',','.') * 1000) as total FROM fao_livestock_primary WHERE year=2023 AND area='Türkiye' AND element='Production' AND unit='1000 No' AND item LIKE '%egg%' GROUP BY item`),
        fetchQuery(`SELECT year, SUM(REPLACE(value,',','.') * 1000) as total FROM fao_livestock_primary WHERE area='Türkiye' AND element='Production' AND unit='1000 No' AND item LIKE '%egg%' AND year >= 2010 GROUP BY year ORDER BY year`),
        fetchQuery(`SELECT value FROM fao_ME_indicator WHERE year='2023' AND area='Türkiye' AND item='Value Added (Agriculture, Forestry and Fishing)' AND elementcode=6110 AND unit='million USD' LIMIT 1`),
        fetchQuery(`SELECT value FROM fao_ME_indicator WHERE year='2023' AND area='Türkiye' AND item='Value Added (Agriculture, Forestry and Fishing)' AND elementcode=6103 AND unit='%' LIMIT 1`),
        fetchQuery(`SELECT total as value FROM fao_nufus_istihdam_tarim WHERE area='Türkiye' AND yearcode='2023' AND indicator='Employment in agriculture by age, total (15+)' LIMIT 1`),
        fetchQuery(`SELECT total as value FROM fao_nufus_istihdam_tarim WHERE area='Türkiye' AND yearcode='2023' AND indicator='Share of employment in agriculture in total employment' LIMIT 1`),
        fetchQuery(`SELECT grup, SUM(COALESCE(y2024,0)) as total FROM tuik_hayvancilik_canlihayvan WHERE duzey='ülke' AND yer='TÜRKİYE' AND grup IN ('Sığır','Koyun','Keçi','Tavuk','Hindi') GROUP BY grup`),
        fetchQuery(`SELECT yer, SUM(COALESCE(y2024,0)) as total FROM tuik_hayvancilik_canlihayvan WHERE duzey IN ('bölge','bolge') AND grup='Sığır' GROUP BY yer ORDER BY total DESC LIMIT 12`),
        fetchQuery(`SELECT yer, SUM(COALESCE(y2024,0)) as total FROM tuik_hayvancilik_canlihayvan WHERE duzey IN ('bölge','bolge') AND grup='Koyun' GROUP BY yer ORDER BY total DESC LIMIT 12`),
        fetchQuery(`SELECT yer, SUM(COALESCE(y2024,0)) as total FROM tuik_hayvancilik_canlihayvan WHERE duzey IN ('bölge','bolge') AND grup='Keçi' GROUP BY yer ORDER BY total DESC LIMIT 12`),
        fetchQuery(`SELECT yer, SUM(CASE WHEN grup='Tavuk' THEN COALESCE(y2024,0) WHEN grup='Hindi' THEN COALESCE(y2024,0) ELSE 0 END) as total FROM tuik_hayvancilik_canlihayvan WHERE duzey IN ('bölge','bolge') AND grup IN ('Tavuk','Hindi') GROUP BY yer ORDER BY total DESC LIMIT 12`),
      ]);

      // Nüfus
      const popData = populationRes.data?.[0];
      const population = Number(popData?.total_v) * 1000 || 0;
      const ruralPopulation = Number(popData?.kirsal_v) * 1000 || 0;
      const urbanPopulation = Number(popData?.sehir_v) * 1000 || 0;

      // GSYİH
      const gdp = (Number(gdpRes.data?.[0]?.value) || 0) * 1e6;
      const gdpPerCapita = Number(gdpPerCapitaRes.data?.[0]?.value) || 0;

      // Tarımsal katma değer
      const agriculturalGDP = (Number(agriGdpRes.data?.[0]?.value) || 0) * 1e6;
      const agriculturalGDPShare = Number(agriGdpShareRes.data?.[0]?.value) || 0;

      // Tarım istihdamı
      const agriculturalEmployment = (Number(agriEmpRes.data?.[0]?.value) || 0) * 1000;
      const agriculturalEmploymentShare = Number(agriEmpShareRes.data?.[0]?.value) || 0;
      const totalEmployment = agriculturalEmploymentShare > 0
        ? agriculturalEmployment / (agriculturalEmploymentShare / 100)
        : 0;

      // Arazi
      const landMap: Record<string, number> = {};
      landRes.data?.forEach(item => {
        landMap[String(item.item_tr)] = Number(item.value) * 1000 || 0;
      });
      const agriculturalLand = landMap['Tarım'] || 0;
      const totalLand = landMap['Kara alanı'] || landMap['Ülke yüzölçümü'] || 0;
      const forestLand = landMap['Orman arazisi'] || 0;
      const otherLand = totalLand - agriculturalLand - forestLand;
      const landUseData: DataItem[] = [
        { name: 'Tarım Arazisi', value: agriculturalLand, fill: COLORS.land[0] },
        { name: 'Orman', value: forestLand, fill: COLORS.land[1] },
        { name: 'Diğer (Yerleşim, Çorak)', value: otherLand > 0 ? otherLand : 0, fill: COLORS.general[2] },
      ].filter(item => item.value > 0);

      // Süt üretimi
      const milkTotal = Number(milkTotalRes.data?.[0]?.total) || 0;
      const milkBreakdown: DataItem[] = (milkBreakdownRes.data || []).map((item, idx) => ({
        name: translateMilkItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.milk[idx % COLORS.milk.length],
        unit: 'ton',
      }));
      const milkYearly: YearlyData[] = (milkYearlyRes.data || []).map(item => ({
        year: String(item.year),
        milk: Number(item.total) || 0,
      }));

      // Et üretimi
      const redMeatBreakdown: DataItem[] = (redMeatBreakdownRes.data || []).map((item, idx) => ({
        name: translateMeatItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.meat[idx % COLORS.meat.length],
        unit: 'ton',
      }));
      const whiteMeatBreakdown: DataItem[] = (whiteMeatBreakdownRes.data || []).map((item, idx) => ({
        name: translateMeatItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.meat[(idx + 2) % COLORS.meat.length],
        unit: 'ton',
      }));
      const cattle = redMeatBreakdown.find(m => m.name.includes('Sığır'))?.value || 0;
      const sheep = redMeatBreakdown.find(m => m.name.includes('Koyun'))?.value || 0;
      const goat = redMeatBreakdown.find(m => m.name.includes('Keçi'))?.value || 0;
      const buffalo = redMeatBreakdown.find(m => m.name.includes('Manda'))?.value || 0;
      const chicken = whiteMeatBreakdown.find(m => m.name.includes('Piliç'))?.value || 0;
      const turkey = whiteMeatBreakdown.find(m => m.name.includes('Hindi'))?.value || 0;
      const redMeat = cattle + sheep + goat + buffalo;
      const whiteMeat = chicken + turkey;
      const meatTotal = redMeat + whiteMeat;
      const meatBreakdown: DataItem[] = [...redMeatBreakdown, ...whiteMeatBreakdown];
      const meatYearly: YearlyData[] = (meatYearlyRes.data || []).map(item => ({
        year: String(item.year),
        meat: Number(item.total) || 0,
      }));

      // Yumurta
      const eggTotal = Number(eggTotalRes.data?.[0]?.total) || 0;
      const eggBreakdown: DataItem[] = (eggBreakdownRes.data || []).map((item, idx) => ({
        name: translateEggItem(String(item.item)),
        value: Number(item.total) || 0,
        fill: COLORS.egg[idx % COLORS.egg.length],
        unit: 'adet',
      }));
      const eggYearly: YearlyData[] = (eggYearlyRes.data || []).map(item => ({
        year: String(item.year),
        egg: Number(item.total) || 0,
      }));

      // Hayvan varlığı
      const livestockStocksBreakdown: DataItem[] = (livestockStocksRes.data || []).map((row, idx) => ({
        name: String((row as Record<string, unknown>).grup ?? ''),
        value: Number((row as Record<string, unknown>).total) || 0,
        fill: COLORS.general[idx % COLORS.general.length],
        unit: 'baş',
      }));
      const livestockCattle = livestockStocksBreakdown.find(l => l.name.includes('Sığır'))?.value || 0;
      const livestockSheep = livestockStocksBreakdown.find(l => l.name.includes('Koyun'))?.value || 0;
      const livestockGoat = livestockStocksBreakdown.find(l => l.name.includes('Keçi'))?.value || 0;
      const livestockPoultry = (livestockStocksBreakdown.find(l => l.name.includes('Tavuk'))?.value || 0)
        + (livestockStocksBreakdown.find(l => l.name.includes('Hindi'))?.value || 0);

      const mapRegional = (res: { data?: Record<string, string | number>[] }, palette: string[]): DataItem[] =>
        (res?.data || []).map((row, idx) => ({
          name: String(row.yer || ''),
          value: Number(row.total) || 0,
          fill: palette[idx % palette.length],
          unit: 'baş',
        }));

      setData({
        population, ruralPopulation, urbanPopulation,
        gdp, gdpPerCapita, agriculturalGDP, agriculturalGDPShare,
        agriculturalEmployment, agriculturalEmploymentShare, totalEmployment,
        agriculturalLand, totalLand, landUseData,
        milkProduction: {
          total: milkTotal,
          cattle: milkBreakdown.find(m => m.name.includes('İnek'))?.value || 0,
          sheep: milkBreakdown.find(m => m.name.includes('Koyun'))?.value || 0,
          goat: milkBreakdown.find(m => m.name.includes('Keçi'))?.value || 0,
          buffalo: milkBreakdown.find(m => m.name.includes('Manda'))?.value || 0,
          breakdown: milkBreakdown, yearly: milkYearly,
        },
        meatProduction: {
          total: meatTotal, redMeat, whiteMeat,
          cattle, sheep, goat, buffalo, chicken, turkey,
          breakdown: meatBreakdown, yearly: meatYearly,
        },
        eggProduction: {
          total: eggTotal,
          chicken: eggBreakdown[0]?.value || 0,
          other: eggBreakdown[1]?.value || 0,
          breakdown: eggBreakdown, yearly: eggYearly,
        },
        livestockStocks: {
          cattle: livestockCattle, sheep: livestockSheep,
          goat: livestockGoat, poultry: livestockPoultry,
          breakdown: livestockStocksBreakdown,
          regional: {
            cattle: mapRegional(regionalCattleRes, COLORS.milk),
            sheep: mapRegional(regionalSheepRes, COLORS.grain),
            goat: mapRegional(regionalGoatRes, COLORS.fruit),
            poultry: mapRegional(regionalPoultryRes, COLORS.egg),
          },
        },
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading };
}
