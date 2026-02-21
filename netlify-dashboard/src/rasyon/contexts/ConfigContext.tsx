/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useEffect } from 'react'
import type { AppConfig } from '@/types/config'
import { DEFAULT_CONFIG } from '@/types/config'

/**
 * Application Configuration Context
 * 
 * Provides global access to branding and feature flags.
 * Use `useAppConfig()` hook to access config in components.
 */
const ConfigContext = createContext<AppConfig | null>(null)

interface ConfigProviderProps {
  config?: Partial<AppConfig>
  children: React.ReactNode
}

/**
 * ConfigProvider: Wrap your app to provide branding configuration
 * 
 * @example
 * ```tsx
 * <ConfigProvider config={{ appName: "My App", theme: { primary: "#00ff00" } }}>
 *   <App />
 * </ConfigProvider>
 * ```
 */
export function ConfigProvider({ config, children }: ConfigProviderProps) {
  // Deep merge user config with defaults
  const mergedConfig = useMemo<AppConfig>(() => {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      theme: {
        ...DEFAULT_CONFIG.theme,
        ...config?.theme,
      },
      contact: {
        ...DEFAULT_CONFIG.contact,
        ...config?.contact,
      },
      features: {
        ...DEFAULT_CONFIG.features,
        ...config?.features,
      },
      locale: {
        ...DEFAULT_CONFIG.locale,
        ...config?.locale,
      },
      monitoring: {
        ...DEFAULT_CONFIG.monitoring,
        ...config?.monitoring,
      },
    }
  }, [config])

  // Inject CSS variables for theming
  useEffect(() => {
    const root = document.documentElement
    const { theme } = mergedConfig

    root.style.setProperty('--color-primary', theme.primary)
    if (theme.secondary) {
      root.style.setProperty('--color-secondary', theme.secondary)
    }
    if (theme.accent) {
      root.style.setProperty('--color-accent', theme.accent)
    }
    if (theme.success) {
      root.style.setProperty('--color-success', theme.success)
    }
    if (theme.warning) {
      root.style.setProperty('--color-warning', theme.warning)
    }
    if (theme.error) {
      root.style.setProperty('--color-error', theme.error)
    }

    // Update page title
    document.title = mergedConfig.appName

    // Update favicon if provided
    if (mergedConfig.favicon) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (favicon) {
        favicon.href = mergedConfig.favicon
      }
    }
  }, [mergedConfig])

  return (
    <ConfigContext.Provider value={mergedConfig}>
      {children}
    </ConfigContext.Provider>
  )
}

/**
 * Hook to access application configuration
 * 
 * @throws Error if used outside ConfigProvider
 * 
 * @example
 * ```tsx
 * function Header() {
 *   const { appName, logo } = useAppConfig()
 *   return <h1>{appName}</h1>
 * }
 * ```
 */
export function useAppConfig(): AppConfig {
  const config = useContext(ConfigContext)
  
  if (!config) {
    throw new Error(
      'useAppConfig must be used within ConfigProvider. ' +
      'Wrap your app with <ConfigProvider>...</ConfigProvider>'
    )
  }
  
  return config
}

/**
 * Hook to check if a feature is enabled
 * 
 * @example
 * ```tsx
 * const canExportPDF = useFeature('exportPDF')
 * {canExportPDF && <PDFButton />}
 * ```
 */
export function useFeature(featureName: keyof NonNullable<AppConfig['features']>): boolean {
  const config = useAppConfig()
  return config.features?.[featureName] ?? false
}

/**
 * Hook to check if app is in embedded mode
 */
export function useIsEmbedded(): boolean {
  const config = useAppConfig()
  return config.mode === 'embedded'
}
