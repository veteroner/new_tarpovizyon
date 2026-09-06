import { useState, useEffect, useCallback } from 'react';
import { fetchAgg, fetchRows, latestYear, num, type Row } from '../../services/d1';
import {
  COLORS,
  translateMilkItem, translateMeatItem, translateEggItem,
} from './overviewTypes';
import type { OverviewData, DataItem, YearlyData } from './overviewTypes';

// D1 toplama rotaları. fao_livestock_primary'de `value` METİN ve ondalık
// ayırıcısı VİRGÜL ('2173,8'); uç bu sütunu commaDecimal olarak biliyor ve
// eski REPLACE(value,',','.')*1 ile aynı sonucu üretiyor.
const R_LIVESTOCK = 'fao/livestock-primary';
const R_ME = 'fao/me-indicator';
const R_LAND = 'fao/land-use';
const R_NUFUS = 'fao/nufus';
const R_ISTIHDAM = 'fao/nufus-istihdam-tarim';
/* Dünya Bankası makro — FAO'nun bitmediği yıllar için. */
const R_DB_MAKRO = 'dunya-bankasi/makro';
import { HAYVAN_ULKE_YIL, HAYVAN_BOLGE_YIL, yilSutunu } from '../../utils/hayvanYili';

/*
 * İki farklı yıl, çünkü iki seviyede iki farklı tazelik var: ülke satırı
 * 2025'e kadar dolu, bölge satırlarında 2025 hiç yok. Her grafik kendi yılını
 * başlığında yazıyor (bkz. utils/hayvanYili.ts).
 */
const ULKE_SUTUN = yilSutunu(HAYVAN_ULKE_YIL);
const BOLGE_SUTUN = yilSutunu(HAYVAN_BOLGE_YIL);

const R_CANLI = 'tuik/hayvancilik-canlihayvan';
const TR = 'Türkiye';
const KIRMIZI_ET = [
  'Meat of cattle with the bone, fresh or chilled', 'Meat of sheep, fresh or chilled',
  'Meat of goat, fresh or chilled', 'Meat of buffalo, fresh or chilled',
];
const KANATLI_ET = ['Meat of chickens, fresh or chilled', 'Meat of turkeys, fresh or chilled'];

// FAO makroekonomik gösterge kodları — orijinal kodlar DOĞRU; sorunlu olan
// sabit yıldı. 2023 satırlarında bu kodlar yok, 2024'te var; sayfa 2023'e
// sabitlendiği için 4 KPI "—" görünüyordu. Artık yıl latestYear ile dinamik.
//
// DİKKAT: fao_ME_indicator'ın 2024 satırları veri setinde ÇİFT (aynı değer iki
// kez, cnt=2). SUM iki katına çıkarıyor, bu yüzden tekil gösterge okumalarında
// `max` kullanılıyor. Tutarlılık: 74.003,70 / 1.323.254,72 = %5,593 = kod 6103.
const EC_TOPLAM_USD = 6110;   // toplam değer (million USD)
const EC_KISI_BASI = 6119;    // kişi başı (USD)
const EC_PAY_GSYH = 6103;     // GSYH içindeki pay (%)

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
      // Yıllar artık sabit değil: her tablonun en güncel DOLU yılı seçiliyor
      // (kısmi girilmiş yıllara atlamamak için latestYear doluluk bakıyor).
      const [meYil, araziYil, hayvanYil, nufusYil, istihdamYil] = await Promise.all([
        latestYear(R_ME, 'year'),
        latestYear(R_LAND, 'year'),
        latestYear(R_LIVESTOCK, 'year'),
        latestYear(R_NUFUS, 'year'),
        latestYear(R_ISTIHDAM, 'yearcode'),
      ]);
      const [
        populationRes, gdpRes, gdpPerCapitaRes, landRes,
        milkTotalRes, milkBreakdownRes, milkYearlyRes,
        redMeatBreakdownRes, whiteMeatBreakdownRes, meatYearlyRes,
        eggTotalRes, eggBreakdownRes, eggYearlyRes,
        agriGdpRes, agriGdpShareRes, agriEmpRes, agriEmpShareRes,
        livestockStocksRes, regionalCattleRes, regionalSheepRes, regionalGoatRes, regionalPoultryRes,
        dbMakro,
      ] = await Promise.all([
        fetchAgg(R_NUFUS, { max: ['TOPLAM', 'kirsal', 'sehir'], where: { year: nufusYil, area: TR } }),
        fetchAgg(R_ME, { max: ['value'], where: { year: meYil, area: TR, item: 'Gross Domestic Product', elementcode: EC_TOPLAM_USD, unit: 'million USD' } }),
        fetchAgg(R_ME, { max: ['value'], where: { year: meYil, area: TR, item: 'Gross Domestic Product', elementcode: EC_KISI_BASI, unit: 'USD' } }),
        fetchAgg(R_LAND, { groupBy: ['item_tr'], sum: ['value'], where: { year: araziYil, area: TR } }),
        fetchAgg(R_LIVESTOCK, { sum: ['value'], where: { year: hayvanYil, area: TR, element: 'Production', unit: 't' }, like: { item: '%milk%' } }),
        fetchAgg(R_LIVESTOCK, { groupBy: ['item'], sum: ['value'], where: { year: hayvanYil, area: TR, element: 'Production', unit: 't' }, like: { item: '%milk%' }, orderBy: 'sum_value', dir: 'desc' }),
        fetchAgg(R_LIVESTOCK, { groupBy: ['year'], sum: ['value'], where: { area: TR, element: 'Production', unit: 't' }, like: { item: '%milk%' }, whereGte: { year: 2010 }, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_LIVESTOCK, { groupBy: ['item'], sum: ['value'], where: { year: hayvanYil, area: TR, element: 'Production', unit: 't' }, whereIn: { item: KIRMIZI_ET } }),
        fetchAgg(R_LIVESTOCK, { groupBy: ['item'], sum: ['value'], where: { year: hayvanYil, area: TR, element: 'Production', unit: 't' }, whereIn: { item: KANATLI_ET } }),
        fetchAgg(R_LIVESTOCK, { groupBy: ['year'], sum: ['value'], where: { area: TR, element: 'Production', unit: 't' }, like: { item: '%meat%' }, whereGte: { year: 2010 }, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_LIVESTOCK, { sum: ['value'], where: { year: hayvanYil, area: TR, element: 'Production', unit: '1000 No' }, like: { item: '%egg%' } }),
        fetchAgg(R_LIVESTOCK, { groupBy: ['item'], sum: ['value'], where: { year: hayvanYil, area: TR, element: 'Production', unit: '1000 No' }, like: { item: '%egg%' } }),
        fetchAgg(R_LIVESTOCK, { groupBy: ['year'], sum: ['value'], where: { area: TR, element: 'Production', unit: '1000 No' }, like: { item: '%egg%' }, whereGte: { year: 2010 }, orderBy: 'year', dir: 'asc' }),
        fetchAgg(R_ME, { max: ['value'], where: { year: meYil, area: TR, item: 'Value Added (Agriculture, Forestry and Fishing)', elementcode: EC_TOPLAM_USD, unit: 'million USD' } }),
        fetchAgg(R_ME, { max: ['value'], where: { year: meYil, area: TR, item: 'Value Added (Agriculture, Forestry and Fishing)', elementcode: EC_PAY_GSYH, unit: '%' } }),
        fetchAgg(R_ISTIHDAM, { sum: ['total'], where: { area: TR, yearcode: istihdamYil, indicator: 'Employment in agriculture by age, total (15+)' } }),
        fetchAgg(R_ISTIHDAM, { sum: ['total'], where: { area: TR, yearcode: istihdamYil, indicator: 'Share of employment in agriculture in total employment' } }),
        fetchAgg(R_CANLI, { groupBy: ['grup'], sum: [ULKE_SUTUN], where: { duzey: 'ülke', yer: 'TÜRKİYE' }, whereIn: { grup: ['Sığır', 'Koyun', 'Keçi', 'Tavuk', 'Hindi'] } }),
        fetchAgg(R_CANLI, { groupBy: ['yer'], sum: [BOLGE_SUTUN], where: { grup: 'Sığır' }, whereIn: { duzey: ['bölge', 'bolge'] }, orderBy: `sum_${BOLGE_SUTUN}`, dir: 'desc', limit: 12 }),
        fetchAgg(R_CANLI, { groupBy: ['yer'], sum: [BOLGE_SUTUN], where: { grup: 'Koyun' }, whereIn: { duzey: ['bölge', 'bolge'] }, orderBy: `sum_${BOLGE_SUTUN}`, dir: 'desc', limit: 12 }),
        fetchAgg(R_CANLI, { groupBy: ['yer'], sum: [BOLGE_SUTUN], where: { grup: 'Keçi' }, whereIn: { duzey: ['bölge', 'bolge'] }, orderBy: `sum_${BOLGE_SUTUN}`, dir: 'desc', limit: 12 }),
        fetchAgg(R_CANLI, { groupBy: ['yer'], sum: [BOLGE_SUTUN], whereIn: { duzey: ['bölge', 'bolge'], grup: ['Tavuk', 'Hindi'] }, orderBy: `sum_${BOLGE_SUTUN}`, dir: 'desc', limit: 12 }),
        /* Dünya Bankası makro — FAO'dan daha yeni yıl varsa kullanılıyor. */
        fetchRows(R_DB_MAKRO, { limit: 1000 }),
      ]);

      // Nüfus
      const popData = populationRes[0];
      const population = num(popData?.max_TOPLAM) * 1000;
      const ruralPopulation = num(popData?.max_kirsal) * 1000;
      const urbanPopulation = num(popData?.max_sehir) * 1000;

      /*
       * ─── MAKRO: DÜNYA BANKASI DAHA YENİYSE O ─────────────────────────────
       *
       * FAO'nun ME serisi Türkiye için 2024'te bitiyor; Dünya Bankası 2025'i
       * yayımlıyor. Sayfa bu yüzden bir yıl geride kalıyordu.
       *
       * Kaynaklar KARIŞTIRILMIYOR, SEÇİLİYOR: hangi kurum daha yeni yılı
       * veriyorsa dört ölçünün DÖRDÜ DE ondan alınıyor ve `macroKaynak`
       * sayfada yazılıyor. Yarısını birinden yarısını diğerinden almak
       * tutarsız bir tablo üretirdi — iki kurumun 2024 GSYİH'si arasında
       * zaten %3 fark var (farklı revizyon takvimleri).
       */
      const dbSonYil = Math.max(0, ...dbMakro.map((r: Row) => Number(r.yil) || 0));
      const dbKullan = dbSonYil > (meYil ?? 0);
      const dbDeger = (ad: string) =>
        num(dbMakro.find((r: Row) => r.gosterge === ad && Number(r.yil) === dbSonYil)?.deger);

      const gdp = dbKullan ? dbDeger('gsyh_usd') : (num(gdpRes[0]?.max_value)) * 1e6;
      const gdpPerCapita = dbKullan
        ? dbDeger('gsyh_kisi_basi_usd') : num(gdpPerCapitaRes[0]?.max_value);
      const agriculturalGDP = dbKullan
        ? dbDeger('tarimsal_katma_deger_usd') : (num(agriGdpRes[0]?.max_value)) * 1e6;
      const agriculturalGDPShare = dbKullan
        ? dbDeger('tarim_gsyh_payi') : num(agriGdpShareRes[0]?.max_value);
      const macroKaynak = dbKullan ? 'Dünya Bankası' : 'FAO';
      const macroYil = dbKullan ? dbSonYil : meYil;

      // Tarım istihdamı
      const agriculturalEmployment = (num(agriEmpRes[0]?.sum_total)) * 1000;
      const agriculturalEmploymentShare = num(agriEmpShareRes[0]?.sum_total);
      const totalEmployment = agriculturalEmploymentShare > 0
        ? agriculturalEmployment / (agriculturalEmploymentShare / 100)
        : 0;

      // Arazi
      const landMap: Record<string, number> = {};
      landRes.forEach((item) => {
        landMap[String(item.item_tr)] = num(item.sum_value) * 1000;
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
      const milkTotal = num(milkTotalRes[0]?.sum_value);
      const milkBreakdown: DataItem[] = milkBreakdownRes.map((item, idx) => ({
        name: translateMilkItem(String(item.item)),
        value: num(item.sum_value),
        fill: COLORS.milk[idx % COLORS.milk.length],
        unit: 'ton',
      }));
      const milkYearly: YearlyData[] = milkYearlyRes.map(item => ({
        year: String(item.year),
        milk: num(item.sum_value),
      }));

      // Et üretimi
      const redMeatBreakdown: DataItem[] = redMeatBreakdownRes.map((item, idx) => ({
        name: translateMeatItem(String(item.item)),
        value: num(item.sum_value),
        fill: COLORS.meat[idx % COLORS.meat.length],
        unit: 'ton',
      }));
      const whiteMeatBreakdown: DataItem[] = whiteMeatBreakdownRes.map((item, idx) => ({
        name: translateMeatItem(String(item.item)),
        value: num(item.sum_value),
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
      const meatYearly: YearlyData[] = meatYearlyRes.map(item => ({
        year: String(item.year),
        meat: num(item.sum_value),
      }));

      // Yumurta — kaynak birim '1000 No', eski sorgu SUM(... * 1000) ile adede
      // çeviriyordu; toplama ucu çarpan almadığı için burada uygulanıyor.
      const BIN_ADET = 1000;
      const eggTotal = num(eggTotalRes[0]?.sum_value) * BIN_ADET;
      const eggBreakdown: DataItem[] = eggBreakdownRes.map((item, idx) => ({
        name: translateEggItem(String(item.item)),
        value: num(item.sum_value) * BIN_ADET,
        fill: COLORS.egg[idx % COLORS.egg.length],
        unit: 'adet',
      }));
      const eggYearly: YearlyData[] = eggYearlyRes.map(item => ({
        year: String(item.year),
        egg: num(item.sum_value) * BIN_ADET,
      }));

      // Hayvan varlığı
      const livestockStocksBreakdown: DataItem[] = livestockStocksRes.map((row, idx) => ({
        name: String(row.grup ?? ''),
        value: num(row[`sum_${ULKE_SUTUN}`]),
        fill: COLORS.general[idx % COLORS.general.length],
        unit: 'baş',
      }));
      const livestockCattle = livestockStocksBreakdown.find(l => l.name.includes('Sığır'))?.value || 0;
      const livestockSheep = livestockStocksBreakdown.find(l => l.name.includes('Koyun'))?.value || 0;
      const livestockGoat = livestockStocksBreakdown.find(l => l.name.includes('Keçi'))?.value || 0;
      const livestockPoultry = (livestockStocksBreakdown.find(l => l.name.includes('Tavuk'))?.value || 0)
        + (livestockStocksBreakdown.find(l => l.name.includes('Hindi'))?.value || 0);

      const mapRegional = (rows: Row[], palette: string[]): DataItem[] =>
        rows.map((row, idx) => ({
          name: String(row.yer || ''),
          value: num(row[`sum_${BOLGE_SUTUN}`]),
          fill: palette[idx % palette.length],
          unit: 'baş',
        }));

      setData({
        macroKaynak,
        years: {
          macro: macroYil, population: nufusYil, land: araziYil,
          employment: istihdamYil, livestock: hayvanYil,
        },
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
