/**
 * Makro ölçek — "geçen yıl düştü, bu yıl ne olur".
 *
 * ─── SORU VE DÜRÜST CEVABI ──────────────────────────────────────────────────
 * Soru bir tahmin istiyor. Tahmin üretmek kolay ve burada yapılmıyor: model
 * kurup "2026'da %8 artar" demek, dayanağı gösterilemeyen bir sayı üretmek
 * olurdu. Bunun yerine ÖLÇÜLEBİLİR olan söyleniyor: bu üründe geçmişte düşüş
 * yılını ne izlemiş, kaç kez, ortalama ne kadar.
 *
 * Aradaki fark küçük değil. "Artacak" bir kehanet; "son 23 yılda 10 kez düştü,
 * onunda da ertesi yıl ortalama %13 arttı" bir ölçüm — okuyucu buna katılmaz
 * da olur, ama neye baktığını bilir.
 *
 * ─── ÖLÇÜM (FAO, 2000-2024, 23 yıllık değişim) ──────────────────────────────
 * Yıllık değişimin bir yıl gecikmeli otokorelasyonu (r). Eksi olması "düşüşü
 * artış izliyor" demek — ortalamaya dönüş.
 *
 *   Ayçiçeği dünya  r=-0,65   düşüş sonrası +16,3% (9 kez)
 *   Ayçiçeği TR     r=-0,50   düşüş sonrası +14,5% (7)
 *   Buğday   TR     r=-0,49   düşüş sonrası  +5,6% (11)
 *   Arpa     TR     r=-0,44   düşüş sonrası +13,2% (10)
 *   Arpa     dünya  r=-0,33   düşüş sonrası  +3,6% (11)
 *   Buğday   dünya  r=-0,31   düşüş sonrası  +2,6% (9)
 *   Mısır    dünya  r=-0,28   düşüş sonrası  +6,7% (7)
 *   Soya     dünya  r=-0,21   düşüş sonrası  +5,5% (7)
 *   Mısır    TR     r=-0,14   örüntü zayıf
 *   Soya     TR     r=-0,05   ÖRÜNTÜ YOK
 *
 * Son ikisinde düşüş sonrası ve artış sonrası ortalamalar neredeyse aynı
 * (soya TR: +8,6% vs +12,3%) — yani geçen yılın yönü ertesi yıl hakkında
 * bilgi taşımıyor. Bunlar ekranda "örüntü yok" diye YAZILIYOR, gizlenmiyor:
 * zayıf ilişkiyi listeden çıkarmak, kalanların seçilmiş olduğunu saklardı.
 *
 * ─── DÜNYA TOPLAMI NEDEN AYRI ───────────────────────────────────────────────
 * Ülke üretimleri sert oynuyor ama dünya toplamı çok durgun: buğdayda tipik
 * yıllık oynama %2,0, mısırda %2,3. Bir ülkedeki kötü hasat başka ülkedeki
 * iyi hasatla kapanıyor. Bu yüzden dünya toplamının HAREKET ETTİĞİ ürün
 * gerçek bir küresel arz olayıdır — 2024'te ayçiçeği %10,4 düştü ve tipik
 * oynamasının 1,2 katı olduğu için tek başına ayrışıyor.
 */

/** Ortalamaya dönüş örüntüsünün "var" sayılması için gereken en düşük |r|. */
export const ORUNTU_ESIK = 0.3;

export type TekrarOruntusu = {
  /** Yıllık değişimin bir yıl gecikmeli otokorelasyonu. */
  r: number;
  /** Düşüş yıllarından SONRAKİ yılın ortalama değişimi (%). */
  dususSonrasi: number;
  /** Kaç kez düşüş gözlendi. */
  dususSayisi: number;
  /** Ölçümdeki toplam yıllık değişim sayısı. */
  n: number;
};

/**
 * Bir üretim serisinden tekrarlama örüntüsü çıkarır.
 *
 * Girdi ham üretim (yıl → miktar); yüzde değişime burada çevriliyor ki
 * çağıran taraf birim düşünmek zorunda kalmasın.
 */
export function tekrarOruntusu(yilDeger: [number, number][]): TekrarOruntusu | null {
  const sirali = [...yilDeger].sort((a, b) => a[0] - b[0]);
  const degisim: number[] = [];
  for (let i = 1; i < sirali.length; i += 1) {
    const onceki = sirali[i - 1][1];
    if (onceki > 0) degisim.push(((sirali[i][1] - onceki) / onceki) * 100);
  }
  if (degisim.length < 12) return null;

  const onceki = degisim.slice(0, -1);
  const sonraki = degisim.slice(1);
  const ort = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const mo = ort(onceki); const ms = ort(sonraki);
  const so = Math.sqrt(onceki.reduce((t, x) => t + (x - mo) ** 2, 0));
  const ss = Math.sqrt(sonraki.reduce((t, x) => t + (x - ms) ** 2, 0));
  if (!so || !ss) return null;
  const r = onceki.reduce((t, x, i) => t + (x - mo) * (sonraki[i] - ms), 0) / (so * ss);

  const dususSonrasi = sonraki.filter((_, i) => onceki[i] < 0);
  if (!dususSonrasi.length) return null;

  return {
    r,
    dususSonrasi: ort(dususSonrasi),
    dususSayisi: dususSonrasi.length,
    n: onceki.length,
  };
}

/** Örüntü, üzerine cümle kurulacak kadar güçlü mü. */
export const oruntuVar = (o: TekrarOruntusu | null): boolean =>
  o != null && o.r <= -ORUNTU_ESIK;

/** Makro ölçekte izlenen ürünler — FAO adı ve Türkçesi. */
export const MAKRO_URUNLER: { fao: string; ad: string }[] = [
  { fao: 'Wheat', ad: 'Buğday' },
  { fao: 'Barley', ad: 'Arpa' },
  { fao: 'Maize (corn)', ad: 'Dane mısır' },
  { fao: 'Sunflower seed', ad: 'Ayçiçeği' },
  { fao: 'Soya beans', ad: 'Soya' },
];

export type MakroSatir = {
  urun: string;
  /** Türkiye üretiminin son yıllık değişimi (%). */
  trDegisim: number | null;
  /** Dünya toplamının son yıllık değişimi (%). */
  dunyaDegisim: number | null;
  yil: number | null;
  /** Türkiye serisinin tekrarlama örüntüsü. */
  tr: TekrarOruntusu | null;
  /** Dünya toplamının tekrarlama örüntüsü. */
  dunya: TekrarOruntusu | null;
};
