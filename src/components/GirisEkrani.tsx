import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isPlatform } from '../mobile/utils/platform';
import { useMobileViewport } from '../mobile/hooks/useMobileViewport';
import type { Kapsam } from './nav/menu';

/**
 * Giriş ekranlarını cihaza göre yönlendirir.
 *
 * ─── ÇÖZDÜĞÜ SORUN ──────────────────────────────────────────────────────────
 * Mobil kabuk yalnızca `/m/*` ve veri sayfalarını kapsıyordu. Kök adres (`/`)
 * ve TarpoVizyon giriş sayfaları hâlâ MASAÜSTÜ ekranını çiziyordu: koyu yeşil
 * "TARPOL" kartları, sekme çubuğu yok, uygulamadan çıkmış gibi. Telefondan
 * `localhost:5177/` açan kullanıcı doğrudan eski arayüze düşüyordu.
 *
 * Eskiden yalnızca `isPlatform('capacitor')` kontrol ediliyordu — yani sadece
 * paketlenmiş uygulamada yönlendirme vardı, tarayıcıda yoktu. Oysa uygulama
 * tarayıcıdan da test ediliyor ve dar ekran dar ekrandır.
 *
 * Geniş ekranda hiçbir şey değişmiyor: masaüstü giriş ekranı olduğu gibi.
 */
export function GirisEkrani({
  masaustu, mobilYol, kapsam,
}: {
  /** Geniş ekranda çizilecek sayfa. */
  masaustu: ReactNode;
  /** Dar ekranda gidilecek adres. */
  mobilYol: string;
  /**
   * Dünya/Türkiye giriş sayfalarından geliniyorsa Keşfet'in kapsamı buna
   * ayarlanıyor — kullanıcı "Dünya"yı seçip Türkiye listesiyle karşılaşmasın.
   */
  kapsam?: Kapsam;
}) {
  const mobil = useMobileViewport();

  if (mobil || isPlatform('capacitor')) {
    if (kapsam) {
      try { sessionStorage.setItem('tarpo.kapsam', kapsam); } catch { /* özel mod */ }
    }
    return <Navigate to={mobilYol} replace />;
  }

  return <>{masaustu}</>;
}
