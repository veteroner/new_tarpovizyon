/**
 * Hangi sürüm yayında — TEK DERLEME, İKİ ALAN ADI.
 *
 * ─── SORUN ──────────────────────────────────────────────────────────────────
 * Aynı Netlify derlemesi iki adresi birden sunuyor:
 *   www.tarpovizyon.com  → yayında olan BASIC
 *   pro.tarpovizyon.com  → PRO
 * İkisi arasındaki fark sunucuda değil, uygulamanın içinde: Basic
 * `/tarpovizyon-basic/*`, Pro `/tarpovizyon/*` yollarında.
 *
 * Vitrin (giriş) sayfasının bütün bağlantıları bir dönem Basic'e bakıyordu.
 * "Site pro.tarpovizyon.com'da yayınlanıyor" diye hepsi Pro'ya çevrildi — ama
 * AYNI DERLEME www'yi de sunduğu için ana alan adında da her ziyaretçi Pro'ya
 * gitmeye başladı ve yayında olan Basic'in yerini aldı.
 *
 * Hata tek bir varsayımdan çıktı: "bu derleme şu adreste yayınlanıyor". Yanlış;
 * bu derleme İKİ adreste birden yayınlanıyor. O yüzden karar derleme anında
 * değil, ÇALIŞMA ANINDA ve ana bilgisayar adına bakılarak veriliyor.
 *
 * ─── KURAL ──────────────────────────────────────────────────────────────────
 * Pro YALNIZCA pro.tarpovizyon.com'da. Başka her yerde (www, apex, yerel
 * geliştirme, mağaza derlemesi) Basic.
 *
 * Beyaz liste değil KESİN EŞLEŞME kullanılıyor: "pro geçen her adres" gibi
 * gevşek bir kural, ileride açılacak bir önizleme adresinde sessizce Pro'yu
 * yayınlayabilirdi. Yerel geliştirmede Pro'yu görmek için `/tarpovizyon`
 * adresine doğrudan gitmek yeterli — vitrin bağlantıları oraya götürmüyor.
 */

/** Pro sürümün yayınlandığı tek adres. */
export const PRO_ALAN_ADI = 'pro.tarpovizyon.com';

/**
 * Ana alan adı ve www — Pro'nun ekranda GÖRÜNMEMESİ gereken adresler.
 *
 * Kasıtlı olarak kara liste: yerel geliştirmeyi, önizleme adreslerini ve
 * Capacitor mağaza derlemesini (`capacitor://`, `localhost`) yanlışlıkla
 * kapsamasın diye. Yalnızca halka açık iki adres yazılı.
 */
const BASIC_ALAN_ADLARI = ['tarpovizyon.com', 'www.tarpovizyon.com'];

/** Şu an Pro sürümü mü yayınlanıyor. Tarayıcı dışında (test/SSR) her zaman false. */
export function proSurumu(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === PRO_ALAN_ADI;
}

/**
 * Pro'nun GİZLENMESİ gereken halka açık adres mi.
 *
 * `!proSurumu()` ile aynı şey DEĞİL: yerel geliştirmede ve mağaza
 * derlemesinde Pro yollarına erişim kapanmamalı, yalnızca yayındaki ana alan
 * adında kapanmalı.
 */
export function basicAlanAdi(): boolean {
  if (typeof window === 'undefined') return false;
  return BASIC_ALAN_ADLARI.includes(window.location.hostname);
}

/** Aynı içeriğin Pro ve Basic karşılıkları arasında seçim yapar. */
export const surumYolu = (pro: string, basic: string): string => (proSurumu() ? pro : basic);
