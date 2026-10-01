import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  clearSavedVerses,
  loadSavedVerses,
  persistSavedVerses,
  toSavedVerse,
} from '@/services/storage/saved-verses';
import type { Verse } from '@/types/bible';
import type { SavedStatus, SavedVerse } from '@/types/saved-verse';

type SavedVersesContextValue = ReturnType<typeof useSavedVersesState>;

const SavedVersesContext = createContext<SavedVersesContextValue | null>(null);
const SavedVersesContextProvider = SavedVersesContext.Provider;

function useSavedVersesState() {
  const [items, setItems] = useState<SavedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Só muda quando o usuário pede para tentar de novo, e é o gatilho do efeito.
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let active = true;
    loadSavedVerses()
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        // Falha de leitura não é lista vazia. Dizer "nenhum versículo decorado"
        // para quem tem 40 salvos é a pior resposta possível.
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Erro ao carregar versículos salvos.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tentativa]);

  /** Refaz a leitura. É o que o botão de retry da ErrorState chama. */
  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    setTentativa((n) => n + 1);
  }, []);

  const save = useCallback(async (next: SavedVerse[]) => {
    // Persistir antes de atualizar o estado: o que a tela mostra sempre foi gravado.
    // O atraso de um quadro custa menos que mostrar ao usuário um versículo
    // decorado que se perde ao fechar o app.
    //
    // A falha vai para o mesmo `error` da leitura, e a promessa resolve. Rejeitar
    // aqui viraria unhandled rejection nas quatro chamadas por evento do app, que
    // não fazem `await`. Um canal só de erro é o que o Princípio V pede.
    try {
      await persistSavedVerses(next);
      setItems(next);
      setError(null);
    } catch {
      setError('Não foi possível salvar o versículo. Tente de novo.');
    }
  }, []);

  /**
   * Apaga a coleção inteira. Usado pela exclusão de conta, onde a sessão já
   * morreu no servidor: persistir `[]` aqui seria mostrar estado que não
   * corresponde mais a nenhuma conta.
   */
  const clear = useCallback(async () => {
    await clearSavedVerses();
    setItems([]);
    setError(null);
  }, []);

  const isSaved = useCallback((ref: string) => items.some((v) => v.ref === ref), [items]);
  const saveVerse = useCallback(
    async (verse: Verse, status: SavedStatus = 'decorando') => {
      if (items.some((v) => v.ref === verse.ref)) return;
      await save([...items, toSavedVerse(verse, status)]);
    },
    [items, save],
  );

  const removeVerse = useCallback(
    async (ref: string) => {
      await save(items.filter((v) => v.ref !== ref));
    },
    [items, save],
  );

  const toggleVerse = useCallback(
    async (verse: Verse) => {
      if (items.some((v) => v.ref === verse.ref)) {
        await save(items.filter((v) => v.ref !== verse.ref));
      } else {
        await save([...items, toSavedVerse(verse)]);
      }
    },
    [items, save],
  );

  const updateStatus = useCallback(
    async (ref: string, status: SavedStatus) => {
      await save(items.map((v) => (v.ref === ref ? { ...v, status } : v)));
    },
    [items, save],
  );

  return {
    items,
    loading,
    error,
    reload,
    clear,
    isSaved,
    saveVerse,
    removeVerse,
    toggleVerse,
    updateStatus,
  };
}

export function SavedVersesProvider({ children }: { children?: ReactNode }) {
  const value = useSavedVersesState();

  return createElement(SavedVersesContextProvider, { value }, children);
}

export function useSavedVerses() {
  const context = useContext(SavedVersesContext);

  if (!context) {
    throw new Error('useSavedVerses must be used within SavedVersesProvider');
  }

  return context;
}
