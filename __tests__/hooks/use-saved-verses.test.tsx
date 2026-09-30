import AsyncStorage from '@react-native-async-storage/async-storage';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SavedVersesProvider, useSavedVerses } from '@/hooks/use-saved-verses';
import {
  SAVED_VERSES_STORAGE_KEY,
  persistSavedVerses,
  toSavedVerse,
} from '@/services/storage/saved-verses';
import type { Verse } from '@/types/bible';

const JOÃO_316: Verse = {
  ref: 'joao/3/16',
  reference: 'João 3:16',
  bookSlug: 'joao',
  bookName: 'João',
  chapter: 3,
  verseStart: 16,
  verseEnd: 16,
  text: 'Porque Deus amou o mundo de tal maneira...',
  version: 'nvi',
};

const SALMOS_231: Verse = {
  ref: 'salmos/23/1',
  reference: 'Salmos 23:1',
  bookSlug: 'salmos',
  bookName: 'Salmos',
  chapter: 23,
  verseStart: 1,
  verseEnd: 1,
  text: 'O SENHOR é o meu pastor; nada me faltará.',
  version: 'nvi',
};

/**
 * Consumidor que expõe os três sinais separadamente, porque a pergunta de cada
 * teste é sobre um deles: a contagem, o erro, ou os dois ao mesmo tempo. Se o
 * erro escondesse a contagem, não daria para provar que a lista sobreviveu a uma
 * escrita que falhou.
 */
function Consumidor() {
  const { items, loading, error, saveVerse } = useSavedVerses();

  if (loading) return <Text>carregando</Text>;

  return (
    <>
      <Text>{items.length === 0 ? 'lista vazia' : `itens: ${items.length}`}</Text>
      {error ? <Text>erro: {error}</Text> : null}
      <Text onPress={() => saveVerse(JOÃO_316)}>salvar</Text>
      <Text onPress={() => saveVerse(SALMOS_231)}>salvar-outro</Text>
    </>
  );
}

async function renderizarConsumidor() {
  return render(
    <SavedVersesProvider>
      <Consumidor />
    </SavedVersesProvider>
  );
}

/**
 * `jest.spyOn(AsyncStorage, ...)` + `mockRestore` não serve aqui. A referência é
 * devolvida, mas o storage do mock deixa de persistir depois que o spy foi
 * criado: um `setItem` bem-sucedido passa a ser lido como `null` no mesmo teste.
 * Verificado com um teste isolado antes de escolher a troca por atribuição.
 */
const restauracoes: (() => void)[] = [];

function falhaEmGravar(erro: Error) {
  const original = AsyncStorage.setItem;
  AsyncStorage.setItem = jest.fn().mockRejectedValue(erro) as typeof AsyncStorage.setItem;
  restauracoes.push(() => {
    AsyncStorage.setItem = original;
  });
}

function falhaNaLeitura(erro: Error) {
  const original = AsyncStorage.getItem;
  AsyncStorage.getItem = jest.fn().mockRejectedValue(erro) as typeof AsyncStorage.getItem;
  restauracoes.push(() => {
    AsyncStorage.getItem = original;
  });
}

describe('useSavedVerses', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    while (restauracoes.length > 0) restauracoes.pop()?.();
  });

  describe('escrita rejeitada', () => {
    it('não exibe o item quando a gravação falha', async () => {
      falhaEmGravar(new Error('disco cheio'));

      const { getByText, queryByText } = await renderizarConsumidor();

      // `fireEvent` no Testing Library 14 é assíncrono e envolve o `act`.
      // Chamar `props.onPress()` direto deixava a escrita em voo fora do act.
      await fireEvent.press(getByText('salvar'));

      // A tela mentiria se mostrasse o versículo: ele não chegou a ser gravado.
      await waitFor(() => {
        expect(getByText(/Não foi possível salvar/)).toBeTruthy();
      });
      expect(queryByText('itens: 1')).toBeNull();
    });

    it('preserva a lista que já estava gravada', async () => {
      await persistSavedVerses([toSavedVerse(JOÃO_316, 'decorando')]);

      const { getByText, queryByText } = await renderizarConsumidor();

      await waitFor(() => {
        expect(getByText('itens: 1')).toBeTruthy();
      });

      falhaEmGravar(new Error('disco cheio'));

      // A segunda gravação é de outro versículo, senão `saveVerse` sai antes,
      // no curto-circuito de "já está salvo", e nada é tentado.
      await fireEvent.press(getByText('salvar-outro'));

      // O versículo que já existia em disco não pode sumir por causa de uma nova falha.
      await waitFor(() => {
        expect(queryByText('itens: 1')).toBeTruthy();
      });
      expect(SAVED_VERSES_STORAGE_KEY).toBe('@palavra-viva/saved-verses/v1');
    });
  });

  describe('carregamento rejeitado', () => {
    it('expõe o erro em vez de afirmar que a lista está vazia', async () => {
      falhaNaLeitura(new Error('storage indisponível'));

      const { getByText } = await renderizarConsumidor();

      // O hook não pode esconder a falha atrás de uma lista vazia: quem salvou
      // 40 versículos precisa saber que a falha é de leitura, não de estado.
      await waitFor(() => {
        expect(getByText(/Não foi possível ler os versículos salvos/)).toBeTruthy();
      });
    });
  });
});
