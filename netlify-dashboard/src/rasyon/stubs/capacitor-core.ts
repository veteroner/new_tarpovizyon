// Capacitor web stub – native plugins are no-ops on web
export const Capacitor = {
  isNativePlatform: (): boolean => false,
  getPlatform: (): string => 'web',
}

export default Capacitor
