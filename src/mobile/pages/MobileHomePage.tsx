import { useNavigate } from 'react-router-dom';
import {
  Sprout, Droplets, FlaskConical, CalendarDays, Calculator,
  TrendingUp, Beef, MapPinned,
} from 'lucide-react';
import { useWeather } from '../hooks/useApi';
import { useBugun } from '../hooks/useBugun';
import { BASIC_MENU } from '../../components/nav/menu';
import {
  NavBar, ListGroup, ListRow, TileRow, StatTile,
} from '../components/ui/IosList';

/**
 * Ana sayfa.
 *
 * ─── NEDEN YENİDEN DÜZENLENDİ ───────────────────────────────────────────────
 * TarpoVizyon Basic artık uygulamanın KENDİSİ. Eski ana sayfada "Veri kaynağı →
 * TarpoVizyon Basic" diye bir satır vardı; kullanıcı zaten onun içindeyken
 * kendini işaret eden bir bağlantıydı.
 *
 * Yeni yapı üç bölüm:
 *
 *   BUGÜN     — en taze üç sayı, doğrudan burada. Ana sayfa artık menü değil,
 *               pano: uygulamayı açan kişi önce "ne oldu"yu görüyor.
 *   BÖLÜMLER  — Basic'in dört ana grubu. Tek dokunuşla içeriğe giriyor.
 *   ARAÇLAR   — hesaplayıcılar. BU SÜRÜMDE GİZLİ, bir sonraki mağaza
 *               güncellemesine bırakıldı; `ARACLAR_ACIK` bayrağına bak.
 */

/*
 * Bölüm satırları BASIC_MENU'den türetiliyor, elle yazılmıyor: Basic'e yeni
 * bir grup eklendiğinde ana sayfada kendiliğinden beliriyor.
 *
 * Her satır grubun İLK sayfasına gidiyor; oradan kabuktaki sayfa seçicisiyle
 * grubun diğer sayfalarına geçiliyor.
 */
/* Sıra BASIC_MENU ile aynı: Makro, Hayvancılık, Bitkisel, İl Düzeyinde. */
const BOLUM_IKON = [TrendingUp, Beef, Sprout, MapPinned];

/*
 * ─── ARAÇLAR BU SÜRÜMDE GİZLİ ───────────────────────────────────────────────
 *
 * Araçlar bir sonraki mağaza güncellemesine bırakıldı. Tek yapılacak:
 * bu bayrağı `true` yapmak — dizi ve çizim kodu olduğu gibi duruyor,
 * silinmedi ki geri açmak tek satırlık iş olsun.
 *
 * KAPSAM: yalnızca bu ana sayfa listesi. Bilerek DOKUNULMADI:
 *   • Rotalar (`/rasyon`, `/hasat-tahmini` …) açık; adresi bilen açabiliyor.
 *     Pro sayfalarında uygulanan yöntemin aynısı.
 *   • Ayarlar'daki "Gizlilik politikası" ve "Kullanım şartları" bağlantıları
 *     `/rasyon/privacy` ve `/rasyon/terms` üzerinden gidiyor. Bunlar mağaza
 *     zorunluluğu; rota kapatılsaydı kırılırlardı.
 *   • Web ana sayfası (ProgramSelectionPage) araçları göstermeye devam ediyor;
 *     web sürümü mağaza takviminden bağımsız ilerliyor.
 *
 * Keşfet ve asistan zaten etkilenmiyor: onlar BASIC_MENU okuyor, o da yalnızca
 * veri sayfalarından üretiliyor — araçlar hiç girmiyordu.
 */
const ARACLAR_ACIK = false;

const ARACLAR = [
  { baslik: 'Rasyon', alt: 'Yem karması hesapla', icon: Calculator, renk: 'var(--ios-tint-deep)', yol: '/rasyon' },
  { baslik: 'Hasat tahmini', icon: Sprout, renk: 'var(--ios-tint)', yol: '/hasat-tahmini' },
  { baslik: 'Sulama planı', icon: Droplets, renk: 'var(--ios-blue)', yol: '/sulama-plan' },
  { baslik: 'Gübre hesabı', icon: FlaskConical, renk: 'var(--ios-orange)', yol: '/gubre-hesap' },
  { baslik: 'Tarım takvimi', icon: CalendarDays, renk: 'var(--ios-red)', yol: '/tarim-takvim' },
];

export default function MobileHomePage() {
  const navigate = useNavigate();
  // Şehir seçimi henüz ayarlarda yok; varsayılan Ankara.
  const { data: hava, isLoading: havaYukleniyor } = useWeather('Ankara');
  const { data: bugun = [], isLoading: bugunYukleniyor } = useBugun();

  const tarih = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', weekday: 'long',
  });

  const bolumler = BASIC_MENU.map((k, i) => ({
    baslik: k.title,
    alt: `${k.items.length} rapor`,
    icon: BOLUM_IKON[i % BOLUM_IKON.length],
    yol: k.items[0]?.any ?? '/m/explore',
  })).filter((b) => b.yol);

  return (
    <>
      <NavBar title="TarpoVizyon" subtitle={tarih} />

      <div className="ios-scroll">
        <div className="ios-group-header">Bugün</div>

        <TileRow>
          <StatTile
            label="Hava durumu"
            value={hava ? `${Math.round(hava.temp)}°` : '—'}
            /*
             * Hava alınamadığında "Yükleniyor" yazıp öylece kalıyordu; anahtar
             * eksikse ya da istek düşerse sonsuza kadar öyle duruyordu.
             * Artık yükleme ile başarısızlık ayrı.
             */
            sub={hava?.description ?? (havaYukleniyor ? 'Yükleniyor' : 'Ulaşılamadı')}
          />
          {bugun[0] && (
            <StatTile label={bugun[0].etiket} value={bugun[0].deger} sub={bugun[0].alt} />
          )}
        </TileRow>

        {bugun.length > 1 && (
          <ListGroup>
            {bugun.slice(1).map((b) => (
              <ListRow
                key={b.yol}
                title={b.etiket}
                subtitle={b.alt}
                value={b.deger}
                onClick={() => navigate(b.yol)}
              />
            ))}
          </ListGroup>
        )}

        {!bugun.length && !bugunYukleniyor && (
          <p className="ios-footnote">Göstergeler şu an alınamadı.</p>
        )}

        <ListGroup header="Bölümler">
          {bolumler.map((b) => (
            <ListRow
              key={b.baslik}
              icon={<b.icon size={16} strokeWidth={2.2} />}
              iconColor="var(--ios-tint)"
              title={b.baslik}
              subtitle={b.alt}
              onClick={() => navigate(b.yol)}
            />
          ))}
        </ListGroup>

        {ARACLAR_ACIK && (
          <ListGroup header="Araçlar">
            {ARACLAR.map((k) => (
              <ListRow
                key={k.yol}
                icon={<k.icon size={16} strokeWidth={2.2} />}
                iconColor={k.renk}
                title={k.baslik}
                subtitle={k.alt}
                onClick={() => navigate(k.yol)}
              />
            ))}
          </ListGroup>
        )}
      </div>
    </>
  );
}
