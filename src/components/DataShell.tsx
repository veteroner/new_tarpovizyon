import { lazy, Suspense, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import TarpoShell from './TarpoShell';
import { useMobileViewport } from '../mobile/hooks/useMobileViewport';

/**
 * Sayfa düzenini cihaza göre seçer.
 *
 * Rota tablosunda TEK bir düzen satırı var; hangi kabuğun çizileceği burada
 * kararlaştırılıyor. Böylece rotaları ikinci kez yazmak gerekmiyor — menüye
 * eklenen sayfa iki kabukta da doğru çerçeveyi alıyor.
 *
 * `desktop` verilmezse geniş ekranda TarpoVizyon panosu çiziliyor. Basic
 * kendi kabuğunu, araç sayfaları ise hiç kabuk istemiyor; onlar bu prop'la
 * kendi masaüstü düzenlerini geçiyor. Mobil taraf her üçünde de aynı: iOS
 * kabuğu, geri düğmesi ve sekme çubuğu.
 */
const MobileDataShell = lazy(() => import('../mobile/components/MobileDataShell'));

export default function DataShell({ desktop }: { desktop?: ReactNode }) {
  const mobil = useMobileViewport();
  if (!mobil) return <>{desktop ?? <TarpoShell />}</>;
  return (
    <Suspense fallback={null}>
      <MobileDataShell />
    </Suspense>
  );
}

/** Masaüstünde hiç kabuk istemeyen rotalar için (araç sayfaları). */
export function KabuksuzMasaustu() {
  return <Outlet />;
}
