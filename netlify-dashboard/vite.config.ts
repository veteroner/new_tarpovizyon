import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src/rasyon'),
      '@capacitor/core': path.resolve(__dirname, './src/rasyon/stubs/capacitor-core.ts'),
      '@capacitor-community/admob': path.resolve(__dirname, './src/rasyon/stubs/capacitor-admob.ts'),
      '@capacitor/push-notifications': path.resolve(__dirname, './src/rasyon/stubs/capacitor-push.ts'),
      '@sentry/react': path.resolve(__dirname, './src/rasyon/stubs/sentry.ts'),
      '@sentry/aws-serverless': path.resolve(__dirname, './src/rasyon/stubs/sentry.ts'),
    },
  },
})
