import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Globe, Shield, Smartphone, FileText, Database, Trash2,
} from 'lucide-react';
import { getAppInfo } from '../capacitor/app';
import { NavBar, ListGroup, ListRow } from '../components/ui/IosList';
import { SesSecici } from '../../components/ses/SesSecici';

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
 * "Oturumu Kapat" ve "Lisanslar" da aynı sebeple kaldırılmıştı: uygulamada
 * oturum yok, lisans sayfası yok.
 *
 * "Önbelleği Temizle" ise hiçbir şey yapmıyordu; artık gerçekten temizliyor
 * ve geri alınamaz olduğu için önce onay soruyor.
 */

export default function MobileSettingsPage() {
  const navigate = useNavigate();
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
      localStorage.clear();
    } catch { /* yok say */ }
    setBoyut(olcOnbellek());
  };

  return (
    <>
      <NavBar title="Ayarlar" subtitle="Tercihler ve bilgi" />

      <div className="ios-scroll">

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
          <ListRow icon={<Shield size={16} strokeWidth={2.2} />} iconColor="var(--ios-tint)"
            title="Gizlilik politikası" onClick={() => navigate('/rasyon/privacy')} />
          <ListRow icon={<FileText size={16} strokeWidth={2.2} />} iconColor="var(--ios-blue)"
            title="Kullanım şartları" onClick={() => navigate('/rasyon/terms')} />
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
          TarpoVizyon © 2025 TARPOL<br />Yapay Zekâ • Veri • Bilim • İnovasyon Merkezi
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
