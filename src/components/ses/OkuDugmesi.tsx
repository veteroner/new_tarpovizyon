import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { konus, durdur, konusmaDinle, konusuyorMu, sesDestekleniyorMu, sesKilidiniAc } from './konusma';

/**
 * Bir metni sesli okutan düğme.
 *
 * ─── DESTEK YOKSA DÜĞME HİÇ YOK ─────────────────────────────────────────────
 * Sentezleyici bulunmayan bir tarayıcıda düğme gizleniyor, devre dışı
 * gösterilmiyor. Basınca hiçbir şey olmayan bir düğme, olmayan düğmeden
 * kötü: kullanıcı uygulamanın bozuk olduğunu düşünüyor.
 *
 * ─── HANGİ METİN OKUNUYOR ───────────────────────────────────────────────────
 * Ham cevap veriliyor; sadeleştirmeyi `okunabilirMetin` yapıyor. Böylece
 * ekranda markdown'lı hâli dururken kulağa okunabilir hâli gidiyor.
 */

export function OkuDugmesi({ metin }: { metin: string }) {
  /*
   * Bu düğme mi okutuyor, başka bir düğme mi — ayırt etmek şart. Tek bir
   * "konuşuyor" bayrağına bakılsaydı bir cevabı okuturken SAYFADAKİ TÜM
   * düğmeler durdurma simgesine dönerdi.
   */
  const [benOkuyorum, setBenOkuyorum] = useState(false);

  useEffect(() => konusmaDinle((k) => {
    if (!k) setBenOkuyorum(false);
  }), []);

  if (!sesDestekleniyorMu()) return null;

  const tikla = () => {
    /* Kilit kullanıcı dokunuşunun İÇİNDE açılmalı; sonrasında geç kalıyor. */
    sesKilidiniAc();
    if (benOkuyorum) { durdur(); setBenOkuyorum(false); return; }
    if (konusuyorMu()) durdur();
    setBenOkuyorum(konus(metin));
  };

  return (
    <button
      type="button"
      className="ios-oku"
      onClick={tikla}
      aria-label={benOkuyorum ? 'Okumayı durdur' : 'Sesli oku'}
      aria-pressed={benOkuyorum}
    >
      {benOkuyorum
        ? <Square size={13} fill="currentColor" aria-hidden="true" />
        : <Volume2 size={15} aria-hidden="true" />}
      <span>{benOkuyorum ? 'Durdur' : 'Dinle'}</span>
    </button>
  );
}
