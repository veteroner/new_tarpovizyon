import { defineConfig } from 'vite'
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
})
