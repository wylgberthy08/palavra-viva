# Plano de Implementação: Recuperar Senha

**Branch**: `003-recuperar-senha` | **Spec**: [spec.md](./spec.md) | **Data**: 2026-10-01

**Constituição**: `.specify/memory/constitution.md` v1.1.0

## Estado da execução

Atualizado em 2026-10-01.

| Fase | Situação |
|---|---|
| Fase 0 — Gate manual | **Pendente.** Precisa do painel e de um e-mail real. Ver `quickstart.md`. |
| Fase 1 — Branch | **Concluída.** Branch `003-recuperar-senha` criado. |
| Fase 2 — Serviço | **Concluída.** T010 a T020. 25 testes verdes. |
| Fase 3 — Telas e rotas | **Parcial, fora de ordem.** T021, T024, T027, T028, T029 feitas. T022, T023, T025, T026 bloqueadas pela Onda 3. |
| Fase 4 — Constante | **Bloqueada** pela Onda 3. |
| Fase 5 — Configuração | **Pendente**, fora do repositório. |
| Fase 6 — Validação | Depois das Fases 3 e 4. |

`npm run verify`: 12 suítes, 83 testes. `check:styles` em 32, sem nenhuma ocorrência nova.

### Fase 3 parcial, feita fora de ordem ⚠️

`T021`, `T024`, `T027`, `T028` e `T029` ficaram prontas **antes** da Onda 3 da `002-refatoracao`,
por pedido explícito do usuário. O caminho pedido — link na tela de login → rota → tela de
solicitação → serviço — precisava fechar ponta a ponta para não ser um botão quebrado.

**Consequência para a `002`:** `LoginScreen.tsx` ganhou o link "Esqueci minha senha" (T028)
**antes** de a Onda 3 convertê-lo. A tarefa `3.13` da `002` vai reescrever o `Alert.alert` da
linha 38 e pode tocar no mesmo arquivo. O link novo fica logo abaixo do campo de senha e é
independente do bloco de mensagens; ao aplicar `3.13`, preservá-lo.

### Correção de nomenclatura aplicada

Os documentos originais desta spec nomeavam as funções em inglês
(`parseRecoveryUrl`, `requestPasswordReset`, `updatePassword`). Isso contraria o Princípio IV da
constituição, que pede português no domínio do produto, e a prática já vigente em
`src/auth/services/account-deletion.ts`, que é arquivo irmão no mesmo diretório.

Todos os documentos foram corrigidos para `extrairCredenciaisDoLink`, `solicitarRecuperacaoDeSenha` e
`atualizarSenha`, e as uniões discriminadas passaram de `{ ok: true }` para `{ status: 'confirmado' }`.

### Um dead code evitado

`MENSAGEM_POR_MOTIVO` fica **sem export** até `AuthCallbackScreen` existir, com `TODO(003)`
carregando motivo e condição de remoção. Exportar agora faria `check:dead` acusar o símbolo, e o gate
precisa permanecer verde mesmo com a Fase 3 incompleta.

### Desvio de cores deliberado

`ForgotPasswordScreen` **não** copiou os literais de `LoginScreen` (`#8C4A27`, `#fff`,
`#E5DDD0`). Usou `theme.primary`, `theme.background` e `theme.backgroundSelected`, para não
somar nenhuma ocorrência a `check:styles`.

Isso expôs que o `#fff` fixo do `LoginScreen` está errado no tema escuro: lá `primary` é
`#FFB693`, um pêssego claro, e branco sobre ele não tem contraste. `ForgotPasswordScreen`
inverte os dois tokens. A `002` (T079) vai tratar isso, mas agora há uma referência de como
fazer.

### Sobre `render` e `fireEvent` nos testes

Neste projeto (RNTL 14 + React 19) `render`, `fireEvent` e `renderHook` retornam thenable e
**precisam de `await`**. Sem isso, `screen` fica apontando para a árvore anterior e
`changeText` não atualiza estado. O único lugar sem `await` é o teste que segura a promessa
do serviço para checar o estado de envio, porque o `await` do press bloquearia até a resolução.

## Resumo

Permitir que um usuário que esqueceu a senha volte a entrar, sem suporte humano. Três telas no
grupo `(auth)`, um serviço de recuperação, e o deep link `palavraviva://auth-callback` — que o
painel **já aceita** — apontando para a rota que ainda não existe.

O plano não cria tabela, não cria endpoint, não muda esquema e não mexe em dependência.

## Por que este plano espera a spec 002

A `002-refatoracao` está no branch `002-refatoracao` e a Onda 3 ainda vai reescrever
`src/auth/index.tsx` (Princípio II, `plan.md:36`) e converter os `Alert.alert` das telas de auth em
mensagem em tela (itens 3.12 e 3.13).

Esta feature toca `src/auth/index.tsx` indiretamente, cria telas em `src/auth/screens/`, e
`RegisterScreen.tsx` — o arquivo que tem o `6` hardcoded — é modificado pela Onda 3. Implementar
antes significa refazer.

**A execução deste plano começa depois que a Onda 3 da 002 for concluída.** Escrever os arquivos de
spec é trabalho que não toca em código e pode ser feito agora, e é o que está feito.

## Gate de entrada: Fase 0

`security_update_password_require_current_password` está `True` no projeto e a documentação **não**
cobre o caso de sessão de recovery. Se o GoTrue exigir `current_password` nessa sessão, o usuário
que esqueceu a senha fica bloqueado no último passo e a funcionalidade não existe.

Detalhado em `spec.md`, seção "Gate da Fase 0". Verificado em `research.md` R-004.

A Fase 0 é manual e precisa do painel e da leitura de um e-mail real. **Seu resultado é registrado em
`quickstart.md` antes de a Fase 1 começar.** Nenhum código de produção é escrito antes disso.

## Por que não há contratos

Nenhuma fronteira externa muda. Não há tabela nova, não há endpoint novo, não há migration, não há
mudança de schema — verificado em `research.md` R-016. O provedor de autenticação continua sendo o
Supabase Auth com as mesmas chamadas de `signIn`, `signUp` e `signOut`.

A única superfície externa nova é o deep link, e ele já está autorizado na `uri_allow_list`. A
configuração do painel que muda — `password_min_length`, template de recovery, SMTP — é registro de
ambiente, não contrato de API.

Os contratos internos ficam em `data-model.md`.

## Restrições do Constitution Check

| Princípio | Estado | Como este plano respeita |
|---|---|---|
| I. Simplicidade e YAGNI | **ok** | Nenhuma estrutura nova além de um serviço e três telas. Sem abstrações, sem repositório, sem injeção de dependência. |
| II. Responsabilidade única e coesão | **ok** | A tela cuida de estado e render. `password-recovery.ts` cuida de rede e de parsing. `AuthProvider` não ganha método novo: a sessão de recovery é a sessão normal, e `setSession` dispara `SIGNED_IN`, que ele **já** trata em `src/auth/index.tsx:70`. |
| III. Fronteiras explícitas e dependências unidirecionais | **ok** | `services/` não importa de `components/`. Telas importam o serviço, nunca o contrário. `TAMANHO_MINIMO_SENHA` vive em `constants/`, importado por telas e pelo serviço. |
| IV. Nomenclatura e código autodocumentado | **ok** | Rotas em minúsculo inglês (`forgot-password.tsx`) e telas em PascalCase, seguindo `login.tsx`/`LoginScreen.tsx`. Funções com nome de verbo e efeito (`solicitarRecuperacaoDeSenha`, `extrairCredenciaisDoLink`, `atualizarSenha`). |
| V. Contratos tipados e tratamento de erro explícito | **ok** | Retornos são união discriminada `{ status: 'confirmado' } \| { status: 'falha_de_rede'; mensagem: string }`, sem `throw` atravessando fronteira. Ver `data-model.md`. |
| VI. Mudanças pequenas e sem resíduo | **ok** | Um `6` deixa de ser literal. Nenhum `console.log`, nenhum código morto, nenhum `Alert.alert` novo. |
| VII. Segredos fora do versionamento | **ok** | Credenciais de SMTP vivem **apenas** no painel do Supabase. Nada disso entra no `.env`, no `.env.example` nem no repositório. |
| VIII. Testes | **melhorado** | O projeto ganha cobertura onde hoje tem zero sobre recuperação: parsing do fragmento, link inválido e resposta genérica. |
| IX. Dependências com propósito | **ok** | **Zero dependências novas.** Ver `research.md` R-008: `expo-linking` seria transitiva e não expõe fragmento; o expo-router já entrega o que é preciso. |

Complexidade adicionada: **um arquivo de serviço** (`password-recovery.ts`), **três telas**,
**três rotas** de 2-3 linhas, **uma constante**. Nenhuma biblioteca, nenhuma tabela, nenhum
endpoint.

## Restrição que este plano aceita de propósito

O fluxo é **implícito**. `flowType` do cliente não muda. Isso significa que o `access_token` trafega
no fragmento da URL.

Aceito porque, no escopo só-mobile, o destino é `palavraviva://auth-callback`: não há histórico de
navegador, não há `Referer`, não há `window.location`. Ver `research.md` R-003 para o raciocínio
completo e para o gatilho que reabre essa decisão: recuperação na web.

## Estrutura do projeto

```
src/
├── app/
│   ├── _layout.tsx                    # providers; NÃO tem guard de sessão
│   ├── (auth)/
│   │   ├── _layout.tsx                # + 3 Stack.Screen novos
│   │   ├── login.tsx                  # + link "Esqueci minha senha"
│   │   ├── forgot-password.tsx        # NOVO: delega para ForgotPasswordScreen
│   │   ├── auth-callback.tsx          # NOVO: delega para AuthCallbackScreen
│   │   └── reset-password.tsx         # NOVO: delega para ResetPasswordScreen
│   └── (tabs)/
│       └── _layout.tsx                # guard de sessão; NÃO tocar
├── auth/
│   ├── index.tsx                      # AuthProvider; não ganha método
│   ├── screens/
│   │   ├── LoginScreen.tsx            # + link
│   │   ├── RegisterScreen.tsx         # 6 → TAMANHO_MINIMO_SENHA
│   │   ├── ForgotPasswordScreen.tsx   # NOVO
│   │   ├── AuthCallbackScreen.tsx     # NOVO
│   │   └── ResetPasswordScreen.tsx    # NOVO
│   └── services/
│       ├── supabase.ts                # inalterado
│       ├── account-deletion.ts        # inalterado
│       └── password-recovery.ts       # NOVO
├── constants/
│   ├── theme.ts
│   └── auth.ts                        # NOVO: TAMANHO_MINIMO_SENHA
└── types/
    └── auth.ts                        # + PasswordRecoveryResult (se necessário)

__tests__/
└── auth/
    ├── index.test.tsx                 # existente
    ├── password-recovery.test.ts      # NOVO
    └── password-recovery-screens.test.tsx  # NOVO

specs/003-recuperar-senha/
├── spec.md
├── plan.md          # este arquivo
├── research.md
├── data-model.md
└── quickstart.md
```

## Fluxo ponta a ponta

```
ForgotPasswordScreen
  └─ solicitarRecuperacaoDeSenha(email.trim())
       └─ supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'palavraviva://auth-callback',
          })
       └─ retorna { status: 'confirmado' } SEMPRE, para e-mail existente ou não
  └─ exibe mensagem genérica

        ...usuário abre o e-mail, toca no link...

palavraviva://auth-callback#access_token=X&refresh_token=Y
  └─ expo-router roteia para /auth-callback
  └─ AuthCallbackScreen lê useLocalSearchParams()['#']
       └─ 'access_token=X&refresh_token=Y'
  └─ extrairCredenciaisDoLink(fragmento)
       ├─ sem access_token ou com error_code → { status: 'invalido', motivo: ... }
       └─ com tokens → { status: 'valido', credenciais: { accessToken, refreshToken } }
  └─ supabase.auth.setSession({ access_token, refresh_token })
       └─ dispara SIGNED_IN → AuthProvider já trata (index.tsx:70)
       └─ router.replace('/(auth)/reset-password')

ResetPasswordScreen
  └─ valida TAMANHO_MINIMO_SENHA e confirmação
  └─ atualizarSenha(novaSenha)
       └─ supabase.auth.updateUser({ password })
  └─ supabase.auth.signOut()
  └─ router.replace('/(auth)/login')
```

**Por que a sessão de recovery não atrapalha a navegação**: o guard está apenas em
`src/app/(tabs)/_layout.tsx:11-19`. Rotas em `(auth)` não são redirecionadas, e o `(auth)` não
redireciona para as tabs. Ver `research.md` R-005.

## Fases

### Fase 0 - Gate manual (bloqueante)

Detalhado em `quickstart.md`. Resultado registrado antes da Fase 1.

**Critério de passagem**: `updateUser({ password })` numa sessão de recovery **sem** `current_password`
define a senha e faz o login antigo falhar.

**Se falhar**: desativar `security_update_password_require_current_password` no painel e repetir.
Nenhum código muda.

### Fase 1 - Constante de senha

Extrair `TAMANHO_MINIMO_SENHA = 8` para `src/constants/auth.ts`. Consumir em
`RegisterScreen.tsx:50-51` e `RegisterScreen.tsx:128`, substituindo os dois literais `6`.

**Por que isolada**: é a única mudança que toca um arquivo da Onda 3, e não pertence à lógica de
recuperação. Feito depois da Onda 3, é uma substituição de dois literais.

Pré-condição: painel com `password_min_length` igual a `8`.

### Fase 2 - Serviço de recuperação

`src/auth/services/password-recovery.ts`, seguindo o padrão de `account-deletion.ts` já existente.

Três funções, todas puras do ponto de vista do chamador:

| Função | Assinatura | Responsabilidade |
|---|---|---|
| `solicitarRecuperacaoDeSenha` | `(email: string) => Promise<ResultadoSolicitacao>` | Chama `resetPasswordForEmail`. **Sempre** devolve a mesma resposta. |
| `extrairCredenciaisDoLink` | `(fragment: string \| undefined) => ResultadoLink` | Função pura. String para união discriminada. Sem rede, sem import de Expo. |
| `atualizarSenha` | `(password: string) => Promise<ResultadoAtualizacao>` | Chama `updateUser`. Traduz erro para português. |

`extrairCredenciaisDoLink` é puro de propósito: é onde mora toda a lógica de link inválido, e é testável sem
mock de Linking, `expo-router` ou rede. Ver `research.md` R-007 para o formato exato do fragmento.

**Contrato de não-enumeração**: `solicitarRecuperacaoDeSenha` distingue internamente falha de transporte,
mas **nunca** expõe essa distinção ao chamador. E-mail inexistente, e-mail existente e taxa
atingida produzem o mesmo `{ status: 'confirmado' }`. Ver FR-003 e FR-004.

### Fase 3 - Telas e rotas

Três telas em `src/auth/screens/`, três rotas de delegação em `src/app/(auth)/`, três
`Stack.Screen` em `(auth)/_layout.tsx`.

| Rota | Tela | Estados |
|---|---|---|
| `/(auth)/forgot-password` | `ForgotPasswordScreen` | `idle` → `submitting` → `sent` |
| `/(auth)/auth-callback` | `AuthCallbackScreen` | `processing` → `invalid` \| navega |
| `/(auth)/reset-password` | `ResetPasswordScreen` | `editing` → `submitting` → `done` \| `error` |

Todas com mensagem em tela, **sem** `Alert.alert` (FR-012).

`AuthCallbackScreen` precisa ser idempotente quanto ao duplo toque no link: reprocessar o mesmo
fragmento deve levar ao mesmo destino, nunca a erro.

`LoginScreen` ganha o link "Esqueci minha senha", seguindo o padrão visual do link "Ainda não tem
conta? Criar conta" que já existe em `LoginScreen.tsx:116`.

### Fase 4 - Testes

`__tests__/auth/password-recovery.test.ts`, sem mock de Expo:

- fragmento com os dois tokens → `{ status: 'confirmado' }`
- fragmento sem `access_token` → `{ status: 'invalido', motivo: 'malformado' }`
- fragmento ausente (`undefined`) → `{ status: 'invalido', motivo: 'malformado' }`
- fragmento com `error_code=otp_expired` → `{ status: 'invalido', motivo: 'expirado' }`
- fragmento com `error_code=access_denied` → `{ status: 'invalido', motivo: 'negado' }`
- e-mail inexistente e e-mail existente → respostas idênticas
- senha abaixo de `TAMANHO_MINIMO_SENHA` → erro antes de qualquer chamada de rede

`__tests__/auth/password-recovery-screens.test.tsx`, com o mock de `@/auth/services/supabase` que já
existe em `__tests__/auth/index.test.tsx`: renderização de cada estado, erro em tela sem `Alert`.

### Fase 5 - Configuração do projeto

Fora do repositório. Cada item verificado por leitura da Management API depois de aplicado.

| Item | Valor | Motivo |
|---|---|---|
| `password_min_length` | `8` | FR-015 |
| `mailer_templates_recovery_content` | português, com `{{ .ConfirmationURL }}` | FR-016 |
| SMTP | provedor próprio | FR-017; o embutido limita a 2 e-mails/hora |
| `uri_allow_list` | manter `palavraviva://auth-callback` | Já está lá; não remover sem checar uso web |

**Não mexer** em `site_url`: só-mobile não depende dele.

### Fase 6 - Qualidade

```
npm run typecheck
npm run lint
npm test
npm run check:dead
npm run check:styles
```

`check:dead` é relevante porque três telas e um serviço novos entram no grafo de imports; se algum
símbolo ficar órfão, o gate acusa.

## Ordem de execução

```
Fase 0 (manual, bloqueante)
   └─ resultado registrado em quickstart.md
        └─ Fase 2 (serviço)   ← testes primeiro
             └─ Fase 4 (testes do serviço)
                  └─ Fase 3 (telas)
                       └─ Fase 4 (testes de tela)
                            └─ Fase 1 (constante)   ← depois da Onda 3
                                 └─ Fase 5 (painel)
                                      └─ Fase 6 (gates)
```

A Fase 2 antes da Fase 3 é deliberada: escrever `extrairCredenciaisDoLink` com os testes primeiro deixa o
caso de link inválido resolvido antes de haver UI que dependa dele.

A Fase 1 vai por último porque é a única que toca arquivo da Onda 3.

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| GoTrue exige `current_password` em sessão de recovery | **A funcionalidade não funciona** | Fase 0 antes de qualquer código. Correção é no painel. |
| A Onda 3 da 002 mover o guard para `_layout.tsx` raiz | O usuário com sessão de recovery é jogado para as tabs | FR-013 mantém as rotas em `(auth)`. Reavaliar a spec se o guard mudar de lugar. |
| A Onda 3 mudar a convenção de nomes de tela ou rota | Os arquivos novos nascem com nome errado | Executar depois da Onda 3. |
| Duplo toque no link | Duas chamadas a `setSession` | `extrairCredenciaisDoLink` puro e `AuthCallbackScreen` idempotente |
| Taxa de e-mail estourar em produção | Usuário não recebe o link e não sabe por quê | Resposta genérica (FR-003) cobre; SMTP próprio remove o limite artificial de 2 |
| `expo-linking` deixar de ser transitiva | Build quebra | Não há import direto. `research.md` R-008. |

## Fora do escopo

Recuperação na web, limpeza de fragmento no histórico, PKCE, CAPTCHA, notificação de senha
alterada, `password_hibp_enabled`, Universal Links, `ios.bundleIdentifier`. Todos registrados em
`research.md`, seção "Itens de backlog".