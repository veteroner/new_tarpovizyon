import { PamukAcigi } from './plant/ekBolumler/EkBolumler';
import { Shirt } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
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
      subtitle={`Türkiye il/ilçe/bölge bazlı lif bitkileri üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Shirt size={30} aria-hidden="true" />}
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={LIF_URUNLER}
      defaultProducts={['Pamuk, Çırçırlanmamış (Kütlü)', 'Tütün, İşlenmemiş']}
      extraSection={<PamukAcigi />}
    />
  );
}
