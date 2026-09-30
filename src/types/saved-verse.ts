/** Contrato de domínio do versículo decorado. Fonte única de verdade. */

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
