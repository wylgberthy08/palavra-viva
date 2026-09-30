# Modelo de Dados: Plano de Refatoração

**Data**: 2026-09-30

**Este plano não altera modelo de dados.** Nenhuma tabela é criada, alterada ou removida. O app é
local-first: não há chamada `.from()`, `.rpc()` ou `Storage` no código, e a única fonte de verdade
do versículo decorado é `AsyncStorage` no aparelho.

O que muda é a **forma** como o dado é lido, validado e Presentation, e o que passa a ser
persistido por testes. É isso que este documento registra.

## 1. Estado atual

### 1.1 Nenhuma entidade no servidor

A única chamada de rede ao Supabase é `supabase.auth.*`, em `src/auth/index.tsx` e
`src/auth/services/supabase.ts`. Não existe banco de dados de aplicação. Consequência: a exclusão
de conta especificada em `001-excluir-conta` não tem dado de aplicação para apagar, só a identidade
do Supabase Auth.

### 1.2 A chave de armazenamento

```
@palavra-viva/saved-verses/v1
```

Declarada em `src/services/storage/saved-verses.ts:20` como `const`, **sem export**. Ela é global
ao aparelho, não por usuário: com autenticação obrigatória em `app/(tabs)/_layout.tsx:10`, duas
contas no mesmo aparelho compartilham a mesma lista. A correção disso é migração de dado e está
fora de escopo, registrada no spec.

O sufixo `/v1` é o único mecanismo de versionamento existente, e não há caminho de migração: nada
no código sabe ler um formato anterior porque só existe um.

## 2. O que muda

### 2.1 A chave passa a ser exportada

`STORAGE_KEY` vira `SAVED_VERSES_STORAGE_KEY`, exportado de `src/services/storage/saved-verses.ts`.

**Motivo**: sem exportação, nenhum teste consegue preparar ou limpar o estado, e a onda 1 não teria
como verificar a correção de D5 e D6. É o caminho mínimo para tornar o módulo testável sem mudar o
formato gravado.

### 2.2 A leitura passa a distinguir quatro estados

Hoje `loadSavedVerses` tem dois resultados possíveis: `[]` e a lista. Quatro situações se confundem:

| Situação | Hoje | Depois |
|---|---|---|
| Nada salvo | `[]` | `[]` |
| JSON inválido | `[]` | erro nomeado, lista preservada |
| Item com campo faltando | entra como válido | item descartado, resto preservado |
| `AsyncStorage` indisponível | rejeição sem tratamento | erro nomeado |

A distinção é o que impede D5 (dado corrompido indistinguível de vazio, e o próximo `persist`
sobrescreve tudo) e D6 (coerção cega deixando item quebrado chegar à renderização).

**Invariante**: um item inválido nunca descarta a lista inteira, e um erro de leitura nunca é
convertido em lista vazia. O usuário que tem 40 versículos salvos e um item corrompido continua com
39, e sabe que houve um problema.

### 2.3 A escrita passa a ser confirmada antes de aparecer

Hoje `use-saved-verses.ts:36-37` executa `setItems(next)` e só depois `await persistSavedVerses(next)`.
A ordem passa a ser:

```
persistir → se falhou, informar e não alterar o estado → se ok, atualizar o estado
```

**Invariante**: o que a tela mostra sempre foi gravado. Perder a atualização otimista custa um leve
atraso de um quadro; manter o estado mentindo custa o versículo do usuário.

### 2.4 O hook passa a expor erro

`useSavedVerses` ganha `error`, e `app/(tabs)/meus.tsx` passa a mostrar `ErrorState` em vez de
`EmptyState` quando ele existe. Hoje a tela afirma "Nenhum versículo decorado ainda" quando o
armazenamento falhou, que é a pior resposta possível para o usuário que sabe que salvou coisas.

## 3. Formato do dado, por campo

O formato **não muda**. `SavedVerse` continua igual, para que os versículos já gravados continuem
válidos. O que muda é que cada campo passa a ser validado na leitura.

| Campo | Tipo | Validação | Observação |
|---|---|---|---|
| `ref` | `string` | não vazio | é a chave de identidade; `VerseCard` e `Flashcard` dependem dele |
| `reference` | `string` | não vazio | é o texto exibido |
| `bookSlug` | `string` | não vazio | — |
| `bookName` | `string` | não vazio | — |
| `chapter` | `number` | inteiro ≥ 1 | — |
| `verseStart` | `number` | inteiro ≥ 1 | — |
| `verseEnd` | `number` | inteiro ≥ `verseStart` | `mapVerseResponse` usa `d.verseEnd ?? d.verse`, então o intervalo nunca nasce invertido |
| `text` | `string` | não vazio | é o conteúdo decorado |
| `status` | `'decorando' \| 'dominado'` | um dos dois | `useSavedVerses.updateStatus` só produz esses dois |
| `savedAt` | `string` | ISO 8601 parseável | gravado por `new Date().toISOString()` |

A validação é um guarda explícita, sem dependência nova. Um objeto que não satisfaz a tabela é
descartado com o restante da lista preservado, e o fato é registrado para diagnóstico.

## 4. O que é removido do domínio

Com a onda 2, `src/types/bible.ts` passa de 10 para 6 tipos. Os quatro que saem existem só para o
código morto:

| Tipo removido | Quem usava | Passa a ser |
|---|---|---|
| `Chapter` | `use-chapter.ts` | nada |
| `BibleBook` | `use-books.ts` | nada |
| `BooksApiResponse` | `getBooks` | nada |
| `VotdApiResponse` | `getVerseOfDay` | nada |

E saem junto `mapChapterResponse`, `mapBooksResponse` e `mapVotdResponse` de
`src/services/api/verse-mapper.ts`, mais `books`, `chapter` e `votd` de `src/query/keys.ts`.

`ParsedReference` **sobrevive**: é o retorno de `parseReference`, que está no caminho vivo
`searchVerse → parseReference → getVerse`.

## 5. O que é adicionado

Nenhum tipo de domínio. O plano adiciona três artefatos que não são dados:

| Artefato | Onda | Papel |
|---|---|---|
| `AppError`, união discriminada com `kind` | 3 | substitui `unknown` acima da fronteira de sistema |
| `constants/tabs.ts` | 3 | lista de abas, uma vez |
| `AppError` de ambiente ausente | 1 | falha na inicialização nomeando a variável |

## 6. O que a onda 4 mexe, e o que não mexe

`constants/theme.ts` ganha tokens de tipografia, raio e altura de controle, e a paleta é
reorganizada para resolver a colisão entre `#8C4A27` e `#E46F4D`. Isso é dado de **apresentação**,
persistido em nenhum lugar: trocar a cor de um botão não toca o que está em `AsyncStorage`.

Os 30 literais de cor saem de 8 arquivos. Nenhuma migração, porque nenhum valor de cor está
gravado.

## 7. Verificação por onda

| Onda | O que se verifica sobre dado |
|---|---|
| 0 | `git ls-files` não lista `.env`; `git status` mostra `.env` como não rastreado |
| 1 | teste do ciclo `persist` → `load`; teste de escrita rejeitada; teste de JSON inválido; teste de item com campo faltando; teste de `signUp` bem-sucedido sem sessão |
| 2 | nenhum teste quebrado ao remover tipo; `npx tsc --noEmit` verde |
| 3 | teste de `AuthScreen` nos dois modos; teste de `getAppErrorMessage` por causa |
| 4 | nenhum valor persistido muda; conferência visual dos dois temas |
| 5 | `npm test -- --coverage` verde sobre mapeamento, persistência e sessão |
