import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const ICECEK_URUNLER = [
  'Çay Yaprakları',
  'Biber, Kuru, İşlenmemiş',
  'Kekik, İşlenmemiş',
  'Kimyon, İşlenmemiş',
  'Anason, İşlenmemiş',
  'Kişniş, İşlenmemiş',
  'Rezene, İşlenmemiş',
  'Çörek Otu Tohumu',
  'Kapari, İşlenmemiş',
  'Süpürge Otu, İşlenmemiş'
];

export default function BeverageCropPage() {
  return (
    <TuikPlantCategoryPage
      title="İçecek & Baharat Bitkileri"
      subtitle="Türkiye il/ilçe/bölge bazlı içecek ve baharat bitkileri üretim analizi — TÜİK 2004–2024"
      icon="🍵"
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={ICECEK_URUNLER}
      defaultProducts={['Çay Yaprakları']}
      showTreeMetrics
    />
  );
}
