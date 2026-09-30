import { BIBLE_LANGUAGE, BIBLE_VERSION } from '@/config/bible';
import type {
  BibleBook,
  BooksApiResponse,
  Chapter,
  ParseApiResponse,
  ParsedReference,
  Verse,
  VerseApiResponse,
  VotdApiResponse,
} from '@/types/bible';

import { bibleHttp } from './axios-client';
import {
  mapBooksResponse,
  mapChapterResponse,
  mapParseResponse,
  mapVerseResponse,
  mapVotdResponse,
} from './verse-mapper';

/** Normaliza slug pt-BR (ex: "João" -> "joao") para a URL. */
export function normalizeBookSlug(slug: string): string {
  return slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function getVerse(
  book: string,
  chapter: number,
  verse: number,
): Promise<Verse> {
  const bookSlug = normalizeBookSlug(book);

  const { data } = await bibleHttp.get<VerseApiResponse>(
    `/v1/${BIBLE_VERSION}/${bookSlug}/${chapter}/${verse}`,
    {
      params: {
        language: BIBLE_LANGUAGE,
        version: BIBLE_VERSION,
      },
    },
  );

  return mapVerseResponse(data);
}

/** GET /v1/nvi/{book}/{chapter} — capítulo completo */
export async function getChapter(book: string, chapter: number): Promise<Chapter> {
  const bookSlug = normalizeBookSlug(book);
  const { data } = await bibleHttp.get(`/v1/${BIBLE_VERSION}/${bookSlug}/${chapter}`, {
    params: {
      language: BIBLE_LANGUAGE,
      version: BIBLE_VERSION,
    },
  });
  return mapChapterResponse(data);
}

/** GET /v1/votd?language=pt-br&version=nvi */
export async function getVerseOfDay(): Promise<Verse> {
  const { data } = await bibleHttp.get<VotdApiResponse | VerseApiResponse>('/v1/votd', {
    params: { language: BIBLE_LANGUAGE, version: BIBLE_VERSION },
  });
  // votd é flat; se um dia vier com envelope, trata os dois.
  if ('data' in data && data.data && 'text' in data.data) {
    return mapVerseResponse(data as VerseApiResponse);
  }
  return mapVotdResponse(data as VotdApiResponse);
}

/** GET /v1/books */
export async function getBooks(): Promise<BibleBook[]> {
  const { data } = await bibleHttp.get<BooksApiResponse>('/v1/books');
  return mapBooksResponse(data);
}

/** GET /v1/parse?q=João 3:16 */
export async function parseReference(query: string): Promise<ParsedReference> {
  const { data } = await bibleHttp.get<ParseApiResponse>('/v1/parse', {
    params: {
      q: query,
      language: BIBLE_LANGUAGE,
      version: BIBLE_VERSION,
    },
  });
  return mapParseResponse(data);
}

/** Busca livre: parseia e em seguida busca o versículo. */
export async function searchVerse(query: string): Promise<Verse> {
  const parsed = await parseReference(query);
  return getVerse(parsed.bookSlug, parsed.chapter, parsed.verseStart);
}

export const bibleApi = {
  getVerse,
  getChapter,
  getVerseOfDay,
  getBooks,
  parseReference,
  searchVerse,
};
