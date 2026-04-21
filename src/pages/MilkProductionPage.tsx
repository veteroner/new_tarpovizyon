import FaoAnimalProductionPage from './FaoAnimalProductionPage';
import type { FaoPageConfig } from './FaoAnimalProductionPage';

const config: FaoPageConfig = {
  colors: ['#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#ef4444'],
  products: [
    { id: 'Raw milk of cattle', name: 'Cattle Milk', nameTR: 'İnek Sütü' },
    { id: 'Raw milk of buffalo', name: 'Buffalo Milk', nameTR: 'Manda Sütü' },
    { id: 'Raw milk of goats', name: 'Goat Milk', nameTR: 'Keçi Sütü' },
    { id: 'Raw milk of sheep', name: 'Sheep Milk', nameTR: 'Koyun Sütü' },
    { id: 'Raw milk of camels', name: 'Camel Milk', nameTR: 'Deve Sütü' },
  ],
  defaultSelected: [
    'Raw milk of cattle',
    'Raw milk of buffalo',
    'Raw milk of goats',
  ],
  pageTitle: '🥛 Süt Üretimi',
  pageSubtitle: 'Dünya süt üretimi verileri - Ton bazında ({year})',
  comparisonTitle: 'Süt Türü Karşılaştırması',
  distributionTitle: 'Süt Türü Dağılımı',
  primaryColor: '#3b82f6',
  unit: 'ton',
  productPlaceholder: 'Süt türü seçin...',
  kpiIcon: '🥛',
};

export default function MilkProductionPage() {
  return <FaoAnimalProductionPage config={config} />;
}
