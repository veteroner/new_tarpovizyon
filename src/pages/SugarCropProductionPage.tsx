import { Candy } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { DunyaSiralamasi } from './plant/ekBolumler/EkBolumler';

const SEKER_URUNLER = [
  'Şeker Pancarı', 'Şeker Kamışı', 'Şeker Pancarı Tohumları'
];

export default function SugarCropProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Şeker Bitkileri Üretimi"
      subtitle={`Türkiye il/ilçe/bölge bazlı şeker bitkileri üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Candy size={30} aria-hidden="true" />}
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={SEKER_URUNLER}
      defaultProducts={['Şeker Pancarı']}
      /* Grubun asıl sorusu: dünyada neredeyiz? Türkiye şeker pancarında ilk
         beşte. Eskiden burada elle yazılmış bir "kampanya takvimi" vardı —
         doğru bir alan bilgisi ama veri değil ve sayfayla ilgisi yoktu. */
      extraSection={(
        <DunyaSiralamasi
          urunDesen="Sugar beet"
          yil={2023}
          baslik="Şeker Pancarı"
          aciklama="Şeker pancarı üretiminde ilk 10 ülke."
        />
      )}
    />
  );
}
