/**
 * Application Configuration Types
 * 
 * Generic config system for white-label deployments.
 * Allows branding customization without code changes.
 */

export interface AppConfig {
  /**
   * Application display name
   * @example "Teknova Rasyon", "Tarpole Rasyon", "Manyas Süt Birliği Rasyon"
   */
  appName: string

  /**
   * Optional tagline/slogan
   * @example "NRC 2021 Tabanlı Rasyon Optimizasyonu"
   */
  appSlogan?: string

  /**
   * Logo image path or URL
   * @example "/teknova-logo.svg", "https://cdn.example.com/logo.png"
   */
  logo?: string

  /**
   * Favicon path
   * @example "/favicon.ico"
   */
  favicon?: string

  /**
   * Brand colors (CSS hex format)
   */
  theme: {
    /** Primary brand color */
    primary: string
    /** Secondary color (optional) */
    secondary?: string
    /** Accent color for highlights (optional) */
    accent?: string
    /** Success color (optional, defaults to green) */
    success?: string
    /** Warning color (optional, defaults to orange) */
    warning?: string
    /** Error color (optional, defaults to red) */
    error?: string
  }

  /**
   * Contact information
   */
  contact?: {
    email?: string
    phone?: string
    website?: string
    supportUrl?: string
    githubUrl?: string
  }

  /**
   * Feature flags
   */
  features?: {
    /** AI-powered feed explanation (requires HF token) */
    aiExplain?: boolean
    /** PDF export functionality */
    exportPDF?: boolean
    /** Excel/CSV export */
    exportExcel?: boolean
    /** Cloud sync (future) */
    cloudSync?: boolean
    /** User authentication */
    auth?: boolean
    /** Admin dashboard */
    adminDashboard?: boolean
    /** Onboarding tour */
    onboardingTour?: boolean
  }

  /**
   * Localization
   */
  locale?: {
    language?: 'tr' | 'en'
    currency?: 'TRY' | 'USD' | 'EUR'
    dateFormat?: 'dd/MM/yyyy' | 'MM/dd/yyyy'
  }

  /**
   * Analytics & Monitoring
   */
  monitoring?: {
    /** Sentry DSN */
    sentryDsn?: string
    /** Google Analytics ID */
    gaId?: string
    /** Enable error tracking */
    enableSentry?: boolean
    /** Enable analytics */
    enableGA?: boolean
  }

  /**
   * Module mode (for embedded usage)
   */
  mode?: 'standalone' | 'embedded'

  /**
   * Callback when module is closed (embedded mode)
   */
  onClose?: () => void
}

/**
 * Default configuration (Teknova brand)
 */
export const DEFAULT_CONFIG: AppConfig = {
  appName: 'Teknova Rasyon',
  appSlogan: 'NRC 2021 Tabanlı Karar Destek Sistemi',
  theme: {
    primary: '#2563eb', // blue-600
    secondary: '#10b981', // green-500
    accent: '#f59e0b', // amber-500
  },
  contact: {
    email: 'info@teknova.vet',
    website: 'https://teknova-rasyon.netlify.app',
    githubUrl: 'https://github.com/veteroner/teknovarasyon',
  },
  features: {
    aiExplain: true,
    exportPDF: true,
    exportExcel: true,
    cloudSync: false,
    auth: false, // Disabled for now
    adminDashboard: true,
    onboardingTour: true,
  },
  locale: {
    language: 'tr',
    currency: 'TRY',
    dateFormat: 'dd/MM/yyyy',
  },
  monitoring: {
    enableSentry: true,
    enableGA: true,
  },
  mode: 'standalone',
}

/**
 * Example configs for different deployments
 */
export const EXAMPLE_CONFIGS = {
  teknova: DEFAULT_CONFIG,

  tarpole: {
    appName: 'Tarpole Rasyon',
    appSlogan: 'Zirai İlaç ve Hayvan Besleme Çözümleri',
    logo: '/tarpole-logo.svg',
    theme: {
      primary: '#00A651', // Tarpole green
      secondary: '#FDB913', // Tarpole yellow
    },
    contact: {
      email: 'destek@tarpole.com',
      website: 'https://tarpole.com',
      phone: '+90 xxx xxx xx xx',
    },
    features: {
      exportPDF: true,
      exportExcel: true,
      aiExplain: false, // Disable AI features
      auth: false,
      adminDashboard: false,
    },
    mode: 'embedded' as const,
  },

  manyas: {
    appName: 'Manyas Süt Birliği Rasyon',
    appSlogan: 'Süt Sığırı Besleme Uzmanı',
    logo: '/manyas-logo.svg',
    theme: {
      primary: '#1E40AF', // blue-800
      secondary: '#FFFFFF',
    },
    contact: {
      email: 'bilgi@manyassut.com.tr',
      website: 'https://manyassut.com.tr',
      phone: '+90 266 xxx xx xx',
    },
    features: {
      exportPDF: true,
      exportExcel: true,
      cloudSync: true, // Enable cloud sync for cooperative
      auth: true, // Require login
    },
    mode: 'embedded' as const,
  },
}
