// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'coverage/*',
      '.expo/*',
      'node_modules/*',
      'expo-env.d.ts',
      // Edge Functions rodam no Deno, não no app. Os especificadores `npm:` e
      // `jsr:` não são resolvíveis pelo resolver de Node do plugin `import`, e
      // estas funções não entram no bundle do Expo.
      'supabase/**',
    ],
  },
  {
    // `eslint-config-expo` já registra o plugin `import`.
    files: ['src/**/*.{ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: true,
      },
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'index', 'sibling'],
          'newlines-between': 'always',
        },
      ],
    },
  },
  {
    // Configuração e mocks de teste rodam em Node e usam a API do Jest.
    // `/* eslint-env jest */` não é reconhecido em flat config, então o globals
    // é declarado aqui.
    files: ['jest.config.js', 'jest.setup.js', '__mocks__/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
]);
