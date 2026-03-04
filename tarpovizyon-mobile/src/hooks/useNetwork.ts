import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { isPlatform } from '../utils/platform';
import { useAppStore } from '../stores/appStore';

/**
 * useNetwork - Ağ durumu hook'u
 * 
 * Online/offline durumunu takip eder.
 * Capacitor Network plugin + web API kullanır.
 */
export function useNetwork() {
  const { isOnline, setOnline } = useAppStore();

  useEffect(() => {
    if (isPlatform('capacitor')) {
      // Capacitor Network plugin
      const handler = Network.addListener('networkStatusChange', (status) => {
        setOnline(status.connected);
      });

      // İlk durum
      Network.getStatus().then((status) => {
        setOnline(status.connected);
      });

      return () => {
        handler.then((h) => h.remove());
      };
    } else {
      // Web API
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [setOnline]);

  return isOnline;
}

/**
 * useAppResume - App foreground'a gelince tetiklenir
 * 
 * Veri yenileme gibi işlemler için.
 */
export function useAppResume(callback: () => void) {
  useEffect(() => {
    const handler = () => callback();
    document.addEventListener('app:resume', handler);
    return () => document.removeEventListener('app:resume', handler);
  }, [callback]);
}

/**
 * useDebounce - Debounce hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
