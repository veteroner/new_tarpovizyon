import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const SERT_KABUKLU_URUNLER = [
  'Fındık', 'Ceviz', 'Badem', 'Şam Fıstığı (Antep Fıstığı)', 'Kestane'
];

export default function NutProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Sert Kabuklu Meyve Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı sert kabuklu meyve üretim analizi — TÜİK 2004–2024"
      icon="🥜"
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={SERT_KABUKLU_URUNLER}
      defaultProducts={['Fındık', 'Ceviz', 'Şam Fıstığı (Antep Fıstığı)']}
      showTreeMetrics
    />
  );
}
