import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SavedStatus, SavedVerse } from '@/types/saved-verse';
import type { Verse } from '@/types/bible';

export const SAVED_VERSES_STORAGE_KEY = '@palavra-viva/saved-verses/v1';

/**
 * Falha de leitura do armazenamento. Nomeada para que a UI distinga "não há nada
 * salvo" de "não deu para ler", que são respostas opostas para o usuário.
 */
export class SavedVersesReadError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SavedVersesReadError';
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isSavedStatus(value: unknown): value is SavedStatus {
  return value === 'decorando' || value === 'dominado';
}

function isParseableIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Valida a forma de um item lido do armazenamento. Devolve `null` quando o item
 * não serve, para que a chamada descarte **só** esse item: o usuário que tem 40
 * versículos e um corrompido continua com 39.
 */
export function parseSavedVerse(value: unknown): SavedVerse | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Record<string, unknown>;

  if (!isNonEmptyString(candidate.ref)) return null;
  if (!isNonEmptyString(candidate.reference)) return null;
  if (!isNonEmptyString(candidate.bookSlug)) return null;
  if (!isNonEmptyString(candidate.bookName)) return null;
  if (!isNonEmptyString(candidate.text)) return null;
  if (!isPositiveInteger(candidate.chapter)) return null;
  if (!isPositiveInteger(candidate.verseStart)) return null;
  if (!isPositiveInteger(candidate.verseEnd)) return null;
  if (candidate.verseEnd < candidate.verseStart) return null;
  if (!isSavedStatus(candidate.status)) return null;
  if (!isParseableIsoDate(candidate.savedAt)) return null;

  return candidate as unknown as SavedVerse;
}

export function toSavedVerse(verse: Verse, status: SavedStatus = 'decorando'): SavedVerse {
  return {
    ref: verse.ref,
    reference: verse.reference,
    bookSlug: verse.bookSlug,
    bookName: verse.bookName,
    chapter: verse.chapter,
    verseStart: verse.verseStart,
    verseEnd: verse.verseEnd,
    text: verse.text,
    status,
    savedAt: new Date().toISOString(),
  };
}

export async function loadSavedVerses(): Promise<SavedVerse[]> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(SAVED_VERSES_STORAGE_KEY);
  } catch (error) {
    throw new SavedVersesReadError('Não foi possível ler os versículos salvos.', error);
  }

  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new SavedVersesReadError('Os versículos salvos estão corrompidos.', error);
  }

  if (!Array.isArray(parsed)) {
    throw new SavedVersesReadError('Os versículos salvos têm um formato inesperado.');
  }

  return parsed
    .map(parseSavedVerse)
    .filter((item): item is SavedVerse => item !== null);
}

export async function persistSavedVerses(items: SavedVerse[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_VERSES_STORAGE_KEY, JSON.stringify(items));
}
