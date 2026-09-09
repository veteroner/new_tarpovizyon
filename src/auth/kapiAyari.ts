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
 * ─── GENEL BAKIŞ NEDEN VİTRİN DEĞİL ─────────────────────────────────────────
 * İlk karar Genel Bakış'ı vitrin yapmaktı: Röntgen'i taşıyor ve ürünün en
 * ayırt edici parçası o, kapalı kapı arkasında durursa satın alma kararı
 * verilecek kanıt kalmıyordu.
 *
 * Ölçüm o kararı çürüttü. Sayfa 13 uç okuyor ve DÖRDÜ korumalı listede:
 * `bitkisel/uretim-detay`, `tr/kisi-basi-uretim-tuketim`, `tuik/fiyatendex`,
 * `tuik/urundenge`. Yani sayfayı vitrin yapmanın iki yolu vardı ve ikisi de
 * kötüydü:
 *   · o dört ucu da açmak → ürün dengesi ve fiyat endeksi sayfaları da
 *     fiilen ücretsiz olurdu, kapı delinirdi
 *   · uçları kapalı tutmak → vitrinin yarısı boş çizilirdi, yani satış aracı
 *     ürünü bozuk gösterirdi
 *
 * Doğru çözüm sayfayı zorlamak değil, vitrini AYRI YAZMAK: yalnız ücretsiz
 * uçlardan beslenen bir tanıtım sayfası (Faz 2). O gelene kadar burada
 * yalnız abonelik sayfası var — yani kapı açılırsa Pro tümüyle kapalı olur.
 * Eksik bir vitrin, bozuk bir vitrinden iyidir.
 *
 * Liste ÖNEK eşleşmesiyle çalışıyor, tam eşleşmeyle değil: alt sekmeler
 * (`?bolum=`) ve ileride eklenecek alt yollar da vitrinde kalsın.
 */
export const VITRIN_YOLLARI = [
  '/tarpovizyon/abonelik',
];

export const vitrinMi = (yol: string): boolean =>
  VITRIN_YOLLARI.some((v) => yol === v || yol.startsWith(`${v}/`));
