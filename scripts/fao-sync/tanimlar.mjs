/**
 * FAO bulk veri setleri → D1 (`tarpovizyon-dunya`) eşlemeleri.
 *
 * ─── NEDEN BULK ─────────────────────────────────────────────────────────────
 * FAOSTAT'ın JSON servisi (faostatservices.fao.org/api/v1) artık yetki istiyor
 * (401 "Missing Authorization Header"). Bulk zip'ler ise açık ve
 * `bulks-faostat.fao.org/production/datasets_E.json` her veri setinin güncelleme
 * tarihini veriyor. Bu yüzden kaynak bulk.
 *
 * ─── İKİ TABLO BİÇİMİ ───────────────────────────────────────────────────────
 * `duz`   : FAO'nun normalize satırı = D1 satırı (her element ayrı satır).
 * `pivot` : D1 satırı bir ANAHTAR (ülke+ürün+yıl); FAO'nun elementleri
 *           SÜTUNLARA yayılmış. `elementSutun` eşlemesi gerekiyor ve her biri
 *           gerçek veriyle doğrulandı — tahmin yok.
 *
 * ─── TÜRKÇE SÜTUNLAR ────────────────────────────────────────────────────────
 * `element_tr` / `item_tr` / `indicator_tr` FAO'da YOK — elle çevrilmiş. Yeni
 * yıl eklerken aynı kodun D1'de zaten bulunan çevirisinden taşınıyor. Çevirisi
 * olmayan yeni bir kod gelirse satır yine yazılıyor, `_tr` boş kalıyor ve rapor
 * bunu sayıyor.
 *
 * ─── SADECE YENİ YIL ────────────────────────────────────────────────────────
 * Var olan yıllara dokunulmuyor. FAO geçmişi revize ediyor ama burada revizyon
 * takibi yok; amaç eksik yılları tamamlamak.
 */

export const BULK_KOK = 'https://bulks-faostat.fao.org/production/';

/** FAO normalize CSV'sinde ortak sütun adları (düz tablolar için). */
const ORTAK = {
  areacode: 'Area Code',
  area: 'Area',
  itemcode: 'Item Code',
  item: 'Item',
  elementcode: 'Element Code',
  element: 'Element',
  year: 'Year',
  unit: 'Unit',
  value: 'Value',
};

export const TANIMLAR = {
  /* ─── düz tablolar ──────────────────────────────────────────────────────── */

  'land-cover': {
    bicim: 'duz',
    tablo: 'fao_land_cover',
    dosya: 'Environment_LandCover_E_All_Data_(Normalized).zip',
    esleme: { ...ORTAK },
    sabit: { domain: 'LC' },
    ceviri: { element_tr: 'elementcode', item_tr: 'itemcode' },
  },
  'pestisit': {
    bicim: 'duz',
    tablo: 'fao_input_pestisit_use',
    dosya: 'Inputs_Pesticides_Use_E_All_Data_(Normalized).zip',
    esleme: { ...ORTAK },
    sabit: { domaincode: 'RP' },
    ceviri: { element_tr: 'elementcode', item_tr: 'itemcode' },
  },
  'gubre': {
    bicim: 'duz',
    tablo: 'fao_input_gubre_ticari',
    dosya: 'Inputs_FertilizersProduct_E_All_Data_(Normalized).zip',
    esleme: { ...ORTAK },
    sabit: { domaincode: 'RFP' },
    ceviri: { element_tr: 'elementcode', item_tr: 'itemcode' },
  },

  /* ─── pivot tablolar ────────────────────────────────────────────────────── */

  'nufus': {
    bicim: 'pivot',
    tablo: 'fao_nufus',
    dosya: 'Population_E_All_Data_(Normalized).zip',
    /** Bir D1 satırını benzersiz yapan alanlar (D1 sütunu → CSV sütunu). */
    anahtar: { areacode: 'Area Code', itemcode: 'Item Code', year: 'Year' },
    /** Anahtarla gelen açıklama sütunları; ilk görülen değer kullanılıyor. */
    tasinan: { area: 'Area', item: 'Item', unit: 'Unit' },
    sabit: { domain: 'OA' },
    /*
     * Türkiye 2020 ile birebir doğrulandı:
     * 511=86091.692 TOPLAM, 512=43068.231 erkek/T, 513=43023.461 kadın/T,
     * 551=20032.305 kirsal, 561=63803.445 sehir.
     */
    elementSutun: {
      511: 'TOPLAM', 512: 'erkek/T', 513: 'kadın/T', 551: 'kirsal', 561: 'sehir',
    },
    /*
     * ÜST SINIR: CARİ YIL. FAO'nun nüfus dosyası 2100'e kadar PROJEKSİYON
     * içeriyor ve gözlem/projeksiyon ayrımı YOK — ürün adı "Population - Est.
     * & Proj.", bütün yıllarda bayrak aynı ('X'). Hepsini yazmak sayfaların
     * "son yıl" mantığını 2100'e taşır ve grafikleri bozar. Bu yüzden seri
     * bugüne kadar getiriliyor, uzun vadeli projeksiyon alınmıyor.
     */
    ustYil: () => new Date().getFullYear(),
  },

  'istihdam': {
    bicim: 'pivot',
    tablo: 'fao_nufus_istihdam_tarim',
    dosya: 'Employment_Indicators_Agriculture_E_All_Data_(Normalized).zip',
    anahtar: {
      areacode: 'Area Code',
      indicatorcode: 'Indicator Code',
      elementcode: 'Element Code',
      yearcode: 'Year',
    },
    tasinan: { area: 'Area', indicator: 'Indicator', element: 'Element', unit: 'Unit' },
    sabit: { domaincode: 'OEA' },
    ceviri: { indicator_tr: 'indicatorcode' },
    /*
     * Burada yayılan boyut ELEMENT değil CİNSİYET. Türkiye 2021 ile doğrulandı:
     * sex 1/Total=9815.37, 2/Male=6396.54, 3/Female=3418.83.
     */
    yayilanSutun: 'Sex Code',
    elementSutun: { 1: 'total', 2: 'male', 3: 'female' },
  },

  'islenmis-bitkisel': {
    bicim: 'pivot',
    tablo: 'fao_uretim_bitkisel_islenmis',
    dosya: 'Production_Crops_Livestock_E_All_Data_(Normalized).zip',
    anahtar: { ulkekod: 'Area Code', urunkod: 'Item Code', year: 'Year' },
    tasinan: { ulkead: 'Area', urunad: 'Item' },
    /*
     * İşlenmiş ürünlerde FAO yalnızca 5510 (Production) yayımlıyor; alan/verim
     * sütunları bu ürünlerde zaten boş. Türkiye 2023 arpa birası ve çırçır
     * pamuğuyla doğrulandı (1.144.330 t ve 777.000 t, birebir).
     */
    elementSutun: { 5510: { deger: 'uretim_deger', birim: 'uretim_birim' } },
    /** Kapsam D1'in kendi ürün listesinden okunuyor — yeni ürün uydurulmuyor. */
    urunKodlariD1: 'SELECT DISTINCT urunkod k FROM fao_uretim_bitkisel_islenmis',
    urunKodAlani: 'Item Code',
  },

  'islenmis-hayvansal': {
    bicim: 'pivot',
    tablo: 'fao_uretim_hayvansal_islenmis',
    dosya: 'Production_Crops_Livestock_E_All_Data_(Normalized).zip',
    anahtar: { ulkekod: 'Area Code', urunkod: 'Item Code', year: 'Year' },
    tasinan: { ulkead: 'Area', urunad: 'Item' },
    elementSutun: { 5510: { deger: 'uretim_deger', birim: 'uretim_birim' } },
    urunKodlariD1: 'SELECT DISTINCT urunkod k FROM fao_uretim_hayvansal_islenmis',
    urunKodAlani: 'Item Code',
  },
};
