import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { locate, itemPath, hasScope, type Kapsam } from './menu';
import '../../styles/KardesGecisi.css';

/**
 * Kardeş geçişi — aynı bölümün diğer konuları.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * Analistin asıl yaptığı iş kardeş konuları karşılaştırmak: Kırmızı Et'ten
 * Süt'e, Tahıllar'dan Meyveler'e. Kırılımlı gezinmede bu, bir basamak yukarı
 * çıkıp tekrar inmek demek. Kenar menüsü açıksa orada da yapılabiliyor ama
 * daraltılmış menüde ya da mobilde yapılamıyor.
 *
 * ─── NEDEN KABUKTA DEĞİL, İÇERİKTE ──────────────────────────────────────────
 * Üst çubuk + kırıntı + hızlı erişim zaten üç şerit. Dördüncü YAPIŞKAN şerit
 * ekranın dörtte birini gezinmeye verirdi. Bu yüzden içerik alanının en
 * üstünde ve sayfayla birlikte kayıyor: bağlamsal, kalıcı değil.
 *
 * ─── TEK KARDEŞ VARSA GÖRÜNMÜYOR ────────────────────────────────────────────
 * "Genel Bakış" gibi tek öğeli bölümlerde şerit yalnızca bulunduğun sayfayı
 * gösterirdi — bilgi taşımayan bir çubuk.
 */
export function KardesGecisi() {
  const navigate = useNavigate();
  const location = useLocation();

  const kapsam: Kapsam =
    location.pathname.startsWith('/tarpovizyon/world') ? 'world' : 'turkey';

  const konum = useMemo(
    () => locate(location.pathname, location.search),
    [location.pathname, location.search],
  );

  /* Bu kapsamda açılabilen kardeşler. Kapsamda olmayanı şeride koymak
     kullanıcıyı sessizce başka kapsama atardı — o iş bölüm sayfasının. */
  const kardesler = useMemo(
    () => (konum ? konum.kategori.items.filter((it) => hasScope(it, kapsam)) : []),
    [konum, kapsam],
  );

  if (!konum || kardesler.length < 2) return null;

  return (
    <nav className="kg" aria-label={`${konum.kategori.title} konuları`}>
      {kardesler.map((it) => {
        const yol = itemPath(it, kapsam)!;
        const buradaMi = it.label === konum.item.label;
        return (
          <button
            key={yol}
            type="button"
            className={`kg-oge${buradaMi ? ' aktif' : ''}`}
            aria-current={buradaMi ? 'page' : undefined}
            disabled={buradaMi}
            onClick={() => navigate(yol)}
          >
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
