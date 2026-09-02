/**
 * Komut paletini dışarıdan açmanın ucu.
 *
 * Ayrı dosyada, çünkü `KomutPaleti.tsx` bileşen dışında bir şey de dışa
 * verdiğinde Vite'ın hızlı yenilemesi (fast refresh) çalışmıyor
 * (react-refresh/only-export-components).
 *
 * Durumu kabuğa taşımak yerine olay: açılma/kapanma, odak geri verme ve
 * klavye kısayolu tek yerde — bileşenin içinde — kalıyor. Kabuk yalnızca
 * `paletiAc()` çağırıyor.
 */
export const PALET_OLAY = 'tarpo-palet-ac';

export const paletiAc = () => window.dispatchEvent(new CustomEvent(PALET_OLAY));
