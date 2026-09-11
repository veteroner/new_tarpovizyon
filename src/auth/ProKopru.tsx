import { Link } from 'react-router-dom';
import { Sparkles, User } from 'lucide-react';
import { useOturum } from './useOturum';
import { basicAlanAdi, PRO_ALAN_ADI } from '../utils/surum';
import { isPlatform } from '../mobile/utils/platform';
import './prokopru.css';

/**
 * Basic başlığında bu iki öğe duruyor ve aynı ortam koşullarını paylaşıyorlar:
 * yalnız webde (mağaza derlemesinde değil) ve yalnız www/apex'te.
 *
 * Koşul tek yerde: ikisine ayrı ayrı yazmak, birini değiştirip diğerini
 * unutmanın kolay olduğu bir tekrar olurdu.
 */
const webBasicAlaninda = () => !isPlatform('capacitor') && basicAlanAdi();

/**
 * "Pro'ya geç" köprüsü — yalnız www/apex'te, yalnız abonelere.
 *
 * ─── ÇÖZDÜĞÜ SORUN ──────────────────────────────────────────────────────────
 * Pro yalnızca `pro.tarpovizyon.com`'da yayınlanıyor (`utils/surum.ts`) ve bu
 * kural yerinde: aynı derleme www'yi de sunduğu için gevşetmek, yayındaki
 * Basic'in yerini Pro'nun almasına yol açmıştı.
 *
 * Ama kuralın yan etkisi şuydu: ABONE OLAN biri www.tarpovizyon.com'a girince
 * Basic görüyor ve Pro'su olduğunu hiçbir yerden öğrenemiyordu. Parasını
 * ödediği şeyi bulmak için adresi elle yazması gerekiyordu.
 *
 * Bu bileşen alan adı kuralına DOKUNMUYOR — üstüne bir köprü koyuyor.
 *
 * ─── ÜÇ KOŞUL, ÜÇÜ DE GEREKLİ ───────────────────────────────────────────────
 * · Mağaza derlemesinde DEĞİL: uygulamada alan adı yok, oradaki karşılığı
 *   Ayarlar'daki mod anahtarı. Burada da göstermek iki ayrı geçiş yolu
 *   demek olurdu.
 * · `basicAlanAdi()`: yalnız www ve apex. Pro alan adında zaten Pro'dasınız;
 *   yerel geliştirmede ve önizlemede de gereksiz.
 * · `proErisimi`: yetkisi olmayana göstermek, açılmayacak bir kapıyı
 *   göstermek olurdu. Satış çağrısı DEĞİL bu — abonenin kendi içeriğine
 *   giden yol.
 *
 * ─── NEDEN TAM SAYFA GEÇİŞİ ─────────────────────────────────────────────────
 * `<a href>` kullanılıyor, router değil: hedef BAŞKA BİR ALAN ADI. Router
 * yönlendirmesi aynı sayfada kalır ve `proSurumu()` hâlâ false döner, yani
 * kullanıcı Pro yollarına gider ama uygulama onu Basic sanmaya devam eder.
 *
 * Hedef Pro ana sayfası, bulunduğu sayfanın Pro karşılığı değil: Basic ve Pro
 * yolları birebir eşlenmiyor, yanlış bir eşleme kullanıcıyı 404'e ya da
 * alakasız bir sayfaya atardı.
 */
export function ProKopru() {
  const { proErisimi } = useOturum();

  if (!webBasicAlaninda()) return null;
  if (!proErisimi) return null;

  return (
    <a
      className="pro-kopru"
      href={`https://${PRO_ALAN_ADI}/tarpovizyon/turkey/overview`}
      /* Dar ekranda yazı gizleniyor, ikon kalıyor — erişilebilir ad kalsın. */
      aria-label="Pro sürümüne geç"
    >
      <Sparkles size={14} aria-hidden="true" />
      <span>Pro&apos;ya geç</span>
    </a>
  );
}

/**
 * "Giriş" — Basic başlığındaki hesap yolu.
 *
 * ─── NEDEN GEREKTİ: KÖPRÜ TEK BAŞINA ÖLÜ KODDU ──────────────────────────────
 * `ProKopru` abonelik yetkisi istiyor, yetki de oturum jetonundan geliyor ve
 * jeton `localStorage`'da duruyor. `localStorage` KAYNAĞA ÖZEL:
 * `www.tarpovizyon.com` ile `pro.tarpovizyon.com` ayrı kaynaklar. Yani
 * pro alan adında abone olan kişinin www'de jetonu YOK.
 *
 * Ölçüldü: Basic masaüstü kabuğunda giriş/hesap bağlantısı hiç yoktu (sıfır).
 * `/m/settings` www'de çalışıyor ve giriş sunuyor ama kabuktan bulunamıyordu.
 * Sonuç: köprü hiçbir zaman görünemezdi — yani Faz 4 teslim edilmemiş olurdu.
 *
 * Bu düğme o zinciri kapatıyor: www'de giriş yapılabiliyor, giriş yapıldıktan
 * sonra köprü kendiliğinden çıkıyor.
 *
 * ─── BİLİNEN PÜRÜZ ──────────────────────────────────────────────────────────
 * `/m/giris` mobil kabuğun içinde: masaüstünde giriş kartı düzgün çiziliyor
 * (ölçüldü, 380px) ama altında telefon sekme çubuğu görünüyor. İşlevsel,
 * kozmetik olarak yersiz. Web'e özel bir giriş rotası açmak daha doğru olurdu
 * ama `/tarpovizyon/` altına koymak para duvarı açıldığında kapı-döngüsü
 * riski taşıyor (giriş sayfasının kendisi kapının arkasında kalır), o yüzden
 * ayrı bir karar olarak bırakıldı.
 */
export function WebGirisDugmesi() {
  const { durum } = useOturum();

  if (!webBasicAlaninda()) return null;
  /* Girişliyken gösterilmiyor: yetkiliyse `ProKopru` çıkıyor, yetkisizse
     Basic zaten ücretsiz ve yapacak bir şey yok. Hesabı yönetmek için
     `/m/settings` duruyor. */
  if (durum !== 'girissiz') return null;

  return (
    <Link className="pro-kopru pro-kopru--sade" to="/m/giris" aria-label="Hesabınıza giriş yapın">
      <User size={14} aria-hidden="true" />
      <span>Giriş</span>
    </Link>
  );
}
