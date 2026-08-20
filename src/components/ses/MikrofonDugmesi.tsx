import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { dinlemeDestekleniyorMu, dinlemeyeBasla, dinlemeyiDurdur } from './dinleme';

/**
 * Konuşarak yazdıran mikrofon düğmesi.
 *
 * ─── DESTEK YOKSA DÜĞME HİÇ YOK ─────────────────────────────────────────────
 * Destek eşzamansız öğrenildiği için (native tarafta eklentiye sormak
 * gerekiyor) düğme önce görünmüyor, destek doğrulanınca beliriyor. Tersi —
 * önce gösterip sonra gizlemek — ekranda zıplamaya yol açardı.
 */

type Props = {
  /** Kesinleşen metinle çağrılır. */
  onMetin: (metin: string) => void;
  /** Konuşurken oluşan ara metin; kutuda canlı göstermek için. */
  onAraMetin?: (metin: string) => void;
};

export function MikrofonDugmesi({ onMetin, onAraMetin }: Props) {
  const [destek, setDestek] = useState(false);
  const [dinliyor, setDinliyor] = useState(false);
  /*
   * Son ara metin saklanıyor: bazı tanıyıcılar kesin sonucu ayrıca
   * vermeden bitiyor ve o zaman kullanıcının söylediği kaybolurdu.
   */
  const sonAra = useRef('');

  useEffect(() => {
    let iptal = false;
    dinlemeDestekleniyorMu().then((v) => { if (!iptal) setDestek(v); });
    return () => { iptal = true; };
  }, []);

  /* Bileşen kalkarken mikrofon açık kalmasın. */
  useEffect(() => () => { void dinlemeyiDurdur(); }, []);

  if (!destek) return null;

  const tikla = async () => {
    if (dinliyor) { await dinlemeyiDurdur(); return; }
    sonAra.current = '';
    const basladi = await dinlemeyeBasla(
      (metin, kesin) => {
        if (kesin) { onMetin(metin); sonAra.current = ''; return; }
        sonAra.current = metin;
        onAraMetin?.(metin);
      },
      () => {
        setDinliyor(false);
        if (sonAra.current) { onMetin(sonAra.current); sonAra.current = ''; }
      },
    );
    setDinliyor(basladi);
  };

  return (
    <button
      type="button"
      className={`ios-mikrofon${dinliyor ? ' ios-mikrofon--acik' : ''}`}
      onClick={tikla}
      aria-label={dinliyor ? 'Dinlemeyi durdur' : 'Konuşarak yaz'}
      aria-pressed={dinliyor}
    >
      {dinliyor
        ? <Square size={15} fill="currentColor" aria-hidden="true" />
        : <Mic size={17} aria-hidden="true" />}
    </button>
  );
}
