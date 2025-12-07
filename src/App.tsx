import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { ExportPage } from './pages/ExportPage';
import { ImportPage } from './pages/ImportPage';
import { TransportPage } from './pages/TransportPage';
import { ProductionPage } from './pages/ProductionPage';
import { MeatProductionPage } from './pages/MeatProductionPage';
import { DairyProductionPage } from './pages/DairyProductionPage';
import { EggProductionPage } from './pages/EggProductionPage';
import { LivestockCompetitionPage } from './pages/LivestockCompetitionPage';
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
import './styles/globals.css';

const queryClient = new QueryClient();

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
        <Sidebar apiConnected={apiConnected} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/transport" element={<TransportPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/meat" element={<MeatProductionPage />} />
            <Route path="/dairy" element={<DairyProductionPage />} />
            <Route path="/eggs" element={<EggProductionPage />} />
            <Route path="/competition" element={<LivestockCompetitionPage />} />
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
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
