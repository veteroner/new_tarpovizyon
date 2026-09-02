import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchRows, fetchAgg, latestYear, num, type Row } from '../services/d1';

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
import SectionTabs, { useSectionTab, type SectionTab } from '../components/SectionTabs';
import RangeChips from '../components/RangeChips';
import ProductionOverviewSection from './redmeat/ProductionOverviewSection';
import SpeciesDetailSection from './redmeat/SpeciesDetailSection';
import WorldComparisonSection from './redmeat/WorldComparisonSection';
import ImportAnalysisSection from './redmeat/ImportAnalysisSection';
import EconomicIndicatorsSection from './redmeat/EconomicIndicatorsSection';

/*
 * 25 grafik + 27 KPI ile sayfa mobilde 14.591 px sürüyordu (~18 ekran).
 * Bölümler sekmeye alındı; ekran dışı bölüm hiç render edilmiyor.
 */
const BOLUMLER: SectionTab[] = [
  { id: 'uretim', label: 'Üretim' },
  { id: 'turler', label: 'Türler' },
  { id: 'dunya', label: 'Dünya' },
  { id: 'ithalat', label: 'İthalat' },
  { id: 'ekonomi', label: 'Ekonomi' },
];

export default function TurkeyRedMeatProductionPage() {
  const { active } = useSectionTab(BOLUMLER);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<YearPoint[]>([]);
  // Mobilde 40 yıllık seri okunmuyor; varsayılan son 20 yıl (bkz. RangeChips).
  const [startYear, setStartYear] = useState(0);
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
      /* Donmuş ikiz; tazesinde yıl sütunu `yillar` değil `yil`. */
      const histData = await fetchRows('tr/hayvansal-urun-uretimi') as Record<string, string | number>[];

      // 2a. Türlere Göre Kırılım - Tarihsel (1986-2009): büyükbaş+koyun+keçi
      // MySQL'deki YEAR(yil) karşılığı: yil '1986-01-01 00:00:00' biçiminde
      // saklanıyor, yıl istemcide ayrıştırılıyor.
      const histSpeciesData = (await fetchRows('kirmizi-et/uretim-miktari'))
        .map((r): Row => ({ ...r, yil: extractYear(r.yil) })) as Record<string, string | number>[];

      // 2b. Türlere Göre Kırılım - Güncel (2010-2024): sığır/manda/koyun/keçi ayrı
      const detailData = await fetchRows('kirmizi-et/hayvan-sayilari-yillik') as Record<string, string | number>[];

      const allPoints = histData.map(row => ({
        year: extractYear(row['yil']),
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
      /*
       * ─── DONMUŞ İKİZDEN ÇIKILDI ─────────────────────────────────────────
       * `oner/kirmizi-et-ekonomik-gostergeler` hiçbir senkron işinin
       * YAZMADIĞI kopyaydı, 2026-02'de donmuştu. Günlük iş
       * `kirmizi_et_ekonomik_gostergeler`'i besliyor; orası 2026-08'de.
       *
       * Yalnız üç sütun adı farklı (`_fiyatlari_` → `_fiyati_`); çıktı şekli
       * AYNI bırakıldı ki grafikler değişmesin.
       */
      const economicRows = (await fetchRows('kirmizi-et/ekonomik-gostergeler'))
        .slice(-60)
        .reverse()
        .map((r): Row => ({ ...r, tarih: String(r.tarih ?? '').slice(0, 7) }));
      if (economicRows.length > 0) {
        setEconomicData(economicRows.map((item: Record<string, string | number>) => ({
          tarih: String(item['tarih'] || ''),
          karkas_paritesi: Number(item['karkas_paritesi']) || 0,
          besi_yemi_fiyatlari_tl_kg: Number(item['besi_yemi_fiyati_tl_kg']) || 0,
          dolar_kuru_tl: Number(item['dolar_kuru_tl']) || 0,
          besilik_dana_fiyatlari_tl_kg: Number(item['besilik_dana_fiyati_tl_kg']) || 0,
          dana_karkas_maliyet_tl_kg: Number(item['dana_karkas_maliyet_tl_kg']) || 0,
          dana_karkas_fiyati_tl_kg: Number(item['dana_karkas_fiyati_tl_kg']) || 0,
          karlilik: Number(item['karlilik']) || 0,
          kuzu_karkas_fiyati_tl_kg: Number(item['kuzu_karkas_fiyati_tl_kg']) || 0,
          besilik_kucukbas_fiyatlari_tl_kg: Number(item['besilik_kucukbas_fiyati_tl_kg']) || 0,
          dana_karkas_fiyat_maliyet_farki_tl_kg: Number(item['dana_karkas_fiyat_maliyet_farki_tl_kg']) || 0,
        })));
      }

      // 4. Dünya Karkas Fiyatları
      /*
       * ─── BU TABLONUN TAZE KARŞILIĞI YOK ───────────────────────────────
       * Tek satırlık, ülke bazında dünya karkas fiyatı anlık görüntüsü.
       * Hiçbir senkron işi beslemiyor ve D1'de eşdeğeri bulunmuyor.
       * SİLMEDİM (içerik gerçek ve başka yerde yok) ama güncel sanılmaması
       * için anlık görüntü tarihi ekrana taşınıyor.
       */
      const pricesRows = await fetchRows('oner/dunya-karkas-fiyatlari', { limit: 1 });
      if (pricesRows.length > 0) {
        const row = pricesRows[0];
        setWorldCarcassPrices({
          anlikGoruntuTarihi: String(row['created_at'] ?? '').slice(0, 10),
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
        /*
         * Donmuş ikizden çıkıldı. `o_dunya_kaarkas_veri` değerleri VİRGÜLLÜ
         * METİN tutuyordu ('100,5') ve istemcide ayrıştırılıyordu;
         * `global/karkas-agirligi` aynı 193 ülkeyi sayısal sütunla veriyor.
         */
        const prodRows = await fetchRows('global/karkas-agirligi');
        setProductivityComparison(prodRows
          .map((r) => ({
            ulke: String(r['ulke'] ?? ''),
            karkas_verimi: Number(r['karkas_verimi_kg']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0)
          .sort((a, b) => b.karkas_verimi - a.karkas_verimi));
      } catch (err) {
        console.warn('Verimlilik karşılaştırma tablosu yok:', err);
      }

      // 6. Karkas Ağırlığı Verileri (193 ülke)
      const carcassRows = await fetchRows('global/karkas-agirligi');
      {
        setCarcassWeightData(carcassRows
          .map((r) => ({
            ulke: String(r['ulke'] || ''),
            karkas_verimi_kg: Number(r['karkas_verimi_kg']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0));
      }

      // 7. Türkiye Tüketim Verileri
      /* Donmuş ikizden çıkıldı; alan adlarındaki `_tuketimi_` kalktı. */
      const consRows = await fetchRows('tr/kisi-basina-guncel-tuketim', { limit: 1 });
      if (consRows.length > 0) {
        const row = consRows[0];
        setConsumptionData({
          kirmizi_et_tuketimi_kg: Number(row['kirmizi_et_kg']) || 0,
          yumurta_tuketimi_adet: Number(row['yumurta_adet']) || 0,
          pilic_eti_kg: Number(row['pilic_eti_kg']) || 0,
          bal_tuketimi_kg: Number(row['bal_kg']) || 0,
        });
      }

      // 8. Dünya Et Tüketimi Karşılaştırma
      /* Donmuş ikizden çıkıldı; `balik_ve_deniz_urunleri` → `balik_deniz_urunleri`. */
      const compRows = await fetchRows('global/et-tuketimi-karsilastirma');
      {
        setConsumptionComparison(compRows
          .map((r) => ({
            ulke: String(r['ulke'] || ''),
            kanatli_eti: Number(r['kanatli_eti']) || 0,
            sigir_eti: Number(r['sigir_eti']) || 0,
            koyun_keci_eti: Number(r['koyun_keci_eti']) || 0,
            domuz_eti: Number(r['domuz_eti']) || 0,
            balik_ve_deniz_urunleri: Number(r['balik_deniz_urunleri']) || 0,
            diger_etler: Number(r['diger_etler']) || 0,
          }))
          .filter(d => d.ulke && d.ulke.trim().length > 0));
      }

      // 9. İthalat Verileri
      // Tabloda ilk satır başlık metni (ithalat = null); eski SQL bunu
      // "WHERE ithalat >= 2010" ile eliyordu. Sütun toplamı da istemcide.
      /*
       * ─── İKİ TABLO BİRLEŞTİRİLİYOR — DÜZ GEÇİŞ VERİ KAYBEDERDİ ─────────
       * Burada diğerlerinden farklı bir durum var ve ölçülerek çıkarıldı:
       *
       *   dis-ticaret/kirmizi-et-hayvan-ithalati : 2002–2024, REVİZE
       *       değerler, isimli ve sayısal sütunlar
       *   oner/canli-hayvan-et-ithalati          : 2010–2025, ham değerler,
       *       İSİMSİZ metin sütunlar (column_1 … column_12)
       *
       * Ortak 15 yılın 4'ünde değerler birebir, 11'inde yeni tablo revize
       * (örn. 2012 besilik sığır 177.392 → 228.421). Farkların hiçbiri
       * sıfır/eksik değil, yani yeni tablo daha doğru.
       *
       * AMA yeni tablo 2024'te bitiyor, eskide 2025 satırı var ve DOLU.
       * Düz geçiş o yılı silerdi. Bu yüzden taban yeni tablo, eski tablodan
       * yalnızca yeni tabloda OLMAYAN yıllar ekleniyor.
       *
       * İsimsiz sütunların karşılığı tahminle değil, 15 yıllık değer
       * karşılaştırmasıyla doğrulandı (column_5 → besilik_sigir_bas gibi).
       *
       * DİKKAT — İKİSİ DE ÖKSÜZ: hiçbir senkron işi bu tabloları yazmıyor,
       * ikisi de tek seferlik anlık görüntü. Kaynağa bağlanması Aşama 3'te
       * (bkz. docs/PRO-DURUM.md §5).
       */
      const [taze, ikiz] = await Promise.all([
        fetchRows('dis-ticaret/kirmizi-et-hayvan-ithalati', { limit: 200 }),
        fetchRows('oner/canli-hayvan-et-ithalati', { limit: 200 }),
      ]);

      type Ithalat = {
        yil: string;
        karkas_et_ithalati_ton: number;
        besilik_sigir_bas: number;
        besilik_kesimlik_kucukbas_sayisi_bas: number;
        toplam_ithalata_odenen_dolar: number;
      };

      const tazeYillar = new Set(taze.map((r) => Number(r.yil)));

      const tazeKayitlar: Ithalat[] = taze
        .filter((r) => Number(r.yil) >= 2010)
        .map((r) => ({
          yil: String(r.yil ?? ''),
          karkas_et_ithalati_ton: num(r.karkas_et_ithalati_ton),
          besilik_sigir_bas: num(r.besilik_sigir_bas),
          besilik_kesimlik_kucukbas_sayisi_bas: num(r.kasaplik_kucukbas_bas),
          /*
           * Hazır `toplam_odenen_dolar` sütunu var AMA NULL — 2010-2024'ün
           * tamamında boş (ölçüldü). Onu kullansaydım grafik 15 yıl sıfır
           * gösterip yalnız 2025'te zıplardı. Parçalardan toplanıyor; parça
           * sütunları dolu ve toplamları tutarlı (2024: 710.288.600 $).
           */
          toplam_ithalata_odenen_dolar:
            num(r.kasaplik_kucukbas_deger) + num(r.damizlik_kucukbas_deger)
            + num(r.besilik_sigir_deger) + num(r.kasaplik_sigir_deger)
            + num(r.damizlik_sigir_deger),
        }));

      const eksikYillar: Ithalat[] = ikiz
        .filter((r) => Number(r.ithalat) >= 2010 && !tazeYillar.has(Number(r.ithalat)))
        .map((r) => ({
          yil: String(r.ithalat ?? ''),
          karkas_et_ithalati_ton: num(r.column_11),
          besilik_sigir_bas: num(r.column_5),
          besilik_kesimlik_kucukbas_sayisi_bas: num(r.column_1),
          toplam_ithalata_odenen_dolar:
            num(r.column_2) + num(r.column_4) + num(r.column_6) + num(r.column_8) + num(r.column_10),
        }));

      const importRows = [...tazeKayitlar, ...eksikYillar]
        .sort((a, b) => Number(a.yil) - Number(b.yil));
      if (importRows.length > 0) setImportData(importRows);

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

  /*
   * Kullanıcı bir aralık seçmediyse son 20 yıl. Veri yüklenmeden yıl aralığı
   * bilinmediği için state'i sabit bir yılla başlatamıyoruz; 0 = "seçim yok"
   * ve gerçek başlangıç veriden türetiliyor.
   */
  const varsayilanBaslangic = useMemo(
    () => (maxYear ? Math.max(minYear, maxYear - 19) : 0),
    [minYear, maxYear],
  );
  const etkinBaslangic = startYear || varsayilanBaslangic;

  const filteredSeries = useMemo(() => {
    if (!etkinBaslangic) return series;
    return series.filter((p) => p.year >= etkinBaslangic);
  }, [series, etkinBaslangic]);

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
        <h1 className="page-title">Türkiye Kırmızı Et Üretimi</h1>
        <p className="page-subtitle">
          Kırmızı et üretimi (ton)
          {minYear && maxYear ? ` (${minYear}–${maxYear})` : ''}
        </p>
      </div>

      {/*
        * Açılır menü yerine aralık çipleri. Varsayılan SON 20 YIL: 375 px'lik
        * ekranda çizim alanı ~195 px; 40 yıllık seriyi oraya sıkıştırınca yıl
        * başına 5 px düşüyor ve grafik okunmaz hâle geliyordu. "Tümü" tek
        * dokunuş uzakta.
        */}
      <RangeChips years={availableYears} value={etkinBaslangic} onChange={setStartYear} />

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          <SectionTabs tabs={BOLUMLER} />

          {active === 'uretim' && (
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
          )}

          {active === 'turler' && <SpeciesDetailSection filteredSeries={filteredSeries} />}

          {active === 'dunya' && (
            <WorldComparisonSection
              worldCarcassPrices={worldCarcassPrices}
              productivityComparison={productivityComparison}
              carcassWeightData={carcassWeightData}
              consumptionComparison={consumptionComparison}
            />
          )}

          {active === 'ithalat' && (
            <ImportAnalysisSection
              importData={importData}
              series={series}
              importAnalytics={importAnalytics}
            />
          )}

          {active === 'ekonomi' && <EconomicIndicatorsSection economicData={economicData} />}
        </>
      )}
    </div>
  );
}
