import { initStatusBar } from './statusbar';
import { hideSplash } from './splash';
import { initAppListeners } from './app';
import { isPlatform } from '../utils/platform';

/**
 * Master Capacitor Initializer
 * 
 * Call once at app startup (main.tsx).
 * Initializes all native services in correct order.
 */
export async function initCapacitor() {
  if (!isPlatform('capacitor')) {
    console.log('[Capacitor] Web ortamında çalışıyor, native init atlanıyor');
    return;
  }

  console.log('[Capacitor] Native init başlıyor...');

  try {
    // 1. Status bar configuration
    await initStatusBar();

    // 2. Hide splash screen
    await hideSplash();

    // 3. App lifecycle listeners (back button, deep links, state changes)
    initAppListeners();

    // 4. Add mobile-app + mobile-native classes to html element for mobile-specific CSS
    document.documentElement.classList.add('mobile-app');
    document.documentElement.classList.add('mobile-native');

    console.log('[Capacitor] Native init tamamlandı ✓');
  } catch (e) {
    console.error('[Capacitor] Init hatası:', e);
  }
}
