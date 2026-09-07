/**
 * Yüzde eksenleri için tick biçimlendirici.
 *
 * Recharts, `domain` dışına taşan veri gördüğünde alan sınırını verinin
 * gerçek uç değerine genişletiyor ve o tick'i HAM olarak basıyor. Bitkisel
 * üretim "Yıllık Trend" grafiğinde bu, sağ eksende "55.4216867469879"
 * yazmasına ve 317 px'lik grafiği 16 px taşırmasına yol açıyordu.
 *
 * Yüzde ekseninde ondalık hane bilgi taşımıyor; tam sayıya yuvarlıyoruz.
 * `unit="%"` işareti Recharts tarafından ayrıca ekleniyor.
 */
export const pctTick = (v: number): string =>
  Number.isFinite(v) ? String(Math.round(v)) : '';

/**
 * Çizgi grafikleri için Y ekseni alanı.
 *
 * Recharts'ın varsayılanı `[0, 'auto']` — yani her eksen 0'dan başlar. Çizgi
 * grafiğinde okuduğumuz şey EĞİM ve DEĞİŞİM; taban 0'a çakılınca %75-100
 * arasında gezinen bir yeterlilik serisi düz çizgiye dönüyor, grafiğin
 * dörtte üçü boş kalıyor.
 *
 * `['auto', 'auto']` Recharts'a veriye göre yuvarlak sınırlar seçtiriyor.
 *
 * DİKKAT — bu YALNIZCA çizgi grafikleri için. Çubuk ve alan grafiklerinde
 * uzunluk/dolgu değerin kendisini temsil ettiği için taban 0 olmak ZORUNDA;
 * kırpmak veriyi yanlış gösterir.
 */
export const LINE_Y_DOMAIN: [string, string] = ['auto', 'auto'];

/**
 * Kategori ekseni etiketlerini kısaltır.
 *
 * Yatay çubuk grafiklerinde (`layout="vertical"`) kategori ekseni 200 px'e
 * kadar genişletilmişti; 317 px'lik mobil grafikte çubuklara 117 px kalıyor,
 * grafik okunmaz oluyordu. Eksen genişliği 110 px'e sabitlendi — sığmayan
 * uzun adlar burada üç noktayla kesiliyor, tam ad tooltip'te görünüyor.
 */
export const truncTick = (v: unknown): string => {
  const s = String(v ?? '');
  return s.length > 14 ? s.slice(0, 13) + '…' : s;
};

/**
 * Çubuk ucundaki değer etiketi için kısa sayı.
 *
 * Eşikler ve son ekler `plantTypes.fmtShort` ile BİREBİR aynı tutuldu:
 * etiket ile eksen aynı sayıyı farklı yazarsa (ör. "1.2M" vs "1.200K")
 * okuyucu iki ayrı büyüklük görüyor sanır.
 */
export const compactValue = (v: number): string => {
  if (!Number.isFinite(v)) return '';
  const m = Math.abs(v);
  if (m >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (m >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (m >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v.toFixed(m < 10 && m % 1 !== 0 ? 1 : 0);
};

/**
 * Bir sayıyı YUKARI, "yuvarlak" bir değere tamamlar.
 *
 * 1 · 2 · 2,5 · 5 · 10 katlarına çıkıyor — insanların eksende görmeye alışkın
 * olduğu basamaklar. 154,338… → 200, 8,3 → 10, 0,047 → 0,05.
 *
 * Sıfır ve negatif olduğu gibi dönüyor: yukarı yuvarlamanın tanımı bu
 * durumlarda tartışmalı ve buradaki tek kullanım alanı (eksen tepe payı)
 * yalnızca pozitif değer görüyor.
 */
export function yuvarlakTavan(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return v;
  const basamak = 10 ** Math.floor(Math.log10(v));
  const oran = v / basamak;
  const adim = [1, 2, 2.5, 5, 10].find((a) => oran <= a + 1e-9) ?? 10;
  return adim * basamak;
}

/**
 * Yatay çubuk grafiklerinde sayısal eksene tepe payı.
 *
 * Değer etiketi çubuğun SAĞ ucunun dışına yazılıyor; en uzun çubuk çizim
 * alanının sonuna dayandığı için payı olmadan o etiket kırpılıyor.
 *
 * ─── NEDEN YUVARLANIYOR ─────────────────────────────────────────────────────
 * Üst sınır bir dönem düz `max * 1.18` idi ve Recharts alan sınırını EKSEN
 * ETİKETİ olarak basıyor: fiyat endeksi sayfasında eksenin ucunda
 * "154.3380999999999" yazıyordu (130,795… × 1,18). Bu, dosyanın başındaki
 * `pctTick` yorumunda anlatılan hatanın aynısı — orada tick biçimlendiricisiyle
 * çözülmüştü, ama biçimlendiricisi olmayan her eksende yeniden ortaya çıkıyor.
 *
 * Kalıcı çözüm biçimlendirmek değil, SINIRIN KENDİSİNİ yuvarlak seçmek: o
 * zaman etiket nasıl basılırsa basılsın temiz çıkıyor ve Recharts aradaki
 * tick'leri de düzgün aralıklarla yerleştirebiliyor.
 */
export const VALUE_HEADROOM: [number, (max: number) => number] =
  [0, (max: number) => yuvarlakTavan(max * 1.18)];
