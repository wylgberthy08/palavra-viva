import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import MeusScreen from '@/app/(tabs)/meus';
import { useSavedVerses } from '@/hooks/use-saved-verses';
import { useSearchVerse } from '@/hooks/use-search-verse';

jest.mock('@/hooks/use-saved-verses', () => ({ useSavedVerses: jest.fn() }));
jest.mock('@/hooks/use-search-verse', () => ({ useSearchVerse: jest.fn() }));
jest.mock('@/auth', () => ({ useAuth: jest.fn() }));

const useAuth = jest.requireMock('@/auth').useAuth as jest.Mock;
const useSearchVerseMock = useSearchVerse as jest.MockedFunction<typeof useSearchVerse>;

const RECARGA = {
  reload: jest.fn(),
  isSaved: jest.fn(() => false),
  saveVerse: jest.fn(),
  removeVerse: jest.fn(),
  toggleVerse: jest.fn(),
  updateStatus: jest.fn(),
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
  useSearchVerseMock.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useSearchVerse>);
  useAuth.mockReturnValue({ user: null, signOut: jest.fn() });
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
});

describe('HomeScreen', () => {
  // No Testing Library 14 `fireEvent` é assíncrono: sem `await` o escopo de
  // `act` fica aberto e o teste seguinte renderiza contra uma árvore velha.
  it('informa o motivo quando a busca tem menos de três caracteres', async () => {
    await render(<HomeScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('João 3:16'), 'Jo');
    await fireEvent.press(screen.getByLabelText('Buscar versículo'));

    await waitFor(() => {
      expect(screen.getByText(/ao menos 3 caracteres/)).toBeTruthy();
    });
  });

  it('limpa o aviso quando a busca volta a ter tamanho válido', async () => {
    await render(<HomeScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('João 3:16'), 'Jo');
    await fireEvent.press(screen.getByLabelText('Buscar versículo'));
    await waitFor(() => expect(screen.getByText(/ao menos 3 caracteres/)).toBeTruthy());

    // A entrada é consultada de novo: a referência capturada antes do
    // `waitFor` pertence a uma árvore que já foi descartada.
    await fireEvent.changeText(screen.getByPlaceholderText('João 3:16'), 'João 3:16');
    await fireEvent.press(screen.getByLabelText('Buscar versículo'));

    await waitFor(() => expect(screen.queryByText(/ao menos 3 caracteres/)).toBeNull());
  });

  it('não mostra o aviso antes de qualquer busca', async () => {
    await render(<HomeScreen />);

    expect(screen.queryByText(/ao menos 3 caracteres/)).toBeNull();
  });
});
