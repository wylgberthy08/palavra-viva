import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import {
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

  useEffect(() => {
    let active = true;
    loadSavedVerses()
      .then((loaded) => {
        if (active) setItems(loaded);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async (next: SavedVerse[]) => {
    setItems(next);
    await persistSavedVerses(next);
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
