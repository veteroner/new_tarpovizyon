/* Vitrin grup listesi — bileşen dosyasından ayrıldı ki hızlı yenileme çalışsın. */

/*
 * Yollar PRO'ya bakıyor.
 *
 * Dördü de `/tarpovizyon-basic/...` idi: site pro.tarpovizyon.com üzerinde
 * yayınlandığı hâlde tanıtım sayfasının üst menüsü ziyaretçiyi Basic modülüne
 * götürüyordu. `kok` alanı menüde "hangi grup etkin" işaretini seçiyor, bu
 * yüzden o da Pro önekine çevrildi.
 */
export const GRUPLAR = [
  { ad: 'Makro Veriler', yol: '/tarpovizyon/turkey/macro', kok: '/tarpovizyon/turkey/macro' },
  { ad: 'Hayvancılık', yol: '/tarpovizyon/turkey/animal-production', kok: '/tarpovizyon/turkey/animal-production' },
  { ad: 'Bitkisel Üretim', yol: '/tarpovizyon/turkey/plant-production', kok: '/tarpovizyon/turkey/plant-production' },
  { ad: 'Bölgesel Veriler', yol: '/tarpovizyon/turkey/provincial', kok: '/tarpovizyon/turkey/provincial' },
];
