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
