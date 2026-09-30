---
description: "Lista de tarefas para o feature 002-refatoracao"
---

# Tasks: Plano de Refatoração

**Input**: Documentos de design de `/specs/002-refatoracao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: incluídos. A constitution v1.1.0 exige em Quality Gates: "Todo comportamento novo ou
corrigido tem teste automatizado, ou verificação manual registrada na revisão". Esta feature corrige
comportamento, então os testes são obrigatórios, não opcionais.

**Organization**: Tarefas agrupadas por história de usuário, para que cada uma possa ser
implementada, testada e entregue de forma independente.

## Format: `[ID] [P?] [Story] Descrição`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: história de usuário à qual a tarefa pertence
- Inclui caminho exato de arquivo

## Path Conventions

- Projeto único: `src/`, `__tests__/` e `scripts/` na raiz do repositório
- Comandos de verificação: `npm run verify` (= `typecheck` + `lint` + `test`)

**Regra de ouro desta lista**: nenhuma tarefa entra com `npm run verify` vermelho. Cada tarefa é um
commit. Se uma tarefa não fecha sozinha, ela está errada.

---

## Phase 1: Setup (Infraestrutura compartilhada)

**Purpose**: Gate de verificação verde e higiene de ambiente. Sem isso, nenhuma onda seguinte é
demonstrável como não-regressão.

**Blocker constitucional**: Princípio VII e a seção Governance exigem que `.env` versionado bloqueie
o merge **até ser removido do índice e a credencial rotacionada**. T005 não é opcional.

- [x] T001 Criar e entrar no branch de trabalho com `git switch -c 002-refatoracao`
- [x] T002 Substituir o padrão de hidratação de `src/hooks/use-color-scheme.web.ts` por `useSyncExternalStore`, eliminando o `setState` dentro de `useEffect` que faz `npm run lint` falhar hoje com `react-hooks/set-state-in-effect`
- [x] T003 Trocar a regra de `.gitignore` para negação ampla `.env*` com reabertura explícita `!.env.example`, conforme Princípio VII
- [x] T004 Tirar `.env` do índice com `git rm --cached .env`, preservando o arquivo em disco
- [ ] T005 Rotacionar `EXPO_PUBLIC_SUPABASE_ANON_KEY` no painel do Supabase e gravar o valor novo no `.env` local, conforme Princípio VII: "Segredo que já foi commitado MUST ser rotacionado. Remover o arquivo do HEAD não desfaz a exposição" — **BLOQUEADA: exige acesso ao painel do Supabase, fora do alcance do agente**
- [x] T006 Reescrever `.env.example` para conter apenas o contrato: adicionar `EXPO_PUBLIC_BIBLE_BASE_URL`, que `src/config/bible.ts:10` lê e hoje não está listado, e remover a seção de login social com Google, que não tem implementação no código
- [x] T007 Remover o bloco de comentário `SYNC IMPACT REPORT` e a nota `TODO deferred` das linhas 1-16 de `.specify/memory/constitution.md`, que registram a dívida que T003, T004 e T005 estão resolvendo
- [x] T008 Acrescentar `.expo/`, `coverage/` e `dist/` às entradas ignoradas de `.gitignore`
- [x] T009 Acrescentar os scripts `typecheck` (`npx tsc --noEmit`) e `verify` (`typecheck` seguido de `lint`) em `package.json` (o `test` será incluído em `verify` após a criação do script de testes)
- [x] T010 Atualizar `eslint.config.js` para ignorar artefatos de build e ativar `import/order` com `@/` classificado como grupo interno

---

## Phase 2: Foundational (Pré-requisitos bloqueantes)

**Purpose**: Infraestrutura da qual toda história de usuário depende.

**?? CRITICAL**: Nenhuma história de usuário pode começar antes desta fase estar completa.

- [ ] T011 Instalar `jest-expo`, `jest`, `@types/jest` e `@testing-library/react-native` como `devDependencies` em `package.json` (`npx expo install jest-expo jest @types/jest @testing-library/react-native "--" --dev`), e adicionar o script `test` (`jest`)
- [ ] T012 Criar `jest.config.js` com `preset: 'jest-expo'` e `setupFilesAfterEnv` apontando para o arquivo de mocks (sem a chave `jest` em `package.json`, para evitar a configuração duplicada)
- [ ] T013 Criar `jest.setup.js` com mock do `@react-native-async-storage/async-storage`, de `expo-secure-store` e de `react-native-reanimated`, para que o teste não dependa de aparelho
- [ ] T014 Mover `SavedVerse` e `SavedStatus` de `src/services/storage/saved-verses.ts` para `src/types/saved-verse.ts`, atualizando os importadores, conforme Princípio III: "Tipos compartilhados vivem em `src/types/` e são a única fonte de verdade para contratos de domínio"
- [ ] T015 Mover `User`, `AuthState` e `AuthScreen` de `src/auth/types/auth.ts` para `src/types/auth.ts` e apagar o diretório `src/auth/types/`, conforme Princípio III
- [ ] T016 Exportar `SAVED_VERSES_STORAGE_KEY` com o valor `@palavra-viva/saved-verses/v1` de `src/services/storage/saved-verses.ts`, para que o teste consiga preparar e limpar o estado
- [ ] T017 Criar `scripts/check-dead-code.mjs`, que falha ao encontrar símbolo exportado sem consumidor e chave de `StyleSheet.create` sem referência
- [ ] T018 Criar `scripts/check-styles.mjs`, que falha ao encontrar literal hexadecimal fora de `src/constants/theme.ts`
- [ ] T019 Acrescentar os scripts `check:dead` e `check:styles` em `package.json` e incluí-los no `verify`

**Checkpoint**: Fundação pronta. O gate está verde, existe suíte de teste, e os tipos de domínio
moram em um lugar só.

---

## Phase 3: User Story 1 - Corrigir os defeitos que corrompem dados ou travam a interface (Priority: P1) ?? MVP

**Goal**: Nenhum versículo decorado se perde, nenhuma tela afirma falsehood ao usuário, e nenhuma
conta trava a interface.

**Independent Test**: Reproduzir os cenários 4.1 a 4.6 de `quickstart.md`. O item salvo continua lá
após reabrir o app; falha de leitura vira estado de erro em vez de lista vazia; conta sem email não
trava Decorados; cadastro sem confirmação de email é comunicado como sucesso; busca curta diz o
motivo.

**Why this is MVP**: é a única história que muda o que o usuário experimenta. As outras quatro são
manutenção, e cada uma delas precisa dos testes que esta fase cria para ser feita com segurança.

### Tests for User Story 1 (escritos primeiro, devem falhar antes da implementação)

- [ ] T020 [P] [US1] Teste de caracterização de `mapVerseResponse` em `__tests__/services/api/verse-mapper.test.ts`, cobrindo `verseEnd` ausente caindo para `verse` e texto sem a chave `pt-br`
- [ ] T021 [P] [US1] Teste de caracterização do ciclo `toSavedVerse` → `persistSavedVerses` → `loadSavedVerses` em `__tests__/services/storage/saved-verses.test.ts`, usando um item gravado pela versão `v1` como fixture
- [ ] T022 [P] [US1] Teste de regressão da escrita otimista em `__tests__/hooks/use-saved-verses.test.tsx`, com `AsyncStorage.setItem` rejeitando: a escrita falha e a lista não exibe o item
- [ ] T023 [P] [US1] Teste de regressão do carregamento em `__tests__/hooks/use-saved-verses.test.tsx`, com `AsyncStorage.getItem` rejeitando: o hook expõe `error` em vez de lista vazia
- [ ] T024 [P] [US1] Teste de regressão de `signUp` em `__tests__/auth/index.test.tsx`: cadastro bem-sucedido sem sessão devolve sucesso, e o estado de erro do contexto não é contaminado

### Implementation for User Story 1

- [ ] T025 [US1] Adicionar em `src/services/storage/saved-verses.ts` a validação de forma de cada item lido, descartando **somente** o item inválido e preservando o restante da lista, com estas restrições: `ref`, `reference`, `bookSlug`, `bookName` e `text` são string não vazia; `chapter` e `verseStart` são inteiro maior ou igual a 1; `verseEnd` é inteiro maior ou igual a `verseStart`; `status` é `'decorando'` ou `'dominado'`; `savedAt` é string em ISO 8601 parseável
- [ ] T026 [US1] Fazer `loadSavedVerses` em `src/services/storage/saved-verses.ts` distinguir os quatro estados de `data-model.md` seção 2.2: nada salvo retorna `[]`; JSON inválido e `AsyncStorage` indisponível lançam erro nomeado em vez de devolver lista vazia
- [ ] T027 [US1] Inverter a ordem de `save` em `src/hooks/use-saved-verses.ts:35-38` para persistir antes de atualizar o estado, com rollback e propagação da falha, para que o que a tela mostra sempre foi gravado
- [ ] T028 [US1] Adicionar tratamento de rejeição ao carregamento inicial em `src/hooks/use-saved-verses.ts:21-33` e expor `error` na API do hook
- [ ] T029 [US1] Consumir o `error` do hook em `src/screens/saved-verses-screen.tsx` ou, enquanto a extração da fase US4 não existir, em `src/app/(tabs)/meus.tsx:92-101`, trocando `EmptyState` por `ErrorState`
- [ ] T030 [US1] Proteger o cálculo da inicial do avatar em `src/app/(tabs)/meus.tsx:63`, onde `user.email[0].toUpperCase()` lança `TypeError` para conta sem email
- [ ] T031 [US1] Fazer `src/auth/services/supabase.ts:6-7` falhar na inicialização com mensagem que nomeie a variável ausente, em vez de chamar `createClient` com string vazia, conforme Technical Constraints: "O cliente Supabase MUST NOT nascer com string vazia por fallback silencioso"
- [ ] T032 [US1] Fazer `signUp` em `src/auth/index.tsx:117-125` devolver a confirmação de e-mail pelo canal de sucesso, sem contaminar o estado de erro do contexto
- [ ] T033 [US1] Trocar a assinatura `(user: any)` de `mapSupabaseUser` em `src/auth/index.tsx:21` pelo tipo `User` declarado pelo `@supabase/supabase-js`, eliminando o único `any` de `src/`
- [ ] T034 [US1] Fazer `submitSearch` em `src/app/(tabs)/index.tsx:25-30` informar o motivo quando a referência tiver menos de três caracteres, em vez de não fazer nada
- [ ] T035 [US1] Passar `npm run verify` e confirmar que T020 a T024 ficaram verdes

**Checkpoint**: US1 é a única história que fecha **perda de dado** e **travamento de tela**. Pode ser
entregue sozinha.

---

## Phase 4: User Story 2 - Remover o código que não serve a ninguém (Priority: P1)

**Goal**: 9 arquivos, 373 linhas, 14 símbolos e 11 dependências fora do caminho de quem vai mexer no
app pelo resto da vida dele.

**Independent Test**: `npm run verify` verde, `npm run check:dead` sem relatório, `npx expo-doctor`
sem erro, e o roteiro de toque 5.1 de `quickstart.md` produzindo o mesmo resultado.

### Implementation for User Story 2

- [ ] T036 [P] [US2] Apagar `src/components/bible/reference-picker.tsx`, `src/hooks/use-books.ts`, `src/hooks/use-chapter.ts`, `src/hooks/use-verse.ts`, `src/hooks/use-verse-of-day.ts`, `src/components/ui/collapsible.tsx`, `src/components/hint-row.tsx`, `src/components/web-badge.tsx` e `src/components/external-link.tsx`
- [ ] T037 [P] [US2] Remover de `src/services/api/bible-api.ts` as funções `getChapter`, `getVerseOfDay`, `getBooks` e `normalizeBookSlug`, e o barrel `bibleApi`, mantendo `getVerse`, `parseReference` e `searchVerse`
- [ ] T038 [P] [US2] Remover `mapChapterResponse`, `mapBooksResponse` e `mapVotdResponse` de `src/services/api/verse-mapper.ts`, mantendo os mappers vivos
- [ ] T039 [P] [US2] Remover `Chapter`, `BibleBook`, `BooksApiResponse` e `VotdApiResponse` de `src/types/bible.ts`, mantendo `ParsedReference`
- [ ] T040 [P] [US2] Remover as chaves `books`, `chapter`, `votd` e a função `todayKey` de `src/query/keys.ts`
- [ ] T041 [P] [US2] Remover `AnimatedIcon` e os três `Keyframe` exclusivos dele de `src/components/animated-icon.tsx:62-111`, mantendo `AnimatedSplashOverlay`
- [ ] T042 [P] [US2] Remover as chaves de estilo `verseCard`, `verseHeader`, `versionPill`, `verseText`, `tags` e `tag` de `src/app/(tabs)/index.tsx:138-143`, que não têm referência no JSX
- [ ] T043 [P] [US2] Remover as props `lightColor` e `darkColor` de `src/components/themed-view.tsx`, declaradas e desestruturadas mas nunca aplicadas nem passadas
- [ ] T044 [P] [US2] Remover as props `saved` e `onToggleSave` e o botão "Decorar" inalcançável de `src/components/bible/verse-card.tsx`, já que o único consumidor passa apenas `reference`, `text` e `onPress`
- [ ] T045 [P] [US2] Remover a prop `initialShowBack` de `src/components/bible/flashcard.tsx`
- [ ] T046 [P] [US2] Remover os tipos `title` e `link` e a diferença entre `link` e `linkPrimary` de `src/components/themed-text.tsx`, nenhum dos quais tem uso em `src/**/*.tsx`
- [ ] T047 [US2] Remover de `package.json` as 9 dependências sem import direto e sem exigência do framework: `@expo/ui`, `expo-auth-session`, `expo-crypto`, `expo-device`, `expo-glass-effect`, `expo-system-ui`, `react-native-gesture-handler`, `react-native-get-random-values` e `expo-web-browser` — **preservando** `expo-constants` e `expo-linking`, exigidos pelo `expo-router`, mais `react-native-safe-area-context` e `react-dom`, que não entram na lista por serem peers do template
- [ ] T048 [US2] Rodar `npx expo-doctor` e o build web depois de T047, restaurando qualquer dependência removida que o build reclame
- [ ] T049 [US2] Remover `expo-web-browser` da lista de `plugins` em `app.json`, já que só `external-link.tsx`, removido em T036, o usava
- [ ] T050 [US2] Remover o script `reset-project` de `package.json` e apagar `scripts/reset-project.js`, que recria o projeto a partir do template do Expo
- [ ] T051 [US2] Rodar `npm run check:dead` e confirmar que não há mais símbolo sem consumidor

**Checkpoint**: US1 e US2 funcionam de forma independente. O código morto sumiu, e nenhuma
dependência do framework foi quebrada.

---

## Phase 5: User Story 3 - Unificar o código duplicado (Priority: P2)

**Goal**: Uma definição por coisa. A folha de estilo duplicada, a lista de abas e a resolução de
tema passam a existir uma vez.

**Independent Test**: `Compare-Object` entre os dois `StyleSheet` das telas de auth retorna vazio
(ou o arquivo não existe mais); trocar a cor primária em um lugar altera login, registro, botão de
salvar e chip; a barra de abas navega nas duas plataformas; a web aplica a variante de hidratação de
tema.

### Implementation for User Story 3

- [ ] T052 [P] [US3] Criar `src/components/ui/auth-screen.tsx` com campo rotulado, ação primária, invólucro de layout e a folha de estilo compartilhados, parametrizado por `mode: 'login' | 'register'`
- [ ] T053 [US3] Reduzir `src/auth/screens/LoginScreen.tsx` ao estado e aos campos exclusivos do login, removendo o `StyleSheet.create` de 74 linhas
- [ ] T054 [US3] Reduzir `src/auth/screens/RegisterScreen.tsx` ao estado e aos campos exclusivos do registro, incluindo confirmação de senha, removendo o `StyleSheet.create` de 74 linhas
- [ ] T055 [US3] Fazer `src/app/(auth)/login.tsx` e `src/app/(auth)/register.tsx` renderizarem `AuthScreen` com o `mode` correspondente, em vez de tela inteira
- [ ] T056 [P] [US3] Criar `src/constants/tabs.ts` declarando nome, rótulo e ícone de cada aba em um único lugar
- [ ] T057 [US3] Fazer `src/components/app-tabs.tsx` consumir `src/constants/tabs.ts` e usar `useTheme()` em vez de resolver o esquema de cor por conta própria
- [ ] T058 [US3] Fazer `src/components/app-tabs.web.tsx` consumir `src/constants/tabs.ts`, corrigir o nome de rota `home` para o que existe em disco e ordenar os imports segundo a regra de T010
- [ ] T059 [P] [US3] Tornar `src/hooks/use-theme.ts` o único caminho de resolução de esquema, expondo também `isDark`
- [ ] T060 [US3] Trocar em `src/app/_layout.tsx:6` o import de `useColorScheme` de `react-native` para `@/hooks/use-color-scheme`, devolvendo à web a variante com hidratação
- [ ] T061 [US3] Passar `npm run verify` e conferir visualmente login e registro nas três plataformas

**Checkpoint**: US1, US2 e US3 funcionam de forma independente. Nenhum arquivo de estilo duplicado
sobra.

---

## Phase 6: User Story 4 - Transformar o código em tokens e regras verificadas (Priority: P2)

**Goal**: A aparência para de estar espalhada em valores literais, e a tela deixa de carregar
estilo e estado de negócio.

**Independent Test**: `npm run check:styles` sem relatório; `grep` por `#` em `src/` não retorna
nada fora de `src/constants/theme.ts`; tema claro e escuro conferidos nas três plataformas; nenhum
`Pressable` dentro de `Pressable`.

**?? BLOQUEADA**: a fase inteira depende da resposta à Pergunta em aberto 1 do `plan.md`. Sem ela,
T062 em diante não pode ser executado, porque trocar literal por token exige saber qual é a cor.

- [ ] T062 [US4] Registrar em `specs/002-refatoracao/plan.md` a resposta à Pergunta em aberto 1: se a cor do produto é `#8C4A27` dos tokens ou `#E46F4D` das telas de conta. **Bloqueia o resto desta fase**
- [ ] T063 [US4] Adicionar em `src/constants/theme.ts` a escala de tipos, a escala de raios e a altura de controle, hoje hardcoded nas telas, e reconciliar a paleta conforme a decisão de T062
- [ ] T064 [US4] Mover o `import '@/global.css'` de `src/constants/theme.ts` para `src/app/_layout.tsx`, porque um arquivo de constante não deve ter efeito colateral na árvore de renderização
- [ ] T065 [P] [US4] Fazer `src/components/themed-text.tsx` ler a escala de tipos de `src/constants/theme.ts` em vez do próprio `StyleSheet.create`
- [ ] T066 [P] [US4] Declarar em `src/global.css` as variáveis de cor e a propriedade `color-scheme`, para que a web tenha a mesma paleta que a nativa
- [ ] T067 [P] [US4] Mover `src/components/themed-text.tsx` e `src/components/themed-view.tsx` para `src/components/ui/`, atualizando os importadores
- [ ] T068 [US4] Extrair o conteúdo e o estado da Home para `src/screens/home-screen.tsx`, sem folha de estilo, conforme a cadeia do Princípio III: `app/` → `screens/`
- [ ] T069 [US4] Extrair o conteúdo e o estado de Decorados para `src/screens/saved-verses-screen.tsx`, sem folha de estilo
- [ ] T070 [US4] Extrair o estilo das duas telas novas para `src/screens/home-screen.styles.ts` e `src/screens/saved-verses-screen.styles.ts`
- [ ] T071 [US4] Reduzir `src/app/(tabs)/index.tsx` e `src/app/(tabs)/meus.tsx` a rotas que delegam, como as rotas de auth
- [ ] T072 [US4] Fazer `src/app/(tabs)/_layout.tsx:14-16` renderizar `LoadingState` da `src/components/bible/bible-states.tsx` enquanto resolve a sessão, em vez de retornar `null`
- [ ] T073 [US4] Usar um asset leve como marca dentro do app em `src/screens/home-screen.tsx`, no lugar de `@/assets/images/icon.png`, que tem 610 KB e é o ícone da aplicação
- [ ] T074 [US4] Trocar os glifos Unicode `♨`, `⌕`, `×` e `⚑` por `TabBarIcon` em `src/screens/home-screen.tsx`, com rótulo acessível em cada alvo
- [ ] T075 [P] [US4] Escrever o teste de toque de `src/components/bible/verse-card.tsx` em `__tests__/components/bible/verse-card.test.tsx`, **antes** de mexer no componente
- [ ] T076 [P] [US4] Escrever o teste de toque de `src/components/bible/flashcard.tsx` em `__tests__/components/bible/flashcard.test.tsx`, **antes** de mexer no componente
- [ ] T077 [US4] Eliminar o `Pressable` aninhado em `src/components/bible/verse-card.tsx`, com um único alvo por gesto, e manter T075 verde
- [ ] T078 [US4] Eliminar o `Pressable` aninhado em `src/components/bible/flashcard.tsx`, com um único alvo por gesto, e manter T076 verde
- [ ] T079 [P] [US4] Trocar por token as ocorrências de literal de cor em `src/components/ui/auth-screen.tsx`, com variante escura onde hoje o valor é fixo
- [ ] T080 [P] [US4] Trocar por token as ocorrências de literal de cor em `src/screens/home-screen.styles.ts`
- [ ] T081 [P] [US4] Trocar por token as ocorrências de literal de cor em `src/screens/saved-verses-screen.styles.ts`
- [ ] T082 [P] [US4] Trocar por token as ocorrências de literal de cor em `src/components/bible/flashcard.tsx`
- [ ] T083 [P] [US4] Trocar por token as ocorrências de literal de cor em `src/components/bible/verse-card.tsx`
- [ ] T084 [P] [US4] Trocar por token as ocorrências de literal de cor em `src/components/animated-icon.tsx`
- [ ] T085 [P] [US4] Trocar por token as ocorrências de literal de cor em `src/components/animated-icon.module.css`
- [ ] T086 [US4] Trocar as rotas por string literal pelo tipo de rota do expo-router em `src/screens/home-screen.tsx`, `src/screens/saved-verses-screen.tsx` e `src/components/ui/auth-screen.tsx`, aproveitando `experiments.typedRoutes` já ativo em `app.json`
- [ ] T087 [US4] Renomear `src/hooks/use-saved-verses.ts` para `src/hooks/use-saved-verses.tsx` e trocar o `createElement` por JSX, já que o módulo exporta componente
- [ ] T088 [US4] Rodar `npm run check:styles` e confirmar zero literal fora de `src/constants/theme.ts`
- [ ] T089 [US4] Conferir visualmente tema claro e escuro nas três plataformas, conforme roteiro 5.2 de `quickstart.md`

**Checkpoint**: Todas as histórias delivered até aqui funcionam de forma independente. A aparência
está em token e a verificação automática cobre isso.

---

## Phase 7: User Story 5 - Unificar o tratamento de erro (Priority: P3)

**Goal**: Uma única política de erro, com mensagem em português e causa técnica preservada. Nenhum
`Alert.alert` sobrevive, porque na web ele não aparece.

**Independent Test**: toda falha de aplicação chega à tela pelo mesmo caminho; `npm test` verde
com um caso por causa; nenhuma ocorrência de `Alert.alert` em `src/`.

### Tests for User Story 5 (escritos primeiro)

- [ ] T090 [P] [US5] Teste de `getAppErrorMessage` cobrindo uma causa por vez em `__tests__/services/api/errors.test.ts`: referência não encontrada com sugestão `didYouMean`, versículo inexistente com status 404, falha de rede sem resposta, e erro sem mapeamento
- [ ] T091 [P] [US5] Teste de renderização de erro em tela em `__tests__/components/ui/auth-screen.test.tsx`, com as mensagens aparecendo sem `Alert`

### Implementation for User Story 5

- [ ] T092 [P] [US5] Criar a união discriminada `AppError` com `kind` em `src/types/app-error.ts`, conforme Princípio III
- [ ] T093 [US5] Criar `src/services/api/errors.ts` com `getAppErrorMessage` e um `kind` por causa, substituindo `src/hooks/use-bible-error.ts`
- [ ] T094 [US5] Remover o interceptor inerte de `src/services/api/axios-client.ts:14-22`, que rejeita nos dois ramos, deixando a normalização em `src/services/api/errors.ts`
- [ ] T095 [US5] Apagar `src/hooks/use-bible-error.ts` e atualizar os importadores de `src/services/api/errors.ts`
- [ ] T096 [P] [US5] Criar `src/components/ui/confirm-dialog.tsx` como substituto de `Alert.alert` para confirmação, com o mesmo texto
- [ ] T097 [US5] Traduzir para português as causas de erro do Supabase em `src/services/api/errors.ts`, hoje repassadas em inglês cru por `src/auth/index.tsx`
- [ ] T098 [US5] Trocar os 4 `Alert.alert` de validação de `src/components/ui/auth-screen.tsx` por mensagem exibida em tela
- [ ] T099 [US5] Trocar o `Alert.alert` de confirmação de saída de `src/screens/saved-verses-screen.tsx` por `src/components/ui/confirm-dialog.tsx`
- [ ] T100 [US5] Confirmar com `Select-String` que não há nenhuma ocorrência de `Alert.alert` em `src/`
- [ ] T101 [US5] Passar `npm run verify` e validar o roteiro 4.7 de `quickstart.md`: erro de validação aparece na web

**Checkpoint**: Todas as cinco histórias funcionam de forma independente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: O que impede a refatoração de voltar a apodrecer.

- [ ] T102 [P] Escrever em `__tests__/hooks/use-saved-verses.test.tsx` os casos de escrita rejeitada, carregamento rejeitado e dado corrompido, completando o que T022 e T023 began
- [ ] T103 [P] Escrever em `__tests__/auth/index.test.tsx` o caso de cadastro que exige confirmação de e-mail, verificando que o estado de erro do contexto permanece limpo
- [ ] T104 [P] Escrever em `__tests__/components/ui/auth-screen.test.tsx` a renderização nos dois modos, `login` e `register`
- [ ] T105 Remover o tipo `AuthScreen` de `src/types/auth.ts`, que é apenas um literal de rota repetido e não mais necessário depois de T052
- [ ] T106 [P] Atualizar `README.md` com os comandos de verificação, a estrutura de pastas e a ordem das ondas
- [ ] T107 [P] Atualizar `DESIGN.md` para apontar `src/constants/theme.ts` como fonte de verdade da paleta
- [ ] T108 [P] Atualizar `AGENTS.md` e `CLAUDE.md` com os comandos de verificação e a regra de literal de cor
- [ ] T109 [P] Remover de `assets/images/` os arquivos que nenhuma referência usa: `react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`, `expo-badge.png`, `expo-badge-white.png`, `tutorial-web.png`, e o diretório `assets/expo.icon/`
- [ ] T110 Acrescentar `ios.bundleIdentifier` em `app.json`, ao lado do `android.package` que já existe
- [ ] T111 Resolver o uso de `@/assets/images/expo-logo.png` em `src/components/animated-icon.tsx:36`: substituir pela marca do produto ou remover a animação de abertura, conforme decisão de produto
- [ ] T112 Validar o roteiro completo de `quickstart.md`, seções 4 a 6
- [ ] T113 Rodar `npm run verify`, `npx expo-doctor` e `git ls-files` para confirmar que nenhum arquivo de ambiente está versionado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependência. Pode começar imediatamente
- **Foundational (Phase 2)**: depende da Phase 1. **BLOQUEIA todas as histórias**
- **User Stories (Phases 3-7)**: todas dependem da Phase 2
- **Polish (Phase 8)**: depende de todas as histórias desejadas

### User Story Dependencies

- **US1 (P1)**: começa após a Foundational. Sem dependência de outra história
- **US2 (P1)**: começa após a Foundational. Sem dependência de outra história
- **US3 (P2)**: começa após US1. Precisa dos testes de T020 a T024 como rede de segurança, e de US2 porque T037 encolhe `src/services/api/bible-api.ts`, que US3 toca em T093
- **US4 (P2)**: começa após US1 e US2. Bloqueada pela decisão de T062, e usa `src/constants/tabs.ts` de US3
- **US5 (P3)**: começa após US3. T098 actua sobre `auth-screen.tsx`, que só existe depois de T052

### Within Each User Story

- Testes são escritos primeiro e devem falhar antes da implementação
- T075 e T076 precedem T077 e T078, nesta ordem, porque a mitigação de risco do `plan.md` exige o
  teste escrito antes da mudança
- O núcleo vem antes da integração com o resto da tela

### Parallel Opportunities

- T003, T004, T008 e T009 em paralelo: arquivos diferentes, nenhuma dependência
- T020, T021, T022, T023 e T024 em paralelo: cinco arquivos de teste distintos
- T036 a T046 em paralelo: onze arquivos distintos
- T052, T056, T059 e T065 a T067 em paralelo
- T079 a T085 em paralelo: sete arquivos distintos
- T090 e T091 em paralelo
- T102, T103, T104, T106, T107, T108 e T109 em paralelo

### Blockers

| Blocker | Afeta | Resolvido por |
|---|---|---|
| `npm run lint` falha hoje | todas as ondas | T002 |
| `.env` versionado bloqueia o merge por Governance | merge | T004 e T005 |
| `useSyncExternalStore` ainda não confirmado contra os docs do Expo 57 | T002 | T002 mesmo; conferir doc antes de commitar |
| Cor do produto indefinida | T063 a T085 | T062 |
| Escolha de `expo-font` e da fonte de exibição | T111 | decisão de produto |

---

## Parallel Example: User Story 1

```powershell
# Lado a lado, cinco arquivos de teste distintos:
Task: "T020 [US1] Teste de caracterização de mapVerseResponse em __tests__/services/api/verse-mapper.test.ts"
Task: "T021 [US1] Teste de caracterização do ciclo de persistência em __tests__/services/storage/saved-verses.test.ts"
Task: "T022 [US1] Teste de regressão da escrita otimista em __tests__/hooks/use-saved-verses.test.tsx"
Task: "T023 [US1] Teste de regressão do carregamento em __tests__/hooks/use-saved-verses.test.tsx"
Task: "T024 [US1] Teste de regressão de signUp em __tests__/auth/index.test.tsx"
```

T022 e T023 estão no mesmo arquivo e não devem ser executados em paralelo um sobre o outro: o
segundo completa o que o primeiro começou.

---

## Parallel Example: User Story 2

```powershell
# Onze arquivos distintos, nenhuma dependência entre eles:
Task: "T036 [US2] Apagar os 9 módulos sem consumidor"
Task: "T037 [US2] Remover getChapter, getVerseOfDay, getBooks, normalizeBookSlug e o barrel de src/services/api/bible-api.ts"
Task: "T038 [US2] Remover os três mappers mortos de src/services/api/verse-mapper.ts"
Task: "T039 [US2] Remover os quatro tipos mortos de src/types/bible.ts"
Task: "T040 [US2] Remover books, chapter, votd e todayKey de src/query/keys.ts"
Task: "T041 [US2] Remover AnimatedIcon de src/components/animated-icon.tsx"
Task: "T042 [US2] Remover as seis chaves de estilo sem uso de src/app/(tabs)/index.tsx"
Task: "T043 [US2] Remover lightColor e darkColor de src/components/themed-view.tsx"
Task: "T044 [US2] Remover saved e onToggleSave de src/components/bible/verse-card.tsx"
Task: "T045 [US2] Remover initialShowBack de src/components/bible/flashcard.tsx"
Task: "T046 [US2] Remover title e link de src/components/themed-text.tsx"

# Depois, em sequência, porque dependem do resultado:
Task: "T047 [US2] Remover as dependências sem uso de package.json"
Task: "T048 [US2] Rodar expo-doctor e o build web"
```

---

## Parallel Example: User Story 3

```powershell
# Dois arquivos novos, em paralelo:
Task: "T052 [US3] Criar src/components/ui/auth-screen.tsx"
Task: "T056 [US3] Criar src/constants/tabs.ts"
Task: "T059 [US3] Tornar src/hooks/use-theme.ts o único caminho de resolução de esquema"

# Depois, as telas de auth, que dependem do componente de T052:
Task: "T053 [US3] Reduzir src/auth/screens/LoginScreen.tsx"
Task: "T054 [US3] Reduzir src/auth/screens/RegisterScreen.tsx"
```

---

## Parallel Example: User Story 4

```powershell
# Depois de T062 decidir a cor:
Task: "T065 [US4] Fazer src/components/themed-text.tsx ler a escala de tipos de src/constants/theme.ts"
Task: "T066 [US4] Declarar as variáveis de cor e color-scheme em src/global.css"
Task: "T067 [US4] Mover themed-text e themed-view para src/components/ui/"

# Extração das telas, em sequência, porque T069 depende de T068:
Task: "T068 [US4] Extrair Home para src/screens/home-screen.tsx"
Task: "T069 [US4] Extrair Decorados para src/screens/saved-verses-screen.tsx"
Task: "T070 [US4] Extrair o estilo das duas telas para src/screens/*.styles.ts"

# Por último, a troca de literal, sete arquivos em paralelo:
Task: "T079 [US4] Trocar literal por token em src/components/ui/auth-screen.tsx"
Task: "T080 [US4] Trocar literal por token em src/screens/home-screen.styles.ts"
Task: "T081 [US4] Trocar literal por token em src/screens/saved-verses-screen.styles.ts"
Task: "T082 [US4] Trocar literal por token em src/components/bible/flashcard.tsx"
Task: "T083 [US4] Trocar literal por token em src/components/bible/verse-card.tsx"
Task: "T084 [US4] Trocar literal por token em src/components/animated-icon.tsx"
Task: "T085 [US4] Trocar literal por token em src/components/animated-icon.module.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar a Phase 1: Setup
2. Completar a Phase 2: Foundational (**BLOQUEANTE**)
3. Completar a Phase 3: User Story 1
4. **PARAR E VALIDAR**: executar os cenários 4.1 a 4.6 de `quickstart.md`
5. Entregar

Esse recorte já vale a pena sozinho: fecha quatro defeitos que perdem dado, um que trava a tela e
um que mente para o usuário, e cria a suíte de teste de que as outras três ondas dependem.

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. US1 → validar → entregar (MVP: zero perda de dado)
3. US2 → validar → entregar (373 linhas fora do caminho)
4. US3 → validar → entregar (uma definição por coisa)
5. US4 → validar → entregar (aparência em token, com gate)
6. US5 → validar → entregar (uma política de erro)
7. Polish → entregar (rede de segurança e documentação)

Cada história entrega valor sem quebrar as anteriores, e cada uma é reversível isoladamente.

### Parallel Team Strategy

Com mais de uma pessoa:

1. A equipe completa Setup + Foundational junto
2. Depois da Foundational:
   - Pessoa A: US1 (não pode ser dividida, é a base de tudo)
   - Depois de US1, Pessoa A: US2 e Pessoa B: US3 em paralelo
   - Depois, US4 e US5
3. US4 é sequencial dentro de si, por causa da extração de telas

### Reverse Order, se o tempo for curto

A ordem inversa também é defensável e vale para quem prefere reduzir risco antes de mudar
comportamento: US2 (remover) → US3 (unificar) → US4 (tokens) → US5 (erro) → US1 (correções).

O que essa ordem não dá é a rede de segurança: sem US1 não existe suíte de teste, e as ondas de
unificação passam a depender só de conferência visual.

---

## Notes

- [P] = arquivos diferentes, sem dependência
- [Story] mapeia a tarefa à história de usuário, para rastreabilidade
- [US1] é a única com dependência interna real: T022 e T023 dividem `__tests__/hooks/use-saved-verses.test.tsx`
- T062 é a única tarefa bloqueante por decisão humana, e trava T063 a T089
- Cada história é completável e testável de forma independente
- Confirmar que os testes falham antes de implementar
- Commitar após cada tarefa ou grupo lógico
- Parar em qualquer checkpoint para validar a história isoladamente
- Evitar: tarefa vaga, conflito de arquivo, dependência entre histórias que quebre a independência
- Se uma tarefa não puder ser executada como está escrita, o `research.md` está desatualizado:
  reexecute a busca de consumidores e corrija a tarefa antes de prosseguir
