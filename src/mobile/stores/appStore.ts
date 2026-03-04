import { create } from 'zustand';

/**
 * App Store — Global mobile app state (Zustand)
 */

interface AppState {
  // Network
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // App info
  appVersion: string;
  buildNumber: string;
  setAppInfo: (version: string, build: string) => void;

  // Notification preferences
  notifications: Record<string, boolean>;
  setNotification: (key: string, value: boolean) => void;

  // Theme
  theme: 'dark' | 'light';

  // Language
  language: 'tr' | 'en';

  // Last data update timestamp
  lastUpdate: number | null;
  setLastUpdate: (ts: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Network
  isOnline: navigator.onLine,
  setOnline: (online) => set({ isOnline: online }),

  // App info
  appVersion: '2.0.0',
  buildNumber: '7',
  setAppInfo: (version, build) => set({ appVersion: version, buildNumber: build }),

  // Notifications
  notifications: {
    market_alerts: true,
    weather_alerts: true,
    weekly_digest: true,
    production_updates: false,
    price_changes: true,
  },
  setNotification: (key, value) =>
    set((state) => ({
      notifications: { ...state.notifications, [key]: value },
    })),

  // Theme
  theme: 'dark',

  // Language
  language: 'tr',

  // Last update
  lastUpdate: null,
  setLastUpdate: (ts) => set({ lastUpdate: ts }),
}));
