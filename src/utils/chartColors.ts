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

/**
 * Sekizden fazla kategoriyi "Diğer"e katlar.
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * Pro sayfalarında kategorik palet 13 ayrı dosyada kopyalanmış, biri 20
 * renkliydi ve hepsi DÖNGÜSEL kullanılıyordu (`COLORS[i % COLORS.length]`).
 * Ölçüldü: eski palette 3. ve 4. seri deuteranopide ΔE 5,5 (eşik 8), en yakın
 * çift ΔE 2,1 — pratikte aynı renk. On dilimlik bir pastada bunların üçü bir
 * aradaydı.
 *
 * Dokuzuncu bir renk ÜRETMEK çözüm değil: hue ekledikçe ayrım daralır. Doğru
 * cevap seriyi azaltmak. Bu yardımcı büyük olanları bırakıp gerisini tek
 * kalemde toplar — pasta da okunur olur, palet de tükenmez.
 */
export function topNvediger<T extends Record<string, unknown>>(
  satirlar: T[],
  deger: (r: T) => number,
  n = 7,
  digerAd = 'Diğer',
  adAlan: keyof T = 'name' as keyof T,
): T[] {
  if (satirlar.length <= n + 1) return satirlar;
  const sirali = [...satirlar].sort((a, b) => deger(b) - deger(a));
  const bas = sirali.slice(0, n);
  const kuyruk = sirali.slice(n);
  const toplam = kuyruk.reduce((t, r) => t + deger(r), 0);
  /* "Diğer" ilk satırın şeklini taşıyor ki grafik aynı alanları okuyabilsin. */
  const diger = { ...sirali[0], [adAlan]: `${digerAd} (${kuyruk.length})` } as T;
  const anahtar = Object.keys(sirali[0]).find((k) => deger(sirali[0]) === (sirali[0] as Record<string, unknown>)[k]);
  if (anahtar) (diger as Record<string, unknown>)[anahtar] = toplam;
  return [...bas, diger];
}
