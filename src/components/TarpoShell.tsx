import { useState, useCallback, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Globe, MapPin, Home,
  BarChart3, TrendingUp, Sprout, Beef, MapPinned,
  DollarSign, Package, X, ChevronDown, MoreHorizontal,
} from 'lucide-react';
import '../styles/TarpoShell.css';

type MenuItem = { label: string; path: string };
type MenuCategory = {
  title: string;
  icon: React.ComponentType<{ size: number }>;
  items: MenuItem[];
};

const worldCategories: MenuCategory[] = [
  {
    title: 'Canlı Piyasa & AI', icon: BarChart3, items: [
      { label: 'Emtia Fiyatları', path: '/tarpovizyon/commodity-prices' },
      { label: 'AI Asistan', path: '/tarpovizyon/ai-assistant' },
    ],
  },
  {
    title: 'Makroekonomik', icon: TrendingUp, items: [
      { label: 'Makro Veriler', path: '/tarpovizyon/world/macro-economic' },
      { label: 'Nüfus', path: '/tarpovizyon/world/population' },
    ],
  },
  {
    title: 'Bitkisel Üretim', icon: Sprout, items: [
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
    title: 'Hayvansal Üretim', icon: Beef, items: [
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
    title: 'Kaynak ve Çevre', icon: MapPinned, items: [
      { label: 'Genel Kaynaklar', path: '/tarpovizyon/world/resources' },
      { label: 'Arazi Örtüsü', path: '/tarpovizyon/world/land-cover' },
      { label: 'Gübre', path: '/tarpovizyon/world/fertilizer' },
      { label: 'Pestisit', path: '/tarpovizyon/world/pesticide' },
      { label: 'Tarımsal İstihdam', path: '/tarpovizyon/world/employment' },
      { label: 'Gıda Dengesi', path: '/tarpovizyon/world/food-balance' },
    ],
  },
];

const turkeyCategories: MenuCategory[] = [
  {
    title: 'Canlı Piyasa & AI', icon: BarChart3, items: [
      { label: 'Emtia Fiyatları', path: '/tarpovizyon/commodity-prices' },
      { label: 'AI Asistan', path: '/tarpovizyon/ai-assistant' },
    ],
  },
  {
    title: 'Fiyat ve Ekonomi', icon: DollarSign, items: [
      { label: 'Fiyat Endeksleri', path: '/tarpovizyon/turkey/price-index' },
      { label: 'Arz-Talep Dengesi', path: '/tarpovizyon/turkey/product-balance' },
      { label: 'Makroekonomik', path: '/tarpovizyon/turkey/macro' },
      { label: 'Çapraz İçgörü', path: '/tarpovizyon/turkey/cross-intelligence' },
    ],
  },
  {
    title: 'Bitkisel Üretim', icon: Sprout, items: [
      { label: 'Genel Üretim (TÜİK)', path: '/tarpovizyon/turkey/plant-production' },
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
    title: 'Dış Ticaret', icon: Package, items: [
      { label: 'Genel Bakış', path: '/tarpovizyon/turkey/trade?tab=overview' },
      { label: 'Bitkisel Ticaret', path: '/tarpovizyon/turkey/trade?tab=plant' },
      { label: 'Hayvansal Ticaret', path: '/tarpovizyon/turkey/trade?tab=animal' },
      { label: 'Ürün Radar', path: '/tarpovizyon/turkey/trade?tab=product' },
      { label: 'Ülke Radar', path: '/tarpovizyon/turkey/trade?tab=country' },
      { label: 'Ticaret İçgörüleri', path: '/tarpovizyon/turkey/trade?tab=intelligence' },
    ],
  },
  {
    title: 'Hayvansal Üretim', icon: Beef, items: [
      { label: 'Genel Üretim', path: '/tarpovizyon/turkey/animal-production' },
      { label: 'Kırmızı Et', path: '/tarpovizyon/turkey/red-meat' },
      { label: 'Beyaz Et', path: '/tarpovizyon/turkey/white-meat' },
      { label: 'Süt', path: '/tarpovizyon/turkey/milk' },
      { label: 'Yumurta', path: '/tarpovizyon/turkey/eggs' },
      { label: 'Arıcılık', path: '/tarpovizyon/turkey/beekeeping' },
      { label: 'TÜİK Canlı Hayvan', path: '/tarpovizyon/turkey/tuik-livestock' },
    ],
  },
  {
    title: 'İl Bazında', icon: MapPinned, items: [
      { label: 'Hayvancılık', path: '/tarpovizyon/turkey/provincial' },
      { label: 'Bitkisel Üretim', path: '/tarpovizyon/turkey/plant-provincial' },
      { label: 'Coğrafi İşaretli', path: '/tarpovizyon/turkey/geographical-indication' },
      { label: 'Havza Ürün Deseni', path: '/tarpovizyon/turkey/basin-production' },
    ],
  },
  {
    title: 'Araçlar', icon: TrendingUp, items: [
      { label: 'Rasyon', path: '/rasyon' },
    ],
  },
];

export default function TarpoShell() {
  const navigate = useNavigate();
  const location = useLocation();

  type Mode = 'world' | 'turkey';
  const modeFromPath: Mode = location.pathname.startsWith('/tarpovizyon/world') ? 'world' : 'turkey';
  const [mode, setMode] = useState<Mode>(modeFromPath);
  useEffect(() => { setMode(modeFromPath); }, [modeFromPath]);

  const categories = mode === 'world' ? worldCategories : turkeyCategories;

  // Sidebar collapsed (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('tarpo-sidebar-collapsed') === 'true'
  );
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('tarpo-sidebar-collapsed', String(next));
      return next;
    });
  };

  const isActive = useCallback((path: string) => {
    const [p, q] = path.split('?');
    if (q) return location.pathname === p && location.search === `?${q}`;
    return location.pathname === p;
  }, [location]);

  // Active category index
  const activeCatIdx = useMemo(() => {
    const idx = categories.findIndex(cat => cat.items.some(item => isActive(item.path)));
    return idx >= 0 ? idx : 0;
  }, [location, categories, isActive]);

  // Accordion expanded categories
  const [expandedCats, setExpandedCats] = useState<Set<number>>(() => new Set([0]));
  useEffect(() => {
    setExpandedCats(prev => new Set([...prev, activeCatIdx]));
  }, [activeCatIdx]);

  const toggleCat = (idx: number) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Mobile bottom sheet state
  const [mobileSheetCatIdx, setMobileSheetCatIdx] = useState<number | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const handleNav = (path: string) => {
    navigate(path);
    setMobileSheetOpen(false);
    setMoreSheetOpen(false);
  };

  const bottomTabs = categories.slice(0, 4);
  const moreTabs = categories.slice(4);

  return (
    <div className="tarpo-shell">
      {/* ── Top bar ── */}
      <header className="tarpo-topbar">
        <div className="tarpo-topbar-left">
          <button className="tarpo-back-btn" onClick={() => navigate('/')} title="Programlar">
            <ChevronLeft size={14} />
            <span>Programlar</span>
          </button>
          <button className="tarpo-logo-btn" onClick={() => navigate('/tarpovizyon')}>
            <Home size={18} />
            <span>TARPOL</span>
          </button>
        </div>

        <div className="tarpo-mode-toggle">
          <button
            className={`tarpo-mode-btn ${mode === 'world' ? 'active' : ''}`}
            onClick={() => { setMode('world'); navigate('/tarpovizyon/world'); }}
          >
            <Globe size={14} /> Dünya
          </button>
          <button
            className={`tarpo-mode-btn ${mode === 'turkey' ? 'active' : ''}`}
            onClick={() => { setMode('turkey'); navigate('/tarpovizyon/turkey'); }}
          >
            <MapPin size={14} /> Türkiye
          </button>
        </div>

        <div className="tarpo-topbar-right" />
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="tarpo-body">
        {/* Desktop sidebar */}
        <nav className={`tarpo-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button
            className="tarpo-sidebar-toggle"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Genişlet' : 'Daralt'}
          >
            {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          <div className="tarpo-sidebar-nav">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              const isExpanded = expandedCats.has(idx);
              const hasCatActive = cat.items.some(i => isActive(i.path));

              return (
                <div key={`${mode}-${cat.title}`} className="tarpo-cat-group">
                  <button
                    className={`tarpo-cat-header ${hasCatActive ? 'has-active' : ''}`}
                    onClick={() => {
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false);
                        localStorage.setItem('tarpo-sidebar-collapsed', 'false');
                        setExpandedCats(new Set([idx]));
                      } else {
                        toggleCat(idx);
                      }
                    }}
                    title={sidebarCollapsed ? cat.title : undefined}
                  >
                    <Icon size={17} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="tarpo-cat-label">{cat.title}</span>
                        <ChevronDown
                          size={13}
                          className={`tarpo-cat-chevron ${isExpanded ? 'open' : ''}`}
                        />
                      </>
                    )}
                  </button>

                  {!sidebarCollapsed && isExpanded && (
                    <div className="tarpo-cat-items">
                      {cat.items.map(item => (
                        <button
                          key={item.path}
                          className={`tarpo-nav-item ${isActive(item.path) ? 'active' : ''}`}
                          onClick={() => handleNav(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <main className="tarpo-content">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="tarpo-bottom-nav">
        {bottomTabs.map((cat, idx) => {
          const Icon = cat.icon;
          const isTabActive = cat.items.some(i => isActive(i.path));
          return (
            <button
              key={`mb-${cat.title}`}
              className={`tarpo-bottom-tab ${isTabActive ? 'active' : ''}`}
              onClick={() => {
                setMobileSheetCatIdx(idx);
                setMobileSheetOpen(true);
                setMoreSheetOpen(false);
              }}
            >
              <Icon size={21} />
              <span>{cat.title.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          className={`tarpo-bottom-tab ${moreSheetOpen ? 'active' : ''}`}
          onClick={() => { setMoreSheetOpen(true); setMobileSheetOpen(false); }}
        >
          <MoreHorizontal size={21} />
          <span>Daha</span>
        </button>
      </nav>

      {/* ── Mobile sub-items sheet ── */}
      {mobileSheetOpen && mobileSheetCatIdx !== null && (
        <div className="tarpo-mobile-sheet">
          <div className="tarpo-sheet-handle" />
          <div className="tarpo-sheet-header">
            <span>{categories[mobileSheetCatIdx]?.title}</span>
            <button onClick={() => setMobileSheetOpen(false)}><X size={20} /></button>
          </div>
          <div className="tarpo-sheet-items">
            {categories[mobileSheetCatIdx]?.items.map(item => (
              <button
                key={item.path}
                className={`tarpo-sheet-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNav(item.path)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile "Daha" sheet ── */}
      {moreSheetOpen && (
        <div className="tarpo-mobile-sheet">
          <div className="tarpo-sheet-handle" />
          <div className="tarpo-sheet-header">
            <span>Diğer Kategoriler</span>
            <button onClick={() => setMoreSheetOpen(false)}><X size={20} /></button>
          </div>
          <div className="tarpo-sheet-more-cats">
            {moreTabs.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <button
                  key={`more-${cat.title}`}
                  className="tarpo-sheet-more-cat"
                  onClick={() => {
                    setMoreSheetOpen(false);
                    setMobileSheetCatIdx(i + 4);
                    setMobileSheetOpen(true);
                  }}
                >
                  <Icon size={19} />
                  <span>{cat.title}</span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sheet overlay */}
      {(mobileSheetOpen || moreSheetOpen) && (
        <div
          className="tarpo-sheet-overlay"
          onClick={() => { setMobileSheetOpen(false); setMoreSheetOpen(false); }}
        />
      )}
    </div>
  );
}
