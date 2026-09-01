import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MoveRight, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from './button';

/**
 * TarpoVizyon hero — dönen kelime animasyonu.
 *
 * ─── ERİŞİLEBİLİRLİK ────────────────────────────────────────────────────────
 * Dönen kelimeler üst üste duran mutlak konumlu dört ayrı düğüm. Ekran
 * okuyucu bunları arka arkaya okursa başlık "Tarım verisi artık tek ekranda
 * anlaşılır karşılaştırılabilir güncel" diye saçmalar. Bu yüzden animasyonlu
 * blok `aria-hidden`, başlığın okunacak hâli ise `sr-only` bir cümle olarak
 * ayrıca duruyor.
 *
 * ─── HAREKETİ AZALT ─────────────────────────────────────────────────────────
 * `prefers-reduced-motion` açıksa döngü HİÇ başlamıyor (zamanlayıcı da
 * kurulmuyor) ve tek kelime sabit duruyor. Yalnızca süreyi kısaltmak yeterli
 * değil: dönen metin, hareket hassasiyeti olan kullanıcı için asıl sorun.
 *
 * ─── İTHALAT NOTU ───────────────────────────────────────────────────────────
 * `@/components/ui/button` DEĞİL, göreli yol: bu depoda `@` → `src/rasyon`.
 */

const KELIMELER = ['tek ekranda', 'anlaşılır', 'karşılaştırılabilir', 'güncel'];

function Hero() {
  const navigate = useNavigate();
  const azaltilmisHareket = useReducedMotion();
  const [sira, setSira] = useState(0);
  const kelimeler = useMemo(() => KELIMELER, []);

  useEffect(() => {
    if (azaltilmisHareket) return;
    const zamanlayici = setTimeout(() => {
      setSira((s) => (s === kelimeler.length - 1 ? 0 : s + 1));
    }, 2200);
    return () => clearTimeout(zamanlayici);
  }, [sira, kelimeler, azaltilmisHareket]);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[980px] px-6">
        <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-28">
          <h1 className="flex flex-col text-center font-semibold tracking-[-0.03em] text-[var(--tv-murekkep)]">
            <span className="sr-only">Tarım verisi artık tek ekranda.</span>

            <span aria-hidden="true" className="text-[clamp(2.4rem,6.4vw,4.2rem)] leading-[1.05]">
              Tarım verisi artık
            </span>

            <span
              aria-hidden="true"
              className="relative flex w-full justify-center overflow-hidden text-[clamp(2.4rem,6.4vw,4.2rem)] leading-[1.05] md:pb-3 md:pt-1"
            >
              &nbsp;
              {kelimeler.map((kelime, i) => (
                <motion.span
                  key={kelime}
                  className="absolute text-[var(--tv-vurgu)]"
                  initial={{ opacity: 0, y: -100 }}
                  transition={{ type: 'spring', stiffness: 50 }}
                  animate={
                    azaltilmisHareket
                      ? { y: 0, opacity: i === 0 ? 1 : 0 }
                      : sira === i
                        ? { y: 0, opacity: 1 }
                        : { y: sira > i ? -150 : 150, opacity: 0 }
                  }
                >
                  {kelime}
                </motion.span>
              ))}
            </span>
          </h1>

          <p className="max-w-[42ch] text-center text-[clamp(1.05rem,2vw,1.3rem)] leading-relaxed text-[var(--tv-ikincil)]">
            Türkiye ve dünya tarımının üretim, fiyat, dış ticaret ve il bazındaki
            istatistikleri; yapay zekâ asistanıyla birlikte.
          </p>

          <div className="flex flex-row flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2" onClick={() => navigate('/tarpovizyon-basic')}>
              Veri platformuna gir <MoveRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('/m')}>
              <Smartphone className="h-4 w-4" /> Mobil uygulama
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
