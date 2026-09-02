import { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  MENU, BASIC_MENU, itemPath, hasScope, KAPSAM_ADI, type Kapsam, type MenuCategory,
} from '../components/nav/menu';
import '../styles/BolumPage.css';

/**
 * Bölüm sayfası — kırılımın 1. basamağı.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Kırıntı `Kapsam › Kategori › Sayfa` gösteriyordu ama ORTA SEGMENT DÜZ
 * METİNDİ: gidecek bir yer yoktu, çünkü kategori diye bir sayfa yoktu.
 * Kullanıcı bir bölümün içindekileri görmek için ya kenar menüsünü açmak
 * ya da tek tek sayfa gezmek zorundaydı.
 *
 * Bu sayfa o boşluğu dolduruyor: bir bölümün bu kapsamdaki bütün konuları,
 * tek ekranda, alt bölüm bağlamıyla birlikte.
 *
 * ─── KAPSAMDA OLMAYANLAR ────────────────────────────────────────────────────
 * Bir konunun her kapsamda karşılığı yok (ör. "Hayvan Stokları" yalnızca
 * Dünya'da). Bunlar GİZLENMİYOR, soluk gösterilip diğer kapsama götürüyor —
 * gizlemek "bu veri yok" izlenimi veriyordu, oysa var, sadece burada değil.
 */

/**
 * Kategori kimliğinden şerit rengine. Renk KATEGORİ KİMLİĞİ taşıyor, sıra
 * değil: aynı bölüm hangi listede olursa olsun aynı renkte.
 */
const RENK: Record<string, string> = {
  hayvansal: 'var(--tv-d1)',
  bitkisel: 'var(--tv-d3)',
  'fiyat-ekonomi': 'var(--tv-d2)',
  'dis-ticaret': 'var(--tv-d2)',
  'il-bazinda': 'var(--tv-d4)',
  'kaynak-cevre': 'var(--tv-d4)',
  'genel-bakis': 'var(--tv-vurgu)',
  araclar: 'var(--tv-vurgu)',
};

export default function BolumPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bolumId } = useParams<{ bolumId: string }>();

  const kapsam: Kapsam =
    location.pathname.startsWith('/tarpovizyon/world') ? 'world' : 'turkey';
  const digerKapsam: Kapsam = kapsam === 'world' ? 'turkey' : 'world';

  const kategori: MenuCategory | undefined = useMemo(
    () => [...MENU, ...BASIC_MENU].find((k) => k.id === bolumId),
    [bolumId],
  );

  if (!kategori) {
    return (
      <div className="bp">
        <p className="bp-yok">
          Bu bölüm bulunamadı. <button type="button" onClick={() => navigate(-1)}>Geri dön</button>
        </p>
      </div>
    );
  }

  const Icon = kategori.icon;
  const renk = RENK[kategori.id] ?? 'var(--tv-vurgu)';

  /* Bu kapsamda açılabilenler ve açılamayanlar ayrı ayrı. */
  const burada = kategori.items.filter((it) => hasScope(it, kapsam));
  const digerde = kategori.items.filter(
    (it) => !hasScope(it, kapsam) && hasScope(it, digerKapsam),
  );

  return (
    <div className="bp">
      <header className="bp-bas">
        <div className="bp-ustyazi" style={{ color: renk }}>
          <Icon size={15} aria-hidden="true" />
          {KAPSAM_ADI[kapsam]}
        </div>
        <h1>{kategori.title}</h1>
        <p className="bp-sayi">
          {burada.length} konu
          {digerde.length > 0 && ` · ${digerde.length} tanesi yalnızca ${KAPSAM_ADI[digerKapsam]} kapsamında`}
        </p>
      </header>

      <div className="bp-izgara">
        {burada.map((it) => {
          const yol = itemPath(it, kapsam)!;
          return (
            <button
              key={yol}
              type="button"
              className="bp-kart"
              style={{ ['--kimlik' as string]: renk }}
              onClick={() => navigate(yol)}
            >
              <span className="bp-konu" style={{ color: renk }}>
                {it.bolum && it.bolum !== kategori.title ? it.bolum : 'Konu'}
              </span>
              <h2>{it.label}</h2>
              {/* Her iki kapsamda da varsa kullanıcı bilsin: aynı konunun
                  diğer karşılığına kapsam anahtarıyla geçebilir. */}
              {hasScope(it, digerKapsam) && (
                <span className="bp-ikisi">{KAPSAM_ADI[digerKapsam]} karşılığı da var</span>
              )}
              <ChevronRight size={17} className="bp-ok" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {digerde.length > 0 && (
        <section className="bp-diger">
          <h2 className="bp-diger-bas">
            Yalnızca {KAPSAM_ADI[digerKapsam]} kapsamında
          </h2>
          <div className="bp-izgara">
            {digerde.map((it) => {
              const yol = itemPath(it, digerKapsam)!;
              return (
                <button
                  key={yol}
                  type="button"
                  className="bp-kart soluk"
                  style={{ ['--kimlik' as string]: renk }}
                  onClick={() => navigate(yol)}
                  title={`${KAPSAM_ADI[digerKapsam]} kapsamında açılır`}
                >
                  <span className="bp-konu">{KAPSAM_ADI[digerKapsam]}</span>
                  <h2>{it.label}</h2>
                  <ChevronRight size={17} className="bp-ok" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
