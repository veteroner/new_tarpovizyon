import { lazy, Suspense } from 'react';
import TarpoShell from './TarpoShell';
import { useMobileViewport } from '../mobile/hooks/useMobileViewport';

/**
 * Veri sayfalarının düzenini cihaza göre seçer.
 *
 * Rota tablosunda TEK bir düzen satırı var; hangi kabuğun çizileceği burada
 * kararlaştırılıyor. Böylece ~70 veri rotasının hiçbirini iki kez yazmak
 * gerekmiyor — menüye eklenen sayfa iki kabukta da doğru çerçeveyi alıyor.
 */
const MobileDataShell = lazy(() => import('../mobile/components/MobileDataShell'));

export default function DataShell() {
  const mobil = useMobileViewport();
  if (!mobil) return <TarpoShell />;
  return (
    <Suspense fallback={null}>
      <MobileDataShell />
    </Suspense>
  );
}
