# Feature Specification: Plano de Refatoração

**Feature Branch**: `002-refatoracao`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "monte um plano de refatoração desse projeto"

## Contexto

O repositório tem 47 arquivos e 2757 linhas em `src/`, dois commits, e funciona. O problema não é
que esteja quebrado: é que o custo de mudar qualquer coisa já subiu, e a constituição (v1.1.0)
descreve um código que o repositório ainda não é.

Levantamento feito por leitura de `src/**`, verificação de consumidores por busca de `import`, e
execução dos comandos de verificação:

| Métrica | Valor verificado |
|---|---|
| Arquivos / linhas em `src/` | 47 / 2757 |
| `npm run lint` | **falha**, 1 erro (`react-hooks/set-state-in-effect`) |
| `npx tsc --noEmit` | passa |
| Módulos sem nenhum consumidor | 8 (352 linhas) + 1 que só o código morto usa |
| Símbolos mortos dentro de módulos vivos | 1 export, 6 estilos, 5 props, 2 tipos |
| Linhas duplicadas byte a byte (Login × Register) | 148 (o `StyleSheet.create` inteiro) |
| Literais hexadecimais fora de token | 30 ocorrências, 13 valores, 8 arquivos |
| Paletas distintas em uso | 3 (tokens, terracota, dourado) |
| `any` e coerções sem validação | 1 `any` + 7 coerções |
| `@ts-ignore` / `eslint-disable` | 0 |
| Dependências sem import direto | 11 |
| Cobertura de teste | inexistente |
| `.env` versionado no git | sim (`.gitignore` corrigido, índice não) |

Este recorte **não** adiciona funcionalidade. Nenhuma tela nova, nenhum endpoint, nenhum
comportamento observável. O produto entregue ao usuário antes e depois é idêntico.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Corrigir os defeitos que corrompem dados ou travam a interface (Priority: P1)

Ana salva um versículo com o armazenamento do aparelho quase cheio. A lista atualiza na tela, o
versículo aparece como salvo, e se o app for fechado o item some. Depois o app é aberto de novo
com o armazenamento indisponível, e a tela de Decorados afirma, com toda confiança, que ela ainda
não decorou nenhum versículo. Nenhum dos dois é aceitável: um é perda de dado, o outro é uma
mentira na interface.

**Why this priority**: são os únicos itens desta refatoração que muda o que o usuário experimenta.
Todo o resto é manutenção. Se só um story for entregue, é este.

**Independent Test**: cada defeito tem cenário reproduzível descrito no `quickstart.md`, com
antes e depois observáveis: item continua salvo após reabrir o app; falha de leitura vira estado de
erro em vez de lista vazia; conta sem email não trava a lista.

**Acceptance Scenarios**:

1. **Given** o armazenamento local rejeitando a escrita, **When** Ana salva um versículo, **Then**
   a interface informa a falha e a lista não mostra o item como salvo.
2. **Given** uma falha ao carregar os versículos salvos, **When** Ana abre Decorados, **Then** a
   tela mostra estado de erro, e não a mensagem de lista vazia.
3. **Given** dados salvos corrompidos em disco, **When** o app inicia, **Then** o erro é
   distinguível de "não há versículos salvos" e os dados existentes não são sobrescritos.
4. **Given** uma conta criada sem email preenchido, **When** Ana abre Decorados, **Then** a tela
   renderiza a inicial do nome, sem travar.
5. **Given** uma busca com menos de três caracteres, **When** Ana toca na lupa, **Then** a interface
   diz que a referência está curta, em vez de não fazer nada.

---

### User Story 2 - Remover o código que não serve a ninguém (Priority: P1)

João herda o projeto e encontra um seletor de livro/capítulo/versículo completo, 151 linhas, que
nenhuma tela renderiza. Ele passa 20 minutos procurando quem consome aquilo, não acha, e não sabe
se pode apagar. Uma semana depois ele apaga, quebra a build, e descobre que o hook de livros
dependia dele.

**Why this priority**: código morto não custa só as linhas. Custa a cada leitura, a cada
`grep`, a cada dúvida de "isso é usado?". E a constituição proíbe código morto sem exceção
registrada. É o item de melhor retorno por hora de todo o plano.

**Independent Test**: após a remoção, `npm run lint` e `npx tsc --noEmit` passam, o app sobe e a
Home, Decorados, Login e Register se comportam como antes. `grep` por cada símbolo removido não
encontra nenhum consumidor — porque não há mais.

**Acceptance Scenarios**:

1. **Given** o seletor de referência e os hooks sem consumidor, **When** o repositório é analisado,
   **Then** nenhum arquivo exporta ou importa símbolos que não tenham consumidor.
2. **Given** a remoção de `AnimatedIcon` e das dependências que só ele usava, **When** a tela
   inicial abre, **Then** a animação de abertura continua funcionando nas três plataformas.
3. **Given** as dependências sem uso no `package.json`, **When** a aplicação é construída, **Then**
   ela compila e executa sem nenhuma dependência removida.
4. **Given** props, estilos e tipos declarados e nunca usados, **When** a assinatura é inspecionada,
   **Then** não existe nenhum deles no código.

---

### User Story 3 - Unificar o código duplicado (Priority: P2)

Maria precisa mudar a cor do botão primário de login. Ela edita o `StyleSheet` de `LoginScreen`,
testa, e descobre que `RegisterScreen` tem uma cópia byte a byte das mesmas 74 linhas. Ela muda
nos dois. Depois um terceiro lugar aparece. Agora existem três botões com a mesma função e duas
cores, e ninguém sabe qual é a certa.

**Why this priority**: é onde a duplicação custa caro em manutenção e em bug, mas o custo é
difícil de medir até alguém tropeçar. Fica depois dos bugs porque não muda o que o usuário vê.

**Independent Test**: mudar a cor primária em um único lugar altera login, registro, botão de
salvar versículo e chip de filtro. Verificável por busca: existe **uma** definição de cada valor
compartilhado.

**Acceptance Scenarios**:

1. **Given** a alteração do token de cor primária, **When** o app é executado, **Then** todos os
   elementos que usam aquela cor mudam junto, sem segunda edição manual.
2. **Given** as telas de login e registro, **When** se compara a estrutura dos dois arquivos,
   **Then** a folha de estilo e o invólucro de layout são um só, e o que resta é o que de fato
   difere: os campos e a ação.
3. **Given** a barra de abas, **When** se compara native e web, **Then** a lista de abas (nome,
   rótulo, ícone) é declarada uma vez e consumida pelas duas variantes.
4. **Given** a resolução de tema, **When** qualquer tela lê cores, **Then** existe um único caminho
   para decidir entre tema claro e escuro.

---

### User Story 4 - Transformar o código em tokens e regras verificadas (Priority: P2)

Ana escuro o aparelho. A borda do campo de busca, que deveria ser `primary` do tema escuro, está
escrita como literal fixo e continua clara. O botão de login também: marrom em tema claro, marrom
em tema escuro, sem contraste. Ela percebe o problema no contraste, mas não tem como corrigir de
forma consistente, porque a cor está escrita em quatro lugares e ninguém sabe qual manda.

**Why this priority**: tokens não são estética. Aqui são o que torna o tema escuro correto e o que
permite ao gate de qualidade dizer "nenhum literal novo" sem revisão manual.

**Independent Test**: alternar o tema do sistema em cada plataforma produz interface legível em
todo campo. `grep` por `#` em `src/` não retorna nenhum literal de cor fora do arquivo de tokens.

**Acceptance Scenarios**:

1. **Given** tema escuro ativo, **When** qualquer tela renderiza, **Then** nenhum campo, botão ou
   texto fica com contraste insuficiente.
2. **Given** uma nova cor necessária, **When** alguém a adiciona, **Then** ela é adicionada ao
   arquivo de tokens, com variante clara e escura, e nunca inline.
3. **Given** a verificação de estilo, **When** a análise roda, **Then** a existência de literal de
   cor fora do arquivo de tokens é reportada.
4. **Given** a tipografia, **When** um tamanho de fonte é necessário, **Then** ele vem da escala de
   tipos, e a fonte de exibição declarada no design é realmente carregada ou removida do código.

---

### User Story 5 - Unificar o tratamento de erro (Priority: P3)

Ana entra com a senha errada e vê um `Alert` do sistema. Depois a conexão cai durante uma busca e
ela vê um componente estilizado. São dois mecanismos para o mesmo evento. Se ela esquece a senha, é um
`Alert`; se a API falha, é uma caixa com botão de tentar de novo. Nada garante que a mensagem
traduza a causa real, porque cada tela traduz a sua maneira.

**Why this priority**: é a última onda porque exige testes para ser feita com segurança, e os
testes só nascem no primeiro item. Consolida o que os itens anteriores já deixaram pronto.

**Independent Test**: toda falha de aplicação passa por um caminho único até a tela, com mensagem
em português e causa técnica preservada. Nenhum `Alert.alert` de validação sobrevive.

**Acceptance Scenarios**:

1. **Given** credencial inválida, **When** Ana entra, **Then** o erro aparece no mesmo componente
   usado pelas demais falhas, com mensagem compreensível.
2. **Given** falha na API de versículos, **When** a busca falha, **Then** a mensagem traduz a causa
   específica quando ela é conhecida e sugere ação quando há sugestão.
3. **Given** uma falha de sistema não mapeada, **When** ela chega à tela, **Then** a causa técnica
   fica registrada para diagnóstico e a mensagem é genérica mas verdadeira.

### Edge Cases

- **Dependência que só o código morto usa**: `expo-web-browser` é importado apenas por
  `external-link.tsx` e `expo-symbols` apenas por `collapsible.tsx`, ambos mortos. A remoção das
  dependências é consequência da remoção do código, não um passo independente — remover a
  dependência antes quebra a build.
- **Dependência que parece não usada mas precisa ficar**: `expo-constants`, `expo-linking`,
  `react-native-safe-area-context` e `react-dom` não têm import direto, mas são exigidas pelo
  `expo-router` e pelo build web. A lista de remoção tem de ser conferida com `expo-doctor`, não
  com busca de import.
- **Fonte de exibição com duas estratégias**: o login e o registro usam `fontFamily: 'Merriweather'`,
  que nunca é carregada porque `expo-font` não é usado em lugar nenhum; a Home usa `fontFamily:
  'serif'`, que resolve para a pilha do sistema. Nenhuma das duas é a do design. Unificar exige
  escolher uma, e a escolha é de produto.
- **Caixa de abas customizada da web**: `TabButton` e `CustomTabList` existem só na variante web e
  têm layout próprio (faixa no topo com a marca). Unificar a *lista* de abas não pode apagar a
  variante web inteira, que é escolha de design.
- **Chave de armazenamento versionada (`/v1`)**: a validação adicionada precisa tolerar o formato já
  gravado, e um item corrompido não pode ser motivo para descartar a lista inteira.
- **Rotação de cache sem consumidor**: a chave `votd` inclui a data local e o comentário promete
  rotação à meia-noite. O desenho está certo e é código morto: `use-verse-of-day.ts` não tem
  consumidor. Remover o arquivo não precisa decidir nada sobre rotação.
- **Divergência de nome de aba (`index` vs `home`)**: o nome da rota na web não existe em disco. A
  correção é segura; o teste é abrir a web e navegar entre as duas abas.
- **`.env.example` descreve o que não existe**: o exemplo documenta login social com Google, que não
  tem implementação, e não lista `EXPO_PUBLIC_BIBLE_BASE_URL`, que o código lê. Um `.env` novo,
  feito a partir do exemplo, sobe o app apontando para a API de produção.
- **Tema escuro com valor fixo**: o botão de salvar da Home usa `#6F3312` e as sombras usam
  `#362F2A` em tema claro e escuro. Trocar por token muda a aparência em tema escuro. É a correção
  pretendida, mas precisa de conferência visual, não só de gate automático.
- **`Pressable` dentro de `Pressable`**: o cartão de versículo e o flashcard aninham área tocável.
  Funciona no nativo, mas a propagação de toque na web é outro comportamento. Unificar os estados
  de toque é o que elimina a classe inteira de bug, não um ajuste pontual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A refatoração MUST NOT alterar comportamento observável: a mesma entrada produz a
  mesma saída em todas as plataformas. Mudança de comportamento exige spec própria.
- **FR-002**: O sistema MUST corrigir a escrita otimista de versículos salvos: falha de
  persistência MUST ser informada e MUST reverter o estado exibido.
- **FR-003**: O carregamento inicial de versículos salvos MUST tratar falha de leitura com estado de
  erro visível, em vez de lista vazia silenciosa.
- **FR-004**: A busca por referência MUST validar o mínimo de caracteres antes de disparar a
  requisição, e MUST informar o motivo quando a entrada for recusada, em vez de não fazer nada.
- **FR-005**: As ações assíncronas de autenticação MUST usar `try`/`finally` para que o estado de
  carregamento sempre termine, inclusive em erro inesperado.
- **FR-006**: Toda função de mapeamento da API MUST validar a forma do dado recebido e MUST falhar
  com erro identificável quando a forma não bate, em vez de produzir objeto com campo `undefined`.
- **FR-007**: O cliente HTTP MUST ter um único caminho de normalização de erro, com tipo de erro
  explícito, substituindo o interceptor inerte.
- **FR-008**: MUST NOT existir módulo, hook, componente, função, prop, estilo, tipo ou dependência
  sem consumidor verificável. A verificação MUST ser automatizável.
- **FR-009**: As telas de login e registro MUST compartilhar folha de estilo, invólucro de layout,
  campo rotulado e ação primária, com uma única definição de cada.
- **FR-010**: A lista de abas MUST ser declarada uma vez e consumida pelas variantes nativa e web,
  com o mesmo nome de rota nas duas.
- **FR-011**: A decisão entre tema claro e escuro MUST existir em um único lugar, e todo
  consumidor MUST usar esse caminho em vez de ler o esquema de cor diretamente.
- **FR-012**: Toda cor MUST vir de token, com variante clara e escura. Literal hexadecimal fora do
  arquivo de tokens MUST ser reportado pela verificação de estilo.
- **FR-013**: `global.css` MUST declarar as variáveis de cor usadas na web, e MUST declarar
  `color-scheme`, de modo que a web tenha a mesma paleta que a nativa.
- **FR-014**: Tamanho de fonte, espaçamento, raio e altura de controle MUST vir de token, e
  qualquer valor novo MUST ser adicionado ao token antes do uso.
- **FR-015**: O estado visual de carregamento MUST ter um único componente, usado em toda espera,
  inclusive na resolução de sessão, que hoje exibe tela vazia.
- **FR-016**: O tratamento de erro MUST ter uma única política, com mensagem de usuário em
  português e causa técnica preservada para diagnóstico. Validação de formulário MUST NOT usar
  `Alert.alert` do sistema, que não produz efeito na web.
- **FR-017**: `mapSupabaseUser` MUST receber o usuário do Supabase com o tipo declarado pela
  biblioteca, sem `any`.
- **FR-018**: A leitura de dados persistidos MUST validar a forma de cada item antes de aceitar,
  tolerando o formato já gravado pela versão anterior, e MUST distinguir dado corrompido de dado
  ausente.
- **FR-019**: As rotas MUST ser referenciadas pelo tipo de rota do expo-router, sem string
  literal de caminho.
- **FR-020**: MUST existir verificação automatizada de código morto e de literal fora de token, com
  resultado obrigatório antes de qualquer PR.
- **FR-021**: Nomes de arquivo MUST seguir uma única convenção, e tipos MUST ter uma única
  localização por categoria.
- **FR-022**: O `.gitignore` MUST cobrir arquivos de ambiente com exceção explícita para o exemplo,
  e nenhum arquivo de ambiente real MUST estar versionado. Adicionar ao `.gitignore` não basta:
  o arquivo já versionado precisa sair do índice.
- **FR-023**: A leitura de variáveis de ambiente MUST falhar na inicialização, com mensagem que
  nomeie a variável ausente, em vez de construir o cliente com string vazia.
- **FR-024**: O exemplo de ambiente MUST listar toda variável lida por `process.env` e MUST NOT
  documentar funcionalidade que não existe no código.
- **FR-025**: Ícone MUST vir da biblioteca de ícones instalada ou ter rótulo acessível; glifo
  Unicode usado como ícone MUST sair.
- **FR-026**: `npm run lint` e `npx tsc --noEmit` MUST passar antes do início de cada onda, e
  continuar passando ao fim de cada uma.
- **FR-027**: Area tocável aninhada MUST ser eliminada em favor de um único alvo por gesto, de
  modo que toque tenha o mesmo comportamento nas três plataformas.
- **FR-028**: A imagem usada como marca dentro do app MUST ser um asset leve, e não o ícone da
  aplicação.

### Key Entities

- **Token de design**: nome de cor, tamanho, espaçamento ou raio com variante clara e escura,
  fonte única de verdade para aparência.
- **Erro normalizado**: falha de fronteira de sistema com tipo identificador, mensagem para o
  usuário e causa técnica preservada.
- **Módulo vivo**: arquivo cujo símbolo exportado tem ao menos um consumidor, verificável por
  análise estática.
- **Onda de refatoração**: conjunto de mudanças de um mesmo tipo, com comportamento inalterado,
  executável e reversível isoladamente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero símbolos exportados sem consumidor no repositório, incluindo estilos, props e
  tipos, verificado por verificação automatizada que falha o PR.
- **SC-002**: Zero literal de cor fora do arquivo de tokens, verificado automaticamente.
- **SC-003**: Zero ocorrência de `any` e zero coerção sem validação no código de aplicação.
- **SC-004**: As telas de login e registro compartilham uma única folha de estilo, verificado por
  comparação estrutural dos dois arquivos.
- **SC-005**: A lista de abas é declarada uma vez e as duas plataformas compilam e navegam
  corretamente.
- **SC-006**: Tema escuro ativo produz contraste legível em todas as telas, verificado por
  conferência visual nas três plataformas.
- **SC-007**: A suíte de testes automatizados cobre as funções de mapeamento, a persistência local e
  a camada de autenticação, com verificação de tipo estrita.
- **SC-008**: O total de linhas em `src/` diminui em pelo menos 15%, sem adição de
  funcionalidade. O número de arquivos pode permanecer estável: a onda 2 apaga 9 arquivos, e a onda
  4 cria 4 ao separar as duas rotas grandes em tela, estado e estilo. O que não pode é o arquivo
  médio ficar maior.
- **SC-009**: Nenhum arquivo de ambiente real está versionado, verificado por `git ls-files`.
- **SC-010**: Cada onda é um conjunto de commits que compila, passa lint e passa testes de forma
  independente, podendo ser revertida sem deixar o repositório quebrado.
- **SC-011**: `npm run lint` termina com código de saída 0 desde o fim da primeira onda, e
  `npx tsc --noEmit` permanece sem erro durante todo o plano.
- **SC-012**: Nenhum arquivo de `src/` referencia variável de ambiente sem lista no exemplo, e
  `expo-doctor` não reporta dependência faltando nem incompatível.

## Assumptions

- Não há usuários em produção ainda: o projeto tem dois commits, não há plano de rollback de
  dados, e a mudança de estado de sessão e navegação é aceitável. Se houver usuários, a ordem das
  ondas precisa de uma onda de migração de dados.
- A busca de versículo por referência via API externa não muda de contrato. A correção de validação
  é sobre a entrada, não sobre o formato aceito.
- A fonte de exibição do design (`Merriweather`) não entra nesta refatoração: ou é carregada de
  fato, ou o `fontFamily` órfão é removido. A decisão é de produto e fica como item de backlog.
- A variante web da barra de abas (`TabList` no topo) é escolha de design mantida. A unificação
  trata da lista de abas, não do layout.
- A exclusão de conta, especificada em `001-excluir-conta`, é implementada **após** este plano: as
  duas ondas se tocam em `auth/index.tsx`, nos serviços e no layout de abas. A ordem é `002` antes
  de `001`, para que a feature nasça sobre a base limpa.

## Fora de escopo

Defeitos encontrados no levantamento que este plano **não** corrige, porque corrigi-los muda
comportamento ou exige decisão de produto. Ficam registrados aqui para não se perderem:

- **Versículos salvos não são segmentados por usuário.** A chave de armazenamento é global
  (`@palavra-viva/saved-verses/v1`) e o app exige autenticação, então duas contas no mesmo aparelho
  compartilham a mesma lista. Separar por usuário é migração de dado com decisão de produto sobre
  o que fazer com a lista atual.
- **A chave do versículo do dia nunca é usada.** `bibleKeys.votd` e `use-verse-of-day` existem e
  funcionam, mas nenhuma tela mostra versículo do dia. Decidir se a feature entra é produto.
- **"5 dias" é fixo na Home.** O contador de sequência de estudo não tem dado nenhum por trás.
- **Login social com Google aparece no exemplo de ambiente sem existir no código.**
- **`ios.bundleIdentifier` não está em `app.json`**, ao contrário do `android.package`.
- **`scripts/reset-project.js` recria o projeto a partir do template** e é referenciado por
  `npm run reset-project`. Não faz sentido num repositório que já tem produto; a remoção entra na
  onda de limpeza por ser risco operacional, não por ser código de aplicação.
- **Assets de template do Expo** (`react-logo*`, `expo-badge*`, `tutorial-web.png`, `expo.icon/`)
  ocupam espaço no repositório e não são referenciados pela aplicação, com exceção do
  `expo-logo.png`, que é a imagem da animação de abertura.
- **`maxContentWidth` de 800px** é aplicado em três lugares como constante compartilhada já
  existente; não há tablet como alvo declarado.
