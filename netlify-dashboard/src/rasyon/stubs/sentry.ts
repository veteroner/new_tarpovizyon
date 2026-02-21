// Sentry stub – no-op on web build (reduces bundle size)
export const init = (_opts?: Record<string, unknown>) => {}
export const captureException = (_err: unknown, _ctx?: unknown) => {}
export const setUser = (_user: Record<string, unknown> | null) => {}
export const addBreadcrumb = (_b: Record<string, unknown>) => {}
export const setTag = (_k: string, _v: string) => {}
export const browserTracingIntegration = () => ({})
export const replayIntegration = (_opts?: Record<string, unknown>) => ({})
export const withSentryReactRouterV6Routing = <T>(c: T) => c
export const Replay = {}
export const BrowserTracing = {}
