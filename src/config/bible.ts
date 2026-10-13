/**
 * Config central da Bíblia — NVI travada.
 * API: https://github.com/midvash/bible-api (base https://api.midvash.com)
 * Sem chave, sem auth, sem rate-limit. Conteúdo imutável (edge cache).
 */
const configuredBaseUrl =
  process.env.EXPO_PUBLIC_BIBLE_BASE_URL ?? 'https://api.midvash.com';

export const BIBLE_BASE_URL = configuredBaseUrl
  .replace(/\/+$/, '')
  .replace(/\/v1$/i, '');

/** Versão travada no MVP. Não expor seletor de versão. */
export const BIBLE_VERSION = 'nvi' as const;

export const BIBLE_LANGUAGE = 'pt-br' as const;

export const BIBLE_TIMEOUT_MS = 10_000;

export const bibleConfig = {
  baseURL: BIBLE_BASE_URL,
  version: BIBLE_VERSION,
  language: BIBLE_LANGUAGE,
  timeout: BIBLE_TIMEOUT_MS,
} as const;
