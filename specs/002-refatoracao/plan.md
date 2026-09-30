# Plano de Implementação: Plano de Refatoração

**Branch**: `002-refatoracao` | **Spec**: [spec.md](./spec.md) | **Data**: 2026-09-30

**Constituição**: `.specify/memory/constitution.md` v1.1.0

## Resumo

Refatorar o app sem mudar o que o usuário experimenta. Treze defeitos corrigidos, 9 arquivos e
373 linhas removidos, 148 linhas duplicadas unificadas, 32 literais de cor trocados por token, e
testes automatizados onde hoje não existe nenhum. Executado em cinco ondas, cada uma reversível e
com gate verde ao fim.

O plano não cria nenhuma tela, nenhum endpoint e nenhuma regra de negócio nova.

## Por que não há contratos

Nenhuma fronteira externa muda. A API da Bíblia continua a mesma, o provedor de autenticação
continua o mesmo, o formato gravado em `AsyncStorage` continua o mesmo, e a lista de rotas do
expo-router continua a mesma. As interfaces internas que mudam — assinatura de `loadSavedVerses`,
assinatura de `mapVerseResponse`, `useSavedVerses` ganhando `error` — são detalhe de implementação
entre arquivos do mesmo repositório, descritas em `data-model.md` e nos passos do plano.

Contrato externo só seria necessário se o plano adicionasse endpoint, mudasse o schema do
armazenamento ou tocasse o schema do Supabase. Nenhum dos três acontece.

## Restrições do Constitution Check

Antes de desenhar as ondas, o gate da constituição foi avaliado contra o código real. O resultado
determina a ordem: **o gate de verificação está vermelho hoje**, o que impede qualquer onda de ser
provada como não-regressão.

| Princípio | Estado atual | Onda que resolve |
|---|---|---|
| I. Simplicidade e YAGNI | **violado** — 9 arquivos sem consumidor, `getVerseOfDay` com um palpite de formato futuro, `AnimatedIcon` e `initialShowBack` impossíveis de renderizar | 2 |
| II. Responsabilidade única | **violado** — `meus.tsx` (223) e `index.tsx` (147) são rota, tela, estado e estilo; `auth/index.tsx` mapeia, assina e assina estado | 3, 5 |
| III. Dependências unidirecionais | **parcial** — `services/` e `constants/` não importam de `components/`, mas `components/` tem `bible/` e `ui/` sem hierarquia, e `theme.ts` importa CSS | 4 |
| IV. TypeScript estrito | **parcial** — `strict: true` e zero `@ts-ignore`, mas 1 `any` e 7 coerções sem validação | 1, 3 |
| V. Mudanças pequenas, sem misturar | **ok** — respeitado por este plano, que separa correção de estrutura | todas |
| VI. Código morto proibido | **violado** — 373 linhas e 14 símbolos | 2 |
| VII. Segredos fora do Git | **violado** — `.env` versionado, exemplo incompleto e desatualizado | 1 |
| VIII. Testes ou verificação registrada | **violado** — nenhuma suíte, nenhum script de teste | 1 |
| IX. Dependências com propósito | **violado** — 11 sem import direto, 2 das quais são resíduo do template | 2 |
| X. Nomenclatura consistente | **violado** — `kebab-case.tsx` e `PascalCase.tsx` convivem; tipos espalhados | 5 |

Complexidade adicionada por este plano: **nenhuma estrutura nova**. As ondas criam três arquivos
(`constants/tabs.ts`, `components/ui/auth-screen.tsx`, `components/ui/confirm-dialog.tsx`) e um tipo
(`AppError`). Tudo o mais é remoção, movimento de símbolo existente ou substituição de literal por
token.

## Estrutura do projeto

```
src/
├── app/                    # rotas do expo-router: só layout e delegação
│   ├── _layout.tsx
│   ├── (auth)/login.tsx    # 2 linhas: delega para AuthScreen
│   ├── (auth)/register.tsx # 2 linhas: delega para AuthScreen
│   └── (tabs)/
│       ├── _layout.tsx     # redireciona; usa LoadingState
│       ├── index.tsx       # HomeScreen, sem estilo
│       └── meus.tsx        # MeusScreen, sem estilo
├── auth/                   # sessão: índice, telas, serviço, tipos
├── components/
│   ├── ui/                 # themed-text, themed-view, auth-screen, confirm-dialog
│   ├── bible/              # verse-card, flashcard, bible-states
│   ├── app-tabs.tsx(.web)  # layout de abas, lista vinda de constants/tabs
│   └── animated-icon.tsx(.web)  # só a animação de abertura
├── constants/              # theme.ts (tokens), tabs.ts (lista de abas)
├── hooks/                  # use-theme, use-saved-verses, use-search-verse, use-bible-error
├── query/                  # client, keys
├── services/               # api (axios, bible-api, verse-mapper), storage
└── types/                  # bible.ts (domínio e shape de API)
```

## Ondas

Cada onda é uma sequência de commits independentes. O gate (`npx tsc --noEmit` e `npm run lint`)
precisa passar ao fim de cada uma, e `npm test` a partir da onda 1.

### Onda 0 — Gate verde e ambiente

**Objetivo**: sem linha de base, nenhuma onda seguinte é demonstrável.

| Passo | Arquivo | O que muda |
|---|---|---|
| 0.1 | `src/hooks/use-color-scheme.web.ts` | Trocar o padrão de hidratação por `useSyncExternalStore`, que é o que o React 19 indica para "valor que só existe no cliente" e satisfaz `react-hooks/set-state-in-effect` sem desabilitar regra |
| 0.2 | `.gitignore` | Manter `.env` e acrescentar `!.env.example` |
| 0.3 | — | `git rm --cached .env`, para tirar o arquivo do índice sem apagar o disco |
| 0.4 | `.env.example` | Listar `EXPO_PUBLIC_BIBLE_BASE_URL`; remover a seção de login social com Google, que não existe no código |
| 0.5 | `.gitignore` | Ignorar `.expo/`, `coverage/`, `dist/` |
| 0.6 | `package.json` | Script `typecheck`, e `verify` que encadeia `typecheck`, `lint` e `test` |
| 0.7 | `eslint.config.js` | Ignorar artefatos; ativar `import/order` com o alias `@/` como interno |

**Verificação**: `npm run verify` passa; `git ls-files` não lista `.env`; `git status` mostra `.env`
apenas como não rastreado.

**Riscos**: baixo. 0.1 muda a forma de detectar hidratação na web, então a onda termina com build
web e conferir a troca de tema.

### Onda 1 — Caracterização e correções de dados

**Objetivo**: o comportamento atual ganha teste antes de ser tocado, e os defeitos que perdem dado
são corrigidos. É a onda que sustenta a garantia de não-regressão das ondas 3 e 4.

| Passo | Arquivo | O que muda |
|---|---|---|
| 1.1 | `package.json` | `jest-expo`, `@testing-library/react-native`, `react-test-renderer`; script `test` |
| 1.2 | `jest.config.js` | Preset `jest-expo`, `setupFilesAfterEach` com mock de `expo-secure-store` e do `AsyncStorage` |
| 1.3 | `__tests__/verse-mapper.test.ts` | Caracterização de `mapVerseResponse` e `mapParseResponse`, incluindo `verseEnd` ausente e texto de `pickPtBr` sem `pt-br` |
| 1.4 | `__tests__/saved-verses.test.ts` | Caracterização do ciclo `toSavedVerse` → `persist` → `load`, com o item gravado pela versão `v1` como fixture |
| 1.5 | `src/services/storage/saved-verses.ts` | Exportar `SAVED_VERSES_STORAGE_KEY`; substituir o `catch` que devolve `[]` por erro nomeado, para que dado corrompido não seja indistinguível de dado ausente; validar a forma de cada item com um validador explícito, descartando só o item inválido |
| 1.6 | `src/hooks/use-saved-verses.ts` | Persistir antes de atualizar o estado, com rollback e estado de erro; `catch` na carga inicial; expor `error` |
| 1.7 | `src/app/(tabs)/meus.tsx` | Usar o `error` do hook e mostrar `ErrorState`; proteger o cálculo da inicial do avatar |
| 1.8 | `src/auth/services/supabase.ts` | Falhar na inicialização com mensagem que nomeie a variável ausente, em vez de `createClient('', '')` |
| 1.9 | `src/auth/index.tsx` | `signUp` deixa de devolver sucesso pelo canal de erro; `mapSupabaseUser` recebe `User` do Supabase em vez de `any` |
| 1.10 | `src/app/(tabs)/index.tsx` | Busca com menos de três caracteres informa o motivo |
| 1.11 | `__tests__/` | Testes de regressão para 1.5 a 1.10 |

**Verificação**: `npm test` verde; sem `any` em `src/`; o cenário do `quickstart.md` 2.1 a 2.4 passa.

**Por que primeiro**: D3, D4, D5 e D6 são perda de dado silenciosa, e D2 é o defeito que mais
cansa o usuário — ele cria a conta e recebe um erro. Corrigir antes de mover qualquer arquivo
economiza retrabalho.

### Onda 2 — Remover o que ninguém usa

**Objetivo**: 373 linhas, 14 símbolos e 9 dependências fora do caminho de quem vai mexer no app
pelo resto da vida dele.

| Passo | Arquivo | O que muda |
|---|---|---|
| 2.1 | `src/hooks/use-saved-verses.ts` | Exportar `SAVED_VERSES_STORAGE_KEY` do serviço, não daqui (move junto de 1.5) |
| 2.2 | — | Apagar `reference-picker.tsx`, `use-books.ts`, `use-chapter.ts`, `use-verse.ts`, `use-verse-of-day.ts`, `collapsible.tsx`, `hint-row.tsx`, `web-badge.tsx`, `external-link.tsx` |
| 2.3 | `src/services/api/bible-api.ts` | Remover `getChapter`, `getVerseOfDay`, `getBooks`, `normalizeBookSlug` e o barrel `bibleApi` |
| 2.4 | `src/services/api/verse-mapper.ts` | Remover `mapChapterResponse`, `mapBooksResponse`, `mapVotdResponse`; validar a forma do payload em `mapVerseResponse` |
| 2.5 | `src/types/bible.ts` | Remover `Chapter`, `BibleBook`, `BooksApiResponse`, `VotdApiResponse` |
| 2.6 | `src/query/keys.ts` | Remover `books`, `chapter`, `votd` e `todayKey` |
| 2.7 | `src/components/animated-icon.tsx` | Remover `AnimatedIcon` e os três `Keyframe` exclusive dele |
| 2.8 | `src/app/(tabs)/index.tsx` | Remover as seis chaves de estilo sem uso: `verseCard`, `verseHeader`, `versionPill`, `verseText`, `tags`, `tag` |
| 2.9 | `src/components/themed-view.tsx` | Remover `lightColor` e `darkColor` |
| 2.10 | `src/components/bible/verse-card.tsx` | Remover `saved` e `onToggleSave` e o botão "Decorar" inalcançável |
| 2.11 | `src/components/bible/flashcard.tsx` | Remover `initialShowBack` |
| 2.12 | `src/components/themed-text.tsx` | Remover `title`, `link` e a diferença entre `link` e `linkPrimary` |
| 2.13 | `package.json`, `app.json` | Remover as 11 dependências sem import, **menos** as 4 exigidas pelo framework; tirar `expo-web-browser` da lista de plugins |
| 2.14 | `package.json` | Remover o script `reset-project` e apagar `scripts/reset-project.js` |
| 2.15 | `scripts/check-dead-code.mjs` | Verificação de símbolo exportado sem consumidor e de estilo não referenciado |
| 2.16 | `package.json` | `verify` passa a rodar 2.15 |

**Verificação**: `npm run verify` verde; `npx expo-doctor` sem erro; `git diff --stat` mostra 9
arquivos apagados; build web passa, que é a verificação mais sensível à lista de dependências.

**Por que antes da unificação**: 2.3 e 2.4 mudam o formato de `bible-api.ts` e `verse-mapper.ts`, que
a onda 3 toca. Remover primeiro evita mexer no mesmo arquivo duas vezes por motivos diferentes.

**Pergunta aberta**: `expo-glass-effect` e `@expo/ui` podem ser removidos com segurança, mas
`expo-crypto` e `expo-device` podem ser dependência transitiva do fluxo de OAuth que o produto
ainda não implementou. A resposta sai de `npx expo-doctor` e de um build das três plataformas, não
da leitura do `package.json`.

### Onda 3 — Unificar o que está duplicado

**Objetivo**: uma definição por coisa. Esta é a onda que faz a manutenção custar menos para sempre,
e a que mais precisa da onda 1 para ser segura.

| Passo | Arquivo | O que muda |
|---|---|---|
| 3.1 | `src/components/ui/auth-screen.tsx` | Novo: campo rotulado, ação primária, layout e folha de estilo compartilhados por login e registro |
| 3.2 | `src/auth/screens/LoginScreen.tsx` | Reduzir a variações de estado e o formulário; estilo sai daqui |
| 3.3 | `src/auth/screens/RegisterScreen.tsx` | Idem, com os campos que só o registro tem |
| 3.4 | `src/app/(auth)/login.tsx`, `register.tsx` | Passar `mode` em vez de renderizar tela inteira |
| 3.5 | `src/constants/tabs.ts` | Novo: nome, rótulo e ícone de cada aba, em um lugar |
| 3.6 | `src/components/app-tabs.tsx` | Consumir a lista; usar `useTheme()` em vez de resolver o esquema de cor |
| 3.7 | `src/components/app-tabs.web.tsx` | Consumir a lista; corrigir `home` para o nome de rota real; ordenar imports |
| 3.8 | `src/hooks/use-theme.ts` | Ser o único caminho de resolução de esquema, e expor `isDark` |
| 3.9 | `src/app/_layout.tsx` | Importar `useColorScheme` de `@/hooks/use-color-scheme`, o que devolve a variante web à cena |
| 3.10 | `src/hooks/use-bible-error.ts` | Virar `services/api/errors.ts`, com união discriminada e uma mensagem por causa |
| 3.11 | `src/services/api/axios-client.ts` | Remover o interceptor inerte; a normalização acontece em `errors.ts` |
| 3.12 | `src/components/ui/confirm-dialog.tsx` | Novo: substituto de `Alert.alert` para confirmação, com o mesmo texto |
| 3.13 | `src/auth/screens/*.tsx`, `src/app/(tabs)/meus.tsx` | Trocar os 6 `Alert.alert` por mensagem em tela e por `confirm-dialog` |
| 3.14 | `src/services/api/errors.ts` | Traduzir as causas do Supabase, hoje em inglês cru |

**Verificação**: `Compare-Object` entre os dois `StyleSheet` de auth retorna vazio ou o arquivo não
existe; `npm run verify` verde; conferência visual de login e registro nas três plataformas; na web,
os erros de validação aparecem (hoje não aparecem).

**Por que depois da onda 2**: 3.10 reescreve `bible-api.ts`, que a onda 2 já encolheu. E 3.13 muda
comportamento visível na web, o que exige os testes da onda 1 como rede.

### Onda 4 — Tokens, tema e estrutura de tela

**Objetivo**: a aparência para de estar espalhada em valores literais e a tela deixa de carregar
estilo e estado de negócio.

| Passo | Arquivo | O que muda |
|---|---|---|
| 4.1 | `src/constants/theme.ts` | Adicionar escala de tipos, raios e altura de controle, hoje hardcoded; resolver a colisão entre a paleta dos tokens e a terracota `#E46F4D` |
| 4.2 | `src/constants/theme.ts` | Mover `import '@/global.css'` para `_layout.tsx`, porque um arquivo de constante não deveria ter efeito colateral |
| 4.3 | `src/components/themed-text.tsx` | Ler a escala de tipos de `theme.ts` em vez do próprio `StyleSheet` |
| 4.4 | `src/global.css` | Declarar as variáveis de cor e `color-scheme`, para a web ter a mesma paleta |
| 4.5 | 9 arquivos com literal | Trocar as 32 ocorrências por token, com variante escura onde o valor hoje é fixo |
| 4.6 | `src/components/ui/` | Mover `themed-text.tsx` e `themed-view.tsx`, que estão fora da pasta de UI |
| 4.7 | `src/screens/home-screen.tsx` | Novo: conteúdo e estado da Home, sem estilo |
| 4.8 | `src/screens/saved-verses-screen.tsx` | Novo: conteúdo e estado de Decorados, sem estilo |
| 4.9 | `src/screens/*.styles.ts` | Estilo das duas telas, em um lugar |
| 4.10 | `src/app/(tabs)/index.tsx`, `meus.tsx` | Virar rota que delega, como as de auth |
| 4.11 | `src/app/(tabs)/_layout.tsx` | Mostrar `LoadingState` enquanto resolve a sessão, em vez de `null` |
| 4.12 | `src/app/(tabs)/index.tsx` | Ícone de marca próprio, em vez do `icon.png` de 610 KB |
| 4.13 | `src/app/(tabs)/index.tsx` | Trocar `♨`, `⌕`, `×` e `⚑` por `TabBarIcon`, com rótulo acessível |
| 4.14 | `src/components/bible/verse-card.tsx`, `flashcard.tsx` | Eliminar `Pressable` aninhado, com teste de toque antes |
| 4.15 | `src/app/`, `src/auth/screens/*.tsx` | Rotas por tipo, sem string literal |
| 4.16 | `src/hooks/use-saved-verses.ts` | Renomear para `.tsx`, já que exporta componente, e usar JSX |
| 4.17 | `scripts/check-styles.mjs` | Verificação de literal de cor fora de `constants/theme.ts` |

**Verificação**: `npm run verify` verde; a verificação de estilo não reporta nada; conferência
visual de tema claro e escuro nas três plataformas; `grep` por `#` em `src/` não retorna nada fora
de `theme.ts`; tab bar sem `Pressable` dentro de `Pressable`.

**Pergunta aberta**: 4.1 precisa de uma decisão de design. Os tokens dizem `#8C4A27` e as telas de
conta e o flashcard dizem `#E46F4D` e `#F2C14E`. Migrar tudo para a terracota troca a cor do botão de
login; migrar tudo para o marrom troca o chip de filtro e o botão do flashcard. A onda para até
alguém escolher.

### Onda 5 — Rede de segurança e limpeza

**Objetivo**: o que impede a refatoração de voltar a apodrecer.

| Passo | Arquivo | O que muda |
|---|---|---|
| 5.1 | `__tests__/` | Teste de `useSavedVerses` com escrita rejeitada, carregamento rejeitado e dado corrompido |
| 5.2 | `__tests__/` | Teste de `AuthProvider`: `signUp` bem-sucedido sem sessão devolve sucesso, e o estado de erro não é contaminado |
| 5.3 | `__tests__/` | Teste de `getAppErrorMessage` por causa |
| 5.4 | `__tests__/` | Teste de toque de `verse-card` e `flashcard` |
| 5.5 | `__tests__/` | Teste de `AuthScreen` nos dois modos, com erro exibido em tela |
| 5.6 | `src/types/auth.ts` | Remover `AuthScreen`, que é só um literal de rota repetido |
| 5.7 | `README.md` | Comandos de verificação, estrutura de pastas e a ordem das ondas |
| 5.8 | `DESIGN.md` | Apontar para `constants/theme.ts` como fonte de verdade |
| 5.9 | `AGENTS.md`, `CLAUDE.md` | Registrar os comandos de verificação e a regra de literal de cor |
| 5.10 | `assets/` | Remover `react-logo*`, `expo-badge*`, `tutorial-web.png` e `expo.icon/`, que ninguém referencia |
| 5.11 | `app.json` | Adicionar `ios.bundleIdentifier` |
| 5.12 | `assets/images/expo-logo.png` | Substituir pela marca do produto, ou remover a animação de abertura |

**Verificação**: `npm run verify` verde; `npm test -- --coverage` sem limiar de falha; nenhum
arquivo em `assets/` sem referência em `app.json` ou em `src/`.

## Estratégia de verificação

Um único comando decide se o repositório está saudável:

```
npm run verify     # typecheck && lint && test
```

| Nível | Comando | Cobre |
|---|---|---|
| Tipo | `npx tsc --noEmit` | `strict: true`, sem `@ts-ignore` |
| Estilo | `npm run lint` | regras de `eslint-config-expo`, inclusive as de React 19.2 |
| Código morto | `npm run check:dead` | símbolo exportado sem consumidor, estilo não referenciado |
| Paleta | `npm run check:styles` | literal de cor fora de `constants/theme.ts` |
| Dependências | `npx expo-doctor` | versão, plugin e integridade do manifesto |
| Comportamento | `npm test` | mapeamento, persistência, sessão, erro, toque |

A conferência visual continua necessária, porque contraste e hierarquia não são verificáveis por
gate. Ela entra no checklist de qualquer onda que toque cor ou layout, nas três plataformas e nos
dois temas.

## Fora de escopo

Registrados no spec, não corrigidos aqui, porque mudam comportamento ou exigem decisão de produto:

- versículos salvos não são segmentados por usuário;
- o versículo do dia existe e nunca é exibido;
- "5 dias" é um número fixo na Home;
- a fonte de exibição do design não é carregada;
- `maxContentWidth` de 800px não tem alvo declarado;
- a exclusão de conta de `001-excluir-conta`, que entra depois desta base estar limpa.

## Riscos

| Risco | Onda | Mitigação |
|---|---|---|
| Remover dependência que o framework exige | 2 | `npx expo-doctor` e build das três plataformas antes e depois de cada remoção |
| Trocar literal por token mudar o visual sem querer | 4 | conferência visual dos dois temas nas três plataformas, e a pergunta aberta de 4.1 resolvida antes |
| Regressão de toque ao eliminar `Pressable` aninhado | 4 | teste de toque de 5.4 escrito antes de 4.14 |
| Unificar login e registro mudar a validação | 3 | teste de `AuthScreen` de 5.5 cobrindo os dois modos |
| Onda grande demais para reverter | todas | gate verde e commits independentes por passo, conforme SC-010 |

## Perguntas em aberto

1. **Qual é a cor do produto**: `#8C4A27` dos tokens ou `#E46F4D` das telas? A onda 4 não começa
   sem isso.
2. **A fonte de exibição do design entra agora?** Carregar `Merriweather` com `expo-font` é uma
   decisão de produto que também decide se `expo-font` sai do manifesto.
3. **O versículo do dia é uma feature a ser implementada ou código a ser removido?** Hoje a chave
   de cache e o hook existem e nenhuma tela os usa.
4. **Conta sem email precisa existir?** O defeito D7 é corrigido com inicial fallback. Se a resposta
   for que email é obrigatório, a validação do registro é que muda.

## Checklist de constitution pós-plano

- [ ] Princípio I: nenhum `getVerseOfDay` especulativo, nenhum componente impossível de renderizar
- [ ] Princípio II: rota não carrega estilo nem estado de negócio
- [ ] Princípio III: `constants/` sem efeito colateral, `components/ui/` com hierarquia
- [ ] Princípio IV: zero `any`, zero coerção sem validação, `strict` verde
- [ ] Princípio V: cada onda é um commit, sem mistura de correção e estrutura
- [ ] Princípio VI: `npm run check:dead` verde
- [ ] Princípio VII: `git ls-files` sem `.env`, exemplo completo
- [ ] Princípio VIII: `npm test` verde com cobertura de mapeamento, persistência e sessão
- [ ] Princípio IX: `npx expo-doctor` sem dependência sobrando
- [ ] Princípio X: uma convenção de nome, tipos em um lugar por categoria
