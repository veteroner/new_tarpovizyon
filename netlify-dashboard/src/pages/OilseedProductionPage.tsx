import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const YAGLI_TOHUM_URUNLER = [
  'Ayçiçeği Tohumu (Yağlık)', 'Ayçiçeği Tohumu (Çerezlik)',
  'Soya Fasulyesi', 'Kanola Veya Kolza Tohumu', 'Aspir Tohumu',
  'Susam Tohumu', 'Keten Tohumu', 'Kenevir Tohumu',
  'Haşhaş Tohumu', 'Yerfıstığı, Kabuklu'
];

export default function OilseedProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Yağlı Tohum Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı yağlı tohum üretim analizi — TÜİK 2004–2024"
      icon="🌻"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={YAGLI_TOHUM_URUNLER}
      defaultProducts={['Ayçiçeği Tohumu (Yağlık)', 'Soya Fasulyesi']}
    />
  );
}
