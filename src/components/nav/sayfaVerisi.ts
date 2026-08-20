import { fetchRows, type Row } from '../../tarpovizyon-basic/api';
import type { MenuItem } from './menu';

/**
 * Bir sayfanın son verisini, modele verilecek kısa bir metne çevirir.
 *
 * ─── NEDEN ──────────────────────────────────────────────────────────────────
 * AI, uygulamanın verisine bakmıyordu; ezberinden konuşuyordu. Ölçülen örnek:
 * "süt üretimi ne kadar" sorusuna "~19,5–21 milyon ton" dedi, uygulamanın
 * kendi rakamı çiğ sütte 21.379.088 ton (2025) idi. Cevabın ALTINA sayfa
 * bağlantısı koymak doğruyu yanına koyuyordu ama yanlışı engellemiyordu.
 * Burası o adım: model cevabı üretmeden ÖNCE gerçek satırları görüyor.
 *
 * ─── NEDEN ŞABLONA BAKMIYOR ─────────────────────────────────────────────────
 * Sayfaların 19 farklı şablon tipi var (`yearly`, `ranking`, `stat-tiles`…)
 * ve her birinin yapılandırması ayrı şekilde. Her biri için ayrı bir çıkarıcı
 * yazmak, yeni şablon eklendiğinde sessizce beslenmeyen sayfa demekti.
 *
 * Bunun yerine sayfanın UCU çağrılıyor ve dönen ham satırlar olduğu gibi
 * veriliyor. Uç zaten sayfanın gösterdiği veriyi döndürüyor; modelin sütun
 * adlarını okuyup anlaması için yeterli.
 */

/** Modele gidecek satır sayısı — son yıllar. */
const SATIR = 10;
/**
 * Tüm sayfalar için TOPLAM bütçe. Worker tarafındaki sınırın (2000) altında
 * kalmalı; aşarsa orada kırpılır ve hangi sayfanın kırpıldığını bilemeyiz.
 */
export const TOPLAM_BUTCE = 1800;

/**
 * Satırı `alan=değer` çiftlerine çevirir; boş sütunlar hiç yazılmıyor.
 *
 * ─── SAYILAR HAM GİDİYOR, BİÇİMLENMİYOR ─────────────────────────────────────
 * Önce Türkçe biçim kullanılıyordu ve modele `sigir_bas=17.708.985` gidiyordu.
 * Nokta çoğu yerde ONDALIK ayırıcı: model bunu 17,7 milyon yerine 17,7 diye
 * okuyabilir ve cevaba yanlış büyüklük yazar — beslemenin çözmek için var
 * olduğu hatanın aynısı, bu sefer bizim elimizle.
 *
 * Ham sayıda böyle bir belirsizlik yok. Kullanıcıya gösterilecek biçimi
 * model zaten kendisi kuruyor.
 */
function satirMetni(r: Row): string {
  return Object.entries(r)
    .filter(([, v]) => v !== null && v !== '' && v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}

/**
 * Sayfanın ucundan son satırları çekip metin olarak döndürür.
 * Uç yoksa, boş dönerse ya da istek düşerse `null` — besleme atlanır,
 * cevap yine üretilir. Veri gelmedi diye AI'ı susturmak daha kötü olurdu.
 */
export async function sayfaVerisi(
  sayfa: MenuItem,
  butce = TOPLAM_BUTCE,
): Promise<string | null> {
  if (!sayfa.uc) return null;
  try {
    const satirlar = await fetchRows(sayfa.uc);
    if (!satirlar.length) return null;

    /*
     * SON satırlar alınıyor: uçlar yıla göre artan sıralı geliyor ve sorular
     * neredeyse her zaman güncel duruma dair. Baştan almak 2004'ü anlatırdı.
     */
    const son = satirlar.slice(-SATIR);
    const baslik = `${sayfa.label}${sayfa.bolum ? ` (${sayfa.bolum})` : ''}:`;

    /*
     * ─── BÜTÇE EN ESKİDEN KISILIYOR ───────────────────────────────────────
     * Önce satırlar birleştirilip metin sondan kırpılıyordu. Ölçüldü ve
     * beslemenin amacını tersine çeviriyordu: hayvan varlığında modele giden
     * son satır 2023'te bitiyordu, oysa veri 2025'e kadar vardı — kırpma tam
     * da sorulan yılı siliyordu.
     *
     * Artık satırlar EN YENİDEN geriye doğru ekleniyor ve bütçe dolunca
     * eskiler dışarıda kalıyor. Çıktı yine kronolojik sırada.
     */
    const secilen: string[] = [];
    let kalan = butce - baslik.length;
    for (let i = son.length - 1; i >= 0; i--) {
      const satir = satirMetni(son[i]);
      if (satir.length + 1 > kalan) break;
      secilen.unshift(satir);
      kalan -= satir.length + 1;
    }
    if (!secilen.length) return null;
    return `${baslik}\n${secilen.join('\n')}`;
  } catch {
    return null;
  }
}

/**
 * Birden çok sayfanın verisini tek bir bloğa toplar.
 *
 * ─── NEDEN BİRDEN ÇOK ───────────────────────────────────────────────────────
 * Tek sayfa beslemesi "süt ve et üretimini karşılaştır" gibi soruları yarım
 * bırakıyordu: model bir tarafı gerçek veriden, öbür tarafı ezberinden
 * söylüyordu ve bu ikisi cevapta AYIRT EDİLEMİYORDU.
 *
 * ─── BÜTÇE PAYLAŞTIRILIYOR ──────────────────────────────────────────────────
 * Sayfa başına sabit bir sınır vermek toplamı sunucudaki sınırın üstüne
 * çıkarırdı ve kırpma orada, bizim göremediğimiz bir yerde olurdu. Bütçe
 * burada bölünüyor: ilk sayfa (en alakalı olan) en büyük payı alıyor.
 */
export async function sayfalarVerisi(sayfalar: MenuItem[]): Promise<string | null> {
  const ucluler = sayfalar.filter((s) => s.uc);
  if (!ucluler.length) return null;

  /*
   * Paylar 3/2/1 oranında: model sayfaları alaka sırasına göre veriyor ve
   * eşit bölmek, asıl sorulan konunun verisini kısıp yan konuya yer açardı.
   */
  const agirlik = ucluler.map((_, i) => ucluler.length - i);
  const toplamAgirlik = agirlik.reduce((a, b) => a + b, 0);

  const parcalar = await Promise.all(
    ucluler.map((s, i) => sayfaVerisi(s, Math.floor((TOPLAM_BUTCE * agirlik[i]) / toplamAgirlik))),
  );
  const dolu = parcalar.filter((p): p is string => Boolean(p));
  return dolu.length ? dolu.join('\n\n') : null;
}
