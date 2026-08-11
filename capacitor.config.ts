import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarpovizyon.app',
  appName: 'TarpoVizyon',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    allowNavigation: [
      'newtarpovizyon.netlify.app',
      'tarpol-rasyon.netlify.app',
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
      /*
       * Açılış zemini uygulamanın zeminiyle aynı (iOS systemGroupedBackground).
       * Eskiden koyu lacivertti; uygulama açık temaya geçince açılışta koyu
       * bir kare parlayıp hemen beyaza dönüyordu.
       */
      backgroundColor: '#f2f2f7',
    },
    StatusBar: {
      /*
       * Capacitor'ın adlandırması ters okunuyor: `DARK` = "koyu ZEMİN için
       * açık yazı", `LIGHT` = "açık ZEMİN için koyu yazı". Uygulama açık
       * temalı olduğu için doğru değer `LIGHT`.
       */
      style: 'LIGHT',
      backgroundColor: '#f2f2f7',
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
