# Feature Specification: Recuperar Senha

**Feature Branch**: `003-recuperar-senha`

**Created**: 2026-10-01

**Status**: Draft (planejada, aguardando a spec 002)

**Input**: User description: "preciso que crie um plano para a funcionalidade de recuperar senha."

## Dependência de ordem: por que esta spec espera a 002

A spec `002-refatoracao` está em andamento no branch `002-refatoracao` e a Onda 3 ainda vai:

- reescrever `src/auth/index.tsx`, hoje violando o Princípio II ao mapear, assinar e manter estado de sessão no mesmo arquivo (`002-refatoracao/plan.md:36`);
- converter os `Alert.alert` das telas de auth em mensagem em tela, por meio do `confirm-dialog` novo (`002-refatoracao/plan.md`, item 3.12 e 3.13).

Qualquer implementação de recuperação de senha tocaria exatamente esses arquivos. Escrever agora
significa refazer. Esta spec é escrita e fica **aguardando a conclusão da Onda 3**; a execução
começa depois.

## Escopo: só mobile

O usuário decidiu que o link de recuperação abre o app **mobile** via deep link
`palavraviva://auth-callback`. Isso dispensa URL pública, dispensa ajuste do `site_url` para
produção e mantém o plano pequeno.

Fora do escopo, registrado para não se perder:

| Item | Por que fica de fora |
|---|---|
| Recuperação na web | Exige URL HTTPS pública, `site_url` de produção e `uri_allow_list` web. Além disso, com `output: "static"` não há servidor para tratar o callback. |
| Limpeza do fragmento da URL na web | Só existe porque o fluxo implícito põe tokens no fragmento; não se aplica ao deep link nativo. |
| Universal Links / AASA | `app.json` não tem `ios.bundleIdentifier`. Universal Links exige hospedar o arquivo AASA em infraestrutura própria. |
| Notificação de senha alterada | `mailer_notifications_password_changed_enabled` está `False` no painel. Útil, porém ortogonal. |

## Contexto: o que já existe no projeto

Levantamento do estado do repositório no branch `002-refatoracao`. Esta seção é diagnóstico, não
escopo.

| Área | Estado |
|---|---|
| Rotas de auth | `src/app/(auth)/login.tsx` e `register.tsx`, ambas com 2-3 linhas delegando para `src/auth/screens/`. `src/app/(auth)/_layout.tsx` declara 2 `Stack.Screen`. |
| Guard de sessão | `src/app/(tabs)/_layout.tsx:11-19`. **Só protege o grupo `(tabs)`.** `src/app/_layout.tsx` não redireciona. |
| Cliente Supabase | `src/auth/services/supabase.ts`. `detectSessionInUrl: false`, `persistSession: true`, `autoRefreshToken: true`. **Não define `flowType`**, logo o fluxo é implícito. |
| Provider de sessão | `src/auth/index.tsx` expõe `signIn`, `signUp`, `signOut`, `refreshUser`. Nada de recuperação. |
| Tratamento de `onAuthStateChange` | Cobre `SIGNED_IN`, `SIGNED_OUT` e `TOKEN_REFRESHED` (`src/auth/index.tsx:69-77`). `PASSWORD_RECOVERY` não é tratado. |
| Senha | `RegisterScreen.tsx:50-51` exige 6 caracteres com `Alert.alert`; `RegisterScreen.tsx:128` repete "Mínimo 6 caracteres" no placeholder. `LoginScreen` não valida tamanho. |
| Dependências | `expo-router`, `expo-secure-store`, `expo-splash-screen`. **Não há** `expo-auth-session`, `expo-web-browser`, `expo-linking` nem `zod`/`yup`/`react-hook-form`. |
| Testes | `__tests__/auth/index.test.tsx` e `__tests__/screens/tabs.test.tsx` existem, com mocks de `@/auth/services/supabase`. |
| Componentes de UI | `src/components/ui/auth-screen.tsx` e `confirm-dialog.tsx` são criados pela Onda 3 da 002. |

## Estado real da configuração do projeto `rltwtgdhojxkdkbdenbj`

Consultado pela Management API. Estes valores **não** são padrão de projeto novo e são a principal
fonte de risco desta spec.

| Configuração | Valor | Consequência |
|---|---|---|
| `security_update_password_require_current_password` | **`True`** | **Risco bloqueante.** Ver US1 e o gate da Fase 0. |
| `site_url` | `http://localhost:3000` | Padrão nunca ajustado. Não afeta o deep link nativo. |
| `uri_allow_list` | `palavraviva://auth-callback,http://localhost:8081/auth/callback` | O deep link **já está liberado**. |
| `mailer_autoconfirm` | `True` | Por isso `signUp` devolve sessão imediata hoje. |
| `password_min_length` | `6` | Durocoded em `RegisterScreen` em dois lugares. |
| `password_required_characters` | vazio | Sem maiúscula, dígito ou símbolo. |
| `password_hibp_enabled` | `False` | Sem verificação contra senhas vazadas. |
| `rate_limit_email_sent` | `2` | **2 e-mails por hora.** O SMTP embutido não serve para E2E repetido. |
| `smtp_host` | vazio | Usando o SMTP embutido do Supabase. |
| `security_captcha_enabled` | `False` | Endpoint de recuperação mais exposto a abuso. |
| `refresh_token_rotation_enabled` | `True` | Cada renovação gera token novo. |
| `mailer_templates_recovery_content` | customizado, **em inglês** | O app é em português. |

## Gate da Fase 0: o risco que decide a viabilidade

`security_update_password_require_current_password` está ligado. A documentação oficial do
Supabase descreve `updateUser({ password })` apenas para o caso de **usuário logado que confirma a
própria senha atual**. A documentação **não cobre** a sessão vinda de um link de recuperação, e o
código-fonte do GoTrue não está disponível para conferência.

Se o GoTrue exigir `current_password` mesmo em sessão de recovery, o usuário que **esqueceu** a
senha fica bloqueado no último passo, e a funcionalidade inteira não funciona. Não há como contornar
isso no cliente: o usuário não tem a senha antiga para informar.

Por isso a Fase 0 é um gate, não uma formalidade. Ela é manual e depende do painel e da leitura de
um e-mail real, o que o agente não pode fazer. **O resultado precisa ser registrado em
`quickstart.md` antes de a Fase 1 começar.**

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recuperar o acesso à conta (Priority: P1)

João esqueceu a senha. Ele abre o app, toca em "Esqueci minha senha", informa o e-mail da conta e
recebe a confirmação de que, se a conta existir, o e-mail foi enviado. Ele abre a mensagem no
celular, toca no link, o app abre sozinho, ele informa a nova senha duas vezes, e entra com a senha
nova. A senha antiga deixou de funcionar.

**Why this priority**: é a história pedida. Sem ela, quem perde a senha está preso na conta para
sempre e o cadastro vira uma cela sem saída.

**Independent Test**: com uma conta real do projeto, percorrer do toque em "Esqueci minha senha" até
o login bem-sucedido com a senha nova. Entregar só esta história já produz valor: o usuário
recupera o acesso.

**Acceptance Scenarios**:

1. **Given** o usuário na tela de login, **When** ele toca em "Esqueci minha senha", **Then** a
   tela de solicitação abre com campo de e-mail, e nenhum dado é alterado.
2. **Given** a tela de solicitação, **When** ele informa um e-mail e confirma, **Then** o app exibe
   uma mensagem genérica de confirmação, **idêntica** para e-mail existente e para e-mail
   inexistente.
3. **Given** a mensagem de confirmação na tela, **When** ele abre o e-mail e toca no link, **Then** o
   app abre na rota de recuperação e a tela de nova senha aparece.
4. **Given** a tela de nova senha, **When** ele informa senhas novas idênticas com 8 ou mais
   caracteres, **Then** a senha é alterada, a sessão de recuperação é encerrada e ele é levado à
   tela de entrada, onde entra com a senha nova.
5. **Given** a senha nova foi alterada, **When** ele tenta entrar com a senha antiga, **Then** o
   login falha com mensagem genérica de credenciais inválidas.
6. **Given** a tela de nova senha, **When** ele confirma com senhas diferentes, **Then** a senha
   **não** é alterada e a tela explica que as senhas não conferem.
7. **Given** a tela de nova senha, **When** ele informa menos de 8 caracteres, **Then** a senha
   **não** é alterada e a tela explica o mínimo exigido.

### User Story 2 - Não revelar quem tem conta (Priority: P1)

Maria tenta recuperar a senha de um e-mail que não pertence a ela. O app não confirma nem nega que a
conta existe, em nenhuma tela, em nenhum momento.

**Why this priority**: é a mesma prioridade da US1. Uma tela que diz "e-mail não encontrado" é um
oráculo de quais pessoas têm conta no app, e o efeito colateral é pior que o benefício. Vira lista
de e-mails para spam e phishing direcionado.

**Independent Test**: submeter um e-mail aleatório e um e-mail de conta real, e comparar as duas
respostas. Precisam ser indistinguíveis — mesmo texto, mesmo tempo de resposta aproximado, mesmo
formato.

**Acceptance Scenarios**:

8. **Given** a tela de solicitação, **When** o e-mail não corresponde a nenhuma conta, **Then** a
    mensagem exibida é a mesma do cenário 2, e nenhum erro é logged em tela.
9. **Given** a tela de solicitação, **When** a taxa de envio do Supabase é atingida, **Then** a
    mensagem exibida continua a mesma, sem revelar limite.

### User Story 3 - Link inválido ou expirado não deixa a tela travada (Priority: P2)

Paulo clica no link de recuperação três dias depois, quando o token já expirou (`mailer_otp_exp` é
3600 s). Ele vê uma mensagem clara de que o link expirou, com caminho para pedir um novo, e não fica
parado numa tela que carrega para sempre.

**Why this priority**: é o estado em que o usuário menos consegue sair sozinho, porque não sabe o
que fez de errado. Sem tratamento explícito, o app parece quebrado e ele conclui que a conta foi
perdida.

**Independent Test**: abrir um link com token expirado, ou com o fragmento removido, e verificar que
a tela mostra erro e oferece a reenvio.

**Acceptance Scenarios**:

10. **Given** o link clicado sem tokens no fragmento, ou com `error_code` na URL, **Then** a tela
    mostra que o link é inválido e oferece pedir um novo, sem erro técnico cru.
11. **Given** o link clicado e o token expirado, **Then** a tela explica que o link expirou e oferece
    pedir um novo e-mail.
12. **Given** a tela de nova senha, **When** o app é fechado e aberto de novo durante a sessão de
    recuperação, **Then** ele volta para a tela de nova senha, sem pedir o link outra vez.

### Edge Cases

- **E-mail com letra maiúscula ou espaço nas bordas**: normalizado com `trim()`. A comparação do GoTrue é case-insensitive, então "João@Email.com " e "joao@email.com" são a mesma conta.
- **Usuário logado tentando recuperar senha**: o link funciona igual. Não há bloqueio; o app não deve forçar logout antes.
- **Envio repetido rápido na mesma tela**: o botão fica desabilitado durante a requisição para evitar duplo envio. Reenviar depois depende do limite do Supabase, tratado pela US2 cenário 9.
- **Sessão de recuperação com a tela do sistema aberto por cima**: ao voltar, o app retoma a sessão.
- **O link é aberto no navegador em vez do app**: sem app instalado, o navegador não terá o que fazer com `palavraviva://`. Fora do escopo, mas o usuário deve receber instrução de abrir o app.
- **`Redirect URL is not allowed`**: indica que a `uri_allow_list` do painel foi alterada. O diagnóstico está em `quickstart.md`.
- **Deep link chegando em app não logado com sessão ativa de outro usuário**: o `setSession` sobrescreve a sessão; o usuário entra como a conta do link, que é o comportamento correto.
- **O usuário clica no link duas vezes quickly**: o segundo deep link reprocessa a mesma URL. `extrairCredenciaisDoLink` deve tolerar e o resultado deve ser o mesmo, sem erro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela de login deve ter um link "Esqueci minha senha" que abre a rota `/(auth)/forgot-password`.
- **FR-002**: A tela de solicitação deve chamar `resetPasswordForEmail` com `email` normalizado por `trim()` e `redirectTo` igual a `palavraviva://auth-callback`.
- **FR-003**: A resposta da tela de solicitação deve ser uma mensagem genérica, **idêntica** para e-mail existente, inexistente e limitado por taxa.
- **FR-004**: O app **não deve** persistir em log, analytics ou estado visível qualquer sinal que distinga e-mail existente de inexistente.
- **FR-005**: O app deve tratar o deep link `palavraviva://auth-callback` lendo `access_token` e `refresh_token` do fragmento e chamando `supabase.auth.setSession({ access_token, refresh_token })`.
- **FR-006**: O app **não deve** depender do evento `PASSWORD_RECOVERY` para iniciar o fluxo. No React Native esse evento não é emitido, porque `_initialize()` só faz o parse da URL quando `isBrowser()` é verdadeiro, e `isBrowser()` exige `window` e `document`.
- **FR-007**: O fragmento sem `access_token`, ou com `error_code`/`error_description`, deve ser tratado como link inválido, com mensagem em português e opção de reenvio.
- **FR-008**: O app deve chamar `supabase.auth.updateUser({ password })` a partir da sessão estabelecida no FR-005.
- **FR-009**: A senha nova deve ter **pelo menos 8 caracteres**, validados no cliente antes de qualquer chamada de rede, e confirmados por repetição.
- **FR-010**: Após `updateUser` bem-sucedido, o app deve chamar `supabase.auth.signOut()` e levar o usuário à rota `/(auth)/login`.
- **FR-011**: As mensagens de erro visíveis devem estar em português e **não devem** expor `error.message` crua do Supabase.
- **FR-012**: Nenhuma tela nova deve usar `Alert.alert`. A Onda 3 da spec 002 remove esse padrão das telas de auth; telas novas já nascem com mensagem em tela.
- **FR-013**: As rotas novas **devem** ficar no grupo `(auth)`, porque o guard de sessão está apenas em `src/app/(tabs)/_layout.tsx:11-19` e não deve ser movido.
- **FR-014**: O botão de envio deve ficar desabilitado enquanto a requisição está em andamento, para impedir envio duplo.
- **FR-015**: O projeto deve ter `password_min_length` igual a `8` no painel, e o valor deve ser lido de uma constante compartilhada, não repetido como literal.
- **FR-016**: O template de e-mail de recovery deve estar em português e preservar o placeholder `{{ .ConfirmationURL }}`.
- **FR-017**: O projeto deve usar SMTP próprio, porque o SMTP embutido é limitado a `rate_limit_email_sent` igual a `2` por hora e não permite validação E2E repetida.
- **FR-018**: Deve existir suíte automatizada cobrindo o parsing do fragmento de recuperação, os casos de link inválido e a resposta genérica do envio.

### Key Entities

| Entidade | Forma | Papel |
|---|---|---|
| Solicitação de recuperação | `{ email: string }` | Entrada de `solicitarRecuperacaoDeSenha`. |
| Resultado do envio | união discriminada `{ status: 'confirmado' } \| { status: 'falha_de_rede'; mensagem: string }` | Sucesso é indistinguível do e-mail inexistente. |
| Credenciais do link | `{ accessToken: string; refreshToken: string }` | Saída bem-sucedida de `extrairCredenciaisDoLink`. |
| Link inválido | `{ code: string }` com `code` sendo `expired`, `malformed` ou `denied` | Saída de falha de `extrairCredenciaisDoLink`, virando mensagem em português. |
| Resultado da redefinição | união discriminada de sucesso e falha | Saída de `atualizarSenha`, com mensagem traduzida. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das contas que concluem a recuperação conseguem entrar com a senha nova em menos de 3 minutos desde o toque no link, sem intervenção manual.
- **SC-002**: 100% das tentativas com a senha antiga falham após a redefinição.
- **SC-003**: As respostas da tela de solicitação para e-mail existente e para e-mail inexistente são **byte a byte idênticas** na UI.
- **SC-004**: Zero erros técnicos em inglês ou com trace de biblioteca aparecem em tela em todo o fluxo.
- **SC-005**: 100% dos cenários de link inválido, expirado e duplo clique resultam em mensagem acionável, nunca em tela carregando indefinidamente.
- **SC-006**: `npm run verify` e `npm test` passam, com cobertura dos casos de FR-005 a FR-009.
- **SC-007**: O gate da Fase 0 está registrado em `quickstart.md` com o comportamento observado de `updateUser` em sessão de recovery.

## Assumptions

- A spec 002 conclui a Onda 3 antes de qualquer código desta spec ser escrito. Se a 002 mudar a convenção de nomes de tela ou de rotas, esta spec é reavaliada.
- `palavraviva://auth-callback` permanece na `uri_allow_list` do painel.
- O usuário tem acesso ao painel do Supabase e a um provedor de SMTP externo.
- O usuário tem um e-mail real de teste para a validação manual.
- O GoTrue, ao receber `updateUser({ password })` numa sessão de recovery, **não** exige `current_password`. **Não confirmado.** Ver o gate da Fase 0.
- Nenhum outro fluxo de autenticação muda de comportamento. Em particular, `flowType` do cliente permanece **implícito**, igual hoje.