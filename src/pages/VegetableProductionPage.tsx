import { Carrot } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { DunyaSiralamasi } from './plant/ekBolumler/EkBolumler';

export default function VegetableProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Sebze Üretimi"
      subtitle={`Türkiye il/ilçe/bölge bazlı sebze üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Carrot size={30} aria-hidden="true" />}
      urunGrup="Sebzeler"
      defaultProducts={['Domates (Sofralık)', 'Biber (Sivri)', 'Hıyar (Sofralık)']}
      /* Grubun asıl sorusu: dünyada neredeyiz? Türkiye domateste ilk dörtte.
         Eskiden burada elle yazılmış bir mevsim takvimi vardı — hangi sebze
         hangi ayda, doğru ama veri değil ve sayfanın rakamlarıyla ilgisi yoktu. */
      extraSection={(
        <DunyaSiralamasi
          urunDesen="Tomatoes"
          yil={2023}
          baslik="Domates"
          aciklama="Sebzede Türkiye'nin dünyada en güçlü olduğu kalem domates."
        />
      )}
    />
  );
}
