import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Globe, Shield, Smartphone, FileText, Database, Trash2,
  User, Sparkles, LogOut,
} from 'lucide-react';
import { getAppInfo } from '../capacitor/app';
import { NavBar, ListGroup, ListRow } from '../components/ui/IosList';
import { SesSecici } from '../../components/ses/SesSecici';
import { useOturum } from '../../auth/useOturum';

/**
 * Ayarlar.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Görsel olarak: her satır ayrı kenarlıklı bir kartken artık gruplu liste.
 *
 * ─── HİÇBİR ŞEY YAPMAYAN DENETİMLER KALDIRILDI ──────────────────────────────
 * Ekranda üç bildirim anahtarı vardı ama uygulamada bildirim ALTYAPISI YOK:
 * `@capacitor/push-notifications` kurulu değil, vite onu no-op bir stub'a
 * yönlendiriyor, FCM/APNs yapılandırması da yok. Anahtarlar yalnızca
 * `localStorage`'a yazıyordu — kullanıcıya var olmayan bir özellik vaat
 * ediyorlardı. Apple'ın inceleme kılavuzu işlevsiz arayüzü ret sebebi sayıyor
 * (2.1). Bildirimler gerçekten kurulduğunda geri gelecekler.
 *
 * "Lisanslar" da aynı sebeple kaldırılmıştı: lisans sayfası yok.
 *
 * "Önbelleği Temizle" ise hiçbir şey yapmıyordu; artık gerçekten temizliyor
 * ve geri alınamaz olduğu için önce onay soruyor.
 *
 * ─── HESAP GERİ GELDİ ───────────────────────────────────────────────────────
 * "Oturumu Kapat" bir dönem kaldırılmıştı çünkü uygulamada oturum YOKTU. Artık
 * var: e-posta + tek kullanımlık kod ile giriş kuruldu ve Pro erişimi buna
 * bağlanıyor. Yani gerekçe değişti, satır geri geldi — işlevsiz denetim
 * olmadığı için Apple 2.1 sorunu da doğurmuyor.
 *
 * ─── FİYAT YOK, SATIN ALMA YOK, BAĞLANTI YOK ────────────────────────────────
 * Bu bölüm aboneliği GÖSTERİYOR, SATMIYOR. App Store 3.1.1 uygulama içinde
 * içerik açan satışı StoreKit'e bağlıyor; iyzico ile uygulama içinden satmak
 * ya da "şuradan abone ol" diye dışarı yönlendirmek reddedilme sebebi.
 *
 * O yüzden abonesi olmayan kullanıcıya bir eylem çağrısı DEĞİL, yalnızca
 * durum cümlesi gösteriliyor. Fiyat, düğme, bağlantı — üçü de bilerek yok.
 * Abonelik webde alınıyor; uygulama yalnızca "bu hesap neye yetkili" sorusunu
 * cevaplıyor.
 */

/** Abonelik durumunun kullanıcıya görünen karşılığı. */
function abonelikMetni(durum: string, kalanGun: number | null): string {
  const kalan = kalanGun != null && kalanGun > 0 ? ` · ${kalanGun} gün` : '';
  switch (durum) {
    case 'aktif': return `Pro aktif${kalan}`;
    case 'deneme': return `Ücretsiz deneme${kalan}`;
    case 'iptal': return 'İptal edildi';
    case 'suresi_doldu': return 'Süresi doldu';
    default: return 'Pro aboneliği yok';
  }
}

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { durum, kullanici, abonelik, proErisimi, cikis } = useOturum();
  const [surum, setSurum] = useState('2.0.0');
  const [yapi, setYapi] = useState('7');

  useEffect(() => {
    getAppInfo().then((info) => {
      setSurum(info.version || '2.0.0');
      setYapi(info.build || '7');
    });
  }, []);

  const [boyut, setBoyut] = useState(() => olcOnbellek());

  const temizle = () => {
    // Geri alınamaz: önce onay. (HIG — yıkıcı eylem doğrulanır.)
    if (!window.confirm('Çevrimdışı veriler silinecek. Devam edilsin mi?')) return;
    try {
      /*
       * OTURUM JETONU KORUNUYOR.
       *
       * Eskiden burada `localStorage.clear()` vardı ve uygulamada oturum
       * olmadığı için sorun çıkmıyordu. Oturum eklenince bu satır sessiz bir
       * çıkışa dönüştü: "çevrimdışı veriyi temizle" diyen kullanıcı hesabından
       * da atılırdı. İstenen şey önbellek; kimlik önbellek değil.
       *
       * Anahtar listesi elle yazılmıyor, KORUNACAKLAR dışındakiler siliniyor:
       * ters kurgu, ileride eklenecek yeni bir önbellek anahtarını
       * kendiliğinden kapsıyor.
       */
      const KORUNACAKLAR = ['tarpovizyon_oturum'];
      const silinecek = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !KORUNACAKLAR.includes(k)) silinecek.push(k);
      }
      silinecek.forEach((k) => localStorage.removeItem(k));
    } catch { /* yok say */ }
    setBoyut(olcOnbellek());
  };

  return (
    <>
      <NavBar title="Ayarlar" subtitle="Tercihler ve bilgi" />

      <div className="ios-scroll">

        {/*
          * Hesap EN ÜSTTE: Pro erişimini belirleyen tek şey bu bölüm. Aşağıda
          * durursa, Pro'nun neden açık ya da kapalı olduğunu arayan kullanıcı
          * onu en son bakacağı yerde bulurdu.
          *
          * 'yukleniyor' halinde grup ÇİZİLMİYOR: bir an "giriş yap" gösterip
          * sonra hesabı göstermek, girişli kullanıcıya çıkmış olduğunu
          * düşündürürdü.
          */}
        {durum === 'girissiz' && (
          <ListGroup header="Hesap">
            <ListRow
              icon={<User size={16} strokeWidth={2.2} />}
              iconColor="var(--ios-blue)"
              title="Giriş yap"
              subtitle="Pro aboneliğiniz varsa burada açılır"
              onClick={() => navigate('/m/giris')}
            />
          </ListGroup>
        )}

        {durum === 'girisli' && (
          <ListGroup header="Hesap">
            <ListRow
              icon={<User size={16} strokeWidth={2.2} />}
              iconColor="var(--ios-blue)"
              title={kullanici?.eposta ?? 'Hesap'}
              showChevron={false}
            />
            <ListRow
              icon={<Sparkles size={16} strokeWidth={2.2} />}
              iconColor={proErisimi ? 'var(--ios-tint)' : 'var(--ios-label-3)'}
              title="Abonelik"
              value={abonelikMetni(abonelik?.durum ?? 'yok', abonelik?.kalanGun ?? null)}
              showChevron={false}
            />
            <ListRow
              icon={<LogOut size={16} strokeWidth={2.2} />}
              iconColor="var(--ios-red)"
              title={<span style={{ color: 'var(--ios-red-text)' }}>Çıkış yap</span>}
              onClick={() => { void cikis(); }}
              showChevron={false}
            />
          </ListGroup>
        )}

        {/*
          * Abonesi olmayan girişli kullanıcıya DURUM cümlesi — eylem çağrısı
          * değil. Fiyat, düğme ve bağlantı bilerek yok (App Store 3.1.1);
          * gerekçe dosya başındaki nota yazılı.
          */}
        {durum === 'girisli' && !proErisimi && (
          <p className="ios-footnote">
            Bu hesapta etkin bir Pro aboneliği görünmüyor. Ücretsiz bölümlerin
            tamamı kullanılabilir durumda.
          </p>
        )}

        <ListGroup header="Genel">
          <ListRow icon={<Moon size={16} strokeWidth={2.2} />} iconColor="var(--ios-label-3)"
            title="Tema" value="Açık" showChevron={false} />
          <ListRow icon={<Globe size={16} strokeWidth={2.2} />} iconColor="var(--ios-blue)"
            title="Dil" value="Türkçe" showChevron={false} />
          <ListRow icon={<Database size={16} strokeWidth={2.2} />} iconColor="var(--ios-tint)"
            title="Çevrimdışı veri" value={boyut} showChevron={false} />
        </ListGroup>

        {/*
          * Ses seçimi ayrı bir grup: hangi seslerin yüklü olduğu cihazdan
          * cihaza değişiyor ve API cinsiyet bilgisi vermiyor. Kullanıcı
          * kendi telefonunda ne varsa görüp dinleyerek seçiyor.
          */}
        <ListGroup header="Asistan sesi">
          <SesSecici />
        </ListGroup>

        <ListGroup header="Hakkında">
          {/*
            * TarpoVizyon'un KENDİ sayfaları. Önce `/rasyon/privacy` ve
            * `/rasyon/terms`'e gidiyordu — o adresler TarpoRasyon'un politikasını
            * açıyor ve sayfa "TarpoRasyon | Karar Destek Sistemi" diye
            * imzalanıyordu. Mağaza incelemesinde "yanlış uygulamanın gizlilik
            * politikası" olarak işaretlenebilirdi.
            */}
          <ListRow icon={<Shield size={16} strokeWidth={2.2} />} iconColor="var(--ios-tint)"
            title="Gizlilik politikası" onClick={() => navigate('/m/gizlilik')} />
          <ListRow icon={<FileText size={16} strokeWidth={2.2} />} iconColor="var(--ios-blue)"
            title="Kullanım şartları" onClick={() => navigate('/m/sartlar')} />
          <ListRow icon={<Smartphone size={16} strokeWidth={2.2} />} iconColor="var(--ios-label-3)"
            title="Sürüm" value={`${surum} (${yapi})`} showChevron={false} />
        </ListGroup>

        <ListGroup>
          <ListRow
            icon={<Trash2 size={16} strokeWidth={2.2} />}
            iconColor="var(--ios-red)"
            title={<span style={{ color: 'var(--ios-red-text)' }}>Önbelleği temizle</span>}
            onClick={temizle}
            showChevron={false}
          />
        </ListGroup>

        <p className="ios-footnote ios-footnote-center">
          TarpoVizyon © 2024–2026 TARPOL<br />Yapay Zekâ • Veri • Bilim • İnovasyon Merkezi
        </p>
      </div>
    </>
  );
}

/** localStorage'ın kabaca kapladığı yer (UTF-16 ≈ 2 bayt/karakter). */
function olcOnbellek() {
  try {
    let toplam = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      toplam += k.length + (localStorage.getItem(k) || '').length;
    }
    const kb = Math.round((toplam * 2) / 1024);
    return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
  } catch {
    return '—';
  }
}
