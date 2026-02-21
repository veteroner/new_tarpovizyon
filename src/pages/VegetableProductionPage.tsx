import TuikPlantCategoryPage from './TuikPlantCategoryPage';

export default function VegetableProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Sebze Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı sebze üretim analizi — TÜİK 2004–2024"
      icon="🥬"
      urunGrup="Sebzeler"
      defaultProducts={['Domates (Sofralık)', 'Biber (Sivri)', 'Hıyar (Sofralık)']}
    />
  );
}
