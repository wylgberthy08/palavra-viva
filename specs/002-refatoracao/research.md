# Pesquisa: Plano de Refatoração

**Data**: 2026-09-30

Esta pesquisa registra o que foi apurado por leitura do código, por busca de consumidores e por
execução dos comandos de verificação. Ela existe para que as decisões do plano não dependam de
memória, e para que a próxima pessoa possa conferir cada afirmação.

## 1. Baseline verificado

Comandos executados na raiz do repositório, sem alteração de código:

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | código de saída 0 |
| `npm run lint` | **código de saída 1**, 1 erro |
| `npm test` | não existe |
| `git ls-files` | lista `.env` e `.env.example` |
| `git branch --show-current` | `main` |

O erro de lint é `react-hooks/set-state-in-effect` em `src/hooks/use-color-scheme.web.ts:11`. É o
padrão de hidratação do template do Expo: `setHasHydrated(true)` dentro de `useEffect`. O
`eslint-config-expo` do SDK 57 traz as regras de React 19.2, e esse padrão agora é erro.

**Consequência para o plano**: a constituição exige gate verde, e o gate não está verde hoje. A
primeira onda tem de consertar isso antes de qualquer outra coisa, senão não existe linha de base
para provar que uma refatoração não quebrou nada.

## 2. Inventário de `src/`

47 arquivos, 2757 linhas. Os dez maiores:

| Arquivo | Linhas | Papel |
|---|---|---|
| `auth/screens/RegisterScreen.tsx` | 252 | tela |
| `app/(tabs)/meus.tsx` | 223 | rota que faz de tela |
| `auth/screens/LoginScreen.tsx` | 203 | tela |
| `components/bible/reference-picker.tsx` | 141 | **sem consumidor** |
| `components/animated-icon.tsx` | 148 | parcialmente morto |
| `app/(tabs)/index.tsx` | 147 | rota que faz de tela |
| `auth/index.tsx` | 160 | contexto de sessão |
| `components/bible/flashcard.tsx` | 159 | componente |
| `services/api/bible-api.ts` | 105 | em boa parte morto |
| `components/app-tabs.web.tsx` | 94 | variante web |

## 3. Código morto, verificado por busca de `import`

### 3.1 Módulos sem nenhum importador

| Arquivo | Linhas | Único importador |
|---|---|---|
| `components/bible/reference-picker.tsx` | 141 | nenhum |
| `components/ui/collapsible.tsx` | 60 | nenhum |
| `components/web-badge.tsx` | 38 | nenhum |
| `components/hint-row.tsx` | 30 | nenhum |
| `hooks/use-verse.ts` | 27 | nenhum |
| `components/external-link.tsx` | 23 | nenhum |
| `hooks/use-chapter.ts` | 21 | nenhum |
| `hooks/use-verse-of-day.ts` | 12 | nenhum |

Total: 8 arquivos, 352 linhas.

### 3.2 Módulo que só o código morto usa

`hooks/use-books.ts` (21 linhas) é importado apenas por `reference-picker.tsx`. Some junto.

### 3.3 O que morre dentro de módulos vivos

| Símbolo | Local | Evidência |
|---|---|---|
| `AnimatedIcon` e 3 `Keyframe` | `animated-icon.tsx:62-111` | só `AnimatedSplashOverlay` é importado, em `_layout.tsx:8` |
| `bibleApi` (objeto barrel) | `bible-api.ts:98-105` | 1 ocorrência no repositório: a própria definição |
| `verseCard`, `verseHeader`, `versionPill`, `verseText`, `tags`, `tag` | `app/(tabs)/index.tsx:138-143` | 6 chaves de `StyleSheet` sem referência no JSX |
| `lightColor`, `darkColor` | `themed-view.tsx:8,9,15` | declaradas, desestruturadas, nunca aplicadas nem passadas |
| `onToggleSave`, `saved` | `verse-card.tsx` | o único consumidor (`meus.tsx:106-110`) passa `reference`, `text`, `onPress` |
| `initialShowBack` | `flashcard.tsx` | 3 ocorrências: interface, desestruturação, uso interno |
| `type="title"`, `type="link"` | `themed-text.tsx` | 0 ocorrências em `src/**/*.tsx` |

O botão "Decorar" do `verse-card` e o `initialShowBack` do flashcard são, portanto, código que
**nunca pode ser renderizado**.

### 3.4 O que morre dentro de `bible-api.ts`

Sobrando só `searchVerse` → `parseReference` → `getVerse`, o resto perde o último consumidor:

| Função | Consumida por | Situação |
|---|---|---|
| `getVerse` | `use-verse.ts` (morto) e `searchVerse` | viva |
| `parseReference` | `searchVerse` | viva |
| `getChapter` | `use-chapter.ts` (morto) | morre |
| `getVerseOfDay` | `use-verse-of-day.ts` (morto) | morre |
| `getBooks` | `use-books.ts` (morto) | morre |
| `normalizeBookSlug` | `use-chapter.ts`, `use-verse.ts` (mortos) | morre |
| `bibleApi` | ninguém | morre |

E com elas, em `types/bible.ts`, `Chapter`, `BibleBook`, `BooksApiResponse`, `VotdApiResponse`, e em
`verse-mapper.ts`, `mapChapterResponse`, `mapBooksResponse`, `mapVotdResponse`.

### 3.5 Dependências sem import direto

11 dependências declaradas não são importadas por nenhum arquivo de `src/`:

`@expo/ui`, `expo-auth-session`, `expo-constants`, `expo-crypto`, `expo-device`, `expo-font`,
`expo-glass-effect`, `expo-linking`, `expo-system-ui`, `react-native-gesture-handler`,
`react-native-get-random-values`.

Duas ressalvas mudam o plano:

- `expo-web-browser` e `expo-symbols` **parecem** usados, mas só por `external-link.tsx` e
  `collapsible.tsx`, ambos mortos. `expo-web-browser` também está em `app.json` na lista de
  plugins.
- `expo-constants`, `expo-linking`, `react-native-safe-area-context` e `react-dom` não são
  importados, mas são exigidos pelo `expo-router` e pelo build web. **Não remover sem
  `expo-doctor`.**

`react-native-gesture-handler` está declarado e não está em `app.json` nem usado; exige
`<GestureHandlerRootView>` para funcionar, e o `_layout.tsx` não tem nenhum. É sinal de resíduo de
template.

## 4. Defeitos de correção, com arquivo e linha

| # | Defeito | Local | Efeito |
|---|---|---|---|
| D1 | `createClient` recebe `''` quando as variáveis faltam | `auth/services/supabase.ts:6-7` | a biblioteca lança em tempo de import, com mensagem que não nomeia a variável ausente |
| D2 | Sucesso de `signUp` é devolvido pelo canal de erro | `auth/index.tsx:123-125` | conta criada é comunicada ao usuário como falha, e o estado global de erro é contaminado |
| D3 | `setItems` antes de `await persistSavedVerses` | `hooks/use-saved-verses.ts:36-37` | item aparece salvo, some ao reabrir; rejeição não tratada |
| D4 | `loadSavedVerses` sem `catch` | `hooks/use-saved-verses.ts:23-29` | promessa rejeitada sem tratamento; o `finally` ainda apaga o loading |
| D5 | `JSON.parse` inválido vira lista vazia | `services/storage/saved-verses.ts:44-46` | dado corrompido é indistinguível de "não há salvos", e o próximo `persist` sobrescreve tudo |
| D6 | `parsed as SavedVerse[]` | `services/storage/saved-verses.ts:43` | item com campo faltando entra como se fosse válido e quebra a lista em tempo de render |
| D7 | `user.email[0].toUpperCase()` | `app/(tabs)/meus.tsx:63` | conta sem email lança `TypeError` e trava a tela de Decorados |
| D8 | Falha de carga vira `EmptyState` | `app/(tabs)/meus.tsx:92-101` | o hook não expõe erro, então a tela afirma "Nenhum versículo decorado ainda" quando o armazenamento falhou |
| D9 | `Alert.alert` como validação e confirmação | `LoginScreen.tsx:36,43`; `RegisterScreen.tsx:41-62`; `meus.tsx:32-35` | `react-native-web` não implementa `Alert`: 6 avisos somem na web, com `output: "static"` |
| D10 | Busca com menos de 3 caracteres não faz nada | `app/(tabs)/index.tsx:25-30` | toque na lupa sem efeito e sem mensagem |
| D11 | Interceptor que rejeita nos dois ramos | `services/api/axios-client.ts:14-22` | indirection sem efeito; a normalização de erro está espalhada por `use-bible-error.ts` |
| D12 | Cor com valor fixo em tema escuro | `app/(tabs)/index.tsx:131,138,144` (`#362F2A`, `#6F3312`) | sombra invisível e botão de salvar marrom nos dois temas |
| D13 | Lint vermelho | `hooks/use-color-scheme.web.ts:11` | gate de constituição não passa |

## 5. Duplicação medida

### 5.1 Login e Register

`Compare-Object` sobre os dois blocos de `StyleSheet.create` (linhas 130-203 e 179-252) retorna
**idêntico**: 74 linhas em cada arquivo, 148 duplicadas. O que resta de diferente entre as telas são
os campos e a ação.

### 5.2 Resolução de tema em três lugares

| Local | Código |
|---|---|
| `hooks/use-theme.ts:9-11` | `scheme === 'unspecified' ? 'light' : scheme` |
| `app/_layout.tsx:15-16` | `isDark ? 'dark' : 'light'`, lendo `useColorScheme` do `react-native` |
| `components/app-tabs.tsx:8-9` | idêntico ao anterior |

`app/_layout.tsx:6` importa `useColorScheme` do `react-native` em vez de `@/hooks/use-color-scheme`.
Na web isso **contorna** a variante com hidratação de `use-color-scheme.web.ts` e quebra a
renderização estática que `output: "static"` exige.

### 5.3 Lista de abas em dois lugares

`app-tabs.tsx` declara `name="index"` e `name="meus"`. `app-tabs.web.tsx` declara
`name="home"` com `href="/"` e `name="meus"` com `href="/meus"`. A rota `home` não existe em disco;
o arquivo é `index.tsx`. A lista (nome, rótulo, ícone) está duplicada e divergente.

### 5.4 Cor

30 ocorrências de literal hexadecimal fora de `constants/theme.ts`, em 8 arquivos, 13 valores
distintos. Cinco deles já têm token e ainda assim estão escritos inline; os outros oito não têm
token correspondente:

| Valor | Ocorrências | Onde | Observação |
|---|---|---|---|
| `#E46F4D` | 5 | `meus.tsx`, `flashcard.tsx` | terracota, a cor real do produto |
| `#E5DDD0` | 4 | `LoginScreen`, `RegisterScreen` | borda de campo |
| `#6F3312` | 2 | `index.tsx` | botão de salvar |
| `#208AEF` | 1 | `animated-icon.tsx` | azul do template do Expo |
| `#3c9ffe`, `#0274df` | 2 | `animated-icon.tsx` | gradiente do ícone morto |
| `#F2C14E` | 1 | `flashcard.tsx` | dourado |
| `#FFDBCB` | 1 | `index.tsx` | — |

Os cinco restantes (`#8C4A27`, `#362F2A`, `#F8ECE4`, `#53433C`, `#FFFFFF`) **têm** token e estão
escritos inline mesmo assim.

Resultado: três paletas convivem — a dos tokens (marrom/creme), a terracota das telas de conta e o
dourado do flashcard. Nenhuma tela de conta tem variante escura: `#8C4A27` e `#E5DDD0` são
escritos direto no `StyleSheet`, então o botão de login é o mesmo nos dois temas.

### 5.5 Tipografia

`components/themed-text.tsx` define uma escala (48, 32, 16, 14, 12) dentro do próprio
`StyleSheet.create`, não em `theme.ts`. As telas usam `fontFamily: 'serif'` (`index.tsx:126`) e
`fontFamily: 'Merriweather'` (`LoginScreen.tsx:145`, `RegisterScreen.tsx:194`) — a segunda nunca é
carregada, porque `expo-font` não é usado em lugar nenhum do projeto. Não há token de raio
(`borderRadius: 9999`, `999`, `18`), nem de altura de controle (`minHeight: 52`, `minHeight: 58`).

## 6. Estrutura de pastas

- Nomes de arquivo: `use-saved-verses.ts`, `verse-card.tsx`, `reference-picker.tsx`,
  `LoginScreen.tsx`, `RegisterScreen.tsx`, `AuthScreen` (tipo). Duas convenções, três categorias de
  coisa.
- `auth/` tem `screens/` e `types/`. `components/` não tem pasta por domínio: `ui/`, `bible/` e
  componentes soltos na raiz, com `themed-view` e `themed-text` fora de `ui/`.
- `use-saved-verses.ts` (extensão `.ts`) exporta um componente React e usa `createElement` em vez
  de JSX, só porque não pode ser `.tsx`.
- `types/bible.ts` mistura tipo de domínio (`Verse`) e shape cru da API (`VerseApiResponse`), o que é
  deliberado e está bem feito, mas o arquivo concentra 10 tipos dos quais 4 morrem na onda 2.
- `services/storage/saved-verses.ts` declara `STORAGE_KEY` sem exportar: nenhum teste consegue
  limpar o estado, e não há caminho para migração de esquema.

## 7. Configuração e ambiente

- `.gitignore` **já foi corrigido** (`.env` adicionado, alteração não commitada), mas `.env`
  continua no índice. O valor da chave anônima do Supabase é público por definição — o risco real
  não é vazar segredo, é versionar a configuração de um projeto específico e não ter separação por
  ambiente. A regra da constituição é explícita, e `git rm --cached .env` é o passo que falta.
- `.env` tem duas chaves: `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `.env.example` documenta **login social com Google**, que não tem implementação: não existe
  `signInWithOAuth`, `expo-auth-session` não é importado, e o exemplo cita redirect URI
  `exp://.../--/auth-callback` que o app não registra.
- `.env.example` **não lista `EXPO_PUBLIC_BIBLE_BASE_URL`**, que `config/bible.ts:10` lê, com
  fallback fixo para `https://api.midvash.com`. Quem monta o ambiente a partir do exemplo não
  consegue apontar para outro servidor.
- `app.json` tem `experiments.typedRoutes: true`, e as rotas são chamadas por string em
  `LoginScreen.tsx:30,114`, `RegisterScreen.tsx:32` e `app-tabs.web.tsx`.
- `app.json` tem `experiments.reactCompiler: true`. Nenhuma mudança pode depender de mutação
  durante a renderização.
- `ios.bundleIdentifier` ausente, `android.package` presente.
- `eslint.config.js` só carrega `eslint-config-expo` e ignora `dist/*`. Não há regra para literal de
  cor, `import/order` não está habilitada (e `app-tabs.web.tsx:14-16` tem import relativo no meio
  dos `@/`), e `.expo/` e `coverage/` não estão ignorados.
- `scripts/reset-project.js` é do template e está ligado a `npm run reset-project`.

## 8. Decisões tomadas na pesquisa

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Nenhuma pasta nova de domínio; a unificação acontece em `components/ui/` e `constants/` | criar `features/bible/...` | a constituição é unidirecional e o app tem uma feature; mais pasta seria estrutura sem ganho |
| Remover os hooks e o seletor de referência em vez de conectá-los | ligar `reference-picker` à Home | a Home não tem busca por livro, o `vitext` não está instalado, e o design não tem essa entrada. Conectar é funcionalidade nova |
| Um `AuthScreen` com `mode` para login e registro | dois componentes com estilo compartilhado | a diferença real são os campos e a ação; o `mode` elimina a duplicação sem criar uma máquina de estados |
| Lista de abas em `constants/tabs.ts`, consumida pelas duas variantes | keepalive com `Tabs.Screen` compartilhado | a API do `expo-router` para abas não é a mesma na web (`expo-router/ui`); o denominador comum é a lista, não o componente |
| Erro de aplicação como união discriminada, não classe | manter `unknown` e funções `instanceof` | a fronteira de sistema é o único lugar que conhece Axios e Supabase; acima dela, um tipo com `kind` é mais simples de testar |
| Um validador pequeno e explícito, sem dependência | `zod` | uma dependência para validar quatro campos de formulário e um array de versículos é desproporcional |
| Testes com `jest-expo` e `@testing-library/react-native` | só verificação manual | a constituição exige teste automatizado quando o risco é alto; perda de dado é alto. `jest-expo` é o preset oficial do Expo |
| Remoção de dependência por `expo-doctor`, não por busca de import | confiar na busca de import | quatro dependências são exigidas pelo framework sem import direto |

## 9. Riscos da execução

| Risco | Mitigação |
|---|---|
| Remover dependência que o framework exige | `npx expo-doctor` antes e depois de cada remoção, e build web a cada removê-lo |
| Trocar literal por token alterar o visual sem querer | a conferência visual das três plataformas entra no checklist de cada onda que toca cor |
| Regressão de toque ao eliminar `Pressable` aninhado | teste automatizado de toque em `verse-card` e `flashcard` antes de mexer |
| Duas cores de marca em conflito (`#8C4A27` × `#E46F4D`) | escolher o token antes de migrar; é decisão de design, registrada como pergunta em aberto |
| A onda de testes reescrever código de produção para ser testável | a ordem é teste de caracterização primeiro, correção depois; o teste fixa o comportamento observável, não a forma interna |
| Ondas grandes demais para reverter | cada onda é uma sequência de commits independentes com gate verde, conforme SC-010 |
