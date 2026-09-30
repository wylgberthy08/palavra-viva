// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'coverage/*',
      '.expo/*',
      'node_modules/*',
      'expo-env.d.ts',
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
]);
