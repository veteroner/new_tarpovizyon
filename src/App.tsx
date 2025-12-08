import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { Menu, X } from 'lucide-react';
import { OverviewPage } from './pages/OverviewPage';
import { ExportPage } from './pages/ExportPage';
import { ImportPage } from './pages/ImportPage';
import { TransportPage } from './pages/TransportPage';
import { ProductionPage } from './pages/ProductionPage';
import { LivestockCompetitionPage } from './pages/LivestockCompetitionPage';
// Hayvansal Üretim Sayfaları (TON bazlı)
import RedMeatProductionPage from './pages/RedMeatProductionPage';
import WhiteMeatProductionPage from './pages/WhiteMeatProductionPage';
import MilkProductionPage from './pages/MilkProductionPage';
import EggProductionPage from './pages/EggProductionPage';
import OtherAnimalProductsPage from './pages/OtherAnimalProductsPage';
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
import './styles/globals.css';

const queryClient = new QueryClient();

function AppContent({ apiConnected }: { apiConnected: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Sayfa değiştiğinde menüyü kapat
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Menüyü aç/kapat"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar apiConnected={apiConnected} isOpen={sidebarOpen} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/production" element={<ProductionPage />} />
          {/* Hayvansal Üretim Routes */}
          <Route path="/red-meat" element={<RedMeatProductionPage />} />
          <Route path="/white-meat" element={<WhiteMeatProductionPage />} />
          <Route path="/milk" element={<MilkProductionPage />} />
          <Route path="/eggs" element={<EggProductionPage />} />
          <Route path="/other-animal" element={<OtherAnimalProductsPage />} />
          <Route path="/livestock-competition" element={<LivestockCompetitionPage />} />
          {/* Bitkisel Üretim Routes */}
          <Route path="/cereals" element={<CerealProductionPage />} />
          <Route path="/vegetables" element={<VegetableProductionPage />} />
          <Route path="/fruits" element={<FruitProductionPage />} />
          <Route path="/legumes" element={<LegumeProductionPage />} />
          <Route path="/oilseeds" element={<OilseedProductionPage />} />
          <Route path="/sugar-crops" element={<SugarCropProductionPage />} />
          <Route path="/nuts" element={<NutProductionPage />} />
          <Route path="/beverages" element={<BeverageCropPage />} />
          <Route path="/fiber-crops" element={<FiberCropPage />} />
          {/* FAO Verileri Routes */}
          <Route path="/land-use" element={<LandUsePage />} />
          <Route path="/livestock-stocks" element={<LivestockStocksPage />} />
          <Route path="/employment" element={<AgriculturalEmploymentPage />} />
          <Route path="/fertilizer" element={<FertilizerPage />} />
          <Route path="/pesticide" element={<PesticidePage />} />
          <Route path="/population" element={<PopulationPage />} />
          <Route path="/land-cover" element={<LandCoverPage />} />
          <Route path="/food-balance" element={<FoodBalancePage />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    // Test API connection
    fetch('https://dersbende.com/api.php?action=tables&api_key=dashboard_secret_key_2024')
      .then(res => res.json())
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent apiConnected={apiConnected} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
