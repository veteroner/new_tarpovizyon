import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchRows, fetchAgg, latestYear, num } from '../services/d1';

const R_FAO = 'fao/livestock-primary';
// Kıta/toplam satırlarını dışla. Eski SQL yalnızca 'World'/'WORLD' çıkarıyordu;
// oysa tabloda hem 'China' toplamı hem 'China, mainland' var ve Çin iki kez
// sayılıp Türkiye'nin dünya sırasını bir basamak aşağı itiyordu.
const EX_FAO = { preset: 'v1' as const, col: 'area' };
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
} from './redmeat/redMeatUtils';
import ProductionOverviewSection from './redmeat/ProductionOverviewSection';
import SpeciesDetailSection from './redmeat/SpeciesDetailSection';
import WorldComparisonSection from './redmeat/WorldComparisonSection';
import ImportAnalysisSection from './redmeat/ImportAnalysisSection';
import EconomicIndicatorsSection from './redmeat/EconomicIndicatorsSection';

export default function TurkeyRedMeatProductionPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  const [startYear, setStartYear] = useState(1986);
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
      const histData = await fetchRows('oner/hayvansal-urun-uretimi') as Record<string, string | number>[];

      // 2a. Türlere Göre Kırılım - Tarihsel (1986-2009): büyükbaş+koyun+keçi
      // MySQL'deki YEAR(yil) karşılığı: yil '1986-01-01 00:00:00' biçiminde
      // saklanıyor, yıl istemcide ayrıştırılıyor.
      const histSpeciesData = (await fetchRows('oner/kirmizi-et-uretim-miktari'))
        .map((r) => ({ ...r, yil: extractYear(r.yil) })) as Record<string, string | number>[];

      // 2b. Türlere Göre Kırılım - Güncel (2010-2024): sığır/manda/koyun/keçi ayrı
      const detailData = await fetchRows('oner/kirmizi-et-uretimi') as Record<string, string | number>[];

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

      // 1986-2009 arası tarihsel tür verisi (büyükbaş = sığır+manda birlikte)
      histSpeciesData.forEach(row => {
        const year = Number(row['yil']);
        const point = allPoints.find(p => p.year === year);
        if (point && year < 2010) {
          point.cattleTon = Number(row['buyukbas_et_uretimi_ton']) || 0;
          point.sheepTon = Number(row['koyun_et_uretimi_ton']) || 0;
          point.goatTon = Number(row['keci_et_uretimi_ton']) || 0;
          point.buyukbasToplam = Number(row['buyukbas_et_uretimi_ton']) || 0;
          point.kucukbasToplam = (Number(row['koyun_et_uretimi_ton']) || 0) + (Number(row['keci_et_uretimi_ton']) || 0);
        }
      });

      // 2010+ TÜİK verisini üzerine yaz (daha detaylı sığır/manda/koyun/keçi)
      // Hist tabloda olmayan yıllar (örn. 2025) için de yeni nokta oluştur
      detailData.forEach(row => {
        const year = Number(row['yil']);
        let point = allPoints.find(p => p.year === year);
        if (!point) {
          const cattle = Number(row['sigir']) || 0;
          const buffalo = Number(row['manda']) || 0;
          const sheep = Number(row['koyun']) || 0;
          const goat = Number(row['keci']) || 0;
          point = {
            year,
            totalTon: Number(row['toplam']) || (cattle + buffalo + sheep + goat),
            cattleTon: cattle,
            buffaloTon: buffalo,
            sheepTon: sheep,
            goatTon: goat,
            buyukbasToplam: Number(row['buyukbas_toplam']) || (cattle + buffalo),
            kucukbasToplam: Number(row['kucukbas_toplam']) || (sheep + goat),
          };
          allPoints.push(point);
        } else {
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
      // DATE_FORMAT(tarih,'%Y-%m') karşılığı: tarih 'YYYY-MM-DD HH:MM:SS'
      // biçiminde; ilk 7 karakter alınıyor. LIMIT 60 en yeni 60 kayıt.
      const economicRows = (await fetchRows('oner/kirmizi-et-ekonomik-gostergeler'))
        .slice(-60)
        .reverse()
        .map((r) => ({ ...r, tarih: String(r.tarih ?? '').slice(0, 7) }));
      if (economicRows.length > 0) {
        setEconomicData(economicRows.map((item: Record<string, string | number>) => ({
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
      const pricesRows = await fetchRows('oner/dunya-karkas-fiyatlari', { limit: 1 });
      if (pricesRows.length > 0) {
        const row = pricesRows[0];
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
        // Değerler '99,5' gibi virgüllü metin; REPLACE(...)*1 karşılığı istemcide.
        const prodRows = await fetchRows('oner/dunya-karkas-veri');
        setProductivityComparison(prodRows
          .map((r) => ({
            ulke: String(r['Ülke'] ?? ''),
            karkas_verimi: Number(String(r['Karkas Verimi (Kg)'] ?? '').replace(',', '.')) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0)
          .sort((a, b) => b.karkas_verimi - a.karkas_verimi));
      } catch (err) {
        console.warn('Verimlilik karşılaştırma tablosu yok:', err);
      }

      // 6. Karkas Ağırlığı Verileri (193 ülke)
      const carcassRows = await fetchRows('oner/dunya-karkas-agirligi');
      {
        setCarcassWeightData(carcassRows
          .map((r) => ({
            ulke: String(r['ulke'] || ''),
            karkas_verimi_kg: Number(r['karkas_verimi_kg']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0));
      }

      // 7. Türkiye Tüketim Verileri
      const consRows = await fetchRows('oner/kisi-basina-tuketimler', { limit: 1 });
      if (consRows.length > 0) {
        const row = consRows[0];
        setConsumptionData({
          kirmizi_et_tuketimi_kg: Number(row['kirmizi_et_tuketimi_kg']) || 0,
          yumurta_tuketimi_adet: Number(row['yumurta_tuketimi_adet']) || 0,
          pilic_eti_kg: Number(row['pilic_eti_kg']) || 0,
          bal_tuketimi_kg: Number(row['bal_tuketimi_kg']) || 0,
        });
      }

      // 8. Dünya Et Tüketimi Karşılaştırma
      const compRows = await fetchRows('oner/karsilastirma-et-tuketimi');
      {
        setConsumptionComparison(compRows
          .map((r) => ({
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
      // Tabloda ilk satır başlık metni (ithalat = null); eski SQL bunu
      // "WHERE ithalat >= 2010" ile eliyordu. Sütun toplamı da istemcide.
      const importRows = (await fetchRows('oner/canli-hayvan-et-ithalati'))
        .filter((r) => Number(r.ithalat) >= 2010)
        .sort((a, b) => Number(a.ithalat) - Number(b.ithalat));
      if (importRows.length > 0) {
        setImportData(importRows.map((r) => ({
          yil: String(r.ithalat ?? ''),
          karkas_et_ithalati_ton: num(r.column_11),
          besilik_sigir_bas: num(r.column_5),
          besilik_kesimlik_kucukbas_sayisi_bas: num(r.column_1),
          toplam_ithalata_odenen_dolar:
            num(r.column_2) + num(r.column_4) + num(r.column_6) + num(r.column_8) + num(r.column_10),
        })));
      }

      // 10. Dünya Sıralamaları (FAO)
      try {
        const faoMaxYear = await latestYear(R_FAO, 'year', {
          where: { element: 'Production', unit: 't' },
        }) ?? 2023;

        const siralama = (item: string) => fetchAgg(R_FAO, {
          groupBy: ['area'], sum: ['value'],
          where: { year: faoMaxYear, element: 'Production', unit: 't', item },
          exclude: EX_FAO, orderBy: 'sum_value', dir: 'desc',
        }).catch(() => []);

        const [cattleRes, sheepRes, goatRes] = await Promise.all([
          siralama('Meat of cattle with the bone, fresh or chilled'),
          siralama('Meat of sheep, fresh or chilled'),
          siralama('Meat of goat, fresh or chilled'),
        ]);

        const findRank = (data: { area?: unknown }[], isEU: boolean) => {
          if (!data || data.length === 0) return 0;
          const areas = data.map((r) => String(r.area ?? ''));
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
          cattle: { world: findRank(cattleRes, false), eu: findRank(cattleRes, true) },
          sheep: { world: findRank(sheepRes, false), eu: findRank(sheepRes, true) },
          goat: { world: findRank(goatRes, false), eu: findRank(goatRes, true) },
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
            onChange={(e) => setStartYear(Number(e.target.value) || 1986)}
            disabled={!availableYears.length}
          >
            <option value={1986}>1986 (Tüm Veriler)</option>
            <option value={2000}>2000</option>
            <option value={2010}>2010</option>
            <option value={2015}>2015</option>
            <option value={2020}>2020</option>
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
