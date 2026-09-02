/**
 * Kabuk üstü pencereleri dışarıdan açmanın ucu.
 *
 * ─── NEDEN AYRI DOSYA ───────────────────────────────────────────────────────
 * Bileşen dosyası bileşen DIŞINDA bir şey de dışa verdiğinde Vite'ın hızlı
 * yenilemesi çalışmıyor (react-refresh/only-export-components). Sabitler
 * burada duruyor.
 *
 * ─── NEDEN OLAY, DURUM DEĞİL ────────────────────────────────────────────────
 * Açık/kapalı durumunu kabuğa taşımak, odak geri verme ve klavye kısayolunu
 * da oraya taşımak demekti. Olayla, bu üçü pencerenin kendi içinde kalıyor;
 * kabuk yalnızca "aç" diyor.
 */

export const PALET_OLAY = 'tarpo-palet-ac';
export const paletiAc = () => window.dispatchEvent(new CustomEvent(PALET_OLAY));

export const ASISTAN_OLAY = 'tarpo-asistan-ac';
export const asistaniAc = () => window.dispatchEvent(new CustomEvent(ASISTAN_OLAY));
