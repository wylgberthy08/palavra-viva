# Feature Specification: Excluir Conta

**Feature Branch**: `001-excluir-conta`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "analize o projeto e monte o plano de tudo que foi feito e uma funcionalidade nova que é o de excluir conta."

## Contexto: o que já existe no projeto

Levantamento do estado atual do repositório (`main`, 2 commits) antes de especificar a
funcionalidade nova. Esta seção é diagnóstico, não escopo.

| Área | Estado |
|---|---|
| Rotas | 4 leaf routes: `/login`, `/register`, `/` (Home), `/meus` (Decorados). `typedRoutes` e `reactCompiler` ativos. |
| Auth | Supabase email/senha completo: `signIn`, `signUp`, `signOut`, `refreshUser` em `src/auth/index.tsx`. Credenciais em `expo-secure-store` (native) / `localStorage` (web). |
| Guard de sessão | `src/app/(tabs)/_layout.tsx:10-14` redireciona para `/(auth)/login` quando `user === null`. |
| Persistência | Nenhuma tabela Supabase existe no projeto. Zero chamadas a `.from()`, `.rpc()` ou Storage. |
| Dados do usuário | Versículos decorados vivem **apenas** em `AsyncStorage`, chave `@palavra-viva/saved-verses/v1` (`src/services/storage/saved-verses.ts:20`). |
| API de versículos | `api.midvash.com`, versão travada em `nvi`, idioma `pt-br`. Axios, timeout 10s. |
| Estado remoto | TanStack Query, chaves centralizadas em `src/query/keys.ts`. Zero `useMutation` no projeto. |
| Testes | Nenhuma infraestrutura. Sem `test` script, sem Jest/Vitest, sem CI. |
| Dívida conhecida | `.env` versionado no git; `mapSupabaseUser(user: any)` sem tipo; `signUp` reporta sucesso via `state.error`; ~15 módulos mortos; `axios-client.ts:14-22` interceptor inerte. |

**Implicação para esta feature**: não existe dado de servidor para apagar. Excluir a conta é
(1) apagar o usuário em `auth.users` e (2) apagar o que o app guardou localmente. O item (1)
exige privilégio de servidor — a chave `service_role` nunca pode entrar no cliente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Excluir a própria conta com confirmação explícita (Priority: P1)

Ana criou conta, decorou alguns versículos e decide que não quer mais usar o app. Ela abre a
tela de conta, toca em "Excluir conta", vê um aviso claro de que a ação é permanente e que os
versículos guardados também serão perdidos, confirma, e o app apaga a conta e volta para a tela
de entrada. Se ela desister, nada acontece e nada é perdido.

**Why this priority**: é a história pedida e é o requisito legal mais sensível de qualquer app com
cadastro. Sem isso, quem quer sair não tem caminho e permanece preso a uma conta que não usa.

**Independent Test**: com uma conta real criada no projeto, abrir a tela de conta, acionar a
exclusão, confirmar, e verificar que (a) a sessão termina, (b) o login com as mesmas credenciais
falha, (c) `@palavra-viva/saved-verses/v1` não existe mais no dispositivo. Entregar só esta
história já produz valor: o usuário recupera o controle dos próprios dados.

**Acceptance Scenarios**:

1. **Given** uma conta autenticada e versículos decorados, **When** Ana toca em "Excluir conta",
   **Then** um diálogo de confirmação aparece com texto que declara irreversibilidade e perda dos
   versículos guardados, e nenhum dado é alterado antes da confirmação.
2. **Given** o diálogo aberto, **When** Ana cancela, **Then** o diálogo fecha, nenhuma chamada de
   rede é feita e a lista de versículos continua intacta.
3. **Given** o diálogo aberto e confirmação, **When** a requisição conclui com sucesso, **Then** a
   sessão é encerrada, os dados locais são apagados e Ana é levada para `/(auth)/login`.
4. **Given** o diálogo aberto e confirmação, **When** a requisição falha, **Then** Ana permanece
   autenticada, os versículos continuam salvos e uma mensagem explica a falha com opção de tentar
   de novo.
5. **Given** uma conta autenticada, **When** a exclusão é concluída, **Then** uma nova tentativa de
   login com o mesmo e-mail e senha falha, porque a linha em `auth.users` não existe mais.

---

### User Story 2 - Acesso à conta e saída explícitos (Priority: P2)

Ana quer saber qual conta está ativa e sair sem depender de um ícone de avatar que faz duas
coisas. Ela toca no avatar, chega a uma tela de conta que mostra o e-mail, tem um botão "Sair" e
tem uma área de perigo com "Excluir conta".

**Why this priority**: a exclusão precisa de um lugar estável para morar, e hoje o botão de sair
está escondido dentro de um avatar cujo comportamento não é óbvio. Entregar esta história antes
da P1 deixa o caminho previsível.

**Independent Test**: abrir a tela de conta a partir do avatar em `/meus` e verificar e-mail
exibido, saída funcionando com o diálogo de confirmação existente, e o botão de exclusão
visível apenas dentro da área de perigo.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele toca no avatar em `/meus`, **Then** a tela de
   conta abre mostrando o e-mail da sessão ativa.
2. **Given** a tela de conta aberta, **When** ele toca em "Sair", **Then** o diálogo de confirmação
   de saída aparece e, ao confirmar, a sessão termina e ele volta para `/(auth)/login`.
3. **Given** a tela de conta aberta, **When** ele olha a área de perigo, **Then** "Excluir conta"
   aparece separado de "Sair" por rótulo e distância visual, sem mistura de cores acidental entre
   as duas ações.

---

### User Story 3 - Nenhum resíduo local após excluir (Priority: P3)

Ana exclui a conta no celular e entrega o aparelho a um irmão. O irmão não pode ver os versículos
que Ana decorou, nem numa sessão anterior do app.

**Why this priority**: é a garantia de privacidade que dá sentido à palavra "excluir". Depende da
P1, mas é verificável de forma independente, já que a limpeza local não depende do servidor.

**Independent Test**: salvar versículos, concluir a exclusão, e verificar pelo inspetor do
aplicativo (seco SecureStore / DevTools do navegador) que a chave de versículos e o token de
sessão não existem mais, e que a tela de login abre com estado vazio.

**Acceptance Scenarios**:

1. **Given** versículos decorados, **When** a exclusão conclui com sucesso, **Then** a chave
   `@palavra-viva/saved-verses/v1` é removida do armazenamento do dispositivo.
2. **Given** a exclusão concluída, **When** o app é reaberto, **Then** o usuário vai para a tela de
   entrada e a coleção de versículos aparece vazia, sem vestígio da conta anterior.
3. **Given** a exclusão concluída, **When** outro usuário entra no mesmo dispositivo, **Then** ele
   não vê nenhum versículo que pertencia à conta excluída.

### Edge Cases

- **Sem sessão ativa ao tocar em excluir**: a ação não pode prosseguir; o app já estará na tela de
  entrada pelo guard de sessão. A tela de conta trata `user === null` sem tentar chamar a API.
- **Falha de rede durante a exclusão**: a conta continua existindo, a sessão permanece ativa e a
  tela de Collection exibe o erro. A exclusão **não** é retentada automaticamente, para não
  apagar uma conta quando o usuário cancelou.
- **A exclusão é irreversível**: não há como restaurar a conta. O diálogo diz isso antes da
  confirmação, e não existe caminho de "desfazer" depois.
- **Usuário com objetos no Supabase Storage**: a documentação da plataforma informa que um usuário
  dono de objetos no Storage **não pode** ser excluído. O projeto não usa Storage hoje, mas a
  função de servidor deve tratar esse erro com mensagem própria, em vez de erro genérico.
- **Duas abas/dispositivos com a mesma conta**: excluir em um derruba a sessão do outro pelo
  `SIGNED_OUT` emitido em `onAuthStateChange`. O cache de consultas do outro dispositivo é
  revalidado; nenhum dado de usuário sobrevive porque não há dado de usuário no servidor.
- **Token de acesso já emitido**: excluir a linha em `auth.users` invalida sessões e refresh
  tokens, mas um JWT já entregue continua válido até o `exp`. O app encerra a sessão local
  imediatamente, o que encerra a janela na prática.
- **Web**: `Alert.alert` do React Native não suporta dois botões de forma confiável no navegador.
  A confirmação de exclusão é um diálogo próprio do app, não `Alert`, justamente porque a ação é
  irreversível e precisa de confirmação explícita nas três plataformas.
- **Reentrada durante a exclusão em andamento**: os controles de "Sair" e "Excluir conta" ficam
  desabilitados enquanto a requisição está em andamento, para não haver duas operações de sessão
  concorrentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST expor uma ação "Excluir conta" na tela de conta, dentro de uma área
  identificada como perigo, separada da ação de sair.
- **FR-002**: O sistema MUST exigir confirmação explícita antes de qualquer chamada de rede, com
  texto que declare que a ação é permanente e que os versículos guardados no dispositivo também
  serão perdidos.
- **FR-003**: O sistema MUST permitir cancelar a confirmação sem efeito colateral, sem chamada de
  rede e sem alteração de dados.
- **FR-004**: O sistema MUST excluir o usuário autenticado no servidor através de uma função de
  borda que valida o JWT do chamador e executa a remoção com privilégio de servidor. A chave
  `service_role` MUST NOT existir no código do aplicativo.
- **FR-005**: A função de borda MUST excluir apenas o usuário da sessão que a invocou, derivada
  das claims do JWT, e MUST NOT aceitar `user_id` vindo do corpo da requisição.
- **FR-006**: Após a exclusão bem-sucedida, o sistema MUST encerrar a sessão, apagar a coleção
  local de versículos decorados, limpar o cache de consultas e navegar para a tela de entrada.
- **FR-007**: Após a exclusão bem-sucedida, MUST não restar chave de versículos decorados nem
  credencial de sessão no armazenamento do dispositivo.
- **FR-008**: Quando a exclusão falhar, o sistema MUST manter o usuário autenticado, preservar os
  versículos guardados, exibir mensagem compreensível e permitir nova tentativa.
- **FR-009**: A tela de conta MUST exibir o e-mail da sessão ativa, o identificador do aplicativo e a
  versão, e MUST oferecer a ação de sair com confirmação.
- **FR-010**: O fluxo de exclusão MUST ter estados explícitos de ocioso, em andamento, sucesso e
  falha, com o botão desabilitado enquanto em andamento.
- **FR-011**: O sistema MUST tratar de forma distinta o erro de usuário que possui objetos no
  Supabase Storage, com mensagem que oriente a ação corretiva.
- **FR-012**: O sistema MUST validar as variáveis de ambiente do Supabase ao inicializar o cliente,
  falhando de forma explícita em vez de criar um cliente quebrado com valores vazios.
- **FR-013**: O `mapSupabaseUser` MUST receber o usuário do Supabase tipado, sem `any`.
- **FR-014**: O comportamento MUST ser idêntico em iOS, Android e web, sem depender de
  `Alert.alert` para a confirmação de exclusão.

### Key Entities

- **Conta do usuário**: linha em `auth.users`, identificada pelo UUID presente na claim `sub` do
  JWT. Não possui tabela espelho no projeto.
- **Sessão**: par de tokens mantido pelo cliente Supabase, persistido em `expo-secure-store`
  (native) ou `localStorage` (web), sob chave gerada pela biblioteca.
- **Versículo decorado**: registro local com `ref`, `reference`, `bookSlug`, `bookName`, `chapter`,
  `verseStart`, `verseEnd`, `text`, `status`, `savedAt`, guardado como array JSON na chave
  `@palavra-viva/saved-verses/v1`. Sem escopo por usuário.
- **Requisição de exclusão**: chamada autenticada à função de borda `delete-account`, sem corpo,
  sem `user_id` explícito.
- **Resultado da exclusão**: `sucesso`, `falha_de_rede`, `falha_de_autorizacao`, `usuario_com_objetos_no_storage`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário completa a exclusão em no máximo 4 toques a partir da tela "Meus",
  contando a abertura do diálogo e a confirmação.
- **SC-002**: 100% das solicitações de exclusão que chegam a sucesso resultam em login posterior
  com as mesmas credenciais recusado, verificado por repetição manual do cenário.
- **SC-003**: Após a exclusão bem-sucedida, a inspeção do armazenamento do dispositivo mostra zero
  chaves de versículos decorados e zero credenciais de sessão.
- **SC-004**: Nenhuma falha de exclusão deixa o usuário em estado inconsistente: em 100% dos casos
  de falha testados, ou a conta permanece ativa com dados intactos, ou a conta está excluída com
  dados locais limpos.
- **SC-005**: A confirmação de exclusão aparece nas três plataformas (iOS, Android, web) com dois
  botões funcionais, verificado por inspeção em cada uma.
- **SC-006**: `npm run lint` e `npx tsc --noEmit` passam sem erro, e a lógica de decisão da
  exclusão tem cobertura de teste automatizado sobre os quatro resultados de
  `Resultado da exclusão`.

## Assumptions

- O projeto Supabase referenciado em `opencode.json` (`project_ref=rltwtgdhojxkdkbdenbj`) é o
  ambiente alvo, e o usuário tem acesso para criar e implantar uma função de borda nele. A CLI do
  Supabase **não** está instalada nesta máquina.
- Nenhuma tabela de dados de usuário existe no Supabase, portanto não há schema a criar nem política
  RLS a escrever. Se, ao implementar, aparecerem tabelas de aplicação, elas entram com
  `on delete cascade` a partir de `auth.users` conforme a documentação da plataforma.
- O projeto permanece local-first: a exclusão de conta **não** introduz sincronização em nuvem.
- A exclusão permanente é a única modalidade oferecida. Não haverá exclusão lógica, anonimização
  nem período de carência neste recorte.
- A limpeza de dados locais é responsabilidade do aplicativo, já que o servidor não conhece esses
  dados.
- A infraestrutura de testes unitários será criada nesta feature, porque o Quality Gate da
  constituição exige cobertura automatizada para comportamento novo e o repositório não tem
  nenhuma.
- O `.env` versionado no git está fora do escopo desta feature e permanece como dívida técnica a
  ser tratada separadamente.
