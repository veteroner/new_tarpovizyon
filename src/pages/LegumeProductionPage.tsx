import { BakliyatKaynakUlkeler } from './plant/ekBolumler/EkBolumler';
import { Bean } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
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
      subtitle={`Türkiye il/ilçe/bölge bazlı baklagil üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Bean size={30} aria-hidden="true" />}
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={BAKLAGIL_URUNLER}
      defaultProducts={['Nohut, Kuru', 'Mercimek, Kuru (Kırmızı)', 'Fasulye, Kuru']}
      extraSection={<BakliyatKaynakUlkeler yil={SON_YIL - 1} />}
    />
  );
}
