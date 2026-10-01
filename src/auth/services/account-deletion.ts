import type { ResultadoExclusao } from '@/account/types/account';

import { supabase } from './supabase';

const EDGE_FUNCTION = 'delete-account';
const TIMEOUT_MS = 10_000;

/** Corpo de erro que a Edge Function devolve, por `contracts/edge-function-delete-account.md`. */
interface CorpoErro {
  code?: string;
  message?: string;
}

function statusDoErro(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const contexto = (error as { context?: { status?: unknown } }).context;
  const status = contexto?.status;
  return typeof status === 'number' ? status : undefined;
}

async function leCorpoDeErro(error: unknown): Promise<CorpoErro | null> {
  if (typeof error !== 'object' || error === null) return null;
  const contexto = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (typeof contexto?.json !== 'function') return null;
  try {
    const corpo: unknown = await contexto.json();
    return typeof corpo === 'object' && corpo !== null ? (corpo as CorpoErro) : null;
  } catch {
    // A resposta de erro nem sempre é JSON (proxy, gateway, HTML de erro).
    // Um corpo ilegível é uma falha de transporte, não um motivo para mentir
    // sobre o resultado da exclusão.
    return null;
  }
}

/**
 * Pede a exclusão da conta autenticada.
 *
 * O alvo é derivado do JWT da sessão pelo mesmo cliente gerenciado em
 * `supabase.ts`, então não existe `user_id` no corpo: não há superfície para
 * apagar a conta de outra pessoa. A `service_role` fica só na Edge Function.
 *
 * Nunca lança. A UI decide o que fazer com cada um dos quatro resultados, e
 * thrown aqui viraria tratamento de erro espalhado por quem chama.
 */
export async function excluirConta(): Promise<ResultadoExclusao> {
  try {
    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION, {
      method: 'POST',
      timeout: TIMEOUT_MS,
    });

    if (error) {
      const status = statusDoErro(error);
      if (status === 401 || status === 403) {
        return { status: 'falha_de_autorizacao' };
      }

      const corpo = await leCorpoDeErro(error);
      if (corpo?.code === 'storage_objects') {
        return { status: 'usuario_com_objetos_no_storage' };
      }

      return { status: 'falha_de_rede' };
    }

    // A função devolve `{ deleted: true, userId }`. Um 2xx sem essa marca não
    // significa que a conta sumiu, e o app não pode limpar o dispositivo
    // acreditando que a exclusão teve sucesso.
    const confirmado = (data as { deleted?: unknown } | null)?.deleted === true;
    return confirmado ? { status: 'sucesso' } : { status: 'falha_de_rede' };
  } catch {
    // `functions.invoke` lança em falha de transporte antes de montar a
    // resposta. A conta continua existindo; nada foi alterado.
    return { status: 'falha_de_rede' };
  }
}
