import { useQuery } from '@tanstack/react-query';

import { bibleKeys } from '@/query/keys';
import { searchVerse } from '@/services/api/bible-api';

interface UseSearchVerseOptions {
  enabled?: boolean;
}

/**
 * Busca livre ("João 3:16", "Sl 23:1").
 * Faz parse + fetch do versículo. Só dispara com 3+ caracteres.
 */
export function useSearchVerse(query: string, options?: UseSearchVerseOptions) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: bibleKeys.parse(trimmed),
    queryFn: () => searchVerse(trimmed),
    enabled: trimmed.length >= 3 && (options?.enabled ?? true),
    staleTime: Infinity,
  });
}
