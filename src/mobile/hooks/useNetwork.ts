import { Network } from '@capacitor/network';
import { isPlatform } from '../utils/platform';
import { useState, useEffect, useRef } from 'react';

/**
 * Network Status Hook
 */
export function useNetwork() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (isPlatform('capacitor')) {
      // Capacitor Network plugin
      Network.getStatus().then((status) => {
        setIsOnline(status.connected);
      });

      const handler = Network.addListener('networkStatusChange', (status) => {
        setIsOnline(status.connected);
      });

      return () => {
        handler.then((h) => h.remove());
      };
    } else {
      // Web fallback
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return isOnline;
}

/**
 * App Resume Hook — fires when app comes to foreground
 */
export function useAppResume(callback: () => void) {
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = () => cbRef.current();
    document.addEventListener('app:resume', handler);
    return () => document.removeEventListener('app:resume', handler);
  }, []);
}
