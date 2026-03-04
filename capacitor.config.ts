import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarpovizyon.app',
  appName: 'TarpoVizyon',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    allowNavigation: [
      'newtarpovizyon.netlify.app',
      'teknova-rasyon.netlify.app',
      'tarpovizyonai.netlify.app',
      'www.tarpol.org.tr',
      'dersbende.com',
      'lookerstudio.google.com',
      'datastudio.google.com',
      'googletagmanager.com',
      'google.com',
      'accounts.google.com',
      'content.googleapis.com',
      'ssl.gstatic.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#0f172a',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f172a',
    },
  },

  android: {
    allowMixedContent: false,
  },

  ios: {
    contentInset: 'automatic',
    scheme: 'TarpoVizyon',
  },
};

export default config;
