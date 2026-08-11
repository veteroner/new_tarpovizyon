import { StatusBar, Style } from '@capacitor/status-bar';
import { isPlatform } from '../utils/platform';

/**
 * Durum çubuğu — açık tema.
 *
 * ─── DİKKAT: İSİMLER TERS OKUNUYOR ──────────────────────────────────────────
 * Capacitor'da `Style.Dark` = "koyu ZEMİN için AÇIK yazı", `Style.Light` =
 * "açık ZEMİN için KOYU yazı" (paketin kendi tanımı: "Light text for dark
 * backgrounds").
 *
 * Burada `Style.Dark` yazıyordu: uygulama koyu temayken doğruydu, açık temaya
 * geçince saat/pil BEYAZ kalıp beyaz zeminde görünmez oluyordu.
 */
export async function initStatusBar() {
  if (!isPlatform('capacitor')) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });

    // Android-specific: set background color
    if (isPlatform('android')) {
      // Uygulamanın zeminiyle aynı; eskiden koyu lacivertti.
      await StatusBar.setBackgroundColor({ color: '#f2f2f7' });
    }

    // Don't overlay content
    await StatusBar.setOverlaysWebView({ overlay: false });

    console.log('[StatusBar] Yapılandırıldı');
  } catch (e) {
    console.warn('[StatusBar] Hata:', e);
  }
}
