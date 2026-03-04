import { Capacitor } from '@capacitor/core';

/**
 * Platform Utility Functions
 * 
 * Capacitor.isNativePlatform() yerine daha okunabilir helper'lar.
 * Tüm platform kontrolleri bu dosyadan geçer.
 */

export type Platform = 'capacitor' | 'ios' | 'android' | 'web';

/**
 * Mevcut platformu kontrol et
 * 
 * @param platform - 'capacitor' (herhangi native), 'ios', 'android', 'web'
 */
export function isPlatform(platform: Platform): boolean {
  switch (platform) {
    case 'capacitor':
      return Capacitor.isNativePlatform();
    case 'ios':
      return Capacitor.getPlatform() === 'ios';
    case 'android':
      return Capacitor.getPlatform() === 'android';
    case 'web':
      return !Capacitor.isNativePlatform();
    default:
      return false;
  }
}

/**
 * Mevcut platform adını döndür
 */
export function getCurrentPlatform(): Platform {
  if (!Capacitor.isNativePlatform()) return 'web';
  return Capacitor.getPlatform() as Platform;
}

/**
 * Native plugin mevcut mu kontrol et
 * 
 * Bazı Capacitor plugin'leri web'de çalışmaz.
 * Plugin çağırmadan önce bu fonksiyonla kontrol et.
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Safe area inset'lerini CSS custom property olarak ayarla
 * Native platformlarda env(safe-area-inset-*) otomatik çalışır
 * ama bazı WebView'lerde fallback gerekebilir
 */
export function applySafeAreaFallback() {
  if (isPlatform('capacitor')) {
    const root = document.documentElement;
    // Default safe area değerleri (notch yoksa)
    root.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
    root.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--safe-left', 'env(safe-area-inset-left, 0px)');
    root.style.setProperty('--safe-right', 'env(safe-area-inset-right, 0px)');
  }
}
