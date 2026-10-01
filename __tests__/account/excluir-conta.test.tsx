import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { OpcoesConta } from '@/account/components/OpcoesConta';
import { useExcluirConta } from '@/account/hooks/use-excluir-conta';
import { MENSAGEM_EXCLUSAO } from '@/account/types/account';
import { useAuth } from '@/auth';
import { excluirConta } from '@/auth/services/account-deletion';
import { useSavedVerses } from '@/hooks/use-saved-verses';

jest.mock('@/auth/services/account-deletion', () => ({ excluirConta: jest.fn() }));
jest.mock('@/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/use-saved-verses', () => ({ useSavedVerses: jest.fn() }));

const excluirContaMock = excluirConta as jest.MockedFunction<typeof excluirConta>;
const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;
const useSavedVersesMock = useSavedVerses as jest.MockedFunction<typeof useSavedVerses>;

const LIMPAR = jest.fn(async () => {});
const SIGNOUT = jest.fn(async () => {});

/**
 * `useExcluirConta` chama `queryClient.clear()`, então o hook só monta dentro
 * de um `QueryClientProvider`.
 */
function ComQueryClient({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  LIMPAR.mockImplementation(async () => {});
  SIGNOUT.mockImplementation(async () => {});
  useAuthMock.mockReturnValue({ signOut: SIGNOUT } as unknown as ReturnType<typeof useAuth>);
  useSavedVersesMock.mockReturnValue({
    clear: LIMPAR,
  } as unknown as ReturnType<typeof useSavedVerses>);
});

describe('useExcluirConta', () => {
  it('apaga dados locais e encerra a sessão quando o servidor confirma', async () => {
    excluirContaMock.mockResolvedValue({ status: 'sucesso' });

    const { result } = await renderHook(() => useExcluirConta(), { wrapper: ComQueryClient });

    await act(async () => {
      await result.current.excluir();
    });

    expect(LIMPAR).toHaveBeenCalledTimes(1);
    expect(SIGNOUT).toHaveBeenCalledTimes(1);
    expect(result.current.estado).toBe('concluido');
    expect(result.current.mensagem).toBeNull();
  });

  // Proteção central da feature: apagar os versículos antes da confirmação do
  // servidor perderia dados de uma conta que continua existindo.
  it('NÃO apaga versículos nem encerra a sessão quando a exclusão falha', async () => {
    excluirContaMock.mockResolvedValue({ status: 'falha_de_rede' });

    const { result } = await renderHook(() => useExcluirConta(), { wrapper: ComQueryClient });

    await act(async () => {
      await result.current.excluir();
    });

    expect(LIMPAR).not.toHaveBeenCalled();
    expect(SIGNOUT).not.toHaveBeenCalled();
    expect(result.current.estado).toBe('falhou');
    expect(result.current.mensagem).toBe(MENSAGEM_EXCLUSAO.falha_de_rede);
  });

  it('mostra orientação específica quando há objetos no armazenamento', async () => {
    excluirContaMock.mockResolvedValue({ status: 'usuario_com_objetos_no_storage' });

    const { result } = await renderHook(() => useExcluirConta(), { wrapper: ComQueryClient });

    await act(async () => {
      await result.current.excluir();
    });

    expect(LIMPAR).not.toHaveBeenCalled();
    expect(result.current.mensagem).toBe(MENSAGEM_EXCLUSAO.usuario_com_objetos_no_storage);
  });

  it('encerra a sessão mesmo se a limpeza local falhar depois do servidor apagar a conta', async () => {
    // A conta não existe mais. Deixar o usuário autenticado o prenderia num
    // limbo em que não consegue nem entrar de novo.
    excluirContaMock.mockResolvedValue({ status: 'sucesso' });
    LIMPAR.mockRejectedValue(new Error('AsyncStorage indisponível'));

    const { result } = await renderHook(() => useExcluirConta(), { wrapper: ComQueryClient });

    await act(async () => {
      await result.current.excluir();
    });

    expect(SIGNOUT).toHaveBeenCalledTimes(1);
    expect(result.current.estado).toBe('concluido');
  });

  it('ignora uma segunda exclusão disparada no mesmo instante', async () => {
    excluirContaMock.mockResolvedValue({ status: 'sucesso' });

    const { result } = await renderHook(() => useExcluirConta(), { wrapper: ComQueryClient });

    await act(async () => {
      await Promise.all([result.current.excluir(), result.current.excluir()]);
    });

    // Duas chamadas significariam duas exclusões e logout concorrente.
    expect(excluirContaMock).toHaveBeenCalledTimes(1);
    expect(SIGNOUT).toHaveBeenCalledTimes(1);
  });
});

describe('OpcoesConta', () => {
  it('não executa a exclusão ao tocar na primeira opção de excluir', async () => {
    const onDelete = jest.fn();

    await render(
      <OpcoesConta
        visible
        email="joao@exemplo.com"
        onClose={jest.fn()}
        onSignOut={jest.fn()}
        onDelete={onDelete}
      />,
    );

    // Primeiro toque só abre a confirmação.
    await fireEvent.press(screen.getByTestId('conta-item-excluir'));
    expect(onDelete).not.toHaveBeenCalled();

    // Só o botão da tela de confirmação executa.
    await fireEvent.press(screen.getByTestId('conta-confirmar-exclusao'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('exibe o motivo da falha dentro do dialogo', async () => {
    await render(
      <OpcoesConta
        visible
        email="joao@exemplo.com"
        mensagem="Falha simulada"
        onClose={jest.fn()}
        onSignOut={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('conta-item-excluir'));
    expect(screen.getByTestId('conta-erro')).toBeTruthy();
    expect(screen.getByText('Falha simulada')).toBeTruthy();
  });

  it('cancelar volta ao menu sem executar nada', async () => {
    const onDelete = jest.fn();
    const onClose = jest.fn();

    await render(
      <OpcoesConta
        visible
        email="joao@exemplo.com"
        onClose={onClose}
        onSignOut={jest.fn()}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByTestId('conta-item-excluir'));
    await fireEvent.press(screen.getByTestId('conta-cancelar'));

    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('impede nova tentativa enquanto a exclusão está em andamento', async () => {
    const onDelete = jest.fn();

    const { rerender } = await render(
      <OpcoesConta
        visible
        email="joao@exemplo.com"
        onClose={jest.fn()}
        onSignOut={jest.fn()}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByTestId('conta-item-excluir'));
    await fireEvent.press(screen.getByTestId('conta-confirmar-exclusao'));
    expect(onDelete).toHaveBeenCalledTimes(1);

    // A interface reflete a exclusão em andamento e trava a ação.
    await rerender(
      <OpcoesConta
        visible
        busy
        email="joao@exemplo.com"
        onClose={jest.fn()}
        onSignOut={jest.fn()}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Excluindo...')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('conta-confirmar-exclusao'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
