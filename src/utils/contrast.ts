/**
 * Zemin rengine göre okunur metin rengi.
 *
 * ─── NEDEN GEREKLİ ──────────────────────────────────────────────────────────
 * Renkli zemin üstüne yazı yazan iki yerde de aynı hata vardı: metin rengi
 * VERİYE göre seçiliyordu (ör. "korelasyon 0.4'ten büyükse beyaz yaz",
 * "yüzde payı %8'den büyükse beyaz yaz"). Ama zeminin koyuluğu veriyle aynı
 * şey değil — 0.4–0.7 aralığının zemini açık yeşil, %8'lik dilimin zemini
 * açık turuncu olabiliyor. Sonuç: beyaz üstüne beyaz, ölçülen kontrast 1.8:1.
 *
 * Burada karar zeminin KENDİ AÇIKLIĞINDAN veriliyor; paletteki renkler
 * değişse bile doğru kalıyor.
 */

/** sRGB kanalını doğrusallaştırır (WCAG relative luminance). */
const kanal = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** `#rgb`, `#rrggbb` veya `rgb(r,g,b)` biçimlerini kabul eder. */
function ayristir(renk: string): [number, number, number] | null {
  const s = renk.trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (h.length === 3) {
      return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16)) as [number, number, number];
    }
    if (h.length >= 6) {
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
    }
    return null;
  }
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/** Rengin WCAG bağıl parlaklığı (0–1). Çözümlenemezse null. */
export function parlaklik(renk: string): number | null {
  const rgb = ayristir(renk);
  if (!rgb) return null;
  return 0.2126 * kanal(rgb[0]) + 0.7152 * kanal(rgb[1]) + 0.0722 * kanal(rgb[2]);
}

/**
 * Verilen zeminde okunur metin rengi.
 *
 * Beyaz yalnızca 4.5:1'i geçtiğinde seçiliyor (WCAG küçük metin sınırı);
 * aksi hâlde koyu metin. Çözümlenemeyen renkte koyu metne düşülüyor —
 * uygulamanın zemini açık olduğu için güvenli varsayılan bu.
 */
export function okunurMetin(zemin: string, koyu = 'var(--text-primary)'): string {
  const L = parlaklik(zemin);
  if (L === null) return koyu;
  return 1.05 / (L + 0.05) >= 4.5 ? '#fff' : koyu;
}
