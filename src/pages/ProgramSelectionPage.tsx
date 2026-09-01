import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MoveRight, Apple as AppleIcon, Play } from 'lucide-react';

import { Hero } from '../components/ui/animated-hero';
import { Button } from '../components/ui/button';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';
import { VeriKarti } from '../components/vitrin/VeriKarti';
import { useVitrinVerisi } from '../components/vitrin/vitrinVerisi';

/**
 * TarpoVizyon web vitrini — sitenin kök adresi.
 *
 * ─── YAPI ───────────────────────────────────────────────────────────────────
 * Başlık → animasyonlu hero → DÖRT BÖLÜM (her biri 3 canlı kart) → mobil →
 * footer. Başlık ve footer paylaşılan bileşenler; veri sayfalarının içinde de
 * aynıları kullanılıyor, böylece dışarısı ile içerisi aynı dili konuşuyor.
 *
 * ─── KARTLAR ────────────────────────────────────────────────────────────────
 * Kartlar artık hem CANLI hem TIKLANABİLİR: her biri verinin geldiği asıl
 * sayfaya götürüyor. Önce yalnızca üç hayvancılık kartı vardı ve hiçbiri
 * tıklanmıyordu; şimdi dört bölümün her birinden üçer kart var.
 *
 * Ayrı bir "dört başlık" kartı bölümü YOK — bölüm başlıklarının kendisi o işi
 * yapıyor. İki ayrı yerde aynı dört kategoriyi listelemek tekrardı.
 *
 * ─── KAPSAM (istendi) ───────────────────────────────────────────────────────
 * Araçlar bölümü yok, veri kaynakları bölümü yok. Sorumluluk metni footer'da.
 */

export function ProgramSelectionPage() {
  const navigate = useNavigate();
  const azalt = useReducedMotion();
  const { bolumler, ilBolumunuYukle } = useVitrinVerisi();

  const belir = (gecikme = 0) =>
    azalt
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-60px' },
          transition: { duration: 0.55, delay: gecikme, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="min-h-screen bg-[var(--tv-zemin)] text-[var(--tv-murekkep)] antialiased">
      <VitrinHeader />

      <Hero />

      {/* ───────── DÖRT BÖLÜM ───────── */}
      {bolumler.map((bolum, bi) => (
        <motion.section
          key={bolum.id}
          className={bi % 2 === 0 ? 'bg-[var(--tv-zemin-2)] py-16' : 'py-16'}
          /*
           * İl düzeyindeki uçlar ağır; bölüm ekrana girene kadar
           * istenmiyorlar. `once` sayesinde tek sefer tetikleniyor.
           */
          onViewportEnter={bolum.id === 'il' ? ilBolumunuYukle : undefined}
          viewport={{ once: true, margin: '80px' }}
        >
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <motion.div
              {...belir(0)}
              className="mb-8 flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                <span
                  className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: bolum.renk }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: bolum.renk }}
                    aria-hidden="true"
                  />
                  Bölüm {bi + 1}
                </span>
                <h2 className="text-[clamp(1.75rem,3.6vw,2.5rem)] font-semibold tracking-[-0.02em]">
                  {bolum.ad}
                </h2>
                <p className="mt-2 max-w-[56ch] text-[19px] leading-relaxed text-[var(--tv-ikincil)]">
                  {bolum.ac}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(bolum.yol)}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[16px] font-medium text-[var(--tv-vurgu)] hover:underline"
              >
                Tümünü gör
                <MoveRight size={15} />
              </button>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bolum.kartlar.map((kart, ki) => (
                <motion.div key={kart.id} className="h-full" {...belir(0.07 * (ki + 1))}>
                  <VeriKarti kart={kart} renk={bolum.renk} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      ))}

      {/* ───────── MOBİL ───────── */}
      <section id="mobil" className="scroll-mt-16 bg-[var(--tv-zemin-2)] py-20">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <motion.div {...belir(0)} className="text-center">
            <h2 className="text-[clamp(1.75rem,3.6vw,2.5rem)] font-semibold tracking-[-0.02em]">
              Aynı veri, cebinizde
            </h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-[19px] leading-relaxed text-[var(--tv-ikincil)]">
              TarpoVizyon mobil uygulaması aynı istatistikleri, piyasa fiyatlarını ve
              yapay zekâ asistanını sunar. Ücretsiz, hesap açmadan.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href="https://apps.apple.com/tr/app/tarpovizyon/id6751459787">
                  <AppleIcon className="h-4 w-4" /> App Store
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href="https://play.google.com/store/apps/details?id=com.tarpovizyon.app">
                  <Play className="h-4 w-4" /> Google Play
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <VitrinFooter />
    </div>
  );
}
