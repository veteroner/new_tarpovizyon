import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Globe2, Wheat, Beef, Ship, MapPin, Leaf, Wrench, Activity } from 'lucide-react';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';
import { VeriKarti } from '../components/vitrin/VeriKarti';
import { useVitrinVerisi, type Kart } from '../components/vitrin/vitrinVerisi';
import { isPlatform } from '../mobile/utils/platform';
import { ayarOku, type Ayarlar } from './panel/yonetimApi';

/**
 * Pro vitrini — `/tarpovizyon/pro`
 *
 * ─── NEDEN AYRI SAYFA ───────────────────────────────────────────────────────
 * Para duvarı açıldığında Pro'nun tamamı kapanıyor ve satın alma kararı
 * verilecek hiçbir kanıt kalmıyor. İlk düşünce Genel Bakış'ı vitrin yapmaktı;
 * ölçüm çürüttü — o sayfa 13 uç okuyor ve DÖRDÜ korumalı listede. Açmak kapıyı
 * delerdi, kapalı tutmak sayfanın yarısını boş çizerdi (`auth/kapiAyari.ts`).
 *
 * Bu sayfa YALNIZCA ücretsiz uçlardan besleniyor: 106 ucun 69'u korumasız,
 * buradaki iki seri de onlardan. Yani duvar açıkken de tam çiziliyor ve
 * kapıdan hiçbir şey sızmıyor.
 *
 * ─── SAYILAR PAZARLAMA DEĞİL, ÖLÇÜM ─────────────────────────────────────────
 * "Onlarca sayfa", "kapsamlı analiz" gibi cümleler yerine gerçek sayılar var:
 * 60 sayfa (denetim betiğiyle sayıldı ve hepsi telefon genişliğinde
 * çizilebiliyor), 8 kategori, iki kapsam. Abartmak, ürünü ilk açtığında
 * kullanıcının güvenini kaybettirir.
 *
 * ─── KARTLAR ────────────────────────────────────────────────────────────────
 * Üç bölüm, Pro'nun kendi bölüm adlarıyla: Fiyat ve Ekonomi, Hayvansal Üretim,
 * Bitkisel Üretim. Kart verisi Basic vitriniyle AYNI yükleyiciden
 * (`useVitrinVerisi`) geliyor — o uçlar tanımı gereği ücretsiz, yani duvar
 * açıkken de tam çiziliyor. Yalnız dış ticaret haddi kartı burada ayrıca
 * çekiliyor (`makro/dis-ticaret-endeks`, korumalı listede değil).
 *
 * Gıda enflasyonu kartı bilerek yok: aynı sayı sayfanın üstünde duruyor.
 * Kârlılık/parite kartları kullanıcı isteğiyle kaldırıldı (Eylül 2026).
 */

const API = 'https://tarpovizyon-api.veteroner.workers.dev';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const KATEGORILER = [
  { ad: 'Genel Bakış', ikon: Globe2, ozet: 'Tarım röntgeni, kritik sinyaller ve tek ekranda durum' },
  { ad: 'Fiyat ve Ekonomi', ikon: Activity, ozet: 'Fiyat endeksleri, arz–talep dengesi, çapraz içgörü' },
  { ad: 'Bitkisel Üretim', ikon: Wheat, ozet: 'Tahıl, sebze, meyve, yağlı tohum, bakliyat ve daha fazlası' },
  { ad: 'Hayvansal Üretim', ikon: Beef, ozet: 'Kırmızı et, beyaz et, süt, yumurta, arıcılık' },
  { ad: 'Dış Ticaret', ikon: Ship, ozet: 'Ürün ve ülke kırılımıyla ihracat–ithalat' },
  { ad: 'İl Bazında', ikon: MapPin, ozet: 'İl ve havza düzeyinde üretim, desen, coğrafi işaret' },
  { ad: 'Kaynak ve Çevre', ikon: Leaf, ozet: 'Arazi örtüsü, gübre ve pestisit kullanımı, istihdam' },
  { ad: 'Araçlar', ikon: Wrench, ozet: 'Hasat tahmini, sulama planı, gübre hesabı, rasyon' },
];

type TufeSatir = { yil: number; ay: number; tufe: number | null; gida_alkolsuz: number | null };
type TicaretSatir = { tarih: string; gida_dis_ticaret_haddi: number | null };

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const sayi = (v: number | null | undefined, basamak = 1) =>
  (v == null ? '—' : v.toLocaleString('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak }));

export default function ProVitrinPage() {
  const [tufe, setTufe] = useState<TufeSatir[]>([]);
  const [ticaret, setTicaret] = useState<TicaretSatir[]>([]);
  const { bolumler } = useVitrinVerisi();
  const [ayarlar, setAyarlar] = useState<Ayarlar>({});

  useEffect(() => {
    let iptal = false;
    void (async () => {
      /*
       * Üç istek PARALEL: sıralı yapmak sayfayı üç kat yavaşlatırdı ve
       * aralarında bağımlılık yok. Biri düşerse diğerleri çiziliyor —
       * `allSettled`, çünkü fiyat okunamazsa grafik yine gösterilmeli.
       */
      const [t, d, a] = await Promise.allSettled([
        fetch(`${API}/api/makro/tufe-aylik?limit=500`).then((r) => r.json()),
        /* Korumalı listede DEĞİL — duvar açıkken de anonim ziyaretçiye çiziliyor. */
        fetch(`${API}/api/makro/dis-ticaret-endeks?limit=1000`).then((r) => r.json()),
        ayarOku(),
      ]);
      if (iptal) return;
      if (t.status === 'fulfilled') setTufe((t.value?.data ?? []) as TufeSatir[]);
      if (d.status === 'fulfilled') setTicaret((d.value?.data ?? []) as TicaretSatir[]);
      if (a.status === 'fulfilled') setAyarlar(a.value);
    })();
    return () => { iptal = true; };
  }, []);

  /** En son TÜFE/gıda satırı — dönem etiketiyle birlikte. */
  const sonEnflasyon = useMemo(() => {
    const sirali = [...tufe].sort((a, b) => (a.yil - b.yil) || (a.ay - b.ay));
    const son = sirali.at(-1);
    if (!son) return null;
    return { ...son, donem: `${AYLAR[son.ay - 1]} ${son.yil}` };
  }, [tufe]);

  /** Gıda dış ticaret haddi — ihracat birim değeri ÷ ithalat birim değeri, 2015=100. */
  const ticaretKarti = useMemo<Kart | null>(() => {
    const dolu = [...ticaret]
      .filter((r) => typeof r.gida_dis_ticaret_haddi === 'number')
      .sort((x, y) => String(x.tarih).localeCompare(String(y.tarih)));
    const son = dolu.at(-1);
    if (!son) return null;
    const m = String(son.tarih).match(/^(\d{4})-(\d{2})/);
    return {
      id: 'ticaret-haddi', etiket: 'Gıda dış ticaret haddi',
      deger: son.gida_dis_ticaret_haddi as number,
      /* Genel biçimlendirici tam sayıya yuvarlıyor ("97"); endekste ondalık anlamlı. */
      metin: (son.gida_dis_ticaret_haddi as number).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      birim: '2015=100',
      alt: m ? `${AY_KISA[Number(m[2]) - 1]} ${m[1]}` : '',
      seri: dolu.slice(-36).map((r) => r.gida_dis_ticaret_haddi as number),
      yol: '/tarpovizyon/turkey/trade',
    };
  }, [ticaret]);

  /** Basic yükleyicisinin bölümleri, Pro adlarıyla. */
  const kartGruplari = useMemo(() => {
    const bul = (id: string) => bolumler.find((b) => b.id === id);
    const makro = bul('makro'), hayvan = bul('hayvancilik'), bitki = bul('bitkisel');
    return [
      makro && { ad: 'Fiyat ve Ekonomi', renk: makro.renk,
        kartlar: [...makro.kartlar.filter((k) => k.id !== 'gida'), ...(ticaretKarti ? [ticaretKarti] : [])] },
      hayvan && { ad: 'Hayvansal Üretim', renk: hayvan.renk, kartlar: hayvan.kartlar },
      bitki && { ad: 'Bitkisel Üretim', renk: bitki.renk, kartlar: bitki.kartlar },
    ].filter((g): g is { ad: string; renk: string; kartlar: Kart[] } => Boolean(g && g.kartlar.length));
  }, [bolumler, ticaretKarti]);

  const aylik = Number(ayarlar.fiyat_aylik);
  const yillik = Number(ayarlar.fiyat_yillik);
  const deneme = Number(ayarlar.iyzico_deneme_gun ?? ayarlar.deneme_gun);
  const fiyatVar = Number.isFinite(yillik) && yillik > 0;
  /* Satın alma yolu mağaza derlemesinde GİZLİ — App Store 3.1.1. */
  const satisGoster = !isPlatform('capacitor');

  return (
    <div className="min-h-screen bg-[var(--tv-zemin,#f7f8f6)]">
      <VitrinHeader />

      {/*
        * `<main>` DEĞİL `<div>`: App.tsx rotaların tamamını zaten bir <main>
        * ile sarıyor. İkinci bir <main> iç içe geçer — geçersiz HTML ve ekran
        * okuyucuda iki "ana içerik" bölgesi demek. Ölçüldü: sayfada 2 <main>
        * vardı.
        */}
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6">

        {/* ─── Başlık ─────────────────────────────────────────────────── */}
        <section className="mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tv-cizgi-ince,rgba(0,0,0,.1))]
                           bg-[var(--tv-kart,#fff)] px-3 py-1 text-xs font-semibold text-[var(--tv-vurgu,#16a34a)]">
            <Sparkles size={13} aria-hidden="true" /> TarpoVizyon Pro
          </span>
          <h1 className="mt-4 max-w-3xl text-balance text-3xl font-bold leading-tight text-[var(--tv-metin,#1d1d1f)] md:text-4xl">
            Tarımda ne olduğunu değil, <span className="text-[var(--tv-vurgu,#16a34a)]">neden olduğunu</span> gösterir.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--tv-metin-ikincil,#5b6159)]">
            Ücretsiz bölümler üretim ve fiyat istatistiklerini verir. Pro, bunların
            arasındaki ilişkiyi kurar: girdi maliyeti üreticiye ne zaman yansıyor,
            hangi ürün zararda üretiliyor, Türkiye dünyanın neresinde duruyor.
          </p>
        </section>

        {/* ─── Canlı sayı ──────────────────────────────────────────────── */}
        {sonEnflasyon && (
          <section className="mb-12 grid gap-4 sm:grid-cols-2">
            {[
              { etiket: 'Gıda enflasyonu', deger: sonEnflasyon.gida_alkolsuz, vurgu: true },
              { etiket: 'Genel enflasyon (TÜFE)', deger: sonEnflasyon.tufe, vurgu: false },
            ].map((k) => (
              <div
                key={k.etiket}
                className="rounded-2xl border border-[var(--tv-cizgi-ince,rgba(0,0,0,.1))] bg-[var(--tv-kart,#fff)] p-5"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-metin-ikincil,#5b6159)]">
                  {k.etiket}
                </div>
                <div
                  className="mt-1 text-3xl font-bold tabular-nums"
                  style={{ color: k.vurgu ? 'var(--tv-vurgu, #16a34a)' : 'var(--tv-metin, #1d1d1f)' }}
                >
                  %{sayi(k.deger, 2)}
                </div>
                <div className="mt-1 text-xs text-[var(--tv-metin-ikincil,#5b6159)]">
                  {sonEnflasyon.donem} · yıllık değişim
                </div>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-[var(--tv-metin-ikincil,#5b6159)] sm:col-span-2">
              Bu iki sayı ücretsiz bölümlerde de var. Pro, aradaki farkın hangi
              girdiden geldiğini ve kaç ay gecikmeyle taşındığını gösterir.
            </p>
          </section>
        )}

        {/* ─── Rakamlarla tarım — kartlar ────────────────────────────────── */}
        {kartGruplari.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-[var(--tv-metin,#1d1d1f)]">
                Rakamlarla tarım
              </h2>
              <span className="text-xs text-[var(--tv-metin-ikincil,#5b6159)]">
                Canlı veri · ücretsiz bölümlerden
              </span>
            </div>
            <div className="space-y-6">
              {kartGruplari.map((g) => (
                <div key={g.ad}>
                  <div className="mb-2 text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--tv-ikincil)]">
                    {g.ad}
                  </div>
                  <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.kartlar.map((k) => <VeriKarti key={k.id} kart={k} renk={g.renk} />)}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--tv-metin-ikincil,#5b6159)]">
              Dış ticaret haddi: gıda ihracatının birim değeri ÷ ithalatınki (2015=100); 100'ün altı, ithal edilen gıdanın göreli olarak pahalandığını gösterir.
            </p>
          </section>
        )}

        {/* ─── Kapsam ──────────────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-bold text-[var(--tv-metin,#1d1d1f)]">Pro'da neler var</h2>
          <p className="mb-5 text-sm text-[var(--tv-metin-ikincil,#5b6159)]">
            60 sayfa, 8 bölüm, iki kapsam: Türkiye ve Dünya.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KATEGORILER.map(({ ad, ikon: Ikon, ozet }) => (
              <div
                key={ad}
                className="rounded-2xl border border-[var(--tv-cizgi-ince,rgba(0,0,0,.1))] bg-[var(--tv-kart,#fff)] p-4"
              >
                <Ikon size={18} aria-hidden="true" className="text-[var(--tv-vurgu,#16a34a)]" />
                <div className="mt-2 text-sm font-semibold text-[var(--tv-metin,#1d1d1f)]">{ad}</div>
                <div className="mt-1 text-xs leading-relaxed text-[var(--tv-metin-ikincil,#5b6159)]">{ozet}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Fiyat ve giriş ──────────────────────────────────────────── */}
        {satisGoster && (
          <section className="rounded-2xl border border-[var(--tv-cizgi-ince,rgba(0,0,0,.1))] bg-[var(--tv-kart,#fff)] p-6">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <h2 className="text-xl font-bold text-[var(--tv-metin,#1d1d1f)]">Pro aboneliği</h2>
                {fiyatVar ? (
                  <p className="mt-2 text-[15px] text-[var(--tv-metin-ikincil,#5b6159)]">
                    Yıllık <b className="text-[var(--tv-metin,#1d1d1f)]">{yillik.toLocaleString('tr-TR')} ₺</b>
                    {Number.isFinite(aylik) && aylik > 0 && <> · aylık {aylik.toLocaleString('tr-TR')} ₺</>}
                    {Number.isFinite(deneme) && deneme > 0 && <> · {deneme} gün ücretsiz deneme</>}
                  </p>
                ) : (
                  <p className="mt-2 text-[15px] text-[var(--tv-metin-ikincil,#5b6159)]">
                    Fiyatlar hazırlanıyor.
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--tv-metin-ikincil,#5b6159)]">
                  Ücretsiz bölümlerin tamamı abonelikten bağımsız olarak açık kalır.
                </p>
              </div>
              <Link
                to="/tarpovizyon/abonelik"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-[var(--tv-vurgu,#16a34a)]
                           px-6 text-sm font-semibold text-white no-underline transition-transform
                           hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-[var(--tv-vurgu,#16a34a)] focus-visible:ring-offset-2"
              >
                Aboneliğe göz at <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}
      </div>

      <VitrinFooter />
    </div>
  );
}
