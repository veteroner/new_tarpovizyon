import { createContext } from 'react';
import type { Durum } from './oturum';

/**
 * Oturum bağlamının tipi ve context nesnesi.
 *
 * Sağlayıcıdan ve kancadan AYRI dosyada: React'in hızlı yenileme (fast
 * refresh) kuralı, bir dosyanın ya yalnız bileşen ya da yalnız değer ihraç
 * etmesini istiyor. Karışık dosyada düzenleme yapınca durum sıfırlanıyor ve
 * geliştirirken her kaydetmede oturum düşüyordu.
 */
export type OturumBaglamiTipi = {
  durum: 'yukleniyor' | 'girisli' | 'girissiz';
  kullanici: Durum['kullanici'] | null;
  abonelik: Durum['abonelik'] | null;
  /** Pro içeriğe erişim hakkı var mı (deneme de sayılır). */
  proErisimi: boolean;
  girisYap: (eposta: string, kod: string) => Promise<{ yeniKullanici: boolean }>;
  cikis: () => Promise<void>;
  /** Ödeme dönüşünde durumu sunucudan tazelemek için. */
  tazele: () => Promise<void>;
};

export const OturumBaglami = createContext<OturumBaglamiTipi | null>(null);
