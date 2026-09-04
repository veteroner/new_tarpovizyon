import { Flower2 } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { YagliTohumBagimlilik } from './plant/ekBolumler/EkBolumler';

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
      subtitle={`Türkiye il/ilçe/bölge bazlı yağlı tohum üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Flower2 size={30} aria-hidden="true" />}
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={YAGLI_TOHUM_URUNLER}
      defaultProducts={['Ayçiçeği Tohumu (Yağlık)', 'Soya Fasulyesi']}
      /* Grubun asıl sorusu: Türkiye'nin ham yağ açığı. Eskiden burada ürünlerin
         yağ içeriği yüzdeleri vardı — sabit bir referans değeri, sayfanın
         verisiyle ilgisi yoktu. */
      extraSection={<YagliTohumBagimlilik />}
    />
  );
}
