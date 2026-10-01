import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { MENSAGEM_EXCLUSAO, type ResultadoExclusao } from '@/account/types/account';
import { useAuth } from '@/auth';
import { excluirConta } from '@/auth/services/account-deletion';
import { useSavedVerses } from '@/hooks/use-saved-verses';

type EstadoExclusao = 'ocioso' | 'excluindo' | 'concluido' | 'falhou';

interface UseExcluirConta {
  estado: EstadoExclusao;
  mensagem: string | null;
  excluir: () => Promise<void>;
  limpar: () => void;
}

/**
 * Orquestra a exclusão de conta.
 *
 * A ordem no sucesso importa e não é negociável: os dados locais só são
 * apagados depois que o servidor confirma. Na ordem inversa, uma falha de rede
 * destruiria a coleção de versículos de uma conta que continua existindo — e o
 * usuário perderia os dados sem ter perdido a conta.
 *
 * `signOut` vem por último porque o guard de sessão em `(tabs)/_layout.tsx` já
 * leva para `/(auth)/login` quando `user` fica `null`.
 */
export function useExcluirConta(): UseExcluirConta {
  const { signOut } = useAuth();
  const { clear } = useSavedVerses();
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoExclusao>('ocioso');
  const [mensagem, setMensagem] = useState<string | null>(null);
  // Um ref, e não o estado, para o guard: dois toques no mesmo tick ainda veem
  // o `estado` antigo, porque o state só chega na próxima renderização. Com o
  // estado, dois toques disparavam duas exclusões e dois logouts concorrentes.
  const emVoo = useRef(false);

  const excluir = useCallback(async () => {
    if (emVoo.current) return;
    emVoo.current = true;

    setEstado('excluindo');
    setMensagem(null);

    try {
      const resultado: ResultadoExclusao = await excluirConta();

      if (resultado.status !== 'sucesso') {
        // Nada foi alterado: a conta continua ativa e os versículos continuam salvos.
        setEstado('falhou');
        setMensagem(MENSAGEM_EXCLUSAO[resultado.status]);
        return;
      }

      // A conta já não existe no servidor a partir daqui. A limpeza local é o
      // melhor esforço possível, mas a sessão precisa terminar de qualquer
      // forma: manter o usuário autenticado para uma conta apagada o deixaria
      // preso num limbo em que não consegue nem entrar de novo.
      try {
        await clear();
      } catch {
        // Versículos órfãos no aparelho são um incômodo menor do que uma
        // sessão morta. A próxima gravação do usuário sobrescreve a chave.
      }
      queryClient.clear();
      await signOut();
      setEstado('concluido');
    } finally {
      emVoo.current = false;
    }
  }, [clear, queryClient, signOut]);

  const limpar = useCallback(() => {
    setEstado('ocioso');
    setMensagem(null);
  }, []);

  return { estado, mensagem, excluir, limpar };
}
