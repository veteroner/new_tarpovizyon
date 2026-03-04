import { Capacitor } from '@capacitor/core';

/**
 * Platform Detection Utilities
 */

export type Platform = 'capacitor' | 'ios' | 'android' | 'web';

export function isPlatform(platform: Platform): boolean {
  switch (platform) {
    case 'capacitor':
      return Capacitor.isNativePlatform();
    case 'ios':
      return Capacitor.getPlatform() === 'ios';
    case 'android':
      return Capacitor.getPlatform() === 'android';
    case 'web':
      return Capacitor.getPlatform() === 'web';
    default:
      return false;
  }
}

export function getCurrentPlatform(): string {
  return Capacitor.getPlatform();
}

export function isPluginAvailable(name: string): boolean {
  return (Capacitor as unknown as { isPluginAvailable?: (name: string) => boolean }).isPluginAvailable?.(name) ?? false;
}
