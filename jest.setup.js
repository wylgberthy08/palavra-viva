/* eslint-env jest */

// Mock de AsyncStorage: mantém o teste independente de aparelho nativo.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Reanimated 4 carrega o módulo nativo de worklets, que não existe em Node.
// O mock vive em `__mocks__/react-native-reanimated.js` e é aplicado automaticamente
// pelo Jest, por estar adjacente ao `node_modules`.
// expo-secure-store funciona em Node sem mock; nenhum teste depende de aparelho real.
