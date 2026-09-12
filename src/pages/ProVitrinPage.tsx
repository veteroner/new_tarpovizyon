import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Sparkles, ArrowRight, Globe2, Wheat, Beef, Ship, MapPin, Leaf, Wrench, Activity } from 'lucide-react';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';
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
 * ─── CANLI SAYI NEDEN ENFLASYONDAN ──────────────────────────────────────────
 * Başlıktaki sayı TÜFE/gıda serisinden: aylık yayımlanıyor ve gerçekten
 * hareket ediyor. Maliyet–fiyat tablolarından "şu an" cümlesi KURULMUYOR —
 * ölçüldü, son iki dönem birebir aynı, yani son satır taşınmış bir kopya.
 * Onları zaman serisi olarak göstermek dürüst; "bugün kâr şu" demek değil.
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
type SutSatir = { tarih: string; uretim_maliyeti_tl_lt: number | null; usk_tavsiye_fiyat_tl_lt: number | null };

const sayi = (v: number | null | undefined, basamak = 1) =>
  (v == null ? '—' : v.toLocaleString('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak }));

export default function ProVitrinPage() {
  const [tufe, setTufe] = useState<TufeSatir[]>([]);
  const [sut, setSut] = useState<SutSatir[]>([]);
  const [ayarlar, setAyarlar] = useState<Ayarlar>({});

  useEffect(() => {
    let iptal = false;
    void (async () => {
      /*
       * Üç istek PARALEL: sıralı yapmak sayfayı üç kat yavaşlatırdı ve
       * aralarında bağımlılık yok. Biri düşerse diğerleri çiziliyor —
       * `allSettled`, çünkü fiyat okunamazsa grafik yine gösterilmeli.
       */
      const [t, s, a] = await Promise.allSettled([
        fetch(`${API}/api/makro/tufe-aylik?limit=500`).then((r) => r.json()),
        fetch(`${API}/api/cig-sut/ekonomik-gostergeler?limit=500`).then((r) => r.json()),
        ayarOku(),
      ]);
      if (iptal) return;
      if (t.status === 'fulfilled') setTufe((t.value?.data ?? []) as TufeSatir[]);
      if (s.status === 'fulfilled') setSut((s.value?.data ?? []) as SutSatir[]);
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

  /** Çiğ süt maliyet–fiyat serisi, son 48 ay. */
  const sutSerisi = useMemo(() => [...sut]
    .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)))
    .slice(-48)
    .map((r) => ({
      donem: String(r.tarih).slice(0, 7),
      maliyet: r.uretim_maliyeti_tl_lt == null ? null : Number(r.uretim_maliyeti_tl_lt.toFixed(2)),
      fiyat: r.usk_tavsiye_fiyat_tl_lt == null ? null : Number(r.usk_tavsiye_fiyat_tl_lt.toFixed(2)),
    })), [sut]);

  /*
   * Eksen üst sınırı YUVARLANIYOR. Ham çarpımı vermek eksende
   * "27.500000000000004" gibi değerler basıyor (bu projede bir kez oldu).
   */
  const sutUst = useMemo(() => {
    const en = Math.max(0, ...sutSerisi.flatMap((d) => [d.maliyet ?? 0, d.fiyat ?? 0]));
    return en ? Math.ceil((en * 1.1) / 5) * 5 : 10;
  }, [sutSerisi]);

  const aylik = Number(ayarlar.fiyat_aylik);
  const yillik = Number(ayarlar.fiyat_yillik);
  const deneme = Number(ayarlar.deneme_gun);
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

        {/* ─── Canlı örnek grafik ──────────────────────────────────────── */}
        <section className="mb-12">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold text-[var(--tv-metin,#1d1d1f)]">
              Çiğ süt: üretim maliyeti ve tavsiye fiyatı
            </h2>
            <span className="text-xs text-[var(--tv-metin-ikincil,#5b6159)]">
              Ücretsiz veriden örnek · son 48 ay
            </span>
          </div>
          <div className="rounded-2xl border border-[var(--tv-cizgi-ince,rgba(0,0,0,.1))] bg-[var(--tv-kart,#fff)] p-3 pt-5">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={sutSerisi} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.08)" vertical={false} />
                  <XAxis
                    dataKey="donem"
                    tick={{ fontSize: 11 }}
                    /* 48 etiket sığmıyor: altıda biri gösteriliyor. */
                    interval={7}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={[0, sutUst]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => v.toLocaleString('tr-TR')}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v: number, ad: string) => [`${sayi(v, 2)} ₺/L`, ad]}
                    labelFormatter={(l: string) => l}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="maliyet" name="Üretim maliyeti"
                    stroke="#b45309" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="fiyat" name="USK tavsiye fiyatı"
                    stroke="#16a34a" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--tv-metin-ikincil,#5b6159)]">
            İki çizginin arası üreticiye kalan payı gösteriyor. Pro'da bu, yem
            fiyatı ve döviz kuru ile birlikte okunuyor; kırmızı et, beyaz et ve
            yumurta için de aynı hesap var.
          </p>
        </section>

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
