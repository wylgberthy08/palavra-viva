import { QueryClient } from '@tanstack/react-query';

/**
 * Conteúdo bíblico é imutável (edge cache 1 ano na API).
 * Versículos/livros: stale infinito. VOTD: chave inclui a data (ver keys.ts).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24, // 24h
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 dias
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
