import FaoAnimalProductionPage from './FaoAnimalProductionPage';
import type { FaoPageConfig } from './FaoAnimalProductionPage';

const config: FaoPageConfig = {
  colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'],
  products: [
    { id: 'Meat of cattle with the bone, fresh or chilled', name: 'Cattle', nameTR: 'Sığır Eti' },
    { id: 'Meat of pig with the bone, fresh or chilled', name: 'Pig', nameTR: 'Domuz Eti' },
    { id: 'Meat of sheep, fresh or chilled', name: 'Sheep', nameTR: 'Koyun Eti' },
    { id: 'Meat of goat, fresh or chilled', name: 'Goat', nameTR: 'Keçi Eti' },
    { id: 'Meat of buffalo, fresh or chilled', name: 'Buffalo', nameTR: 'Manda Eti' },
    { id: 'Meat of camels, fresh or chilled', name: 'Camel', nameTR: 'Deve Eti' },
    { id: 'Meat of rabbits and hares, fresh or chilled', name: 'Rabbit', nameTR: 'Tavşan Eti' },
    { id: 'Horse meat, fresh or chilled', name: 'Horse', nameTR: 'At Eti' },
  ],
  defaultSelected: [
    'Meat of cattle with the bone, fresh or chilled',
    'Meat of pig with the bone, fresh or chilled',
    'Meat of sheep, fresh or chilled',
  ],
  pageTitle: '🥩 Kırmızı Et Üretimi',
  pageSubtitle: 'Dünya kırmızı et üretimi verileri - Ton bazında ({year})',
  comparisonTitle: 'Et Türü Karşılaştırması',
  distributionTitle: 'Et Türü Dağılımı',
  primaryColor: '#ef4444',
  unit: 'ton',
  productPlaceholder: 'Kırmızı et türü seçin...',
  kpiIcon: '🥩',
};

export default function RedMeatProductionPage() {
  return <FaoAnimalProductionPage config={config} />;
}
