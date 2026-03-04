import { SplashScreen } from '@capacitor/splash-screen';
import { isPlatform } from '../utils/platform';

/**
 * Splash Screen Management
 */
export async function hideSplash() {
  if (!isPlatform('capacitor')) return;

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
    console.log('[Splash] Gizlendi');
  } catch (e) {
    console.warn('[Splash] Hata:', e);
  }
}

export async function showSplash() {
  if (!isPlatform('capacitor')) return;

  try {
    await SplashScreen.show({
      autoHide: true,
      showDuration: 1000,
      fadeInDuration: 200,
      fadeOutDuration: 300,
    });
  } catch (e) {
    console.warn('[Splash] Gösterme hatası:', e);
  }
}
