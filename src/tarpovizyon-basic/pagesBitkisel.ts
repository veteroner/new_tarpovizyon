import type { PageDef, Section } from './types';

// FAO's country-level tables also carry continent/subregion aggregate rows
// (e.g. "Asia", "Eastern Asia") mixed in with real countries — each one double-
// counts the countries within it. Must be excluded from any sum/ranking, same
// class of bug as the multi-grain trade-data overcounting fixed earlier.
const FAO_REGION_AGGREGATES = [
  'World',
  'Africa', 'Eastern Africa', 'Middle Africa', 'Northern Africa', 'Southern Africa', 'Western Africa',
  'Americas', 'Caribbean', 'Central America', 'Northern America', 'South America',
  'Asia', 'Central Asia', 'Eastern Asia', 'South-eastern Asia', 'Southern Asia', 'Western Asia',
  'Europe', 'Eastern Europe', 'Northern Europe', 'Southern Europe', 'Western Europe',
  'Oceania', 'Australia and New Zealand', 'Melanesia', 'Micronesia', 'Polynesia',
];

function cropPage(path: string, label: string, productionUrunler: string[], tradeUrunler: string[]): PageDef {
  return {
    path, label, template: 'crop-sector',
    config: { title: label.toUpperCase() + ' SEKTÖRÜ', productionUrunler, tradeUrunler },
  };
}

const TARLA_BITKILERI: PageDef[] = [
  cropPage('bugday', 'Buğday', ['Buğday, Durum Buğdayı Hariç', 'Durum Buğdayı'], ['Buğday']),
  cropPage('arpa', 'Arpa', ['Arpa (Diğer)', 'Arpa (Biralık)'], ['Arpa']),
  cropPage('misir', 'Mısır', ['Mısır'], ['Mısır']),
  cropPage('pamuk', 'Pamuk', ['Pamuk, Çırçırlanmamış (Kütlü)'], ['Pamuk']),
  cropPage('aycicegi', 'Ayçiçeği', ['Ayçiçeği Tohumu (Çerezlik)', 'Ayçiçeği Tohumu (Yağlık)'], ['Ayçiçeği']),
  cropPage('nohut', 'Nohut', ['Nohut, Kuru'], ['Nohut']),
  cropPage('mercimek-kirmizi', 'Mercimek (Kırmızı)', ['Mercimek, Kuru (Kırmızı)'], ['Mercimek (Kırmızı)']),
  cropPage('mercimek-yesil', 'Mercimek (Yeşil)', ['Mercimek, Kuru (Yeşil)'], ['Mercimek (Yeşil)']),
  cropPage('fasulye-kuru', 'Fasülye (Kuru)', ['Fasulye, Kuru'], ['Fasulye (Kuru)']),
  cropPage('soya', 'Soya', ['Soya Fasulyesi'], ['Soya']),
  cropPage('kolza', 'Kolza (Kanola)', ['Kanola Veya Kolza Tohumu'], ['Kolza (Kanola)']),
  cropPage('seker-pancari', 'Şeker Pancarı', ['Şeker Pancarı'], ['Şekerpancarı']),
  cropPage('aspir', 'Aspir', ['Aspir Tohumu'], ['Aspir']),
  cropPage('celtik', 'Çeltik', ['Çeltik'], ['Çeltik']),
  cropPage('patates', 'Patates', ['Patates (Tatlı Patates Hariç)'], ['Patates']),
];

const MEYVELER: PageDef[] = [
  cropPage('antep-fistigi', 'Antep Fıstığı', ['Şam Fıstığı (Antep Fıstığı)'], ['Antep Fıstığı']),
  cropPage('armut', 'Armut', ['Armut'], ['Armut']),
  cropPage('badem', 'Badem', ['Badem'], ['Badem']),
  cropPage('ceviz', 'Ceviz', ['Ceviz'], ['Ceviz']),
  cropPage('elma', 'Elma', ['Elma (Amasya)', 'Elma (Golden)', 'Elma (Granny Smith)', 'Elma (Starking)', 'Diğer Elmalar'], ['Elma']),
  cropPage('seftali', 'Şeftali', ['Şeftali'], ['Şeftali-Nektarin']),
  cropPage('cilek', 'Çilek', ['Çilek'], ['Çilek']),
  cropPage('findik', 'Fındık', ['Fındık'], ['Fındık']),
  cropPage('greyfurt', 'Greyfurt', ['Greyfurt (Altıntop)'], ['Greyfurt']),
  cropPage('incir-yas', 'İncir (Yaş)', ['İncir (Yaş)'], ['İncir (Yaş)']),
  cropPage('incir-kuru', 'İncir (Kuru)', ['İncir (Yaş)'], ['İncir (Kuru)']),
  cropPage('kayisi-yas', 'Kayısı (Yaş)', ['Kayısı'], ['Kayısı (Yaş)']),
  cropPage('kayisi-kuru', 'Kayısı (Kuru)', ['Kayısı'], ['Kayısı (Kuru)']),
  cropPage('kiraz', 'Kiraz', ['Kiraz'], ['Kiraz']),
  cropPage('limon', 'Limon', ['Limon Ve Misket Limonu'], ['Limon']),
  cropPage('mandalina', 'Mandalina', ['Mandalina (Diğer)', 'Mandalina (King)', 'Mandalina (Klemantin)', 'Mandalina (Satsuma)'], ['Mandarin']),
  cropPage('muz', 'Muz', ['Muz, Plantain Ve Benzerleri'], ['Muz']),
  cropPage('nar', 'Nar', ['Nar'], ['Nar']),
  cropPage('uzum-yas', 'Üzüm (Yaş)', ['Sofralık Üzüm, Çekirdekli', 'Sofralık Üzüm, Çekirdeksiz'], ['Üzüm (Taze)']),
  cropPage('uzum-kuru', 'Üzüm (Kuru)', ['Kurutmalık Üzüm, Çekirdekli', 'Kurutmalık Üzüm, Çekirdeksiz'], ['Üzüm (Kuru)']),
  cropPage('portakal', 'Portakal', ['Portakal (Washington)', 'Portakal (Yafa)', 'Diğer Portakallar'], ['Portakal']),
  cropPage('zeytin', 'Zeytin', ['Sofralık Zeytinler', 'Yağlık Zeytinler (Zeytinyağı Üretimi İçin)'], ['Zeytin']),
  cropPage('zeytinyagi', 'Zeytinyağı', ['Yağlık Zeytinler (Zeytinyağı Üretimi İçin)'], ['Zeytinyağı']),
];

const SEBZELER: PageDef[] = [
  cropPage('biber', 'Biber', ['Biber (Çarliston)', 'Biber (Dolmalık)', 'Biber (Salçalık, Kapya)', 'Biber (Sivri)'], ['Biber']),
  cropPage('domates', 'Domates', ['Domates (Salçalık)', 'Domates (Sofralık)'], ['Domates']),
  cropPage('hiyar', 'Hıyar', ['Hıyar (Sofralık)', 'Hıyar (Turşuluk)'], ['Hıyar']),
  cropPage('karpuz', 'Karpuz', ['Karpuz'], ['Karpuz']),
  cropPage('kavun', 'Kavun', ['Kavun'], ['Kavun']),
  cropPage('sogan', 'Soğan', ['Soğan (Kuru)'], ['Soğan (Kuru)']),
  cropPage('sarimsak', 'Sarımsak', ['Sarımsak (Kuru)'], ['Sarımsak']),
];

export const BITKISEL_SECTIONS: Section[] = [
  {
    label: 'Bitkisel — Genel',
    path: 'bitkisel-genel',
    pages: [
      {
        path: 'kuresel-uretim', label: 'Küresel Üretim Verileri', template: 'ranking',
        config: {
          title: 'KÜRESEL ÜRETİM VERİLERİ', endpoint: 'bitkisel/global-uretim', nameField: 'ulke', valueField: 'uretim_ton',
          kpiLabel: 'Üretim Miktarı', kpiUnit: 'Ton', filterField: 'urun', filterLabel: 'Ürün',
          excludeNames: FAO_REGION_AGGREGATES, yearField: 'yil',
          secondaryField: 'ekilen_alan_ha', secondaryLabel: 'Toplam Ekilen Alan', secondaryUnit: 'Ha',
          yieldField: { productionField: 'uretim_ton', areaField: 'ekilen_alan_ha', label: 'Ortalama Verim', unit: 'Ton/Ha' },
        },
      },
      { path: 'dis-ticaret', label: 'Türkiye Dış Ticaret Verileri', template: 'trade', config: { endpoint: 'bitkisel/dis-ticaret', modul: 'bitkisel' } },
      {
        path: 'tr-uretim-miktari', label: 'Türkiye Bitkisel Üretim Miktarı', template: 'crop-sector',
        config: {
          title: 'TÜRKİYE TOPLAM BİTKİSEL ÜRETİM', productionUrunler: ['Buğday, Durum Buğdayı Hariç', 'Durum Buğdayı', 'Arpa (Diğer)', 'Mısır', 'Çeltik'],
          tradeUrunler: ['Buğday', 'Arpa', 'Mısır', 'Çeltik'],
        },
      },
    ],
  },
  { label: 'Tarla Bitkileri', path: 'tarla-bitkileri', pages: TARLA_BITKILERI },
  { label: 'Meyveler', path: 'meyveler', pages: MEYVELER },
  { label: 'Sebzeler', path: 'sebzeler', pages: SEBZELER },
];
