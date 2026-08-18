import { Link } from 'react-router-dom';
import { NAV_GROUPS } from '../pages';

/**
 * "Bu bölümde ayrıca" — iniş sayfasının altındaki kategori şeridi.
 *
 * ─── NEDEN AYRI BİR EKRAN DEĞİL ─────────────────────────────────────────────
 * Hayvancılık altında 6 bölüm, 21 sayfa var; rastgele bir sayfaya düşmek
 * kullanıcıyı kaybettiriyor. Ama veri göstermeyen bir ARA EKRAN koymak da
 * herkese, her girişte kalıcı bir tık maliyeti bindirirdi: keşif ihtiyacı bir
 * defalık, kullanım ihtiyacı sürekli.
 *
 * Bu yüzden keşif, iniş sayfasının ALTINDA duruyor. Giren kişi önce gerçek
 * rakamı görüyor; "başka ne var" sorusunun cevabı da aynı ekranda, kaydırma
 * mesafesinde. Fazladan tık yok.
 *
 * ─── KAPSAM: YALNIZCA KENDİ ÜST GRUBU ───────────────────────────────────────
 * `SECTIONS` bütün grupları düzleştirdiği için onu kullanmak hayvancılık
 * sayfasının altına meyve ve sebze bölümlerini de asıyordu. Bu yüzden bölüm
 * `NAV_GROUPS` içinde aranıp SADECE kendi grubunun kardeşleri listeleniyor.
 */

export function BolumKategorileri({
  bolumYolu,
  baslik = 'Bu bölümde ayrıca',
}: {
  /** Üzerinde bulunduğumuz bölümün yolu; kendi grubu bulunur, kendisi çıkarılır. */
  bolumYolu: string;
  baslik?: string;
}) {
  const grup = NAV_GROUPS.find((g) => g.sections.some((b) => b.path === bolumYolu));
  const kardesler = (grup?.sections ?? [])
    .filter((b) => b.path !== bolumYolu && b.pages.length > 0);

  if (!kardesler.length) return null;

  return (
    <div className="tvb-section tvb-kategoriler">
      <h3>{baslik}</h3>
      <div className="tvb-kategoriler__izgara">
        {kardesler.map((b) => (
          <Link
            key={b.path}
            to={`/tarpovizyon-basic/${b.path}/${b.pages[0].path}`}
            className="tvb-kategoriler__kart"
          >
            <span className="tvb-kategoriler__ad">{b.label}</span>
            <span className="tvb-kategoriler__adet">{b.pages.length} sayfa</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
