import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import DataShell, { KabuksuzMasaustu } from './components/DataShell';
import { ProgramSelectionPage } from './pages/ProgramSelectionPage';
// Mobile imports
import { isPlatform } from './mobile/utils/platform';
import MobileLayout from './mobile/components/MobileLayout';
import MobilePageHeader from './mobile/components/MobilePageHeader';
import MobileHomePage from './mobile/pages/MobileHomePage';
import MobileExplorePage from './mobile/pages/MobileExplorePage';
import MobileMarketPage from './mobile/pages/MobileMarketPage';
import MobileAIPage from './mobile/pages/MobileAIPage';
import MobileSettingsPage from './mobile/pages/MobileSettingsPage';
const SelectionPage = lazy(() => import('./pages/SelectionPage').then(m => ({ default: m.SelectionPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const TradePage = lazy(() => import('./pages/TradePage').then(m => ({ default: m.TradePage })));
const ProductionPage = lazy(() => import('./pages/ProductionPage').then(m => ({ default: m.ProductionPage })));
const TurkeyAnimalProductionPage = lazy(() => import('./pages/TurkeyAnimalProductionPage'));
const LivestockCompetitionPage = lazy(() => import('./pages/LivestockCompetitionPage').then(m => ({ default: m.LivestockCompetitionPage })));
// Hayvansal Üretim Sayfaları (TON bazlı)
const RedMeatProductionPage = lazy(() => import('./pages/RedMeatProductionPage'));
const WhiteMeatProductionPage = lazy(() => import('./pages/WhiteMeatProductionPage'));
const MilkProductionPage = lazy(() => import('./pages/MilkProductionPage'));
const EggProductionPage = lazy(() => import('./pages/EggProductionPage'));
const OtherAnimalProductsPage = lazy(() => import('./pages/OtherAnimalProductsPage'));
// TÜİK Hayvansal Üretim (Türkiye)
const TurkeyRedMeatProductionPage = lazy(() => import('./pages/TurkeyRedMeatProductionPage'));
const TurkeyWhiteMeatProductionPage = lazy(() => import('./pages/TurkeyWhiteMeatProductionPage'));
const TurkeyMilkProductionPage = lazy(() => import('./pages/TurkeyMilkProductionPage'));
const TurkeyEggProductionPage = lazy(() => import('./pages/TurkeyEggProductionPage'));
const TurkeyBeekeepingPage = lazy(() => import('./pages/TurkeyBeekeepingPage'));
const TurkeyOtherAnimalProductsPage = lazy(() => import('./pages/TurkeyOtherAnimalProductsPage'));
// Bitkisel Üretim Sayfaları
const CerealProductionPage = lazy(() => import('./pages/CerealProductionPage'));
const VegetableProductionPage = lazy(() => import('./pages/VegetableProductionPage'));
const FruitProductionPage = lazy(() => import('./pages/FruitProductionPage'));
const LegumeProductionPage = lazy(() => import('./pages/LegumeProductionPage'));
const OilseedProductionPage = lazy(() => import('./pages/OilseedProductionPage'));
const SugarCropProductionPage = lazy(() => import('./pages/SugarCropProductionPage'));
const NutProductionPage = lazy(() => import('./pages/NutProductionPage'));
const BeverageCropPage = lazy(() => import('./pages/BeverageCropPage'));
const FiberCropPage = lazy(() => import('./pages/FiberCropPage'));
// FAO Verileri Sayfaları
const LandUsePage = lazy(() => import('./pages/LandUsePage'));
const LivestockStocksPage = lazy(() => import('./pages/LivestockStocksPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const VeriYuklePage = lazy(() => import('./pages/VeriYuklePage'));
const AgriculturalEmploymentPage = lazy(() => import('./pages/AgriculturalEmploymentPage'));
const FertilizerPage = lazy(() => import('./pages/FertilizerPage'));
const PesticidePage = lazy(() => import('./pages/PesticidePage'));
const PopulationPage = lazy(() => import('./pages/PopulationPage'));
const LandCoverPage = lazy(() => import('./pages/LandCoverPage'));
const FoodBalancePage = lazy(() => import('./pages/FoodBalancePage'));
// Yeni Sayfalar
const PriceIndexPage = lazy(() => import('./pages/PriceIndexPage'));
const MacroEconomicPage = lazy(() => import('./pages/MacroEconomicPage'));
const TuikPlantProductionPage = lazy(() => import('./pages/TuikPlantProductionPage'));
const TuikLivestockPage = lazy(() => import('./pages/TuikLivestockPage'));
const TurkeyProvincialLivestockPage = lazy(() => import('./pages/TurkeyProvincialLivestockPage'));
const TurkeyProvincialPlantPage = lazy(() => import('./pages/TurkeyProvincialPlantPage'));
const GeographicalIndicationsPage = lazy(() => import('./pages/GeographicalIndicationsPage'));
const BasinProductionPage = lazy(() => import('./pages/BasinProductionPage'));
import { RasyonApp } from './rasyon/RasyonApp';
const HasatTahminiPage = lazy(() => import('./pages/HasatTahminiPage').then(m => ({ default: m.HasatTahminiPage })));
const SulamaPlanPage = lazy(() => import('./pages/SulamaPlanPage'));
const GubreHesapPage = lazy(() => import('./pages/GubreHesapPage'));
const TarimTakvimPage = lazy(() => import('./pages/TarimTakvimPage'));
const ProductBalancePage = lazy(() => import('./pages/ProductBalancePage'));
const TurkeyMacroPage = lazy(() => import('./pages/TurkeyMacroPage'));
const CrossIntelligencePage = lazy(() => import('./pages/CrossIntelligencePage'));
const CommodityPricesPage = lazy(() => import('./pages/CommodityPricesPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage').then(m => ({ default: m.OverviewPage })));
import ErrorBoundary from './components/ErrorBoundary';
import { tarpovizyonBasicRoutes } from './tarpovizyon-basic/routes';

import './styles/globals.css';
// globals.css'ten SONRA: satır içi grid'leri mobilde ezen kurallar burada.
import './styles/dataviz-tokens.css';
import './styles/responsive.css';

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  
  // Ana program seçimi, Tarpovizyon giriş ve Tarpovizyon ana sayfalarda header'ı gizle
  const isProgramSelection = location.pathname === '/';
  const isTarpovizyonSelection = location.pathname === '/tarpovizyon';
  const isTarpovizyonHome = location.pathname === '/tarpovizyon/world' || location.pathname === '/tarpovizyon/turkey';
  const isRasyonPage = location.pathname.startsWith('/rasyon');
  const isHasatPage = location.pathname === '/hasat-tahmini';
  const isSulamaPage = location.pathname === '/sulama-plan';
  const isGubrePage = location.pathname === '/gubre-hesap';
  const isTakvimPage = location.pathname === '/tarim-takvim';
  const isMobilePage = location.pathname.startsWith('/m');
  const isTarpovizyonBasicPage = location.pathname.startsWith('/tarpovizyon-basic');
  // TarpoShell handles its own layout for all /tarpovizyon/* data pages
  const isTarpoShellRoute =
    location.pathname.startsWith('/tarpovizyon/') &&
    !isTarpovizyonHome;
  const hideHeader = isProgramSelection || isTarpovizyonSelection || isTarpovizyonHome || isRasyonPage || isHasatPage || isSulamaPage || isGubrePage || isTakvimPage || isMobilePage || isTarpoShellRoute || isTarpovizyonBasicPage;

  /*
   * Capacitor'daki kalıcı geri+ana sayfa çubuğu.
   *
   * Artık YALNIZCA iOS kabuğunun kapsamadığı rotalarda. Veri sayfaları,
   * Basic ve araçlar kendi gezinme çubuğunu (geri düğmesi + sayfa başlığı)
   * kabuktan alıyor; bu çubuk orada ikinci bir başlık olarak üst üste
   * biniyordu. Ayrıca kendi sayfa-adı sözlüğünü taşıyor — menü tek kaynağa
   * indirildikten sonra dördüncü kopya oluyordu.
   */
  const kabukluRota = isTarpoShellRoute || isTarpovizyonBasicPage
    || isHasatPage || isSulamaPage || isGubrePage || isTakvimPage;
  const showMobilePageHeader =
    isPlatform('capacitor') && !isMobilePage && !isProgramSelection && !kabukluRota;

  return (
    <>
      {/* Mobile persistent nav — shown inside Capacitor on all non-mobile routes */}
      {showMobilePageHeader && <MobilePageHeader />}

      {/* Header - Ana sayfa ve seçim sayfası dışında göster */}
      {!hideHeader && <Header />}

      <main className={isTarpoShellRoute ? 'tarpo-shell-host' : `${hideHeader ? '' : 'main-content with-header'} ${showMobilePageHeader ? 'pt-12' : ''}`}>
        {/*
          * 53 sayfa statik import ediliyordu; hepsi tek pakete giriyor ve
          * mobilde ilk açılışta 1 MB gzip indiriliyordu. Rotalar lazy'ye
          * çevrildi — kullanıcı yalnızca açtığı sayfanın kodunu indiriyor.
          */}
        <Suspense fallback={<div className="loading"><div className="loading-spinner" /><p>Yükleniyor...</p></div>}>
        <Routes>
          {/* Mobil Uygulama Rotaları */}
          <Route path="/m" element={<MobileLayout />}>
            <Route index element={<MobileHomePage />} />
            <Route path="explore" element={<MobileExplorePage />} />
            <Route path="market" element={<MobileMarketPage />} />
            <Route path="ai" element={<MobileAIPage />} />
            <Route path="settings" element={<MobileSettingsPage />} />
          </Route>

          {/* Ana Program Seçimi — Capacitor'da mobil ana sayfaya yönlendir */}
          <Route path="/" element={isPlatform('capacitor') ? <Navigate to="/m" replace /> : <ProgramSelectionPage />} />
          
          {/*
            * Çiftçi araçları.
            *
            * Mobilde iOS kabuğunun İÇİNDE açılıyorlar. Eskiden kabuğun
            * dışındaydılar: araca girince sekme çubuğu kayboluyor, sayfanın
            * kendi "← Ana Sayfa" düğmesi de kullanıcıyı masaüstü program
            * seçim ekranına atıyordu — uygulamadan çıkmış gibi oluyordu.
            *
            * Masaüstünde kabuk yok, sayfa eskisi gibi tek başına.
            */}
          <Route element={<DataShell desktop={<KabuksuzMasaustu />} />}>
            <Route path="/hasat-tahmini" element={<ErrorBoundary><HasatTahminiPage /></ErrorBoundary>} />
            <Route path="/sulama-plan" element={<ErrorBoundary><SulamaPlanPage /></ErrorBoundary>} />
            <Route path="/gubre-hesap" element={<ErrorBoundary><GubreHesapPage /></ErrorBoundary>} />
            <Route path="/tarim-takvim" element={<ErrorBoundary><TarimTakvimPage /></ErrorBoundary>} />
          </Route>
          
          {/* TARPOL Rasyon (tam entegre) */}
          <Route path="/rasyon/*" element={<RasyonApp />} />

          {/* TARPOVIZYON BASIC — Cloudflare D1 tabanlı, Looker raporu birebir kopyası */}
          {tarpovizyonBasicRoutes()}
          
          {/* TARPOVIZYON - Giriş ve Ana Sayfalar (TarpoShell dışında) */}
          <Route path="/tarpovizyon" element={<SelectionPage />} />
          <Route path="/tarpovizyon/world" element={<HomePage />} />
          <Route path="/tarpovizyon/turkey" element={<HomePage />} />
          <Route path="/tarpovizyon/overview" element={<Navigate to="/tarpovizyon/turkey/overview" replace />} />
          <Route path="/tarpovizyon/turkey/tuik-plant" element={<Navigate to="/tarpovizyon/turkey/plant-production" replace />} />

          {/* TARPOVIZYON - Veri Sayfaları
              Kabuk cihaza göre seçiliyor: geniş ekranda pano (TarpoShell),
              dar ekranda ve Capacitor'da iOS kabuğu. Rotalar tek yerde. */}
          <Route element={<DataShell />}>
            <Route path="/tarpovizyon/turkey/overview" element={<ErrorBoundary><OverviewPage /></ErrorBoundary>} />
            <Route path="/tarpovizyon/commodity-prices" element={<ErrorBoundary><CommodityPricesPage /></ErrorBoundary>} />
            <Route path="/tarpovizyon/ai-assistant" element={<ErrorBoundary><AIAssistantPage /></ErrorBoundary>} />

            {/* DÜNYA (FAO) VERİLERİ */}
            <Route path="/tarpovizyon/world/macro-economic" element={<MacroEconomicPage />} />
            <Route path="/tarpovizyon/world/population" element={<PopulationPage />} />

            {/* Dünya Bitkisel Üretim */}
            <Route path="/tarpovizyon/world/production" element={<ProductionPage />} />
            <Route path="/tarpovizyon/world/cereals" element={<ProductionPage categoryFilter="CEREALS" categoryTitle="Tahıl Üretimi — Dünya" categoryIcon="🌾" />} />
            <Route path="/tarpovizyon/world/vegetables" element={<ProductionPage categoryFilter="VEGETABLES" categoryTitle="Sebze Üretimi — Dünya" categoryIcon="🥬" />} />
            <Route path="/tarpovizyon/world/fruits" element={<ProductionPage categoryFilter="FRUITS" categoryTitle="Meyve Üretimi — Dünya" categoryIcon="🍎" />} />
            <Route path="/tarpovizyon/world/legumes" element={<ProductionPage categoryFilter="PULSES" categoryTitle="Bakliyat Üretimi — Dünya" categoryIcon="🫘" />} />
            <Route path="/tarpovizyon/world/oilseeds" element={<ProductionPage categoryFilter="OILSEEDS" categoryTitle="Yağlı Tohum Üretimi — Dünya" categoryIcon="🌻" />} />
            <Route path="/tarpovizyon/world/sugar-crops" element={<ProductionPage categoryFilter="INDUSTRIAL" categoryTitle="Endüstriyel Bitkiler — Dünya" categoryIcon="🏭" />} />
            <Route path="/tarpovizyon/world/nuts" element={<ProductionPage categoryFilter="NUTS" categoryTitle="Sert Kabuklu Üretimi — Dünya" categoryIcon="🥜" />} />
            <Route path="/tarpovizyon/world/beverages" element={<ProductionPage categoryFilter="INDUSTRIAL" categoryTitle="İçecek & Endüstriyel — Dünya" categoryIcon="☕" />} />
            <Route path="/tarpovizyon/world/fiber-crops" element={<ProductionPage categoryFilter="INDUSTRIAL" categoryTitle="Lif Bitkileri — Dünya" categoryIcon="🧵" />} />

            {/* Dünya Hayvansal Üretim */}
            <Route path="/tarpovizyon/world/livestock" element={<LivestockStocksPage />} />
            <Route path="/tarpovizyon/world/livestock-competition" element={<LivestockCompetitionPage />} />
            <Route path="/tarpovizyon/world/red-meat" element={<RedMeatProductionPage />} />
            <Route path="/tarpovizyon/world/white-meat" element={<WhiteMeatProductionPage />} />
            <Route path="/tarpovizyon/world/milk" element={<MilkProductionPage />} />
            <Route path="/tarpovizyon/world/eggs" element={<EggProductionPage />} />
            <Route path="/tarpovizyon/world/other-animal" element={<OtherAnimalProductsPage />} />

            {/* Dünya Kaynak ve Çevre */}
            <Route path="/tarpovizyon/world/resources" element={<LandUsePage />} />
            <Route path="/tarpovizyon/world/land-cover" element={<LandCoverPage />} />
            <Route path="/tarpovizyon/world/fertilizer" element={<FertilizerPage />} />
            <Route path="/tarpovizyon/world/pesticide" element={<PesticidePage />} />
            <Route path="/tarpovizyon/world/employment" element={<AgriculturalEmploymentPage />} />
            <Route path="/tarpovizyon/world/food-balance" element={<FoodBalancePage />} />

            {/* TÜRKİYE (TÜİK) VERİLERİ */}
            <Route path="/tarpovizyon/turkey/price-index" element={<PriceIndexPage />} />
            <Route path="/tarpovizyon/turkey/product-balance" element={<ProductBalancePage />} />
            <Route path="/tarpovizyon/turkey/macro" element={<TurkeyMacroPage />} />
            <Route path="/tarpovizyon/turkey/cross-intelligence" element={<CrossIntelligencePage />} />

            {/* Türkiye Bitkisel Üretim */}
            <Route path="/tarpovizyon/turkey/plant-production" element={<TuikPlantProductionPage />} />
            <Route path="/tarpovizyon/turkey/cereals" element={<CerealProductionPage />} />
            <Route path="/tarpovizyon/turkey/vegetables" element={<VegetableProductionPage />} />
            <Route path="/tarpovizyon/turkey/fruits" element={<FruitProductionPage />} />
            <Route path="/tarpovizyon/turkey/legumes" element={<LegumeProductionPage />} />
            <Route path="/tarpovizyon/turkey/oilseeds" element={<OilseedProductionPage />} />
            <Route path="/tarpovizyon/turkey/sugar-crops" element={<SugarCropProductionPage />} />
            <Route path="/tarpovizyon/turkey/nuts" element={<NutProductionPage />} />
            <Route path="/tarpovizyon/turkey/beverages" element={<BeverageCropPage />} />
            <Route path="/tarpovizyon/turkey/fiber-crops" element={<FiberCropPage />} />
            <Route path="/tarpovizyon/turkey/trade" element={<TradePage />} />

            {/* Türkiye Hayvansal Üretim */}
            <Route path="/tarpovizyon/turkey/animal-production" element={<TurkeyAnimalProductionPage />} />
            <Route path="/tarpovizyon/turkey/red-meat" element={<TurkeyRedMeatProductionPage />} />
            <Route path="/tarpovizyon/turkey/white-meat" element={<TurkeyWhiteMeatProductionPage />} />
            <Route path="/tarpovizyon/turkey/milk" element={<TurkeyMilkProductionPage />} />
            <Route path="/tarpovizyon/turkey/eggs" element={<TurkeyEggProductionPage />} />
            <Route path="/tarpovizyon/turkey/beekeeping" element={<TurkeyBeekeepingPage />} />
            <Route path="/tarpovizyon/turkey/other-animal-products" element={<TurkeyOtherAnimalProductsPage />} />
            <Route path="/tarpovizyon/turkey/tuik-livestock" element={<TuikLivestockPage />} />

            {/* Türkiye İl Bazında Veriler */}
            <Route path="/tarpovizyon/turkey/provincial" element={<TurkeyProvincialLivestockPage />} />
            <Route path="/tarpovizyon/turkey/plant-provincial" element={<TurkeyProvincialPlantPage />} />
            <Route path="/tarpovizyon/turkey/basin-production" element={<BasinProductionPage />} />
            <Route path="/tarpovizyon/turkey/geographical-indication" element={<GeographicalIndicationsPage />} />

            {/* Elle veri yükleme (TÜİK API'sinde olmayan seriler için). */}
            <Route path="/tarpovizyon/veri-yukle" element={<VeriYuklePage />} />

            {/* Bilinmeyen /tarpovizyon adresleri: kabuk içinde kalsın, boş ekran olmasın. */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Kabuk dışındaki bilinmeyen adresler. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
