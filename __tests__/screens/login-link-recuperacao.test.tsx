import { fireEvent, render, screen } from '@testing-library/react-native';

import LoginScreen from '@/auth/screens/LoginScreen';
import { useAuth } from '@/auth';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/auth', () => ({ useAuth: jest.fn() }));

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;

beforeEach(() => {
  jest.clearAllMocks();
  useAuthMock.mockReturnValue({
    user: null,
    loading: false,
    signIn: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
});

it('leva para a tela de recuperação de senha', async () => {
  await render(<LoginScreen />);

  await fireEvent.press(screen.getByText('Esqueci minha senha'));

  expect(mockPush).toHaveBeenCalledWith('/(auth)/forgot-password');
});

it('mantém o link de criar conta apontando para o registro', async () => {
  await render(<LoginScreen />);

  await fireEvent.press(screen.getByText('Criar conta'));

  expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
});