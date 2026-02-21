import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const SENTRY_ENABLED = import.meta.env.VITE_SENTRY_ENABLED !== 'false'
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.0.0'
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE || `teknova-rasyon@${APP_VERSION}`

export function initSentry() {
  // Only enable outside dev, and only if configured
  if (!import.meta.env.DEV && SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      release: RELEASE,
      
      // Performance Monitoring
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      
      // Performance Monitoring sample rate (10% of transactions)
      tracesSampleRate: 0.1,
      
      // Session Replay sample rate
      replaysSessionSampleRate: 0.1, // 10% normal sessions
      replaysOnErrorSampleRate: 1.0, // 100% error sessions
      
      // Error filtering
      beforeSend(event: Record<string, unknown>, hint: Record<string, unknown>) {
        // Development/localhost hatalarını gönderme
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return null;
        }
        
        // Bazı hataları filtrele (ör: extension hataları)
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);
          
          // Chrome extension hataları
          if (message.includes('chrome-extension://')) {
            return null;
          }
          
          // ResizeObserver loop hataları (browser quirk)
          if (message.includes('ResizeObserver loop')) {
            return null;
          }
        }
        
        return event;
      },
      
      // Breadcrumb filtering
      beforeBreadcrumb(breadcrumb: Record<string, unknown>) {
        // Sensitive data filtreleme
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null; // Console.log breadcrumb'larını gönderme
        }
        return breadcrumb;
      },
    })

    console.info('✅ Sentry initialized:', {
      environment: ENVIRONMENT,
      version: APP_VERSION,
      release: RELEASE,
    })
  } else {
    console.info('ℹ️ Sentry disabled (development mode or DSN not configured)');
  }
}

// Helper: Manuel hata gönderme
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!import.meta.env.DEV && SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    console.error('❌ Error (not sent to Sentry):', error, context)
  }
}

// Helper: Kullanıcı bilgilerini set et
export function setUserContext(userId: string, email?: string) {
  if (!import.meta.env.DEV && SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      email,
    })
  }
}

// Helper: Custom breadcrumb ekle
export function addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!import.meta.env.DEV && SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now(),
    })
  }
}

// Helper: Custom tags ekle
export function setTag(key: string, value: string) {
  if (!import.meta.env.DEV && SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.setTag(key, value)
  }
}

// Export Sentry instance
export { Sentry };
