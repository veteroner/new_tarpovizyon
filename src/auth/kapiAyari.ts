/**
 * Para duvarının açık olup olmadığı — TEK ANAHTAR.
 *
 * ─── NEDEN VARSAYILAN KAPALI ────────────────────────────────────────────────
 * Kimlik altyapısı canlıda ama giriş kodu e-postası HENÜZ GÖNDERİLEMİYOR:
 * Worker'da `RESEND_KEY` secret'ı yok, o yüzden `/auth/kod-iste` 503 dönüyor.
 * Kapıyı bu haldeyken açmak, pro.tarpovizyon.com'a giren herkesi giriş
 * ekranında kilitlemek olurdu — kod isteyebilirler ama kod hiç gelmez.
 *
 * Yani sıra şu ve tersi olamaz:
 *   1. `wrangler secret put RESEND_KEY` (bunu deponun sahibi yapar; anahtar
 *      hiçbir dosyaya yazılmaz)
 *   2. Gerçek bir adrese kod isteyip giriş yapıldığı DOĞRULANIR
 *   3. Ancak o zaman bu bayrak `true` olur
 *
 * ─── NEDEN ORTAM DEĞİŞKENİ DEĞİL ────────────────────────────────────────────
 * `VITE_` değişkeni derleme anında gömülüyor ve bu depoda daha önce tam da
 * bu yüzden sessiz bir arıza yaşandı: `.env` olmayan bir native derlemede
 * özellik ölü gitti, webde çalıştığı için de fark edilmedi. Bayrağın kodda
 * durması, ne olduğunu okunabilir ve gözden geçirilebilir kılıyor.
 */
export const PARA_DUVARI_AKTIF = false;

/**
 * Kapı açıldığında bile ÜCRETSİZ kalacak Pro yolları.
 *
 * Vitrin mantığı: kullanıcı ödemeden önce ürünün ne yaptığını görmeli.
 * Genel bakış sayfası Röntgen'i taşıyor ve ürünün en ayırt edici parçası o;
 * kapalı bir kapının arkasında durursa satın alma kararı verilecek hiçbir
 * kanıt kalmıyor.
 *
 * Liste ÖNEK eşleşmesiyle çalışıyor, tam eşleşmeyle değil: alt sekmeler
 * (`?bolum=`) ve ileride eklenecek alt yollar da vitrinde kalsın.
 */
export const VITRIN_YOLLARI = [
  '/tarpovizyon/turkey/overview',
  '/tarpovizyon/abonelik',
];

export const vitrinMi = (yol: string): boolean =>
  VITRIN_YOLLARI.some((v) => yol === v || yol.startsWith(`${v}/`));
