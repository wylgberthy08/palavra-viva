import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AuthProvider, useAuth } from '@/auth';
import { supabase } from '@/auth/services/supabase';

jest.mock('@/auth/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as unknown as {
  auth: {
    getSession: jest.Mock;
    onAuthStateChange: jest.Mock;
    signInWithPassword: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
  };
};

function Consumidor() {
  const { user, error, loading, signUp } = useAuth();

  if (loading) return <Text>carregando</Text>;

  return (
    <>
      <Text>{user ? 'logado' : 'deslogado'}</Text>
      <Text>{error ? `erro: ${error}` : 'sem erro'}</Text>
      <Text onPress={() => signUp('Nome', 'teste@exemplo.com', '123456')}>cadastrar</Text>
    </>
  );
}

async function renderizarConsumidor() {
  return render(
    <AuthProvider>
      <Consumidor />
    </AuthProvider>
  );
}

describe('auth/signUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  });

  it('devolve sucesso quando o cadastro requer confirmação de e-mail (sem sessão)', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: '123' } },
      error: null,
    });

    const { getByText } = await renderizarConsumidor();

    await act(async () => {
      getByText('cadastrar').props.onPress();
    });

    // Após o cadastro sem sessão, o contexto não deve contaminar o estado com erro.
    expect(getByText('deslogado')).toBeTruthy();
    expect(() => getByText('erro: Conta criada. Confirme seu email para entrar.')).toThrow();
    expect(getByText('sem erro')).toBeTruthy();
  });
});
