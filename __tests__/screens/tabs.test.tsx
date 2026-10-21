import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import MeusScreen from '@/app/(tabs)/meus';
import { useSavedVerses } from '@/hooks/use-saved-verses';
import { useVerseOfDay } from '@/hooks/use-verse-of-day';

jest.mock('@/hooks/use-saved-verses', () => ({ useSavedVerses: jest.fn() }));
jest.mock('@/hooks/use-verse-of-day', () => ({ useVerseOfDay: jest.fn() }));
jest.mock('@/hooks/use-books', () => ({ useBooks: () => ({ books: [{ name: 'João', slug: 'joao', chapters: 21 }], isPending: false }) }));
jest.mock('@/hooks/use-chapter', () => ({ useChapter: () => ({ data: { verses: [{ verse: 1 }] }, isPending: false }) }));
jest.mock('@/hooks/use-verse', () => ({ useVerse: () => ({ data: { ref: 'joao/1/1', reference: 'João 1:1', text: 'Texto selecionado' }, isPending: false }) }));
jest.mock('@/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/account/hooks/use-excluir-conta', () => ({ useExcluirConta: jest.fn() }));

const useAuth = jest.requireMock('@/auth').useAuth as jest.Mock;
const useVerseOfDayMock = useVerseOfDay as jest.MockedFunction<typeof useVerseOfDay>;
const useExcluirContaMock = jest.requireMock('@/account/hooks/use-excluir-conta')
  .useExcluirConta as jest.Mock;

const RECARGA = {
  reload: jest.fn(),
  isSaved: jest.fn(() => false),
  saveVerse: jest.fn(),
  removeVerse: jest.fn(),
  toggleVerse: jest.fn(),
  updateStatus: jest.fn(),
  clear: jest.fn(),
};

function semSalvos(extra: Record<string, unknown> = {}) {
  (useSavedVerses as jest.MockedFunction<typeof useSavedVerses>).mockReturnValue({
    items: [],
    loading: false,
    error: null,
    ...RECARGA,
    ...extra,
  } as unknown as ReturnType<typeof useSavedVerses>);
}

beforeEach(() => {
  semSalvos();
  useVerseOfDayMock.mockReturnValue({
    data: { ref: 'joao/14/27', reference: 'João 14:27', text: 'Deixo-lhes a paz.' },
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useVerseOfDay>);
  useAuth.mockReturnValue({ user: null, signOut: jest.fn() });
  useExcluirContaMock.mockReturnValue({
    estado: 'ocioso',
    mensagem: null,
    excluir: jest.fn(),
    limpar: jest.fn(),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MeusScreen', () => {
  it('não quebra quando a conta não tem email nem nome', async () => {
    // `user.email[0]` em string vazia é undefined e derrubava a tela inteira.
    useAuth.mockReturnValue({
      user: { id: 'u1', email: '', name: null, avatarUrl: null, createdAt: '', updatedAt: '' },
      signOut: jest.fn(),
    });

    await render(<MeusScreen />);

    expect(screen.getByText('?')).toBeTruthy();
  });

  it('usa a inicial do nome quando existe', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', email: 'ana@exemplo.com', name: 'ana', avatarUrl: null, createdAt: '', updatedAt: '' },
      signOut: jest.fn(),
    });

    await render(<MeusScreen />);

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('mostra ErrorState com retry quando a leitura falha', async () => {
    const reload = jest.fn();
    semSalvos({ error: 'Não foi possível ler os versículos salvos.', reload });

    await render(<MeusScreen />);

    // Falha de leitura não pode aparecer como "nenhum versículo decorado".
    expect(screen.queryByText(/Nenhum versículo decorado/)).toBeNull();
    expect(screen.getByText('Não foi possível ler os versículos salvos.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar de novo'));
    expect(reload).toHaveBeenCalled();
  });

  it('mostra EmptyState quando não há erro e não há salvos', async () => {
    await render(<MeusScreen />);

    expect(screen.getByText(/Nenhum versículo decorado/)).toBeTruthy();
  });
  it('abre as opções da conta ao tocar no nome', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', email: 'joao@exemplo.com', name: null, avatarUrl: null, createdAt: '', updatedAt: '' },
      signOut: jest.fn(),
    });

    await render(<MeusScreen />);

    expect(screen.queryByTestId('conta-opcoes')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Abrir opções da conta'));

    expect(screen.getByTestId('conta-opcoes')).toBeTruthy();
    expect(screen.getByText('Sair')).toBeTruthy();
    expect(screen.getByTestId('conta-item-excluir')).toBeTruthy();
  });

  it('encaminha a exclusão confirmada para o hook', async () => {
    const excluir = jest.fn();
    useAuth.mockReturnValue({
      user: { id: 'u1', email: 'joao@exemplo.com', name: null, avatarUrl: null, createdAt: '', updatedAt: '' },
      signOut: jest.fn(),
    });
    useExcluirContaMock.mockReturnValue({
      estado: 'ocioso',
      mensagem: null,
      excluir,
      limpar: jest.fn(),
    });

    await render(<MeusScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir opções da conta'));
    await fireEvent.press(screen.getByTestId('conta-item-excluir'));
    await fireEvent.press(screen.getByTestId('conta-confirmar-exclusao'));

    expect(excluir).toHaveBeenCalledTimes(1);
  });
});

describe('HomeScreen', () => {
  it('revela e oculta o texto', async () => {
    await render(<HomeScreen />);
    expect(screen.queryByText('Deixo-lhes a paz.')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Revelar versículo João 14:27'));
    expect(screen.getByText('Deixo-lhes a paz.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Ocultar versículo'));
    expect(screen.queryByText('Deixo-lhes a paz.')).toBeNull();
  });
  it('salva o versículo atual', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText('Salvar para decorar'));
    expect(RECARGA.saveVerse).toHaveBeenCalledWith(expect.objectContaining({ ref: 'joao/14/27' }));
    expect(RECARGA.toggleVerse).not.toHaveBeenCalled();
  });
  it('mostra o progresso real', async () => {
    semSalvos({ items: [{ ref: 'a', status: 'dominado' }, { ref: 'b', status: 'decorando' }] });
    await render(<HomeScreen />);
    expect(screen.getByText('1/2 dominados')).toBeTruthy();
  });
  it('seleciona uma passagem e reinicia a seleção ao mudar o livro', async () => {
    await render(<HomeScreen />);
    expect(screen.getByLabelText('Selecionar capítulo').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByLabelText('Selecionar livro'));
    await fireEvent.press(screen.getByText('João'));
    await fireEvent.press(screen.getByLabelText('Selecionar capítulo'));
    await fireEvent.press(screen.getByText('1'));
    await fireEvent.press(screen.getByLabelText('Selecionar versículo'));
    const options = screen.getAllByText('1');
    await fireEvent.press(options[options.length - 1]);
    expect(screen.getByLabelText('Revelar versículo João 1:1')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Selecionar livro'));
    const bookOptions = screen.getAllByText('João', { exact: true });
    await fireEvent.press(bookOptions[bookOptions.length - 1]);
    expect(screen.getByLabelText('Selecionar versículo').props.accessibilityState.disabled).toBe(true);
  });
});
