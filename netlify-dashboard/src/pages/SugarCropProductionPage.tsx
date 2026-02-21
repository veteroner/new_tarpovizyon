import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const SEKER_URUNLER = [
  'Şeker Pancarı', 'Şeker Kamışı', 'Şeker Pancarı Tohumları'
];

export default function SugarCropProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Şeker Bitkileri Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı şeker bitkileri üretim analizi — TÜİK 2004–2024"
      icon="🍬"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={SEKER_URUNLER}
      defaultProducts={['Şeker Pancarı']}
    />
  );
}
