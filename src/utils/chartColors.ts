/**
 * Çubuk grafik renkleri.
 *
 * Grafiklerin çoğu her çubuğa paletten sırayla farklı renk veriyordu
 * (`COLORS[i % COLORS.length]`). Tek bir ölçüyü gösteren bir grafikte renk
 * HİÇBİR bilgi taşımıyor: eksen zaten kategoriyi yazıyor. Böyle kullanılan
 * renk gürültüdür — okuyucuya olmayan bir gruplama olduğunu düşündürür,
 * çubukların uzunluklarını karşılaştırmayı zorlaştırır ve renk körlüğü olan
 * kullanıcılar için ayırt edilemez bir gökkuşağı üretir.
 *
 * Doğrusu: tüm çubuklar tek renk, YALNIZCA dikkat çekilmek istenen çubuk
 * (genelde Türkiye) vurgu renginde. O zaman renk gerçekten bir şey söyler.
 *
 * Not: PASTA grafiklerinde durum farklı — orada her dilim ayrı kategoridir ve
 * dilimi adlandıran tek şey renktir. Paletli kullanım orada doğrudur.
 */
export const BAR_COLOR = '#3b82f6';
export const BAR_HIGHLIGHT = '#ef4444';

/** Türkiye satırını vurgular, diğerlerini tek renk bırakır. */
export const barFill = (ad: unknown): string =>
  /türkiye|turkey/i.test(String(ad ?? '')) ? BAR_HIGHLIGHT : BAR_COLOR;
