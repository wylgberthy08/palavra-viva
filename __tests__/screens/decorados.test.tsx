import { fireEvent, render, screen } from '@testing-library/react-native';

import MeusScreen from '@/app/(tabs)/meus';
import { useSavedVerses } from '@/hooks/use-saved-verses';
import type { SavedVerse } from '@/types/saved-verse';

jest.mock('@/hooks/use-saved-verses', () => ({ useSavedVerses: jest.fn() }));
jest.mock('@/auth', () => ({ useAuth: () => ({ user: null, signOut: jest.fn() }) }));
jest.mock('@/account/hooks/use-excluir-conta', () => ({ useExcluirConta: () => ({ estado: 'ocioso', mensagem: null, excluir: jest.fn(), limpar: jest.fn() }) }));

const verses: SavedVerse[] = [
  { ref: 'filipenses/4/13', reference: 'Filipenses 4:13', bookSlug: 'filipenses', bookName: 'Filipenses', chapter: 4, verseStart: 13, verseEnd: 13, text: 'Posso todas as coisas naquele que me fortalece.', status: 'dominado', savedAt: '2026-10-20' },
  { ref: 'salmos/23/1', reference: 'Salmos 23:1', bookSlug: 'salmos', bookName: 'Salmos', chapter: 23, verseStart: 1, verseEnd: 1, text: 'O Senhor é o meu pastor; nada me faltará.', status: 'decorando', savedAt: '2026-10-20' },
];
const updateStatus = jest.fn();
const removeVerse = jest.fn();

function mockCollection(items = verses, error: string | null = null) {
  (useSavedVerses as jest.Mock).mockReturnValue({ items, loading: false, error, reload: jest.fn(), updateStatus, removeVerse });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCollection();
});

it('filtra por status mantendo a contagem total', async () => {
  await render(<MeusScreen />);
  expect(screen.getByText('2 versículos salvos')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Decorando'));
  expect(screen.queryByLabelText('Praticar Filipenses 4:13')).toBeNull();
  expect(screen.getByLabelText('Praticar Salmos 23:1')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Dominados'));
  expect(screen.getByLabelText('Praticar Filipenses 4:13')).toBeTruthy();
  expect(screen.queryByLabelText('Praticar Salmos 23:1')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Todos'));
  expect(screen.getByLabelText('Praticar Salmos 23:1')).toBeTruthy();
});

it('alterna o status nos dois sentidos e remove apenas o item escolhido', async () => {
  await render(<MeusScreen />);
  await fireEvent.press(screen.getByLabelText('Marcar Filipenses 4:13 como decorando'));
  expect(updateStatus).toHaveBeenCalledWith('filipenses/4/13', 'decorando');
  await fireEvent.press(screen.getByLabelText('Marcar Salmos 23:1 como dominado'));
  expect(updateStatus).toHaveBeenCalledWith('salmos/23/1', 'dominado');
  await fireEvent.press(screen.getByLabelText('Remover Filipenses 4:13'));
  expect(removeVerse).toHaveBeenCalledWith('filipenses/4/13');
});

it('abre a prática, revela o verso, conclui e reinicia ao reabrir', async () => {
  await render(<MeusScreen />);
  await fireEvent.press(screen.getByLabelText('Praticar Filipenses 4:13'));
  expect(screen.getByText('PRATICANDO')).toBeTruthy();
  expect(screen.getByText('REFERÊNCIA')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Revelar versículo'));
  expect(screen.getByText('VERSÍCULO')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Ocultar versículo'));
  expect(screen.getByText('REFERÊNCIA')).toBeTruthy();
  await fireEvent.press(screen.getByText('Concluir'));
  expect(screen.queryByText('PRATICANDO')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Praticar Filipenses 4:13'));
  expect(screen.getByText('REFERÊNCIA')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Fechar prática'));
  expect(screen.queryByText('PRATICANDO')).toBeNull();
});

it('só confirma domínio depois que o estado persistido muda', async () => {
  const view = await render(<MeusScreen />);
  await fireEvent.press(screen.getByLabelText('Praticar Salmos 23:1'));
  expect(screen.queryByText('Progresso registrado!')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Revelar versículo'));
  await fireEvent.press(screen.getByText('Dominei este versículo'));
  expect(updateStatus).toHaveBeenCalledWith('salmos/23/1', 'dominado');
  expect(screen.queryByText('Progresso registrado!')).toBeNull();
  mockCollection(verses.map((verse) => ({ ...verse, status: 'dominado' })));
  await view.rerender(<MeusScreen />);
  expect(screen.getByText('Progresso registrado!')).toBeTruthy();
});

it('mostra falha de persistência na prática sem confirmar domínio', async () => {
  const view = await render(<MeusScreen />);
  await fireEvent.press(screen.getByLabelText('Praticar Salmos 23:1'));
  await fireEvent.press(screen.getByLabelText('Revelar versículo'));
  await fireEvent.press(screen.getByText('Dominei este versículo'));
  mockCollection(verses, 'Falha ao salvar');
  await view.rerender(<MeusScreen />);
  expect(screen.getAllByText('Falha ao salvar').length).toBeGreaterThan(0);
  expect(screen.queryByText('Progresso registrado!')).toBeNull();
});

it('distingue um filtro vazio de uma coleção vazia', async () => {
  mockCollection([verses[0]]);
  await render(<MeusScreen />);
  await fireEvent.press(screen.getByLabelText('Decorando'));
  expect(screen.getByText('Nenhum versículo neste filtro.')).toBeTruthy();
  expect(screen.getByText('1 versículo salvo')).toBeTruthy();
});
