import type { Section } from './types';

export const IL_DUZEYINDE_SECTIONS: Section[] = [
  {
    label: 'İl Düzeyinde Sektörel Veriler',
    path: 'il-duzeyinde',
    pages: [
      {
        path: 'bitkisel-uretim', label: 'İl Düzeyinde Bitkisel Üretim', template: 'il-bitkisel-uretim',
        config: { title: 'İL DÜZEYİNDE BİTKİSEL ÜRETİM' },
      },
      {
        path: 'havza-urun-deseni', label: 'Üretim Planlaması Havza Ürün Deseni', template: 'havza-urun-deseni',
        config: { title: 'ÜRETİM PLANLAMASI HAVZA ÜRÜN DESENİ' },
      },
      {
        path: 'hayvansal-uretim', label: 'İl Düzeyinde Hayvansal Üretim', template: 'il-hayvansal-uretim',
        config: { title: 'İL DÜZEYİNDE HAYVANSAL ÜRETİM' },
      },
      {
        path: 'aricilik', label: 'İl Düzeyinde Arıcılık Verileri', template: 'il-aricilik',
        config: { title: 'İL DÜZEYİNDE ARICILIK VERİLERİ' },
      },
      {
        path: 'cografi-isaret', label: 'İllerin Coğrafi İşaretli Ürünleri', template: 'il-cografi-isaret',
        config: { title: 'İLLERİN COĞRAFİ İŞARETLİ TARIM ÜRÜNLERİ' },
      },
    ],
  },
];
