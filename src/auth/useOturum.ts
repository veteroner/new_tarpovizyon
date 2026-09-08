import { useContext } from 'react';
import { OturumBaglami, type OturumBaglamiTipi } from './baglam';

/**
 * Sağlayıcı YOKSA "girişsiz" döner, hata fırlatmaz.
 *
 * Bilerek: bu kanca Basic sayfalarında da çağrılabiliyor ve Basic'in kimlikle
 * hiçbir işi yok. Hata fırlatmak, kimlikle ilgisi olmayan bir sayfayı kimlik
 * yüzünden çökertirdi.
 */
export function useOturum(): OturumBaglamiTipi {
  const b = useContext(OturumBaglami);
  return b ?? {
    durum: 'girissiz',
    kullanici: null,
    abonelik: null,
    proErisimi: false,
    girisYap: async () => { throw new Error('oturum sağlayıcı yok'); },
    cikis: async () => {},
    tazele: async () => {},
  };
}
