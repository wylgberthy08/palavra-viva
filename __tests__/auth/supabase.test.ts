/**
 * Fica em arquivo próprio porque `__tests__/auth/index.test.tsx` substitui o
 * módulo `@/auth/services/supabase` por um mock: aqui é preciso o módulo real.
 *
 * As variáveis são definidas aqui com valor falso e obviamente fictício, como o
 * Princípio VII exige. O harness do Jest não carrega o `.env`, então depender do
 * ambiente tornaria o teste verde ou vermelho por acaso.
 *
 * O módulo é reavaliado a cada teste porque a leitura das variáveis acontece no
 * corpo do módulo, e o registro de módulos é zerado antes. `import()` dinâmico
 * seria a alternativa idiomática, mas exige `--experimental-vm-modules`, que não
 * faz parte do comando `npm run test`. Por isso o `require`, desativado na linha.
 */

const URL_FALSA = 'https://exemplo-falso.supabase.co';
const CHAVE_ANON_FALSA = 'chave-anon-falso-para-teste';

const VARIAVEIS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;

type ModuloSupabase = typeof import('@/auth/services/supabase');

function carregaModulo(): ModuloSupabase {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- reavaliação do registro de módulos
  return require('@/auth/services/supabase') as ModuloSupabase;
}

describe('cliente Supabase', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = URL_FALSA;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = CHAVE_ANON_FALSA;
    // O módulo constrói um cliente real, que agenda auto-refresh. Com timers
    // falsos nenhum handle fica vivo e nenhum tick dispara depois do teardown.
    jest.useFakeTimers();
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    for (const nome of VARIAVEIS) {
      delete process.env[nome];
    }
  });

  it('inicializa quando as duas variáveis existem', () => {
    const { supabase } = carregaModulo();

    expect(supabase).toBeDefined();
  });

  it('falha nomeando a URL ausente', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    // Sem esta falha o createClient nasceria com string vazia, e cada chamada de
    // rede falharia depois com uma mensagem que não aponta a causa.
    expect(() => carregaModulo()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('falha nomeando a chave anon ausente', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => carregaModulo()).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
