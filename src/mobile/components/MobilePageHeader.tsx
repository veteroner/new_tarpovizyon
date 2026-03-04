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
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #d1fae5',
        boxShadow: '0 1px 8px rgba(16,185,129,0.08)',
      }}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-safe">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 active:scale-95 transition-transform"
        >
          <ArrowLeft size={16} className="text-slate-600" />
          <span className="text-xs text-slate-600 font-medium">Geri</span>
        </button>

        {/* Current page label */}
        <span className="text-xs font-semibold text-slate-600 truncate max-w-[140px]">
          {label}
        </span>

        {/* Home button */}
        <button
          onClick={() => navigate('/m')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 active:scale-95 transition-transform"
        >
          <Home size={16} className="text-emerald-600" />
          <span className="text-xs text-emerald-600 font-medium">Ana Sayfa</span>
        </button>
      </div>
    </div>
  );
}
