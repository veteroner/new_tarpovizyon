import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  visibleMenu, BASIC_MENU, KAPSAM_ADI, type Kapsam, type MenuCategory,
} from '../components/nav/menu';
import { PiyasaSeridi } from '../components/PiyasaSeridi';
import '../styles/HomePage.css';

/**
 * Kapsam giriş sayfası — kırılımın 0. basamağı.
 *
 * ─── NEDEN YENİDEN YAZILDI ──────────────────────────────────────────────────
 * Eskiden kapsam başına ELLE YAZILMIŞ 5 kart vardı ve üç sorunu vardı:
 *
 *   1. Menüden kopuktu. Menüye eklenen bölüm burada görünmüyordu; listeler
 *      zamanla birbirinden ayrıldı.
 *   2. Kart doğrudan bir SAYFAYA gidiyordu ("Bitkisel Üretim" → world/production),
 *      yani bölüm basamağı atlanıyor ve kullanıcı bölümün içinde başka ne
 *      olduğunu hiç görmüyordu.
 *   3. Basic'ten gelen 84 pano buradan HİÇ görünmüyordu — uygulamanın en
 *      büyük sayfa kümesi giriş ekranında yoktu.
 *
 * Artık kartlar `visibleMenu(kapsam)` ve `BASIC_MENU`'den türüyor, bölüm
 * sayfasına gidiyor ve sayfa sayısını gösteriyor. Menüye eklenen her bölüm
 * burada kendiliğinden beliriyor.
 */

/** Kategori kimliğinden şerit rengine — BolumPage ile aynı eşleme. */
const RENK: Record<string, string> = {
  hayvansal: 'var(--tv-d1)',
  bitkisel: 'var(--tv-d3)',
  'fiyat-ekonomi': 'var(--tv-d2)',
  'dis-ticaret': 'var(--tv-d2)',
  'il-bazinda': 'var(--tv-d4)',
  'kaynak-cevre': 'var(--tv-d4)',
  'genel-bakis': 'var(--tv-vurgu)',
  araclar: 'var(--tv-vurgu)',
  'basic-0': 'var(--tv-d2)',
  'basic-1': 'var(--tv-d1)',
  'basic-2': 'var(--tv-d3)',
  'basic-3': 'var(--tv-d4)',
};

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const kapsam: Kapsam =
    location.pathname.startsWith('/tarpovizyon/world') ? 'world' : 'turkey';

  const bolumler = useMemo(() => visibleMenu(kapsam), [kapsam]);
  const basicToplam = useMemo(
    () => BASIC_MENU.reduce((a, k) => a + k.items.length, 0), [],
  );

  const kart = (k: MenuCategory, sayi: number) => {
    const Icon = k.icon;
    const renk = RENK[k.id] ?? 'var(--tv-vurgu)';
    return (
      <button
        key={k.id}
        type="button"
        className="ap-kart"
        style={{ ['--kimlik' as string]: renk }}
        onClick={() => navigate(`/tarpovizyon/${kapsam}/bolum/${k.id}`)}
      >
        <span className="ap-ikon" style={{ color: renk }} aria-hidden="true">
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <span className="ap-sayac">{sayi} sayfa</span>
        <h2>{k.title}</h2>
        {/* Bölümün içinde ne olduğunu kart üzerinden göster: kullanıcı
            girmeden önce doğru yeri seçebilsin. */}
        <p className="ap-ornek">
          {k.items.slice(0, 3).map((i) => i.label).join(' · ')}
          {k.items.length > 3 ? ' …' : ''}
        </p>
        <ChevronRight size={17} className="ap-ok" aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="ap">
      <header className="ap-bas">
        <p className="ap-ustyazi">{KAPSAM_ADI[kapsam]}</p>
        <h1>{kapsam === 'world' ? 'Dünya Verileri' : 'Türkiye Verileri'}</h1>
        <p className="ap-kaynak">
          {kapsam === 'world'
            ? 'FAO — 205 ülke, üretim, kaynak ve gıda dengesi'
            : 'TÜİK — üretim, fiyat, dış ticaret ve il bazında veriler'}
        </p>
      </header>

      {/*
        * Piyasa: sayfadaki tek GÜN İÇİNDE değişen veri. Bölüm kartlarının
        * üstünde, çünkü "bugün ne oldu" sorusu "nereye gideyim"den önce
        * geliyor. Hata veya boş yanıtta kendini hiç çizmiyor.
        */}
      <PiyasaSeridi />

      <section>
        <h2 className="ap-grup">Bölümler</h2>
        <div className="ap-izgara">
          {bolumler.map((k) => kart(k, k.items.length))}
        </div>
      </section>

      {/*
        * Basic'ten gelen panolar. Ayrı grup, çünkü ayrı bir korpus: kapsamsız
        * (hem Türkiye hem Dünya sayfaları içeriyorlar) ve şablonları farklı.
        * Aynı ızgaraya karıştırmak "Bitkisel Üretim" adlı iki kartı yan yana
        * getirirdi — biri menüden biri Basic'ten.
        */}
      <section className="ap-basic">
        <h2 className="ap-grup">
          Sektör Panoları
          <span className="ap-grup-sayi">{basicToplam} pano · 4 kategori</span>
        </h2>
        <div className="ap-izgara">
          {BASIC_MENU.map((k) => kart(k, k.items.length))}
        </div>
      </section>
    </div>
  );
}
