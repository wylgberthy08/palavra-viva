---
description: "Lista de tarefas para o feature 003-recuperar-senha"
---

# Tasks: Recuperar Senha

**Input**: Documentos de design de `/specs/003-recuperar-senha/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: incluídos. A constitution v1.1.0 exige em Quality Gates: "Todo comportamento novo ou
corrigido tem teste automatizado, ou verificação manual registrada na revisão".

**Organization**: Tarefas agrupadas por fase do plano. As fases 1 a 4 estão separadas porque
dependem de marcos diferentes: a Fase 0 depende de acesso manual, e a Fase 3 depende da conclusão da
Onda 3 da spec `002-refatoracao`.

## Format: `[ID] [P?] [Story] Descrição`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: história de usuário à qual a tarefa pertence
- Inclui caminho exato de arquivo

## Path Conventions

- Projeto único: `src/`, `__tests__/` e `scripts/` na raiz do repositório
- Comandos de verificação: `npm run verify` (= `typecheck` + `lint` + `test`)

**Regra de ouro desta lista**: nenhuma tarefa entra com `npm run verify` vermelho. Cada tarefa é um
commit. Se uma tarefa não fecha sozinha, ela está errada.

## Dependência de ordem — ler antes de começar

Duas pré-condições, ambas externas a esta lista:

1. **A Onda 3 da `002-refatoracao` precisa estar concluída** antes da Fase 3. Ela reescreve
   `src/auth/index.tsx` e converte os `Alert.alert` de `LoginScreen.tsx` e `RegisterScreen.tsx`,
   que são arquivos que esta feature toca. Motivo em `plan.md`, seção "Por que este plano espera a
   spec 002".
2. **A Fase 0 precisa ter veredito registrado** em `quickstart.md` antes da Fase 2.

A Fase 2 não colide com a `002` e pode ser executada antes de a Onda 3 terminar. A Fase 3 e a Fase 4
não podem.

---

## Phase 0: Gate manual (bloqueante, fora do alcance do agente)

**Purpose**: Responder a única pergunta que a documentação do Supabase não responde e que decide se
a funcionalidade existe. Detalhe em `quickstart.md`, "Fase 0".

**Por que não é automatizável**: o `.env` tem `SUPABASE_ACCESS_TOKEN`, que é token de management, e
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. Não há `service_role`, então a Admin API
`generate_link` não pode ser usada para obter o link de recuperação sem passar pelo e-mail. E a
mensagem de retorno do GoTrue só é observável depois de clicar no link.

- [ ] T001 Confirmar no painel o estado de `security_update_password_require_current_password` do projeto `rltwtgdhojxkdkbdenbj`
- [ ] T002 Gerar um development build, porque o link `palavraviva://auth-callback` não abre no Expo Go (`research.md` R-009)
- [ ] T003 Pedir a recuperação de um e-mail real e abrir o link, confirmando que o app abre na rota de recuperação
- [ ] T004 Executar `supabase.auth.updateUser({ password })` a partir da sessão de recovery e registrar se retorna erro
- [ ] T005 Confirmar que o login com a senha antiga falha depois da troca
- [ ] T006 Preencher a tabela de registro de `quickstart.md`, com data, estado da flag, `error.message` se houver e o veredito
- [ ] T007 Se o veredito for ❌, desativar `security_update_password_require_current_password` no painel e repetir T003 a T006, sem alterar código

**Critério de passagem**: veredito ✅ registrado. Nenhum código da Fase 2 começa com este campo vazio.

---

## Phase 1: Setup

- [x] T008 [P] Criar e entrar no branch de trabalho com `git switch -c 003-recuperar-senha`, conforme Princípio VII
- [ ] T009 Registrar em `specs/003-recuperar-senha/plan.md` que a Fase 0 foi concluída, com o veredito e a data

**Gate**: `npm run verify` verde antes da Fase 2.

---

## Phase 2: Serviço de recuperação (TDD)

**Purpose**: Isolar toda a lógica de rede e de parsing, para que a Fase 3 só monte telas.

**Why first**: `extrairCredenciaisDoLink` é função pura de string para união discriminada. Escrever com o
teste antes deixa o caso de link inválido resolvido antes de existir UI que dependa dele. Não colide
com a `002`, porque `src/auth/services/password-recovery.ts` é arquivo novo.

- [x] T010 [P] Escrever em `__tests__/auth/password-recovery.test.ts` o teste de fragmento com `access_token` e `refresh_token` válidos, esperando `{ status: 'confirmado' }`
- [x] T011 [P] Escrever no mesmo arquivo o teste de fragmento sem `access_token`, esperando `{ status: 'invalido', motivo: 'malformado' }`
- [x] T012 [P] Escrever no mesmo arquivo o teste de fragmento `undefined`, esperando `{ status: 'invalido', motivo: 'malformado' }`
- [x] T013 [P] Escrever no mesmo arquivo o teste de `error_code=otp_expired`, esperando `{ status: 'invalido', motivo: 'expirado' }`
- [x] T014 [P] Escrever no mesmo arquivo o teste de `error_code=access_denied`, esperando `{ status: 'invalido', motivo: 'negado' }`
- [x] T015 [P] Escrever no mesmo arquivo o teste de `error_code` desconhecido, esperando `{ status: 'invalido', motivo: 'malformado' }`
- [x] T016 Escrever em `src/auth/services/password-recovery.ts` o tipo `ResultadoLink` e a função pura `extrairCredenciaisDoLink(fragment)`, fazendo T010 a T015 ficarem verdes
- [x] T017 [P] Escrever no teste de arquivo o caso de e-mail existente e de e-mail inexistente, exigindo igualdade profunda das respostas de `solicitarRecuperacaoDeSenha`, conforme FR-003
- [x] T018 Implementar em `src/auth/services/password-recovery.ts` `solicitarRecuperacaoDeSenha(email)`, chamando `resetPasswordForEmail` com `redirectTo` igual a `palavraviva://auth-callback`, e fazendo T017 ficar verde
- [x] T019 Implementar no mesmo arquivo `atualizarSenha(password)`, traduzindo `error.message` para as mensagens da tabela de `data-model.md` e fazendo FR-011
- [x] T020 Garantir que nenhuma função do serviço importa de `expo-router`, `expo-linking` ou `react-native`, conforme `research.md` R-008

**Gate**: `npm run verify` verde. `check:dead` verde.

**Nota de teste, T017**: o teste precisa passar pelo caminho real de `resetPasswordForEmail`, com o
cliente mockado devolvendo dois retornos distintos. Um mock que sempre devolve sucesso não prova a
ausência de enumeração.

---

## Phase 3: Telas e rotas

**Purpose**: Entregar o fluxo visível.

**Bloqueio**: requer a Onda 3 da `002` concluída, porque `LoginScreen.tsx` e `RegisterScreen.tsx`
são arquivos que ela reescreve.

- [x] T021 Criar `src/auth/screens/ForgotPasswordScreen.tsx` com os estados `idle`, `submitting` e `sent`, mensagem em tela eFR-014
- [ ] T022 Criar `src/auth/screens/AuthCallbackScreen.tsx` lendo `useLocalSearchParams()['#']`, chamando `extrairCredenciaisDoLink` e `setSession`, com idempotência para duplo toque
- [ ] T023 Criar `src/auth/screens/ResetPasswordScreen.tsx` com validação de tamanho e confirmação antes de qualquer chamada de rede, e `signOut` depois do sucesso (FR-010)
- [x] T024 Criar `src/app/(auth)/forgot-password.tsx` delegando para `ForgotPasswordScreen`, seguindo o padrão de 2 linhas de `login.tsx`
- [ ] T025 Criar `src/app/(auth)/auth-callback.tsx` delegando para `AuthCallbackScreen`
- [ ] T026 Criar `src/app/(auth)/reset-password.tsx` delegando para `ResetPasswordScreen`
- [x] T027 Declarar as três rotas novas em `src/app/(auth)/_layout.tsx`
- [x] T028 Adicionar o link "Esqueci minha senha" em `src/auth/screens/LoginScreen.tsx`, seguindo o padrão visual do link de registro que já existe na linha 116
- [x] T029 Garantir que nenhuma tela nova usa `Alert.alert`, conforme FR-012 e `research.md` R-012
- [ ] T030 [P] Escrever o teste de renderização de cada estado das três telas. `ForgotPasswordScreen` e o link do login **já estão feitos** em `__tests__/screens/forgot-password.test.tsx` (9 casos) e `__tests__/screens/login-link-recuperacao.test.tsx` (2 casos); faltam `AuthCallbackScreen` e `ResetPasswordScreen`, com o mock de `@/auth/services/supabase` que já existe em `__tests__/auth/index.test.tsx`
- [ ] T031 [P] Escrever o teste de erro em tela sem `Alert.alert` (parcialmente coberto em `forgot-password.test.tsx`), e de senha abaixo do mínimo sem chamada de rede

**Gate**: `npm run verify` verde. `check:dead` verde, porque as três telas entram no grafo de imports.

**Conferência obrigatória, T023**: o guard de sessão está em `src/app/(tabs)/_layout.tsx:11-19` e
**não** foi movido. Se a Onda 3 o tiver movido para `src/app/_layout.tsx`, esta spec precisa ser
reavaliada antes de seguir. Ver `research.md` R-005.

---

## Phase 4: Constante de senha

**Purpose**: Tirar o `6` de dois lugares de um arquivo que a Onda 3 reescreve.

**Bloqueio**: `RegisterScreen.tsx` é arquivo da Onda 3.

- [ ] T032 Criar `src/constants/auth.ts` com `TAMANHO_MINIMO_SENHA = 8`
- [ ] T033 Substituir os dois literais `6` de `src/auth/screens/RegisterScreen.tsx`, na validação da linha 50 e no placeholder da linha 128, por `TAMANHO_MINIMO_SENHA`
- [ ] T034 Importar `TAMANHO_MINIMO_SENHA` em `src/auth/services/password-recovery.ts`, se a validação de tamanho ficar no serviço

**Gate**: `npm run verify` verde.

**Contrapartida**: `password_min_length` do painel precisa estar em `8` quando T033 subir, senão o
cliente aceita o que o backend rejeita. Ver `quickstart.md`, Cenário 0.3.

---

## Phase 5: Configuração do projeto (fora do repositório)

**Purpose**: Fechar o que só existe no painel.

**Cada item é verificado por leitura da Management API depois de aplicado, não por confiança.**

- [ ] T035 Subir `password_min_length` para `8` no painel, conforme FR-015
- [ ] T036 Traduzir `mailer_templates_recovery_content` para português, preservando o placeholder `{{ .ConfirmationURL }}`, conforme FR-016
- [ ] T037 Configurar SMTP próprio, conforme FR-017, porque `rate_limit_email_sent` igual a `2` não permite validação E2E repetida
- [ ] T038 Confirmar que `uri_allow_list` contém `palavraviva://auth-callback`
- [ ] T039 Confirmar que `site_url` **não** foi alterado, porque o escopo é só mobile
- [ ] T040 Confirmar que nenhuma credencial de SMTP entrou no `.env`, no `.env.example` ou no repositório, conforme Princípio VII

---

## Phase 6: Validação

- [ ] T041 Rodar `npm run verify` (= `typecheck` + `lint` + `test`)
- [ ] T042 Rodar `npm run check:dead`
- [ ] T043 Rodar `npm run check:styles`
- [ ] T044 Executar o Cenário 1 de `quickstart.md`, que comprova SC-001 e SC-002
- [ ] T045 Executar o Cenário 2, que comprova SC-003
- [ ] T046 Executar o Cenário 3, que comprova SC-005 e o comportamento de duplo toque
- [ ] T047 Executar o Cenário 4, que comprova FR-009 e a tradução de erro
- [ ] T048 Executar o Cenário 5, que procura vazamento técnico em tela
- [ ] T049 Executar o Cenário 7, verificando a configuração por leitura da Management API
- [ ] T050 Registrar em `quickstart.md` o resultado de cada cenário e a data

---

## Dependências

```
Phase 0 (manual, bloqueante)
   └─ T009 ──> Phase 2 (serviço, TDD)
                  └─ Phase 3 (telas)   [ requer Onda 3 da 002 ]
                       └─ Phase 4 (constante)  [ requer Onda 3 da 002 ]
                            └─ Phase 5 (painel)
                                 └─ Phase 6 (validação)
```

Parallelizáveis dentro de cada fase: T010 a T015 escrevem casos diferentes do mesmo arquivo de
teste, mas devem ser aplicados em sequência para manter a ordem legível de Arrange/Assert; T017 roda
em paralelo com T016 porque toca o mesmo arquivo de teste. **Ao final, nenhuma tarefa pode ficar
com `npm run verify` vermelho.**

## Fora do escopo

Registrados em `research.md`, seção "Itens de backlog", para não se perderem: recuperação na web,
limpeza de fragmento no histórico, PKCE, `security_captcha_enabled`,
`mailer_notifications_password_changed_enabled`, limite estrito de envio em produção,
Universal Links, `ios.bundleIdentifier` e `password_hibp_enabled`.