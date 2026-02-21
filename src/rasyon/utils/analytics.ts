/**
 * Google Analytics 4 Integration
 * 
 * Usage:
 * - initGA() → Call once in main.tsx
 * - trackEvent('wizard_complete', { animal: 'dairy', feeds: 5 })
 * - trackPageView('/ration-result')
 * 
 * KVKK/GDPR: Respects user tracking consent
 */

import { trackingConsent } from './trackingConsent'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const GA_ENABLED = !!GA_MEASUREMENT_ID && !import.meta.env.DEV

// Declare gtag on window
declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * Initialize Google Analytics 4
 * Call this once in main.tsx before React renders
 * ONLY loads if user has accepted tracking
 */
export function initGA() {
  if (!GA_ENABLED) {
    console.info('ℹ️ Google Analytics disabled (dev mode or ID not configured)')
    return
  }

  // KVKK/GDPR: Check user tracking consent
  if (!trackingConsent.hasAcceptedTracking()) {
    console.info('ℹ️ Google Analytics disabled (user has not accepted tracking consent)')
    return
  }

  // Load GA script
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // Manual page view tracking for SPA
    anonymize_ip: true, // GDPR compliance
  })

  console.info('✅ Google Analytics initialized:', GA_MEASUREMENT_ID)
}

/**
 * Track a custom event
 * 
 * @example
 * trackEvent('wizard_complete', { animal_type: 'dairy', feed_count: 5 })
 * trackEvent('ration_export', { format: 'pdf', cost: 125.5 })
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (!GA_ENABLED || !window.gtag) return

  window.gtag('event', eventName, params)
}

/**
 * Track a page view (for SPA navigation)
 * 
 * @example
 * trackPageView('/ration-result')
 * trackPageView('/feed-library')
 */
export function trackPageView(path: string, title?: string) {
  if (!GA_ENABLED || !window.gtag) return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  })
}

/**
 * Track a conversion (goal completion)
 * 
 * @example
 * trackConversion('ration_created', { value: 125.5, currency: 'TRY' })
 */
export function trackConversion(conversionName: string, params?: Record<string, unknown>) {
  if (!GA_ENABLED || !window.gtag) return

  window.gtag('event', conversionName, {
    ...params,
    send_to: GA_MEASUREMENT_ID,
  })
}

/**
 * Set user properties (GDPR-compliant, no PII)
 * 
 * @example
 * setUserProperties({ user_type: 'farmer', region: 'marmara' })
 */
export function setUserProperties(props: Record<string, unknown>) {
  if (!GA_ENABLED || !window.gtag) return

  window.gtag('set', 'user_properties', props)
}
