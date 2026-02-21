/**
 * RasyonApp — teknova rasyon mobil uygulamasının dashboard içine entegre edilmiş hali.
 * BrowserRouter kaldırıldı; dashboard'un mevcut Router'ı kullanılıyor.
 * Tüm route'lar /rasyon/* prefix'i ile tanımlı.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import { ConfigProvider } from '@/contexts/ConfigContext'
import { DEFAULT_CONFIG } from '@/types/config'
import WizardLayout from '@/pages/wizard/WizardLayout'
import StepMode from '@/pages/wizard/StepMode'
import StepAnimal from '@/pages/wizard/StepAnimal'
import StepGoal from '@/pages/wizard/StepGoal'
import StepFeeds from '@/pages/wizard/StepFeeds'
import StepAutoGoal from '@/pages/wizard/StepAutoGoal'
import StepAutoAnimal from '@/pages/wizard/StepAutoAnimal'
import StepAutoFeeds from '@/pages/wizard/StepAutoFeeds'
import '@/index.css'

const Home = lazy(() => import('@/pages/Home'))
const StepReview = lazy(() => import('@/pages/wizard/StepReview'))
const StepAutoReview = lazy(() => import('@/pages/wizard/StepAutoReview'))
const RationResultV2 = lazy(() => import('@/pages/RationResultV2'))
const RationEdit = lazy(() => import('@/pages/RationEdit'))
const RationHistory = lazy(() => import('@/pages/RationHistory'))
const FeedLibrary = lazy(() => import('@/pages/FeedLibrary'))
const RationLibrary = lazy(() => import('@/pages/RationLibrary'))
const FeedInventory = lazy(() => import('@/pages/FeedInventory'))
const DiagnosticsOptimizer = lazy(() => import('@/pages/DiagnosticsOptimizer'))
const RationEvaluationPage = lazy(() => import('@/pages/RationEvaluationPage'))
const ScenarioComparisonPage = lazy(() => import('@/pages/ScenarioComparisonPage'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService'))
const DataBackup = lazy(() => import('@/pages/DataBackup'))
const Help = lazy(() => import('@/pages/Help'))
const Settings = lazy(() => import('@/pages/Settings'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))

const rasyonQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

const rasyonConfig = {
  ...DEFAULT_CONFIG,
  appName: 'TarpoRasyon',
  appSlogan: 'NRC 2021 Tabanlı Rasyon Optimizasyonu',
  theme: { ...DEFAULT_CONFIG.theme, primary: '#16a34a' },
}

export function RasyonApp() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={rasyonQueryClient}>
        <ConfigProvider config={rasyonConfig}>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />

                <Route path="wizard" element={<WizardLayout />}>
                  <Route index element={<Navigate to="/rasyon/wizard/mode" replace />} />
                  <Route path="mode" element={<StepMode />} />
                  <Route path="animal" element={<StepAnimal />} />
                  <Route path="goal" element={<StepGoal />} />
                  <Route path="feeds" element={<StepFeeds />} />
                  <Route path="review" element={<StepReview />} />
                  <Route path="auto-goal" element={<StepAutoGoal />} />
                  <Route path="auto-animal" element={<StepAutoAnimal />} />
                  <Route path="auto-feeds" element={<StepAutoFeeds />} />
                  <Route path="auto-review" element={<StepAutoReview />} />
                </Route>

                <Route path="ration/:id" element={<RationResultV2 />} />
                <Route path="ration/:id/edit" element={<RationEdit />} />
                <Route path="history" element={<RationHistory />} />
                <Route path="rations" element={<RationLibrary />} />
                <Route path="feeds" element={<FeedLibrary />} />
                <Route path="inventory" element={<FeedInventory />} />
                <Route path="diagnostics/optimizer" element={<DiagnosticsOptimizer />} />
                <Route path="evaluation" element={<RationEvaluationPage />} />
                <Route path="scenarios" element={<ScenarioComparisonPage />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="terms" element={<TermsOfService />} />
                <Route path="backup" element={<DataBackup />} />
                <Route path="help" element={<Help />} />
                <Route path="settings" element={<Settings />} />
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
            </Routes>
          </Suspense>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
