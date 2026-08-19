/**
 * Sayfa arama motoru — Keşfet'in ve masaüstü kutusunun ortak çekirdeği.
 *
 * ─── NEREDEN GELDİ ──────────────────────────────────────────────────────────
 * Eşleştirme tek satırdı ve Keşfet'in içinde duruyordu:
 *
 *     item.label.toLocaleLowerCase('tr').includes(sorgu)
 *
 * 84 sayfaya karşı ölçüldüğünde birçok yerde kırıldığı görüldü: "kanatlı" ve
 * "bugday" sıfır sonuç veriyor, "manda" yanlış sayfayı getiriyor, "süt üretimi"
 * gibi iki kelimeli doğal sorgular hiç çalışmıyordu. Aşağıdaki kuralların
 * hepsinin arkasında böyle ölçülmüş bir vaka var.
 *
 * ─── NE ARANIYOR ────────────────────────────────────────────────────────────
 * Üç alan, üç farklı ağırlıkla:
 *
 *   sayfa adı  — en güçlü. Kullanıcı çoğunlukla sayfanın adını yazıyor.
 *   bölüm adı  — orta. "kanatlı" sorgusunu kurtaran alan: sayfaların adı
 *                "Piliç Eti" ve "Yumurta", bölümün adı "Kanatlı Sektörü".
 *   içerik     — en zayıf. Sayfanın İÇİNDEKİ seri ve metrik etiketleri.
 *                "manda" sorgusunu kurtaran alan: manda hiçbir sayfa adında
 *                geçmiyor, "Türkiye Hayvan Varlığı"nda bir seri etiketi.
 *
 * Ağırlık farkı şart: içerik alanı olmadan "manda" yanlış sayfayı getiriyordu,
 * içerik alanı sayfa adıyla EŞİT ağırlıkta olsaydı bu sefer "Buğday" sorgusu
 * buğdayı bir seride anan on sayfanın arasında kaybolurdu.
 *
 * ─── SIRALAMA ───────────────────────────────────────────────────────────────
 * Eskiden süzme vardı, sıralama yoktu: eşleşen her şey menü sırasında
 * dönüyordu. "yumurta fiyatı" sorgusunda ilk sırada "Tarım Üretici Fiyat
 * Endeksi" çıkıyor, aranan yumurta sayfası aşağıda kalıyordu. Artık her sonuç
 * puanlanıyor ve puana göre sıralanıyor.
 *
 * ─── NE YAPMIYOR ────────────────────────────────────────────────────────────
 * Sonuçları öbeklemiyor ve sayfa içeriğindeki VERİYİ aramıyor — yalnızca
 * etiketleri. "2024'te kaç ton buğday" sorusuna cevap veremez, buğday
 * sayfasına götürür.
 */

/** Aranabilir en küçük birim. Menü öğesi bu şekli zaten karşılıyor. */
export type AranabilirOge = {
  label: string;
  /** Sayfanın ait olduğu alt bölüm — "Kanatlı Sektörü (Piliç Eti ve Yumurta)". */
  bolum?: string;
  /** Sayfa içindeki seri/metrik etiketleri. Gösterilmiyor, yalnızca aranıyor. */
  icerik?: string[];
};

/* ─── metin sadeleştirme ──────────────────────────────────────────────────── */

const SAPKALAR: Record<string, string> = {
  ğ: 'g', ı: 'i', ş: 's', ç: 'c', ö: 'o', ü: 'u',
  â: 'a', î: 'i', û: 'u',
};

/**
 * Karşılaştırma için sadeleştirir: Türkçe küçültme + şapka düşürme.
 * "Buğday" → "bugday",  "İZMİR" → "izmir",  "Şeker Pancarı" → "seker pancari"
 *
 * Küçültme `toLocaleLowerCase('tr')` ile; düz `toLowerCase()` Türkçe'de I→i ve
 * İ→i̇ üretiyor, yani "İZMİR" ile "izmir" eşleşmiyor.
 */
export const katla = (metin: string): string =>
  metin.toLocaleLowerCase('tr').replace(/[ğışçöüâîû]/g, (h) => SAPKALAR[h] ?? h);

/** Katlanmış metni kelimelere böler. Katlamadan sonra geriye ASCII kalıyor. */
export const kelimelere = (metin: string): string[] =>
  katla(metin).split(/[^a-z0-9]+/).filter(Boolean);

/* ─── eş anlamlılar ───────────────────────────────────────────────────────── */

/**
 * Aynı şeyi anlatan kelimeler. Sorgu kelimesi grubundaki bütün kelimelere
 * genişletiliyor; hangisi tutarsa sonuç geliyor.
 *
 * Ölçülmüş vaka: "tavuk" sıfır sonuç veriyordu. Uygulamada tavuk verisi var
 * ama sayfanın adı "Piliç Eti", bölümün adı "Kanatlı Sektörü" — kullanıcının
 * yazdığı kelime hiçbir yerde geçmiyor.
 *
 * Liste bilerek dar: yalnızca gerçekten aynı şeyi anlatan kelimeler. Gevşek
 * bir sözlük aramayı düzeltmez, bulanıklaştırır.
 */
const ES_ANLAMLI: string[][] = [
  ['tavuk', 'pilic', 'kanatli', 'broyler', 'etlik'],
  ['inek', 'sigir', 'buyukbas', 'dana'],
  ['koyun', 'keci', 'kucukbas'],
  ['manda', 'camis'],
  ['tahil', 'hububat'],
  ['ari', 'bal', 'aricilik'],
  ['yem', 'rasyon'],
];

const ES_ANLAMLI_HARITA: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const grup of ES_ANLAMLI) for (const k of grup) m.set(k, grup);
  return m;
})();

/* ─── kelime eşleştirme ───────────────────────────────────────────────────── */

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

/** Eşleşme yok. */
const YOK = 0;
/** Kelime, metin kelimesiyle birebir aynı. */
const TAM = 1;
/** Kelime başından eşleşiyor ama birebir değil ("yumu" → "yumurta"). */
const ONEK = 0.75;

/**
 * Tek bir sorgu kelimesinin, metnin kelimeleri içindeki en iyi eşleşme
 * kalitesi. Eşleşme her zaman KELİME BAŞINA demirli — aksi hâlde "yem"
 * sorgusu "Kuruyemişler" getiriyordu.
 *
 * İki yön de gerekli ve sebepleri farklı:
 *   • metin kelimesi sorguyla başlıyorsa → kullanıcı yazmayı sürdürüyor
 *     ("yumu" → "Yumurta")
 *   • sorgu metin kelimesiyle başlıyorsa → kullanıcı ek getirmiş
 *     ("yumurtalar" → "Yumurta", "sütün" → "Süt")
 */
function kalite(metinKelimeleri: string[], sorgu: string): number {
  let enIyi = YOK;
  for (const k of metinKelimeleri) {
    if (k === sorgu) return TAM;
    if (k.startsWith(sorgu)) { enIyi = Math.max(enIyi, ONEK); continue; }
    if (TASIYICI.has(k)) continue;
    if (k.length >= 3 && sorgu.startsWith(k) && sorgu.length - k.length <= EN_UZUN_EK) {
      enIyi = Math.max(enIyi, ONEK);
    }
  }
  return enIyi;
}

/* ─── puanlama ────────────────────────────────────────────────────────────── */

const AGIRLIK = { ad: 100, bolum: 35, icerik: 12 };
/** Eş anlamlıyla gelen eşleşme, doğrudan eşleşmenin gerisinde kalmalı. */
const ES_ANLAMLI_CARPANI = 0.55;

type Havuz = { ad: string[]; bolum: string[]; icerik: string[] };

const havuzCikar = (o: AranabilirOge): Havuz => ({
  ad: kelimelere(o.label),
  bolum: o.bolum ? kelimelere(o.bolum) : [],
  icerik: (o.icerik ?? []).flatMap(kelimelere),
});

/**
 * Birebir kelime eşleşmesine ALAN'DAN BAĞIMSIZ ek puan.
 *
 * ─── NEDEN ────────────────────────────────────────────────────────────────
 * Yalnız alan ağırlığına bakınca "manda" sorgusu "Mandalina"yı öne
 * koyuyordu: sayfa adında önek eşleşmesi (100×0,75) mandayı bir seri etiketi
 * olarak birebir taşıyan sayfayı (12×1) eziyordu. Oysa tam kelime eşleşmesi,
 * zayıf bir alandan gelse bile, yarım kelime eşleşmesinden daha güçlü bir
 * niyet işareti.
 */
const TAM_ODULU = 80;

/** Bir sorgu kelimesinin bu öğedeki puanı. Eşleşme yoksa 0. */
function kelimePuani(havuz: Havuz, sorgu: string): number {
  const alanPuani = (kelime: string, kelimeler: string[], agirlik: number, carpan: number) => {
    const k = kalite(kelimeler, kelime);
    if (k === YOK) return 0;
    return (agirlik * k + (k === TAM ? TAM_ODULU : 0)) * carpan;
  };

  const olc = (kelime: string, carpan: number) => Math.max(
    alanPuani(kelime, havuz.ad, AGIRLIK.ad, carpan),
    alanPuani(kelime, havuz.bolum, AGIRLIK.bolum, carpan),
    alanPuani(kelime, havuz.icerik, AGIRLIK.icerik, carpan),
  );

  /*
   * Eş anlamlılar doğrudan eşleşme BULUNSA DA deneniyor.
   *
   * Önce erken dönülüyordu ve bu, ölçümde yanlış sıralamaya yol açtı: "tavuk"
   * sorgusunda "Piliç Eti" sayfası ikinci sıraya düşüyordu, çünkü içeriğinde
   * geçen zayıf bir "tavuk" eşleşmesi bulunup adındaki güçlü "piliç"
   * eşleşmesine hiç bakılmıyordu.
   */
  let puan = olc(sorgu, 1);
  for (const es of ES_ANLAMLI_HARITA.get(sorgu) ?? []) {
    if (es === sorgu) continue;
    puan = Math.max(puan, olc(es, ES_ANLAMLI_CARPANI));
  }
  return puan;
}

/* ─── yazım hatası önerisi ────────────────────────────────────────────────── */

const ucluler = (metin: string): Set<string> => {
  const s = ` ${metin} `;
  const k = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i++) k.add(s.slice(i, i + 3));
  return k;
};

/**
 * Sorgunun üçlülerinden kaçı başlıkta geçiyor — 0 ile 1 arası.
 *
 * ─── NEDEN JACCARD DEĞİL ──────────────────────────────────────────────────
 * Önce Jaccard (kesişim/birleşim) kullanılıyordu ve uzun başlıkları haksız
 * yere cezalandırıyordu: "yumrta" sorgusu, doğru sayfa olan "Yumurta —
 * Üretim, İhracat ve Yeterlilik" için düşük puan alıyordu, çünkü başlığın
 * geri kalanındaki onlarca üçlü paydayı şişiriyordu. Ölçüldü: hiç öneri
 * çıkmıyordu.
 *
 * Kapsama oranı sorgunun uzunluğuna bakıyor, başlığınkine değil.
 */
function benzerlik(sorgu: Set<string>, baslik: Set<string>): number {
  if (!sorgu.size) return 0;
  let ortak = 0;
  for (const u of sorgu) if (baslik.has(u)) ortak += 1;
  return ortak / sorgu.size;
}

/** Bunun altındaki benzerlik öneri sayılmıyor — rastgele sayfa göstermek kötü. */
const ONERI_ESIGI = 0.5;
const ONERI_ADEDI = 3;

/* ─── dış yüz ─────────────────────────────────────────────────────────────── */

export type AramaCiktisi<T> = {
  /** Sorgu boş — süzme yapılmadı, liste olduğu gibi gösterilmeli. */
  bos: boolean;
  /** Puana göre sıralı sonuçlar. */
  sonuclar: T[];
  /**
   * Yalnızca `sonuclar` boşken dolu: yazım hatası olabileceği varsayımıyla
   * en yakın başlıklar. "Bunu mu demek istediniz" bunları gösteriyor.
   */
  oneriler: T[];
};

/**
 * Listeyi sorguya göre süzer ve sıralar.
 *
 * ─── KADEMELİ GEVŞETME ──────────────────────────────────────────────────────
 * Her kelimenin tutmasını şart koşmak tek başına fazla katı. Üç kademe var,
 * üçünün de arkasında ölçülmüş bir vaka duruyor:
 *
 *   1. Hiçbir öğeye uymayan kelime düşürülüyor. "yumurta durumu" gibi taşıyıcı
 *      kelimeler sonucu sıfırlamasın diye.
 *
 *   2. Katı eşleşme (her kelime tutmalı) hiç sonuç vermezse, tek kelimenin
 *      tutması yeterli sayılıyor. "yumurta fiyatı" bunu gerektiriyor: "fiyat"
 *      uygulamada var, yani 1. kademede düşmüyor, ama yumurta ile fiyatı
 *      BİRLİKTE taşıyan sayfa yok. Sıralama sayesinde yumurta sayfaları öne
 *      geliyor — eskiden bu kademe yoktu ve kullanıcı sıfır sonuç görüyordu.
 *
 *   3. O da boşsa yazım hatası varsayılıyor ve `oneriler` doldurularak
 *      kullanıcıya soruluyor. "yumrta" bu kademede yakalanıyor.
 */
export function ara<T extends AranabilirOge>(ogeler: T[], metin: string): AramaCiktisi<T> {
  const kelimeler = kelimelere(metin);
  if (!kelimeler.length) return { bos: true, sonuclar: ogeler, oneriler: [] };

  const havuzlar = ogeler.map(havuzCikar);
  const puanlar = kelimeler.map((k) => havuzlar.map((h) => kelimePuani(h, k)));

  /* 1. kademe: hiçbir öğede karşılığı olmayan kelimeyi at. */
  const gecerli = kelimeler
    .map((_, i) => i)
    .filter((i) => puanlar[i].some((p) => p > 0));
  if (!gecerli.length) {
    return { bos: false, sonuclar: [], oneriler: oneriBul(ogeler, metin) };
  }

  const topla = (j: number) => gecerli.reduce((t, i) => t + puanlar[i][j], 0);
  const tutanSayisi = (j: number) => gecerli.filter((i) => puanlar[i][j] > 0).length;

  const sirala = (secilenler: number[]) => secilenler
    /*
     * Eşit puanda KISA ad önde: "Buğday" ile "Buğday Üretiminde İlk 10 İl"
     * aynı puanı alıyor ve kullanıcının aradığı neredeyse her zaman kısa olan.
     */
    .sort((a, b) => topla(b) - topla(a) || ogeler[a].label.length - ogeler[b].label.length)
    .map((j) => ogeler[j]);

  const hepsiTutan = ogeler.map((_, j) => j).filter((j) => tutanSayisi(j) === gecerli.length);
  if (hepsiTutan.length) return { bos: false, sonuclar: sirala(hepsiTutan), oneriler: [] };

  /* 2. kademe: tek kelime yetsin. */
  const biriTutan = ogeler.map((_, j) => j).filter((j) => tutanSayisi(j) > 0);
  if (biriTutan.length) return { bos: false, sonuclar: sirala(biriTutan), oneriler: [] };

  /* 3. kademe: yazım hatası olabilir. */
  return { bos: false, sonuclar: [], oneriler: oneriBul(ogeler, metin) };
}

/** Sonuç bulunamadığında en yakın başlıklar. Eşiğin altındakiler elenir. */
function oneriBul<T extends AranabilirOge>(ogeler: T[], metin: string): T[] {
  const sorgu = ucluler(katla(metin).replace(/\s+/g, ' ').trim());
  if (!sorgu.size) return [];
  return ogeler
    .map((o) => ({ o, p: benzerlik(sorgu, ucluler(katla(o.label))) }))
    .filter((x) => x.p >= ONERI_ESIGI)
    .sort((a, b) => b.p - a.p)
    .slice(0, ONERI_ADEDI)
    .map((x) => x.o);
}
