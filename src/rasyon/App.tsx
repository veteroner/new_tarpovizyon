import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, lazy } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import OnboardingTour from './components/OnboardingTour'
import { CookieConsent } from './components/CookieConsent'
import Layout from './components/Layout'
import { useAppConfig } from './contexts/ConfigContext'
import WizardLayout from './pages/wizard/WizardLayout'
import StepMode from './pages/wizard/StepMode'
import StepAnimal from './pages/wizard/StepAnimal'
import StepGoal from './pages/wizard/StepGoal'
import StepFeeds from './pages/wizard/StepFeeds'
import StepAutoGoal from './pages/wizard/StepAutoGoal'
import StepAutoAnimal from './pages/wizard/StepAutoAnimal'
import StepAutoFeeds from './pages/wizard/StepAutoFeeds'

const Home = lazy(() => import('./pages/Home'))
const StepReview = lazy(() => import('./pages/wizard/StepReview'))
const StepAutoReview = lazy(() => import('./pages/wizard/StepAutoReview'))
const RationResultV2 = lazy(() => import('./pages/RationResultV2'))
const RationEdit = lazy(() => import('./pages/RationEdit'))
const RationHistory = lazy(() => import('./pages/RationHistory'))
const FeedLibrary = lazy(() => import('./pages/FeedLibrary'))
const RationLibrary = lazy(() => import('./pages/RationLibrary'))
const FeedInventory = lazy(() => import('./pages/FeedInventory'))
const DiagnosticsOptimizer = lazy(() => import('./pages/DiagnosticsOptimizer'))
const RationEvaluationPage = lazy(() => import('./pages/RationEvaluationPage'))
const ScenarioComparisonPage = lazy(() => import('./pages/ScenarioComparisonPage'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const DataBackup = lazy(() => import('./pages/DataBackup'))
const Help = lazy(() => import('./pages/Help'))
const Settings = lazy(() => import('./pages/Settings'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  const config = useAppConfig()
  const [runTour, setRunTour] = useState(false)

  useEffect(() => {
    // Only run tour if feature is enabled
    if (config.features?.onboardingTour) {
      const timer = setTimeout(() => {
        setRunTour(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [config.features?.onboardingTour])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OnboardingTour run={runTour} />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />

              <Route path="wizard" element={<WizardLayout />}>
                <Route index element={<Navigate to="/rasyon/wizard/mode" replace />} />
                <Route path="mode" element={<StepMode />} />

                {/* Manuel Mod Akışı */}
                <Route path="animal" element={<StepAnimal />} />
                <Route path="goal" element={<StepGoal />} />
                <Route path="feeds" element={<StepFeeds />} />
                <Route path="review" element={<StepReview />} />

                {/* Otomatik Mod Akışı */}
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
          <CookieConsent />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
