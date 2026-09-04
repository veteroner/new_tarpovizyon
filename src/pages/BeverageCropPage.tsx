import { DunyaSiralamasi } from './plant/ekBolumler/EkBolumler';
import { CupSoda } from 'lucide-react';
import { ILK_YIL, SON_YIL } from './plant/plantTypes';
import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const ICECEK_URUNLER = [
  'Çay Yaprakları',
  'Biber, Kuru, İşlenmemiş',
  'Kekik, İşlenmemiş',
  'Kimyon, İşlenmemiş',
  'Anason, İşlenmemiş',
  'Kişniş, İşlenmemiş',
  'Rezene, İşlenmemiş',
  'Çörek Otu Tohumu',
  'Kapari, İşlenmemiş',
  'Süpürge Otu, İşlenmemiş'
];

// Rize çayı hasat yoğunluğu (endeks: 0–100)

export default function BeverageCropPage() {
  return (
    <TuikPlantCategoryPage
      title="İçecek & Baharat Bitkileri"
      subtitle={`Türkiye il/ilçe/bölge bazlı içecek ve baharat bitkileri üretim analizi — TÜİK ${ILK_YIL}–${SON_YIL}`}
      icon={<CupSoda size={30} aria-hidden="true" />}
      urunGrup="Meyveler Içecek Ve Baharat Bitkileri"
      urunFilter={ICECEK_URUNLER}
      defaultProducts={['Çay Yaprakları']}
      showTreeMetrics
      extraSection={<DunyaSiralamasi urunDesen="Tea leaves" yil={2023} baslik="Çay" aciklama="Çay üretiminde ilk 10 ülke. Türkiye üretimi tek bir iklim kuşağına — Doğu Karadeniz'e — bağlı." />}
    />
  );
}
