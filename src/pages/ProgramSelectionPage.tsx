import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, Sprout, Beef, MapPin, MoveRight, Apple as AppleIcon, Play } from 'lucide-react';

import { Hero } from '../components/ui/animated-hero';
import { Button } from '../components/ui/button';

/**
 * TarpoVizyon web vitrini — sitenin kök adresi.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Önceki hâli bir web sayfası değil, bir UYGULAMA BAŞLATICIydı: logo, tek
 * kart, araç ızgarası, telif satırı. Başlık çubuğu, hero, bölüm ve footer
 * yoktu. Artık klasik bir vitrin yapısı var.
 *
 * ─── KAPSAM KARARLARI (istendi) ─────────────────────────────────────────────
 *   • ARAÇLAR BÖLÜMÜ YOK. Rasyon/Hasat/Sulama/Gübre/Takvim vitrine çıkmıyor.
 *     Rotaları duruyor ve çalışıyor, yalnızca ana sayfada tanıtılmıyorlar.
 *   • VERİ KAYNAKLARI BÖLÜMÜ YOK. TÜİK/FAO künyesi vitrinde anlatılmıyor;
 *     sorumluluk metni footer'ın alt barında tek satır olarak duruyor.
 *
 * ─── RENK ───────────────────────────────────────────────────────────────────
 * Apple'ın nötr ailesi (#fbfbfd / #f5f5f7 / #1d1d1f / #6e6e73), vurgu ise
 * Apple mavisi yerine TARPOL yeşili. Değerler `styles/marka-tokens.css`'te;
 * kontrastları hesaplandı. Vakfın limon rengi açık zeminde 2,00 kontrast
 * verdiği için METİN OLARAK KULLANILMIYOR — yalnızca ayraç/nokta.
 *
 * ─── VERİ ───────────────────────────────────────────────────────────────────
 * Rakamlar canlı API'den geliyor. Başlangıç değeri olarak API'nin şu anda
 * döndürdüğü değerler duruyor ki sayfa boş/iskelet görünmesin; istek dönünce
 * üzerine yazılıyor. YIL da veriden okunuyor — böylece kaynak 2026'ya
 * geçtiğinde etiket kendiliğinden güncelleniyor, elle güncellenmesi gereken
 * bir "2025" yazısı kalmıyor.
 */

const API = 'https://tarpovizyon-api.veteroner.workers.dev';

type Seri = { yil: number; deger: number };
type Gosterge = { yil: number; deger: number; seri: Seri[] };

/** Ölçülen mevcut değerler — ilk boyama için; istek dönünce değişiyor. */
const BASLANGIC: Record<'sut' | 'et' | 'varlik', Gosterge> = {
  sut: {
    yil: 2025,
    deger: 20241858,
    seri: [
      { yil: 2013, deger: 16706956 }, { yil: 2014, deger: 17053653 },
      { yil: 2015, deger: 16996271 }, { yil: 2016, deger: 16849348 },
      { yil: 2017, deger: 18831720 }, { yil: 2018, deger: 20112619 },
      { yil: 2019, deger: 19592521 }, { yil: 2020, deger: 21749342 },
      { yil: 2021, deger: 21370116 }, { yil: 2022, deger: 19912135 },
      { yil: 2023, deger: 19961908 }, { yil: 2024, deger: 21098564 },
      { yil: 2025, deger: 20241858 },
    ],
  },
  et: {
    yil: 2025,
    deger: 1325916,
    seri: [
      { yil: 2013, deger: 803364 }, { yil: 2014, deger: 820677 },
      { yil: 2015, deger: 867399 }, { yil: 2016, deger: 961650 },
      { yil: 2017, deger: 1099709 }, { yil: 2018, deger: 1287749 },
      { yil: 2019, deger: 1337320 }, { yil: 2020, deger: 1349870 },
      { yil: 2021, deger: 1471550 }, { yil: 2022, deger: 1586333 },
      { yil: 2023, deger: 1685992 }, { yil: 2024, deger: 1496824 },
      { yil: 2025, deger: 1325916 },
    ],
  },
  /*
   * Hayvan varlığı serisi ilk boyamada BOŞ bırakılıyor: bu uçta yıllar
   * `tarih` alanında ve iki sütunun toplamı gerekiyor, elle yazmak yerine
   * istek dönünce kuruluyor. Kart o ana kadar grafiksiz ama sayı doğru.
   */
  varlik: { yil: 2025, deger: 75583303, seri: [] },
};

/** Sayıyı "20,24 mn" gibi Türkçe kısaltmaya çevirir. */
function kisalt(n: number): { sayi: string; birim: string } {
  if (n >= 1_000_000) return { sayi: (n / 1_000_000).toFixed(2).replace('.', ','), birim: 'mn' };
  if (n >= 1_000) return { sayi: (n / 1_000).toFixed(1).replace('.', ','), birim: 'bin' };
  return { sayi: String(n), birim: '' };
}

/** Seriden sparkline yolu üretir. */
function cizgiYolu(seri: Seri[], g = 220, y = 56, pad = 4) {
  if (seri.length < 2) return null;
  const d = seri.map((s) => s.deger);
  const lo = Math.min(...d);
  const hi = Math.max(...d);
  const aralik = hi - lo || 1;
  const nk = seri.map((s, i) => {
    const x = pad + (i * (g - 2 * pad)) / (seri.length - 1);
    const yy = y - pad - ((s.deger - lo) / aralik) * (y - 2 * pad);
    return [x, yy] as const;
  });
  const cizgi = 'M' + nk.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' L');
  const alan = `${cizgi} L${nk[nk.length - 1][0].toFixed(1)},${y} L${nk[0][0].toFixed(1)},${y} Z`;
  return { cizgi, alan, son: nk[nk.length - 1] };
}

const KATEGORILER = [
  {
    ad: 'Makro Veriler',
    ac: 'Tarımsal GSYH, enflasyon, dış ticaret dengesi ve fiyat endeksleri.',
    ikon: BarChart3,
    yol: '/tarpovizyon-basic/makro/genel',
  },
  {
    ad: 'Bitkisel Üretim',
    ac: 'Tahıl, meyve, sebze ve endüstri bitkilerinde üretim, alan ve verim.',
    ikon: Sprout,
    yol: '/tarpovizyon-basic',
  },
  {
    ad: 'Hayvansal Üretim',
    ac: 'Hayvan varlığı, süt, kırmızı et, kanatlı, yumurta ve arıcılık.',
    ikon: Beef,
    yol: '/tarpovizyon-basic',
  },
  {
    ad: 'İl Düzeyinde',
    ac: '81 ilde üretim, havza ürün deseni ve coğrafi işaretli ürünler.',
    ikon: MapPin,
    yol: '/tarpovizyon-basic',
  },
];

export function ProgramSelectionPage() {
  const navigate = useNavigate();
  const azalt = useReducedMotion();
  const [veri, setVeri] = useState(BASLANGIC);

  useEffect(() => {
    let iptal = false;
    const al = async (uc: string) => {
      const r = await fetch(`${API}/api/${uc}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      return (Array.isArray(j) ? j : j.data) as Record<string, number>[];
    };

    (async () => {
      try {
        const [sutHam, etHam, varlikHam] = await Promise.all([
          al('cig-sut/uretim-miktari'),
          al('kirmizi-et/uretim-miktari'),
          al('tr/hayvan-varliklari'),
        ]);
        if (iptal) return;

        const seriYap = (satir: Record<string, number>[], alan: string): Seri[] =>
          satir
            .filter((s) => s.yil >= 2013 && typeof s[alan] === 'number')
            .map((s) => ({ yil: Number(s.yil), deger: Number(s[alan]) }));

        const sutSeri = seriYap(sutHam, 'buyukbas_sut_uretimi_ton');
        const etSeri = seriYap(etHam, 'buyukbas_et_uretimi_ton');
        /*
         * Hayvan varlığında yıl `tarih` alanında ("2025-01-01 00:00:00") ve
         * toplam iki sütunun toplamı. Aynı yıl birden çok satır dönebildiği
         * için yıla göre teklenip son değeri alınıyor.
         */
        const varlikYillik = new Map<number, number>();
        varlikHam.forEach((s) => {
          const yil = new Date(String(s.tarih)).getFullYear();
          if (!Number.isFinite(yil) || yil < 2013) return;
          const toplam =
            Number(s.buyukbas_toplam_bas ?? 0) + Number(s.kucukbas_toplam_bas ?? 0);
          if (toplam > 0) varlikYillik.set(yil, toplam);
        });
        const varlikSeri: Seri[] = [...varlikYillik.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([yil, deger]) => ({ yil, deger }));

        const sonVarlik = varlikHam[varlikHam.length - 1];

        setVeri((o) => ({
          sut: sutSeri.length
            ? { yil: sutSeri[sutSeri.length - 1].yil, deger: sutSeri[sutSeri.length - 1].deger, seri: sutSeri }
            : o.sut,
          et: etSeri.length
            ? { yil: etSeri[etSeri.length - 1].yil, deger: etSeri[etSeri.length - 1].deger, seri: etSeri }
            : o.et,
          varlik: varlikSeri.length
            ? {
                yil: varlikSeri[varlikSeri.length - 1].yil,
                deger: varlikSeri[varlikSeri.length - 1].deger,
                seri: varlikSeri,
              }
            : sonVarlik
              ? {
                  yil: new Date(String(sonVarlik.tarih)).getFullYear() || o.varlik.yil,
                  deger:
                    Number(sonVarlik.buyukbas_toplam_bas ?? 0) +
                    Number(sonVarlik.kucukbas_toplam_bas ?? 0),
                  seri: [],
                }
              : o.varlik,
        }));
      } catch {
        /* Ağ yoksa ölçülen başlangıç değerleri görünmeye devam eder. */
      }
    })();

    return () => {
      iptal = true;
    };
  }, []);

  const kartlar = [
    { anahtar: 'sut' as const, etiket: 'İnek sütü üretimi', birim: 'ton', renk: 'var(--tv-vurgu)' },
    { anahtar: 'et' as const, etiket: 'Büyükbaş kırmızı et', birim: 'ton', renk: '#b87611' },
    { anahtar: 'varlik' as const, etiket: 'Toplam hayvan varlığı', birim: 'baş', renk: '#15557a' },
  ];

  const belir = (gecikme: number) =>
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
      {/* ───────── HEADER ───────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--tv-cizgi-ince)] bg-[var(--tv-ust-cam)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-[1000px] items-center gap-6 px-6">
          {/*
            * Dokunma hedefleri: metin yüksekliği 18–19px'ti, telefonda isabet
            * ettirmek zordu (HIG asgarisi 44px). Görsel boyut aynı kaldı,
            * `min-h` ile TIKLANABİLİR ALAN büyütüldü.
            */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex min-h-[44px] shrink-0 items-center"
            aria-label="TarpoVizyon ana sayfa"
          >
            <img
              src="/marka/tarpol-logo.png"
              alt="TARPOL — Tarımsal Strateji ve Politika Geliştirme Merkezi"
              width={460}
              height={86}
              className="tv-logo h-7 w-auto"
            />
          </button>

          <nav className="ml-2 hidden items-center gap-6 md:flex">
            <button
              type="button"
              onClick={() => navigate('/tarpovizyon-basic')}
              className="flex min-h-[44px] items-center text-[12.5px] text-[var(--tv-murekkep)] opacity-80 transition-opacity hover:opacity-100"
            >
              Veri Platformu
            </button>
            <button
              type="button"
              onClick={() => navigate('/m')}
              className="flex min-h-[44px] items-center text-[12.5px] text-[var(--tv-murekkep)] opacity-80 transition-opacity hover:opacity-100"
            >
              Mobil
            </button>
            <a
              href="https://www.tarpol.org.tr"
              className="flex min-h-[44px] items-center text-[12.5px] text-[var(--tv-murekkep)] opacity-80 transition-opacity hover:opacity-100"
            >
              Vakıf
            </a>
          </nav>

          <Button
            size="sm"
            className="ml-auto"
            onClick={() => navigate('/tarpovizyon-basic')}
          >
            Veriye gir
          </Button>
        </div>
      </header>

      {/* ───────── HERO ───────── */}
      <Hero />

      {/* ───────── CANLI VERİ KARTLARI ───────── */}
      <section className="bg-[var(--tv-zemin-2)] py-20">
        <div className="mx-auto max-w-[1000px] px-6">
          <motion.div {...belir(0)} className="mb-10 text-center">
            <h2 className="text-[clamp(1.7rem,3.6vw,2.4rem)] font-semibold tracking-[-0.02em]">
              Türkiye, rakamlarla
            </h2>
            <p className="mt-2 text-[15px] text-[var(--tv-ikincil)]">
              Platformdaki binlerce serinin üçü.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {kartlar.map((k, i) => {
              const g = veri[k.anahtar];
              const { sayi, birim } = kisalt(g.deger);
              const yol = cizgiYolu(g.seri);
              return (
                <motion.div
                  key={k.anahtar}
                  {...belir(0.08 * (i + 1))}
                  className="flex flex-col rounded-[18px] border border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)] p-6 shadow-[var(--tv-golge)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: k.renk }}
                      aria-hidden="true"
                    />
                    <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--tv-ikincil)]">
                      {k.etiket}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-[2.6rem] font-semibold leading-none tracking-[-0.03em]">
                      {sayi}
                    </span>
                    <span className="text-[15px] text-[var(--tv-ikincil)]">
                      {birim} {k.birim}
                    </span>
                  </div>

                  <span className="mt-1 text-[12px] text-[var(--tv-ikincil)]">{g.yil}</span>

                  <div className="mt-auto pt-5">
                    {yol ? (
                      <svg
                        width="100%"
                        height="56"
                        viewBox="0 0 220 56"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label={`${k.etiket} ${g.seri[0].yil}–${g.yil} eğilimi`}
                      >
                        <path d={yol.alan} fill={k.renk} opacity="0.1" />
                        <path
                          d={yol.cizgi}
                          fill="none"
                          stroke={k.renk}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        <circle cx={yol.son[0]} cy={yol.son[1]} r="3.2" fill={k.renk} />
                      </svg>
                    ) : (
                      <div className="h-[56px]" aria-hidden="true" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── KATEGORİLER ───────── */}
      <section className="py-20">
        <div className="mx-auto max-w-[1000px] px-6">
          <motion.div {...belir(0)} className="mb-10 text-center">
            <h2 className="text-[clamp(1.7rem,3.6vw,2.4rem)] font-semibold tracking-[-0.02em]">
              Dört başlık, tek platform
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {KATEGORILER.map((kat, i) => {
              const Ikon = kat.ikon;
              return (
                <motion.button
                  key={kat.ad}
                  type="button"
                  onClick={() => navigate(kat.yol)}
                  {...belir(0.07 * (i + 1))}
                  className="group flex flex-col items-start rounded-[18px] border border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)] p-7 text-left shadow-[var(--tv-golge)] transition-shadow hover:shadow-[var(--tv-golge-kart)]"
                >
                  <span className="mb-4 grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--tv-vurgu-sis)] text-[var(--tv-vurgu)]">
                    <Ikon size={21} strokeWidth={1.9} />
                  </span>
                  <span className="text-[19px] font-semibold tracking-[-0.01em]">{kat.ad}</span>
                  <span className="mt-1.5 text-[14px] leading-relaxed text-[var(--tv-ikincil)]">
                    {kat.ac}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--tv-vurgu)]">
                    İncele
                    <MoveRight
                      size={15}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── MOBİL ───────── */}
      <section className="bg-[var(--tv-zemin-2)] py-20">
        <div className="mx-auto max-w-[1000px] px-6">
          <motion.div {...belir(0)} className="text-center">
            <h2 className="text-[clamp(1.7rem,3.6vw,2.4rem)] font-semibold tracking-[-0.02em]">
              Aynı veri, cebinizde
            </h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-[16px] leading-relaxed text-[var(--tv-ikincil)]">
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

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-[var(--tv-cizgi-ince)] bg-[var(--tv-zemin)] pt-14">
        <div className="mx-auto max-w-[1000px] px-6">
          <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <img
                src="/marka/tarpol-logo.png"
                alt="TARPOL"
                width={460}
                height={86}
                className="tv-logo mb-4 h-7 w-auto"
              />
              <p className="text-[12.5px] leading-relaxed text-[var(--tv-ikincil)]">
                Tarım ve gıda sektöründe üreticiler, sivil toplum kuruluşları,
                üniversiteler, kamu ve özel sektör kurumlarının katılımını sağlayan
                sektörel hizmet platformunun veri kanadı.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tv-murekkep)]">
                Platform
              </h3>
              <ul className="space-y-0.5 text-[12.5px] text-[var(--tv-ikincil)]">
                {KATEGORILER.map((k) => (
                  <li key={k.ad}>
                    <button
                      type="button"
                      onClick={() => navigate(k.yol)}
                      className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]"
                    >
                      {k.ad}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/m')}
                    className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]"
                  >
                    Mobil uygulama
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tv-murekkep)]">
                Kurumsal
              </h3>
              <ul className="space-y-0.5 text-[12.5px] text-[var(--tv-ikincil)]">
                {[
                  ['TARPOL Hakkında', 'https://www.tarpol.org.tr/tarpol-hakkinda'],
                  ['Mütevelli Heyeti', 'https://www.tarpol.org.tr/mutevelli-heyeti'],
                  ['Yönetim Kurulu', 'https://www.tarpol.org.tr/yonetim-kurulu'],
                  ['Yayınlar', 'https://www.tarpol.org.tr/kitaplar'],
                  ['İletişim', 'https://www.tarpol.org.tr/iletisim'],
                ].map(([ad, url]) => (
                  <li key={ad}>
                    <a href={url} className="inline-flex min-h-[36px] items-center transition-colors hover:text-[var(--tv-vurgu)]">
                      {ad}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tv-murekkep)]">
                Adres
              </h3>
              <p className="text-[12.5px] leading-relaxed text-[var(--tv-ikincil)]">
                Hacettepe Mahallesi
                <br />
                Cingöz Sokak No:10
                <br />
                Altındağ / Ankara
              </p>
              <a
                href="mailto:iletisim@tarpol.org.tr"
                className="mt-2 inline-flex min-h-[36px] items-center text-[12.5px] text-[var(--tv-vurgu)] hover:underline"
              >
                iletisim@tarpol.org.tr
              </a>
            </div>
          </div>

          <div className="border-t border-[var(--tv-cizgi-ince)] py-6">
            <p className="mb-3 text-[11.5px] leading-relaxed text-[var(--tv-ikincil)]">
              İstatistikler kamuya açık kaynaklardan derlenir ve sonradan revize
              edilebilir; bilgilendirme amaçlıdır, resmî kaynağın yerini tutmaz.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-[var(--tv-ikincil)]">
              <span>© 2024–2026 TARPOL</span>
              <span aria-hidden="true" className="text-[var(--tv-limon)]">
                •
              </span>
              <span>Yapay Zekâ · Veri · Bilim · İnovasyon Merkezi</span>
              <a
                href="https://www.tarpol.org.tr"
                className="ml-auto transition-colors hover:text-[var(--tv-vurgu)]"
              >
                tarpol.org.tr ↗
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
