/**
 * Sayfa arama eşleştirmesi — Keşfet'in ve ileride masaüstü kutusunun ortak motoru.
 *
 * ─── NEDEN AYRI BİR MODÜL ───────────────────────────────────────────────────
 * Eşleştirme tek satırdı ve Keşfet'in içinde duruyordu:
 *
 *     item.label.toLocaleLowerCase('tr').includes(sorgu)
 *
 * 134 sayfanın tamamına karşı ölçüldüğünde bu satırın üç ayrı yerde kırıldığı
 * görüldü. Aşağıdaki üç kural o üç kırığı kapatıyor; kural olarak burada
 * durmalarının sebebi arama kutusunun tek yerde kalmayacak olması.
 *
 * ─── 1. BÖLÜM ADINDA DA ARA ─────────────────────────────────────────────────
 * Kayıt zaten `bolum` taşıyor ama arama yalnızca `label`a bakıyordu. Sonuç:
 * "kanatlı" sorgusu SIFIR sonuç veriyordu — oysa bölümün adı birebir
 * "Kanatlı Sektörü (Piliç Eti ve Yumurta)".
 *
 * ─── 2. TÜRKÇE KATLAMA ──────────────────────────────────────────────────────
 * "bugday" yazınca "Buğday" bulunmuyordu. Telefon klavyesinde şapkasız yazmak
 * kural, istisna değil. Şapkalar düşürülüyor (ğ→g, ı/i, ş→s, ç→c, ö→o, ü→u).
 *
 * Küçültme `toLocaleLowerCase('tr')` ile yapılıyor, düz `toLowerCase()` ile
 * DEĞİL: Türkçe'de I→ı ve İ→i, varsayılan küçültme ikisini de yanlış çeviriyor
 * ve "İZMİR" ile "izmir" eşleşmiyor.
 *
 * ─── 3. KELİME KELİME, KELİME BAŞINDAN ──────────────────────────────────────
 * Sorgu tek parça alt-dizi olarak aranıyordu. İki sonucu vardı:
 *
 *   • "yumurta fiyatı" SIFIR sonuç veriyordu, ama "yumurta" tek başına 2.
 *     Doğal cümle kuran herkes duvara toslıyordu.
 *   • Eşleşme kelimenin ORTASINA düşebiliyordu: "yem" sorgusu
 *     "Kuruyemişler" getiriyordu.
 *
 * Artık sorgu kelimelere bölünüyor, HER kelimenin bir yerde eşleşmesi
 * gerekiyor ve eşleşme kelime başına demirli.
 *
 * ─── KADEMELİ GEVŞETME ──────────────────────────────────────────────────────
 * Her kelimenin tutmasını şart koşmak tek başına fazla katı. İki kademede
 * gevşiyor, ikisinin de sebebi ölçüldü:
 *
 *   1. Hiçbir öğeye uymayan kelime düşürülüyor (`sorguKelimeleri`).
 *      "yumurta durumu" gibi taşıyıcı kelimeler sonucu sıfırlamasın diye.
 *
 *   2. Katı eşleşme HİÇ sonuç vermezse, tek kelimenin tutması yeterli
 *      sayılıyor. "yumurta fiyatı" bunu gerektiriyor: "fiyat" Basic'te var
 *      (Tarım Üretici Fiyat Endeksi) yani 1. kademede düşmüyor, ama yumurta
 *      ile fiyatı BİRLİKTE taşıyan sayfa yok. Katı kalırsa kullanıcı, aradığı
 *      yumurta sayfası orada dururken sıfır sonuç görüyor.
 *
 * Sıra önemli: önce katı, boşsa gevşek. Böylece kesin eşleşme varken gevşek
 * sonuçlar araya karışmıyor.
 *
 * ─── NE YAPMIYOR ────────────────────────────────────────────────────────────
 * Bunlar bilerek dışarıda; ölçülüp sonraya bırakıldı:
 *
 *   • Eş anlamlı yok — "tavuk" hâlâ "Piliç Eti"ni bulmuyor.
 *   • Sayfa İÇERİĞİ indekslenmiyor; yalnızca sayfa ve bölüm adı aranıyor.
 *     Bu yüzden "manda" sorgusu manda serisini çizen sayfayı değil,
 *     adı "manda" ile BAŞLADIĞI için "Mandalina"yı getiriyor. Meşru bir önek
 *     eşleşmesi — düzelmesi için içerik etiketlerinin kataloğa girmesi gerek.
 *   • Yazım hatası toleransı yok — "yumrta" sonuç vermiyor.
 *   • Sıralama yok; eşleşenler menü sırasında dönüyor.
 */

/** Aranabilir en küçük birim. Menü öğesi bu şekli zaten karşılıyor. */
export type AranabilirOge = {
  label: string;
  /** Sayfanın ait olduğu alt bölüm — "Kanatlı Sektörü (Piliç Eti ve Yumurta)". */
  bolum?: string;
};

const SAPKALAR: Record<string, string> = {
  ğ: 'g', ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u',
  â: 'a', î: 'i', û: 'u',
};

/**
 * Karşılaştırma için sadeleştirir: Türkçe küçültme + şapka düşürme.
 * "Buğday" → "bugday",  "İZMİR" → "izmir",  "Şeker Pancarı" → "seker pancari"
 */
export const katla = (metin: string): string =>
  metin.toLocaleLowerCase('tr').replace(/[ğışçöüâîû]/g, (h) => SAPKALAR[h] ?? h);

/** Katlanmış metni kelimelere böler. Katlamadan sonra geriye ASCII kalıyor. */
export const kelimelere = (metin: string): string[] =>
  katla(metin).split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Ekli sorgunun köke düşmesine izin verirken taşkın eşleşmeyi engelleyen liste.
 * Bunlar olmadan "verim" sorgusu içinde "ve" geçen her başlığı getiriyordu.
 */
const TASIYICI = new Set(['ve', 'ile', 'veya', 'gore', 'icin', 'ait', 'bir', 'bu']);

/**
 * Türkçe çekim eki en fazla bu kadar uzayabilir sayıyoruz.
 * "yumurtalar" → "yumurta" (3 harf ek) geçerli;
 * "ilerleme" → "ile" (5 harf) geçersiz — o bir ek değil, farklı kelime.
 */
const EN_UZUN_EK = 4;

/**
 * Sorgu kelimesi, metnin kelimelerinden birinde KELİME BAŞINDAN eşleşiyor mu?
 *
 * İki yön de gerekli ve sebepleri farklı:
 *   • metin kelimesi sorguyla başlıyorsa → kullanıcı yazmayı sürdürüyor
 *     ("yumu" → "Yumurta")
 *   • sorgu metin kelimesiyle başlıyorsa → kullanıcı ek getirmiş
 *     ("yumurtalar" → "Yumurta", "sütün" → "Süt")
 */
function kelimeTutuyor(metinKelimeleri: string[], sorguKelimesi: string): boolean {
  return metinKelimeleri.some((k) => {
    if (k.startsWith(sorguKelimesi)) return true;
    if (TASIYICI.has(k)) return false;
    return (
      k.length >= 3
      && sorguKelimesi.startsWith(k)
      && sorguKelimesi.length - k.length <= EN_UZUN_EK
    );
  });
}

/** Öğenin aranabilir kelimeleri: sayfa adı + bölüm adı. */
const havuz = (oge: AranabilirOge): string[] =>
  [...kelimelere(oge.label), ...(oge.bolum ? kelimelere(oge.bolum) : [])];

/**
 * Öğe sorguyla eşleşiyor mu? Çok kelimeli sorguda kelimeler farklı alanlardan
 * gelebilir: biri sayfa adından, diğeri bölümden.
 *
 * `hepsi` false verildiğinde tek kelimenin tutması yetiyor — gerekçesi
 * `KADEMELI GEVSETME` başlığında.
 */
export function eslesiyorMu(
  oge: AranabilirOge,
  sorguKelimeleri: string[],
  hepsi = true,
): boolean {
  if (!sorguKelimeleri.length) return true;
  const k = havuz(oge);
  return hepsi
    ? sorguKelimeleri.every((s) => kelimeTutuyor(k, s))
    : sorguKelimeleri.some((s) => kelimeTutuyor(k, s));
}

/**
 * Sorgu metnini, listede gerçekten karşılığı olan kelimelere indirger.
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * Her kelimenin eşleşmesini şart koşmak tek başına fazla katı. Ölçüldü:
 * "yumurta fiyatı" SIFIR sonuç veriyordu, çünkü hiçbir sayfa ya da bölüm
 * adında "fiyat" geçmiyor — oysa kullanıcının aradığı yumurta sayfası orada
 * duruyor. Doğal cümlede her zaman böyle taşıyıcı kelimeler oluyor
 * ("... fiyatı", "... kaç", "... durumu").
 *
 * Hiçbir öğeye uymayan kelime bu yüzden düşürülüyor; kalanlarla aranıyor.
 * Katılık korunuyor: uyan kelimelerin HEPSİ hâlâ şart.
 *
 * Dönüş:
 *   null → sorgu boş, süzme yok, liste olduğu gibi
 *   []   → sorgunun hiçbir kelimesi hiçbir şeye uymuyor, sonuç yok
 */
export function sorguKelimeleri(
  ogeler: AranabilirOge[],
  metin: string,
): string[] | null {
  const kelimeler = kelimelere(metin);
  if (!kelimeler.length) return null;
  const havuzlar = ogeler.map(havuz);
  return kelimeler.filter((k) => havuzlar.some((h) => kelimeTutuyor(h, k)));
}
