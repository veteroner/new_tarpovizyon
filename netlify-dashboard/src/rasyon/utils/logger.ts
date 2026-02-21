/**
 * Environment-aware logger utility
 * 
 * In production: Only errors are logged
 * In development: All logs are shown
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * Log informational messages (dev only)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Log warnings (dev only)
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Log errors (always - for debugging in production)
   */
  error: (...args: unknown[]) => {
    console.error(...args)
  },

  /**
   * Log debug messages (dev only, more verbose)
   */
  debug: (...args: unknown[]) => {
    if (isDev && import.meta.env.VITE_DEBUG) {
      console.debug('[DEBUG]', ...args)
    }
  },
}

export default logger
