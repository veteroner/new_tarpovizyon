import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCommodities, type CommodityQuote } from '../mobile/services/commodities';
import '../styles/PiyasaSeridi.css';

/**
 * Piyasa şeridi — kapsam giriş sayfasının üstünde canlı emtia fiyatları.
 *
 * ─── NEDEN AYRI BİÇİM ───────────────────────────────────────────────────────
 * Sayfadaki her şey YILLIK veri: TÜİK yılda bir yayımlıyor, kartlar bölüm
 * gösteriyor. Emtia ise gün içinde değişiyor. Aynı kart biçimini kullanmak
 * "bu da yılda bir güncelleniyor" izlenimi verirdi; bu yüzden ayrı, yatay,
 * canlı göstergeli bir şerit.
 *
 * ─── HATA SESSİZ ────────────────────────────────────────────────────────────
 * Veri üçüncü taraftan (Yahoo) geliyor ve düşebiliyor. Giriş sayfasının işi
 * GEZİNME; borsa kapalı ya da uç yanıt vermiyor diye sayfanın tepesinde
 * kırmızı bir hata kutusu durmamalı. Hata veya boş yanıtta şerit hiç
 * çizilmiyor, sayfanın kalanı çalışmaya devam ediyor.
 *
 * ─── FİYAT BİÇİMLENDİRME ────────────────────────────────────────────────────
 * `fetchCommodities` fiyatı SERVİS KATMANINDA normalleştiriyor (USX/sent
 * kaynaklar 100'e bölünüyor). Burada ek bir dönüşüm YOK — yapılsaydı aynı
 * emtia şeritte ve /piyasa sayfasında farklı sayı gösterirdi.
 */

/**
 * Şeritte gösterilecekler. Tarımı doğrudan ilgilendiren, herkesin tanıdığı
 * altı sembol; tam liste /piyasa sayfasında. Yanıtta olmayan sembol atlanıyor.
 */
const SERIT = ['ZW=F', 'ZC=F', 'ZS=F', 'LE=F', 'CT=F', 'SB=F'];

const sayi = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const yuzde = (n: number) =>
  `${n >= 0 ? '▲' : '▼'} ${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(Math.abs(n))}%`;

export function PiyasaSeridi() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['commodities'],           // /piyasa ile AYNI anahtar: iki yerde
    queryFn: fetchCommodities,           // aynı veri iki kez çekilmesin.
    staleTime: 5 * 60 * 1000,
  });

  /* Yükleniyorken iskelet: şerit sonradan belirip altındaki ızgarayı
     aşağı itmesin (düzen kayması). */
  if (isLoading) {
    return (
      <div className="ps ps-iskelet" aria-hidden="true">
        {SERIT.map((s) => <div key={s} className="ps-oge ps-bos" />)}
      </div>
    );
  }

  if (isError || !data?.length) return null;

  const gosterilen = SERIT
    .map((s) => data.find((q: CommodityQuote) => q.symbol === s))
    .filter((q): q is CommodityQuote => Boolean(q));

  if (!gosterilen.length) return null;

  return (
    <section className="ps-kap" aria-label="Piyasa">
      <div className="ps-bas">
        <h2>Piyasa</h2>
        <span className="ps-canli"><span className="ps-nokta" aria-hidden="true" />canlı</span>
        <button type="button" className="ps-tumu" onClick={() => navigate('/piyasa')}>
          Tümü
        </button>
      </div>
      <div className="ps">
        {gosterilen.map((q) => (
          <button
            key={q.symbol}
            type="button"
            className="ps-oge"
            onClick={() => navigate(`/piyasa/${encodeURIComponent(q.symbol)}`)}
            aria-label={`${q.name}: ${sayi(q.price)} ${q.unit}, ${yuzde(q.changePercent)}`}
          >
            <span className="ps-ad">{q.name}</span>
            <span className="ps-fiyat">{sayi(q.price)}</span>
            <span className="ps-birim">{q.unit}</span>
            {/* Yön hem renkle hem okla: renk tek başına bilgi taşımasın. */}
            <span className={`ps-delta ${q.changePercent >= 0 ? 'artis' : 'azalis'}`}>
              {yuzde(q.changePercent)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
