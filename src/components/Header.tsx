import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Globe, MapPin, TrendingUp, Sprout, Beef, MapPinned, DollarSign, Package, BarChart3 } from 'lucide-react';
import '../styles/Header.css';

type MenuCategory = {
  title: string;
  icon?: React.ComponentType<{ size: number }>;
  items: MenuItem[];
};

type MenuItem = {
  label: string;
  path: string;
};

const worldMenuCategories: MenuCategory[] = [
  {
    title: 'Canlı Piyasa & AI',
    icon: BarChart3,
    items: [
      { label: '📊 Emtia Fiyatları', path: '/tarpovizyon/commodity-prices' },
      { label: '🤖 AI Asistan', path: '/tarpovizyon/ai-assistant' },
    ],
  },
  {
    title: 'Makroekonomik',
    icon: TrendingUp,
    items: [
      { label: 'Makro Veriler', path: '/tarpovizyon/world/macro-economic' },
      { label: 'Nüfus', path: '/tarpovizyon/world/population' },
    ],
  },
  {
    title: 'Bitkisel Üretim',
    icon: Sprout,
    items: [
      { label: 'Genel Üretim', path: '/tarpovizyon/world/production' },
      { label: 'Tahıllar', path: '/tarpovizyon/world/cereals' },
      { label: 'Sebzeler', path: '/tarpovizyon/world/vegetables' },
      { label: 'Meyveler', path: '/tarpovizyon/world/fruits' },
      { label: 'Bakliyat', path: '/tarpovizyon/world/legumes' },
      { label: 'Yağlı Tohumlar', path: '/tarpovizyon/world/oilseeds' },
      { label: 'Şeker Bitkileri', path: '/tarpovizyon/world/sugar-crops' },
      { label: 'Kuruyemişler', path: '/tarpovizyon/world/nuts' },
      { label: 'İçecek Bitkileri', path: '/tarpovizyon/world/beverages' },
      { label: 'Lif Bitkileri', path: '/tarpovizyon/world/fiber-crops' },
    ],
  },
  {
    title: 'Hayvansal Üretim',
    icon: Beef,
    items: [
      { label: 'Hayvan Stokları', path: '/tarpovizyon/world/livestock' },
      { label: 'Hayvan Rekabeti', path: '/tarpovizyon/world/livestock-competition' },
      { label: 'Kırmızı Et', path: '/tarpovizyon/world/red-meat' },
      { label: 'Beyaz Et', path: '/tarpovizyon/world/white-meat' },
      { label: 'Süt', path: '/tarpovizyon/world/milk' },
      { label: 'Yumurta', path: '/tarpovizyon/world/eggs' },
      { label: 'Diğer Hayvansal', path: '/tarpovizyon/world/other-animal' },
    ],
  },
  {
    title: 'Kaynak ve Çevre',
    icon: MapPinned,
    items: [
      { label: 'Genel Kaynaklar', path: '/tarpovizyon/world/resources' },
      { label: 'Arazi Kullanımı', path: '/tarpovizyon/world/land-use' },
      { label: 'Arazi Örtüsü', path: '/tarpovizyon/world/land-cover' },
      { label: 'Gübre', path: '/tarpovizyon/world/fertilizer' },
      { label: 'Pestisit', path: '/tarpovizyon/world/pesticide' },
      { label: 'Tarımsal İstihdam', path: '/tarpovizyon/world/employment' },
      { label: 'Gıda Dengesi', path: '/tarpovizyon/world/food-balance' },
    ],
  },
];

const turkeyMenuCategories: MenuCategory[] = [
  {
    title: 'Canlı Piyasa & AI',
    icon: BarChart3,
    items: [
      { label: '📊 Emtia Fiyatları', path: '/tarpovizyon/commodity-prices' },
      { label: '🤖 AI Asistan', path: '/tarpovizyon/ai-assistant' },
    ],
  },
  {
    title: 'Fiyat ve Ekonomi',
    icon: DollarSign,
    items: [
      { label: 'Fiyat Endeksleri', path: '/tarpovizyon/turkey/price-index' },
      { label: 'Arz-Talep Dengesi', path: '/tarpovizyon/turkey/product-balance' },
      { label: 'Makroekonomik', path: '/tarpovizyon/turkey/macro' },
      { label: 'Çapraz İstihbarat', path: '/tarpovizyon/turkey/cross-intelligence' },
    ],
  },
  {
    title: 'Bitkisel Üretim',
    icon: Sprout,
    items: [
      { label: 'Genel Üretim', path: '/tarpovizyon/turkey/plant-production' },
      { label: 'Tahıllar', path: '/tarpovizyon/turkey/cereals' },
      { label: 'Sebzeler', path: '/tarpovizyon/turkey/vegetables' },
      { label: 'Meyveler', path: '/tarpovizyon/turkey/fruits' },
      { label: 'Bakliyat', path: '/tarpovizyon/turkey/legumes' },
      { label: 'Yağlı Tohumlar', path: '/tarpovizyon/turkey/oilseeds' },
      { label: 'Şeker Bitkileri', path: '/tarpovizyon/turkey/sugar-crops' },
      { label: 'Kuruyemişler', path: '/tarpovizyon/turkey/nuts' },
      { label: 'İçecek Bitkileri', path: '/tarpovizyon/turkey/beverages' },
      { label: 'Lif Bitkileri', path: '/tarpovizyon/turkey/fiber-crops' },
    ],
  },
  {
    title: 'Dış Ticaret',
    icon: Package,
    items: [
      { label: 'Genel Bakış', path: '/tarpovizyon/turkey/trade?tab=overview' },
      { label: 'Bitkisel Ticaret', path: '/tarpovizyon/turkey/trade?tab=plant' },
      { label: 'Hayvansal Ticaret', path: '/tarpovizyon/turkey/trade?tab=animal' },
      { label: 'Ürün İstihbaratı', path: '/tarpovizyon/turkey/trade?tab=product' },
      { label: 'Ülke İstihbaratı', path: '/tarpovizyon/turkey/trade?tab=country' },
      { label: 'Ticaret İstihbaratı', path: '/tarpovizyon/turkey/trade?tab=intelligence' },
    ],
  },
  {
    title: 'Hayvansal Üretim',
    icon: Beef,
    items: [
      { label: 'Genel Üretim', path: '/tarpovizyon/turkey/animal-production' },
      { label: 'Kırmızı Et', path: '/tarpovizyon/turkey/red-meat' },
      { label: 'Beyaz Et', path: '/tarpovizyon/turkey/white-meat' },
      { label: 'Süt', path: '/tarpovizyon/turkey/milk' },
      { label: 'Yumurta', path: '/tarpovizyon/turkey/eggs' },
      { label: 'Arıcılık', path: '/tarpovizyon/turkey/beekeeping' },
      { label: 'TÜİK Canlı Hayvan Envanteri', path: '/tarpovizyon/turkey/tuik-livestock' },
    ],
  },
  {
    title: 'İl Bazında Veriler',
    icon: MapPinned,
    items: [
      { label: 'Hayvancılık', path: '/tarpovizyon/turkey/provincial' },
      { label: 'Bitkisel Üretim', path: '/tarpovizyon/turkey/plant-provincial' },
      { label: 'Coğrafi İşaretli Gıda', path: '/tarpovizyon/turkey/geographical-indication' },
      { label: 'Havza Ürün Deseni', path: '/tarpovizyon/turkey/basin-production' },
    ],
  },
  {
    title: 'Rasyon',
    icon: Beef,
    items: [
      { label: 'Rasyon', path: '/rasyon' },
    ],
  },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  type Mode = 'world' | 'turkey';
  const modeFromPath: Mode = location.pathname.startsWith('/tarpovizyon/world')
    ? 'world'
    : location.pathname.startsWith('/tarpovizyon/turkey')
      ? 'turkey'
      : 'turkey';

  const [mode, setMode] = useState<Mode>(modeFromPath);

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = useCallback((path: string) => {
    const [itemPath, itemSearch] = path.split('?');
    if (itemSearch) {
      return location.pathname === itemPath && location.search === `?${itemSearch}`;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname, location.search]);

  const menuCategories = useMemo(() => {
    return mode === 'world' ? worldMenuCategories : turkeyMenuCategories;
  }, [mode]);

  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  // Keep mode in sync with URL, but allow switching without immediate navigation.
  useEffect(() => {
    setMode(modeFromPath);
  }, [modeFromPath]);

  // Auto-select category based on current path.
  useEffect(() => {
    const idx = menuCategories.findIndex(cat => cat.items.some(item => isActive(item.path)));
    if (idx >= 0) {
      setActiveCategoryIdx(idx);
      return;
    }
    setActiveCategoryIdx(prev => Math.min(Math.max(prev, 0), Math.max(menuCategories.length - 1, 0)));
  }, [location.pathname, menuCategories, isActive]);

  const activeCategory = menuCategories[activeCategoryIdx] ?? menuCategories[0];

  return (
    <header className="main-header">
      {/* Top band: mode + categories */}
      <div className="header-band header-band--top">
        <div className="header-container">
          <div className="header-logo" onClick={() => handleNavigate('/tarpovizyon') }>
            <Home size={24} />
            <span className="logo-text">TARPOL</span>
          </div>

          <div className="header-top-controls">
            <div className="mode-switch" role="tablist" aria-label="Veri modu">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'world'}
                className={`mode-tab ${mode === 'world' ? 'active' : ''}`}
                onClick={() => {
                  if (mode === 'world') return; // Already in world mode
                  setMode('world');
                  setActiveCategoryIdx(0);
                  handleNavigate('/tarpovizyon/world');
                }}
              >
                <Globe size={18} />
                <span>Dünya</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'turkey'}
                className={`mode-tab ${mode === 'turkey' ? 'active' : ''}`}
                onClick={() => {
                  if (mode === 'turkey') return; // Already in turkey mode
                  setMode('turkey');
                  setActiveCategoryIdx(0);
                  handleNavigate('/tarpovizyon/turkey');
                }}
              >
                <MapPin size={18} />
                <span>Türkiye</span>
              </button>
            </div>

            <div className="category-row" aria-label="Kategori seç">
              {menuCategories.map((cat, idx) => {
                const Icon = cat.icon;
                const isCatActive = idx === activeCategoryIdx;
                return (
                  <button
                    key={`${mode}-${cat.title}`}
                    type="button"
                    className={`category-pill ${isCatActive ? 'active' : ''}`}
                    onClick={() => setActiveCategoryIdx(idx)}
                  >
                    {Icon && <Icon size={16} />}
                    <span>{cat.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menüyü aç/kapat"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Bottom band: sub-items */}
      <div className={`header-band header-band--bottom ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="header-container header-bottom">
          <div className="subnav">
            {activeCategory?.items?.map(item => (
              <button
                key={item.path}
                type="button"
                className={`subnav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          {/* Ana Sayfa */}
          <button
            type="button"
            className="mobile-home-btn"
            onClick={() => handleNavigate('/tarpovizyon')}
          >
            <Home size={18} />
            <span>Ana Sayfa</span>
          </button>

          {/* Dünya / Türkiye Toggle */}
          <div className="mobile-mode">
            <button
              type="button"
              className={`mobile-mode-btn ${mode === 'world' ? 'active' : ''}`}
              onClick={() => {
                setMode('world');
                setActiveCategoryIdx(0);
                handleNavigate('/tarpovizyon/world');
              }}
            >
              <Globe size={18} /> Dünya
            </button>
            <button
              type="button"
              className={`mobile-mode-btn ${mode === 'turkey' ? 'active' : ''}`}
              onClick={() => {
                setMode('turkey');
                setActiveCategoryIdx(0);
                handleNavigate('/tarpovizyon/turkey');
              }}
            >
              <MapPin size={18} /> Türkiye
            </button>
          </div>

          {/* Kategori Seçimi */}
          <p className="mobile-section-label">Kategori</p>
          <div className="mobile-categories">
            {menuCategories.map((cat, idx) => {
              const Icon = cat.icon;
              const isCatActive = idx === activeCategoryIdx;
              return (
                <button
                  key={`${mode}-m-${cat.title}`}
                  type="button"
                  className={`mobile-category-btn ${isCatActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategoryIdx(idx);
                    // Navigate to first item in category
                    if (cat.items && cat.items.length > 0) {
                      handleNavigate(cat.items[0].path);
                    }
                  }}
                >
                  {Icon && <Icon size={18} />}
                  <span>{cat.title}</span>
                </button>
              );
            })}
          </div>

          {/* Kategori Alt Sayfaları */}
          {activeCategory?.items && activeCategory.items.length > 0 && (
            <>
              <p className="mobile-section-label">{activeCategory.title}</p>
              <div className="mobile-items">
                {activeCategory.items.map(item => (
                  <button
                    key={item.path}
                    type="button"
                    className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
