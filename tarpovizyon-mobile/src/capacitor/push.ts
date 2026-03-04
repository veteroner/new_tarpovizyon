import { isPlatform } from '../utils/platform';

/**
 * OneSignal Push Notification Servisi
 * 
 * OneSignal App ID: f5ef3915-e366-425f-a467-029f350cb296
 * 
 * Eski uygulamada OneSignal ASLA düzgün çalışmadı:
 * - YOUR_ONESIGNAL_APP_ID placeholder bırakılmıştı
 * - initializeOneSignal() fonksiyonu hiç çağrılmıyordu
 * - Service worker gereksiz yükleniyordu
 * 
 * Bu sefer DOĞRU yapılıyor:
 * - Gerçek App ID kullanılıyor
 * - Uygulama başlangıcında init ediliyor
 * - Event listener'lar düzgün bağlanıyor
 * - Tag sistemi ile bildirim tercihleri yönetiliyor
 */

const ONESIGNAL_APP_ID = 'f5ef3915-e366-425f-a467-029f350cb296';

// OneSignal tiplerini declare et (plugin yüklendikten sonra global olarak gelir)
interface OneSignalType {
  initialize(appId: string): void;
  Notifications: {
    requestPermission(fallback: boolean): Promise<boolean>;
    addEventListener(event: string, handler: (e: OneSignalNotificationEvent) => void): void;
    permission: boolean;
  };
  User: {
    addTag(key: string, value: string): void;
    addTags(tags: Record<string, string>): void;
    getTags(): Promise<Record<string, string>>;
  };
}
interface OneSignalNotificationEvent {
  notification: {
    title: string;
    additionalData?: Record<string, string>;
    display(): void;
  };
  getNotification(): { display(): void };
}
declare const OneSignal: OneSignalType;

export function initOneSignal() {
  if (!isPlatform('capacitor')) {
    console.log('[OneSignal] Web ortamında, atlanıyor');
    return;
  }

  try {
    // OneSignal global kontrolü
    if (typeof OneSignal === 'undefined') {
      console.warn('[OneSignal] Plugin yüklenmemiş');
      return;
    }

    // Initialize
    OneSignal.initialize(ONESIGNAL_APP_ID);
    console.log('[OneSignal] Başlatıldı:', ONESIGNAL_APP_ID);

    // iOS'ta bildirim izni iste
    if (isPlatform('ios')) {
      OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
        console.log('[OneSignal] İzin durumu:', accepted);
      });
    }

    // Foreground'da bildirim geldiğinde
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: OneSignalNotificationEvent) => {
      console.log('[OneSignal] Foreground bildirim:', event.notification.title);
      // Bildirimi göster (banner)
      event.getNotification().display();
    });

    // Bildirime tıklanınca
    OneSignal.Notifications.addEventListener('click', (event: OneSignalNotificationEvent) => {
      console.log('[OneSignal] Bildirime tıklandı:', event.notification.title);
      
      const data = event.notification.additionalData;
      
      // Deep link yönlendirmesi
      if (data?.route) {
        // React Router'a yönlendir
        window.location.hash = data.route;
      }
    });

    // Varsayılan tag'leri ayarla
    setDefaultTags();

    console.log('[OneSignal] Tam başlatma tamamlandı');
  } catch (error) {
    console.error('[OneSignal] Başlatma hatası:', error);
  }
}

/**
 * Varsayılan bildirim tercihleri
 */
function setDefaultTags() {
  try {
    if (typeof OneSignal === 'undefined') return;
    
    OneSignal.User.addTags({
      market_alerts: 'true',
      price_changes: 'true',
      weather_alerts: 'true',
      production_updates: 'false',
      weekly_digest: 'true',
      app_version: '2.0.0',
    });
  } catch (error) {
    console.warn('[OneSignal] Tag ayarlama hatası:', error);
  }
}

/**
 * Bildirim tercihini güncelle
 */
export function setNotificationTag(key: string, enabled: boolean) {
  try {
    if (typeof OneSignal === 'undefined') return;
    OneSignal.User.addTag(key, enabled ? 'true' : 'false');
    console.log(`[OneSignal] Tag güncellendi: ${key} = ${enabled}`);
  } catch (error) {
    console.warn('[OneSignal] Tag güncelleme hatası:', error);
  }
}

/**
 * Tüm tag'leri getir
 */
export async function getNotificationTags(): Promise<Record<string, string>> {
  try {
    if (typeof OneSignal === 'undefined') return {};
    return await OneSignal.User.getTags();
  } catch (error) {
    console.warn('[OneSignal] Tag okuma hatası:', error);
    return {};
  }
}

/**
 * Bildirim izin durumunu kontrol et
 */
export function hasNotificationPermission(): boolean {
  try {
    if (typeof OneSignal === 'undefined') return false;
    return OneSignal.Notifications.permission;
  } catch {
    return false;
  }
}
