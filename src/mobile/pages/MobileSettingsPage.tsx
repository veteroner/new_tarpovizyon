import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CloudSun, CalendarClock, Moon, Globe, Shield,
  Smartphone, FileText, Database, Trash2,
} from 'lucide-react';
import { getAppInfo } from '../capacitor/app';
import { isPlatform } from '../utils/platform';
import { NavBar, ListGroup, ListRow } from '../components/ui/IosList';

/**
 * Ayarlar.
 *
 * ─── NE DEĞİŞTİ ─────────────────────────────────────────────────────────────
 * Görsel olarak: her satır ayrı kenarlıklı bir kartken artık gruplu liste.
 *
 * Davranış olarak üç gerçek kusur düzeltildi:
 *
 *  1. Bildirim anahtarları YALNIZCA bellekte tutuluyordu — sekme değiştirip
 *     dönünce hepsi varsayılana sıfırlanıyordu. Artık cihazda saklanıyor.
 *  2. "Önbelleği Temizle" hiçbir şey yapmıyordu. Artık gerçekten temizliyor,
 *     üstelik geri alınamaz olduğu için önce onay soruyor.
 *  3. "Oturumu Kapat" ve "Lisanslar" hiçbir yere gitmiyordu. Uygulamada oturum
 *     yok, lisans sayfası da yok — hiçbir şey yapmayan düğme, olmayan
 *     düğmeden kötüdür; kaldırıldı.
 */

const ANAHTAR = 'tarpo.bildirim';

const BILDIRIMLER = [
  { key: 'market_alerts', label: 'Piyasa bildirimleri', alt: 'Fiyat değişiminde haber ver', icon: Bell, renk: 'var(--ios-orange)' },
  { key: 'weather_alerts', label: 'Hava durumu uyarıları', alt: 'Kritik hava olaylarında', icon: CloudSun, renk: 'var(--ios-blue)' },
  { key: 'weekly_digest', label: 'Haftalık özet', alt: 'Her pazartesi rapor', icon: CalendarClock, renk: 'var(--ios-tint)' },
];

const VARSAYILAN = { market_alerts: true, weather_alerts: true, weekly_digest: true };

/** iOS anahtarı. Rol `switch` — ekran okuyucu açık/kapalı diye okuyor. */
function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`ios-switch${on ? ' is-on' : ''}`}
      onClick={onChange}
    >
      <span className="ios-knob" />
    </button>
  );
}

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const [surum, setSurum] = useState('2.0.0');
  const [yapi, setYapi] = useState('7');

  const [acik, setAcik] = useState<Record<string, boolean>>(() => {
    try {
      const kayit = localStorage.getItem(ANAHTAR);
      return kayit ? { ...VARSAYILAN, ...JSON.parse(kayit) } : VARSAYILAN;
    } catch {
      return VARSAYILAN;
    }
  });

  useEffect(() => {
    getAppInfo().then((info) => {
      setSurum(info.version || '2.0.0');
      setYapi(info.build || '7');
    });
  }, []);

  const cevir = (key: string) => {
    setAcik((p) => {
      const yeni = { ...p, [key]: !p[key] };
      try { localStorage.setItem(ANAHTAR, JSON.stringify(yeni)); } catch { /* özel mod */ }
      return yeni;
    });
  };

  const [boyut, setBoyut] = useState(() => olcOnbellek());

  const temizle = () => {
    // Geri alınamaz: önce onay. (HIG — yıkıcı eylem doğrulanır.)
    if (!window.confirm('Çevrimdışı veriler silinecek. Devam edilsin mi?')) return;
    try {
      // Tercihler korunuyor; yalnızca önbellek gidiyor.
      const tercih = localStorage.getItem(ANAHTAR);
      localStorage.clear();
      if (tercih) localStorage.setItem(ANAHTAR, tercih);
    } catch { /* yok say */ }
    setBoyut(olcOnbellek());
  };

  const bildirimNotu = useMemo(
    () => (isPlatform('capacitor') ? undefined : 'Web tarayıcıda bildirimler sınırlıdır.'),
    [],
  );

  return (
    <>
      <NavBar title="Ayarlar" subtitle="Tercihler ve bilgi" />

      <div className="ios-scroll">
        <ListGroup header="Bildirimler">
          {BILDIRIMLER.map((b) => (
            <ListRow
              key={b.key}
              icon={<b.icon size={16} strokeWidth={2.2} />}
              iconColor={b.renk}
              title={b.label}
              subtitle={b.alt}
              value={<Switch on={!!acik[b.key]} onChange={() => cevir(b.key)} label={b.label} />}
              showChevron={false}
            />
          ))}
        </ListGroup>
        {bildirimNotu && <p className="ios-footnote">{bildirimNotu}</p>}

        <ListGroup header="Genel">
          <ListRow icon={<Moon size={16} strokeWidth={2.2} />} iconColor="var(--ios-label-3)"
            title="Tema" value="Açık" showChevron={false} />
          <ListRow icon={<Globe size={16} strokeWidth={2.2} />} iconColor="var(--ios-blue)"
            title="Dil" value="Türkçe" showChevron={false} />
          <ListRow icon={<Database size={16} strokeWidth={2.2} />} iconColor="var(--ios-tint)"
            title="Çevrimdışı veri" value={boyut} showChevron={false} />
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
          TarpoVizyon © 2025 TARPOL<br />Tarım Komuta Merkezi
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
