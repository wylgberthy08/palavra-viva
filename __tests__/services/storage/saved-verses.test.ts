import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SAVED_VERSES_STORAGE_KEY,
  SavedVersesReadError,
  loadSavedVerses,
  persistSavedVerses,
  toSavedVerse,
} from '@/services/storage/saved-verses';
import type { SavedVerse } from '@/types/saved-verse';
import type { Verse } from '@/types/bible';

const JOÃO_316: Verse = {
  ref: 'joao/3/16',
  reference: 'João 3:16',
  bookSlug: 'joao',
  bookName: 'João',
  chapter: 3,
  verseStart: 16,
  verseEnd: 16,
  text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigenito...',
  version: 'nvi',
};

/**
 * Item gravado pela versão v1 do formato, lido do storage como texto. A fixture é
 * o contrato de compatibilidade: os versículos já no aparelho têm esse formato, e
 * uma mudança no mapper não pode invalidá-los.
 */
const ITEM_V1_GRAVADO = JSON.stringify([
  {
    ref: 'joao/3/16',
    reference: 'João 3:16',
    bookSlug: 'joao',
    bookName: 'João',
    chapter: 3,
    verseStart: 16,
    verseEnd: 16,
    text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigenito...',
    status: 'decorando',
    savedAt: '2026-09-30T12:00:00.000Z',
  },
]);

describe('ciclo de persistência de versículos decorados', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('devolve lista vazia quando nada foi salvo', async () => {
    await expect(loadSavedVerses()).resolves.toEqual([]);
  });

  it('lê um item gravado pela versão v1 do formato', async () => {
    await AsyncStorage.setItem(SAVED_VERSES_STORAGE_KEY, ITEM_V1_GRAVADO);

    const items = await loadSavedVerses();

    expect(items).toHaveLength(1);
    expect(items[0].ref).toBe('joao/3/16');
    expect(items[0].status).toBe('decorando');
    expect(items[0].savedAt).toBe('2026-09-30T12:00:00.000Z');
  });

  it('preserva a ida e a volta do que toSavedVerse gravou', async () => {
    const gravado = toSavedVerse(JOÃO_316, 'dominado');
    await persistSavedVerses([gravado]);

    const items = await loadSavedVerses();

    expect(items).toEqual([gravado]);
  });

  it('mantém a ordem gravada', async () => {
    const lista: SavedVerse[] = [
      toSavedVerse(JOÃO_316, 'decorando'),
      { ...toSavedVerse(JOÃO_316, 'dominado'), ref: 'joao/3/17', verseStart: 17, verseEnd: 17 },
    ];
    await persistSavedVerses(lista);

    const items = await loadSavedVerses();

    expect(items.map((item) => item.ref)).toEqual(['joao/3/16', 'joao/3/17']);
  });

  it('descarta só o item inválido e preserva o restante da lista', async () => {
    const valido = toSavedVerse(JOÃO_316, 'decorando');
    // Intervalo invertido: verseEnd menor que verseStart. É o tipo de item que um
    // mapeamento antigo ou uma escrita interrompida deixa para trás.
    const corrompido = { ...toSavedVerse(JOÃO_316), ref: 'joao/3/17', verseStart: 17, verseEnd: 16 };
    await persistSavedVerses([valido, corrompido]);

    const items = await loadSavedVerses();

    expect(items.map((item) => item.ref)).toEqual(['joao/3/16']);
  });

  it('levanta erro nomeado quando o JSON está corrompido, em vez de devolver vazio', async () => {
    await AsyncStorage.setItem(SAVED_VERSES_STORAGE_KEY, '{isto nao e json');

    await expect(loadSavedVerses()).rejects.toThrow(SavedVersesReadError);
  });

  it('levanta erro nomeado quando o conteúdo não é lista', async () => {
    await AsyncStorage.setItem(SAVED_VERSES_STORAGE_KEY, JSON.stringify({ nao: 'e lista' }));

    await expect(loadSavedVerses()).rejects.toThrow(SavedVersesReadError);
  });
});
