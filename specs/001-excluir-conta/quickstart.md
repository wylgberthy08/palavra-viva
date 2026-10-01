# Quickstart: Excluir Conta

Guia de validação de ponta a ponta. Cada cenário é executável e tem um resultado observável.
Nenhum passo exige ler o código da implementação.

Detalhes de contrato: [contracts/edge-function-delete-account.md](./contracts/edge-function-delete-account.md)
Estados e entidades: [data-model.md](./data-model.md)
Decisões de projeto: [research.md](./research.md)

## Pré-requisitos

| Item | Verificação | Se faltar |
|---|---|---|
| Node com as dependências instaladas | `npm install` já executado | rode `npm install` |
| CLI do Supabase | `npx supabase --version` | a CLI não está instalada nesta máquina; use `npx supabase` (baixa sob demanda) ou o Dashboard |
| Acesso ao projeto `rltwtgdhojxkdkbdenbj` | login com conta que é **owner** do projeto | `npx supabase login` |
| `.env` com as duas variáveis | `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` definidas | copie `.env.example` para `.env` e preencha |
| Sessão de teste real | uma conta criada e autenticada no app | crie pela tela de registro |

## Gates de qualidade (rodar antes de qualquer cenário manual)

```bash
npm run lint
npx tsc --noEmit
npm test
```

Todos devem passar sem erro. Falha em qualquer um interrompe a validação: um cenário manual sobre
código que não compila não prova nada.

## Implantar a Edge Function

```bash
npx supabase login
npx supabase link --project-ref rltwtgdhojxkdkbdenbj
npx supabase functions deploy delete-account
```

Esperado: `Deploying Edge Function delete-account...` e, no final, a URL da função.
Não precisa de bloco `[functions.delete-account]` no `config.toml` — `verify_jwt = true` é o
default. Confirmar em **Dashboard → Edge Functions → delete-account → Details** que
*Verify JWT* está ligado.

## Cenário 1 — A exclusão funciona de ponta a ponta (SC-001, SC-002, SC-003)

| | |
|---|---|
| Pré-condição | conta autenticada, **dois ou mais versículos decorados** |
| Caminho | Home → salvar versículos → aba "Decorados" → tocar no avatar → "Excluir conta" → confirmar |
| Resultado esperado | diálogo some, app vai para a tela de entrada, lista de versículos vazia |

Verificar:

1. **A tela de login aparece.** Não há retorno para "Decorados" ao pressionar voltar.
2. **A coleção sumiu.** Ao entrar novamente com uma conta nova no mesmo aparelho, "Decorados"
   aparece vazio.
3. **A conta foi removida do servidor.** Em **Dashboard → Authentication → Users**, a conta não
   está mais na lista.
4. **O login falha.** Tentar entrar com o e-mail e a senha da conta excluída retorna erro de
   credencial inválida, e **não** "e-mail não confirmado" nem qualquer outro.
5. **Nenhum resíduo no dispositivo.** Em **Dashboard → Authentication → Users → *nova conta* →
   Sessions**, não há sessão. Para inspecionar o armazenamento local: no Android,
   `adb shell run-as com.wylgberthy.palavraviva ls files`; no iOS, o simulador/inspetor; na web,
   DevTools → Application → Local Storage, sem a chave `@palavra-viva/saved-verses/v1` nem
   `sb-*-auth-token`.

Se o passo 3 falha, o passo 4 vai mostrar o mesmo erro de credencial inválida de antes da
exclusão: a conta continua existindo. Isso é o sintoma de função não implantada ou de token não
enviado.

## Cenário 2 — Cancelar não faz nada (FR-003)

| | |
|---|---|
| Pré-condição | conta autenticada com versículos decorados |
| Caminho | avatar → "Excluir conta" → **Cancelar** |
| Resultado esperado | diálogo fecha, continua na tela de conta, nada é perdido |

Verificar: os versículos seguem listados; a conta continua ativa; nenhuma requisição de rede
ocorreu (no DevTools da web, aba Network: nenhum POST para `/functions/v1/delete-account`).

## Cenário 3 — Falha de rede preserva tudo (FR-008, SC-004)

Este é o cenário mais importante: prova que a ordem de operações está correta.

| | |
|---|---|
| Pré-condição | conta autenticada com versículos decorados |
| Caminho | colocar o aparelho em modo avião → avatar → "Excluir conta" → confirmar |
| Resultado esperado | erro compreensível, **usuário continua autenticado, versículos intactos** |

Verificar: a tela de conta continua montada; a mensagem é de conexão, não um crash; ao desativar o
modo avião e tocar em "Tentar de novo", a exclusão conclui normalmente.

O oposto também precisa ser verdadeiro: se a exclusão **tivesse** apagado os versículos antes da
falha do servidor, o usuário ficaria com conta ativa e coleção vazia. É exatamente o estado
inconsistente que a SC-004 proíbe.

## Cenário 4 — Sessão expirada não apaga nada (SC-004)

| | |
|---|---|
| Pré-condição | conta autenticada, sessão revogada por fora |
| Caminho | **Dashboard → Authentication → Users → sessão → revogar**, ou esperar a expiração; depois avatar → "Excluir conta" → confirmar |
| Resultado esperado | erro pedindo para entrar novamente; nada é apagado |

Verificar: a mensagem é a de autorização, não a genérica; os versículos continuam salvos; a tela
não fica em branco.

## Cenário 5 — A tela de conta e a saída (SC-005, US2, FR-009, FR-014)

Repetir inteiro em **iOS, Android e web**.

| Verificar | Onde |
|---|---|
| Avatar em "Decorados" **navega** para a conta, e não sai | `meus.tsx` |
| E-mail da sessão aparece na tela de conta | tela de conta |
| "Sair" abre confirmação e, ao confirmar, volta para o login | tela de conta |
| "Excluir conta" está visualmente separado de "Sair", sob rótulo de área de perigo | tela de conta |
| Diálogo de exclusão tem **dois botens funcionais** e texto sobre irreversibilidade | diálogo |

O item do diálogo com dois botéis é o que justifica um componente próprio em vez de
`Alert.alert`: no navegador, o `Alert` do React Native não dá controle confiável dos dois botões
(R-006). Se os dois botões não aparecerem na web, a implementação violou a FR-014.

## Cenário 6 — Cobertura automatizada (SC-006)

```bash
npm test
```

Esperado: testes verdes cobrindo os quatro casos de `ResultadoExclusao`
(`sucesso`, `falha_de_rede`, `falha_de_autorizacao`, `usuario_com_objetos_no_storage`) e o fluxo de
confirmação da tela (abrir, cancelar sem chamada, confirmar, estado desabilitado durante a
requisição).

## Cenário 7 — A função recusa usuário com objeto no Storage (FR-011)

Opcional; o projeto não usa Storage hoje, então o caminho não é alcançável pelo app. Para
verificar de verdade:

1. Criar um bucket no Dashboard e enviar um arquivo pela conta de teste.
2. Executar o Cenário 1.
3. Esperado: erro `storage_objects`, mensagem orienta a remover os arquivos, e a conta continua
   existindo em Authentication → Users.

Se este cenário for pulado, registre na revisão que FR-011 foi verificado apenas por leitura do
código. O constitution Quality Gate permite: *"verificação manual registrada na revisão quando não
for automatizável sem equipamento real"*.

## Diagnóstico

| Sintoma | Causa provável | Onde olhar |
|---|---|---|
| Erro de rede ao excluir, mas login funciona | função não implantada, ou env do app apontando para outro projeto | `npx supabase functions list`; `EXPO_PUBLIC_SUPABASE_URL` no `.env` |
| 401 da função | JWT não está chegando: cliente diferente do que tem a sessão | confirmar que o serviço importa o cliente de `auth/services/supabase.ts` |
| Exclusão conclui, mas login ainda funciona | conta em outro projeto, ou token de admin em vez do usuário | conferir `userId` na resposta 200 contra o id em Authentication → Users |
| 500 `delete_failed` com `detail` de env | `SUPABASE_URL` ou chave de segredo ausente na função | Dashboard → Edge Functions → Secrets |
| Diálogo com um botão só na web | `Alert.alert` foi usado em vez do componente próprio | `ConfirmDeleteAccount.tsx` |
| Erro "não tem como ler a env" no arranque | FR-012 aplicado: falta `.env` | criar `.env` a partir de `.env.example` |
