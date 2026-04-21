import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchQuery } from '../services/api';
import {
  type YearPoint,
  type EconomicData,
  type WorldCarcassPrices,
  type ProductivityComparison,
  type CarcassWeightData,
  type ConsumptionData,
  type ConsumptionComparison,
  type ImportData,
  type WorldRankings,
  extractYear,
  formatTon,
} from './redmeat/redMeatUtils';
import ProductionOverviewSection from './redmeat/ProductionOverviewSection';
import SpeciesDetailSection from './redmeat/SpeciesDetailSection';
import WorldComparisonSection from './redmeat/WorldComparisonSection';
import ImportAnalysisSection from './redmeat/ImportAnalysisSection';
import EconomicIndicatorsSection from './redmeat/EconomicIndicatorsSection';

export default function TurkeyRedMeatProductionPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [startYear, setStartYear] = useState(2010);
  const [economicData, setEconomicData] = useState<EconomicData[]>([]);
  const [worldCarcassPrices, setWorldCarcassPrices] = useState<WorldCarcassPrices | null>(null);
  const [productivityComparison, setProductivityComparison] = useState<ProductivityComparison[]>([]);
  const [carcassWeightData, setCarcassWeightData] = useState<CarcassWeightData[]>([]);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData | null>(null);
  const [consumptionComparison, setConsumptionComparison] = useState<ConsumptionComparison[]>([]);
  const [importData, setImportData] = useState<ImportData[]>([]);
  const [worldRankings, setWorldRankings] = useState<WorldRankings | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ana Üretim Verisi (1961-2024)
      const histRes = await fetchQuery('SELECT * FROM oner_hayvansal_urun_uretimi ORDER BY yillar');
      const histData = (histRes.data ?? []) as Record<string, string | number>[];

      // 2. Türlere Göre Kırılım (2010-2024)
      const detailRes = await fetchQuery('SELECT * FROM oner_kirmizi_et_uretimi ORDER BY yil');
      const detailData = (detailRes.data ?? []) as Record<string, string | number>[];

      const allPoints = histData.map(row => ({
        year: extractYear(row['yillar']),
        totalTon: Number(row['kirmizi_et_uretimi']) || 0,
        cattleTon: 0,
        sheepTon: 0,
        goatTon: 0,
        buffaloTon: 0,
        buyukbasToplam: 0,
        kucukbasToplam: 0,
      }));

      detailData.forEach(row => {
        const year = Number(row['yil']);
        const point = allPoints.find(p => p.year === year);
        if (point) {
          point.cattleTon = Number(row['sigir']) || 0;
          point.buffaloTon = Number(row['manda']) || 0;
          point.sheepTon = Number(row['koyun']) || 0;
          point.goatTon = Number(row['keci']) || 0;
          point.buyukbasToplam = Number(row['buyukbas_toplam']) || 0;
          point.kucukbasToplam = Number(row['kucukbas_toplam']) || 0;
        }
      });

      setSeries(allPoints.filter(p => p.year > 0).sort((a, b) => a.year - b.year));

      // 3. Ekonomik Göstergeler
      const economicQuery = `SELECT 
        DATE_FORMAT(tarih, '%Y-%m') as tarih,
        karkas_paritesi, besi_yemi_fiyatlari_tl_kg, dolar_kuru_tl,
        besilik_dana_fiyatlari_tl_kg, dana_karkas_maliyet_tl_kg,
        dana_karkas_fiyati_tl_kg, karlilik, kuzu_karkas_fiyati_tl_kg,
        besilik_kucukbas_fiyatlari_tl_kg, dana_karkas_fiyat_maliyet_farki_tl_kg
        FROM oner_kirmizi_et_ekonomik_gostergeler 
        ORDER BY tarih DESC LIMIT 60`;
      const economicRes = await fetchQuery(economicQuery);
      if (economicRes.data && economicRes.data.length > 0) {
        setEconomicData(economicRes.data.map((item: Record<string, string | number>) => ({
          tarih: String(item['tarih'] || ''),
          karkas_paritesi: Number(item['karkas_paritesi']) || 0,
          besi_yemi_fiyatlari_tl_kg: Number(item['besi_yemi_fiyatlari_tl_kg']) || 0,
          dolar_kuru_tl: Number(item['dolar_kuru_tl']) || 0,
          besilik_dana_fiyatlari_tl_kg: Number(item['besilik_dana_fiyatlari_tl_kg']) || 0,
          dana_karkas_maliyet_tl_kg: Number(item['dana_karkas_maliyet_tl_kg']) || 0,
          dana_karkas_fiyati_tl_kg: Number(item['dana_karkas_fiyati_tl_kg']) || 0,
          karlilik: Number(item['karlilik']) || 0,
          kuzu_karkas_fiyati_tl_kg: Number(item['kuzu_karkas_fiyati_tl_kg']) || 0,
          besilik_kucukbas_fiyatlari_tl_kg: Number(item['besilik_kucukbas_fiyatlari_tl_kg']) || 0,
          dana_karkas_fiyat_maliyet_farki_tl_kg: Number(item['dana_karkas_fiyat_maliyet_farki_tl_kg']) || 0,
        })));
      }

      // 4. Dünya Karkas Fiyatları
      const pricesRes = await fetchQuery('SELECT * FROM oner_dunya_karkas_fiyatlari LIMIT 1');
      if (pricesRes.data && pricesRes.data.length > 0) {
        const row = pricesRes.data[0];
        setWorldCarcassPrices({
          ingiltere: Number(row['ingiltere']) || 0,
          abd: Number(row['abd']) || 0,
          ab_27: Number(row['ab_27']) || 0,
          yeni_zelanda: Number(row['yeni_zelanda']) || 0,
          avustralya: Number(row['avustralya']) || 0,
          arjantin: Number(row['arjantin']) || 0,
          uruguay: Number(row['uruguay']) || 0,
          brezilya: Number(row['brezilya']) || 0,
          turkiye: Number(row['turkiye']) || 0,
        });
      }

      // 5. Verimlilik Karşılaştırma
      try {
        const prodRes = await fetchQuery('SELECT `Ülke` as ulke, REPLACE(`Karkas Verimi (Kg)`, \',\', \'.\') * 1 as karkas_verimi FROM o_dunya_kaarkas_veri ORDER BY karkas_verimi DESC');
        if (prodRes.data) {
          setProductivityComparison(prodRes.data
            .map((r: Record<string, string | number>) => ({
              ulke: String(r['ulke'] || ''),
              karkas_verimi: Number(r['karkas_verimi']) || 0,
            }))
            .filter(d => d.ulke && d.ulke.trim().length > 0));
        }
      } catch (err) {
        console.warn('Verimlilik karşılaştırma tablosu yok:', err);
      }

      // 6. Karkas Ağırlığı Verileri (193 ülke)
      const carcassRes = await fetchQuery('SELECT * FROM oner_dunya_karkas_agirligi_verileri ORDER BY karkas_verimi_kg DESC');
      if (carcassRes.data) {
        setCarcassWeightData(carcassRes.data
          .map((r: Record<string, string | number>) => ({
            ulke: String(r['ulke'] || ''),
            karkas_verimi_kg: Number(r['karkas_verimi_kg']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0));
      }

      // 7. Türkiye Tüketim Verileri
      const consRes = await fetchQuery('SELECT * FROM oner_kisi_basina_guncel_tuketimler LIMIT 1');
      if (consRes.data && consRes.data.length > 0) {
        const row = consRes.data[0];
        setConsumptionData({
          kirmizi_et_tuketimi_kg: Number(row['kirmizi_et_tuketimi_kg']) || 0,
          yumurta_tuketimi_adet: Number(row['yumurta_tuketimi_adet']) || 0,
          pilic_eti_kg: Number(row['pilic_eti_kg']) || 0,
          bal_tuketimi_kg: Number(row['bal_tuketimi_kg']) || 0,
        });
      }

      // 8. Dünya Et Tüketimi Karşılaştırma
      const compRes = await fetchQuery('SELECT * FROM oner_karsilastirma_et_tuketimi');
      if (compRes.data) {
        setConsumptionComparison(compRes.data
          .map((r: Record<string, string | number>) => ({
            ulke: String(r['ulke'] || ''),
            kanatli_eti: Number(r['kanatli_eti']) || 0,
            sigir_eti: Number(r['sigir_eti']) || 0,
            koyun_keci_eti: Number(r['koyun_keci_eti']) || 0,
            domuz_eti: Number(r['domuz_eti']) || 0,
            balik_ve_deniz_urunleri: Number(r['balik_ve_deniz_urunleri']) || 0,
            diger_etler: Number(r['diger_etler']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0));
      }

      // 9. İthalat Verileri
      const importRes = await fetchQuery(`SELECT 
        ithalat as yil,
        COALESCE(column_11, 0) as karkas_et_ithalati_ton,
        COALESCE(column_5, 0) as besilik_sigir_bas,
        COALESCE(column_1, 0) as besilik_kesimlik_kucukbas_sayisi_bas,
        (
          COALESCE(column_2, 0) +
          COALESCE(column_4, 0) +
          COALESCE(column_6, 0) +
          COALESCE(column_8, 0) +
          COALESCE(column_10, 0)
        ) as toplam_ithalata_odenen_dolar
        FROM oner_canli_hayvan_ve_et_ithalati 
        WHERE ithalat >= 2010 
        ORDER BY ithalat`);
      if (importRes.data && importRes.data.length > 0) {
        setImportData(importRes.data.map((r: Record<string, string | number>) => ({
          yil: String(r['yil'] || ''),
          karkas_et_ithalati_ton: Number(r['karkas_et_ithalati_ton']) || 0,
          besilik_sigir_bas: Number(r['besilik_sigir_bas']) || 0,
          besilik_kesimlik_kucukbas_sayisi_bas: Number(r['besilik_kesimlik_kucukbas_sayisi_bas']) || 0,
          toplam_ithalata_odenen_dolar: Number(r['toplam_ithalata_odenen_dolar']) || 0,
        })));
      }

      // 10. Dünya Sıralamaları (FAO)
      try {
        const rankingQueries = [
          `SELECT area, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary 
           WHERE year='2023' AND element='Production' AND unit='t' 
           AND item='Meat of cattle with the bone, fresh or chilled'
           AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC`,
          `SELECT area, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary 
           WHERE year='2023' AND element='Production' AND unit='t' 
           AND item='Meat of sheep, fresh or chilled'
           AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC`,
          `SELECT area, SUM(REPLACE(value,',','.') * 1) as total FROM fao_livestock_primary 
           WHERE year='2023' AND element='Production' AND unit='t' 
           AND item='Meat of goat, fresh or chilled'
           AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC`,
        ];

        const [cattleRes, sheepRes, goatRes] = await Promise.all(
          rankingQueries.map(q => fetchQuery(q).catch(() => ({ data: [] })))
        );

        const findRank = (data: Record<string, string | number>[], isEU: boolean) => {
          if (!data || data.length === 0) return 0;
          const areas = data.map((r: Record<string, string | number>) => String(r.area || ''));
          const turkeyIndex = areas.findIndex(a => a === 'Türkiye' || a === 'Turkey');
          if (turkeyIndex === -1) return 0;

          if (isEU) {
            const euCountries = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia',
              'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland',
              'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland',
              'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden'];
            const euList = areas.filter(a => euCountries.includes(a) || a === 'Türkiye' || a === 'Turkey');
            return euList.indexOf('Türkiye') + 1 || euList.indexOf('Turkey') + 1 || 0;
          }
          return turkeyIndex + 1;
        };

        setWorldRankings({
          cattle: { world: findRank(cattleRes.data || [], false), eu: findRank(cattleRes.data || [], true) },
          sheep: { world: findRank(sheepRes.data || [], false), eu: findRank(sheepRes.data || [], true) },
          goat: { world: findRank(goatRes.data || [], false), eu: findRank(goatRes.data || [], true) },
        });
      } catch (e) {
        console.warn('Dünya sıralamaları yüklenemedi:', e);
      }

    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // useMemo calculations
  const availableYears = useMemo(() => series.map((p) => p.year), [series]);
  const minYear = useMemo(() => (availableYears.length ? Math.min(...availableYears) : 0), [availableYears]);
  const maxYear = useMemo(() => (availableYears.length ? Math.max(...availableYears) : 0), [availableYears]);

  const filteredSeries = useMemo(() => {
    if (!startYear) return series;
    return series.filter((p) => p.year >= startYear);
  }, [series, startYear]);

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

  const avgLast5 = useMemo(() => {
    if (!series.length) return 0;
    const last = series.slice(-5);
    const values = last.map((p) => p.totalTon).filter((v) => v > 0);
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [series]);

  const peak = useMemo(() => {
    let best: YearPoint | undefined;
    for (const p of series) {
      if (!best || p.totalTon > best.totalTon) best = p;
    }
    return best;
  }, [series]);

  const importAnalytics = useMemo(() => {
    if (importData.length === 0) return null;

    const latestImport = importData[importData.length - 1];
    const previous = importData[importData.length - 2];

    const calculateYoY = (current: number, prev: number) => {
      if (!prev || prev === 0) return 0;
      return ((current - prev) / prev) * 100;
    };

    const avgCarcass = importData.reduce((sum, d) => sum + d.karkas_et_ithalati_ton, 0) / importData.length;
    const avgCattle = importData.reduce((sum, d) => sum + d.besilik_sigir_bas, 0) / importData.length;
    const avgSmallRuminant = importData.reduce((sum, d) => sum + d.besilik_kesimlik_kucukbas_sayisi_bas, 0) / importData.length;
    const avgSpending = importData.reduce((sum, d) => sum + d.toplam_ithalata_odenen_dolar, 0) / importData.length;

    const calculateCAGR = (start: number, end: number, years: number) => {
      if (!start || start === 0 || !end || end === 0) return 0;
      return (Math.pow(end / start, 1 / years) - 1) * 100;
    };

    const firstYear = importData[0];
    const lastYear = importData[importData.length - 1];
    const yearDiff = importData.length - 1;

    return {
      latest: {
        carcass: latestImport.karkas_et_ithalati_ton,
        cattle: latestImport.besilik_sigir_bas,
        smallRuminant: latestImport.besilik_kesimlik_kucukbas_sayisi_bas,
        spending: latestImport.toplam_ithalata_odenen_dolar,
        year: latestImport.yil,
      },
      yoy: previous ? {
        carcass: calculateYoY(latestImport.karkas_et_ithalati_ton, previous.karkas_et_ithalati_ton),
        cattle: calculateYoY(latestImport.besilik_sigir_bas, previous.besilik_sigir_bas),
        smallRuminant: calculateYoY(latestImport.besilik_kesimlik_kucukbas_sayisi_bas, previous.besilik_kesimlik_kucukbas_sayisi_bas),
        spending: calculateYoY(latestImport.toplam_ithalata_odenen_dolar, previous.toplam_ithalata_odenen_dolar),
      } : null,
      averages: {
        carcass: avgCarcass,
        cattle: avgCattle,
        smallRuminant: avgSmallRuminant,
        spending: avgSpending,
      },
      cagr: {
        carcass: calculateCAGR(firstYear.karkas_et_ithalati_ton, lastYear.karkas_et_ithalati_ton, yearDiff),
        cattle: calculateCAGR(firstYear.besilik_sigir_bas, lastYear.besilik_sigir_bas, yearDiff),
        smallRuminant: calculateCAGR(firstYear.besilik_kesimlik_kucukbas_sayisi_bas, lastYear.besilik_kesimlik_kucukbas_sayisi_bas, yearDiff),
        spending: calculateCAGR(firstYear.toplam_ithalata_odenen_dolar, lastYear.toplam_ithalata_odenen_dolar, yearDiff),
      },
      unitCost: latestImport.karkas_et_ithalati_ton > 0
        ? latestImport.toplam_ithalata_odenen_dolar / latestImport.karkas_et_ithalati_ton
        : 0,
    };
  }, [importData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🥩 Türkiye Kırmızı Et Üretimi</h1>
        <p className="page-subtitle">
          Kırmızı et üretimi (ton)
          {minYear && maxYear ? ` (${minYear}–${maxYear})` : ''}
        </p>
      </div>

      {/* Filtre */}
      <div className="date-filter">
        <div className="filter-group">
          <label className="filter-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Başlangıç Yılı
          </label>
          <select
            className="filter-select"
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value) || 2010)}
            disabled={!availableYears.length}
          >
            <option value={2010}>2010</option>
            <option value={2015}>2015</option>
            <option value={2020}>2020</option>
            {availableYears.includes(minYear) && <option value={minYear}>{minYear} (Tüm Veriler)</option>}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          <ProductionOverviewSection
            filteredSeries={filteredSeries}
            latest={latest}
            yoy={yoy}
            peak={peak}
            avgLast5={avgLast5}
            consumptionData={consumptionData}
            worldRankings={worldRankings}
            importAnalytics={importAnalytics}
          />

          <SpeciesDetailSection filteredSeries={filteredSeries} />

          <WorldComparisonSection
            worldCarcassPrices={worldCarcassPrices}
            productivityComparison={productivityComparison}
            carcassWeightData={carcassWeightData}
            consumptionComparison={consumptionComparison}
          />

          <ImportAnalysisSection
            importData={importData}
            series={series}
            importAnalytics={importAnalytics}
          />

          <EconomicIndicatorsSection economicData={economicData} />
        </>
      )}
    </div>
  );
}
