# Quickstart: Plano de Refatoração

**Data**: 2026-09-30

Este documento é o manual de execução. Ele serve para quem vai aplicar o plano: como verificar o
estado inicial, como rodar cada onda, e como comprovar que a refatoração não mudou o que o usuário
experimenta.

## Aviso sobre o estado do repositório

O plano **não foi executado**. Nenhum arquivo de `src/` foi alterado. As alterações pendentes na
árvore de trabalho são de outra origem:

```
 M .gitignore                    # já corrigido, alteração não commitada
 M .specify/memory/constitution.md
?? specs/                        # documentos do Spec Kit
```

`.env` continua versionado. A onda 0 resolve isso.

Antes de começar, confirme que está no branch certo:

```powershell
git switch -c 002-refatoracao
```

## 1. Verificar o estado inicial

```powershell
npx tsc --noEmit; "tsc: $LASTEXITCODE"      # esperado 0
npm run lint; "lint: $LASTEXITCODE"          # esperado 1, hoje
npm test; "test: $LASTEXITCODE"              # esperado falhar: script inexistente
git ls-files | Select-String -Pattern '^\.env$'   # esperado: .env
```

O `lint` vermelho é o estado inicial real, não um erro seu. Ele é o primeiro passo da onda 0.

## 2. O gate

Depois da onda 0, um comando decide se o repositório está saudável:

```powershell
npm run verify       # typecheck && lint && test
```

Rodar a cada commit. Um commit que deixa o gate vermelho não entra.

Verificações separadas, para quando uma delas falhar e quiser saber qual foi:

```powershell
npm run typecheck
npm run lint
npm test
npm run check:dead     # símbolo exportado sem consumidor
npm run check:styles   # literal de cor fora de constants/theme.ts
npx expo-doctor        # manifesto e dependências
```

## 3. Como executar uma onda

Cada onda é uma sequência de passos numerados no `plan.md`. O ritmo é o mesmo:

1. Rodar `npm run verify` e confirmar que está verde **antes** de começar.
2. Fazer um passo por commit, com a mensagem no padrão do repositório.
3. Rodar `npm run verify` **depois** de cada passo.
4. Se a verificação do passo falhar, `git reset --soft HEAD~1` e corrigir. Um passo que não fecha
   sozinho não entra.

## 4. Cenários de caracterização

Estes cenários descrevem o comportamento **antes** da refatoração. Depois, os mesmos pasos devem
produzir o resultado da coluna "Depois". É assim que se prova FR-001.

### 4.1 Versículo salvo sobrevive ao fechamento (D3)

| | |
|---|---|
| **Antes** | |
| Passo | Home → buscar `João 3:16` → tocar em "Adicionar aos Meus Versículos" |
| Ver | o item aparece na lista de Decorados |
| Fechar | forçar o fechamento do app e reabrir |
| **Antes, resultado** | o item **some**. O estado foi atualizado antes de gravar, e a gravação falhou em silêncio |
| **Depois, resultado** | o item continua lá, ou a tela diz que não conseguiu salvar |

**Como reproduzir a falha de gravação**: no emulador, em Configurações do Android, colocar o
armazenamento do app sob pressão, ou no código de teste, mock de `AsyncStorage.setItem` que rejeita.

### 4.2 Falha de leitura não vira lista vazia (D4, D8)

| | |
|---|---|
| **Passo** | com 3 versículos salvos, fazer a leitura falhar |
| **Antes, resultado** | a tela abre em Decorados e afirma "Nenhum versículo decorado ainda". A promessa rejeitada não tem tratamento; o `finally` apaga o loading e a lista renderiza vazia |
| **Depois, resultado** | a tela mostra o estado de erro, com os 3 versículos intactos |

### 4.3 Dado corrompido não apaga a lista (D5, D6)

| | |
|---|---|
| **Passo** | gravar 3 itens em `@palavra-viva/saved-verses/v1`, então substituir o conteúdo por `"{quebrado"` |
| **Antes, resultado** | a leitura devolve `[]`. Na próxima vez que o usuário salva qualquer coisa, os 3 itens são sobrescritos e não há como recuperá-los |
| **Depois, resultado** | a tela diz que há um problema, e nada é sobrescrito |

**Variante**: manter os 3 itens válidos e acrescentar um quarto sem o campo `text`. O item inválido
é descartado, os 3 válidos aparecem.

### 4.4 Conta sem email não trava Decorados (D7)

| | |
|---|---|
| **Passo** | entrar com uma conta cujo `user.email` seja `null`, que o mapper converte em `''`, e abrir Decorados |
| **Antes, resultado** | `''.toUpperCase()` lança `TypeError` e a tela fica branca |
| **Depois, resultado** | a inicial do nome, ou um placeholder, sem travar |

### 4.5 Cadastro bem-sucedido sem confirmação de email (D2)

| | |
|---|---|
| **Passo** | cadastrar um email novo com confirmação de email habilitada no Supabase |
| **Antes, resultado** | a conta é criada e o usuário recebe "Erro ao criar conta: Conta criada. Confirme seu email para entrar." O estado global de erro fica contaminado |
| **Depois, resultado** | a mensagem aparece como confirmação, não como erro |

### 4.6 Busca curta informa o motivo (D10)

| | |
|---|---|
| **Passo** | na Home, digitar `Jo` e tocar na lupa |
| **Antes, resultado** | nada acontece. Sem mensagem, sem requisição, sem indicação de que o botão foi pressionado |
| **Depois, resultado** | a interface diz que a referência está curta |

### 4.7 Erro de validação aparece na web (D9)

| | |
|---|---|
| **Passo** | `npm run web`, abrir o registro e enviar o formulário vazio |
| **Antes, resultado** | nada. `Alert.alert` não é implementado em `react-native-web`, e o build é `output: "static"`. O mesmo vale para o erro de senha errada e para a confirmação de sair |
| **Depois, resultado** | a mensagem aparece na tela, nas três plataformas, com o mesmo texto |

### 4.8 Tema escuro nas telas de conta

| | |
|---|---|
| **Passo** | colocar o sistema em tema escuro e abrir login e registro |
| **Antes, resultado** | o botão de login é `#8C4A27` nos dois temas e a borda do campo é `#E5DDD0` nos dois. Estão escritos direto no `StyleSheet`, então não têm variante escura |
| **Depois, resultado** | botão e borda vêm de token, com variante escura legível |

## 5. Verificação manual por plataforma

Rodar com `npx expo start` e escolher a plataforma. O gate automático não cobre aparência.

### 5.1 Roteiro de toque

Em cada plataforma, com o app logado:

1. Abrir a Home. A animação de abertura toca e some. Os ícones da barra de busca, do X e do botão
   salvar estão visíveis e são tocáveis.
2. Buscar `João 3:16`. A tela mostra carregando, depois o versículo encontrado.
3. Tocar em "Adicionar aos Meus Versículos". O rótulo muda para "Adicionado".
4. Ir para Decorados. O versículo está na lista. Tocar nele: o flashcard vira.
5. Tocar em "Marcar dominado". O chip de filtro "Dominados" passa a mostrar o item.
6. Tocar em "Remover". O item sai da lista.
7. Sair da conta. A confirmação aparece. Confirmar leva de volta ao login.
8. Entrar de novo. O versículo continua salvo, porque a lista é local.

### 5.2 Tema escuro

Repetir 5.1 com o sistema em tema escuro. Conferir em cada tela: campo de busca, cartão de
versículo, botão de salvar, chip de filtro, avatar, botão do flashcard, barra de abas.

### 5.3 Abas

Na web, a lista de abas fica no topo, com a marca. Navegar entre Início e Decorados e confirmar que
a rota corresponde ao arquivo em disco (`index` e `meus`).

## 6. Provas de equivalência

No fim de cada onda, o checklist:

| Prova | Comando ou ação | Esperado |
|---|---|---|
| Tipo | `npx tsc --noEmit` | 0 |
| Lint | `npm run lint` | 0 |
| Testes | `npm test` | 0 |
| Sem código morto | `npm run check:dead` | sem relatório |
| Sem literal de cor | `npm run check:styles` | sem relatório |
| Dependências | `npx expo-doctor` | sem erro |
| Ambiente | `git ls-files` | sem `.env` |
| Comportamento | roteiro 5.1 e 5.2 | igual ao ponto de partida |
| Contagem | `Get-ChildItem -Recurse -File -Include *.ts,*.tsx src \| Get-Content \| Measure-Object -Line` | 2757 no início, 2350 ou menos no fim |

Sobre o número de arquivos: 47 no início, 38 depois da onda 2, e de volta a cerca de 42 no fim,
porque a onda 4 separa as duas rotas grandes em tela, estado e estilo. A métrica que importa é
linha, não contagem. O que não pode acontecer é arquivo médio maior: `meus.tsx` com 223 linhas e
`index.tsx` com 147 são o alvo.

## 7. Se algo quebrar

| Situação | O que fazer |
|---|---|
| `npm run lint` falha por regra nova do `eslint-config-expo` | corrigir o código. Desabilitar a regra no arquivo é dívida nova |
| `npx expo-doctor` reclama de versão depois de remover dependência | restaurar a dependência. A lista do passo 2.13 tem 4 exclusões que não são negociáveis |
| Build web falha depois de remover dependência | `react-dom`, `expo-constants`, `expo-linking` e `react-native-safe-area-context` são exigidas pelo framework sem import direto |
| Um passo do plano não aplica | rever o `research.md` na seção do símbolo. A evidência da linha pode ter mudado desde 2026-09-30 |
| Falta decidir a cor do produto | a onda 4 não começa. Ver "Perguntas em aberto" no `plan.md` |
| A exclusão de conta é urgente | ela depende de `auth/index.tsx` e do layout de abas, que as ondas 1 e 3 tocam. Fazer a onda 1 primeiro, depois decidir |

## 8. Ordem

```
Onda 0  gate verde e ambiente
   ↓
Onda 1  caracterização e correções de dados
   ↓
Onda 2  remover o que ninguém usa
   ↓
Onda 3  unificar o que está duplicado
   ↓
Onda 4  tokens, tema e estrutura de tela      ← bloqueada pela cor do produto
   ↓
Onda 5  rede de segurança e limpeza
```

A onda 1 é a que mais vale a pena executar inteira, mesmo que o resto não aconteça: sozinha ela
fecha quatro defeitos que perdem dado e cria a suíte de teste de que as ondas 3 e 4 dependem.
