/**
 * Tracking Consent Management - KVKK/GDPR Compliance
 * 
 * Kullanıcı analytics/tracking tercihlerini yönetir.
 * localStorage'da saklanır: 'tracking_consent' key
 */

const CONSENT_KEY = 'tracking_consent';
const CONSENT_TIMESTAMP_KEY = 'tracking_consent_timestamp';

export type ConsentStatus = boolean | null; // true = kabul, false = red, null = henüz seçilmedi

// Sentry type for window
declare global {
  interface Window {
    Sentry?: {
      close: () => Promise<boolean>;
    };
  }
}

export const trackingConsent = {
  /**
   * Kullanıcının mevcut consent durumunu al
   */
  getConsent(): ConsentStatus {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === null) return null;
      return stored === 'true';
    } catch {
      return null;
    }
  },

  /**
   * Kullanıcının consent tercihini kaydet
   */
  setConsent(accepted: boolean): void {
    try {
      localStorage.setItem(CONSENT_KEY, String(accepted));
      localStorage.setItem(CONSENT_TIMESTAMP_KEY, new Date().toISOString());
      
      // GA4'ü consent'e göre etkinleştir/devre dışı bırak
      if (window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: accepted ? 'granted' : 'denied',
          ad_storage: 'denied', // Reklam yok, her zaman denied
        });
      }

      // Sentry'yi consent'e göre devre dışı bırak
      if (!accepted && window.Sentry) {
        window.Sentry.close();
      }
    } catch (error) {
      console.error('Failed to save tracking consent:', error);
    }
  },

  /**
   * Consent zamanını al (KVKK/GDPR audit için)
   */
  getConsentTimestamp(): string | null {
    try {
      return localStorage.getItem(CONSENT_TIMESTAMP_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Consent durumunu temizle (test/debug için)
   */
  clearConsent(): void {
    try {
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem(CONSENT_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Failed to clear tracking consent:', error);
    }
  },

  /**
   * Kullanıcı analytics'i kabul etti mi? (util)
   */
  hasAcceptedTracking(): boolean {
    return this.getConsent() === true;
  },

  /**
   * Kullanıcı henüz tercih yapmadı mı?
   */
  needsConsent(): boolean {
    return this.getConsent() === null;
  },
};

// GA4 consent mode default (initial state)
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    wait_for_update: 500, // Banner'dan cevap bekle (500ms)
  });
}
