import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // macOS metadata files ve build çıktıları
  globalIgnores(['dist', '**\/._*', 'src/pages/*_OLD_BACKUP.tsx', 'src/pages/*.old.tsx', 'src/pages/*.backup']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // _ ile başlayan parametreler kasıtlı kullanılmıyor olabilir
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // any tipi uyarı olarak göster, hata değil
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Rasyon platform stub dosyaları — native API mock'ları, any kullanımı beklenen
  {
    files: ['src/rasyon/stubs/**', 'src/rasyon/services/ads/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
