import { Link } from 'react-router-dom';
import { NAV_GROUPS } from './pages';

/**
 * Web girişi — `/tarpovizyon-basic` adresinin açılış sayfası.
 *
 * ─── NEDEN VAR ──────────────────────────────────────────────────────────────
 * Bu adres eskiden doğrudan İLK VERİ SAYFASINA yönlendiriyordu. Siteye gelen
 * kişi ne olduğunu anlamadan bir tablonun ortasına düşüyordu: nereye geldiğini,
 * elinde ne olduğunu, verinin nereden geldiğini gösteren hiçbir şey yoktu.
 *
 * ─── NE OLMADIĞI ────────────────────────────────────────────────────────────
 * Bu sayfa bir GÜVENLİK ÖNLEMİ DEĞİL. API ayrı bir adreste duruyor ve
 * doğrudan çağrılabiliyor; ziyaretçinin buradan geçmesi zorunlu değil.
 * Kötüye kullanıma karşı koruma sunucuda: okuma uçlarında önbellek ve hız
 * sınırı var (bkz. `workers/tarpovizyon-api/src/index.js`).
 *
 * ─── NEDEN SAYI GÖSTERİYOR ──────────────────────────────────────────────────
 * "Tarım verileri" demek hiçbir şey söylemiyor. Bölüm başına sayfa sayısı
 * ve kaynak adları, gelen kişinin burada gerçekten ne olduğunu bir bakışta
 * anlamasını sağlıyor.
 */

/** Bölümün ilk sayfası — kart oraya götürüyor. */
function ilkYol(grup: typeof NAV_GROUPS[number]): string {
  const bolum = grup.sections[0];
  return `/tarpovizyon-basic/${bolum.path}/${bolum.pages[0].path}`;
}

const sayfaSayisi = (grup: typeof NAV_GROUPS[number]) =>
  grup.sections.reduce((n, b) => n + b.pages.length, 0);

export function GirisSayfasi() {
  const toplam = NAV_GROUPS.reduce((n, g) => n + sayfaSayisi(g), 0);

  return (
    <div className="tvb-page tvb-giris">
      <header className="tvb-giris__ust">
        <h2>Tarım ve hayvancılık verileri</h2>
        <p>
          Türkiye ve dünya tarımına dair <strong>{toplam} rapor</strong>:
          üretim, hayvan varlığı, fiyatlar, dış ticaret ve il bazında kırılımlar.
          Veriler TÜİK ve FAO kaynaklarından düzenli olarak tazeleniyor.
        </p>
      </header>

      <div className="tvb-section">
        <h3>Bölümler</h3>
        <div className="tvb-kategoriler__izgara">
          {NAV_GROUPS.map((grup) => (
            <Link key={grup.label} to={ilkYol(grup)} className="tvb-kategoriler__kart">
              <span className="tvb-kategoriler__ad">{grup.label}</span>
              <span className="tvb-kategoriler__adet">
                {sayfaSayisi(grup)} sayfa
                {/*
                  * Alt bölüm adları da yazıyor: "Hayvancılık" tek başına
                  * içinde çiğ süt, kırmızı et ve kanatlının olduğunu
                  * söylemiyor.
                  */}
                {grup.sections.length > 1 && (
                  <> · {grup.sections.slice(0, 3).map((b) => b.label).join(', ')}
                    {grup.sections.length > 3 && '…'}
                  </>
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <p className="tvb-giris__not">
        Kaynak: TÜİK ve FAO. Rakamlar kaynak kurumların yayımladığı son
        verilerdir; kurumlar geçmiş yılları revize edebilir.
      </p>
    </div>
  );
}
