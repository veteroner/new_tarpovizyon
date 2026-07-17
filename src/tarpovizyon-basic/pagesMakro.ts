import type { Section } from './types';

export const MAKRO_SECTIONS: Section[] = [
  {
    label: 'Tarım Sektörü Makro Verileri',
    path: 'makro',
    pages: [
      {
        path: 'genel', label: 'Türkiye Tarım Sektörü Makro Verileri', template: 'makro-ozet',
        config: { title: 'TÜRKİYE TARIM SEKTÖRÜ MAKRO VERİLERİ' },
      },
      {
        path: 'tarim-ufe', label: 'Tarım Üretici Fiyat Endeksi', template: 'index-trend',
        config: {
          title: 'TARIM ÜRÜNLERİ ÜRETİCİ FİYAT ENDEKSİ (TARIM-ÜFE)',
          trendEndpoint: 'makro/ufe-aylik', trendValueField: 'tarim_ufe', trendChartTitle: 'Tarım ÜFE Yıllık Değişim (%)',
          snapshots: [
            {
              chartTitle: 'Alt Gruplara Göre Tarım-ÜFE Yıllık Değişim Oranı (%)',
              endpoint: 'makro/ufe-alt-grup-snapshot', nameField: 'tur', valueField: 'yillik_degisim', referenceName: 'Tarım-ÜFE',
            },
          ],
        },
      },
      {
        path: 'tarim-ufe-detay', label: 'Alt Gruplara Göre Tarım Üretici Fiyat Endeksi', template: 'index-trend',
        config: {
          title: 'TARIM ÜRÜNLERİ ÜRETİCİ FİYAT ENDEKSİ',
          trendEndpoint: 'makro/ufe-aylik', trendValueField: 'tarim_ufe', trendChartTitle: 'Tarım ÜFE Yıllık Değişim (%)',
          snapshots: [
            {
              chartTitle: 'Alt Gruplara Göre Tarım-ÜFE Değişim Oranı (%)',
              endpoint: 'makro/ufe-detay-snapshot', nameField: 'alt_grup', valueField: 'yillik_degisim', referenceName: 'Tarım ÜFE (genel)',
            },
          ],
        },
      },
      {
        path: 'tarimsal-gfe', label: 'Tarımsal Girdi Fiyat Endeksi', template: 'index-trend',
        config: {
          title: 'TARIMSAL GİRDİ FİYAT ENDEKSİ (GFE)',
          trendEndpoint: 'makro/gfe-alt-grup-aylik', trendValueField: 'yillik_degisim',
          trendFilter: { param: 'alt_grup', value: 'Tarımsal Girdi Fiyat Endeksi' },
          trendChartTitle: 'Tarımsal Girdi Fiyat Endeksi Yıllık Değişim Oranı (%)',
          snapshots: [
            {
              chartTitle: 'Alt Gruplara Göre Tarım-GFE Yıllık Değişim Oranı (%)',
              endpoint: 'makro/gfe-latest', nameField: 'alt_grup', valueField: 'yillik_degisim', referenceName: 'Tarımsal Girdi Fiyat Endeksi',
            },
          ],
        },
      },
      {
        path: 'tarimsal-gfe-detay', label: 'Alt Gruplara Göre Tarımsal Girdi Fiyat Endeksi', template: 'gfe-breakdown',
        config: { title: 'TARIMSAL GİRDİ FİYAT ENDEKSİ' },
      },
      {
        path: 'tufe', label: 'Tüketici Fiyat Endeksi', template: 'index-trend',
        config: {
          title: 'TÜKETİCİ FİYAT ENDEKSİ (TÜFE)',
          trendEndpoint: 'makro/tufe-aylik', trendValueField: 'tufe', trendChartTitle: 'TÜFE Yıllık Değişim (%)',
          snapshots: [
            {
              chartTitle: 'Ana Gruplara Göre TÜFE Yıllık Değişim Oranı (%)',
              endpoint: 'makro/tufe-yillik-snapshot', nameField: 'harcama_grubu', valueField: 'yillik_degisim', referenceName: 'TÜFE (Genel Endeks)',
            },
            {
              chartTitle: 'Ana Gruplara Göre TÜFE Aylık Değişim Oranı (%)',
              endpoint: 'makro/tufe-aylik-snapshot', nameField: 'harcama_grubu', valueField: 'aylik_degisim',
            },
          ],
        },
      },
      {
        path: 'fao-endeksi', label: 'FAO Gıda ve Emtia Endeksi', template: 'fao-index',
        config: { title: 'FAO GIDA VE EMTİA ENDEKSİ' },
      },
      {
        path: 'endeks-karsilastirma', label: 'Fiyat Endekslerinde Değişim', template: 'endeks-karsilastirma',
        config: { title: 'FİYAT ENDEKSLERİNDE DEĞİŞİM' },
      },
    ],
  },
];
