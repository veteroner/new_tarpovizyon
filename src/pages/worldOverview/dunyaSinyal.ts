/**
 * Dünya panosu — ülkelerin tarımında ne olduğu.
 *
 * ─── NE SORUYOR ─────────────────────────────────────────────────────────────
 * "Ukrayna'da buğday üretimi ne oldu, Kazakistan neye yöneldi, ABD hangi
 * üründen çekiliyor." Türkiye panosundan farkı kapsam değil SORU: orası
 * "bizde neyde sorun var" diyor, burası "başkaları ne yapıyor".
 *
 * ─── EŞİK, SERİNİN KENDİ GEÇMİŞİNDEN ────────────────────────────────────────
 * Türkiye bitkisel üretim kuralında öğrenilen aynı ders burada da geçerli ve
 * daha da keskin: ülkeler birbirinden çok farklı oynuyor. Çin'in buğdayı
 * yıllık %0,8 oynuyor, Kazakistan'ınki %17. Sabit bir eşik ya Çin'de her yılı
 * "olay" ilan eder ya Kazakistan'da hiçbir şey görmez.
 *
 * Bu yüzden eşik her ÜLKE × ÜRÜN serisinin kendi medyanının katı. Ayrıca
 * MUTLAK TABAN var: seri ne kadar durgun olursa olsun %5'in altındaki bir
 * değişim haber sayılmıyor. Taban olmasaydı "Çin buğday üretimi %2,6 arttı"
 * satırı kritik diye görünürdü — teknik olarak kendi normalinin üç katı ama
 * kimseye bir şey anlatmıyor.
 *
 * ─── FAO BÖLGE SATIRLARI ────────────────────────────────────────────────────
 * FAO tabloları ülkelerle BÖLGELERİ aynı sütunda tutuyor: "World", "Asia",
 * "Europe", "Eastern Europe"… Süzülmezse pano "Asya'da buğday üretimi arttı"
 * gibi ülke olmayan bir özneyle konuşur, üstelik ülkeler ikinci kez sayılır.
 * Bu yüzden ülkeler ADLARIYLA seçili; bölge satırları listeye hiç girmiyor.
 * Aynı sebeple "China" değil "China, mainland" kullanılıyor — ilki Tayvan,
 * Hong Kong ve Makao'yu da içeren bir toplam.
 */

/** Sinyalin neyi anlattığı — üretim mi, dış ticaret mi. */
export type SinyalTuru = 'uretim' | 'ithalat' | 'ihracat';

export type DunyaSinyal = {
  id: string;
  tur: SinyalTuru;
  ulke: string;
  urun: string;
  /** Yıllık % değişim. */
  degisim: number;
  /** Bu serinin olağan yıllık oynaması (%). */
  tipik: number;
  /** Değişim, olağanın kaç katı. */
  kat: number;
  yil: number;
  /** Artış mı azalış mı — renk ve söz buradan. */
  yon: 'artis' | 'azalis';
};

/** Değişim, kendi olağanının kaç katı olursa haber olur. */
export const KAT_ESIK = 1.5;

/** Seri ne kadar durgun olursa olsun bu yüzdenin altı haber değil. */
export const MUTLAK_TABAN = 5;

/** Kendi eşiğini hesaplamak için gereken en az yıl sayısı. */
const ASGARI_YIL = 6;

/**
 * İzlenen ülkeler — FAO'daki adlarıyla, ekranda görünecek Türkçe karşılığıyla.
 *
 * Liste Türkiye'nin tarım ticaretinde karşılaştığı ülkelerden seçildi: tahıl
 * ve yağlı tohumda tedarikçiler (Rusya, Ukrayna, Kazakistan, Arjantin), büyük
 * üreticiler (ABD, Çin, Hindistan, Brezilya) ve rakip/komşu pazarlar.
 */
export const ULKELER: { fao: string; ad: string }[] = [
  { fao: 'Ukraine', ad: 'Ukrayna' },
  { fao: 'Russian Federation', ad: 'Rusya' },
  { fao: 'Kazakhstan', ad: 'Kazakistan' },
  { fao: 'United States of America', ad: 'ABD' },
  { fao: 'China, mainland', ad: 'Çin' },
  { fao: 'India', ad: 'Hindistan' },
  { fao: 'Brazil', ad: 'Brezilya' },
  { fao: 'Argentina', ad: 'Arjantin' },
  { fao: 'France', ad: 'Fransa' },
  { fao: 'Germany', ad: 'Almanya' },
  { fao: 'Poland', ad: 'Polonya' },
  { fao: 'Canada', ad: 'Kanada' },
  { fao: 'Australia', ad: 'Avustralya' },
  { fao: 'Egypt', ad: 'Mısır' },
  { fao: 'Iran (Islamic Republic of)', ad: 'İran' },
];

/** İzlenen ürünler — FAO adı ve Türkçesi. */
export const URUNLER: { fao: string; ad: string }[] = [
  { fao: 'Wheat', ad: 'Buğday' },
    /* Ülke listesinde de "Mısır" var; bitki tarımsal adıyla ayrıldı,
     yoksa "Mısır · Mısır üretimi" gibi bir satır çıkıyordu. */
  { fao: 'Maize (corn)', ad: 'Dane mısır' },
  { fao: 'Barley', ad: 'Arpa' },
  { fao: 'Sunflower seed', ad: 'Ayçiçeği' },
  { fao: 'Soya beans', ad: 'Soya' },
  { fao: 'Rice', ad: 'Çeltik' },
];

/**
 * Ülke × ürün serisinden sinyal üretir; yoksa null.
 *
 * Üretim, ithalat ve ihracat aynı kuralı paylaşıyor: hepsi ülkenin kendi
 * geçmiş oynaklığına göre ölçülüyor. Ayrı işlevler yazmak, aynı eşiğin üç
 * yerde ayrı ayrı sürüklenmesi demek olurdu.
 */
export function seriSinyali(
  tur: SinyalTuru, ulke: string, urun: string, yilDeger: [number, number][],
): DunyaSinyal | null {
  const sirali = [...yilDeger].sort((a, b) => a[0] - b[0]);
  const degisimler: number[] = [];
  for (let i = 1; i < sirali.length; i += 1) {
    const onceki = sirali[i - 1][1];
    if (onceki > 0) degisimler.push(((sirali[i][1] - onceki) / onceki) * 100);
  }
  if (degisimler.length < ASGARI_YIL) return null;

  const son = degisimler[degisimler.length - 1];
  if (Math.abs(son) < MUTLAK_TABAN) return null;

  /* Son değişim eşiğin hesabına KATILMIYOR: kendi kendini normalleştiren bir
     eşik, büyük şoku "demek ki normalmiş" diye eleyebilirdi. */
  const gecmis = degisimler.slice(0, -1).map(Math.abs).sort((a, b) => a - b);
  if (!gecmis.length) return null;
  const orta = Math.floor(gecmis.length / 2);
  const tipik = gecmis.length % 2 ? gecmis[orta] : (gecmis[orta - 1] + gecmis[orta]) / 2;
  if (!tipik) return null;

  const kat = Math.abs(son) / tipik;
  if (kat < KAT_ESIK) return null;

  return {
    id: `${tur}-${ulke}-${urun}`,
    tur,
    ulke,
    urun,
    degisim: son,
    tipik,
    kat,
    yil: sirali[sirali.length - 1][0],
    yon: son >= 0 ? 'artis' : 'azalis',
  };
}

/** Dikkat çekiciden sıradana: kendi olağanının kaç katı olduğuna göre. */
export const sirala = (s: DunyaSinyal[]): DunyaSinyal[] =>
  [...s].sort((a, b) => b.kat - a.kat);

/** Ekranda kullanılan söz — tür ve yöne göre. */
export const SINYAL_SOZU: Record<SinyalTuru, { artis: string; azalis: string }> = {
  uretim: { artis: 'üretimi arttı', azalis: 'üretimi düştü' },
  ithalat: { artis: 'ithalatını artırdı', azalis: 'ithalatını azalttı' },
  ihracat: { artis: 'ihracatını artırdı', azalis: 'ihracatını azalttı' },
};

/**
 * Dış ticarette izlenen ürünler — FAO gıda denge tablosundaki adlarıyla.
 *
 * Bu tablonun 2023 yılı BOZUKTU: 16.319 ülke×ürün çifti iki kez yazılmıştı
 * (2022 satırları 2023 damgasıyla yüklenmiş). FAO'nun kendi bulk dosyasıyla
 * 380 çift üzerinde karşılaştırılıp düzeltildi; alt id'li satırın 2022 olduğu
 * 380/380 doğrulandı. Düzeltmeden önce her ülke ithalatını %75–1300 artırmış
 * görünüyordu.
 */
export const TICARET_URUNLERI: { fao: string; ad: string }[] = [
  { fao: 'Bovine Meat', ad: 'Sığır eti' },
  { fao: 'Poultry Meat', ad: 'Kanatlı eti' },
  { fao: 'Milk - Excluding Butter', ad: 'Süt' },
  { fao: 'Wheat and products', ad: 'Buğday' },
  { fao: 'Maize and products', ad: 'Dane mısır' },
];
