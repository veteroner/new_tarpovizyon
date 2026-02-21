// PushNotifications stub – no-op on web
export const PushNotifications = {
  addListener: (_event: string, _handler: (_data: unknown) => void) => {},
  requestPermissions: async (): Promise<{ receive: string }> => ({ receive: 'denied' }),
  register: async () => {},
}

export type Token = { value: string }
export type PushNotificationSchema = Record<string, unknown>
export type ActionPerformed = Record<string, unknown>
