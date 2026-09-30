# Research: Excluir Conta

Fase 0. Toda decisão abaixo tem um "porquê" e as alternativas rejeitadas. Nenhum
`NEEDS CLARIFICATION` permanece aberto.

## R-001. Como remover a linha em `auth.users` a partir de um app cliente

**Decisão**: Edge Function `delete-account`, implantada com `verify_jwt = true` (default). O
cliente chama `supabase.functions.invoke('delete-account')` com o token da sessão. A função
valida o JWT, deriva o id do usuário da claim `sub` e chama `auth.admin.deleteUser(id)` com um
cliente criado a partir da `service_role` do ambiente.

**Rationale**: a documentação de gerenciamento de usuário da plataforma é explícita: para
remover o acesso à conta, use `auth.admin.deleteUser()`, que **exige `service_role`**. E
`GoTrueAdminApi` documenta: *"This function should only be called on a server. Never expose your
`service_role` key in the browser."* Um app Expo empacota o JavaScript no binário; qualquer chave
embutida é recuperável por quem descompactar o app. Não existe caminho cliente seguro.

**Alternativas avaliadas**:

| Alternativa | Por que rejeitada |
|---|---|
| `service_role` no cliente, chamada direta a `auth.admin.deleteUser()` | Publica a chave mais poderosa do projeto dentro do app. Qualquer pessoa decompila e tem controle total do banco. Inaceitável. |
| `supabase.auth.updateUser({ data: { deleted: true } })` | A documentação descarta isso explicitamente: marcar a conta como deletada só em tabelas próprias deixa a linha em `auth.users` intacta, e o usuário continua autenticando e renovando token. |
| Banimento temporário (`ban_duration`) | A documentação descarta: só bloqueia login pela duração e **não** revoga sessões existentes. |
| Edge Function sem `verify_jwt`, validando o token à mão | Recurso redundante. `verify_jwt = true` já faz a validação na plataforma antes do handler, e `withSupabase({ auth: 'user' })` entrega as claims já verificadas. Desligar a verificação transferiria para o app a responsabilidade de rejeitar token inválido, exatamente o tipo de erro que constitution Princípio V proíbe. |
| Função com `verify_jwt = false` para permitir `OPTIONS` de preflight | O runtime da plataforma trata CORS do invocador. Preflight manual só adiciona superfície de erro. |

## R-002. `deleteUser` com `shouldSoftDelete`?

**Decisão**: `shouldSoftDelete = false` (o default), removendo a linha fisicamente.

**Rationale**: o JSDoc do `GoTrueAdminApi` define soft delete como *"allows user identification
from the hashed user ID but is not reversible"*. A pessoa pediu **excluir conta**, e a FR-002
declara a ação como permanente. Soft delete preserva um identificador derivado do id, o que é
justamente o oposto do que se promete na tela de confirmação.

**Alternativa avaliada**: soft delete com reversão por janela de carência. Rejeitada porque a
decisão de produto é exclusão imediata, e uma reversão exigiria estado adicional (marcação de
"pendente de exclusão", prazo, tela de recuperação) que a especificação não pede. Se a decisão de
produto mudar, é alteração de escopo, não ajuste de parâmetro.

## R-003. A janela do JWT já emitido

**Decisão**: aceitar a janela e fechar a sessão no cliente imediatamente após o sucesso.

**Rationale**: a documentação é precisa sobre o limite: apagar o usuário **não** invalida
retroativamente um access token já emitido. JWT é stateless; o token continua válido até o `exp`.
As duas saídas oferecidas pela plataforma são (a) manter o expiry curto e (b) validar `session_id`
contra `auth.sessions` em operações sensíveis.

O app não tem dado de usuário no servidor: não existe tabela, não existe Storage, não existe
endpoint autenticado que devolva algo sobre a pessoa. E há uma segunda medida já em vigor: o
cliente faz `supabase.auth.signOut()`, que descarta o token do dispositivo. A conta não consegue
renovar token porque a linha em `auth.users` sumiu. Documentado aqui porque a afirmação correta,
para quem ler o código depois, é "a sessão morre imediatamente no dispositivo; um token vazado
fora do dispositivo sobrevive até o `exp`".

**Alternativa avaliada**: validar `session_id` contra `auth.sessions`. Seria trabalho real sem
benefício: não há operação sensível para proteger, porque não há dado de usuário servidor.

## R-004. Propriedades da exclusão

**Decisão**: hard delete, cascade em `auth.sessions`, revogação de refresh tokens.

**Rationale**: com `shouldSoftDelete: false`, a remoção da linha em `auth.users` cascateia para
`auth.sessions` e invalida os refresh tokens, então a conta não consegue mais emitir novos access
tokens. É exatamente o objetivo declarado.

## R-005. O usuário é dono de objetos no Supabase Storage

**Decisão**: tratar como resultado de primeira classe, `usuario_com_objetos_no_storage`, com
mensagem própria. Não é um 500 genérico.

**Rationale**: a documentação adverte: *"You cannot delete a user if they are the owner of any
objects in Supabase Storage. You will encounter an error when you try to delete an Auth user that
owns any Storage objects."* O projeto não usa Storage hoje, então isso **não** é o caminho
esperado. Mas um erro conhecido merece uma mensagem que diga o que fazer, e não um
`{ error: string }` que o usuário não consegue agir. A constitution Princípio V exige erro
traduzido para a fronteira de UI com o erro técnico preservado.

## R-006. Por que a confirmação não é `Alert.alert`

**Decisão**: componente `ConfirmDeleteAccount` próprio, compartilhado pelas três plataformas.

**Rationale**: `meus.tsx` já usa `Alert.alert` com dois botões para a ação de **sair**. Para
excluir conta, o mesmo mecanismo é insuficiente: `Alert` do React Native no Web não oferece
controle confiável de dois botões, e a ação é irreversível. A constitution Princípio VI proíbe
dependência implícita de plataforma, e a FR-014 exige comportamento idêntico nas três.
A saída simples de "tirar" é continuar usando `Alert` e aceitar que a web degrade — o que é
exatamente a divergência implícita que a constituição proíbe.

**Alternativas avaliadas**:

| Alternativa | Por que rejeitada |
|---|---|
| `Alert.alert` com `style: 'destructive'` | Já é o padrão de `meus.tsx:31-36` e tem o problema de plataforma. Além disso, `destructive` é semântica de iOS; no Android muda a cor do botão e na web não dá o mesmo controle. |
| Tela de confirmação separada (rota) | Exige transição de tela para uma decisão binária, e cria uma rota a mais para um diálogo. Mais navegação para menos clareza. |
| Modal genérico reutilizável | Seria uma abstração com um segundo consumidor ainda não existente. Constitution Princípio I: abstrações antecipadas são removidas, não mantidas. |

## R-007. Onde a ação mora

**Decisão**: nova rota `/(tabs)/conta`, com `AccountScreen` em `src/account/screens/`, espelhando a
estrutura de `src/auth/`. O avatar em `meus.tsx` passa a navegar para lá, em vez de disparar
saída.

**Rationale**: o layout de tabs em `src/components/app-tabs.tsx:26-39` tem duas abas e
`app-tabs.web.tsx:28` diverge do nome do trigger (`index` no native, `home` na web). Adicionar
uma **aba** para a conta significaria tocar nos dois arquivos e replicar a divergência de nome já
existente. Uma rota alcançável pelo avatar evita isso e resolve um problema de UX real: hoje o
avatar executa "sair da conta" sem afordância visível, o que é a razão de a Story 2 existir.

**Alternativas avaliadas**:

| Alternativa | Por que rejeitada |
|---|---|
| Terceira aba "Conta" | Exige editar `app-tabs.tsx` **e** `app-tabs.web.tsx`, mantendo a divergência de nome. E a conta não é um destino de uso frequente; competes com "Início" e "Decorados" na barra inferior. |
| Seção no fim de `meus.tsx` | `meus.tsx` já tem 223 linhas com lista, filtros, flashcard inline, troca de status, remoção e saída. A constitution Princípio II exige que a tela tenha uma razão para mudar; misturar gestão de conta com listagem viola isso. |

## R-008. Ordem das operações de limpeza

**Decisão**: (1) invocar a Edge Function; (2) **só se** o servidor confirmar, apagar os versículos
locais; (3) `supabase.auth.signOut()`; (4) `queryClient.clear()`; (5) navegar para login.

**Rationale**: a ordem é ditada pelo fato de que a limpeza local é irreversível. Se o servidor
recusar, apagar os versículos antes deixaria a pessoa com a conta ativa e o histórico perdido — o
estado inconsistente que a SC-004 proíbe. A navegação não precisa ser explícita: o guard em
`src/app/(tabs)/_layout.tsx:10-14` já redireciona quando `user` vira `null`, e é ele que mantém a
tela de conta coerente sem a tela saber sobre rotas. O plano não adiciona navegação manual.

`queryClient.clear()` é adicionado porque até aqui só existem chaves de Bible, que são imutáveis e
inocentes. A limpeza é barata e remove uma classe inteira de vazamento de cache entre sessões,
que vai existir no primeiro dado por usuário.

**Alternativa avaliada**: `signOut()` antes da chamada à Edge Function. Rejeitada — sem sessão não
há JWT para autorizar a chamada.

## R-009. Onde mora o serviço de rede

**Decisão**: `src/auth/services/account-deletion.ts`, não `src/services/`.

**Rationale**: constitution Princípio III fixa a cadeia
`app/` → `screens/` → `hooks/` → `services/` → `types/`. O serviço de exclusão precisa do cliente
Supabase, que já vive em `src/auth/services/supabase.ts`. Se ele fosse para `src/services/`, então
`src/services/` passaria a importar de `src/auth/`, invertendo a direção. A alternativa seria
promover o cliente Supabase para `src/services/`, o que é uma mudança de dependência de todo o
módulo de auth e claramente fora do escopo de uma feature de exclusão de conta.

**Alternativa avaliada**: criar `src/services/supabase/` e mover o cliente para lá, com
`src/auth/` reexportando. Rejeitada por violar a constitution Princípio VI (mudança pequena): ela
toca todos os pontos de auth sem servir à feature.

## R-010. Contrato de retorno: união discriminada

**Decisão**: `ResultadoExclusao` com quatro casos — `sucesso`, `falha_de_rede`,
`falha_de_autorizacao`, `usuario_com_objetos_no_storage`. O serviço nunca lança para a tela.

**Rationale**: constitution Princípio V exige os três estados async e erro explícito, com o erro
técnico preservado para diagnóstico. Uma união discriminada torna o caminho de erro explícito no
tipo: a tela é obrigada a tratar os quatro, o compilador cobra. Um `{ error: string | null }` — o
padrão que `signIn` e `signUp` já usam — permite `null` ambiguo e é o que fez `signUp` reportar
sucesso pelo canal de erro (`auth/index.tsx:123-125`).

**Alternativas avaliadas**:

| Alternativa | Por que rejeitada |
|---|---|
| `Promise<{ error: string \| null }>` (padrão atual) | Reusa o padrão existente, mas a ambiguidade `null` é exatamente a origem do bug de `signUp`. Um novo código não deve copiar o defeito. |
| Exceções | A tela precisaria de `try/catch` e o erro escaparia da fronteira de serviço, contra o Princípio V. |
| `boolean` | Perde o motivo; a SC-004 exige que o estado seja distinguível entre "falhou e a conta está intacta" e outros casos. |

## R-011. Infraestrutura de testes

**Decisão**: criar `jest-expo` + `@testing-library/react-native`, adicionar `test` e `typecheck`
ao `package.json`, `jest.config.js` e `__tests__/setup.ts` com mock de `expo-secure-store` e
`@react-native-async-storage/async-storage`.

**Rationale**: o Quality Gate da constituição exige cobertura automatizada para comportamento
novo. O repositório não tem runner, config, script, nem CI. O comportamento em questão é
destrutivo e irreversível — exclusão de conta com perda de dados do usuário. É o pior lugar para
descobrir que não há rede de proteção.

**Rationale para o escopo do teste**: o serviço de exclusão e a tela de conta são testados com
`supabase` e os hooks mockados. O que **não** é testado: a Edge Function, porque testá-la exige
rodar o runtime Deno. A validação dela é manual, pelo roteiro do `quickstart.md`.

**Alternativa avaliada**: deixar os testes para depois. Rejeitada — a primeira feature a seguir
o gate é exatamente a que constrói a infraestrutura. Adiar é adiar indefinidamente.

## R-012. Limpeza do armazenamento do dispositivo

**Decisão**: `clearSavedVerses()` em `src/services/storage/saved-verses.ts`, chamando
`AsyncStorage.removeItem(STORAGE_KEY)`. A sessão é encerrada por `supabase.auth.signOut()`, que
atravessa o adaptador de storage e apaga a chave da biblioteca.

**Rationale**: a chave de versículos é do app, logo o app a apaga. A chave de sessão é da
biblioteca, logo a biblioteca a apaga via `signOut`. Nenhuma das duas exige inventar um
`SecureStore.clearValue` e listar chaves.

A SC-003 fala em "zero chaves de versículos e zero credenciais". Verificar com o `signOut` é
suficiente para a credencial: o adaptador custom em `auth/services/supabase.ts:9-30` delega
`removeItem` para `SecureStore.deleteItemAsync` (native) e `localStorage.removeItem` (web), e é
exatamente o que o `signOut` chama.

**Nota de plataforma**: no iOS, dados do Keychain **persistem** através de desinstalação e
reinstalação com o mesmo bundle ID. Isso é comportamento documentado do iOS Keychain, não bug.
A consequência é que `saved-verses` (AsyncStorage, não Keychain) some com a desinstalação, mas
a sessão em SecureStore pode sobrar. Um usuário que desinstalou e reinstalou pode voltar
autenticado. Isso é pré-existente e vale uma decisão de produto separada; está registrado abaixo
como item de backlog, não corrigido aqui.

## R-013. Backup aplicado à env do cliente

**Decisão**: `src/auth/services/supabase.ts` passa a falhar de forma explícita quando
`EXPO_PUBLIC_SUPABASE_URL` ou `EXPO_PUBLIC_SUPABASE_ANON_KEY` estão ausentes, em vez de criar o
cliente com string vazia (comportamento atual, linhas 6-7).

**Rationale**: FR-012 e constitution Princípio V. Com string vazia, `createClient` não lança: o
cliente nasce quebrado e a falha aparece depois, como um erro de rede que o usuário lê como
"conexão falhou". Falhar no arranque com mensagem clara é o comportamento correto.

**Por que está nesta feature**: a exclusão de conta é a primeira operação que depende de uma
chamada autenticada ao servidor. Uma env ausente transformaria a exclusão em um erro de rede
confuso, dentro de um fluxo destrutivo. O conserto é uma mudança de 4 linhas, na mesma fronteira
de sistema que a feature já toca. Registrado como escopo adicional consciente.

## Itens de backlog (fora do escopo, registrados para não se perderem)

1. **`.env` versionado no git.** `git ls-files` lista `.env`, e `.gitignore:34` cobre apenas
   `.env*.local`. A URL e a anon key do Supabase estão no histórico. A anon key é destinada a ser
   pública, mas o padrão é errado e precisa de: adicionar `.env` ao `.gitignore`,
   `git rm --cached .env`, e rotação das chaves. Fora do escopo: é mudança de infraestrutura, não
   de app.
2. **Persistência da sessão no iOS através de reinstalação.** Ver R-012. Exige decisão de produto
   (aceitar ou não) e, se for para resolver, um identificador de instalação.
3. **Espaço de nomes por usuário para `@palavra-viva/saved-verses/v1`.** Hoje a coleção é global
   no dispositivo: duas contas no mesmo aparelho compartilham a mesma lista, e `signOut` não
   limpa nada. A exclusão de conta **limpa** essa lista (FR-007), o que é o comportamento correto
   para quem exclui, mas deixa o problema original intacto para quem apenas sai.
4. **`signUp` reportando sucesso pelo canal de erro** (`auth/index.tsx:123-125`): a tela de
   registro mostra um `Alert` com título "Erro ao criar conta" para um caso de sucesso.
5. **Vazio do `(tabs)/_layout.tsx` durante resolução de sessão**: tela branca sem indicador. Vale
   para toda a exclusão de conta, já que ela navega para fora por esse guard.
6. **Quinze módulos mortos** (`ReferencePicker`, `useVerse`, `useChapter`, `useVerseOfDay`,
   `Collapsible`, `HintRow`, `WebBadge`, `ExternalLink`, `AnimatedIcon`, barrel `bibleApi`, tipo
   `AuthScreen`, interceptor inerte, seis estilos não usados). A constituição proíbe código morto;
   a dívida é pré-existente e a limpeza é uma mudança própria.
