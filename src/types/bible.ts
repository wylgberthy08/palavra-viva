/** Tipos normalizados usados pelo app (versão NVI, pt-BR). */

export interface Verse {
  /** slug canônico p/ rota, ex: "joao/3/16" */
  ref: string;
  /** referência exibição, ex: "João 3:16" */
  reference: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  version: 'nvi';
}

export interface Chapter {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verses: { verse: number; text: string }[];
  reference: string;
}

export interface BibleBook {
  id: number;
  /** nome pt-BR, ex: "João" */
  name: string;
  /** slug pt-BR p/ usar na URL, ex: "joao" */
  slug: string;
  abbrev: string;
  chapters: number;
  testament: 'old' | 'new';
  category: string;
}

export interface ParsedReference {
  bookSlug: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  reference: string;
}

/* ---- shapes crus da API midvash (v1) ---- */

export interface VerseApiData {
  version: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  text: string;
  verses?: string[];
}

export interface VerseApiResponse {
  data: VerseApiData;
  meta: { reference: string; total: number };
}

/** /v1/votd retorna shape flat (sem envelope {data,meta}) */
export interface VotdApiResponse {
  reference: string;
  text: string;
  version: string;
  book_slug: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  url?: string;
}

export interface BooksApiResponse {
  data: {
    id: number;
    name: Record<string, string>;
    slug: Record<string, string>;
    abbrev: Record<string, string>;
    chapters: number;
    testament: string;
    category: string;
  }[];
  meta: { total: number };
}

export interface ParseApiResponse {
  data: {
    bookId: number;
    book_slug: string;
    chapter: number;
    verse_start: number;
    verse_end: number;
  };
  meta: { reference: string };
}

export interface BibleApiErrorBody {
  error?: string;
  message?: string;
  didYouMean?: string;
}
