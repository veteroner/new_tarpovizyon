import { Users } from 'lucide-react';

/**
 * Aboneler sekmesi — henüz iskelet.
 *
 * ─── VERİ ZATEN VAR, UÇ YOK ─────────────────────────────────────────────────
 * `kullanici`, `abonelik` ve `oturum` tabloları D1'de kurulu ve doluyor:
 * ilk gerçek kullanıcı kaydı test sırasında açıldı. Eksik olan tek şey bu
 * listeyi okuyacak YÖNETİM UCU.
 *
 * Uç bilerek acele edilmedi: abone listesi e-posta adresi döndürüyor, yani
 * kişisel veri. Yetkisi olmayan birinin erişebileceği bir uçtan sızması,
 * bir istatistik tablosunun sızmasından bambaşka bir sorumluluk. Uç,
 * yönetim uçlarının TOTP korumasına bağlanmadan açılmayacak.
 *
 * Sıra: yönetim ucu (TOTP korumalı) → bu liste → abonelik iptali/uzatma.
 */
export default function AbonelerSekmesi() {
  return (
    <div className="panel-kart">
      <h2 className="panel-kart-baslik">
        <Users size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Aboneler
      </h2>
      <p className="panel-not">
        Bu bölümde kayıtlı kullanıcılar, abonelik durumları (deneme / aktif /
        süresi dolmuş), bitiş tarihleri ve son giriş zamanları listelenecek;
        buradan süre uzatma ve iptal yapılabilecek.
      </p>
      <p className="panel-not" style={{ marginTop: 10 }}>
        <b>Henüz kurulmadı.</b> Veri D1'de mevcut ama listeyi okuyan uç
        yazılmadı. Bu liste e-posta adresi döndürdüğü için — yani kişisel veri —
        uç, yönetim uçlarının TOTP korumasına bağlanmadan açılmayacak.
      </p>
    </div>
  );
}
