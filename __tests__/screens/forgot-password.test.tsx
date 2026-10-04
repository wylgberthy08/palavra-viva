import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import ForgotPasswordScreen from '@/auth/screens/ForgotPasswordScreen';
import { solicitarRecuperacaoDeSenha } from '@/auth/services/password-recovery';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

jest.mock('@/auth/services/password-recovery', () => ({
  solicitarRecuperacaoDeSenha: jest.fn(),
}));

const solicitarMock = solicitarRecuperacaoDeSenha as jest.MockedFunction<
  typeof solicitarRecuperacaoDeSenha
>;

const CONFIRMADO = { status: 'confirmado' } as const;
const TEXTO_CONFIRMADO = 'Se a conta existir, enviamos um link para o seu email.';

beforeEach(() => {
  jest.clearAllMocks();
  solicitarMock.mockResolvedValue(CONFIRMADO);
});

async function digitarEmail(email: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('seu@email.com'), email);
}

async function apertarEnviar() {
  await fireEvent.press(screen.getByText('Enviar link'));
}

describe('ForgotPasswordScreen', () => {
  it('pede a recuperação com o email exatamente como digitado', async () => {
    // Cortar espaços é papel do serviço, que já tem teste próprio. A tela repassa.
    await render(<ForgotPasswordScreen />);
    await digitarEmail('  dados@exemplo.com  ');

    await apertarEnviar();

    await waitFor(() => expect(solicitarMock).toHaveBeenCalledWith('  dados@exemplo.com  '));
  });

  it('não pede nada e avisa quando o email está vazio', async () => {
    await render(<ForgotPasswordScreen />);

    await apertarEnviar();

    await waitFor(() => expect(screen.getByText('Informe seu email.')).toBeTruthy());
    expect(solicitarMock).not.toHaveBeenCalled();
  });

  it('confirma sem revelar se a conta existe', async () => {
    // O serviço já colapsa e-mail existente, inexistente e taxa de envio em
    // `confirmado` (FR-003). A tela não pode reintroduzir a distinção.
    await render(<ForgotPasswordScreen />);
    await digitarEmail('ninguem@exemplo.com');

    await apertarEnviar();

    await waitFor(() => expect(screen.getByText(TEXTO_CONFIRMADO)).toBeTruthy());
    expect(screen.queryByPlaceholderText('seu@email.com')).toBeNull();
  });

  it('remove o campo e oferece voltar para o login depois de confirmar', async () => {
    await render(<ForgotPasswordScreen />);
    await digitarEmail('dados@exemplo.com');

    await apertarEnviar();

    await waitFor(() => expect(screen.getByText('Voltar para entrar')).toBeTruthy());
    await fireEvent.press(screen.getByText('Voltar para entrar'));

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('mostra a falha de rede sem confirmar o envio', async () => {
    solicitarMock.mockResolvedValue({
      status: 'falha_de_rede',
      mensagem: 'Sem conexão com o servidor.',
    });

    await render(<ForgotPasswordScreen />);
    await digitarEmail('dados@exemplo.com');

    await apertarEnviar();

    await waitFor(() => expect(screen.getByText('Sem conexão com o servidor.')).toBeTruthy());
    expect(screen.getByText('Enviar link')).toBeTruthy();
    expect(screen.queryByText(TEXTO_CONFIRMADO)).toBeNull();
  });

  it('troca o rótulo pelo indicador de progresso enquanto envia', async () => {
    let resolver: (valor: typeof CONFIRMADO) => void = () => {};
    solicitarMock.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

await render(<ForgotPasswordScreen />);
    await digitarEmail('dados@exemplo.com');

    // Sem `await`: o press bloqueia até o handler terminar, e o handler espera
    // uma promessa que só é resolvida abaixo.
    fireEvent.press(screen.getByText('Enviar link'));

    await waitFor(() => expect(screen.queryByText('Enviar link')).toBeNull());

    resolver(CONFIRMADO);

    await waitFor(() => expect(screen.getByText(TEXTO_CONFIRMADO)).toBeTruthy());
  });

  it('volta uma tela sem confirmar nada', async () => {
    await render(<ForgotPasswordScreen />);

    await fireEvent.press(screen.getByText('Voltar'));

    expect(mockBack).toHaveBeenCalled();
    expect(solicitarMock).not.toHaveBeenCalled();
  });

it('não usa Alert.alert no caminho de email vazio (FR-012)', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(<ForgotPasswordScreen />);
    await apertarEnviar();

    await waitFor(() => expect(screen.getByText('Informe seu email.')).toBeTruthy());
    expect(alerta).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('não usa Alert.alert na falha de rede nem na confirmação (FR-012)', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(<ForgotPasswordScreen />);
    await digitarEmail('dados@exemplo.com');

    solicitarMock.mockResolvedValue({
      status: 'falha_de_rede',
      mensagem: 'Sem conexão com o servidor.',
    });
    await apertarEnviar();
    await waitFor(() => expect(screen.getByText('Sem conexão com o servidor.')).toBeTruthy());

    solicitarMock.mockResolvedValue(CONFIRMADO);
    await apertarEnviar();
    await waitFor(() => expect(screen.getByText(TEXTO_CONFIRMADO)).toBeTruthy());

    expect(alerta).not.toHaveBeenCalled();
    alerta.mockRestore();
  });
});