import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, TrendingDown, Truck, Leaf, Activity, Beef, Drumstick, Milk, Egg, Package, Trophy, Wheat, Carrot, Apple, Bean, Flower2, Candy, Nut, Coffee, Ribbon, MapPin, PawPrint, Users, Beaker, Bug, Globe, TreePine, Scale, LineChart, DollarSign, Building, Tractor, BarChart3, Target, ArrowLeftRight } from 'lucide-react';

interface SidebarProps {
  apiConnected: boolean;
  isOpen?: boolean;
}

export function Sidebar({ apiConnected, isOpen }: SidebarProps) {
  const mainNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Genel Bakış' },
    { path: '/trade', icon: ArrowLeftRight, label: 'Dış Ticaret' },
    { path: '/export', icon: TrendingUp, label: 'İhracat' },
    { path: '/import', icon: TrendingDown, label: 'İthalat' },
    { path: '/transport', icon: Truck, label: 'Taşıma' },
    { path: '/production', icon: Leaf, label: 'Üretim' },
  ];

  const animalProductionItems = [
    { path: '/red-meat', icon: Beef, label: 'Kırmızı Et' },
    { path: '/white-meat', icon: Drumstick, label: 'Beyaz Et' },
    { path: '/milk', icon: Milk, label: 'Süt Üretimi' },
    { path: '/eggs', icon: Egg, label: 'Yumurta' },
    { path: '/other-animal', icon: Package, label: 'Diğer Ürünler' },
    { path: '/livestock-competition', icon: Trophy, label: 'Rekabet Analizi' },
  ];

  const plantProductionItems = [
    { path: '/cereals', icon: Wheat, label: 'Tahıl' },
    { path: '/vegetables', icon: Carrot, label: 'Sebze' },
    { path: '/fruits', icon: Apple, label: 'Meyve' },
    { path: '/legumes', icon: Bean, label: 'Baklagil' },
    { path: '/oilseeds', icon: Flower2, label: 'Yağlı Tohum' },
    { path: '/sugar-crops', icon: Candy, label: 'Şekerli Bitki' },
    { path: '/nuts', icon: Nut, label: 'Sert Kabuklu' },
    { path: '/beverages', icon: Coffee, label: 'İçecek Bitkileri' },
    { path: '/fiber-crops', icon: Ribbon, label: 'Lifli Bitki' },
  ];

  const faoDataItems = [
    { path: '/land-use', icon: MapPin, label: 'Arazi Kullanımı' },
    { path: '/livestock-stocks', icon: PawPrint, label: 'Hayvan Stokları' },
    { path: '/employment', icon: Users, label: 'Tarım İstihdamı' },
    { path: '/fertilizer', icon: Beaker, label: 'Gübre' },
    { path: '/pesticide', icon: Bug, label: 'Pestisit' },
    { path: '/population', icon: Globe, label: 'Nüfus' },
    { path: '/land-cover', icon: TreePine, label: 'Arazi Örtüsü' },
    { path: '/food-balance', icon: Scale, label: 'Gıda Dengesi' },
    { path: '/price-index', icon: LineChart, label: 'Fiyat Endeksleri' },
    { path: '/macro-economic', icon: DollarSign, label: 'Makroekonomi' },
  ];

  const tuikDataItems = [
    { path: '/tuik-plant', icon: Tractor, label: 'TÜİK Bitkisel' },
    { path: '/tuik-livestock', icon: Building, label: 'TÜİK Hayvancılık' },
  ];
  const excelDataItems = [
    { path: '/productivity', icon: BarChart3, label: 'Verimlilik Analizi' },
  ];

  const tuikTradeItems = [
    { path: '/tuik-plant-trade', icon: Leaf, label: 'Bitkisel Dış Ticaret' },
    { path: '/tuik-animal-trade', icon: Beef, label: 'Hayvansal Dış Ticaret' },
  ];

  const investmentItems = [
    { path: '/investment-analysis', icon: Target, label: 'Ülke Yatırım Analizi' },
  ];

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity size={24} color="white" />
        </div>
        <span className="sidebar-title">TarpoVizyon</span>
      </div>

      <div className="nav-menu">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">🐄 Hayvansal Üretim</div>
        
        {animalProductionItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">🌱 Bitkisel Üretim</div>
        
        {plantProductionItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">📊 FAO Verileri</div>
        
        {faoDataItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">🇹🇷 TÜİK Türkiye</div>
        
        {tuikDataItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">🔍 Detaylı Analiz</div>
        
        {excelDataItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">📦 TÜİK Dış Ticaret</div>
        
        {tuikTradeItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title">💼 Yatırımcı Analizi</div>
        
        {investmentItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className={`api-status ${apiConnected ? 'connected' : ''}`}>
          <span className="api-status-dot" />
          <span>{apiConnected ? 'API Bağlı' : 'Bağlanıyor...'}</span>
        </div>
      </div>
    </nav>
  );
}
