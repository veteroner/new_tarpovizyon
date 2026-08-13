/**
 * Klavye yüksekliğini CSS'e taşır (`--klavye`).
 *
 * ─── ÇÖZDÜĞÜ SORUN ──────────────────────────────────────────────────────────
 * iOS'ta klavye açılınca GÖRSEL görüntü alanı küçülür ama DÜZEN görüntü alanı
 * aynı kalır. `position: fixed` öğeler düzen alanını baz aldığı için sohbet
 * yazma alanı klavyenin ALTINDA kalıyordu; iOS de onu göstermeye çalışırken
 * sayfayı kaydırıp içeriği ekrandan taşırıyordu.
 *
 * `visualViewport` bu farkı ölçebilen tek arayüz: klavye kaplayan yüksekliği
 * `window.innerHeight - visualViewport.height` kadar. Değeri kök öğeye CSS
 * değişkeni olarak yazıyoruz, düzen de ona göre yukarı çıkıyor.
 *
 * Desteklenmeyen ortamda hiçbir şey yapmıyor; `--klavye` tanımsız kalıyor ve
 * CSS'teki `var(--klavye, 0px)` yedeği devreye giriyor.
 */
export function klavyeyiIzle(): () => void {
  const gv = window.visualViewport;
  if (!gv) return () => {};

  const kok = document.documentElement;

  const guncelle = () => {
    /*
     * Küçük farklar (adres çubuğu, kaydırma esnemesi) klavye değildir;
     * 80 px altındaki farklar yok sayılıyor, yoksa düzen sürekli oynardı.
     */
    const kaplanan = Math.max(0, window.innerHeight - gv.height - gv.offsetTop);
    const acik = kaplanan > 80;
    kok.style.setProperty('--klavye', acik ? `${Math.round(kaplanan)}px` : '0px');
    /*
     * Sınıf da veriliyor: sekme çubuğunu gizlemek için önce
     * `body:has(input:focus)` denendi ama odak durumu her zaman güvenilir
     * yansımıyor. Klavyenin GERÇEKTEN ekranı kaplaması tek doğru sinyal.
     */
    kok.classList.toggle('klavye-acik', acik);
  };

  gv.addEventListener('resize', guncelle);
  gv.addEventListener('scroll', guncelle);
  guncelle();

  return () => {
    gv.removeEventListener('resize', guncelle);
    gv.removeEventListener('scroll', guncelle);
    kok.style.removeProperty('--klavye');
    kok.classList.remove('klavye-acik');
  };
}
