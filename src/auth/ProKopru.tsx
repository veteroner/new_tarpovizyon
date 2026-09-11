import { Sparkles } from 'lucide-react';
import { useOturum } from './useOturum';
import { basicAlanAdi, PRO_ALAN_ADI } from '../utils/surum';
import { isPlatform } from '../mobile/utils/platform';
import './prokopru.css';

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

  if (isPlatform('capacitor')) return null;
  if (!basicAlanAdi()) return null;
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
