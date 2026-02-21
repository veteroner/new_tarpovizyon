import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const TAHIL_URUNLER = [
  'Buğday, Durum Buğdayı Hariç', 'Durum Buğdayı', 'Arpa (Diğer)', 'Arpa (Biralık)',
  'Mısır', 'Çeltik', 'Yulaf', 'Çavdar', 'Sorgum', 'Darı', 'Triticale',
  'Kara Buğday', 'Mahlut', 'Kaplıca'
];

export default function CerealProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Tahıl Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı tahıl üretim analizi — TÜİK 2004–2024"
      icon="🌾"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={TAHIL_URUNLER}
      defaultProducts={['Buğday, Durum Buğdayı Hariç', 'Arpa (Diğer)', 'Mısır']}
    />
  );
}
