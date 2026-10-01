import { withSupabase } from 'npm:@supabase/server';

/**
 * Exclui a conta do usuário que está chamando esta função.
 *
 * O id do usuário vem exclusivamente de `ctx.userClaims?.id`, verificado pela
 * plataforma a partir do JWT. Não há `user_id` no corpo nem na query: não
 * existe superfície para apagar a conta de outra pessoa. O cliente privilegiado
 * (`supabaseAdmin`) existe apenas aqui, dentro do ambiente do servidor, e nunca
 * é empacotado no app.
 */
const NAO_CONFIGURADO = 'A função não está configurada para exclusão de conta.';

function responder(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * A plataforma recusa a remoção de um usuário que é dono de objetos no Storage.
 * A mensagem varia entre versões, então a checagem é por substantivo, e o erro
 * original é preservado em `detail` para diagnóstico.
 */
function ehErroDeStorageObjeto(detalhe: string | undefined): boolean {
  if (!detalhe) return false;
  const normalizada = detalhe.toLowerCase();
  return (
    normalizada.includes('storage') &&
    (normalizada.includes('object') || normalizada.includes('bucket') || normalizada.includes('row'))
  );
}

/**
 * Na plataforma as chaves chegam como dicionário JSON em `SUPABASE_SECRET_KEYS`,
 * indexado por nome (`default` é o padrão). `SUPABASE_SECRET_KEY`, sem o plural, é
 * o formato de chave única usado pelo `supabase start` local. Checar só o singular
 * fazia a função recusar o próprio ambiente hospedado e devolver 500 em toda
 * exclusão, mesmo com a credencial e a conta válidas.
 */
function temChaveSecreta(): boolean {
  return Boolean(Deno.env.get('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SECRET_KEY'));
}

Deno.serve(
  withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const userId = ctx.userClaims?.id;

    if (!userId) {
      return responder(
        { code: 'unauthorized', message: 'Sessão inválida ou expirada.' },
        401,
      );
    }

    if (!Deno.env.get('SUPABASE_URL') || !temChaveSecreta()) {
      return responder(
        {
          code: 'delete_failed',
          message: NAO_CONFIGURADO,
          detail: 'SUPABASE_URL ou SUPABASE_SECRET_KEYS ausente no ambiente.',
        },
        500,
      );
    }

    // Remoção definitiva, sem anonimização (ver R-002). A opção `shouldSoftDelete`
    // não é passada: o default do GoTrue já é apagar, mas a opção explícita quebra
    // o delete nesta combinação de versões — o corpo chega como objeto onde o
    // servidor espera `bool`, a chamada falha com 500 e a conta continua existindo.
    const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);

    if (!error) {
      return responder({ deleted: true, userId }, 200);
    }

    const detalhe = error.message;

    if (ehErroDeStorageObjeto(detalhe)) {
      return responder(
        {
          code: 'storage_objects',
          message:
            'Há arquivos vinculados à sua conta no armazenamento. Remova-os antes de excluir a conta.',
          detail: detalhe,
        },
        500,
      );
    }

    return responder(
      {
        code: 'delete_failed',
        message: 'Não conseguimos excluir sua conta agora. Tente de novo mais tarde.',
        detail: detalhe,
      },
      500,
    );
  }),
);
