import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  isCategory?: boolean;
}

const menuItems: MenuItem[] = [
  // Ana Menü
  { path: '/', label: 'Genel Bakış', icon: '📊' },
  { path: '/trade', label: 'Dış Ticaret', icon: '🔁' },
  { path: '/export', label: 'İhracat', icon: '📤' },
  { path: '/import', label: 'İthalat', icon: '📥' },
  { path: '/transport', label: 'Taşıma', icon: '🚚' },
  { path: '/production', label: 'Üretim', icon: '🏭' },
  // Hayvansal Üretim
  { path: '', label: '🐄 Hayvansal Üretim', icon: '', isCategory: true },
  { path: '/red-meat', label: 'Kırmızı Et', icon: '🥩' },
  { path: '/white-meat', label: 'Beyaz Et', icon: '🍗' },
  { path: '/milk', label: 'Süt Üretimi', icon: '🥛' },
  { path: '/eggs', label: 'Yumurta', icon: '🥚' },
  { path: '/other-animal', label: 'Diğer Ürünler', icon: '📦' },
  { path: '/livestock-competition', label: 'Rekabet Analizi', icon: '🏆' },
  // Bitkisel Üretim
  { path: '', label: '🌱 Bitkisel Üretim', icon: '', isCategory: true },
  { path: '/cereals', label: 'Tahıl', icon: '🌾' },
  { path: '/vegetables', label: 'Sebze', icon: '🥕' },
  { path: '/fruits', label: 'Meyve', icon: '🍎' },
  { path: '/legumes', label: 'Baklagil', icon: '🫘' },
  { path: '/oilseeds', label: 'Yağlı Tohum', icon: '🌻' },
  { path: '/sugar-crops', label: 'Şekerli Bitki', icon: '🍬' },
  { path: '/nuts', label: 'Sert Kabuklu', icon: '🥜' },
  { path: '/beverages', label: 'İçecek Bitkileri', icon: '☕' },
  { path: '/fiber-crops', label: 'Lifli Bitki', icon: '🧵' },
  // FAO Verileri
  { path: '', label: '📈 FAO Verileri', icon: '', isCategory: true },
  { path: '/land-use', label: 'Arazi Kullanımı', icon: '🗺️' },
  { path: '/livestock-stocks', label: 'Hayvan Stokları', icon: '🐾' },
  { path: '/employment', label: 'Tarım İstihdamı', icon: '👥' },
  { path: '/fertilizer', label: 'Gübre', icon: '🧪' },
  { path: '/pesticide', label: 'Pestisit', icon: '🐛' },
  { path: '/population', label: 'Nüfus', icon: '🌍' },
  { path: '/land-cover', label: 'Arazi Örtüsü', icon: '🌲' },
  { path: '/food-balance', label: 'Gıda Dengesi', icon: '⚖️' },
  { path: '/price-index', label: 'Fiyat Endeksleri', icon: '📈' },
  { path: '/macro-economic', label: 'Makroekonomi', icon: '💰' },
  // TÜİK Türkiye
  { path: '', label: '🇹🇷 TÜİK Türkiye', icon: '', isCategory: true },
  { path: '/tuik-plant', label: 'TÜİK Bitkisel', icon: '🚜' },
  { path: '/tuik-livestock', label: 'TÜİK Hayvancılık', icon: '🏠' },
];

interface WheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WheelPicker({ isOpen, onClose }: WheelPickerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const wheelRef = useRef<HTMLDivElement>(null);
  const itemHeight = 50;
  const visibleItems = 7;
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // isOpen değiştiğinde pozisyonu güncelle
  useEffect(() => {
    if (isOpen) {
      const idx = menuItems.findIndex(item => item.path === location.pathname);
      if (idx !== -1) {
        setSelectedIndex(idx);
        setScrollY(idx * itemHeight);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const newScrollY = Math.max(0, Math.min(scrollY + delta * itemHeight, (menuItems.length - 1) * itemHeight));
    setScrollY(newScrollY);
    const newIndex = Math.round(newScrollY / itemHeight);
    setSelectedIndex(newIndex);
  };

  const handleTouchStart = useRef<number>(0);
  const handleTouchMove = useRef<number>(0);

  const onTouchStart = (e: React.TouchEvent) => {
    handleTouchStart.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleTouchMove.current = e.touches[0].clientY;
    const delta = handleTouchStart.current - handleTouchMove.current;
    const newScrollY = Math.max(0, Math.min(scrollY + delta * 0.5, (menuItems.length - 1) * itemHeight));
    setScrollY(newScrollY);
    const newIndex = Math.round(newScrollY / itemHeight);
    setSelectedIndex(newIndex);
    handleTouchStart.current = handleTouchMove.current;
  };

  const onTouchEnd = () => {
    // Snap to nearest item
    const snappedIndex = Math.round(scrollY / itemHeight);
    setScrollY(snappedIndex * itemHeight);
    setSelectedIndex(snappedIndex);
  };

  const handleSelect = () => {
    const item = menuItems[selectedIndex];
    if (item && !item.isCategory && item.path) {
      navigate(item.path);
      onClose();
    }
  };

  const handleItemClick = (index: number) => {
    const item = menuItems[index];
    if (!item.isCategory) {
      setSelectedIndex(index);
      setScrollY(index * itemHeight);
      setTimeout(() => {
        if (item.path) {
          navigate(item.path);
          onClose();
        }
      }, 200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wheel-picker-overlay" onClick={onClose}>
      <div className="wheel-picker-container" onClick={e => e.stopPropagation()}>
        <div className="wheel-picker-header">
          <span className="wheel-picker-title">Sayfa Seçin</span>
          <button className="wheel-picker-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="wheel-picker-content">
          <div 
            className="wheel-picker-wheel"
            ref={wheelRef}
            onWheel={handleWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Selection highlight */}
            <div className="wheel-picker-highlight" />
            
            {/* Gradient overlays */}
            <div className="wheel-picker-gradient-top" />
            <div className="wheel-picker-gradient-bottom" />
            
            {/* Items */}
            <div 
              className="wheel-picker-items"
              style={{ transform: `translateY(${(visibleItems / 2) * itemHeight - scrollY}px)` }}
            >
              {menuItems.map((item, index) => {
                const distance = Math.abs(index - selectedIndex);
                const scale = index === selectedIndex ? 1.0 : Math.max(0.85, 1 - distance * 0.05);
                const opacity = index === selectedIndex ? 1 : Math.max(0.4, 1 - distance * 0.2);
                
                return (
                  <div
                    key={index}
                    className={`wheel-picker-item ${index === selectedIndex ? 'selected' : ''} ${item.isCategory ? 'category' : ''}`}
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                      height: itemHeight,
                    }}
                    onClick={() => handleItemClick(index)}
                  >
                    {item.isCategory ? (
                      <span className="wheel-item-category">{item.label}</span>
                    ) : (
                      <>
                        <span className="wheel-item-icon">{item.icon}</span>
                        <span className="wheel-item-label">{item.label}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <button 
          className="wheel-picker-select-btn"
          onClick={handleSelect}
          disabled={menuItems[selectedIndex]?.isCategory}
        >
          {menuItems[selectedIndex]?.isCategory ? 'Kategori' : 'Sayfaya Git'}
        </button>
      </div>
    </div>
  );
}
