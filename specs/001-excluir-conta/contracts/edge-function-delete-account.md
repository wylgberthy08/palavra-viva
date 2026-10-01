# Contract: Edge Function `delete-account`

Fase 1. Este é o único contrato externo novo desta feature. O app não expõe nenhuma interface
pública; toda a superfície de tela é interna ao aplicativo.

## Endpoint

```text
POST  https://<project-ref>.supabase.co/functions/v1/delete-account
```

| Propriedade | Valor |
|---|---|
| Método | `POST` |
| Autenticação | JWT do usuário no header `Authorization: Bearer <access_token>` |
| Verificação de JWT | Feita pela plataforma (`verify_jwt = true`, default) |
| Corpo | **Vazio.** O alvo é derivado da claim `sub`. |
| Parâmetros de query | Nenhum |
| Timeout do cliente | 10 s (consistente com `BIBLE_TIMEOUT_MS` em `config/bible.ts:14`) |

O corpo vazio é deliberado e é a decisão de segurança central desta feature: a função **não aceita
`user_id` do corpo nem da query**. Não existe superfície para apagar a conta de outra pessoa. Ver
FR-005 e R-001.

## Respostas

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "deleted": true, "userId": "<uuid>" }` | Usuário removido de `auth.users` |
| 401 | `{ "code": "unauthorized", "message": "..." }` | JWT ausente, inválido ou expirado (produced pela plataforma antes do handler) |
| 500 | `{ "code": "storage_objects", "message": "..." }` | O usuário é dono de objetos no Supabase Storage e a plataforma recusou a remoção |
| 500 | `{ "code": "delete_failed", "message": "...", "detail": "..." }` | Qualquer outra falha na remoção |

O corpo de erro carrega `code` estável para o app ramificar, e `message` em português legível para
exibir. `detail` preserva o erro técnico para diagnóstico, como exige o Princípio V da
constituição.

## Exemplo de requisição

```bash
curl -X POST \
  "https://rltwtgdhojxkdkbdenbj.supabase.co/functions/v1/delete-account" \
  -H "Authorization: Bearer <ACCESS_TOKEN_DO_USUARIO>" \
  -H "apikey: <ANON_KEY>"
```

O header `apikey` não é usado pela função (que é autenticada por JWT), mas a plataforma exige que
seja enviado em requisições de Edge Function. O `supabase.functions.invoke` do cliente já o envia
automaticamente.

## Chamada pelo cliente

```ts
const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
```

Não há corpo, o que o `invoke` tolera: quando `body` é omitido, a função é chamada sem payload.
O JWT da sessão atual vai no `Authorization` automaticamente, porque o mesmo cliente gerenciado
em `auth/services/supabase.ts` é o que faz a chamada.

## Regras de implementação da função

1. Usar `withSupabase({ auth: 'user' })` de `npm:@supabase/server`. Isso entrega
   `ctx.supabaseAdmin` (privilegiado), `ctx.userClaims` (claims já verificadas pela plataforma) e
   `ctx.authMode`, sem repetir validação de token.
2. O id do usuário vem **exclusivamente** de `ctx.userClaims?.id`. Sem fallback para body, query ou
   header. Se o id não existir, responder 401 e não tentar adivinhar.
3. Falhar rápido: se `SUPABASE_URL`, `SUPABASE_SECRET_KEY` ou `SUPABASE_SECRET_KEYS` estiverem
   ausentes, responder 500 `delete_failed` com mensagem de configuração, não seguir com cliente
   quebrado.
4. Chamar `supabaseAdmin.auth.admin.deleteUser(id)` com `shouldSoftDelete = false` explícito, mesmo
   sendo o default. Deixar o valor explícito registra a decisão de produto no código (Ver R-002).
5. Traduzir o erro da plataforma: quando a mensagem indicar propriedade de objetos no Storage,
   responder o `code: "storage_objects"`. Preservar o erro original em `detail`.
6. Nunca registrar o access token nem o `service_role` em log ou na resposta.

## Configuração da implantação

O arquivo `supabase/config.toml` gerado pela CLI já traz `verify_jwt = true` como default para
funções. **Nenhuma linha `[functions.delete-account]` é necessária.** Registrar essa ausência é
deliberado: um bloco explícito com `verify_jwt = true` seria redundante, e um bloco com
`verify_jwt = false` seria um buraco de segurança.

Implantação:

```bash
npx supabase login
npx supabase link --project-ref rltwtgdhojxkdkbdenbj
npx supabase functions deploy delete-account
```

## O que este contrato **não** garante

- **Invalidar retroativamente um access token já emitido.** JWT é stateless; apagar a linha em
  `auth.users` cascateia para `auth.sessions` e invalida refresh tokens, mas um token já entregue
  continua válido até `exp`. Ver R-003.
- **Encerrar sessão em outro dispositivo.** Ver a seção equivalente do `data-model.md`.
- **Apagar dado que o usuário não pertence ao app.** A plataforma recusa a remoção quando o usuário
  é dono de objetos no Storage; a função transforma isso em `storage_objects` em vez de apagar
  parcialmente.
