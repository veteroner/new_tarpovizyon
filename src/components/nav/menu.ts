import {
  BarChart3, Beef, DollarSign, MapPinned, Package, Sprout, Globe2, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Kapsam = 'world' | 'turkey';

/**
 * Bir menü öğesi. Yollar KAPSAMA göre ayrı tutuluyor.
 *
 * Eskiden Dünya ve Türkiye iki AYRI menü ağacıydı: 27 ve 38 sayfa, ortak
 * yalnızca 2. Kapsam değişince menünün %97'si siliniyor, kullanıcı yerini
 * kaybediyordu — "kopuk kopuk" hissinin ana kaynağı buydu.
 *
 * Burada menü TEK ve sabit. Aynı konunun iki kapsamdaki karşılığı tek öğede
 * duruyor, böylece Dünya↔Türkiye geçişi KONUYU KORUYOR: "Tahıllar"dayken
 * kapsamı değiştirince yine Tahıllar'da kalıyorsun, menü yerinden oynamıyor.
 */
export type MenuItem = {
  label: string;
  /** Kapsamdan bağımsız tek yol (ör. AI Asistan). */
  any?: string;
  world?: string;
  turkey?: string;
};

export type MenuCategory = {
  title: string;
  icon: LucideIcon;
  /** Kategori yalnızca bu kapsamda görünür; boşsa her ikisinde. */
  onlyIn?: Kapsam;
  items: MenuItem[];
};

/** Öğenin verilen kapsamdaki yolu; o kapsamda karşılığı yoksa null. */
export const itemPath = (item: MenuItem, kapsam: Kapsam): string | null =>
  item.any ?? item[kapsam] ?? null;

/** Öğe bu kapsamda var mı? */
export const hasScope = (item: MenuItem, kapsam: Kapsam): boolean =>
  itemPath(item, kapsam) !== null;

export const MENU: MenuCategory[] = [
  {
    title: 'Genel Bakış', icon: Globe2, items: [
      // Tek genel bakış sayfası var; /tarpovizyon/overview buraya YÖNLENDİRİYOR,
      // ayrı bir dünya sayfası değil. Kapsamsız.
      { label: 'Panoya Genel Bakış', any: '/tarpovizyon/turkey/overview' },
      { label: 'Emtia Fiyatları', any: '/tarpovizyon/commodity-prices' },
      { label: 'AI Asistan', any: '/tarpovizyon/ai-assistant' },
    ],
  },
  {
    title: 'Fiyat ve Ekonomi', icon: DollarSign, items: [
      // Makro her iki kapsamda da var — eskiden Dünya'da "Makroekonomik",
      // Türkiye'de "Fiyat ve Ekonomi" altındaydı; aynı konu iki ayrı yerde.
      { label: 'Makroekonomik', world: '/tarpovizyon/world/macro-economic', turkey: '/tarpovizyon/turkey/macro' },
      { label: 'Fiyat Endeksleri', turkey: '/tarpovizyon/turkey/price-index' },
      { label: 'Arz-Talep Dengesi', turkey: '/tarpovizyon/turkey/product-balance' },
      { label: 'Çapraz İçgörü', turkey: '/tarpovizyon/turkey/cross-intelligence' },
      { label: 'Nüfus', world: '/tarpovizyon/world/population' },
    ],
  },
  {
    title: 'Bitkisel Üretim', icon: Sprout, items: [
      { label: 'Genel Üretim', world: '/tarpovizyon/world/production', turkey: '/tarpovizyon/turkey/plant-production' },
      { label: 'Tahıllar', world: '/tarpovizyon/world/cereals', turkey: '/tarpovizyon/turkey/cereals' },
      { label: 'Sebzeler', world: '/tarpovizyon/world/vegetables', turkey: '/tarpovizyon/turkey/vegetables' },
      { label: 'Meyveler', world: '/tarpovizyon/world/fruits', turkey: '/tarpovizyon/turkey/fruits' },
      { label: 'Bakliyat', world: '/tarpovizyon/world/legumes', turkey: '/tarpovizyon/turkey/legumes' },
      { label: 'Yağlı Tohumlar', world: '/tarpovizyon/world/oilseeds', turkey: '/tarpovizyon/turkey/oilseeds' },
      { label: 'Şeker Bitkileri', world: '/tarpovizyon/world/sugar-crops', turkey: '/tarpovizyon/turkey/sugar-crops' },
      { label: 'Kuruyemişler', world: '/tarpovizyon/world/nuts', turkey: '/tarpovizyon/turkey/nuts' },
      { label: 'İçecek Bitkileri', world: '/tarpovizyon/world/beverages', turkey: '/tarpovizyon/turkey/beverages' },
      { label: 'Lif Bitkileri', world: '/tarpovizyon/world/fiber-crops', turkey: '/tarpovizyon/turkey/fiber-crops' },
    ],
  },
  {
    title: 'Hayvansal Üretim', icon: Beef, items: [
      { label: 'Genel Üretim', turkey: '/tarpovizyon/turkey/animal-production' },
      { label: 'Kırmızı Et', world: '/tarpovizyon/world/red-meat', turkey: '/tarpovizyon/turkey/red-meat' },
      { label: 'Beyaz Et', world: '/tarpovizyon/world/white-meat', turkey: '/tarpovizyon/turkey/white-meat' },
      { label: 'Süt', world: '/tarpovizyon/world/milk', turkey: '/tarpovizyon/turkey/milk' },
      { label: 'Yumurta', world: '/tarpovizyon/world/eggs', turkey: '/tarpovizyon/turkey/eggs' },
      // Menüde yoktu; dünya karşılığıyla eşleştirildi.
      { label: 'Diğer Hayvansal', world: '/tarpovizyon/world/other-animal', turkey: '/tarpovizyon/turkey/other-animal-products' },
      { label: 'Arıcılık', turkey: '/tarpovizyon/turkey/beekeeping' },
      { label: 'TÜİK Canlı Hayvan', turkey: '/tarpovizyon/turkey/tuik-livestock' },
      { label: 'Hayvan Stokları', world: '/tarpovizyon/world/livestock' },
      { label: 'Hayvan Rekabeti', world: '/tarpovizyon/world/livestock-competition' },
    ],
  },
  {
    title: 'Dış Ticaret', icon: Package, onlyIn: 'turkey', items: [
      { label: 'Genel Bakış', turkey: '/tarpovizyon/turkey/trade?tab=overview' },
      { label: 'Bitkisel Ticaret', turkey: '/tarpovizyon/turkey/trade?tab=plant' },
      { label: 'Hayvansal Ticaret', turkey: '/tarpovizyon/turkey/trade?tab=animal' },
      { label: 'Ürün Radar', turkey: '/tarpovizyon/turkey/trade?tab=product' },
      { label: 'Ülke Radar', turkey: '/tarpovizyon/turkey/trade?tab=country' },
      { label: 'Ticaret İçgörüleri', turkey: '/tarpovizyon/turkey/trade?tab=intelligence' },
    ],
  },
  {
    title: 'İl Bazında', icon: MapPinned, onlyIn: 'turkey', items: [
      { label: 'Hayvancılık', turkey: '/tarpovizyon/turkey/provincial' },
      { label: 'Bitkisel Üretim', turkey: '/tarpovizyon/turkey/plant-provincial' },
      { label: 'Coğrafi İşaretli', turkey: '/tarpovizyon/turkey/geographical-indication' },
      { label: 'Havza Ürün Deseni', turkey: '/tarpovizyon/turkey/basin-production' },
    ],
  },
  {
    title: 'Kaynak ve Çevre', icon: BarChart3, onlyIn: 'world', items: [
      { label: 'Genel Kaynaklar', world: '/tarpovizyon/world/resources' },
      { label: 'Arazi Örtüsü', world: '/tarpovizyon/world/land-cover' },
      { label: 'Gübre', world: '/tarpovizyon/world/fertilizer' },
      { label: 'Pestisit', world: '/tarpovizyon/world/pesticide' },
      { label: 'Tarımsal İstihdam', world: '/tarpovizyon/world/employment' },
      { label: 'Gıda Dengesi', world: '/tarpovizyon/world/food-balance' },
    ],
  },
  {
    title: 'Araçlar', icon: Wrench, items: [
      { label: 'Rasyon', any: '/rasyon' },
      { label: 'Hasat Tahmini', any: '/hasat-tahmini' },
      { label: 'Sulama Planı', any: '/sulama-plan' },
      { label: 'Gübre Hesap', any: '/gubre-hesap' },
      { label: 'Tarım Takvimi', any: '/tarim-takvim' },
      // Menüde yoktu.
      { label: 'Veri Düzenle', any: '/tarpovizyon/veri-yukle' },
    ],
  },
];

/** Yolu (sorgu dahil) normalize eder — aktiflik karşılaştırması için. */
const norm = (p: string) => p.replace(/\/$/, '');

/**
 * Verilen yolun menüdeki yerini bulur.
 * Breadcrumb ve kapsam değiştirme bunu kullanıyor.
 */
export function locate(pathname: string, search: string) {
  const tam = norm(pathname) + (search || '');
  for (const kat of MENU) {
    for (const item of kat.items) {
      for (const k of ['any', 'world', 'turkey'] as const) {
        const y = item[k];
        if (!y) continue;
        const [p, q] = y.split('?');
        const eslesti = q ? tam === norm(p) + `?${q}` : norm(pathname) === norm(p);
        if (eslesti) return { kategori: kat, item, kapsam: k === 'any' ? null : (k as Kapsam) };
      }
    }
  }
  return null;
}

/**
 * Kapsam değiştirildiğinde gidilecek yol.
 *
 * Aynı KONUNUN diğer kapsamdaki karşılığı varsa oraya; yoksa o kapsamın
 * genel bakışına. Eskiden kapsam değişimi doğrudan kök sayfaya atıyordu.
 */
export function scopeSwitchTarget(
  pathname: string, search: string, yeniKapsam: Kapsam,
): { path: string; konuKorundu: boolean } {
  const yer = locate(pathname, search);
  const hedef = yer ? itemPath(yer.item, yeniKapsam) : null;
  if (hedef) return { path: hedef, konuKorundu: true };
  /*
   * Karşılığı yoksa o kapsamın giriş sayfası. Dünya için AYRI bir genel bakış
   * sayfası yok (/tarpovizyon/overview Türkiye'ye yönlendiriyor), o yüzden
   * kapsam kökleri kullanılıyor — yoksa "Dünya"ya basıp Türkiye sayfasında
   * kalıyorduk.
   */
  return {
    path: yeniKapsam === 'world' ? '/tarpovizyon/world' : '/tarpovizyon/turkey',
    konuKorundu: false,
  };
}

/** Kapsama göre görünür kategoriler (boş kalanlar elenir). */
export function visibleMenu(kapsam: Kapsam): MenuCategory[] {
  return MENU
    .filter((k) => !k.onlyIn || k.onlyIn === kapsam)
    .map((k) => ({ ...k, items: k.items.filter((i) => hasScope(i, kapsam)) }))
    .filter((k) => k.items.length > 0);
}

export const KAPSAM_ADI: Record<Kapsam, string> = { world: 'Dünya', turkey: 'Türkiye' };
