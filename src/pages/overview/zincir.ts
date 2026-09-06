/**
 * Aktarım zinciri — yem bitkisi fiyatından gıda enflasyonuna.
 *
 * ─── NEDEN BU DOSYA VAR ─────────────────────────────────────────────────────
 * "Yem fiyatı arttı → et pahalanır → gıda enflasyonu yükselir" cümlesi kolayca
 * kurulur ve kulağa analiz gibi gelir. Nedensellik zinciri, uydurmayı analiz
 * kılığına sokmanın en kolay yoludur: hiçbir sayı görmeden yazılabilir, üstelik
 * ikna edici çıkar.
 *
 * Bu yüzden buradaki HER halka veriyle sınandı. Sınamayı geçmeyen halkalar
 * kodda YOK — aşağıda hangileri olduğu ve neden elendikleri de yazılı, çünkü
 * elenen bir halkayı sessizce çıkarmak, hiç sınamamakla aynı kapıya çıkar.
 *
 * ─── YÖNTEM ─────────────────────────────────────────────────────────────────
 * 1. Bütün seriler AYLIK ve YILLIK % DEĞİŞİM olarak alındı (mevsimsellik gider).
 * 2. Her seriden GENEL TÜFE'nin yıllık değişimi ÇIKARILDI. Yüksek enflasyonda
 *    her seri her seriyle korelasyon verir, çünkü hepsi enflasyonu taşır;
 *    ortak enflasyon çıkarılmadan ölçülen ilişki sahte olur. Buradaki bütün
 *    değerler bu yüzden "genel TÜFE üzeri puan".
 * 3. Gecikmeli korelasyon: 0–15 ay arası taranıp tepe noktası bulundu.
 * 4. YANLIŞLAMA: aynı test yemde KULLANILMAYAN ürünlerle tekrarlandı.
 * 5. YÖN: aynı test ters yönde de yapıldı.
 *
 * ─── ÖLÇÜM (Eylül 2026, D1 canlı veri) ──────────────────────────────────────
 * Halka 1 — yem bitkisi fiyat endeksi → yem fiyatı
 *   Bileşik → kanatlı yemi   β=0,82  r=+0,95  gecikme 0 ay  n=67
 *   Bileşik → süt yemi       β=0,62  r=+0,90  gecikme 0 ay  n=67
 *   Yanlışlama: yem bitkileri ortalama |r|=0,84; yemde kullanılmayan
 *   15 üründe |r|=0,38. Ayrım net.
 *
 * Halka 2 — yem fiyatı → üretim maliyeti
 *   kanatlı  β=0,99  r=+0,89  gecikme 1 ay  n=126
 *   süt      β=0,72  r=+0,68  gecikme 0 ay  n=91
 *
 * Halka 3 — üretim maliyeti → üretici fiyatı (GEÇİŞKENLİK)
 *   kanatlı  β=0,73  r=+0,57  gecikme 0 ay  n=112
 *   süt      β=0,98  r=+0,82  gecikme 0 ay  n=92
 *   Yani sütte maliyet artışı fiyata neredeyse tamamen yansıyor (USK tavsiye
 *   fiyatı maliyeti takip ediyor); kanatlıda dörtte biri üreticide kalıyor.
 *
 * Halka 4 — üretici fiyatı → gıda enflasyonu
 *   kanatlı üretici  r=+0,54  tepe 6 ay   n=105
 *   çiğ süt tavsiye  r=+0,72  tepe 7 ay   n=84
 *   Yön sınaması: ters yönde (gıda enflasyonu → üretici fiyatı) korelasyon
 *   0. aydan itibaren monoton çöküyor (+0,34 → −0,56). Yön kesin.
 *
 * UÇTAN UCA — bileşik yem bitkisi baskısı → gıda enflasyonu
 *   β=0,16  r=+0,91  tepe 11 ay  n=56
 *   Gecikme profili 0. ayda +0,37'den 11. ayda +0,91'e monoton tırmanıp
 *   sonra düşüyor. 2021-06…2023-06 şok dönemi çıkarıldığında da duruyor
 *   (r=+0,87…+0,90, n=29).
 *   KONTROL: yemde kullanılmayan sebzelerden kurulan bileşik, gıda
 *   enflasyonuyla 0. AYDA tepe yapıyor (r=+0,78) ve sönüyor — sebzeler zaten
 *   gıda sepetinin içinde, öncü değiller. Yem bitkilerinin ~1 yıllık
 *   öncülüğü buradan geliyor: hayvancılık zincirini kat etmek zaman alıyor.
 *
 * ─── SINAMAYI GEÇEMEYEN, BU YÜZDEN BURADA OLMAYAN HALKALAR ──────────────────
 * • kârlılık → arz.  "Kârlılık düştü, arz daralır" beklenen halkaydı.
 *   Süt kârlılığı ile aylık toplanan inek sütü (yıllık % değişim) arasında
 *   0–18 ay taramasında en yüksek |r| yalnızca 0,34, üstelik TERS işaretli.
 *   Bağ yok; cümle kurulmadı.
 * • buğday fiyatı → makarnalık (durum) buğday ticareti.  "Buğdayda sorun
 *   olursa makarnacı etkilenir" halkası: ithalatta r=+0,07, ihracatta
 *   r=−0,28. Ayrıca D1'de makarna (işlenmiş ürün) dış ticareti hiç yok,
 *   yalnızca ham buğday var. Ölçülemeyen zincir kurulmadı.
 *
 * ─── ÇARPARAK DEĞİL, DOĞRUDAN ──────────────────────────────────────────────
 * Halkaların β'ları çarpılınca uçtan uca 0,058 çıkıyor; doğrudan ölçüm ise
 * 0,160 — üç katı. Sebebi ikili: her halkada ölçüm gürültüsü katsayıyı
 * aşağı çekiyor, ve yem bitkileri gıda sepetine yalnızca et/süt üzerinden
 * değil ekmek, yağ, şeker üzerinden de giriyor. Bu yüzden sayfadaki BÜYÜKLÜK
 * tahmini halkaların çarpımından değil, doğrudan ölçülen 0,16'dan geliyor.
 * Halkalar "nereden geçiyor" sorusunu yanıtlıyor, çarpım tablosu değil.
 */

/** Bileşiği oluşturan yem bitkileri — TÜİK T-ÜFE madde kodları. */
export const YEM_BITKILERI = [
  { maddekod: '01_11_1', ad: 'Buğday' },
  { maddekod: '01_11_2', ad: 'Mısır' },
  { maddekod: '01_11_31', ad: 'Arpa' },
  { maddekod: '01_11_81_00_00', ad: 'Soya fasulyesi' },
  { maddekod: '01_11_95', ad: 'Ayçiçeği tohumu' },
  /* Çiğit (pamuk çekirdeği) küspesi Türkiye'de temel protein yemi; TÜİK de
     soya/yerfıstığı/pamuk çekirdeğini aynı grupta (01_11_8) tutuyor. */
  { maddekod: '01_16_11_00_01', ad: 'Pamuk (çiğit)' },
] as const;

/** Uçtan uca ölçülen ilişki. Yukarıdaki ÖLÇÜM bölümüne bakınız. */
export const UCTAN_UCA = {
  beta: 0.16,
  r: 0.91,
  gecikmeAy: 11,
  n: 56,
} as const;

export type Halka = {
  id: string;
  /** Bu halkanın çıkışındaki ölçü — kullanıcıya gösterilen düğüm. */
  baslik: string;
  /** Kısa açıklama: bu ölçü neyi anlatıyor. */
  aciklama: string;
  /** Bir önceki halkadan bu halkaya geçişin ölçülen gücü. Baş halkada yok. */
  gecis?: { beta: number; r: number; gecikmeAy: number; n: number };
  /** Kanıt sayfası. */
  yol?: string;
};

/**
 * Zincirin iskeleti. Değerler çalışma anında ölçülüp `ZincirDugum`e dönüşüyor;
 * burada duran şey ilişkilerin KENDİSİ, ölçüler değil.
 */
/*
 * ─── KANATLI KOLU KALDIRILDI ────────────────────────────────────────────────
 * Burada ikinci bir zincir daha vardı: yem bitkisi → kanatlı yemi → maliyet →
 * üretici fiyatı → gıda enflasyonu. Ölçümleri sütünkinden GÜÇLÜYDÜ
 * (β=0,82 r=0,95; β=0,99 r=0,89; β=0,73 r=0,57).
 *
 * Kaldırılma sebebi ölçüm değil kaynak: kanatlı ve yumurta maliyet-fiyat
 * tabloları elle besleniyordu ve o veriye erişim kalmadı. Beslenmeyen seriyle
 * "şu an şöyle" demek, donmuş sayıyı bugünün durumu diye sunmak olurdu.
 *
 * Uçtan uca projeksiyon ETKİLENMEDİ: o, yem bitkisi baskısı ile gıda
 * enflasyonu arasında DOĞRUDAN ölçülen ilişkiden geliyor (β=0,16 r=0,91) ve
 * kanatlı serilerine hiç dokunmuyor. Ölçümler yukarıdaki yorumda duruyor;
 * veri geri gelirse zincir yeniden kurulabilir.
 */
export const SUT_ZINCIRI: Halka[] = [
  {
    id: 'yem-bitkisi',
    baslik: 'Yem bitkisi fiyatları',
    aciklama: 'Buğday, mısır, arpa, soya, ayçiçeği ve çiğit üretici fiyatlarının ortalaması.',
    yol: '/tarpovizyon/turkey/price-index',
  },
  {
    id: 'yem-fiyati',
    baslik: 'Süt yemi fiyatı',
    aciklama: '19 HP süt yeminin kilogram fiyatı.',
    gecis: { beta: 0.62, r: 0.90, gecikmeAy: 0, n: 67 },
    yol: '/tarpovizyon/turkey/milk',
  },
  {
    id: 'maliyet',
    baslik: 'Üretim maliyeti',
    aciklama: 'Litre başına çiğ süt maliyeti.',
    gecis: { beta: 0.72, r: 0.68, gecikmeAy: 0, n: 91 },
    yol: '/tarpovizyon/turkey/milk',
  },
  {
    id: 'uretici-fiyati',
    baslik: 'Çiğ süt fiyatı',
    aciklama: 'USK tavsiye fiyatı maliyeti neredeyse tamamen takip ediyor.',
    gecis: { beta: 0.98, r: 0.82, gecikmeAy: 0, n: 92 },
    yol: '/tarpovizyon/turkey/milk',
  },
  {
    id: 'gida-enflasyonu',
    baslik: 'Market gıda fiyatları',
    aciklama: 'TÜFE gıda ve alkolsüz içecekler kalemi.',
    gecis: { beta: 0.18, r: 0.72, gecikmeAy: 7, n: 84 },
    yol: '/tarpovizyon/turkey/price-index',
  },
];

/* ── Seri aritmetiği ──────────────────────────────────────────────────────── */

/** Ay anahtarı → değer. Anahtar biçimi 'YYYY-MM' (sıralanabilir). */
export type AySerisi = Record<string, number>;

/** Yıllık % değişim. Aynı ayın bir önceki yılına göre — mevsimsellik gider. */
export function yillikDegisim(s: AySerisi): AySerisi {
  const cikti: AySerisi = {};
  for (const [anahtar, deger] of Object.entries(s)) {
    const [yil, ay] = anahtar.split('-');
    const oncekiAnahtar = `${Number(yil) - 1}-${ay}`;
    const onceki = s[oncekiAnahtar];
    if (onceki) cikti[anahtar] = ((deger - onceki) / onceki) * 100;
  }
  return cikti;
}

/**
 * Genel TÜFE'nin üzerindeki fazla.
 *
 * Zincirin tamamı bu ölçüyle çalışıyor: "yem %60 arttı" tek başına bir şey
 * söylemiyor, genel enflasyon da %58 ise. Anlamlı olan aradaki fark.
 */
export function tufeUzeriFazla(degisim: AySerisi, tufeDegisim: AySerisi): AySerisi {
  const cikti: AySerisi = {};
  for (const [anahtar, deger] of Object.entries(degisim)) {
    const genel = tufeDegisim[anahtar];
    if (genel != null) cikti[anahtar] = deger - genel;
  }
  return cikti;
}

/** Birden çok serinin ortak aylardaki ortalaması. Ortak ay yoksa boş döner. */
export function bilesikOrtalama(seriler: AySerisi[]): AySerisi {
  if (!seriler.length) return {};
  let ortak = new Set(Object.keys(seriler[0]));
  for (const s of seriler.slice(1)) ortak = new Set([...ortak].filter((k) => k in s));
  const cikti: AySerisi = {};
  for (const anahtar of ortak) {
    cikti[anahtar] = seriler.reduce((t, s) => t + s[anahtar], 0) / seriler.length;
  }
  return cikti;
}

/** Serinin en son ayı ve değeri. */
export function sonAy(s: AySerisi): { ay: string; deger: number } | null {
  const anahtarlar = Object.keys(s).sort();
  const son = anahtarlar.at(-1);
  return son ? { ay: son, deger: s[son] } : null;
}

/** 'YYYY-MM' anahtarına ay ekler. */
export function ayEkle(anahtar: string, ay: number): string {
  const [y, a] = anahtar.split('-').map(Number);
  const toplam = a + ay;
  const yil = y + Math.floor((toplam - 1) / 12);
  const kalan = ((toplam - 1) % 12) + 1;
  return `${yil}-${String(kalan).padStart(2, '0')}`;
}

const AY_ADI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** '2027-06' → 'Haziran 2027'. */
export function ayYaz(anahtar: string): string {
  const [y, a] = anahtar.split('-').map(Number);
  return `${AY_ADI[a - 1] ?? ''} ${y}`.trim();
}

/* ── Sonuç tipi ───────────────────────────────────────────────────────────── */

export type ZincirDugum = Halka & {
  /** Genel TÜFE üzeri puan; ölçülemiyorsa null. */
  deger: number | null;
  /** Ölçünün ayı. */
  ay: string | null;
};

export type Yansima = {
  /** Bugünkü yem bitkisi baskısı (TÜFE üzeri puan). */
  bugun: number;
  /** Ölçünün ayı. */
  ay: string;
  /** Tarihsel ilişkiye göre gıda enflasyonuna beklenen etki (puan). */
  etki: number;
  /** Etkinin denk geldiği ay. */
  hedefAy: string;
};

/**
 * Uçtan uca yansıma.
 *
 * Bilerek TEK bir sayı üretiyor ve o sayı doğrudan ölçülen katsayıdan geliyor.
 * Halkaların çarpımı kullanılsaydı büyüklük üçte birine inerdi (dosya başındaki
 * "ÇARPARAK DEĞİL" notu).
 */
export function yansima(bilesik: AySerisi): Yansima | null {
  const son = sonAy(bilesik);
  if (!son) return null;
  return {
    bugun: son.deger,
    ay: son.ay,
    etki: son.deger * UCTAN_UCA.beta,
    hedefAy: ayEkle(son.ay, UCTAN_UCA.gecikmeAy),
  };
}

/**
 * Yansımanın aciliyeti.
 *
 * Eşik, keyfi bir yüzde değil, ölçünün kendi anlamından: sıfır doğal eşik
 * (gıda enflasyonu genelin üzerine çıkıyor mu, çıkmıyor mu). Üstündeki iki
 * kademe büyüklük içindir — 1 ve 3 puan, gıda enflasyonunun genel TÜFE'den
 * tarihsel sapmasının yarısı ve bir buçuk katı mertebesinde.
 */
export type YansimaSeviye = 'kritik' | 'uyari' | 'izle' | 'iyi';

export function yansimaSeviye(etki: number): YansimaSeviye {
  if (etki >= 3) return 'kritik';
  if (etki >= 1) return 'uyari';
  if (etki > 0) return 'izle';
  return 'iyi';
}
