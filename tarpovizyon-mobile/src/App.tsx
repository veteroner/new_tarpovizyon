import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import TabBar from './components/layout/TabBar';

/**
 * TarpoVizyon Mobile - Root Component
 * 
 * 5 ana tab + alt sayfa routing yapısı.
 * Lazy loading ile sayfa bazlı code splitting.
 */

// ── Tab Pages (lazy loaded) ────────────────────────────
const HomePage = lazy(() => import('./pages/tabs/HomePage'));
const ExplorePage = lazy(() => import('./pages/tabs/ExplorePage'));
const ProductionPage = lazy(() => import('./pages/tabs/ProductionPage'));
const MarketPage = lazy(() => import('./pages/tabs/MarketPage'));
const AIAssistantPage = lazy(() => import('./pages/tabs/AIAssistantPage'));
const SettingsPage = lazy(() => import('./pages/tabs/SettingsPage'));

// ── Sub Pages (lazy loaded) ────────────────────────────
const TurkeyProductionPage = lazy(() => import('./pages/production/TurkeyProductionPage'));
const WorldProductionPage = lazy(() => import('./pages/production/WorldProductionPage'));
const PricesPage = lazy(() => import('./pages/market/PricesPage'));
const TradePage = lazy(() => import('./pages/market/TradePage'));
const LookerReportPage = lazy(() => import('./pages/shared/LookerReportPage'));

// ── Data Pages (lazy loaded) ──────────────────────────
const WorldDataPage = lazy(() => import('./pages/data/WorldDataPage'));
const TurkeyDataPage = lazy(() => import('./pages/data/TurkeyDataPage'));
const ProvincialDataPage = lazy(() => import('./pages/data/ProvincialDataPage'));
const EconomicDataPage = lazy(() => import('./pages/data/EconomicDataPage'));

// ── App Pages (lazy loaded) ───────────────────────────
const RasyonPage = lazy(() => import('./pages/apps/RasyonPage'));
const ExternalPage = lazy(() => import('./pages/apps/ExternalPage'));

// ── Tool Pages ─────────────────────────────────────────
const HarvestForecastPage = lazy(() => import('./pages/tools/HarvestForecastPage'));
const IrrigationPage = lazy(() => import('./pages/tools/IrrigationPage'));
const FertilizerPage = lazy(() => import('./pages/tools/FertilizerPage'));
const CalendarPage = lazy(() => import('./pages/tools/CalendarPage'));

// ── Loading Fallback ───────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-dark-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <span className="text-xs text-gray-500">Yükleniyor...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-900 text-white">
        {/* Main Content - tab bar yüksekliği kadar padding-bottom */}
        <main className="pb-[72px]">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Tab Routes ────────────────── */}
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/production" element={<ProductionPage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/ai" element={<AIAssistantPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* ── Production Sub-Routes ─────── */}
              <Route path="/production/turkey" element={<TurkeyProductionPage />} />
              <Route path="/production/world" element={<WorldProductionPage />} />

              {/* ── Market Sub-Routes ─────────── */}
              <Route path="/market/prices" element={<PricesPage />} />
              <Route path="/market/trade" element={<TradePage />} />

              {/* ── World Data Routes (FAO) ───── */}
              <Route path="/data/world/:category" element={<WorldDataPage />} />

              {/* ── Turkey Data Routes (TÜİK) ─── */}
              <Route path="/data/turkey/:category" element={<TurkeyDataPage />} />

              {/* ── Provincial Data Routes ────── */}
              <Route path="/data/provincial/:category" element={<ProvincialDataPage />} />

              {/* ── Economic Data Routes ──────── */}
              <Route path="/data/economic/:category" element={<EconomicDataPage />} />

              {/* ── App Routes (WebView) ──────── */}
              <Route path="/apps/rasyon" element={<RasyonPage />} />
              <Route path="/apps/:appId" element={<ExternalPage />} />

              {/* ── Tool Routes ───────────────── */}
              <Route path="/tools/harvest" element={<HarvestForecastPage />} />
              <Route path="/tools/irrigation" element={<IrrigationPage />} />
              <Route path="/tools/fertilizer" element={<FertilizerPage />} />
              <Route path="/tools/calendar" element={<CalendarPage />} />

              {/* ── Looker Reports (WebView) ──── */}
              <Route path="/report/:reportId" element={<LookerReportPage />} />

              {/* ── 404 → Home ────────────────── */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </main>

        {/* Bottom Tab Bar - her zaman görünür */}
        <TabBar />
      </div>
    </BrowserRouter>
  );
}
