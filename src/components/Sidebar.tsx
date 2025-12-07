import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, TrendingDown, Truck, Leaf, Activity } from 'lucide-react';

interface SidebarProps {
  apiConnected: boolean;
}

export function Sidebar({ apiConnected }: SidebarProps) {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Genel Bakış' },
    { path: '/export', icon: TrendingUp, label: 'İhracat' },
    { path: '/import', icon: TrendingDown, label: 'İthalat' },
    { path: '/transport', icon: Truck, label: 'Taşıma' },
    { path: '/production', icon: Leaf, label: 'Üretim' },
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
        {navItems.map((item) => (
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
