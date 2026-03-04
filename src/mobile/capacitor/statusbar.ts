import { StatusBar, Style } from '@capacitor/status-bar';
import { isPlatform } from '../utils/platform';

/**
 * Status Bar Configuration — Dark theme
 */
export async function initStatusBar() {
  if (!isPlatform('capacitor')) return;

  try {
    // Dark content style (light text on dark bg)
    await StatusBar.setStyle({ style: Style.Dark });

    // Android-specific: set background color
    if (isPlatform('android')) {
      await StatusBar.setBackgroundColor({ color: '#0A1628' });
    }

    // Don't overlay content
    await StatusBar.setOverlaysWebView({ overlay: false });

    console.log('[StatusBar] Yapılandırıldı');
  } catch (e) {
    console.warn('[StatusBar] Hata:', e);
  }
}
