# Data Model: Recuperar Senha

Esta spec não cria tabela, migration ou schema novo. O projeto não tem nenhuma tabela no Supabase:
não há chamada a `.from()`, `.rpc()` ou Storage em `src/`, e os versículos decorados vivem em
`AsyncStorage` sob `@palavra-viva/saved-verses/v1`.

A recuperação de senha é inteiramente gerenciada pelo GoTrue. O que este documento descreve são os
**tipos de fronteira** entre a tela, o serviço e o cliente Supabase, e o formato exato do fragmento
que o deep link entrega.

---

## Entidades que já existem, e são lidas

### Sessão (`@supabase/auth-js`)

Não é uma entidade desta feature. É o objeto que `setSession` cria e que `updateUser` consome.

Ponto que importa: a sessão de recovery é uma **sessão normal**. Não existe tipo "recovery" no
cliente. Por isso `src/auth/index.tsx:70`, que trata `SIGNED_IN`, já a absorve sem alteração — e por
isso `AuthProvider` **não ganha método novo**.

### Usuário (`src/types/auth.ts`)

Não muda. A recuperação não lê nem escreve o perfil.

---

## O fragmento do deep link

### Formato recebido

O GoTrue redireciona para `palavraviva://auth-callback` com os tokens no **fragmento**:

```
palavraviva://auth-callback#access_token=eyJhbG...&expires_in=3600&refresh_token=v1-MTIz...&token_type=bearer&type=recovery
```

### O que o app recebe de fato

Verificado em `research.md` R-007: o expo-router não converte o fragmento em parâmetros nomeados.
`parseQueryParams` injeta o fragmento inteiro na chave `'#'`, com o `#` removido.

```ts
useLocalSearchParams()
// → { '#': 'access_token=eyJhbG...&expires_in=3600&refresh_token=v1-MTIz...&token_type=bearer&type=recovery' }
```

`useLocalSearchParams().access_token` é `undefined`. **Isto não é detalhe de implementação, é a
forma da API.**

O valor chega já com `decodeURIComponent` aplicado, pelo que `useLocalSearchParams` faz. Para tokens
JWT do GoTrue isso é inofensivo — a base64url usa apenas `.`, `-` e `_` — mas o parse defensivo do
serviço não deve assumir formato.

### Variante de erro

Quando o link é inválido, expirado ou negado, o GoTrue devolve códigos em vez de tokens:

```
palavraviva://auth-callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

`error_description` é texto técnico em inglês do GoTrue. **Nunca é exibido.** Ver FR-011.

---

## `ResultadoLink`

Saída de `extrairCredenciaisDoLink`. Função pura: string para união discriminada, sem rede e sem import de
Expo. É o único lugar onde mora a lógica de link inválido.

```ts
type ResultadoLink =
  | { status: 'valido'; credenciais: CredenciaisDoLink }
  | { status: 'invalido'; motivo: MotivoLinkInvalido };

type CredenciaisDoLink = {
  accessToken: string;
  refreshToken: string;
};

type MotivoLinkInvalido = 'expired' | 'denied' | 'malformed';
```

### Mapeamento de `error_code` para mensagem

| `error_code` do GoTrue | `code` interno | Mensagem em tela |
|---|---|---|
| `otp_expired` | `expired` | "Este link expirou. Peça um novo para continuar." |
| `access_denied` | `denied` | "Este link não é válido. Peça um novo para continuar." |
| ausente, mas sem `access_token` | `malformed` | "Não conseguimos ler este link. Peça um novo para continuar." |
| qualquer outro valor | `malformed` | idem |

`error_description` é lido da URL e **descartado**. Isso é deliberado: a descrição vaza detalhes
internos do GoTrue e muda entre versões.

Todos os quatro casos levam ao mesmo destino: a tela de solicitação, com botão de reenvio. A
diferença de texto serve ao usuário, não ao atacante — nenhuma das mensagens revela se a conta
existe.

---

## `ResultadoSolicitacao`

Saída de `solicitarRecuperacaoDeSenha`.

```ts
type ResultadoSolicitacao =
  | { status: 'confirmado' }
  | { status: 'falha_de_rede'; mensagem: string };
```

### A regra que sustenta a US2

O `{ status: 'falha_de_rede' }` existe **apenas** para falha de transporte que impeça a chamada de
acontecer — servidor inacessível, JSON malformado. Ele **não** cobre "e-mail não encontrado".

| Situação real | O que `solicitarRecuperacaoDeSenha` devolve |
|---|---|
| E-mail existe, envio ok | `{ status: 'confirmado' }` |
| E-mail não existe | `{ status: 'confirmado' }` |
| Taxa do Supabase atingida | `{ status: 'confirmado' }` |
| E-mail malformado (sem `@`) | `{ status: 'confirmado' }` |
| Cliente Supabase inacessível | `{ status: 'falha_de_rede', mensagem: 'Não foi possível enviar...' }` |

O motivo é o mesmo de validar o formato antes de enviar: os dois últimos casos evita trabalho inútil
e mensagem de erro genérica, e os três do meio são indistinguíveis de propósito.

**Consequência de teste**: o teste de não-enumeração compara `solicitarRecuperacaoDeSenha` com e-mail real
contra e-mail inventado e exige igualdade profunda dos objetos. Ele **não** pode ser satisfeito por
um mock que sempre devolve sucesso — o teste precisa passar pelo caminho real de `resetPasswordForEmail`
com o cliente mockado em dois retornos distintos. Registrado em `plan.md`, Fase 4.

---

## `ResultadoAtualizacao`

Saída de `atualizarSenha`.

```ts
type ResultadoAtualizacao =
  | { status: 'atualizada' }
  | { status: 'falha'; mensagem: string };
```

### Tradução de erro

`updateUser` pode falhar por reasons que não devem vazar em inglês. O serviço traduz os conhecidos e
usa uma mensagem genérica no resto.

| `error.message` do GoTrue contém | Mensagem em tela |
|---|---|
| `new password should be different` | "A nova senha precisa ser diferente da atual." |
| `Password should be at least N characters` | "A senha deve ter pelo menos 8 caracteres." |
| `User not found` | "Não foi possível atualizar sua senha. Tente novamente." |
| `Auth session missing` | "Este link expirou. Peça um novo para continuar." |
| qualquer outro | "Não foi possível atualizar sua senha. Tente novamente." |

Nenhum `error.message` cru chega à tela (FR-011).

---

## Estados de tela

Três máquinas de estado pequenas. O `idle` inicial só existe onde há input do usuário.

### `ForgotPasswordScreen`

```
idle ──(submit)──▶ submitting ──(ok)──▶ sent
                        │
                        └──(falha de transporte)──▶ idle, com mensagem
```

`sent` é terminal e **não** tem botão de voltar ao formulário. Voltar a pedir o envio gastaria um
e-mail do limite por nada.

### `AuthCallbackScreen`

```
processing ──(tokens válidos + setSession ok)──▶ navega para /(auth)/reset-password
      │
      ├──(sem tokens / error_code)──▶ invalid ──(reenvio)──▶ navega para /(auth)/forgot-password
      │
      └──(setSession falhou)──▶ invalid
```

`invalid` é o funil de todos os erros, com mensagem vinda do `code`. O caso `setSession falhou` usa a
mensagem genérica, sem `code`, porque nesse ponto o problema não é o link.

**Idempotência**: reprocessar o mesmo fragmento leva ao mesmo destino. Reprocessar um fragmento já
consumido também é seguro, porque `extrairCredenciaisDoLink` é puro e não tem efeito colateral. É a razão de
`extrairCredenciaisDoLink` não fazer a chamada de rede: a tela chama, o serviço decodifica.

### `ResetPasswordScreen`

```
editing ──(submit)──▶ submitting ──(ok)──▶ signOut ──▶ navega para /(auth)/login
                        │
                        ├──(validação local)──▶ editing, com mensagem
                        └──(updateUser falhou)──▶ editing, com mensagem traduzida
```

A validação de tamanho e confirmação acontece **antes** de `submitting`, no próprio `editing`. Erro
de validação não chega a `submitting` e não consome chamada de rede.

---

## Validação da senha nova

| Regra | Onde | Valor |
|---|---|---|
| Tamanho mínimo | `TAMANHO_MINIMO_SENHA`, em `src/constants/auth.ts` | `8` |
| Confirmação idêntica | Tela | 2 senhas iguais |
| Igual à senha antiga | GoTrue | Traduzido para mensagem |

O painel tem `password_min_length` igual a `6` **hoje**. A Fase 1 do plano extrai a constante e a
Fase 5 sobe o painel para `8`. **A constante e o painel têm que concordar** — se o painel ficar em 6
e a constante em 8, o usuário é aceito localmente e rejeitado pelo backend; se o painel for para 8 e
a constante ficar em 6, o usuário recebe erro do backend depois de esperar.

A constante é a fonte da verdade **no cliente**, e o painel é a fonte da verdade **no servidor**. O
`quickstart.md` tem um cenário que verifica que os dois concordam.

> Nota: `RegisterScreen.tsx` valida tamanho de senha no cadastro; `LoginScreen.tsx` não, e
> corretamente não deve — no login a senha é a que está sendo testada, não uma nova.

---

## O que esta spec não define

| Ausência | Motivo |
|---|---|
| Tabela, coluna, migration | Nenhuma. O GoTrue é dono da conta. |
| Contrato de API | Nenhum endpoint novo. |
| Novo tipo em `src/types/` | Os tipos acima são do serviço de recuperação, não domínio compartilhado. Só entram em `src/types/` se outro módulo precisar deles. |
| Sessão "recovery" | Não existe no cliente. É sessão normal. |