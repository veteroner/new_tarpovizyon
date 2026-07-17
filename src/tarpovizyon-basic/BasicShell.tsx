import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from './pages';
import type { Section } from './types';
import './tarpovizyon-basic.css';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`tvb-chevron${open ? ' tvb-chevron--open' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SectionColumn({ section }: { section: Section }) {
  return (
    <div className="tvb-nav__mega-col">
      <div className="tvb-nav__mega-heading">{section.label}</div>
      {section.pages.map((page) => (
        <NavLink
          key={page.path}
          to={`/tarpovizyon-basic/${section.path}/${page.path}`}
          className={({ isActive }) => `tvb-nav__link${isActive ? ' tvb-nav__link--active' : ''}`}
        >
          {page.label}
        </NavLink>
      ))}
    </div>
  );
}

export function BasicShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const activeGroup = NAV_GROUPS.find((g) =>
    g.sections.some((s) => location.pathname.startsWith(`/tarpovizyon-basic/${s.path}/`))
  );

  // Close menus on route change; keep the active group pre-expanded in the mobile drawer.
  useEffect(() => {
    setOpenGroup(null);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen && activeGroup) setMobileGroup(activeGroup.label);
  }, [mobileOpen, activeGroup]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Esc closes the drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="tvb-shell">
      <header className="tvb-header">
        <button className="tvb-back" onClick={() => navigate('/')}>← TARPOL</button>
        <h1>TarpoVizyon Basic</h1>
        <button
          className="tvb-menu-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menü"
          aria-expanded={mobileOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Desktop mega nav */}
      <nav className="tvb-nav" ref={navRef}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={`tvb-nav__section${group.sections.length > 1 ? ' tvb-nav__section--wide' : ''}`}>
            <button
              className={`tvb-nav__section-btn${activeGroup?.label === group.label ? ' tvb-nav__section-btn--active' : ''}`}
              onClick={() => setOpenGroup((prev) => (prev === group.label ? null : group.label))}
            >
              {group.label} <span className="tvb-nav__caret">▾</span>
            </button>
            {openGroup === group.label && (
              <div className={`tvb-nav__dropdown${group.sections.length > 1 ? ' tvb-nav__dropdown--mega' : ''}`}>
                {group.sections.map((section) => (
                  <SectionColumn key={section.path} section={section} />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Mobile slide-in drawer */}
      <div
        className={`tvb-scrim${mobileOpen ? ' tvb-scrim--open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <nav className={`tvb-drawer${mobileOpen ? ' tvb-drawer--open' : ''}`} aria-hidden={!mobileOpen}>
        <div className="tvb-drawer__head">
          <span className="tvb-drawer__title">Menü</span>
          <button className="tvb-drawer__close" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className="tvb-drawer__body">
          {NAV_GROUPS.map((group) => {
            const expanded = mobileGroup === group.label;
            return (
              <div key={group.label} className="tvb-drawer__group">
                <button
                  className={`tvb-drawer__group-btn${activeGroup?.label === group.label ? ' is-active' : ''}`}
                  onClick={() => setMobileGroup((prev) => (prev === group.label ? null : group.label))}
                  aria-expanded={expanded}
                >
                  <span>{group.label}</span>
                  <Chevron open={expanded} />
                </button>
                {expanded && (
                  <div className="tvb-drawer__items">
                    {group.sections.map((section) => (
                      <div key={section.path} className="tvb-drawer__subsection">
                        {group.sections.length > 1 && <div className="tvb-drawer__subheading">{section.label}</div>}
                        {section.pages.map((page) => (
                          <NavLink
                            key={page.path}
                            to={`/tarpovizyon-basic/${section.path}/${page.path}`}
                            className={({ isActive }) => `tvb-drawer__link${isActive ? ' tvb-drawer__link--active' : ''}`}
                          >
                            {page.label}
                          </NavLink>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <main className="tvb-content">
        <Outlet />
      </main>
    </div>
  );
}
