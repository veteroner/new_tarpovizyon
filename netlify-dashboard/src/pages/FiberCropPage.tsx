import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const LIF_URUNLER = [
  'Pamuk, Çırçırlanmamış (Kütlü)',
  'Pamuk, Çırçırlanmış (Lifli)',
  'Pamuk Çekirdeği (Çiğit)',
  'Keten, Lif',
  'Kenevir, Lif',
  'Tütün, İşlenmemiş'
];

export default function FiberCropPage() {
  return (
    <TuikPlantCategoryPage
      title="Lif Bitkileri Üretimi"
      subtitle="Türkiye il/ilçe/bölge bazlı lif bitkileri üretim analizi — TÜİK 2004–2024"
      icon="🧵"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={LIF_URUNLER}
      defaultProducts={['Pamuk, Çırçırlanmamış (Kütlü)', 'Tütün, İşlenmemiş']}
    />
  );
}
