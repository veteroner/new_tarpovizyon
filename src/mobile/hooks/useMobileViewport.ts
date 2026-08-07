import { useEffect, useState } from 'react';
import { isPlatform } from '../utils/platform';

/** Mobil kabuğun devreye gireceği genişlik — panonun kırılma noktasıyla aynı. */
const SORGU = '(max-width: 767px)';

/**
 * Mobil kabuk kullanılmalı mı?
 *
 * Capacitor içindeyse her zaman evet — ekran ne kadar geniş olursa olsun
 * uygulama mağazadan indirilmiş bir uygulama, pano değil. Tarayıcıda ise
 * genişliğe bakılıyor ve DEĞİŞİMİ DİNLİYOR: cihaz döndürüldüğünde ya da
 * pencere yeniden boyutlandırıldığında kabuk kendiliğinden değişiyor.
 */
export function useMobileViewport(): boolean {
  const [mobil, setMobil] = useState(
    () => isPlatform('capacitor') || window.matchMedia(SORGU).matches,
  );

  useEffect(() => {
    if (isPlatform('capacitor')) return;
    const mq = window.matchMedia(SORGU);
    const olc = () => setMobil(mq.matches);

    /*
     * `change` asıl sinyal; `resize` ucuz bir emniyet kemeri. Görünüm alanını
     * dışarıdan değiştiren bazı ortamlar (otomasyon araçları, gömülü web
     * görünümleri) medya sorgusu olayını hiç yayımlamıyor.
     */
    mq.addEventListener('change', olc);
    window.addEventListener('resize', olc);
    olc();
    return () => {
      mq.removeEventListener('change', olc);
      window.removeEventListener('resize', olc);
    };
  }, []);

  return mobil;
}
