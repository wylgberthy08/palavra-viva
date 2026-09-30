# Implementation Plan: Excluir Conta

**Branch**: `001-excluir-conta` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-excluir-conta/spec.md`

## Summary

Adiciona exclusão permanente de conta ao app local-first Palavra Viva. A exclusão tem duas metades
com autoridades diferentes: a conta no Supabase Auth é removida por uma Edge Function que valida
o JWT do chamador e usa privilégio de servidor; a coleção de versículos decorados, que só existe no
dispositivo, é apagada pelo próprio app. A tela "Meus" deixa de esconder a saída dentro de um
avatar e passa a apontar para uma tela de conta com saída e exclusão separadas.

A decisão central de arquitetura: **a chave `service_role` nunca entra no aplicativo**. O cliente
apenas invoca `supabase.functions.invoke('delete-account')` com o token da sessão; a função de
borda deriva o id do usuário das claims do JWT e chama `auth.admin.deleteUser()`. Isso é
obrigatório, não preferencial — `auth.admin.deleteUser()` exige `service_role`, e expor essa chave
em um cliente Expo a publicaria no bundle.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, `strict: true`; Deno (TypeScript) na Edge Function

**Primary Dependencies**: Expo SDK 57 (`~57.0.23`), expo-router `~57.0.21`, React Native 0.86.3,
React 19.2.3, `@supabase/supabase-js` ^2.117.1, TanStack Query ^5.102.8,
`@react-native-async-storage/async-storage` 2.2.0, `expo-secure-store` ~57.0.4,
Supabase Edge Functions (Deno)

**Storage**: Supabase Auth (`auth.users`, sem tabelas de aplicação) + `expo-secure-store`
(credenciais de sessão, native) / `localStorage` (web) + AsyncStorage (versículos decorados,
chave `@palavra-viva/saved-verses/v1`)

**Testing**: NEEDS CLARIFICATION → resolvido em [research.md](./research.md) como `jest-expo` +
`@testing-library/react-native`, criado nesta feature. Justificativa: o Quality Gate da
constituição exige cobertura automatizada para comportamento novo, e o repositório não tem
nenhuma infraestrutura de teste.

**Target Platform**: iOS, Android e web (Expo, `expo-router` com variantes `.web.tsx`);
Edge Function na plataforma Supabase (Deno)

**Project Type**: mobile-app (universal Expo) + serverless function

**Performance Goals**: exclusão perceptível como concluída em até 5 s do toque de confirmação;
tela de conta renderiza sem atraso perceptível; nenhum polling

**Constraints**: offline-tolerante no sentido de que a falha de rede **não** pode deixar estado
inconsistente; exclusão irreversível; a função de borda não pode confiar em `user_id` do corpo da
requisição; `service_role` ausente do cliente; o `Alert.alert` do React Native não é confiável com
dois botões no navegador, então a confirmação de exclusão é um diálogo próprio

**Scale/Scope**: 1 Edge Function, 1 tela nova, 1 rota nova, ~6 arquivos novos, ~4 arquivos
alterados; nenhuma tabela nova, nenhuma migração, nenhuma mudança de schema

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição v1.0.0 (`.specify/memory/constitution.md`).

| Princípio | Verificação | Resultado |
|---|---|---|
| I. Simplicidade e YAGNI | A exclusão é pedida explicitamente. Não há abstração de "gerenciador de conta" nem repository pattern. A tela de conta é uma rota, não um sistema de telas de configurações. | PASS |
| II. Responsabilidade Única e Coesão | A decisão de excluir (serviço) fica separada da chamada de rede (cliente supabase) e da apresentação (tela). A Edge Function tem uma responsabilidade: apagar o autor da chamada. | PASS |
| III. Fronteiras e Dependências Unidirecionais | `app/(tabs)/conta.tsx` reexporta `account/screens/AccountScreen.tsx`; a tela usa `useAuth`; `useAuth` usa `services/account-deletion.ts`; o serviço usa o cliente `services/supabase.ts`. Nenhuma camada importa de camada superior. `src/account/types/account.ts` guarda o contrato de resultado. | PASS |
| IV. Nomenclatura e Código Autodocumentado | Domínio em português (`excluirConta`, `estaExcluindo`, `ResultadoExclusao`); convenção técnica em inglês (`AccountScreen`, `deleteAccount`). Comentários explicam o porquê. | PASS |
| V. Contratos Tipados e Erro Explícito | `ResultadoExclusao` é união discriminada; `mapSupabaseUser` deixa de receber `any` (FR-013); env vars validadas com falha explícita (FR-012); os três estados async + falha cobertos (FR-010). | PASS |
| VI. Mudanças Pequenas e Sem Resíduo | Refatoração de `useAuth` (tipagem, env) vai em commit separado da funcional. Nenhum arquivo temporário. A dívida pré-existente (`.env` versionado, ~15 módulos mortos) **não** é tocada aqui e não é introduzida aqui. | PASS |

**Technical Constraints**

| Restrição | Verificação | Resultado |
|---|---|---|
| Expo SDK 57 / expo-router entry | Rota nova registrada no grupo `(tabs)`, sem alterar `main` do `package.json`. | PASS |
| TypeScript `strict: true`, alias `@/*` | Todos os caminhos novos usam `@/`. | PASS |
| TanStack Query com chaves centralizadas | `queryClient.clear()` no sucesso da exclusão; nenhuma chave nova necessária. | PASS |
| Supabase via `src/auth/services/supabase.ts`, credenciais em SecureStore | O serviço novo importa o cliente já existente; não cria um segundo cliente. | PASS |
| Estilo segue o padrão existente | Usa `ThemedText`/`ThemedView` e `Colors` de `src/constants/theme.ts`. Nenhuma biblioteca nova. | PASS |
| Divergência de plataforma explícita | A confirmação é um componente compartilhado, sem variante por plataforma — comportamento idêntico nas três (FR-014). | PASS |

**Quality Gates**

| Gate | Verificação | Resultado |
|---|---|---|
| `npm run lint` | O projeto usa `eslint-config-expo/flat`; o plano adiciona `test` e `typecheck` ao `package.json` sem alterar a config de lint. | PASS |
| `npx tsc --noEmit` | Sem `any` novo; `strict` preservado. | PASS |
| Cobertura automatizada | **Requer infraestrutura inexistente.** A feature cria `jest-expo` + Testing Library, com testes para o serviço de exclusão (4 resultados) e para a tela de conta (fluxo de confirmação). | PASS com escopo adicional declarado |
| Revisão conforme Princípios I–VI | Fluxo revisado contra a constituição nesta seção. | PASS |

**Complexidade Tracking**

| Violação | Por que é necessária | Alternativa mais simples rejeitada porque |
|---|---|---|
| Criar infraestrutura de testes (jest-expo + Testing Library) | O Quality Gate da constituição exige cobertura automatizada para comportamento novo, e o repositório não tem `test` script, runner, nem config. Não há como cumprir o gate sem criar a infraestrutura. | Não criar testes e aceitar o gate como dívida. Isso viola a constituição no primeiro PR que a própria constituição governa, e o comportamento em questão é destrutivo e irreversível — justamente onde a ausência de teste mais dói. |
| Edge Function em vez de chamada direta | `auth.admin.deleteUser()` exige `service_role`. Colocar essa chave no bundle Expo a publica para qualquer pessoa que descompile o app. Não há alternativa segura do lado do cliente. | `supabase.auth.updateUser()` ou flag `is_deleted` em tabela própria: a documentação da plataforma é explícita ao dizer que nenhum dos dois substitui a exclusão — o usuário continua podendo autenticar e renovar token. |

Nenhuma outra violação. Gate aprovado.

## Project Structure

### Documentation (this feature)

```text
specs/001-excluir-conta/
├── plan.md              # Este arquivo
├── spec.md              # Especificação (já escrita)
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── edge-function-delete-account.md
└── tasks.md             # Fase 2 (produzido por /speckit.tasks, não por este comando)
```

### Source Code (repository root)

```text
# Frontend (Expo, existente)
src/
├── app/(tabs)/
│   ├── _layout.tsx              # ALTERADO: registra a rota 'conta'
│   ├── index.tsx                # inalterado
│   ├── meus.tsx                 # ALTERADO: avatar navega para /conta em vez de sair
│   └── conta.tsx                # NOVO: reexport de AccountScreen
├── account/                     # NOVO: módulo de conta
│   ├── screens/
│   │   └── AccountScreen.tsx    # NOVO: e-mail, sair, zona de perigo
│   ├── components/
│   │   └── ConfirmDeleteAccount.tsx  # NOVO: diálogo destrutivo próprio (não Alert)
│   └── types/
│       └── account.ts           # NOVO: union ResultadoExclusao
├── auth/
│   ├── index.tsx                # ALTERADO: expõe deleteAccount(); mapSupabaseUser tipado
│   ├── screens/
│   │   ├── LoginScreen.tsx      # inalterado
│   │   └── RegisterScreen.tsx   # inalterado
│   ├── services/
│   │   ├── supabase.ts          # ALTERADO: valida env com falha explícita
│   │   └── account-deletion.ts  # NOVO: chama a Edge Function, mapeia erros
│   └── types/auth.ts            # ALTERADO: contrato de deleteAccount
├── services/
│   ├── api/                     # inalterado
│   └── storage/
│       └── saved-verses.ts      # ALTERADO: expõe clearSavedVerses()
├── hooks/
│   └── use-saved-verses.ts      # ALTERADO: expõe clear()
├── components/ui/               # existente
│   └── destructive-button.tsx   # NOVO: botão de perigo reutilizável
├── config/
│   └── app.ts                   # NOVO: nome e versão, evita literais na UI
├── query/client.ts              # inalterado (clear() é chamado, não redefinido)
└── types/bible.ts               # inalterado

# Backend (Supabase Edge Function)
supabase/
├── config.toml                  # NOVO: gerado pela CLI (verify_jwt padrão = true)
└── functions/
    └── delete-account/
        ├── index.ts             # NOVO: valida JWT, apaga o próprio usuário
        └── deno.json            # NOVO: pins de dependências

# Testes (novos)
__tests__/
├── setup.ts                     # NOVO: mocks de expo-secure-store e async-storage
├── account-deletion.test.ts     # NOVO: 4 resultados de exclusão
└── account-screen.test.tsx      # NOVO: confirmação, cancelamento, estado em andamento
```

**Structure Decision**: projeto único Expo, sem monorepo e sem backend próprio. A
`supabase/functions/` segue a convenção oficial da CLI, que detecta Edge Functions por esse
caminho. A novidade estrutural em relação ao repositório atual é o módulo `src/account/`, que
espelha o `src/auth/` já existente: `screens/`, `components/`, `types/`. Isso mantém a cadeia de
dependências da constituição (`app/` → `screens/` → `hooks/` → `services/` → `types/`) sem
introduzir uma camada nova de abstração. O serviço de rede da exclusão mora em
`src/auth/services/account-deletion.ts` e não em `src/services/`, porque ele depende do cliente
Supabase que já vive sob `auth/` — colocá-lo em `src/services/` criaria uma dependência de
`src/services/` para `src/auth/`, invertendo a direção.

## Fase 0 — Research

Decisões de projeto e questões resolvidas: [research.md](./research.md).

## Fase 1 — Design

- Modelo de dados e estados: [data-model.md](./data-model.md)
- Contrato da Edge Function: [contracts/edge-function-delete-account.md](./contracts/edge-function-delete-account.md)
- Validação de ponta a ponta: [quickstart.md](./quickstart.md)

### Re-verificação do Constitution Check após o design

| Princípio | O que o design mudou | Resultado |
|---|---|---|
| III. Dependências unidirecionais | `account-deletion.ts` fica em `auth/services/` justamente para não inverter a direção com `src/services/`. `src/account/types/account.ts` é a fonte única do contrato `ResultadoExclusao`. | PASS |
| V. Tipos e erro explícito | `ResultadoExclusao` é união discriminada de 4 casos; o serviço nunca lança para a UI, sempre devolve resultado. `mapSupabaseUser` recebe `User` de `@supabase/supabase-js`. Env validado com mensagem explícita. | PASS |
| I. Simplicidade | Nenhuma camada de abstração nova. O diálogo destrutivo é um componente de tela, não um `DialogProvider` global. O botão de perigo é reutilizado em um lugar só hoje, mas é a unidade visual mínima de "ação destrutiva" — registrado como dívida se não ganhar segundo uso. | PASS |
| VI. Sem resíduo | Mudanças de tipagem/env em `auth/` commitadas separadas da funcional. | PASS |

Complexity Tracking inalterado. Gate aprovado após design.

## Notes

- A CLI do Supabase não está instalada nesta máquina. A implantação da Edge Function é manual ou
  via `npx supabase`. O `quickstart.md` traz os dois caminhos.
- A dívida pré-existente de `.env` versionado no git **não** é corrigida aqui, por ser mudança de
  infraestrutura fora do escopo desta feature. Está registrada em `research.md` como item de
  backlog.
