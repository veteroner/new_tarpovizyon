/**
 * Grafik renkleri — tek kaynak.
 *
 * Renkler CSS token'ından okunuyor (styles/dataviz-tokens.css). Recharts
 * `fill`/`stroke`'u SVG ÖZNİTELİĞİ olarak basıyor ve tarayıcı orada da
 * `var()` çözüyor — tarayıcıda doğrulandı. Böylece tema değişince grafikler
 * de değişiyor; JS'te renk kopyası tutmuyoruz.
 *
 * ─── NEDEN TOKEN ────────────────────────────────────────────────────────────
 * Kategorik palet YEDİ ayrı dosyada, her biri farklı sırada tanımlıydı; aynı
 * ürün iki sayfada iki farklı renkteydi. Ayrıca eski palet renk körlüğü
 * testinden geçmiyordu (#f59e0b ↔ #22c55e, protanopide ΔE 5.7; eşik 8).
 * Buradaki sıra dataviz doğrulayıcısıyla iki modda da doğrulandı.
 */

/** Kategorik seriler — SABİT SIRA. Döngüye sokma; 9. seri "Diğer" olmalı. */
export const SERIES = [
  'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
  'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)',
] as const;

/**
 * Sıradaki seri rengi.
 *
 * Palet biterse renk ÜRETMİYOR, nötr tona düşüyor: dokuzuncu bir hue uydurmak
 * hem renk körlüğü ayrımını hem de "renk varlığa bağlıdır" kuralını bozar.
 * Bu durumda seriyi azalt veya küçük çoklu grafiğe böl.
 */
export const seriesColor = (i: number): string =>
  i < SERIES.length ? SERIES[i] : 'var(--viz-muted)';

/** Tek ölçülü çubuk grafiğin rengi — her çubuk aynı. */
export const BAR_COLOR = 'var(--series-1)';

/** Öne çıkarılan öğe (genelde Türkiye); diğerleri BAR_MUTED. */
export const BAR_HIGHLIGHT = 'var(--viz-highlight)';
export const BAR_MUTED = 'var(--viz-muted)';

/** Türkiye satırını vurgular, diğerlerini tek renk bırakır. */
export const barFill = (ad: unknown): string =>
  /türkiye|turkey/i.test(String(ad ?? '')) ? BAR_HIGHLIGHT : BAR_COLOR;

/** Durum renkleri — kategorik yuvalarla ASLA değiştirilmez, ikon/etiketle gelir. */
export const STATUS = {
  iyi: 'var(--viz-good)',
  uyari: 'var(--viz-warning)',
  ciddi: 'var(--viz-serious)',
  kritik: 'var(--viz-critical)',
} as const;

/** Izgara ve eksen — grafiğin verisiyle yarışmayacak kadar soluk. */
export const GRID = 'var(--viz-grid)';
export const AXIS = 'var(--viz-axis)';
