/* Vitrin grup listesi — bileşen dosyasından ayrıldı ki hızlı yenileme çalışsın. */

import { proSurumu } from '../../utils/surum';

/*
 * ─── LİSTENİN KENDİSİ DE SÜRÜME GÖRE ────────────────────────────────────────
 * Önceki hâlde yalnız YOLLAR `surumYolu()` ile seçiliyordu; grup adları ve
 * sayısı her iki sürümde de aynıydı. Sonuç: Pro alan adında vitrin başlığı
 * Basic'in dört grubunu gösteriyordu — "Makro Veriler, Hayvancılık, Bitkisel
 * Üretim, Bölgesel Veriler". Hedefler Pro'ya gidiyordu ama YAPI Basic'ten
 * kalmaydı, oysa Pro'nun kendi menüsü sekiz kategori.
 *
 * Ölçüldü (pro.tarpovizyon.com): Pro VERİ sayfaları kendi başlığını çiziyor
 * (`tarpo-topbar` — PRO rozeti, Dünya/Türkiye kapsam anahtarı, Emtia,
 * Araçlar). Ama vitrin sayfaları (`/tarpovizyon/pro`, `/giris`, `/piyasa`,
 * `/asistan`) `VitrinHeader` kullanıyor ve orada Basic yapısı görünüyordu.
 *
 * Artık iki ayrı liste var. Ortak nokta yalnızca `VitrinHeader`'ın çizim
 * biçimi; içerik her sürümün kendi bölümlemesi.
 *
 * ─── ALAN ADI KURALINA DOKUNULMADI ──────────────────────────────────────────
 * Seçim `proSurumu()` ile ÇALIŞMA ANINDA yapılıyor. Aynı derleme iki alan adı
 * birden sunuyor; derleme anında sabitlemek, bir dönem www'de Pro'nun
 * yayınlanmasına yol açan hatanın ta kendisiydi (utils/surum.ts).
 */

export type VitrinGrubu = {
  ad: string;
  /** Tıklanınca gidilecek sayfa. */
  yol: string;
  /** "Hangi grup etkin" işaretinin eşleştiği önek. */
  kok: string;
};

/*
 * Pro bölümlemesi — `components/nav/menu.ts` içindeki kategorilerle aynı
 * adlar. Sekiz kategoriden altısı burada: "Kaynak ve Çevre" ağırlıklı olarak
 * Dünya kapsamında ve vitrin başlığı Türkiye'ye bakıyor, "Araçlar" ise Pro'nun
 * kendi üst şeridinde zaten var.
 */
const PRO_GRUPLARI: VitrinGrubu[] = [
  { ad: 'Genel Bakış', yol: '/tarpovizyon/turkey/overview', kok: '/tarpovizyon/turkey/overview' },
  { ad: 'Fiyat ve Ekonomi', yol: '/tarpovizyon/turkey/price-index', kok: '/tarpovizyon/turkey/price-index' },
  { ad: 'Bitkisel Üretim', yol: '/tarpovizyon/turkey/plant-production', kok: '/tarpovizyon/turkey/plant-production' },
  { ad: 'Hayvansal Üretim', yol: '/tarpovizyon/turkey/animal-production', kok: '/tarpovizyon/turkey/animal-production' },
  { ad: 'Dış Ticaret', yol: '/tarpovizyon/turkey/trade', kok: '/tarpovizyon/turkey/trade' },
  { ad: 'İl Bazında', yol: '/tarpovizyon/turkey/provincial', kok: '/tarpovizyon/turkey/provincial' },
];

/** Basic bölümlemesi — `tarpovizyon-basic/pages.ts` gruplarıyla aynı. */
const BASIC_GRUPLARI: VitrinGrubu[] = [
  { ad: 'Makro Veriler', yol: '/tarpovizyon-basic/makro/genel', kok: '/tarpovizyon-basic/makro' },
  { ad: 'Hayvancılık', yol: '/tarpovizyon-basic/genel/hayvansal-uretim', kok: '/tarpovizyon-basic/genel' },
  { ad: 'Bitkisel Üretim', yol: '/tarpovizyon-basic/bitkisel-genel/uretim-ozeti', kok: '/tarpovizyon-basic/bitkisel' },
  { ad: 'Bölgesel Veriler', yol: '/tarpovizyon-basic/il-duzeyinde/bitkisel-uretim', kok: '/tarpovizyon-basic/il-duzeyinde' },
];

export const GRUPLAR: VitrinGrubu[] = proSurumu() ? PRO_GRUPLARI : BASIC_GRUPLARI;
