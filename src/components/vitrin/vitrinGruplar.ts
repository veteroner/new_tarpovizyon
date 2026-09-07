/* Vitrin grup listesi — bileşen dosyasından ayrıldı ki hızlı yenileme çalışsın. */

import { surumYolu } from '../../utils/surum';

/*
 * ─── YOLLAR ADRESE GÖRE ─────────────────────────────────────────────────────
 * Bu liste bir dönem Basic'e, sonra Pro'ya sabitlendi. İkisi de yanlıştı:
 * aynı derleme hem www.tarpovizyon.com'u (Basic) hem pro.tarpovizyon.com'u
 * (Pro) sunuyor, o yüzden hedef derleme anında değil ÇALIŞMA ANINDA
 * seçilmeli. Ayrıntı: utils/surum.ts.
 *
 * `kok` alanı menüde "hangi grup etkin" işaretini seçiyor; o da aynı kurala
 * tabi, yoksa Basic'te hiçbir grup etkin görünmezdi.
 */
export const GRUPLAR = [
  {
    ad: 'Makro Veriler',
    yol: surumYolu('/tarpovizyon/turkey/macro', '/tarpovizyon-basic/makro/genel'),
    kok: surumYolu('/tarpovizyon/turkey/macro', '/tarpovizyon-basic/makro'),
  },
  {
    ad: 'Hayvancılık',
    yol: surumYolu('/tarpovizyon/turkey/animal-production', '/tarpovizyon-basic/genel/hayvansal-uretim'),
    kok: surumYolu('/tarpovizyon/turkey/animal-production', '/tarpovizyon-basic/genel'),
  },
  {
    ad: 'Bitkisel Üretim',
    yol: surumYolu('/tarpovizyon/turkey/plant-production', '/tarpovizyon-basic/bitkisel-genel/uretim-ozeti'),
    kok: surumYolu('/tarpovizyon/turkey/plant-production', '/tarpovizyon-basic/bitkisel'),
  },
  {
    ad: 'Bölgesel Veriler',
    yol: surumYolu('/tarpovizyon/turkey/provincial', '/tarpovizyon-basic/il-duzeyinde/bitkisel-uretim'),
    kok: surumYolu('/tarpovizyon/turkey/provincial', '/tarpovizyon-basic/il-duzeyinde'),
  },
];
