import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OturumGirisi } from '../../auth/OturumGirisi';
import { useOturum } from '../../auth/useOturum';
import { NavBar } from '../components/ui/IosList';

/**
 * Mobil giriş ekranı — `/m/giris`.
 *
 * ─── NEDEN SARMALAYICI GEREKTİ ──────────────────────────────────────────────
 * `OturumGirisi` başarılı girişte HİÇBİR ŞEY yapmıyor, bilerek: onu web
 * tarafında gösteren şey bir KAPI (`ProKapisi`) ve bağlam `girisli` olunca
 * kapı kendiliğinden içeriği açıyor. Bileşen nereden çağrıldığını bilmek
 * zorunda kalmasın diye yönlendirme yazılmamış.
 *
 * Ama burada kapı değil ROTA var: giriş başarılı olsa bile kullanıcı aynı
 * ekranda kalırdı ve hiçbir şey olmamış gibi görünürdü. Dönüş yolunu bu
 * sarmalayıcı veriyor.
 *
 * ─── NEDEN AYRI SAYFA, AÇILIR PENCERE DEĞİL ─────────────────────────────────
 * Akış iki adımlı (e-posta → kod) ve arada kullanıcı e-posta uygulamasına
 * geçiyor. Açılır pencere, uygulama arka plana alınıp geri dönüldüğünde
 * kapanma riski taşıyor; rota adres çubuğunda durduğu için geri dönüşte de
 * aynı yerde açılıyor.
 */
export default function MobileGirisPage() {
  const { durum } = useOturum();
  const navigate = useNavigate();

  useEffect(() => {
    /* `replace`: geri tuşu girişe DÖNMEMELİ — girdikten sonra oraya dönmek
       kullanıcıyı zaten geçtiği bir adıma geri atardı. */
    if (durum === 'girisli') navigate('/m/settings', { replace: true });
  }, [durum, navigate]);

  /* Bağlam henüz belli değilken hiçbir şey çizilmiyor: bir an giriş formu
     gösterip sonra kapatmak, zaten girişli kullanıcıya yanlışlıkla
     "çıkış yapmışsın" izlenimi verirdi. */
  if (durum !== 'girissiz') return null;

  return (
    <>
      <NavBar title="Hesap" subtitle="Giriş" onBack={() => navigate('/m/settings')} backLabel="Ayarlar" />
      <div className="ios-scroll">
        <OturumGirisi baslik="TarpoVizyon hesabı" />
      </div>
    </>
  );
}
