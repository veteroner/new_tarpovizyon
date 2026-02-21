import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

interface GlobalNavProps {
  hideOnHome?: boolean;
}

export function GlobalNav({ hideOnHome = true }: GlobalNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';

  // PageHeader kullanan menü/alt menü sayfalarında GlobalNav'i gizleyip
  // aynı butonların iki kez görünmesini engelliyoruz.
  const hideOnMenuRoutes = new Set([
    '/world',
    '/world/macro',
    '/world/plant',
    '/world/animal',
    '/turkey',
    '/turkey/plant',
    '/turkey/animal',
  ]);

  if (hideOnHome && isHome) return null;
  if (hideOnMenuRoutes.has(location.pathname)) return null;

  return (
    <div className="global-nav" role="navigation" aria-label="Hızlı gezinme">
      <button
        type="button"
        className="global-nav-btn"
        onClick={() => navigate(-1)}
        aria-label="Geri"
      >
        <ArrowLeft size={18} />
        <span>Geri</span>
      </button>

      <button
        type="button"
        className="global-nav-btn"
        onClick={() => navigate('/')}
        aria-label="Ana Sayfa"
      >
        <Home size={18} />
        <span>Ana Sayfa</span>
      </button>
    </div>
  );
}
