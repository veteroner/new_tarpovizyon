import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, TrendingDown, Truck, Leaf, Activity, Beef, Milk, Egg, Trophy } from 'lucide-react';

interface SidebarProps {
  apiConnected: boolean;
}

export function Sidebar({ apiConnected }: SidebarProps) {
  const mainNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Genel Bakış' },
    { path: '/export', icon: TrendingUp, label: 'İhracat' },
    { path: '/import', icon: TrendingDown, label: 'İthalat' },
    { path: '/transport', icon: Truck, label: 'Taşıma' },
    { path: '/production', icon: Leaf, label: 'Üretim' },
  ];

  const animalProductionItems = [
    { path: '/meat', icon: Beef, label: 'Et Üretimi' },
    { path: '/dairy', icon: Milk, label: 'Süt Üretimi' },
    { path: '/eggs', icon: Egg, label: 'Yumurta' },
    { path: '/competition', icon: Trophy, label: 'Rekabet Analizi' },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity size={24} color="white" />
        </div>
        <span className="sidebar-title">IST Dashboard</span>
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

        <div className="nav-section-title">Hayvansal Üretim</div>
        
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
