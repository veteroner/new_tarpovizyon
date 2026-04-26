import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { ProgramSelectionPage } from './pages/ProgramSelectionPage';
import { SelectionPage } from './pages/SelectionPage';
import { HomePage } from './pages/HomePage';
import { OverviewPage } from './pages/OverviewPage';
import { TradePage } from './pages/TradePage';
import { ProductionPage } from './pages/ProductionPage';
import TurkeyAnimalProductionPage from './pages/TurkeyAnimalProductionPage';
import { LivestockCompetitionPage } from './pages/LivestockCompetitionPage';
// Hayvansal Üretim Sayfaları (TON bazlı)
import RedMeatProductionPage from './pages/RedMeatProductionPage';
import WhiteMeatProductionPage from './pages/WhiteMeatProductionPage';
import MilkProductionPage from './pages/MilkProductionPage';
import EggProductionPage from './pages/EggProductionPage';
import OtherAnimalProductsPage from './pages/OtherAnimalProductsPage';
// TÜİK Hayvansal Üretim (Türkiye)
import TurkeyRedMeatProductionPage from './pages/TurkeyRedMeatProductionPage';
import TurkeyWhiteMeatProductionPage from './pages/TurkeyWhiteMeatProductionPage';
import TurkeyMilkProductionPage from './pages/TurkeyMilkProductionPage';
import TurkeyEggProductionPage from './pages/TurkeyEggProductionPage';
import TurkeyBeekeepingPage from './pages/TurkeyBeekeepingPage';
import TurkeyOtherAnimalProductsPage from './pages/TurkeyOtherAnimalProductsPage';
// Bitkisel Üretim Sayfaları
import CerealProductionPage from './pages/CerealProductionPage';
import VegetableProductionPage from './pages/VegetableProductionPage';
import FruitProductionPage from './pages/FruitProductionPage';
import LegumeProductionPage from './pages/LegumeProductionPage';
import OilseedProductionPage from './pages/OilseedProductionPage';
import SugarCropProductionPage from './pages/SugarCropProductionPage';
import NutProductionPage from './pages/NutProductionPage';
import BeverageCropPage from './pages/BeverageCropPage';
import FiberCropPage from './pages/FiberCropPage';
// FAO Verileri Sayfaları
import LandUsePage from './pages/LandUsePage';
import LivestockStocksPage from './pages/LivestockStocksPage';
import AgriculturalEmploymentPage from './pages/AgriculturalEmploymentPage';
import FertilizerPage from './pages/FertilizerPage';
import PesticidePage from './pages/PesticidePage';
import PopulationPage from './pages/PopulationPage';
import LandCoverPage from './pages/LandCoverPage';
import FoodBalancePage from './pages/FoodBalancePage';
// Yeni Sayfalar
import PriceIndexPage from './pages/PriceIndexPage';
import MacroEconomicPage from './pages/MacroEconomicPage';
import TuikPlantProductionPage from './pages/TuikPlantProductionPage';
import TuikLivestockPage from './pages/TuikLivestockPage';
import TurkeyProvincialLivestockPage from './pages/TurkeyProvincialLivestockPage';
import TurkeyProvincialPlantPage from './pages/TurkeyProvincialPlantPage';
import GeographicalIndicationsPage from './pages/GeographicalIndicationsPage';
import BasinProductionPage from './pages/BasinProductionPage';
import { RasyonApp } from './rasyon/RasyonApp';
import { HasatTahminiPage } from './pages/HasatTahminiPage';
import SulamaPlanPage from './pages/SulamaPlanPage';
import GubreHesapPage from './pages/GubreHesapPage';
import TarimTakvimPage from './pages/TarimTakvimPage';
import ProductBalancePage from './pages/ProductBalancePage';
import TurkeyMacroPage from './pages/TurkeyMacroPage';
import CrossIntelligencePage from './pages/CrossIntelligencePage';
import CommodityPricesPage from './pages/CommodityPricesPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ErrorBoundary from './components/ErrorBoundary';

import './styles/globals.css';

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
  const hideHeader = isProgramSelection || isTarpovizyonSelection || isTarpovizyonHome || isRasyonPage || isHasatPage || isSulamaPage || isGubrePage || isTakvimPage;

  return (
    <>
      {/* Header - Ana sayfa ve seçim sayfası dışında göster */}
      {!hideHeader && <Header />}
      
      <main className={hideHeader ? '' : 'main-content with-header'}>
        <Routes>
          {/* Ana Program Seçimi */}
          <Route path="/" element={<ProgramSelectionPage />} />
          
          {/* Hasat Tahmini */}
          <Route path="/hasat-tahmini" element={<ErrorBoundary><HasatTahminiPage /></ErrorBoundary>} />
          
          {/* Çiftçi Araçları */}
          <Route path="/sulama-plan" element={<ErrorBoundary><SulamaPlanPage /></ErrorBoundary>} />
          <Route path="/gubre-hesap" element={<ErrorBoundary><GubreHesapPage /></ErrorBoundary>} />
          <Route path="/tarim-takvim" element={<ErrorBoundary><TarimTakvimPage /></ErrorBoundary>} />
          
          {/* Rasyon (tam entegre) */}
          <Route path="/rasyon/*" element={<RasyonApp />} />
          
          {/* TARPOVIZYON - Tarım İstihbarat Platformu */}
          <Route path="/tarpovizyon" element={<SelectionPage />} />
          <Route path="/tarpovizyon/world" element={<HomePage />} />
          <Route path="/tarpovizyon/turkey" element={<HomePage />} />
          <Route path="/tarpovizyon/overview" element={<Navigate to="/tarpovizyon/turkey/overview" replace />} />
          <Route path="/tarpovizyon/turkey/overview" element={<ErrorBoundary><OverviewPage /></ErrorBoundary>} />
          
          {/* Emtia Fiyatları & AI */}
          <Route path="/tarpovizyon/commodity-prices" element={<CommodityPricesPage />} />
          <Route path="/tarpovizyon/ai-assistant" element={<AIAssistantPage />} />
          
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
          <Route path="/tarpovizyon/world/land-use" element={<LandUsePage />} />
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
          <Route path="/tarpovizyon/turkey/tuik-plant" element={<Navigate to="/tarpovizyon/turkey/plant-production" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
