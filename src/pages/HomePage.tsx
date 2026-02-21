import { useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Wheat, Beef, MapPinned, Home, Scale } from 'lucide-react';
import type { ReactElement } from 'react';
import '../styles/HomePage.css';

type CategoryCard = {
  id: string;
  title: string;
  icon: ReactElement;
  path: string;
  description: string;
  gradient: string;
};

// Dünya (FAO) kategorileri
const worldCategories: CategoryCard[] = [
  {
    id: 'macro',
    title: 'MAKRO VERİLER',
    icon: <TrendingUp size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/world/macro-economic',
    description: 'Dünya GSYH, ekonomik göstergeler',
    gradient: 'linear-gradient(135deg, #10b981 0%, #0f766e 100%)',
  },
  {
    id: 'plant',
    title: 'BİTKİSEL ÜRETİM',
    icon: <Wheat size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/world/production',
    description: 'Dünya tahıl, sebze ve meyve üretimi',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
  },
  {
    id: 'animal',
    title: 'HAYVANSAL ÜRETİM',
    icon: <Beef size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/world/livestock',
    description: 'Dünya hayvancılık ve hayvansal ürünler',
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  },
  {
    id: 'resources',
    title: 'KAYNAK VE ÇEVRE',
    icon: <MapPinned size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/world/resources',
    description: 'Arazi kullanımı, gübre, istihdam',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #14b8a6 100%)',
  },
];

// Türkiye (TÜİK) kategorileri
const turkeyCategories: CategoryCard[] = [
  {
    id: 'macro',
    title: 'MAKRO VERİLER',
    icon: <TrendingUp size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/turkey/price-index',
    description: 'Fiyat endeksleri, TÜFE, ÜFE, GFE',
    gradient: 'linear-gradient(135deg, #10b981 0%, #0f766e 100%)',
  },
  {
    id: 'plant',
    title: 'BİTKİSEL ÜRETİM',
    icon: <Wheat size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/turkey/plant-production',
    description: 'Türkiye tahıl, sebze ve meyve',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
  },
  {
    id: 'animal',
    title: 'HAYVANSAL ÜRETİM',
    icon: <Beef size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/turkey/animal-production',
    description: 'Türkiye et, süt, yumurta üretimi',
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  },
  {
    id: 'provincial',
    title: 'İL BAZINDA VERİLER',
    icon: <MapPinned size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/turkey/provincial',
    description: 'İl bazında detaylı tarımsal istatistikler',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #14b8a6 100%)',
  },
  {
    id: 'product-balance',
    title: 'ARZ-TALEP DENGESİ',
    icon: <Scale size={56} strokeWidth={1.8} />,
    path: '/tarpovizyon/turkey/product-balance',
    description: 'Gıda güvenliği, yeterlilik, ithalat bağımlılığı',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #065f46 100%)',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // URL'den bölge tipini belirle
  const isWorld = location.pathname.startsWith('/tarpovizyon/world');
  
  const categories = isWorld ? worldCategories : turkeyCategories;
  const regionTitle = isWorld ? 'DÜNYA VERİLERİ' : 'TÜRKİYE VERİLERİ';
  const regionSubtitle = isWorld 
    ? 'FAO Dünya Tarım Verileri' 
    : 'TÜİK Türkiye Tarım Verileri';

  return (
    <div className="home-container">
      {/* Back to Selection Button */}
      <button 
        className="back-to-selection"
        onClick={() => navigate('/')}
        aria-label="Ana seçim sayfasına dön"
      >
        <Home size={20} />
        <span>Ana Sayfa</span>
      </button>

      {/* Header Section */}
      <div className="home-header">
        <h1 className="home-region-title">{regionTitle}</h1>
        <p className="home-region-subtitle">{regionSubtitle}</p>
      </div>

      {/* Category Cards Grid */}
      <div className="categories-grid">
        {categories.map((category) => (
          <button
            key={category.id}
            className="category-card"
            onClick={() => navigate(category.path)}
            aria-label={`${category.title} bölümüne git`}
          >
            <div className="card-icon-wrapper" style={{ background: category.gradient }}>
              <div className="card-icon">{category.icon}</div>
            </div>
            <h3 className="card-title">{category.title}</h3>
            <p className="card-description">{category.description}</p>
            <div className="card-arrow">→</div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="home-footer">
        <p>© 2024 TARPOL - Tarımsal Veri Analiz Platformu</p>
      </div>
    </div>
  );
}
