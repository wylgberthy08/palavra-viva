import {
  REDIRECT_URL_RECUPERACAO,
  atualizarSenha,
  extrairCredenciaisDoLink,
  solicitarRecuperacaoDeSenha,
} from '@/auth/services/password-recovery';
import { supabase } from '@/auth/services/supabase';

jest.mock('@/auth/services/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as unknown as {
  auth: {
    resetPasswordForEmail: jest.Mock;
    updateUser: jest.Mock;
  };
};

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.assinatura';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extrairCredenciaisDoLink', () => {
  it('devolve os dois tokens quando o fragmento está completo', () => {
    const resultado = extrairCredenciaisDoLink(
      `access_token=${TOKEN}&expires_in=3600&refresh_token=v1-MTIz&token_type=bearer&type=recovery`
    );

    expect(resultado).toEqual({
      status: 'valido',
      credenciais: { accessToken: TOKEN, refreshToken: 'v1-MTIz' },
    });
  });

  it('rejeita o fragmento quando falta o access_token', () => {
    const resultado = extrairCredenciaisDoLink('refresh_token=v1-MTIz&type=recovery');

    expect(resultado).toEqual({ status: 'invalido', motivo: 'malformado' });
  });

  it('rejeita o fragmento quando falta o refresh_token', () => {
    const resultado = extrairCredenciaisDoLink(`access_token=${TOKEN}&type=recovery`);

    expect(resultado).toEqual({ status: 'invalido', motivo: 'malformado' });
  });

  it('rejeita o fragmento ausente, que é o caso de deep link sem token', () => {
    expect(extrairCredenciaisDoLink(undefined)).toEqual({
      status: 'invalido',
      motivo: 'malformado',
    });
  });

  it('rejeita o fragmento vazio', () => {
    expect(extrairCredenciaisDoLink('')).toEqual({ status: 'invalido', motivo: 'malformado' });
  });

  it('classifica otp_expired como link expirado', () => {
    const resultado = extrairCredenciaisDoLink(
      'error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );

    expect(resultado).toEqual({ status: 'invalido', motivo: 'expirado' });
  });

  it('classifica access_denied como link negado', () => {
    const resultado = extrairCredenciaisDoLink(
      'error=access_denied&error_code=access_denied&error_description=New+email+address+should+not+be+the+same'
    );

    expect(resultado).toEqual({ status: 'invalido', motivo: 'negado' });
  });

  it('classifica qualquer outro error_code como malformado, sem vazá-lo', () => {
    const resultado = extrairCredenciaisDoLink(
      'error=access_denied&error_code=algum_codigo_futuro&error_description=algo'
    );

    expect(resultado).toEqual({ status: 'invalido', motivo: 'malformado' });
  });

  it('prefere o motivo do error_code mesmo quando tokens aparecem juntos', () => {
    const resultado = extrairCredenciaisDoLink(
      `access_token=${TOKEN}&refresh_token=v1-MTIz&error_code=otp_expired`
    );

    expect(resultado).toEqual({ status: 'invalido', motivo: 'expirado' });
  });

  it('não deixa o error_description vazar para o resultado', () => {
    const resultado = extrairCredenciaisDoLink(
      'error_code=otp_expired&error_description=Erro+interno+do+GoTrue'
    );

    expect(resultado).not.toHaveProperty('error_description');
    expect(resultado).not.toHaveProperty('errorDescription');
  });

  it('descodifica valor percent-encoded, para o fragmento que ainda não foi decodificado', () => {
    const resultado = extrairCredenciaisDoLink('access_token=a%2Bb%2Fc&refresh_token=v1-MTIz');

    expect(resultado).toEqual({
      status: 'valido',
      credenciais: { accessToken: 'a+b/c', refreshToken: 'v1-MTIz' },
    });
  });

  it('preserva o valor bruto quando o decodificar lança', () => {
    const resultado = extrairCredenciaisDoLink('access_token=%E0%A4%A&refresh_token=v1-MTIz');

    expect(resultado).toEqual({
      status: 'valido',
      credenciais: { accessToken: '%E0%A4%A', refreshToken: 'v1-MTIz' },
    });
  });

  it('não confunde access_token com access_token_expires_in', () => {
    const resultado = extrairCredenciaisDoLink('access_token_expires_in=3600&refresh_token=v1-MTIz');

    expect(resultado).toEqual({ status: 'invalido', motivo: 'malformado' });
  });
});

describe('solicitarRecuperacaoDeSenha', () => {
  it('envia o e-mail normalizado e confirma ao usuário', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    const resultado = await solicitarRecuperacaoDeSenha('  Joao@Exemplo.COM  ');

    expect(resultado).toEqual({ status: 'confirmado' });
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('Joao@Exemplo.COM', {
      redirectTo: 'palavraviva://auth-callback',
    });
  });

  // O destino do link é configuração do painel, então o valor fica fixado aqui
  // como literal. Se a constante mudar e o painel não acompanhar, este teste
  // quebra no lugar certo.
  it('usa o mesmo destino de redirecionamento que está na uri_allow_list do painel', () => {
    expect(REDIRECT_URL_RECUPERACAO).toBe('palavraviva://auth-callback');
  });

  it('devolve a mesma resposta quando o GoTrue recusa, para não revelar quem tem conta', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'Email rate limit exceeded' },
    });

    const resultado = await solicitarRecuperacaoDeSenha('ninguem@exemplo.com');

    expect(resultado).toEqual({ status: 'confirmado' });
  });

  it('devolve respostas idênticas para e-mail existente e e-mail inexistente', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: null,
    });
    const existente = await solicitarRecuperacaoDeSenha('conta@exemplo.com');

    jest.clearAllMocks();
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { message: 'User not found' },
    });
    const inexistente = await solicitarRecuperacaoDeSenha('ninguem@exemplo.com');

    expect(existente).toEqual(inexistente);
  });

  it('reporta falha de transporte, que é a única falha que a UI pode mostrar', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockRejectedValue(new Error('rede caiu'));

    const resultado = await solicitarRecuperacaoDeSenha('conta@exemplo.com');

    expect(resultado).toEqual({
      status: 'falha_de_rede',
      mensagem: 'Não foi possível enviar o e-mail. Verifique sua conexão e tente de novo.',
    });
  });

  it('não deixa a mensagem de erro do GoTrue escapar para o usuário', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'AuthApiError: something internal' },
    });

    const resultado = await solicitarRecuperacaoDeSenha('conta@exemplo.com');

    expect(resultado).toEqual({ status: 'confirmado' });
    expect(JSON.stringify(resultado)).not.toContain('AuthApiError');
  });
});

describe('atualizarSenha', () => {
  it('atualiza a senha e confirma', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

    const resultado = await atualizarSenha('SenhaNova123');

    expect(resultado).toEqual({ status: 'atualizada' });
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'SenhaNova123' });
  });

  it('traduz senha igual à anterior', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: { message: 'New password should be different from the old password.' },
    });

    expect(await atualizarSenha('SenhaNova123')).toEqual({
      status: 'falha',
      mensagem: 'A nova senha precisa ser diferente da atual.',
    });
  });

  it('traduz senha curta pelo motivo informado pelo servidor', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: { message: 'Password should be at least 8 characters.' },
    });

    const resultado = await atualizarSenha('curta');

    expect(resultado).toEqual({
      status: 'falha',
      mensagem: 'A nova senha precisa ter pelo menos 8 caracteres.',
    });
  });

  it('traduz sessão ausente para a orientação de pedir um novo link', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: { message: 'Auth session missing' },
    });

    expect(await atualizarSenha('SenhaNova123')).toEqual({
      status: 'falha',
      mensagem: 'Este link expirou. Peça um novo para continuar.',
    });
  });

  it('não deixa erro desconhecido do GoTrue escapar em inglês', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: { message: 'AuthApiError: unexpected internal detail' },
    });

    const resultado = await atualizarSenha('SenhaNova123');

    expect(resultado).toEqual({
      status: 'falha',
      mensagem: 'Não foi possível atualizar sua senha. Tente novamente.',
    });
    expect(JSON.stringify(resultado)).not.toContain('AuthApiError');
  });

  it('reporta falha de transporte', async () => {
    mockSupabase.auth.updateUser.mockRejectedValue(new Error('rede caiu'));

    const resultado = await atualizarSenha('SenhaNova123');

    expect(resultado).toEqual({
      status: 'falha',
      mensagem: 'Não foi possível atualizar sua senha. Tente novamente.',
    });
  });
});