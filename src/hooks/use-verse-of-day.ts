import { useQuery } from '@tanstack/react-query';

import { bibleKeys } from '@/query/keys';
import { getVerseOfDay } from '@/services/api/bible-api';

/** Versículo do dia (pt-BR, NVI). Key inclui a data — vira à meia-noite. */
export function useVerseOfDay() {
  return useQuery({
    queryKey: bibleKeys.votd(),
    queryFn: getVerseOfDay,
    staleTime: 1000 * 60 * 60 * 12, // 12h
    gcTime: 1000 * 60 * 60 * 24, // 24h
  });
}
