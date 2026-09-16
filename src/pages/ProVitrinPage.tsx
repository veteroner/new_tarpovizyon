import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Globe2, Wheat, Beef, Ship, MapPin, Leaf, Wrench, Activity } from 'lucide-react';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';
import { VeriKarti } from '../components/vitrin/VeriKarti';
import type { Kart } from '../components/vitrin/vitrinVerisi';
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
 * ─── KARTLAR: ÜRETİCİYE KALAN PAY ───────────────────────────────────────────
 * Pro'nun ayırt edici sorusu "ne oldu" değil "neden": fiyat ile maliyet
 * arasındaki makas ve yemin ürünü ne kadar satın aldığı (parite). Kartlar bu
 * yüzden kârlılık ve pariteyi, çiğ süt ve kırmızı et için yan yana veriyor.
 *
 * Her kartın altında DÖNEM yazıyor ("Eyl 2026"): bu bir "şu an" iddiası değil,
 * tarihi belli bir ölçüm. Eskiden maliyet–fiyat tablolarından hiç sayı
 * gösterilmiyordu çünkü son iki dönem birebir kopyaydı ve kârlılık sütunu 14
 * ay donmuştu; Eylül 2026'da ikisi de düzeltildi ve maliyet artık panelde
 * girdilerden hesaplanıyor.
 *
 * Kanatlı ve yumurta BİLEREK yok: o tabloların maliyet kaynağı kesildi, son
 * dönemleri taşıma (bkz. hafıza notu "kanatlı fiyat-maliyet kaynağı yok").
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
type SutSatir = {
  tarih: string; uretim_maliyeti_tl_lt: number | null; usk_tavsiye_fiyat_tl_lt: number | null;
  karlilik: number | null; sut_yem_paritesi: number | null;
};
type EtSatir = {
  tarih: string; karlilik: number | null; karkas_paritesi: number | null;
  kuzu_karkas_fiyati_tl_kg: number | null;
};

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
/** Kıvılcım çizgisi için son 24 ay. */
const SERI_AY = 24;

/**
 * Tablodan kart üretir: son dolu değer + dönemi + son 24 ayın serisi.
 * Değer yoksa kart HİÇ üretilmiyor — boş bir "—" kartı, olmayan veriyi varmış
 * gibi gösterirdi.
 */
function kartUret<T extends { tarih: string }>(
  satirlar: T[], alan: keyof T,
  o: { id: string; etiket: string; birim: string; yol: string; yuzde?: boolean; basamak?: number },
): Kart | null {
  const dolu = [...satirlar]
    .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)))
    .filter((r) => typeof r[alan] === 'number' && Number.isFinite(r[alan] as number));
  const son = dolu.at(-1);
  if (!son) return null;
  const m = String(son.tarih).match(/^(\d{4})-(\d{2})/);
  const deger = son[alan] as number;
  return {
    id: o.id,
    etiket: o.etiket,
    deger: o.basamak != null ? Number(deger.toFixed(o.basamak)) : deger,
    birim: o.birim,
    alt: m ? `${AY_KISA[Number(m[2]) - 1]} ${m[1]}` : '',
    seri: dolu.slice(-SERI_AY).map((r) => r[alan] as number),
    yol: o.yol,
    yuzde: o.yuzde,
  };
}

const sayi = (v: number | null | undefined, basamak = 1) =>
  (v == null ? '—' : v.toLocaleString('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak }));

export default function ProVitrinPage() {
  const [tufe, setTufe] = useState<TufeSatir[]>([]);
  const [sut, setSut] = useState<SutSatir[]>([]);
  const [et, setEt] = useState<EtSatir[]>([]);
  const [ayarlar, setAyarlar] = useState<Ayarlar>({});

  useEffect(() => {
    let iptal = false;
    void (async () => {
      /*
       * Üç istek PARALEL: sıralı yapmak sayfayı üç kat yavaşlatırdı ve
       * aralarında bağımlılık yok. Biri düşerse diğerleri çiziliyor —
       * `allSettled`, çünkü fiyat okunamazsa grafik yine gösterilmeli.
       */
      const [t, s, e, a] = await Promise.allSettled([
        fetch(`${API}/api/makro/tufe-aylik?limit=500`).then((r) => r.json()),
        fetch(`${API}/api/cig-sut/ekonomik-gostergeler?limit=500`).then((r) => r.json()),
        /* Korumalı listede DEĞİL — duvar açıkken de anonim ziyaretçiye çiziliyor. */
        fetch(`${API}/api/kirmizi-et/ekonomik-gostergeler?limit=500`).then((r) => r.json()),
        ayarOku(),
      ]);
      if (iptal) return;
      if (t.status === 'fulfilled') setTufe((t.value?.data ?? []) as TufeSatir[]);
      if (s.status === 'fulfilled') setSut((s.value?.data ?? []) as SutSatir[]);
      if (e.status === 'fulfilled') setEt((e.value?.data ?? []) as EtSatir[]);
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

  /** İki alan, her birinde üç kart. Değeri olmayan kart düşüyor. */
  const kartGruplari = useMemo(() => [
    {
      ad: 'Çiğ süt', renk: 'var(--tv-d3)',
      kartlar: [
        kartUret(sut, 'karlilik', { id: 'sut-kar', etiket: 'Üretici kârlılığı', birim: '', yol: '/tarpovizyon/turkey/milk', yuzde: true }),
        kartUret(sut, 'sut_yem_paritesi', { id: 'sut-par', etiket: 'Süt / yem paritesi', birim: 'kg yem / lt', yol: '/tarpovizyon/turkey/milk', basamak: 2 }),
        kartUret(sut, 'uretim_maliyeti_tl_lt', { id: 'sut-mal', etiket: 'Üretim maliyeti', birim: '₺/lt', yol: '/tarpovizyon/turkey/milk', basamak: 2 }),
      ],
    },
    {
      ad: 'Kırmızı et', renk: 'var(--tv-d2)',
      kartlar: [
        kartUret(et, 'karlilik', { id: 'et-kar', etiket: 'Besici kârlılığı', birim: '', yol: '/tarpovizyon/turkey/red-meat', yuzde: true }),
        kartUret(et, 'karkas_paritesi', { id: 'et-par', etiket: 'Karkas / yem paritesi', birim: 'kg yem / kg', yol: '/tarpovizyon/turkey/red-meat', basamak: 1 }),
        kartUret(et, 'kuzu_karkas_fiyati_tl_kg', { id: 'et-kuzu', etiket: 'Kuzu karkas fiyatı', birim: '₺/kg', yol: '/tarpovizyon/turkey/red-meat', basamak: 2 }),
      ],
    },
  ].map((g) => ({ ...g, kartlar: g.kartlar.filter((k): k is Kart => k !== null) }))
    .filter((g) => g.kartlar.length > 0), [sut, et]);

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

        {/* ─── Üreticiye kalan pay — kartlar ─────────────────────────────── */}
        {kartGruplari.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-[var(--tv-metin,#1d1d1f)]">
                Üreticiye ne kalıyor
              </h2>
              <span className="text-xs text-[var(--tv-metin-ikincil,#5b6159)]">
                Ücretsiz veriden örnek · son {SERI_AY} ay
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
              Parite, bir birim ürünün kaç kg yem satın aldığıdır. Pro'da bunlar yem fiyatı ve döviz kuruyla birlikte okunuyor.
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
