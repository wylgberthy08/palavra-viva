import { useQuery } from '@tanstack/react-query';

import { bibleKeys } from '@/query/keys';
import { getChapter, normalizeBookSlug } from '@/services/api/bible-api';

interface UseChapterOptions {
  enabled?: boolean;
}

/** Capítulo completo NVI (útil p/ contexto do flashcard). */
export function useChapter(
  book: string | undefined,
  chapter: number | undefined,
  options?: UseChapterOptions,
) {
  const normalized = book ? normalizeBookSlug(book) : '';
  const valid = normalized.length > 0 && typeof chapter === 'number' && chapter > 0;

  return useQuery({
    queryKey: bibleKeys.chapter(normalized, chapter ?? 0),
    queryFn: () => getChapter(normalized, chapter as number),
    enabled: valid && (options?.enabled ?? true),
    staleTime: Infinity,
  });
}
