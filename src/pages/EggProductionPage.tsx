import FaoAnimalProductionPage from './FaoAnimalProductionPage';
import type { FaoPageConfig } from './FaoAnimalProductionPage';

const config: FaoPageConfig = {
  colors: ['#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4'],
  products: [
    { id: 'Hen eggs in shell, fresh', name: 'Hen Eggs', nameTR: 'Tavuk Yumurtası' },
    { id: 'Eggs from other birds in shell, fresh, n.e.c.', name: 'Other Bird Eggs', nameTR: 'Diğer Kuş Yumurtaları' },
  ],
  defaultSelected: [
    'Hen eggs in shell, fresh',
    'Eggs from other birds in shell, fresh, n.e.c.',
  ],
  pageTitle: '🥚 Yumurta Üretimi',
  pageSubtitle: 'Dünya yumurta üretimi verileri - Adet bazlı ({year})',
  comparisonTitle: 'Yumurta Türü Karşılaştırması',
  distributionTitle: 'Yumurta Türü Dağılımı',
  primaryColor: '#f59e0b',
  unit: 'adet',
  productPlaceholder: 'Yumurta türü seçin...',
  kpiIcon: '🥚',
};

export default function EggProductionPage() {
  return <FaoAnimalProductionPage config={config} />;
}
