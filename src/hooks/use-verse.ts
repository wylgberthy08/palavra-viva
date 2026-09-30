import { useQuery } from '@tanstack/react-query';

import { bibleKeys } from '@/query/keys';
import { getVerse, normalizeBookSlug } from '@/services/api/bible-api';

interface UseVerseOptions {
  enabled?: boolean;
}

/** Busca um versículo NVI com cache (conteúdo imutável). */
export function useVerse(
  book: string | undefined,
  chapter: number | undefined,
  verse: number | undefined,
  options?: UseVerseOptions,
) {
  const normalized = book ? normalizeBookSlug(book) : '';
  const valid =
    normalized.length > 0 &&
    typeof chapter === 'number' &&
    chapter > 0 &&
    typeof verse === 'number' &&
    verse > 0;

  return useQuery({
    queryKey: bibleKeys.verse(normalized, chapter ?? 0, verse ?? 0),
    queryFn: () => getVerse(normalized, chapter as number, verse as number),
    enabled: valid && (options?.enabled ?? true),
    staleTime: Infinity,
  });
}
