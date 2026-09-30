import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Verse } from '@/types/bible';

export type SavedStatus = 'decorando' | 'dominado';

export interface SavedVerse {
  ref: string;
  reference: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  status: SavedStatus;
  savedAt: string;
}

const STORAGE_KEY = '@palavra-viva/saved-verses/v1';

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
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedVerse[];
  } catch {
    return [];
  }
}

export async function persistSavedVerses(items: SavedVerse[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
