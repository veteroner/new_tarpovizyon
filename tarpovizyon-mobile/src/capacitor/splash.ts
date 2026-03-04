import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Splash screen yönetimi.
 * Native splash gösterilir, React app hazır olunca kapatılır.
 * Eski uygulamadaki 6 saniyelik çift splash hatası tekrarlanmaz.
 */
export async function initSplash() {
  try {
    // React app mount olduğunda splash'ı kapat
    // 300ms fade-out ile yumuşak geçiş
    await SplashScreen.hide({
      fadeOutDuration: 300,
    });
    console.log('[Splash] Kapatıldı');
  } catch (error) {
    console.warn('[Splash] Hata:', error);
  }
}

/**
 * Splash'ı tekrar göstermek için (ör. arka plandan dönüşte)
 */
export async function showSplash() {
  try {
    await SplashScreen.show({
      autoHide: true,
      showDuration: 1000,
      fadeInDuration: 200,
      fadeOutDuration: 300,
    });
  } catch (error) {
    console.warn('[Splash] Gösterme hatası:', error);
  }
}
