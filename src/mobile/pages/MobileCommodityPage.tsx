import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

import { fetchCommodities, fetchCommodityHistory, type Aralik } from '../services/commodities';
import { NavBar, Segmented } from '../components/ui/IosList';
import { YearlyChart } from '../../tarpovizyon-basic/charts/YearlyChart';
import '../../tarpovizyon-basic/tarpovizyon-basic.css';

/**
 * Emtia fiyat detayı — Piyasa listesinden bir ürüne dokununca açılıyor.
 *
 * ─── NEDEN AYRI SAYFA ───────────────────────────────────────────────────────
 * Grafiği listenin içinde açmak da mümkündü ama Piyasa ~40 üründen oluşuyor;
 * satır içine grafik koymak listeyi okunamaz hâle getirirdi. Ayrı sayfa ayrıca
 * derin bağlantılanabiliyor (/m/market/ZW=F) — bildirimden ya da paylaşılan
 * bir bağlantıdan doğrudan buraya gelinebilir.
 *
 * ─── ARALIK SEÇİMİ ──────────────────────────────────────────────────────────
 * Varsayılan 6 ay: 1 aylık seri mevsimsel bir emtiada gürültüden ibaret,
 * "max" ise 26 yılı tek ekrana sıkıştırıp son hareketleri görünmez kılıyor.
 * Altı ay, üreticinin karar ufkuna (ekim/hasat/satış) en yakın pencere.
 */

/* `Segmented` seçenekleri `id` alanıyla bekliyor (bkz. ui/IosList). */
const ARALIKLAR = [
  { id: '1mo' as const, label: '1 Ay' },
  { id: '3mo' as const, label: '3 Ay' },
  { id: '6mo' as const, label: '6 Ay' },
  { id: '1y' as const, label: '1 Yıl' },
  { id: 'max' as const, label: 'Tümü' },
] as const;

/*
 * X ekseni etiketi aralığa göre değişiyor: bir aylık seride yıl yazmak
 * gereksiz, 26 yıllık seride gün yazmak okunmaz. Etiket burada üretiliyor
 * çünkü grafik bileşeni x değerini olduğu gibi basıyor.
 */
function etiketle(t: number, aralik: Aralik): string {
  const d = new Date(t * 1000);
  if (aralik === 'max' || aralik === '1y') {
    return d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function MobileCommodityPage() {
  const { sembol = '' } = useParams();
  const navigate = useNavigate();
  const [aralik, setAralik] = useState<Aralik>('6mo');

  /*
   * Ürünün adı/birimi liste ucunda; ayrı bir "tek ürün" ucu yok. Liste zaten
   * React Query önbelleğinde (Piyasa sayfasından geliniyor), o yüzden bu
   * genelde ağ isteği bile doğurmuyor — aynı queryKey paylaşılıyor.
   */
  const { data: quotes } = useQuery({
    queryKey: ['commodities'],
    queryFn: fetchCommodities,
    staleTime: 5 * 60 * 1000,
  });
  const quote = quotes?.find((q) => q.symbol === sembol);

  /*
   * `sentKaynak` queryKey'DE olmalı: quote listesi gelmeden grafik sorgusu
   * çalışırsa bayrak false olur ve sent değerler ham kaydedilir; quote sonradan
   * gelince anahtar değişmediği için önbellekteki 100 kat büyük seri kullanılmaya
   * devam ederdi. Ayrıca quote gelene kadar sorgu bekletiliyor.
   */
  const sentKaynak = quote?.sentKaynak ?? false;
  const { data: gecmis, isLoading, isError, refetch } = useQuery({
    queryKey: ['commodity-history', sembol, aralik, sentKaynak],
    queryFn: () => fetchCommodityHistory(sembol, aralik, sentKaynak),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(sembol) && Boolean(quote),
    retry: 1,
  });

  const veri = (gecmis ?? []).map((p) => ({
    tarih: etiketle(p.t, aralik),
    fiyat: p.c,
  }));

  const artti = (quote?.changePercent ?? 0) >= 0;

  return (
    <>
      <NavBar
        title={quote?.name ?? sembol}
        subtitle={quote ? `${quote.unit} · ${quote.currency}` : 'Emtia fiyatı'}
        onBack={() => navigate(-1)}
      />

      <div className="ios-scroll">
        {quote && (
          <div className="ios-fiyat-basligi">
            <span className="ios-fiyat-basligi__deger">{quote.price.toFixed(2)}</span>
            <span className={artti ? 'ios-up' : 'ios-down'}>
              {/* Ok, renkten bağımsız olarak yönü söylüyor (renk körlüğü). */}
              <span aria-hidden="true">{artti ? '▲' : '▼'}</span>
              {' '}
              {Math.abs(quote.change).toFixed(2)} (%{Math.abs(quote.changePercent).toFixed(2)})
            </span>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <Segmented<Aralik> options={ARALIKLAR} value={aralik} onChange={setAralik} label="Zaman aralığı" />
        </div>

        {isLoading && <p className="tvb-status">Grafik yükleniyor…</p>}

        {isError && !isLoading && (
          <div className="ios-empty">
            <AlertCircle size={26} aria-hidden="true" />
            <p>Grafik verisi alınamadı.</p>
            <button type="button" className="ios-btn" onClick={() => refetch()}>
              Tekrar dene
            </button>
          </div>
        )}

        {!isLoading && !isError && veri.length > 1 && (
          <div className="tvb-section">
            {/*
              * `yDomain="auto"`: emtia fiyatları dar bantta gezinir (buğday
              * 640–700 sent gibi). Sıfırdan başlayan eksen tüm hareketi ince
              * bir şerit hâline getirip grafiği anlamsız kılardı.
              */}
            <YearlyChart
              data={veri}
              xKey="tarih"
              series={[{ key: 'fiyat', label: quote?.name ?? 'Fiyat', type: 'line' }]}
              yDomain="auto"
            />
          </div>
        )}

        {!isLoading && !isError && veri.length <= 1 && (
          <p className="tvb-status">Bu aralık için yeterli veri yok.</p>
        )}

        <p className="ios-footnote">
          Kaynak: Yahoo Finance · 15 dakika gecikmeli. Yatırım tavsiyesi değildir.
        </p>
      </div>
    </>
  );
}
