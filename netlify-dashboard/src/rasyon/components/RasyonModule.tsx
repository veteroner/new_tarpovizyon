/**
 * RasyonModule - Embedded kullanım için wrapper component
 * 
 * Bu component, Rasyon uygulamasını başka uygulamalar içinde modül olarak kullanmak için tasarlandı.
 * 
 * Kullanım örnekleri:
 * 
 * 1. Modal/Dialog içinde:
 *    <RasyonModule 
 *      config={{ appName: "Tarpole", theme: { primary: "#00A651" } }}
 *      onClose={() => setOpen(false)}
 *    />
 * 
 * 2. Drawer/Sidebar içinde:
 *    <RasyonModule 
 *      config={{ mode: "embedded", appName: "Manyas" }}
 *      standalone={false}
 *    />
 * 
 * 3. Full-page standalone:
 *    <RasyonModule 
 *      config={{ mode: "standalone" }}
 *      standalone={true}
 *    />
 */

import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from '@/contexts/ConfigContext'
import type { AppConfig } from '@/types/config'
import { DEFAULT_CONFIG } from '@/types/config'
import App from '@/App'

interface RasyonModuleProps {
  /**
   * Config override - DEFAULT_CONFIG üzerine merge edilir
   */
  config?: Partial<AppConfig>

  /**
   * Standalone mod - false ise BrowserRouter kullanılmaz (parent app'in router'ını kullanır)
   * Varsayılan: config.mode === 'standalone'
   */
  standalone?: boolean

  /**
   * Container className (embedded mod için custom styling)
   */
  className?: string

  /**
   * Kapatma callback (embedded mod için)
   */
  onClose?: () => void
}

export default function RasyonModule({
  config: configOverride = {},
  standalone,
  className = '',
  onClose,
}: RasyonModuleProps) {
  // Deep merge config
  const config: AppConfig = {
    ...DEFAULT_CONFIG,
    ...configOverride,
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...configOverride.theme,
    },
    contact: {
      ...DEFAULT_CONFIG.contact,
      ...configOverride.contact,
    },
    features: {
      ...DEFAULT_CONFIG.features,
      ...configOverride.features,
    },
    locale: {
      ...DEFAULT_CONFIG.locale,
      ...configOverride.locale,
    },
    monitoring: {
      ...DEFAULT_CONFIG.monitoring,
      ...configOverride.monitoring,
    },
  }

  // Kapatma callback override
  if (onClose && !config.onClose) {
    config.onClose = onClose
  }

  // Standalone mod belirleme
  const isStandalone = standalone !== undefined ? standalone : config.mode === 'standalone'

  // App content
  const AppContent = (
    <ConfigProvider config={config}>
      <div className={`rasyon-module ${className}`}>
        <App />
      </div>
    </ConfigProvider>
  )

  // Standalone ise BrowserRouter wrap et
  if (isStandalone) {
    return <BrowserRouter>{AppContent}</BrowserRouter>
  }

  // Embedded ise parent app'in router'ını kullan
  return AppContent
}

/**
 * Lightweight export (sadece config, minimum wrapper)
 * Çok hafif embedding için (parent app'te tüm provider'lar varsa)
 */
export function RasyonModuleLite({
  config: configOverride = {},
  className = '',
}: {
  config?: Partial<AppConfig>
  className?: string
}) {
  const config: AppConfig = { ...DEFAULT_CONFIG, ...configOverride }

  return (
    <ConfigProvider config={config}>
      <div className={`rasyon-module-lite ${className}`}>
        <App />
      </div>
    </ConfigProvider>
  )
}
