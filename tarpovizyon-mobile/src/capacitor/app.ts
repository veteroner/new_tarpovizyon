import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { isPlatform } from '../utils/platform';

/**
 * App Lifecycle & Deep Link Servisi
 * 
 * - Geri tuşu yönetimi (Android)
 * - Deep link dinleme (tarpovizyon://)
 * - App state değişiklikleri (foreground/background)
 * - App URL açma (universal links)
 */

export function initAppListeners() {
  if (!isPlatform('capacitor')) {
    console.log('[App] Web ortamında, lifecycle listener atlanıyor');
    return;
  }

  // Android geri tuşu
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      // Ana sayfadaysa uygulamadan çık
      App.exitApp();
    }
  });

  // App state değişiklikleri (foreground/background)
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('[App] State değişti:', isActive ? 'foreground' : 'background');
    
    if (isActive) {
      // Foreground'a gelince veriyi yenile
      document.dispatchEvent(new CustomEvent('app:resume'));
    } else {
      // Background'a gidince
      document.dispatchEvent(new CustomEvent('app:pause'));
    }
  });

  // Deep link / Universal link
  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('[App] URL açıldı:', event.url);
    
    // tarpovizyon://production/turkey gibi URL'leri parse et
    const url = new URL(event.url);
    const path = url.pathname || url.hostname;
    
    if (path) {
      // React Router'a yönlendir
      window.location.hash = path;
    }
  });

  console.log('[App] Lifecycle listener\'lar bağlandı');
}

/**
 * App'i minimize et (Android)
 */
export async function minimizeApp() {
  if (isPlatform('android')) {
    await App.minimizeApp();
  }
}

/**
 * App bilgilerini getir
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
