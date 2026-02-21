import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useRationWizardStore } from '@/store/rationWizardStore'

const manualSteps = [
  { path: '/rasyon/wizard/animal', label: 'Hayvan' },
  { path: '/rasyon/wizard/goal', label: 'Hedef' },
  { path: '/rasyon/wizard/feeds', label: 'Yemler' },
  { path: '/rasyon/wizard/review', label: 'Önizleme' },
] as const

const autoSteps = [
  { path: '/rasyon/wizard/auto-goal', label: 'Amaç' },
  { path: '/rasyon/wizard/auto-animal', label: 'Hayvan' },
  { path: '/rasyon/wizard/auto-feeds', label: 'Yemler' },
  { path: '/rasyon/wizard/auto-review', label: 'Hesapla' },
] as const

export default function WizardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const reset = useRationWizardStore((s) => s.reset)
  const mode = useRationWizardStore((s) => s.draft.mode)

  const isModePage = location.pathname === '/rasyon/wizard/mode'
  const steps = mode === 'auto' ? autoSteps : manualSteps

  const currentIndex = useMemo(() => {
    if (isModePage) return -1
    const idx = steps.findIndex((s) => location.pathname.startsWith(s.path))
    return idx === -1 ? 0 : idx
  }, [location.pathname, steps, isModePage])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 pb-20">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              type="button"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Geri</span>
            </button>

            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">
                {isModePage ? 'Mod Seçimi' : mode === 'auto' ? 'Otomatik Rasyon' : 'Rasyon Sihirbazı'}
              </h1>
              {!isModePage && (
                <p className="text-xs text-gray-500">{currentIndex + 1}/{steps.length} adım</p>
              )}
            </div>

            <button
              onClick={() => {
                reset()
                navigate('/rasyon/wizard/mode')
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
              type="button"
            >
              Sıfırla
            </button>
          </div>

          {!isModePage && (
            <div className={`mt-4 grid gap-2`} style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
              {steps.map((step, idx) => (
                <NavLink
                  key={step.path}
                  to={step.path}
                  className={({ isActive }) =>
                    `rounded-lg px-2 py-2 text-center text-xs font-medium border transition ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : idx <= currentIndex
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`
                  }
                >
                  {step.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  )
}
