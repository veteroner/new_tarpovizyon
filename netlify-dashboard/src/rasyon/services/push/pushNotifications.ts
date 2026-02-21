import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

export type PushInitResult =
  | { ok: true; token?: string }
  | { ok: false; reason: 'not-native' | 'permission-denied' | 'registration-failed' | 'unknown'; error?: unknown }

class PushNotificationsService {
  private listenersBound = false

  bindListeners(onMessage?: (notification: PushNotificationSchema) => void, onAction?: (action: ActionPerformed) => void) {
    if (!Capacitor.isNativePlatform()) return
    if (this.listenersBound) return

    this.listenersBound = true

    PushNotifications.addListener('registration', (token: Token) => {
      localStorage.setItem('push_token', token.value)
    })

    PushNotifications.addListener('registrationError', (error: unknown) => {
      console.warn('Push registration error:', error)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      onMessage?.(notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      onAction?.(action)
    })
  }

  async enable(): Promise<PushInitResult> {
    if (!Capacitor.isNativePlatform()) {
      return { ok: false, reason: 'not-native' }
    }

    try {
      const permission = await PushNotifications.requestPermissions()
      if (permission.receive !== 'granted') {
        return { ok: false, reason: 'permission-denied' }
      }

      await PushNotifications.register()

      // Token arrives via listener; return current value if already set.
      const token = localStorage.getItem('push_token') ?? undefined
      return { ok: true, token }
    } catch (error) {
      console.warn('Push enable failed:', error)
      return { ok: false, reason: 'unknown', error }
    }
  }

  getToken(): string | null {
    return localStorage.getItem('push_token')
  }
}

export const pushNotifications = new PushNotificationsService()
