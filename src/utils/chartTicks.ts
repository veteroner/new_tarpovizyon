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
