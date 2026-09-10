import { Tag } from 'lucide-react';

/**
 * Fiyatlandırma sekmesi — henüz iskelet.
 *
 * ─── NEDEN BOŞ VE NE ZAMAN DOLACAK ──────────────────────────────────────────
 * Fiyatın buradan girilmesi bilinçli bir karar: koda gömülü bir tutar,
 * değiştirmek için yeniden derleme ve dağıtım gerektirir. Tutar `ayar`
 * tablosunda duracak, abonelik sayfası oradan okuyacak.
 *
 * Form şu an YOK çünkü yazacağı yer yok: ne `ayar` tablosu ne de onu
 * okuyup yazan yönetim ucu kuruldu. Çalışmayan bir form koymak, girilen
 * fiyatın kaydedildiği izlenimi verirdi — bu depoda benzeri bir hata zaten
 * pahalıya patladı (hesaplanan oranlar elle güncellenmeyip aylarca yanlış
 * kaldı).
 *
 * Sıra: `ayar` tablosu → yönetim ucu → bu form → iyzico bağlantısı.
 */
export default function FiyatlandirmaSekmesi() {
  return (
    <div className="panel-kart">
      <h2 className="panel-kart-baslik">
        <Tag size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Fiyatlandırma
      </h2>
      <p className="panel-not">
        Bu bölümden aylık ve yıllık abonelik tutarı, yıllık indirim oranı ve
        ücretsiz deneme gün sayısı belirlenecek. Değerler veritabanında
        tutulacağı için değişiklik anında geçerli olacak — yeni sürüm
        yayınlamak gerekmeyecek.
      </p>
      <p className="panel-not" style={{ marginTop: 10 }}>
        <b>Henüz kurulmadı.</b> Ayar tablosu ve onu yazan yönetim ucu
        hazırlanmadan buraya form konmuyor: kaydedilmeyen bir tutarı
        kaydedilmiş göstermek, yanlış fiyatla abonelik açmaktan daha zor fark
        edilen bir hata olurdu.
      </p>
    </div>
  );
}
