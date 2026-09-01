import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUp, ArrowDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';

import {
  fetchCommodities,
  fetchCommodityHistory,
  type Aralik,
} from '../mobile/services/commodities';
import { YearlyChart } from '../tarpovizyon-basic/charts/YearlyChart';
import { VitrinHeader } from '../components/vitrin/VitrinHeader';
import { VitrinFooter } from '../components/vitrin/VitrinFooter';

/**
 * Emtia detayı — tarih serisi (web).
 *
 * Piyasa listesi webde vardı ama kartlar TIKLANMIYORDU; mobilde karta
 * dokununca açılan tarih serisi grafiği webde hiç yoktu. Bu sayfa o eksiği
 * kapatıyor ve mobil sayfayla AYNI servisi, AYNI aralıkları ve AYNI grafik
 * bileşenini kullanıyor.
 *
 * ─── USX TUZAĞI, YİNE ───────────────────────────────────────────────────────
 * `sentKaynak` bayrağı sorgu anahtarına DA giriyor. Girmezse React Query,
 * ölçek bayrağı değiştiğinde bile eski (100 kat yanlış) seriyi önbellekten
 * verir — bu daha önce yaşandı.
 */

const ARALIKLAR: { id: Aralik; label: string }[] = [
  { id: '1mo', label: '1 Ay' },
  { id: '3mo', label: '3 Ay' },
  { id: '6mo', label: '6 Ay' },
  { id: '1y', label: '1 Yıl' },
  { id: 'max', label: 'Tümü' },
];

/* Aralığa göre etiket: bir aylık seride yıl gereksiz, 26 yıllıkta gün okunmaz. */
function etiketle(t: number, aralik: Aralik): string {
  const d = new Date(t * 1000);
  if (aralik === 'max' || aralik === '1y') {
    return d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

const sayi = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function PiyasaDetayPage() {
  const { sembol = '' } = useParams();
  const navigate = useNavigate();
  const [aralik, setAralik] = useState<Aralik>('6mo');

  const { data: quotes } = useQuery({
    queryKey: ['piyasa-web'],
    queryFn: fetchCommodities,
    staleTime: 5 * 60 * 1000,
  });
  const quote = quotes?.find((q) => q.symbol === sembol);
  const sentKaynak = quote?.sentKaynak ?? false;

  const { data: gecmis, isLoading, isError, refetch } = useQuery({
    queryKey: ['commodity-history-web', sembol, aralik, sentKaynak],
    queryFn: () => fetchCommodityHistory(sembol, aralik, sentKaynak),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(sembol) && Boolean(quote),
  });

  // `c` kapanış fiyatı (FiyatNoktasi.t = unix saniye, .c = kapanış).
  const veri = (gecmis ?? []).map((n) => ({ tarih: etiketle(n.t, aralik), fiyat: n.c }));

  const yon = !quote ? 'sabit' : quote.changePercent > 0 ? 'arti' : quote.changePercent < 0 ? 'eksi' : 'sabit';
  const renk = yon === 'arti' ? '#15803d' : yon === 'eksi' ? '#b91c1c' : 'var(--tv-ikincil)';
  const Ikon = yon === 'arti' ? ArrowUp : yon === 'eksi' ? ArrowDown : Minus;

  return (
    <div className="min-h-screen bg-[var(--tv-zemin)] text-[var(--tv-murekkep)] antialiased">
      <VitrinHeader />

      <main className="mx-auto max-w-[980px] px-5 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/piyasa')}
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-[14px] font-medium text-[var(--tv-vurgu)] hover:underline"
        >
          <ArrowLeft size={16} /> Piyasa
        </button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-semibold tracking-[-0.02em]">
              {quote?.name ?? sembol}
            </h1>
            <p className="mt-1 text-[15px] text-[var(--tv-ikincil)]">{quote?.unit}</p>
          </div>
          {quote && (
            <div className="text-right tabular-nums">
              <div className="text-[2.2rem] font-semibold leading-none tracking-[-0.03em]">
                {sayi(quote.price)}
              </div>
              <div
                className="mt-1 flex items-center justify-end gap-1 text-[15px] font-medium"
                style={{ color: renk }}
              >
                <Ikon size={15} strokeWidth={2.6} aria-hidden="true" />
                {sayi(Math.abs(quote.change))} ({sayi(Math.abs(quote.changePercent))}%)
              </div>
            </div>
          )}
        </div>

        {/* Aralık seçici */}
        <div className="mt-7 flex flex-wrap gap-1.5" role="group" aria-label="Zaman aralığı">
          {ARALIKLAR.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAralik(a.id)}
              aria-pressed={aralik === a.id}
              className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium transition-colors ${
                aralik === a.id
                  ? 'bg-[var(--tv-vurgu)] text-[var(--tv-vurgu-ust)]'
                  : 'border border-[var(--tv-cizgi)] text-[var(--tv-murekkep)] hover:bg-[var(--tv-vurgu-sis)]'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[18px] border border-[var(--tv-cizgi-ince)] bg-[var(--tv-kart)] p-5 shadow-[var(--tv-golge)]">
          {isLoading && <div className="h-[320px] animate-pulse rounded-[12px] bg-[var(--tv-zemin-2)]" />}

          {isError && (
            <div className="flex flex-col items-start gap-3 py-8">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-[#8a6d1f]" />
                <p className="text-[15px] text-[var(--tv-murekkep)]">Geçmiş veri alınamadı.</p>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--tv-cizgi)] px-4 text-[14px] font-medium hover:bg-[var(--tv-vurgu-sis)]"
              >
                <RefreshCw size={15} /> Tekrar dene
              </button>
            </div>
          )}

          {!isLoading && !isError && veri.length > 1 && (
            /*
             * `yDomain="auto"`: emtia fiyatları dar bantta gezinir. Sıfırdan
             * başlayan eksen tüm hareketi ince bir şeride indirip grafiği
             * anlamsız kılardı.
             */
            <YearlyChart
              data={veri}
              xKey="tarih"
              series={[{ key: 'fiyat', label: quote?.name ?? 'Fiyat', type: 'line' }]}
              yDomain="auto"
            />
          )}

          {!isLoading && !isError && veri.length <= 1 && (
            <p className="py-8 text-center text-[15px] text-[var(--tv-ikincil)]">
              Bu aralık için yeterli veri yok.
            </p>
          )}
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-[var(--tv-ikincil)]">
          Kaynak: Yahoo Finance · 15 dakika gecikmeli olabilir. Yatırım tavsiyesi değildir.
        </p>
      </main>

      <VitrinFooter />
    </div>
  );
}
