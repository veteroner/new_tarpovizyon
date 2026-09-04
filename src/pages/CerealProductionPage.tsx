import { TahilArzDengesi } from './plant/ekBolumler/EkBolumler';
import { Wheat } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
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
      subtitle={`Türkiye il/ilçe/bölge bazlı tahıl üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Wheat size={30} aria-hidden="true" />}
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={TAHIL_URUNLER}
      defaultProducts={['Buğday, Durum Buğdayı Hariç', 'Arpa (Diğer)', 'Mısır']}
      extraSection={<TahilArzDengesi />}
    />
  );
}
