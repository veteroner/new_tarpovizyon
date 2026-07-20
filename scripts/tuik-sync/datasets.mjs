/**
 * TÜİK veri seti → D1 tablosu eşleştirmeleri.
 *
 * Kod listeleri TÜİK'in DSD'sinden (`?references=all`) alınmış ve yazmadan önce
 * D1'deki mevcut kayıtlarla birebir doğrulanmıştır. Bir kod listesi değişirse
 * senkron sessizce yanlış sütuna yazmasın diye çalışma anında kontrol edilir.
 *
 * kind:
 *   'wide' → bir dönem = bir satır, ürünler ayrı sütunlarda
 *   'long' → bir gözlem = bir satır
 */

export const DATASETS = [
  {
    kind: 'wide',
    name: 'Süt ve süt ürünleri (aylık)',
    flow: 'DF_SUT_URUNLERI_AYLIK_V2',
    version: '1.0',
    productDim: 'SUT_URUN_AYLIK',
    filter: { FREQ: 'M' },
    table: 'sut_urunleri_uretimi',
    periodColumn: 'tarih',
    decimals: 0,
    columns: {
      inek_sutu_ton: '1',
      icme_sutu_ton: '6',
      kaymak_ton: '7',
      sut_tozu_ton: '9',
      yagsiz_sut_tozu_ton: '10',
      tereyagi_ton: '11',
      inek_peyniri_ton: '12',
      diger_peynir_ton: '13',
      yogurt_ton: '14',
      ayran_ton: '15',
    },
  },
  {
    kind: 'wide',
    name: 'Kümes hayvancılığı ürünleri (yumurta / beyaz et)',
    flow: 'DF_KUMES_HAYVANCILIK_URUN_V1',
    version: '1.0',
    productDim: 'KUMES_HY_URUN',
    filter: { FREQ: 'M' },
    table: 'kanatli_uretimleri',
    periodColumn: 'tarih',
    decimals: 0,
    columns: {
      tavuk_yumurtasi_bin_adet: '1',
      tavuk_eti_ton: '3',
    },
  },
  {
    kind: 'long',
    name: 'Tarım ürünleri ÜFE (yıllık değişim)',
    flow: 'DF_TARIM_URUNLERI_UFE_DEGISIM_V1',
    version: '1.0',
    // DEGISIM=4 → bir önceki yılın aynı ayına göre değişim, RO → oran,
    // TAORBA kodu A → genel endeks.
    filter: { FREQ: 'M', DEGISIM: '4', UNIT_MEASURE: 'RO', TAORBA_2008_2_678: 'A' },
    table: 'ufe_aylik',
    valueColumn: 'tarim_ufe',
    decimals: 2,
  },
  {
    kind: 'long',
    name: 'Tarımsal girdi fiyat endeksi (alt gruplar, yıllık değişim)',
    flow: 'DF_TARIMSAL_GIRDI_FIYAT_ENDEKSI_DEGISIM_V2',
    version: '1.0',
    filter: { FREQ: 'M', DEGISIM: '4', UNIT_MEASURE: 'RO' },
    table: 'gfe_alt_grup_aylik',
    labelDim: 'TARIMSAL_FIYAT_1437',
    labelColumn: 'alt_grup',
    valueColumn: 'yillik_degisim',
    decimals: 2,
    // TÜİK'te ana seri 2016'ya kadar geriye gidiyor, alt gruplar ise 2021'de
    // başlıyor. Sınır koymazsak tabloya yalnızca ana serinin uzandığı tırtıklı
    // bir geçmiş eklenir ve grafik yanıltıcı olur.
    minPeriod: '2021-01',
    // TÜİK başlıkları Title Case, D1 cümle düzeninde tutuyor. Ön yüzün bağlı
    // olduğu yazımı bozmamak için D1'deki hâli yazılır.
    labels: {
      2: 'Tarımsal Girdi Fiyat Endeksi',
      20: 'Tarımda kullanılan mal ve hizmetler (Girdi 1)',
      21: 'Tarımsal yatırıma katkı sağlayan mal ve hizmetler (Girdi 2)',
      '20_1': 'Tohum ve dikim materyali',
      '20_2': 'Enerji ve yağlayıcılar',
      '20_3': 'Gübre ve toprak geliştiriciler',
      '20_4': 'Tarımsal ilaçlar',
      '20_5': 'Veteriner harcamaları',
      '20_6': 'Hayvan yemi',
      '20_7': 'Makine bakım masrafları',
      '20_8': 'Bina bakım masrafları',
      '20_9': 'Diğer mal ve hizmetler',
      '21_1': 'Malzemeler',
      '21_2': 'Binalar',
      '20_3_1': 'Düz gübreler',
      '20_3_2': 'Bileşik gübreler',
      '20_4_1': 'Fungusitler (mantar öldürücü ilaçlar)',
      '20_4_2': 'İnsektisitler (böcek ve haşere ilaçları)',
      '20_4_3': 'Herbisitler (ot öldürücü İlaç)',
      '20_4_9': 'Diğer tarımsal ilaçlar',
      '20_6_1': 'Kaba yemler',
      '20_6_2': 'Kesif yemler',
    },
  },
];
