import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const BAKLAGIL_URUNLER = [
  'Nohut, Kuru', 'Mercimek, Kuru (Kırmızı)', 'Mercimek, Kuru (Yeşil)',
  'Fasulye, Kuru', 'Bezelye, Kuru', 'Börülce, Kuru',
  'Bakla, Kuru (İnsan Tüketimi İçin)', 'Bakla, Kuru (Yemlik)',
  'Acı Bakla (İnsan Tüketimi İçin)', 'Bezelye (Yemlik)',
  'Mürdümük', 'Burçak (Dane)'
];

export default function LegumeProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Baklagil Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı baklagil üretim analizi — TÜİK 2004–2024"
      icon="🫘"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={BAKLAGIL_URUNLER}
      defaultProducts={['Nohut, Kuru', 'Mercimek, Kuru (Kırmızı)', 'Fasulye, Kuru']}
    />
  );
}
