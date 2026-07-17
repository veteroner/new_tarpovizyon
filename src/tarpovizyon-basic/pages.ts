import type { PageDef, Section, NavGroup } from './types';
import { BITKISEL_SECTIONS } from './pagesBitkisel';
import { MAKRO_SECTIONS } from './pagesMakro';
import { IL_DUZEYINDE_SECTIONS } from './pagesIlDuzeyinde';

export type { PageDef, Section, NavGroup };

const HAYVANSAL_SECTIONS: Section[] = [
  {
    label: 'Küresel Hayvancılık Verileri',
    path: 'kuresel',
    pages: [
      {
        path: 'hayvansal-urunler', label: 'Hayvansal Ürünler', template: 'ranking',
        config: { title: 'KÜRESEL ÜRETİM VERİLERİ', endpoint: 'global/uretim', nameField: 'ulke', valueField: 'uretim_miktari_ton', kpiLabel: 'Üretim Miktarı', kpiUnit: 'Ton', filterField: 'urun', filterLabel: 'Ürün' },
      },
      {
        path: 'hayvan-varliklari', label: 'Hayvan Varlıkları', template: 'ranking',
        config: { title: 'KÜRESEL HAYVAN VARLIKLARI', endpoint: 'global/hayvan-sayilari-detay', nameField: 'ulke', valueField: 'deger', kpiLabel: 'Toplam Hayvan Varlığı', filterField: 'hayvan_turu', filterLabel: 'Hayvan' },
      },
      {
        path: 'sigir-karkas-et-verimleri', label: 'Sığır Karkas Et Verimleri', template: 'ranking',
        config: { title: 'ÜLKELERE GÖRE SIĞIR KARKAS ET VERİMLERİ', endpoint: 'global/karkas-agirligi', nameField: 'ulke', valueField: 'karkas_verimi_kg', kpiLabel: 'Karkas Verimi', kpiUnit: 'Kg', kpiAggregation: 'none' },
      },
      {
        path: 'sigir-eti-uretimi', label: 'Ülkelere Göre Sığır Eti Üretimi', template: 'ranking',
        config: { title: 'ÜLKELERE GÖRE SIĞIR ETİ ÜRETİMİ', endpoint: 'global/uretim', nameField: 'ulke', valueField: 'uretim_miktari_ton', kpiLabel: 'Sığır Eti Üretimi', kpiUnit: 'Ton', filterField: 'urun', filterLabel: 'Ürün' },
      },
      {
        path: 'inek-sutu-verimleri', label: 'İnek Sütü Verimleri', template: 'ranking',
        config: { title: 'ÜLKELERE GÖRE ÇİĞ SÜT ÜRETİMİ', endpoint: 'global/uretim', nameField: 'ulke', valueField: 'uretim_miktari_ton', kpiLabel: 'Çiğ Süt Üretimi', kpiUnit: 'Ton', filterField: 'urun', filterLabel: 'Ürün' },
      },
      {
        path: 'kisi-basi-et-tuketimi', label: 'Kişi Başı Et Tüketimi', template: 'stacked-comparison',
        config: {
          title: 'ÜLKELERE GÖRE KİŞİ BAŞI ET TÜKETİMİ (KG)', endpoint: 'global/et-tuketimi-karsilastirma', nameField: 'ulke',
          series: [
            { key: 'sigir_eti', label: 'Sığır Eti' },
            { key: 'domuz_eti', label: 'Domuz Eti' },
            { key: 'kanatli_eti', label: 'Kanatlı Eti' },
            { key: 'balik_deniz_urunleri', label: 'Balık ve Deniz Ürünleri' },
            { key: 'koyun_keci_eti', label: 'Koyun Keçi Eti' },
          ],
        },
      },
      {
        path: 'karkas-et-fiyatlari', label: 'Karkas Et Fiyatları', template: 'stat-tiles',
        config: {
          title: 'TÜRKİYE KARKAS ET FİYAT GÖSTERGELERİ', endpoint: 'kirmizi-et/ekonomik-gostergeler', dateField: 'tarih',
          tiles: [
            { field: 'dana_karkas_fiyati_tl_kg', label: 'Dana Karkas Fiyatı', unit: 'TL/Kg' },
            { field: 'kuzu_karkas_fiyati_tl_kg', label: 'Kuzu Karkas Fiyatı', unit: 'TL/Kg' },
            { field: 'dana_karkas_maliyet_tl_kg', label: 'Dana Karkas Maliyeti', unit: 'TL/Kg' },
            { field: 'karkas_paritesi', label: 'Karkas Paritesi' },
          ],
        },
      },
      {
        path: 'cig-sut-fiyatlari', label: 'Çiğ Süt Fiyatları', template: 'stat-tiles',
        config: {
          title: 'TÜRKİYE ÇİĞ SÜT FİYAT GÖSTERGELERİ', endpoint: 'cig-sut/ekonomik-gostergeler', dateField: 'tarih',
          tiles: [
            { field: 'uretim_maliyeti_tl_lt', label: 'Üretim Maliyeti', unit: 'TL/Lt' },
            { field: 'usk_tavsiye_fiyat_tl_lt', label: 'USK Tavsiye Fiyatı', unit: 'TL/Lt' },
            { field: 'sut_yem_paritesi', label: 'Süt/Yem Paritesi' },
            { field: 'karlilik', label: 'Karlılık' },
          ],
        },
      },
    ],
  },
  {
    label: 'Genel Hayvancılık Verileri',
    path: 'genel',
    pages: [
      {
        path: 'turkiye-hayvan-varligi', label: 'Türkiye Hayvan Varlığı', template: 'yearly',
        config: {
          title: 'TÜRKİYE HAYVAN VARLIĞI', endpoint: 'tr/hayvan-varliklari', xField: 'tarih', xFormat: 'year',
          series: [
            { key: 'sigir_bas', label: 'Sığır', type: 'bar' },
            { key: 'koyun_bas', label: 'Koyun', type: 'bar' },
            { key: 'keci_bas', label: 'Keçi', type: 'bar' },
          ],
        },
      },
      {
        path: 'hayvansal-urunlerde-verim', label: 'Hayvansal Ürünlerde Verim', template: 'yearly',
        config: {
          title: 'HAYVANSAL ÜRETİMDE VERİM', endpoint: 'tr/verimlilikler', xField: 'yil', xFormat: 'year',
          series: [
            { key: 'cig_sut_verimi_lt', label: 'İnek Sütü Verimi (Lt/Baş)', type: 'bar' },
            { key: 'buyukbas_karkas_et_verimi_kg', label: 'Büyükbaş Karkas Et Verimi (Kg)', type: 'line' },
            { key: 'kucukbas_karkas_et_verimi_kg', label: 'Küçükbaş Karkas Et Verimi (Kg)', type: 'line' },
            { key: 'bal_verimi_kg', label: 'Bal Verimi (Kg/Kovan)', type: 'line' },
          ],
        },
      },
      {
        path: 'kisi-basina-tuketim', label: 'Kişi Başına Hayvansal Ürün Tüketim Miktarları', template: 'gauge-grid',
        config: {
          title: 'KİŞİ BAŞINA HAYVANSAL ÜRÜN TÜKETİM MİKTARLARI', endpoint: 'tr/kisi-basina-guncel-tuketim',
          gauges: [
            { field: 'kirmizi_et_kg', label: 'Kırmızı Et Tüketimi (Kg)', max: 50 },
            { field: 'toplam_sut_litre', label: 'Süt Tüketimi (Lt)', max: 500 },
            { field: 'pilic_eti_kg', label: 'Kanatlı Eti Tüketimi (Kg)', max: 50 },
            { field: 'yumurta_adet', label: 'Yumurta Tüketimi (Adet)', max: 300 },
            { field: 'bal_kg', label: 'Bal Tüketimi (Kg)', max: 5 },
            { field: 'balik_deniz_urunleri', label: 'Balık ve Deniz Ürünleri (Kg)', max: 20 },
          ],
        },
      },
    ],
  },
  {
    label: 'Türkiye Dış Ticaret Verileri',
    path: 'dis-ticaret',
    pages: [
      { path: 'hayvansal', label: 'Hayvansal Dış Ticaret', template: 'trade', config: { endpoint: 'dis-ticaret/hayvansal' } },
    ],
  },
  {
    label: 'Çiğ Süt Sektörü',
    path: 'cig-sut',
    pages: [
      {
        path: 'uretim-yeterlilik', label: 'Üretim, Dış Ticaret ve Yeterlilik Düzeyi', template: 'yearly',
        config: {
          title: 'ÇİĞ SÜT SEKTÖRÜ', endpoint: 'cig-sut/uretim-miktari', xField: 'yil',
          series: [
            { key: 'buyukbas_sut_uretimi_ton', label: 'Büyükbaş Süt Üretimi (Ton)', type: 'bar' },
            { key: 'kucukbas_sutu_uretimi_ton', label: 'Küçükbaş Süt Üretimi (Ton)', type: 'bar' },
          ],
          kpiField: 'buyukbas_sut_uretimi_ton', kpiLabel: 'Büyükbaş Süt Üretimi', kpiUnit: 'Ton',
          secondKpiField: 'kucukbas_sutu_uretimi_ton', secondKpiLabel: 'Küçükbaş Süt Üretimi',
          gauge: { endpoint: 'tr/yeterlilikler', field: 'sut_ton', label: 'Yeterlilik Oranı' },
          tradeSection: {
            title: 'Süt ve Ürünleri Dış Ticareti',
            urunler: [
              'Diğer peynirler', 'Diğer tabii süt ürünleri', 'Eritme peynirler (rendelenmemiş/toz haline getirilmemiş)',
              'Konsantre Süt', 'Mavi küflü peynirler ve küf içeren diğer peynirler', 'Peynir altı suyu tozu',
              'Rendelenmiş/toz haline getirilmiş her cins peynir', 'Sürülerek yenilen süt ürünleri', 'Süt ve Krema',
              'Sütten elde edilen diğer yağlar', 'Taze peynirler', 'Tereyağı', 'Yağlı Süt Tozu', 'Yağsız Süt Tozu',
              'Yoğurt, ayran, kefir vb.',
            ],
          },
        },
      },
      {
        path: 'sut-urunleri-uretimi', label: 'Süt Ürünleri Üretimi', template: 'stat-tiles',
        config: {
          title: 'SÜT VE SÜT ÜRÜNLERİ ÜRETİMİ', endpoint: 'cig-sut/urun-uretimi', dateField: 'tarih',
          tiles: [
            { field: 'inek_sutu_ton', label: 'Sanayiye Giden İnek Sütü', unit: 'Ton' },
            { field: 'inek_peyniri_ton', label: 'İnek Peyniri Üretimi', unit: 'Ton' },
            { field: 'icme_sutu_ton', label: 'İçme Sütü Üretimi', unit: 'Ton' },
            { field: 'yagsiz_sut_tozu_ton', label: 'Yağsız Süt Tozu Üretimi', unit: 'Ton' },
            { field: 'yogurt_ton', label: 'Yoğurt Üretimi', unit: 'Ton' },
            { field: 'tereyagi_ton', label: 'Tereyağı Üretimi', unit: 'Ton' },
          ],
        },
      },
      {
        path: 'ekonomik-gostergeler', label: 'Ekonomik Göstergeler ve Maliyet Unsurları', template: 'stat-tiles',
        config: {
          title: 'EKONOMİK GÖSTERGELER VE MALİYET UNSURLARI', endpoint: 'cig-sut/ekonomik-gostergeler', dateField: 'tarih',
          tiles: [
            { field: 'uretim_maliyeti_tl_lt', label: 'Üretim Maliyeti', unit: 'TL/Lt' },
            { field: 'usk_tavsiye_fiyat_tl_lt', label: 'USK Tavsiye Fiyatı', unit: 'TL/Lt' },
            { field: 'sut_yem_paritesi', label: 'Süt/Yem Paritesi' },
            { field: 'litre_basina_destek_tl', label: 'Litre Başına Destek', unit: 'TL' },
            { field: 'fiyat_maliyet_farki_tl_lt', label: 'Fiyat-Maliyet Farkı', unit: 'TL/Lt' },
            { field: 'karlilik', label: 'Karlılık' },
          ],
        },
      },
    ],
  },
  {
    label: 'Kırmızı Et Sektörü',
    path: 'kirmizi-et',
    pages: [
      {
        path: 'uretim-yeterlilik', label: 'Üretim ve Yeterlilik Düzeyi', template: 'yearly',
        config: {
          title: 'KIRMIZI ET SEKTÖRÜ', endpoint: 'kirmizi-et/uretim-miktari', xField: 'yil',
          series: [
            { key: 'buyukbas_et_uretimi_ton', label: 'Büyükbaş Et Üretimi (Ton)', type: 'bar' },
            { key: 'kucukbas_et_uretimi_ton', label: 'Küçükbaş Et Üretimi (Ton)', type: 'bar' },
          ],
          kpiField: 'buyukbas_et_uretimi_ton', kpiLabel: 'Büyükbaş Et Üretimi', kpiUnit: 'Ton',
          secondKpiField: 'kucukbas_et_uretimi_ton', secondKpiLabel: 'Küçükbaş Et Üretimi',
          gauge: { endpoint: 'tr/yeterlilikler', field: 'kirmizi_et_ton', label: 'Yeterlilik Oranı' },
          tradeSection: {
            title: 'Kırmızı Et ve Canlı Hayvan Dış Ticareti',
            urunler: ['Damızlık Büyükbaş', 'Büyükbaş Kasaplık', 'Besilik Büyükbaş', 'Büyükbaş (sığır) Eti', 'Küçükbas Eti', 'Damızlık Küçükbaş', 'Küçükbaş Kasaplık'],
          },
        },
      },
      {
        path: 'ekonomik-gostergeler', label: 'Ekonomik Göstergeler ve Maliyet Unsurları', template: 'stat-tiles',
        config: {
          title: 'EKONOMİK GÖSTERGELER VE MALİYET UNSURLARI', endpoint: 'kirmizi-et/ekonomik-gostergeler', dateField: 'tarih',
          tiles: [
            { field: 'besi_yemi_fiyati_tl_kg', label: 'Besi Yemi Fiyatı', unit: 'TL/Kg' },
            { field: 'dana_karkas_maliyet_tl_kg', label: 'Dana Karkas Maliyeti', unit: 'TL/Kg' },
            { field: 'dana_karkas_fiyati_tl_kg', label: 'Dana Karkas Fiyatı', unit: 'TL/Kg' },
            { field: 'karlilik', label: 'Karlılık' },
          ],
        },
      },
      {
        path: 'fiyat-maliyet-durumu', label: 'Fiyat ve Maliyet Durumu', template: 'yearly',
        config: {
          title: 'DANA KARKAS FİYAT VE MALİYET DURUMU', endpoint: 'kirmizi-et/ekonomik-gostergeler', xField: 'tarih', xFormat: 'yearMonth',
          series: [
            { key: 'dana_karkas_maliyet_tl_kg', label: 'Maliyet (TL/Kg)', type: 'bar' },
            { key: 'dana_karkas_fiyati_tl_kg', label: 'Fiyat (TL/Kg)', type: 'line' },
          ],
        },
      },
      {
        path: 'dana-kuzu-karsilastirma', label: 'Dana ve Kuzu Karkas Fiyat Karşılaştırması', template: 'yearly',
        config: {
          title: 'DANA VE KUZU KARKAS FİYAT KARŞILAŞTIRMASI', endpoint: 'kirmizi-et/ekonomik-gostergeler', xField: 'tarih', xFormat: 'yearMonth',
          series: [
            { key: 'dana_karkas_fiyati_tl_kg', label: 'Dana Karkas Fiyatı', type: 'line' },
            { key: 'kuzu_karkas_fiyati_tl_kg', label: 'Kuzu Karkas Fiyatı', type: 'line' },
          ],
        },
      },
    ],
  },
  {
    label: 'Piliç Eti Sektörü',
    path: 'pilic-eti',
    pages: [
      {
        path: 'uretim-yeterlilik', label: 'Üretim, İhracat ve Yeterlilik Düzeyi', template: 'yearly',
        config: {
          title: 'KANATLI ETİ SEKTÖRÜ', endpoint: 'kanatli/uretimleri', xField: 'tarih', aggregateYearly: true,
          series: [{ key: 'tavuk_eti_ton', label: 'Tavuk Eti (Ton)', type: 'bar' }],
          kpiField: 'tavuk_eti_ton', kpiLabel: 'Tavuk Eti Üretimi', kpiUnit: 'Ton',
          gauge: { endpoint: 'tr/yeterlilikler', field: 'beyaz_et_ton', label: 'Yeterlilik Oranı' },
          tradeSection: { title: 'Piliç Eti Dış Ticareti', urunler: ['Piliç Eti'] },
        },
      },
      {
        path: 'ekonomik-gostergeler', label: 'Ekonomik Göstergeler ve Maliyet Unsurları', template: 'stat-tiles',
        config: {
          title: 'EKONOMİK GÖSTERGELER VE MALİYET UNSURLARI', endpoint: 'kanatli/maliyet-fiyat', dateField: 'tarih',
          tiles: [
            { field: 'maliyet_tl_kg', label: 'Üretim Maliyeti', unit: 'TL/Kg' },
            { field: 'uretici_fiyati_tl_kg', label: 'Üretici Fiyatı', unit: 'TL/Kg' },
            { field: 'yem_fiyati_tl_kg', label: 'Etlik Piliç Yemi', unit: 'TL/Kg' },
            { field: 'yem_paritesi', label: 'Piliç/Yem Paritesi' },
          ],
        },
      },
      {
        path: 'fiyat-maliyet-durumu', label: 'Fiyat ve Maliyet Durumu', template: 'yearly',
        config: {
          title: 'PİLİÇ ETİ FİYAT VE MALİYET DURUMU', endpoint: 'kanatli/maliyet-fiyat', xField: 'tarih', xFormat: 'yearMonth',
          series: [
            { key: 'maliyet_tl_kg', label: 'Maliyet (TL/Kg)', type: 'bar' },
            { key: 'uretici_fiyati_tl_kg', label: 'Üretici Fiyatı (TL/Kg)', type: 'line' },
          ],
        },
      },
    ],
  },
  {
    label: 'Sofralık Yumurta Sektörü',
    path: 'yumurta',
    pages: [
      {
        path: 'uretim-yeterlilik', label: 'Üretim, İhracat ve Yeterlilik Düzeyi', template: 'yearly',
        config: {
          title: 'SOFRALIK YUMURTA SEKTÖRÜ', endpoint: 'yumurta/maliyet-fiyat', xField: 'tarih', aggregateYearly: true,
          series: [{ key: 'toplam_ihracat_miktari_bin_adet', label: 'Toplam İhracat (Bin Adet)', type: 'bar' }],
          kpiField: 'toplam_ihracat_miktari_bin_adet', kpiLabel: 'Toplam Yumurta İhracatı', kpiUnit: 'Bin Adet',
          gauge: { endpoint: 'tr/yeterlilikler', field: 'yumurta_milyon_adet', label: 'Yeterlilik Oranı' },
          tradeSection: { title: 'Yumurta Dış Ticareti', urunler: ['Sofralik Tavuk Yumurtası (1000 Adet)', 'Kuluçkalık Tavuk Yumurtası (Adet)'] },
        },
      },
      {
        path: 'ekonomik-gostergeler', label: 'Ekonomik Göstergeler ve Maliyet Unsurları', template: 'stat-tiles',
        config: {
          title: 'EKONOMİK GÖSTERGELER VE MALİYET UNSURLARI', endpoint: 'yumurta/maliyet-fiyat', dateField: 'tarih',
          tiles: [
            { field: 'maliyet_tl_kg', label: 'Üretim Maliyeti', unit: 'TL/Kg' },
            { field: 'uretici_fiyati_tl_kg', label: 'Üretici Fiyatı', unit: 'TL/Kg' },
            { field: 'yem_paritesi', label: 'Yumurta/Yem Paritesi' },
            { field: 'karlilik', label: 'Karlılık' },
          ],
        },
      },
      {
        path: 'fiyat-maliyet-durumu', label: 'Fiyat ve Maliyet Durumu', template: 'yearly',
        config: {
          title: 'YUMURTA FİYAT VE MALİYET DURUMU', endpoint: 'yumurta/maliyet-fiyat', xField: 'tarih', xFormat: 'yearMonth',
          series: [
            { key: 'maliyet_tl_kg', label: 'Maliyet (TL/Kg)', type: 'bar' },
            { key: 'uretici_fiyati_tl_kg', label: 'Üretici Fiyatı (TL/Kg)', type: 'line' },
          ],
        },
      },
    ],
  },
];

// Four top-level nav categories mirroring the TARPOL landing page. Section paths
// stay globally unique, so routing (which is still driven by the flat SECTIONS
// list below) is unaffected by this grouping.
export const NAV_GROUPS: NavGroup[] = [
  { label: 'Makro Veriler', sections: MAKRO_SECTIONS },
  { label: 'Hayvancılık', sections: HAYVANSAL_SECTIONS },
  { label: 'Bitkisel Üretim', sections: BITKISEL_SECTIONS },
  { label: 'İl Düzeyinde Tarımsal Veriler', sections: IL_DUZEYINDE_SECTIONS },
];

export const SECTIONS: Section[] = NAV_GROUPS.flatMap((g) => g.sections);
