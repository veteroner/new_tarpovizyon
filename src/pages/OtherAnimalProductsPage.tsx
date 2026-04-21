import FaoAnimalProductionPage from './FaoAnimalProductionPage';
import type { FaoPageConfig } from './FaoAnimalProductionPage';

const config: FaoPageConfig = {
  colors: ['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#eab308'],
  products: [
    { id: 'Natural honey', name: 'Honey', nameTR: 'Bal' },
    { id: 'Beeswax', name: 'Beeswax', nameTR: 'Balmumu' },
    { id: 'Wool, shorn', name: 'Wool', nameTR: 'Yapağı' },
    { id: 'Silk-worm cocoons, reelable', name: 'Silk', nameTR: 'İpek Böceği Kozası' },
  ],
  defaultSelected: [
    'Natural honey',
    'Beeswax',
    'Wool, shorn',
  ],
  pageTitle: '🐝 Diğer Hayvansal Ürünler',
  pageSubtitle: 'Bal, Yün, İpek ve diğer hayvansal ürünler - Ton bazında ({year})',
  comparisonTitle: 'Ürün Karşılaştırması',
  distributionTitle: 'Ürün Dağılımı',
  primaryColor: '#f59e0b',
  unit: 'ton',
  productPlaceholder: 'Ürün seçin...',
  kpiIcon: '🐝',
};

export default function OtherAnimalProductsPage() {
  return <FaoAnimalProductionPage config={config} />;
}
