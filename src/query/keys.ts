import { BIBLE_VERSION } from '@/config/bible';

/** Data local yyyy-mm-dd p/ a key do versículo do dia virar à meia-noite. */
export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const bibleKeys = {
  all: ['bible', BIBLE_VERSION] as const,
  books: () => [...bibleKeys.all, 'books'] as const,
  verse: (book: string, chapter: number, verse: number) =>
    [...bibleKeys.all, 'verse', book, chapter, verse] as const,
  chapter: (book: string, chapter: number) =>
    [...bibleKeys.all, 'chapter', book, chapter] as const,
  votd: () => [...bibleKeys.all, 'votd', todayKey()] as const,
  parse: (query: string) => [...bibleKeys.all, 'parse', query] as const,
};
