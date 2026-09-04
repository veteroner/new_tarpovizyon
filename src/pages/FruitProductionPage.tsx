import { BahceYasYapisi } from './plant/ekBolumler/EkBolumler';
import { Apple } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const MEYVE_URUNLER = [
  'Elma (Golden)', 'Elma (Starking)', 'Elma (Granny Smith)', 'Elma (Amasya)', 'Diğer Elmalar',
  'Armut', 'Kayısı', 'Kiraz', 'Vişne', 'Erik', 'Şeftali', 'Nektarin',
  'İncir (Yaş)', 'Nar', 'Ayva', 'Muşmula', 'Dut', 'Hünnap', 'İğde',
  'Trabzon Hurması (Cennet Elması)', 'Yenidünya (Malta Eriği)', 'Zerdali',
  'Kızılcık', 'Çilek', 'Ahududu', 'Böğürtlen', 'Maviyemiş',
  'Portakal (Washington)', 'Portakal (Yafa)', 'Diğer Portakallar',
  'Mandalina (Satsuma)', 'Mandalina (Klemantin)', 'Mandalina (King)', 'Mandalina (Diğer)',
  'Limon Ve Misket Limonu', 'Greyfurt (Altıntop)', 'Turunç',
  'Muz, Plantain Ve Benzerleri', 'Avokado', 'Kivi',
  'Sofralık Üzüm, Çekirdekli', 'Sofralık Üzüm, Çekirdeksiz',
  'Kurutmalık Üzüm, Çekirdekli', 'Kurutmalık Üzüm, Çekirdeksiz',
  'Şaraplık Üzümler',
  'Sofralık Zeytinler', 'Yağlık Zeytinler (Zeytinyağı Üretimi İçin)'
];

export default function FruitProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Meyve Üretimi"
      subtitle={`Türkiye il/ilçe/bölge bazlı meyve üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<Apple size={30} aria-hidden="true" />}
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={MEYVE_URUNLER}
      defaultProducts={['Elma (Golden)', 'Kayısı', 'Kiraz']}
      showTreeMetrics
      /* Grubun asıl sorusu: bahçe yaşlanıyor mu? TÜİK ağaçları veren/vermeyen
         diye ayrı sayıyor; oran yenileme hızını veriyor. Eskiden burada elle
         yazılmış "dünya payı" yüzdeleri vardı, kaynak olarak FAO gösteriliyordu. */
      extraSection={<BahceYasYapisi urunler={MEYVE_URUNLER} yil={SON_YIL} />}
    />
  );
}
