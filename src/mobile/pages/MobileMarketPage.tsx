import { yuzde } from '../../utils/sayi';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// ShoppingCart / Package, RAPORLAR boşaltılınca kullanımsız kaldı; Pro yayına
// alınıp dizi geri doldurulduğunda tekrar eklenecek.
import { RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';

import { fetchCommodities, type CommodityQuote } from '../services/commodities';
import { NavBar, ListGroup, ListRow } from '../components/ui/IosList';

/**
 * Piyasa — Yahoo Finance emtia fiyatları (15 dk gecikmeli).
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Her fiyat ayrı bir kenarlıklı kart, kartın içinde renkli daire, dairenin
 * içinde ok ikonu vardı: bir satır bilgi için üç kat kap. Dokuz kategori
 * başlığı emoji ile yazılıyordu (🌾🐄🥛…) — emoji ikon değil, platformdan
 * platforma başka çiziliyor ve ekran okuyucuda "buğday başağı" diye okunuyor.
 *
 * Şimdi fiyatlar gruplu listede: ad solda, fiyat ve değişim sağda. Yön oku
 * renkten bağımsız duruyor (renk körlüğü), sayılar tabular — sütun kaymıyor.
 */

/** Emoji kaldırıldı; başlık metni kategoriyi zaten söylüyor. */
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

/*
 * ─── RAPORLAR BU SÜRÜMDE GİZLİ ──────────────────────────────────────────────
 *
 * Üç rapor da `/tarpovizyon/turkey/*` adreslerine gidiyordu — yani YAYINLANMAMIŞ
 * Pro alanına. Araçları gizlerken (bkz. MobileHomePage `ARACLAR_ACIK`) burası
 * gözden kaçmıştı: mobil uygulama Pro'ya açık bir kapı bırakıyordu.
 *
 * Verileri de geride: `tuik_urundenge` son sütunu 2023/24, FAO balans 2023 —
 * Basic tarafı 2025-2026'da. Kullanıcı "raporlar neden bayat veri barındırıyor"
 * diye sorduğunda sebep buydu; sayfalar bayat değil, Pro'nun kendisi bayat.
 *
 * Pro yayına alındığında bu diziyi geri doldurmak yeterli — ikonlar ve alt
 * metinler korunsun diye tanım silinmedi, boşaltıldı.
 */
const RAPORLAR: {
  baslik: string;
  alt: string;
  icon: typeof TrendingUp;
  renk: string;
  yol: string;
}[] = [];

/** Fiyat + değişim, sağa yaslı iki satır. */
function Fiyat({ quote }: { quote: CommodityQuote }) {
  const artti = quote.changePercent >= 0;
  return (
    <span className="ios-value-stack">
      <span className="ios-value-main">{quote.price.toFixed(2)}</span>
      <span className={artti ? 'ios-up' : 'ios-down'}>
        {/* Ok renkten bağımsız anlam taşıyor. */}
        <span aria-hidden="true">{artti ? '▲' : '▼'}</span>
        {' '}{yuzde(Math.abs(quote.changePercent), 2)}
      </span>
    </span>
  );
}

export default function MobileMarketPage() {
  const navigate = useNavigate();

  const {
    data: quotes, isLoading, isError, refetch, dataUpdatedAt,
  } = useQuery({
    queryKey: ['commodities'],
    queryFn: fetchCommodities,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const gruplar = quotes
    ? (Object.keys(KATEGORI_ADI) as Array<keyof typeof KATEGORI_ADI>)
      .map((kat) => ({ kat, items: quotes.filter((q) => q.category === kat) }))
      .filter((g) => g.items.length > 0)
    : [];

  const saat = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      <NavBar
        title="Piyasa"
        subtitle={saat ? `Yahoo Finance · ${saat} · 15 dk gecikmeli` : 'Yahoo Finance · 15 dk gecikmeli'}
      />

      <div className="ios-scroll">
        <button
          type="button"
          className="ios-refresh"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'ios-spin' : undefined} aria-hidden="true" />
          {isLoading ? 'Güncelleniyor' : 'Yenile'}
        </button>

        {/* Yükleniyor — iskelet satırlar, boy sıçraması olmasın diye gerçek
            satır yüksekliğinde. */}
        {isLoading && (
          <ListGroup header="Uluslararası emtia">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ios-row" aria-hidden="true">
                <span className="ios-skeleton" style={{ width: '42%' }} />
              </div>
            ))}
          </ListGroup>
        )}

        {isError && !isLoading && (
          <div className="ios-empty">
            <AlertCircle size={26} aria-hidden="true" />
            <p>Fiyatlar alınamadı.</p>
            <button type="button" className="ios-btn" onClick={() => refetch()}>
              Tekrar dene
            </button>
          </div>
        )}

        {!isLoading && !isError && gruplar.map(({ kat, items }) => (
          <ListGroup key={kat} header={KATEGORI_ADI[kat]}>
            {items.map((q) => (
              /*
               * Satır artık tıklanabilir: ürünün fiyat grafiğini açıyor.
               * Chevron da geri geldi — dokunulabilir olduğunu gösteren
               * işaret o; `showChevron={false}` kalsaydı satır ölü görünürdü.
               */
              <ListRow
                key={q.symbol}
                title={q.name}
                subtitle={q.currency}
                value={<Fiyat quote={q} />}
                onClick={() => navigate(`/m/market/${encodeURIComponent(q.symbol)}`)}
              />
            ))}
          </ListGroup>
        ))}

        {RAPORLAR.length > 0 && (
          <ListGroup header="Raporlar">
            {RAPORLAR.map((r) => (
              <ListRow
                key={r.yol}
                icon={<r.icon size={16} strokeWidth={2.2} />}
                iconColor={r.renk}
                title={r.baslik}
                subtitle={r.alt}
                onClick={() => navigate(r.yol)}
              />
            ))}
          </ListGroup>
        )}
      </div>
    </>
  );
}
