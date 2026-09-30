import { useQuery } from '@tanstack/react-query';

import { bibleKeys } from '@/query/keys';
import { getBooks } from '@/services/api/bible-api';
import type { BibleBook } from '@/types/bible';

interface UseBooksOptions {
  testament?: 'old' | 'new';
  enabled?: boolean;
}

/** Lista os 66 livros (nomes/slugs pt-BR) com cache. */
export function useBooks(options?: UseBooksOptions) {
  const query = useQuery({
    queryKey: bibleKeys.books(),
    queryFn: getBooks,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });

  const books: BibleBook[] | undefined = options?.testament
    ? query.data?.filter((b) => b.testament === options.testament)
    : query.data;

  return { ...query, books };
}
