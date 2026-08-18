/**
 * FAO bulk veri setleri → D1 (`tarpovizyon-dunya`) eşlemeleri.
 *
 * ─── NEDEN BULK ─────────────────────────────────────────────────────────────
 * FAOSTAT'ın JSON servisi (faostatservices.fao.org/api/v1) artık yetki istiyor
 * (401 "Missing Authorization Header"). Bulk zip'ler ise açık ve
 * `bulks-faostat.fao.org/production/datasets_E.json` her veri setinin güncelleme
 * tarihini veriyor. Bu yüzden kaynak bulk.
 *
 * ─── TÜRKÇE SÜTUNLAR ────────────────────────────────────────────────────────
 * Tablolardaki `element_tr` / `item_tr` sütunları FAO'da YOK — elle çevrilmiş.
 * Yeni yıl eklerken bunlar, aynı kodun D1'de zaten bulunan çevirisinden
 * taşınıyor. Çevirisi olmayan yeni bir kod gelirse satır yine yazılıyor ama
 * `_tr` boş kalıyor ve rapor bunu sayıyor — sessizce kaybolmasın.
 *
 * ─── SADECE YENİ YIL ────────────────────────────────────────────────────────
 * Var olan yıllara dokunulmuyor. FAO geçmişi revize ediyor ama burada revizyon
 * takibi yok; amaç eksik yılları tamamlamak. Bir yılı yeniden yüklemek
 * gerekirse önce elle silinmeli.
 */

export const BULK_KOK = 'https://bulks-faostat.fao.org/production/';

/** FAO normalize CSV'sinde ortak sütun adları. */
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
  'land-cover': {
    tablo: 'fao_land_cover',
    dosya: 'Environment_LandCover_E_All_Data_(Normalized).zip',
    // D1 sütunu → CSV sütunu. Burada olmayan D1 sütunları sabit/çeviri.
    esleme: { ...ORTAK },
    sabit: { domain: 'LC' },
    ceviri: { element_tr: 'elementcode', item_tr: 'itemcode' },
  },
  'pestisit': {
    tablo: 'fao_input_pestisit_use',
    dosya: 'Inputs_Pesticides_Use_E_All_Data_(Normalized).zip',
    esleme: { ...ORTAK },
    sabit: { domaincode: 'RP' },
    ceviri: { element_tr: 'elementcode', item_tr: 'itemcode' },
  },
  'gubre': {
    tablo: 'fao_input_gubre_ticari',
    dosya: 'Inputs_FertilizersProduct_E_All_Data_(Normalized).zip',
    esleme: { ...ORTAK },
    sabit: { domaincode: 'RFP' },
    ceviri: { element_tr: 'elementcode', item_tr: 'itemcode' },
  },
};
