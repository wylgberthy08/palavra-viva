# Data Model: Excluir Conta

Fase 1. Este feature **não cria nenhuma tabela, coluna, índice ou migração**. O projeto não tem
nenhuma tabela de aplicação no Supabase hoje, e a exclusão de conta não introduz uma.

O que existe está descrito aqui para deixar explícito o que a exclusão alcança e o que ela não
toca.

## Entidades existentes

### Conta do usuário

| Atributo | Tipo | Origem | Notas |
|---|---|---|---|
| `id` | `uuid` | `auth.users.id`, claim `sub` do JWT | Identificador canônico. É dele que a Edge Function deriva o alvo. |
| `email` | `text` | `auth.users.email` | Exibido na tela de conta. |
| `full_name` | `text` | `auth.users.raw_user_meta_data ->> 'full_name'` | written no signup (`auth/index.tsx:108`). `raw_user_meta_data` é editável pelo usuário, então serve para exibição, nunca para autorização. |
| `created_at` / `updated_at` | `timestamptz` | `auth.users` | Mapeados para `createdAt` / `updatedAt` em `src/auth/types/auth.ts`. |

Sem tabela espelho em `public`. Se um dia existir, a coluna de id **precisa** ser
`references auth.users (id) on delete cascade` — é o que a plataforma exige e o que faz a
exclusão do usuário levar junto o dado de aplicação, sem passo manual.

### Sessão

| Atributo | Tipo | Onde vive |
|---|---|---|
| access token | JWT | memória do cliente + `expo-secure-store` (native) / `localStorage` (web) |
| refresh token | opaco | mesma chave |
| `user` | `User` | dentro da sessão persistida |

Chave gerada pela biblioteca (`sb-*-auth-token`). Nenhuma ação deste feature escreve aqui
diretamente: quem apaga é `supabase.auth.signOut()`, através do adaptador de
`src/auth/services/supabase.ts:9-30`.

### Versículo decorado (`SavedVerse`)

Entidade **local**. Não tem contraparte no servidor.

| Campo | Tipo | Regra |
|---|---|---|
| `ref` | `string` | Chave de identidade, formato `livro/capitulo/versiculo` (ex.: `joao/3/16`). Produzido por `slugifyRef` em `services/api/verse-mapper.ts:17-19`. Único por item; usado como `keyExtractor` do `FlatList` em `meus.tsx:97`. |
| `reference` | `string` | Texto exibido, ex.: `"João 3:16"`. Derivado da API. |
| `bookSlug` / `bookName` | `string` | Slug normalizado e nome localizado. |
| `chapter` | `number` | ≥ 1. Vem da busca; validado ≥ 3 caracteres na busca (`index.tsx:25-30`), mas o valor numérico em si não tem validação. |
| `verseStart` | `number` | ≥ 1. |
| `verseEnd` | `number` | ≥ `verseStart`. Hoje o texto do intervalo **não** é unido: `getVerse` devolve só `verseStart` (`bible-api.ts:30-48`). |
| `text` | `string` | Conteúdo do versículo, já formatado por `mapVerseResponse`. |
| `status` | `'decorando' \| 'dominado'` | Começa em `'decorando'`. Alternável em `meus.tsx:114-122`. |
| `savedAt` | `string` (ISO 8601) | `new Date().toISOString()` em `toSavedVerse`. |

Sem escopo por usuário. A chave `@palavra-viva/saved-verses/v1` é global no dispositivo.

**Contrato de leitura** (`loadSavedVerses`): devolve `[]` quando não há dado, quando o JSON não
parseia, ou quando o valor parseado não é array. Não há validação de schema — o `parsed as
SavedVerse[]` em `saved-verses.ts:43` é um cast cego. Um array com objetos de forma errada passa
direto. Isso **não** muda nesta feature, mas é relevante: a exclusão apaga a chave inteira, então
o caso "coleção corrompida" termina resolvido por remoção, não por leitura.

## Estados da exclusão (novo)

### `ResultadoExclusao`

União discriminada, fonte única em `src/account/types/account.ts`. O serviço devolve sempre um
deste quatro; nunca lança, nunca devolve `null`.

```text
type ResultadoExclusao =
  | { status: 'sucesso' }
  | { status: 'falha_de_rede' }
  | { status: 'falha_de_autorizacao' }
  | { status: 'usuario_com_objetos_no_storage' }
```

| Estado | Quando | Efeito no dispositivo | Mensagem ao usuário |
|---|---|---|---|
| `sucesso` | Edge Function retornou 2xx | sessão encerrada, coleção apagada, cache limpo | navegação para login pelo guard |
| `falha_de_rede` | função indisponível, timeout, erro de transporte | **nada é alterado** | "Não conseguimos excluir sua conta. Verifique sua conexão e tente de novo." |
| `falha_de_autorizacao` | 401/403, ou claims sem `sub` utilizável | **nada é alterado** | "Sua sessão expirou. Entre novamente para excluir a conta." |
| `usuario_com_objetos_no_storage` | Supabase recusa por o usuário ser dono de objetos no Storage | **nada é alterado** | orientando a remover os arquivos antes de repetir |

A distinção entre os quatro não é decorativa: é o que garante a SC-004. Nos três casos de falha, a
conta continua ativa e a coleção continua intacta. No único caso de sucesso, ambos foram removidos.

### Transições de estado da tela

```text
ocioso ──(toque em "Excluir conta")──> confirmando
confirmando ──(cancelar)──────────> ocioso            [nenhuma chamada de rede]
confirmando ──(confirmar)──────────> excluindo
excluindo ──(sucesso)─────────────> concluido         [sessão + dados + cache limpos]
excluindo ──(falha)───────────────> ocioso            [erro exibido, dados intactos]
```

`excluindo` bloqueia "Sair" e "Excluir conta" (FR-010): duas operações concorrentes de sessão não
podem ocorrer. `confirmando` bloqueia os botões da tela por baixo do diálogo para impedir
abrir dois diálogos.

## O que a exclusão alcança

| Alvo | Como | Reversível |
|---|---|---|
| Linha em `auth.users` | `auth.admin.deleteUser(id)` na Edge Function, `shouldSoftDelete: false` | Não |
| Sessões e refresh tokens | cascade de `auth.users` | Não |
| `auth.identities` | cascade de `auth.users` | Não |
| Objetos no Supabase Storage | Recusado pela plataforma. A função detecta e devolve `usuario_com_objetos_no_storage`. | — |
| Versículos decorados (AsyncStorage) | `clearSavedVerses()` no app | Não |
| Credencial de sessão (SecureStore / localStorage) | `supabase.auth.signOut()` | Não |
| Cache do TanStack Query | `queryClient.clear()` | Não |
| Cache HTTP do Bible API | Não é limpo | — |

A última linha é intencional e não é defeito: o conteúdo de `api.midvash.com` é público,
imutável por definição (`staleTime: Infinity` em `use-search-verse.ts:20`). Não pertence ao
usuário, logo não tem por que sair.

## O que a exclusão **não** alcança

- **Logout em outros dispositivos.** A exclusão derruba a sessão onde foi pedida. Em outro
  aparelho, o `SIGNED_OUT` de `onAuthStateChange` não dispara porque aquele token continua válido
  até o `exp`. Como não existe dado de usuário no servidor, não há vazamento — mas a sessão
  naquele aparelho não é encerrada ativamente. Ver R-003.
- **Cache de service worker / HTTP no navegador.** A chave de versículos no `localStorage` é
  removida; o que o navegador tiver guardado por conta própria está fora do alcance do app.
- **Dados de Keychain que sobrevivem à desinstalação no iOS.** Comportamento documentado do
  sistema, ver R-012 e backlog.
- **Histórico do repositório git.** O `.env` versionado e qualquer valor de ambiente em commits
  passados não é removido por esta feature. Ver backlog.
