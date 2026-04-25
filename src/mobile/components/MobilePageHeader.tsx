import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * MobilePageHeader — Floating top nav for non-mobile routes
 *
 * Appears on top of all TarpoVizyon/tool pages when running in Capacitor,
 * giving the user a persistent way to go back or return to the mobile hub.
 */

// Human-readable names for common routes
const ROUTE_LABELS: Record<string, string> = {
  '/tarpovizyon': 'TarpoVizyon',
  '/tarpovizyon/world': 'Dünya Verileri',
  '/tarpovizyon/turkey': 'Türkiye Verileri',
  '/tarpovizyon/world/cereals': 'Tahıllar — Dünya',
  '/tarpovizyon/world/vegetables': 'Sebzeler — Dünya',
  '/tarpovizyon/world/fruits': 'Meyveler — Dünya',
  '/tarpovizyon/world/livestock': 'Hayvancılık — Dünya',
  '/tarpovizyon/world/red-meat': 'Kırmızı Et — Dünya',
  '/tarpovizyon/world/milk': 'Süt — Dünya',
  '/tarpovizyon/world/eggs': 'Yumurta — Dünya',
  '/tarpovizyon/world/fertilizer': 'Gübre — Dünya',
  '/tarpovizyon/world/land-use': 'Arazi Kullanımı',
  '/tarpovizyon/turkey/plant-production': 'Bitkisel Üretim',
  '/tarpovizyon/turkey/cereals': 'Tahıllar — TR',
  '/tarpovizyon/turkey/vegetables': 'Sebzeler — TR',
  '/tarpovizyon/turkey/fruits': 'Meyveler — TR',
  '/tarpovizyon/turkey/animal-production': 'Hayvancılık — TR',
  '/tarpovizyon/turkey/red-meat': 'Kırmızı Et — TR',
  '/tarpovizyon/turkey/milk': 'Süt — TR',
  '/tarpovizyon/turkey/eggs': 'Yumurta — TR',
  '/tarpovizyon/turkey/beekeeping': 'Arıcılık',
  '/tarpovizyon/turkey/trade': 'Dış Ticaret',
  '/tarpovizyon/turkey/provincial': 'İl Verileri',
  '/tarpovizyon/turkey/price-index': 'Fiyat Endeksleri',
  '/tarpovizyon/turkey/macro': 'Makro Ekonomi',
  '/tarpovizyon/turkey/cross-intelligence': 'Çapraz Analiz',
  '/hasat-tahmini': 'Hasat Tahmini',
  '/sulama-plan': 'Sulama Planlayıcı',
  '/gubre-hesap': 'Gübre Hesaplayıcı',
  '/tarim-takvim': 'Tarım Takvimi',
  '/rasyon': 'Rasyon Hesaplayıcı',
};

export default function MobilePageHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const label =
    ROUTE_LABELS[location.pathname] ||
    location.pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, ' ')
      ?.replace(/\b\w/g, (c) => c.toUpperCase()) ||
    'Sayfa';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999]"
      style={{
        background: 'rgba(236, 253, 245, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(209, 250, 229, 0.8)',
        boxShadow: '0 2px 12px rgba(16, 185, 129, 0.10)',
      }}
    >
      <div className="flex items-center justify-between px-4 pb-2.5 pt-safe">
        {/* Geri butonu */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl tap-active transition-transform duration-150"
          style={{
            background: 'rgba(255, 255, 255, 0.70)',
            border: '1px solid rgba(209, 250, 229, 0.8)',
            boxShadow: '0 1px 4px rgba(16, 185, 129, 0.08)',
          }}
        >
          <ArrowLeft size={15} className="text-slate-600" />
          <span className="text-xs text-slate-700 font-semibold">Geri</span>
        </button>

        {/* Mevcut sayfa etiketi */}
        <div className="flex flex-col items-center min-w-0 flex-1 px-3">
          <span className="text-[11px] font-bold text-emerald-700 truncate max-w-[160px] leading-tight">
            {label}
          </span>
          <span className="text-[9px] text-slate-400 font-medium mt-0.5 tracking-wide uppercase">
            TarpoVizyon
          </span>
        </div>

        {/* Ana Sayfa butonu */}
        <button
          onClick={() => navigate('/m')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl tap-active transition-transform duration-150"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.10) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.30)',
            boxShadow: '0 1px 4px rgba(16, 185, 129, 0.12)',
          }}
        >
          <Home size={15} className="text-emerald-600" />
          <span className="text-xs text-emerald-700 font-semibold">Ana Sayfa</span>
        </button>
      </div>
    </div>
  );
}
