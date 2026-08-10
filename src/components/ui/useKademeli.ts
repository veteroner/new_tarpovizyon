import { useState } from 'react';
import { useMobileViewport } from '../../mobile/hooks/useMobileViewport';

/**
 * Uzun bir diziyi mobilde kısaltır, "tümünü göster" durumunu tutar.
 *
 * `KademeliListe` bileşeninin tablo hâli. Tabloda sarmalayıcı bileşen
 * kullanılamıyor: `<tbody>` içine düğme koyulamaz, satırların arasına da
 * fragment giremez. Bu yüzden burada yalnızca KARAR veriliyor; satırları ve
 * düğmeyi sayfa kendi çiziyor.
 *
 * Geniş ekranda dizi hiç kısaltılmıyor.
 */
export function useKademeli<T>(liste: T[], ilk = 5) {
  const mobil = useMobileViewport();
  const [acik, setAcik] = useState(false);

  // İki satır fazlası için düğme göstermeye değmez.
  const kisaltilabilir = mobil && liste.length > ilk + 2;
  const kisalt = kisaltilabilir && !acik;

  return {
    gosterilecek: kisalt ? liste.slice(0, ilk) : liste,
    dugmeVar: kisaltilabilir,
    acik,
    cevir: () => setAcik((a) => !a),
    toplam: liste.length,
  };
}
