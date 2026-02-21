import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Breadcrumb } from './Breadcrumb';

interface NavItem {
  path: string;
  label: string;
  icon?: string;
}

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

interface PageHeaderProps {
  title: string;
  icon?: string;
  color?: string;
  breadcrumbs: BreadcrumbItem[];
  navItems?: NavItem[];
}

export function PageHeader({ title, icon, color = '#3b82f6', breadcrumbs, navItems }: PageHeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="page-header-nav" style={{ '--header-color': color } as React.CSSProperties}>
      {/* Top Bar */}
      <div className="page-header-top">
        <div className="page-header-left">
          <button
            type="button"
            className="page-header-back"
            onClick={() => navigate(-1)}
            aria-label="Geri"
          >
            <ArrowLeft size={18} />
            <span>Geri</span>
          </button>
          <Breadcrumb items={breadcrumbs} />
        </div>

        <div className="page-header-center">
          {icon && <span className="page-header-icon">{icon}</span>}
          <h1 className="page-header-title">{title}</h1>
        </div>

        <div className="page-header-right">
          <button className="page-header-home" onClick={() => navigate('/')}>
            <Home size={18} />
            <span>Ana Sayfa</span>
          </button>
          
          {navItems && navItems.length > 0 && (
            <button 
              className="page-header-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      {navItems && navItems.length > 0 && (
        <nav className={`page-header-tabs ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="page-header-tabs-scroll">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `page-header-tab ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon && <span className="tab-icon">{item.icon}</span>}
                <span className="tab-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="page-header-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}
