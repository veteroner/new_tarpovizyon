import { Outlet, useLocation } from 'react-router-dom';
import TabBar from './TabBar';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Mobile Layout Wrapper
 * 
 * Wraps all mobile routes with:
 * - Dark theme background
 * - Bottom TabBar 
 * - Back button for detail pages
 */

const TAB_PATHS = ['/m', '/m/explore', '/m/market', '/m/ai', '/m/settings'];

export default function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current path is a main tab or a detail page
  const isTabPage = TAB_PATHS.includes(location.pathname);
  const isDetailPage = !isTabPage && location.pathname.startsWith('/m/');

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-700">
      {/* Detail page back header */}
      {isDetailPage && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 pt-safe pb-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-100 tap-active"
            >
              <ArrowLeft size={20} className="text-slate-500" />
            </button>
            <span className="text-sm font-medium text-slate-600 truncate">
              Geri
            </span>
          </div>
        </header>
      )}

      {/* Page Content */}
      <div className={isDetailPage ? 'pt-16' : ''}>
        <Outlet />
      </div>

      {/* TabBar — always visible */}
      <TabBar />
    </div>
  );
}
