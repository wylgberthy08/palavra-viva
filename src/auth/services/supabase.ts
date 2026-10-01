import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Falha na inicialização, nomeando a variável que falta. Sem isso o
 * `createClient` receberia string vazia e cada chamada de rede falharia mais
 * tarde com uma mensagem que não aponta a causa.
 *
 * A leitura de cada variável é literal de propósito: o Expo substitui
 * `process.env.NOME` na build, então acesso dinâmico por chave não existe em
 * produção. Por isso o nome chega como argumento, e não como índice.
 */
function exigirVariavel(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Copie .env.example para .env e preencha ${nome}.`
    );
  }
  return valor;
}

const supabaseUrl = exigirVariavel('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = exigirVariavel(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});