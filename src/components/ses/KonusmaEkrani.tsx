import { Suspense, lazy, useEffect, useState } from 'react';
import { Square } from 'lucide-react';
import { durdur, konusmaDinle } from './konusma';

/**
 * Asistan konuşurken açılan tam ekran görünüm.
 *
 * ─── NEDEN TEMBEL YÜKLENİYOR ────────────────────────────────────────────────
 * Küre `three` + `@react-three/fiber` istiyor; bu ikisi sıkıştırılmış hâlde
 * bile birkaç yüz kilobayt. Bunu ana pakete koymak, sesi hiç kullanmayan
 * kullanıcıya da indirtmek demekti — üstelik uygulamanın asıl işi veri
 * göstermek, dekoratif bir kürenin açılışı yavaşlatması kabul edilemez.
 *
 * Dinamik `import()` sayesinde Vite bunu ayrı bir parçaya alıyor ve dosya
 * ancak ilk kez "Dinle"ye basıldığında iniyor.
 *
 * ─── NEDEN AYRI EKRAN ───────────────────────────────────────────────────────
 * Diğer sesli asistanlarda olduğu gibi: konuşma başlayınca ekran öne geçiyor,
 * dokununca susuyor. Küçük bir köşe animasyonu, telefonu cebe koyup dinleyen
 * kullanıcıya durdurmak için hedef bırakmıyordu.
 */

const GradientOrb = lazy(() =>
  import('./GradientOrb').then((m) => ({ default: m.GradientOrb })));

export function KonusmaEkrani() {
  const [acik, setAcik] = useState(false);

  useEffect(() => konusmaDinle(setAcik), []);

  /*
   * Geri tuşu / gerileme konuşmayı susturuyor. Bu olmadan kullanıcı sayfadan
   * çıkıyor ama ses arkada okumaya devam ediyordu.
   */
  useEffect(() => {
    if (!acik) return;
    const kapat = () => durdur();
    window.addEventListener('popstate', kapat);
    return () => window.removeEventListener('popstate', kapat);
  }, [acik]);

  if (!acik) return null;

  return (
    <div
      className="ses-ekran"
      role="dialog"
      aria-modal="true"
      aria-label="Asistan konuşuyor"
      onClick={() => durdur()}
    >
      <div className="ses-ekran__orb">
        {/*
          * Yedek: küre inene kadar boş kalmasın. Süre kısa ama ağ yavaşsa
          * kullanıcı siyah bir ekrana bakmamalı.
          */}
        <Suspense fallback={<div className="ses-ekran__yedek" />}>
          <GradientOrb />
        </Suspense>
      </div>

      <p className="ses-ekran__yazi">Okunuyor…</p>

      <button
        type="button"
        className="ses-ekran__durdur"
        onClick={(e) => { e.stopPropagation(); durdur(); }}
      >
        <Square size={15} fill="currentColor" aria-hidden="true" />
        <span>Durdur</span>
      </button>
    </div>
  );
}
