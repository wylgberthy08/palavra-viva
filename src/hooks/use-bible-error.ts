import { isAxiosError } from 'axios';

import type { BibleApiErrorBody } from '@/types/bible';

/** Extrai a sugestão `didYouMean` do corpo de erro da API midvash. */
export function getDidYouMean(error: unknown): string | undefined {
  if (isAxiosError<BibleApiErrorBody>(error)) {
    return error.response?.data?.didYouMean ?? undefined;
  }
  return undefined;
}

/** Mensagem amigável p/ exibir na UI em caso de falha. */
export function getBibleErrorMessage(error: unknown): string {
  const hint = getDidYouMean(error);
  if (hint) {
    return `Referência não encontrada. Você quis dizer "${hint}"?`;
  }
  if (isAxiosError(error) && error.response?.status === 404) {
    return 'Versículo não encontrado. Confira livro, capítulo e versículo.';
  }
  return 'Não foi possível carregar. Verifique sua conexão e tente de novo.';
}
