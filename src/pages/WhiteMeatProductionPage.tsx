import FaoAnimalProductionPage from './FaoAnimalProductionPage';
import type { FaoPageConfig } from './FaoAnimalProductionPage';

const config: FaoPageConfig = {
  colors: ['#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'],
  products: [
    { id: 'Meat of chickens, fresh or chilled', name: 'Chicken', nameTR: 'Tavuk Eti' },
    { id: 'Meat of ducks, fresh or chilled', name: 'Duck', nameTR: 'Ördek Eti' },
    { id: 'Meat of geese, fresh or chilled', name: 'Geese', nameTR: 'Kaz Eti' },
    { id: 'Meat of turkeys, fresh or chilled', name: 'Turkey', nameTR: 'Hindi Eti' },
    { id: 'Meat of pigeons and other birds n.e.c., fresh, chilled or frozen', name: 'Pigeon', nameTR: 'Güvercin Eti' },
  ],
  defaultSelected: [
    'Meat of chickens, fresh or chilled',
    'Meat of ducks, fresh or chilled',
    'Meat of turkeys, fresh or chilled',
  ],
  pageTitle: '🍗 Beyaz Et Üretimi',
  pageSubtitle: 'Dünya kanatlı hayvan eti üretimi verileri - Ton bazında ({year})',
  comparisonTitle: 'Kanatlı Et Karşılaştırması',
  distributionTitle: 'Kanatlı Et Dağılımı',
  primaryColor: '#f59e0b',
  unit: 'ton',
  productPlaceholder: 'Beyaz et türü seçin...',
  kpiIcon: '🍗',
};

export default function WhiteMeatProductionPage() {
  return <FaoAnimalProductionPage config={config} />;
}
