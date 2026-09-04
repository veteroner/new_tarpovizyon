import { Nut } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
import TuikPlantCategoryPage from './TuikPlantCategoryPage';
import { FindikPazarlari } from './plant/ekBolumler/EkBolumler';

const SERT_KABUKLU_URUNLER = [
  'Fındık', 'Ceviz', 'Badem', 'Şam Fıstığı (Antep Fıstığı)', 'Kestane'
];

export default function NutProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Sert Kabuklu Meyve Üretimi"
      subtitle={`Türkiye il/ilçe/bölge bazlı sert kabuklu meyve üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Nut size={30} aria-hidden="true" />}
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={SERT_KABUKLU_URUNLER}
      defaultProducts={['Fındık', 'Ceviz', 'Şam Fıstığı (Antep Fıstığı)']}
      showTreeMetrics
      /* Grubun asıl sorusu: fındık Türkiye'nin en büyük tarımsal ihracat
         kalemi — parayı kimden kazanıyoruz? Eskiden burada elle yazılmış
         "Dünya Fındık Üretiminde Türkiye (2022)" tablosu vardı. */
      extraSection={<FindikPazarlari yil={SON_YIL - 1} />}
    />
  );
}
