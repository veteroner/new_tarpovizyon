import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'node:path'
import tailwindRasyonConfig from './tailwind.rasyon.config.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/rasyon'),
      '@capacitor-community/admob': path.resolve(__dirname, './src/rasyon/stubs/capacitor-admob.ts'),
      '@capacitor/push-notifications': path.resolve(__dirname, './src/rasyon/stubs/capacitor-push.ts'),
      '@sentry/react': path.resolve(__dirname, './src/rasyon/stubs/sentry.ts'),
      '@sentry/aws-serverless': path.resolve(__dirname, './src/rasyon/stubs/sentry.ts'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: tailwindRasyonConfig }),
        autoprefixer(),
      ],
    },
  },
  server: {
    proxy: {
      // Üretimde netlify.toml, action=ai_chat'i kendi Netlify Function'ımıza,
      // diğer action'ları dersbende.com'a yönlendiriyor. Dev sunucusunda o
      // yönlendirme yok; hepsi dersbende.com'a gidiyordu ve ai_chat 502
      // dönüyordu ("AI Chat bağlantı hatası"). ai_chat'i ayrı bir kuralla
      // canlı function'a yolluyoruz (VITE_AI_CHAT_ORIGIN ile değiştirilebilir).
      '^/api\\.php\\?action=ai_chat': {
        target: process.env.VITE_AI_CHAT_ORIGIN ?? 'https://pro.tarpovizyon.com',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/.netlify/functions/ai-chat',
      },
      '/api.php': {
        target: 'https://dersbende.com',
        changeOrigin: true,
        secure: true,
      },
      '/egg-prices': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/egg-prices-image': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/yahoo-proxy': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/yahoo-proxy/, ''),
      },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/._*'],
  },
})
