import { StatusBar, Style } from '@capacitor/status-bar';
import { isPlatform } from '../utils/platform';

/**
 * Status bar ayarları.
 * Koyu tema, açık metin rengi.
 */
export async function initStatusBar() {
  if (!isPlatform('capacitor')) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    
    if (isPlatform('android')) {
      await StatusBar.setBackgroundColor({ color: '#0A1628' });
    }
    
    // Status bar'ı overlay yapma - content üstünde durmasın
    await StatusBar.setOverlaysWebView({ overlay: false });
    
    console.log('[StatusBar] Ayarlandı');
  } catch (error) {
    console.warn('[StatusBar] Hata:', error);
  }
}

export async function setStatusBarColor(color: string) {
  if (!isPlatform('capacitor')) return;
  
  try {
    if (isPlatform('android')) {
      await StatusBar.setBackgroundColor({ color });
    }
  } catch (error) {
    console.warn('[StatusBar] Renk değiştirme hatası:', error);
  }
}
