import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { BookOpen, Library, Menu, X, Wand2, Clock, Package, ClipboardCheck, GitCompare, Database, HelpCircle, Settings } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ToastContainer from './ToastContainer'
import { useRationWizardStore } from '@/store/rationWizardStore'
import { trackPageView } from '@/utils/analytics'
import { useAppConfig, useIsEmbedded } from '@/contexts/ConfigContext'

export default function Layout() {
  const config = useAppConfig()
  const isEmbedded = useIsEmbedded()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const hasChosenMode = useRationWizardStore((s) => s.draft.hasChosenMode)

  useEffect(() => {
    if (hasChosenMode) return
    if (location.pathname.startsWith('/rasyon/wizard')) return
    navigate('/rasyon/wizard/mode', { replace: true })
  // navigate is stable, intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChosenMode, location.pathname])

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <ToastContainer />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm safe-top">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {config.logo ? (
              <img src={config.logo} alt={config.appName} className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                <span className="text-xl font-bold text-white">R</span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">{config.appName}</h1>
              <p className="text-xs text-gray-500">{config.appSlogan || 'Hayvan Besleme Danışmanı'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AUTH DISABLED: User menu and login link removed */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="touch-target flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
              aria-label="Menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-200 bg-white"
            >
              <div className="mx-auto max-w-4xl space-y-1 px-4 py-3">
                <NavLink
                  to="/rasyon/wizard/mode"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <Wand2 size={20} />
                  <span>Rasyon Sihirbazı</span>
                </NavLink>

                <NavLink
                  to="/rasyon/rations"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <BookOpen size={20} />
                  <span>Hazır Rasyonlar</span>
                </NavLink>

                <NavLink
                  to="/rasyon/history"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <Clock size={20} />
                  <span>Geçmiş Rasyonlar</span>
                </NavLink>

                <NavLink
                  to="/rasyon/feeds"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  data-tour="feed-library"
                >
                  <Library size={20} />
                  <span>Yem Kütüphanesi</span>
                </NavLink>

                <NavLink
                  to="/rasyon/inventory"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <Package size={20} />
                  <span>Yem Envanteri</span>
                </NavLink>

                <NavLink
                  to="/rasyon/evaluation"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <ClipboardCheck size={20} />
                  <span>Rasyon Değerlendirme</span>
                </NavLink>

                <NavLink
                  to="/rasyon/scenarios"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <GitCompare size={20} />
                  <span>Senaryo Karşılaştırma</span>
                </NavLink>

                <NavLink
                  to="/rasyon/backup"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  data-tour="backup-link"
                >
                  <Database size={20} />
                  <span>Veri Yedekleme</span>
                </NavLink>

                <NavLink
                  to="/rasyon/help"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <HelpCircle size={20} />
                  <span>Yardım</span>
                </NavLink>

                <NavLink
                  to="/rasyon/settings"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <Settings size={20} />
                  <span>Ayarlar</span>
                </NavLink>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-safe-bottom">
        <Suspense fallback={<div className="p-4 text-sm text-gray-600">Yükleniyor...</div>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Footer */}
      {!isEmbedded && (
        <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500 safe-bottom">
          <p>© 2026 {config.appName} | Karar Destek Sistemi</p>
          <p className="mt-1">
            <strong>Uyarı:</strong> Bu sonuçlar tahmindir. Uzman onayı önerilir.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link to="/rasyon/privacy" className="text-gray-500 hover:text-primary-600 hover:underline">
              Gizlilik Politikası
            </Link>
            <Link to="/rasyon/terms" className="text-gray-500 hover:text-primary-600 hover:underline">
              Kullanım Şartları
            </Link>
            {config.contact?.website && (
              <a
                href={config.contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-primary-600 hover:underline"
              >
                Web Sitesi
              </a>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
