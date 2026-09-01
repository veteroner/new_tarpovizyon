import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

import { fetchCommodities, type CommodityQuote } from '../mobile/services/commodities';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';

/**
 * Piyasa — canlı emtia fiyatları (web).
 *
 * Bu ekran mobil uygulamada vardı, webde YOKTU. Aynı servisi
 * (`mobile/services/commodities`) kullanıyor — veri katmanı platformdan
 * bağımsız olduğu için tek satır iş mantığı kopyalanmadı; yalnızca sunum
 * masaüstüne uygun hâle getirildi: iOS listesi yerine kategori ızgarası.
 *
 * ─── RENK TEK BAŞINA BİLGİ TAŞIMIYOR ────────────────────────────────────────
 * Yön hem OK İKONUYLA hem renkle gösteriliyor. Yalnız renk kullanmak
 * kırmızı-yeşil renk körlüğü olan okuyucu için yönü tamamen siliyor.
 *
 * ─── USX TUZAĞI ─────────────────────────────────────────────────────────────
 * Dönüşüm serviste yapılıyor (USX senttir, dolar değil — 100'e bölünür).
 * Burada tekrar bölmek 100 kat hataya yol açardı; servis `sentKaynak` ile
 * hangi kaydın çevrildiğini bildiriyor.
 */

const KATEGORI_ADI = {
  bitkisel: 'Bitkisel ürünler',
  hayvancilik: 'Hayvancılık',
  sut: 'Süt ürünleri',
  et_gida: 'Et ve gıda',
  enerji: 'Enerji',
  gubre: 'Gübre',
  orman: 'Orman ürünleri',
  metal: 'Metaller',
  doviz: 'Döviz',
} as const;

const sayi = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function Satir({ q }: { q: CommodityQuote }) {
  const yon = q.changePercent > 0 ? 'arti' : q.changePercent < 0 ? 'eksi' : 'sabit';
  const renk =
    yon === 'arti' ? '#15803d' : yon === 'eksi' ? '#b91c1c' : 'var(--tv-ikincil)';
  const Ikon = yon === 'arti' ? ArrowUp : yon === 'eksi' ? ArrowDown : Minus;

  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--tv-cizgi-ince)] py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium text-[var(--tv-murekkep)]">{q.name}</div>
        <div className="text-[12px] text-[var(--tv-ikincil)]">{q.unit}</div>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <div className="text-[17px] font-semibold text-[var(--tv-murekkep)]">{sayi(q.price)}</div>
        <div
          className="flex items-center justify-end gap-1 text-[12.5px] font-medium"
          style={{ color: renk }}
        >
          {/* Yön hem ikon hem renk — renk tek başına bilgi taşımıyor. */}
          <Ikon size={13} strokeWidth={2.6} aria-hidden="true" />
          {sayi(Math.abs(q.changePercent))}%
        </div>
      </div>
    </div>
  );
}

export default function PiyasaPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['piyasa-web'],
    queryFn: fetchCommodities,
    staleTime: 5 * 60 * 1000,
  });

  const gruplar = (Object.keys(KATEGORI_ADI) as Array<keyof typeof KATEGORI_ADI>)
    .map((kat) => ({ kat, items: (data ?? []).filter((q) => q.category === kat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-[var(--tv-zemin)] text-[var(--tv-murekkep)] antialiased">
      <VitrinHeader />

      <main className="mx-auto max-w-[1280px] px-5 py-12 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.75rem,3.6vw,2.5rem)] font-semibold tracking-[-0.02em]">
              Piyasa
            </h1>
            <p className="mt-2 max-w-[56ch] text-[19px] leading-relaxed text-[var(--tv-ikincil)]">
              Tarımı doğrudan ilgilendiren emtia fiyatları. Veriler üçüncü taraf
              sağlayıcıdan gelir, gecikmeli olabilir ve yatırım tavsiyesi değildir.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--tv-cizgi)] px-4 text-[14px] font-medium transition-colors hover:bg-[var(--tv-vurgu-sis)] disabled:opacity-50"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : undefined} />
            Yenile
          </button>
        </div>

        {isLoading && (
          /* İskelet: boş bir çerçeve yerine yer tutan kutular — sayfa
             yüklenirken zıplamıyor (CLS). */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[260px] animate-pulse rounded-[18px] border border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)]"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-3 rounded-[18px] border border-[#e8c87a] bg-[#fdf6e3] p-5">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-[#8a6d1f]" />
            <div>
              <p className="text-[15px] font-medium text-[#6b5416]">Fiyatlar alınamadı</p>
              <p className="mt-1 text-[14px] text-[#6b5416]">
                Bağlantı kurulamadı ya da sağlayıcı yanıt vermedi. Yenile düğmesiyle
                yeniden deneyebilirsiniz.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gruplar.map(({ kat, items }) => (
              <section
                key={kat}
                className="rounded-[18px] border border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)] p-5 shadow-[var(--tv-golge)]"
              >
                <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tv-ikincil)]">
                  {KATEGORI_ADI[kat]}
                </h2>
                {items.map((q) => (
                  <Satir key={q.symbol} q={q} />
                ))}
              </section>
            ))}
          </div>
        )}
      </main>

      <VitrinFooter />
    </div>
  );
}
