import { useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';

type TopLevel = 'world' | 'turkey';

const MENU_PATHS = new Set([
  '/world',
  '/world/macro',
  '/world/plant',
  '/world/animal',
  '/turkey',
  '/turkey/plant',
  '/turkey/animal',
]);

const TOP_META: Record<TopLevel, { label: string; icon: string }> = {
  world: { label: 'Dünya Verileri', icon: '🌍' },
  turkey: { label: 'Türkiye Verileri', icon: '🇹🇷' },
};

const SECTION_META: Record<string, { label: string; icon: string; color: string }> = {
  // World
  macro: { label: 'Makro Ekonomik', icon: '📊', color: '#3b82f6' },
  land: { label: 'Arazi ve Çevre', icon: '🌾', color: '#10b981' },
  plant: { label: 'Bitkisel Üretim', icon: '🌱', color: '#22c55e' },
  animal: { label: 'Hayvansal Üretim', icon: '🐄', color: '#ef4444' },
  trade: { label: 'Ticaret', icon: '📦', color: '#8b5cf6' },
  maps: { label: 'İl Bazlı Haritalar', icon: '🗺️', color: '#06b6d4' },

  // Turkey
  // (turkey routes reuse plant/animal/trade/maps keys)
};

const PAGE_LABELS: Record<string, string> = {
  // Macro
  economic: 'Ekonomik Göstergeler',
  population: 'Nüfus',
  employment: 'Tarımsal İstihdam',
  'price-index': 'Fiyat Endeksleri',

  // Land
  use: 'Arazi Kullanımı',
  cover: 'Arazi Örtüsü',
  fertilizer: 'Gübre',
  pesticide: 'Pestisit',

  // Plant (world)
  cereals: 'Tahıllar',
  vegetables: 'Sebzeler',
  fruits: 'Meyveler',
  legumes: 'Baklagiller',
  oilseeds: 'Yağlı Tohumlar',
  'sugar-crops': 'Şeker Bitkileri',
  nuts: 'Sert Kabuklular',
  beverages: 'İçecek Bitkileri',
  'fiber-crops': 'Lif Bitkileri',

  // Animal (world)
  'red-meat': 'Kırmızı Et',
  'white-meat': 'Beyaz Et',
  milk: 'Süt',
  eggs: 'Yumurta',
  stocks: 'Canlı Hayvan Stokları',
  other: 'Diğer Hayvansal Ürünler',
  competition: 'Rekabet Analizi',

  // Trade
  export: 'İhracat',
  import: 'İthalat',
  overview: 'Ticaret Özeti',
  transport: 'Lojistik / Taşıma',

  // Food balance
  'food-balance': 'Gıda Dengesi',

  // Turkey pages
  production: 'Üretim',
  livestock: 'Hayvan Varlığı',
};

export function AutoPageHeader() {
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname === '/' || MENU_PATHS.has(pathname)) return null;

  const parts = pathname.split('/').filter(Boolean);
  const top = parts[0] as TopLevel | undefined;

  if (top !== 'world' && top !== 'turkey') return null;

  const topMeta = TOP_META[top];

  // Examples:
  // /world/macro/economic => [world, macro, economic]
  // /world/food-balance   => [world, food-balance]
  // /turkey/maps/overview => [turkey, maps, overview]

  let sectionKey: string | undefined;
  let pageKey: string | undefined;

  if (parts.length >= 3) {
    sectionKey = parts[1];
    pageKey = parts[2];
  } else if (parts.length === 2) {
    // single-page section under top-level
    sectionKey = parts[1];
    pageKey = parts[1];
  }

  const sectionMeta = sectionKey ? SECTION_META[sectionKey] : undefined;
  const title = (pageKey && PAGE_LABELS[pageKey]) || (sectionMeta?.label ?? topMeta.label);
  const color = sectionMeta?.color ?? (top === 'turkey' ? '#e11d48' : '#3b82f6');
  const headerIcon = sectionMeta?.icon ?? topMeta.icon;

  const breadcrumbs: Array<{ label: string; path?: string; icon?: string }> = [
    { label: topMeta.label, path: `/${top}`, icon: topMeta.icon },
  ];

  if (sectionMeta && parts.length >= 3) {
    breadcrumbs.push({ label: sectionMeta.label, path: `/${top}/${sectionKey}`, icon: sectionMeta.icon });
  }

  breadcrumbs.push({ label: title });

  return (
    <PageHeader
      title={title}
      icon={headerIcon}
      color={color}
      breadcrumbs={breadcrumbs}
    />
  );
}
