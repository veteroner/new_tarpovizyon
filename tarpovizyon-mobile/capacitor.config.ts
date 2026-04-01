import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarpovizyon.app',
  appName: 'TarpoVizyon',
  webDir: 'dist',
  
  // Server ayarları
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'lookerstudio.google.com',
      'datastudio.google.com',
      'tarpovizyonai.netlify.app',
      'tarpol-rasyon.netlify.app',
      'www.tarpol.org.tr',
      'dersbende.com',
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
    // Splash Screen - Sadece native, web splash YOK
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#0A1628',
    },

    // Status Bar
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0A1628',
    },
  },

  // Android özel ayarlar
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      signingType: 'apksigner',
    },
    allowMixedContent: false,
  },

  // iOS özel ayarlar
  ios: {
    contentInset: 'automatic',
    scheme: 'TarpoVizyon',
  },
};

export default config;
