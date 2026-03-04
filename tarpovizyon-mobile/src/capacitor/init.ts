import { initSplash } from './splash';
import { initStatusBar } from './statusbar';
import { initOneSignal } from './push';
import { initAppListeners } from './app';
import { isPlatform } from '../utils/platform';

/**
 * Tüm Capacitor native servislerini başlatır.
 * Web'de çalışırken graceful degrade eder.
 */
export async function initCapacitor() {
  if (!isPlatform('capacitor')) {
    console.log('[Capacitor] Web ortamında çalışıyor, native servisler atlanıyor');
    return;
  }

  try {
    // Sırasıyla başlat
    await initStatusBar();
    await initSplash();
    initOneSignal();
    initAppListeners();
    
    console.log('[Capacitor] Tüm native servisler başlatıldı');
  } catch (error) {
    console.error('[Capacitor] Başlatma hatası:', error);
  }
}
