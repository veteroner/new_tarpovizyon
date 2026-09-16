/**
 * Para duvarının açık olup olmadığı — TEK ANAHTAR.
 *
 * ─── AÇILDI (16 Eylül 2026) ─────────────────────────────────────────────────
 * Ön koşul sağlandı: `RESEND_KEY` tanımlı ve giriş kodu e-postası çalışıyor
 * (kanıt: e-postayla kayıt olmuş gerçek kullanıcı). Daha önce bayrak bu yüzden
 * kapalıydı — kod gönderilemezken kapıyı açmak, gelen herkesi asla gelmeyecek
 * bir kodu bekler halde giriş ekranında kilitlemek olurdu.
 *
 * ─── İSTEMCİ ÖNCE, SUNUCU HEMEN ARKASINDAN ──────────────────────────────────
 * Bu bayrak yalnız ARAYÜZÜ kapatıyor; uçları `PARA_DUVARI` ortam değişkeni
 * kapatıyor. İkisi arasındaki pencerede hangi sıranın seçildiği önemli:
 *
 *   · Sunucu önce → arayüz henüz kapı çizmiyor, sayfalar açılıyor ama uçlar
 *     401 dönüyor: kullanıcı BOŞ sayfalar görüyor.
 *   · İstemci önce → kapı çiziliyor, giriş ekranı görünüyor; uçlar kısa bir
 *     süre daha açık kalıyor.
 *
 * İkincisi seçildi: bozuk bir ekran, birkaç dakika daha korumasız kalan bir
 * uçtan kötüdür. Derleme yayına çıkar çıkmaz sunucu tarafı da açılmalı.
 *
 * ─── KAPATMAK GEREKİRSE ─────────────────────────────────────────────────────
 * Bu bayrağı `false` yapmak arayüz kapısını kaldırır ama uçlar `PARA_DUVARI`
 * tanımlı kaldığı sürece 401 dönmeye devam eder — yani tek başına geri alma
 * değil. Geri almak için ikisi birden kapatılmalı, önce sunucu.
 *
 * ─── NEDEN ORTAM DEĞİŞKENİ DEĞİL ────────────────────────────────────────────
 * `VITE_` değişkeni derleme anında gömülüyor ve bu depoda daha önce tam da
 * bu yüzden sessiz bir arıza yaşandı: `.env` olmayan bir native derlemede
 * özellik ölü gitti, webde çalıştığı için de fark edilmedi. Bayrağın kodda
 * durması, ne olduğunu okunabilir ve gözden geçirilebilir kılıyor.
 */
export const PARA_DUVARI_AKTIF = true;

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
  /*
   * Pro vitrini. Duvar açıldığında Pro'nun tamamı kapanıyor ve satın alma
   * kararı verilecek kanıt kalmıyordu; bu sayfa o boşluğu dolduruyor.
   * Yalnız ücretsiz uçlardan besleniyor (106 ucun 69'u korumasız), o yüzden
   * vitrinde tutmak kapıyı delmiyor.
   */
  '/tarpovizyon/pro',
];

/**
 * Para duvarından MUAF yönetim yolları.
 *
 * Bunlar vitrin değil — kimseye gösterilmiyorlar. Muaf olmalarının sebebi
 * KENDİ KORUMALARININ OLMASI: yönetim uçları TOTP + yönetici anahtarı
 * istiyor (`x-admin-otp`, `x-admin-key`) ve o koruma abonelikten bağımsız.
 *
 * Muafiyet olmasaydı duvar açıldığı anda YÖNETİCİ KENDİ PANELİNE GİREMEZDİ:
 * yolları `/tarpovizyon/` altında olduğu için kapı onlara da abonelik sorar,
 * oysa yöneticinin abonesi olması gerekmiyor — hatta hiç giriş yapmamış
 * olabilir, paneli TOTP ile açıyor. Duvar açılmadan önce fark edildi.
 *
 * Ekstra bir güvenlik açığı DEĞİL: bu sayfaların verisi zaten yönetim
 * uçlarından geliyor ve o uçlar anahtar olmadan hiçbir şey döndürmüyor.
 * Kapıyı kaldırmak yalnızca boş bir formun görünmesini sağlıyor.
 */
export const YONETIM_YOLLARI = [
  '/tarpovizyon/veri-yukle',
  '/tarpovizyon/veri-girisi',
  '/tarpovizyon/panel',
];

export const vitrinMi = (yol: string): boolean =>
  [...VITRIN_YOLLARI, ...YONETIM_YOLLARI]
    .some((v) => yol === v || yol.startsWith(`${v}/`));
