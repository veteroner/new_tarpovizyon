import { create } from 'zustand';
import { useOturum } from '../../auth/useOturum';
import { etkinMod, tercihOku, tercihYaz, type Mod } from '../../auth/mod';

/**
 * Görünüm modu kancası — Basic ↔ Pro.
 *
 * ─── NEDEN ZUSTAND, NEDEN BAĞLAM DEĞİL ──────────────────────────────────────
 * Modu üç ayrı yer okuyor (Ayarlar, Keşfet, sekme çubuğu) ve biri değiştirince
 * hepsinin yenilenmesi gerekiyor. `useState` bunu yapamaz — her bileşenin kendi
 * kopyası olur ve Ayarlar'dan değiştirilen mod Keşfet'e yansımaz.
 *
 * Yeni bir React bağlamı da açmadım: `src/mobile` zaten zustand kullanıyor
 * (`stores/appStore.ts`). İkinci bir durum yönetimi deseni getirmek, aynı işi
 * iki şekilde yapan bir kod tabanı demek olurdu.
 *
 * ─── TERCİH İLE ETKİN MOD AYRI ──────────────────────────────────────────────
 * Depoda `tercih` duruyor; ekranda `mod` geçerli. İkisi aynı şey değil: yetkisi
 * olmayan birinin deposunda 'pro' yazıyor olabilir (eski bir abonelik, ya da
 * elle yazılmış bir değer) ve o kişiye Pro gösterilmemeli. Süzgeç
 * `auth/mod.ts`'teki `etkinMod` — kural kimliğin yanında duruyor ki burada
 * unutulmasın.
 *
 * Tercih SİLİNMİYOR: aboneliği biten kullanıcı yenilediğinde eski seçimine
 * geri dönüyor. Silmek, her abonelik kesintisinde kullanıcının seçimini
 * unutmak olurdu.
 */

type ModDeposu = {
  tercih: Mod | null;
  ayarla: (m: Mod) => void;
};

const useModDeposu = create<ModDeposu>((set) => ({
  /* İlk değer depodan OKUNUYOR: uygulama her açılışta kullanıcının son
     seçimiyle açılmalı, varsayılana dönmemeli. */
  tercih: tercihOku(),
  ayarla: (m) => {
    tercihYaz(m);
    set({ tercih: m });
  },
}));

export function useMod(): {
  /** Ekranda geçerli olan mod — yetki süzgecinden geçmiş. */
  mod: Mod;
  /** Hesabın Pro hakkı var mı (deneme de sayılır). */
  proErisimi: boolean;
  ayarla: (m: Mod) => void;
} {
  const { tercih, ayarla } = useModDeposu();
  const { proErisimi } = useOturum();
  return {
    mod: etkinMod(tercih, proErisimi),
    proErisimi,
    ayarla,
  };
}
