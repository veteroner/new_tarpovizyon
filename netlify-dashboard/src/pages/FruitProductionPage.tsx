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
      subtitle="Türkiye il/ilçe/bölge bazlı meyve üretim analizi — TÜİK 2004–2024"
      icon="🍎"
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={MEYVE_URUNLER}
      defaultProducts={['Elma (Golden)', 'Kayısı', 'Kiraz']}
      showTreeMetrics
    />
  );
}
