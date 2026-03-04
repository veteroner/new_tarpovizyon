import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { isPlatform } from '../utils/platform';

/**
 * App Lifecycle & Deep Link Service
 * - Android back button handling
 * - Deep link listening (tarpovizyon://)
 * - App state changes (foreground/background)
 */

export function initAppListeners() {
  if (!isPlatform('capacitor')) {
    console.log('[App] Web ortamında, lifecycle listener atlanıyor');
    return;
  }

  // Android back button
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  // App state changes (foreground/background)
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('[App] State değişti:', isActive ? 'foreground' : 'background');

    if (isActive) {
      document.dispatchEvent(new CustomEvent('app:resume'));
    } else {
      document.dispatchEvent(new CustomEvent('app:pause'));
    }
  });

  // Deep link / Universal link
  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('[App] URL açıldı:', event.url);

    const url = new URL(event.url);
    const path = url.pathname || url.hostname;

    if (path) {
      window.location.hash = path;
    }
  });

  console.log('[App] Lifecycle listener\'lar bağlandı');
}

/**
 * Minimize app (Android)
 */
export async function minimizeApp() {
  if (isPlatform('android')) {
    await App.minimizeApp();
  }
}

/**
 * Get app info
 */
export async function getAppInfo() {
  if (!isPlatform('capacitor')) {
    return { version: '2.0.0-web', build: '0' };
  }

  try {
    const info = await App.getInfo();
    return {
      version: info.version,
      build: info.build,
      name: info.name,
      id: info.id,
    };
  } catch {
    return { version: '2.0.0', build: '7' };
  }
}
