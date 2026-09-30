import type {
  BibleBook,
  BooksApiResponse,
  Chapter,
  ParsedReference,
  ParseApiResponse,
  Verse,
  VerseApiResponse,
  VotdApiResponse,
} from '@/types/bible';

function pickPtBr(record: Record<string, string> | undefined, fallback = ''): string {
  if (!record) return fallback;
  return record['pt-br'] ?? record['en'] ?? Object.values(record)[0] ?? fallback;
}

function slugifyRef(bookSlug: string, chapter: number, verseStart: number): string {
  return `${bookSlug}/${chapter}/${verseStart}`;
}

export function mapVerseResponse(res: VerseApiResponse): Verse {
  const d = res.data;
  const verseStart = d.verse;
  const verseEnd = d.verseEnd ?? d.verse;
  return {
    ref: slugifyRef(d.book, d.chapter, verseStart),
    reference: res.meta.reference,
    bookSlug: d.book,
    bookName: d.bookName,
    chapter: d.chapter,
    verseStart,
    verseEnd,
    text: d.text,
    version: 'nvi',
  };
}

/** /v1/votd tem shape flat — normaliza para o mesmo tipo Verse. */
export function mapVotdResponse(res: VotdApiResponse, bookNameFallback?: string): Verse {
  return {
    ref: slugifyRef(res.book_slug, res.chapter, res.verse_start),
    reference: res.reference,
    bookSlug: res.book_slug,
    bookName: bookNameFallback ?? res.book_slug,
    chapter: res.chapter,
    verseStart: res.verse_start,
    verseEnd: res.verse_end,
    text: res.text,
    version: 'nvi',
  };
}

export function mapBooksResponse(res: BooksApiResponse): BibleBook[] {
  return res.data.map((b) => ({
    id: b.id,
    name: pickPtBr(b.name),
    slug: pickPtBr(b.slug),
    abbrev: pickPtBr(b.abbrev),
    chapters: b.chapters,
    testament: b.testament === 'new' ? 'new' : 'old',
    category: b.category,
  }));
}

export function mapChapterResponse(res: {
  data: {
    book: string;
    bookName?: string;
    chapter: number;
    verses: { verse: number; text: string }[] | string[];
  };
  meta: { reference: string };
}): Chapter {
  const verses = (res.data.verses as { verse: number; text: string }[]).map((v, i) =>
    typeof v === 'string' ? { verse: i + 1, text: v } : v,
  );
  return {
    bookSlug: res.data.book,
    bookName: res.data.bookName ?? res.data.book,
    chapter: res.data.chapter,
    verses,
    reference: res.meta.reference,
  };
}

export function mapParseResponse(res: ParseApiResponse): ParsedReference {
  return {
    bookSlug: res.data.book_slug,
    chapter: res.data.chapter,
    verseStart: res.data.verse_start,
    verseEnd: res.data.verse_end,
    reference: res.meta.reference,
  };
}
