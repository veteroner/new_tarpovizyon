import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type CategoryType = 'macro' | 'plant' | 'animal' | 'province' | null;

interface CategoryInfo {
  key: CategoryType;
  title: string;
  color: string;
  icon: string;
}

export const CATEGORIES: Record<Exclude<CategoryType, null>, CategoryInfo> = {
  macro: {
    key: 'macro',
    title: 'Makro Veriler',
    color: '#3b82f6',
    icon: '📊',
  },
  plant: {
    key: 'plant',
    title: 'Bitkisel Üretim',
    color: '#22c55e',
    icon: '🌱',
  },
  animal: {
    key: 'animal',
    title: 'Hayvansal Üretim',
    color: '#f97316',
    icon: '🐄',
  },
  province: {
    key: 'province',
    title: 'İl Düzeyinde Veriler',
    color: '#14b8a6',
    icon: '🗺️',
  },
};

// Her kategorinin sayfa tanımları
export interface NavItem {
  path: string;
  label: string;
  icon?: string;
}

export const CATEGORY_PAGES: Record<Exclude<CategoryType, null>, NavItem[]> = {
  macro: [
    { path: '/macro/economic', label: 'Makroekonomi', icon: '💰' },
    { path: '/macro/population', label: 'Nüfus', icon: '👥' },
    { path: '/macro/employment', label: 'Tarım İstihdamı', icon: '👷' },
    { path: '/macro/price-index', label: 'Fiyat Endeksleri', icon: '📈' },
    { path: '/macro/land-use', label: 'Arazi Kullanımı', icon: '🏞️' },
    { path: '/macro/land-cover', label: 'Arazi Örtüsü', icon: '🌳' },
  ],
  plant: [
    { path: '/plant/tuik', label: 'TÜİK Bitkisel', icon: '🇹🇷' },
    { path: '/plant/cereals', label: 'Tahıl', icon: '🌾' },
    { path: '/plant/vegetables', label: 'Sebze', icon: '🥕' },
    { path: '/plant/fruits', label: 'Meyve', icon: '🍎' },
    { path: '/plant/legumes', label: 'Baklagil', icon: '🫘' },
    { path: '/plant/oilseeds', label: 'Yağlı Tohum', icon: '🌻' },
    { path: '/plant/sugar-crops', label: 'Şekerli Bitki', icon: '🍬' },
    { path: '/plant/nuts', label: 'Sert Kabuklu', icon: '🥜' },
    { path: '/plant/beverages', label: 'İçecek Bitkileri', icon: '☕' },
    { path: '/plant/fiber-crops', label: 'Lifli Bitki', icon: '🧵' },
    { path: '/plant/trade', label: 'Dış Ticaret', icon: '🔄' },
    { path: '/plant/export', label: 'İhracat', icon: '📤' },
    { path: '/plant/import', label: 'İthalat', icon: '📥' },
  ],
  animal: [
    { path: '/animal/tuik', label: 'TÜİK Hayvancılık', icon: '🇹🇷' },
    { path: '/animal/red-meat', label: 'Kırmızı Et', icon: '🥩' },
    { path: '/animal/white-meat', label: 'Beyaz Et', icon: '🍗' },
    { path: '/animal/milk', label: 'Süt Üretimi', icon: '🥛' },
    { path: '/animal/eggs', label: 'Yumurta', icon: '🥚' },
    { path: '/animal/other', label: 'Diğer Ürünler', icon: '🍯' },
    { path: '/animal/stocks', label: 'Hayvan Stokları', icon: '🐑' },
    { path: '/animal/food-balance', label: 'Gıda Dengesi', icon: '⚖️' },
    { path: '/animal/competition', label: 'Rekabet Analizi', icon: '🏆' },
    { path: '/animal/trade', label: 'Dış Ticaret', icon: '🔄' },
    { path: '/animal/export', label: 'İhracat', icon: '📤' },
    { path: '/animal/import', label: 'İthalat', icon: '📥' },
  ],
  province: [
    { path: '/province/production', label: 'Üretim Haritası', icon: '🗺️' },
    { path: '/province/overview', label: 'Genel Bakış', icon: '📋' },
    { path: '/province/fertilizer', label: 'Gübre', icon: '🧪' },
    { path: '/province/pesticide', label: 'Pestisit', icon: '🐛' },
    { path: '/province/trade', label: 'Dış Ticaret', icon: '🔄' },
    { path: '/province/export', label: 'İhracat', icon: '📤' },
    { path: '/province/import', label: 'İthalat', icon: '📥' },
    { path: '/province/transport', label: 'Taşıma', icon: '🚚' },
  ],
};

interface CategoryContextType {
  category: CategoryType;
  categoryInfo: CategoryInfo | null;
  pages: NavItem[];
}

const CategoryContext = createContext<CategoryContextType>({
  category: null,
  categoryInfo: null,
  pages: [],
});

export function CategoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  
  // URL'den kategoriyi çıkar
  const pathParts = location.pathname.split('/');
  const categoryKey = pathParts[1] as CategoryType;
  
  const category: CategoryType = 
    categoryKey && categoryKey in CATEGORIES ? categoryKey : null;
  
  const categoryInfo = category ? CATEGORIES[category] : null;
  const pages = category ? CATEGORY_PAGES[category] : [];

  return (
    <CategoryContext.Provider value={{ category, categoryInfo, pages }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  return useContext(CategoryContext);
}
