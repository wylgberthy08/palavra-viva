import { excluirConta } from '@/auth/services/account-deletion';
import { supabase } from '@/auth/services/supabase';

jest.mock('@/auth/services/supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));

const invoke = supabase.functions.invoke as jest.MockedFunction<typeof supabase.functions.invoke>;

/** Reproduz o formato de `FunctionsHttpError`: status e corpo em `context`. */
function erroHttp(status: number, corpo?: unknown) {
  return {
    name: 'FunctionsHttpError',
    message: 'Edge Function error',
    context: {
      status,
      json: async () => {
        if (corpo === undefined) throw new Error('não é json');
        return corpo;
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('excluirConta', () => {
  it('trata 200 com deleted:true como sucesso', async () => {
    invoke.mockResolvedValue({
      data: { deleted: true, userId: 'u1' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(excluirConta()).resolves.toEqual({ status: 'sucesso' });
  });

  it('chama a função sem corpo e sem user_id', async () => {
    invoke.mockResolvedValue({
      data: { deleted: true },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await excluirConta();

    const [nome, opcoes] = invoke.mock.calls[0];
    expect(nome).toBe('delete-account');
    // O alvo vem do JWT. Um `user_id` aqui criaria superfície para apagar a
    // conta de outra pessoa.
    expect(opcoes).not.toHaveProperty('body');
    expect(JSON.stringify(opcoes)).not.toContain('userId');
  });

  it('trata 401 como falha de autorizacao', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: erroHttp(401, { code: 'unauthorized' }),
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(excluirConta()).resolves.toEqual({ status: 'falha_de_autorizacao' });
  });

  it('trata 403 como falha de autorizacao', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: erroHttp(403),
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(excluirConta()).resolves.toEqual({ status: 'falha_de_autorizacao' });
  });

  it('trata storage_objects como erro de armazenamento', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: erroHttp(500, { code: 'storage_objects', message: 'objects' }),
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(excluirConta()).resolves.toEqual({ status: 'usuario_com_objetos_no_storage' });
  });

  it('trata delete_failed como falha de rede', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: erroHttp(500, { code: 'delete_failed', message: 'boom' }),
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(excluirConta()).resolves.toEqual({ status: 'falha_de_rede' });
  });

  it('trata corpo de erro ilegivel como falha de rede, sem lancar', async () => {
    // Um gateway pode devolver HTML em vez de JSON. Um corpo ilegível não
    // autoriza a UI a tratar o resultado como sucesso.
    invoke.mockResolvedValue({
      data: null,
      error: erroHttp(500),
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(excluirConta()).resolves.toEqual({ status: 'falha_de_rede' });
  });

  it('NÃO trata 200 sem deleted:true como sucesso', async () => {
    // Sem essa marca a conta pode não ter sumido, e limpar o aparelho seria
    // apagar versículos de uma conta viva.
    invoke.mockResolvedValue({
      data: { deleted: false },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(excluirConta()).resolves.toEqual({ status: 'falha_de_rede' });
  });

  it('traduz excecao de transporte em falha de rede', async () => {
    invoke.mockRejectedValue(new Error('Network request failed'));

    await expect(excluirConta()).resolves.toEqual({ status: 'falha_de_rede' });
  });
});
