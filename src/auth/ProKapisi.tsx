import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { useOturum } from './useOturum';
import { OturumGirisi } from './OturumGirisi';
import { PARA_DUVARI_AKTIF, vitrinMi } from './kapiAyari';
import './giris.css';

/**
 * Pro içerik kapısı.
 *
 * ─── ÜÇ DURUM, ÜÇ FARKLI EKRAN ──────────────────────────────────────────────
 *   yükleniyor  → hiçbir şey (aşağıda gerekçesi)
 *   girişsiz    → giriş ekranı
 *   girişli ama aboneliksiz → yükseltme ekranı
 *
 * `yukleniyor` durumunda İSKELET DE GÖSTERİLMİYOR, boş bırakılıyor. Sebep:
 * jeton doğrulaması genelde 200 ms sürüyor ve o süre için bir iskelet çizmek,
 * girişli kullanıcıya içerikten önce yanıp sönen bir katman göstermek olurdu.
 * Boş bırakmak, sayfanın zaten yüklenmekte olduğu izlenimini bozmuyor.
 *
 * ─── BU KAPI GÜVENLİK DEĞİL ─────────────────────────────────────────────────
 * İstemcide çalışan hiçbir kontrol güvenlik sağlamaz: paketi okuyan biri
 * bileşeni atlayabilir. Bu kapının işi ARAYÜZ: ödemeyen kullanıcıya doğru
 * ekranı göstermek. Gerçek koruma sunucuda, veri uçlarında olmalı — Pro'ya
 * özel uçlar jeton isteyecek (Faz 3). O yapılana kadar bu kapı yalnız bir
 * vitrin; bunu bilerek ve yazılı olarak kabul ediyoruz, yanılsama olarak
 * değil.
 */

/**
 * Yola bakıp kapıyı uygulayan sarmalayıcı.
 *
 * `<Routes>` ağacının etrafına TEK satır olarak giriyor. Alternatif — 64 Pro
 * rotasını tek tek `<ProKapisi>` ile sarmak — hem 64 yerde tekrar hem de her
 * yeni rotada unutulabilecek bir adım demekti; kapının bir rotada eksik
 * kalması, kapının hiç olmamasından kötü.
 *
 * Basic yolları (`/tarpovizyon-basic/...`) `startsWith('/tarpovizyon/')`
 * denetimine TAKILMIYOR çünkü araya tire giriyor; yine de açıkça dışlanıyor
 * ki yol şeması ileride değişirse sessizce Basic'i kapatmasın.
 */
export function YolKapisi({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const korumali = PARA_DUVARI_AKTIF
    && pathname.startsWith('/tarpovizyon/')
    && !pathname.startsWith('/tarpovizyon-basic')
    && !vitrinMi(pathname);
  return korumali ? <ProKapisi>{children}</ProKapisi> : <>{children}</>;
}

export function ProKapisi({ children }: { children: ReactNode }) {
  const { durum, proErisimi, abonelik } = useOturum();

  if (durum === 'yukleniyor') return null;
  if (durum === 'girissiz') return <OturumGirisi />;
  if (proErisimi) return <>{children}</>;

  return <YukseltmeEkrani sonDurum={abonelik?.durum ?? 'yok'} />;
}

/** Girişli ama aboneliği bitmiş/yok olan kullanıcıya. */
function YukseltmeEkrani({ sonDurum }: { sonDurum: string }) {
  const { kullanici, cikis } = useOturum();
  const denemeBitti = sonDurum === 'suresi_doldu' || sonDurum === 'deneme';

  return (
    <div className="giris-sar">
      <div className="giris-kart">
        <div className="giris-rozet"><Lock size={22} aria-hidden="true" /></div>
        <h1 className="giris-baslik">
          {denemeBitti ? 'Deneme süreniz doldu' : 'Bu bölüm Pro aboneliğine ait'}
        </h1>
        <p className="giris-alt">
          Röntgen sinyalleri, aktarım zinciri, makro ölçek ve dünya
          karşılaştırmaları Pro aboneliğiyle açılıyor. Temel istatistiklerin
          tamamı ücretsiz kalmaya devam ediyor.
        </p>

        <Link className="giris-dugme" to="/tarpovizyon/abonelik" style={{ textDecoration: 'none' }}>
          <Sparkles size={16} aria-hidden="true" /> Pro'ya geç
        </Link>

        <Link
          className="giris-geri"
          to="/tarpovizyon-basic"
          style={{ textDecoration: 'none' }}
        >
          Ücretsiz istatistiklere dön
        </Link>

        <p className="giris-alt" style={{ margin: '14px 0 0', fontSize: '0.78rem' }}>
          {kullanici?.eposta}
          {' · '}
          <button
            type="button"
            onClick={() => void cikis()}
            style={{ background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
          >
            çıkış yap
          </button>
        </p>
      </div>
    </div>
  );
}
