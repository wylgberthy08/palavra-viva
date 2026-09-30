# Palavra Viva Constitution

## Core Principles

### I. Simplicidade e YAGNI

O código implementa apenas o que a especificação vigente exige. Não existe funcionalidade
especulativa, flag de recurso sem consumidor, nem abstração preparada para "futuro uso".

- Cada abstração resolve uma duplicação real ou uma fronteira real; abstrações antecipadas são
  removidas, não mantidas.
- Soluções devem ser as mais simples que tornem o comportamento correto.
- Ramificações de código devem ser eliminadas quando há equivalente, e justificadas em comentário
  quando permanecerem por restrição de plataforma (ex.: `ios`, `android`, `web`).
- Cada trecho declara uma única intenção; trechos que exigem interpretar várias instruções de
  uma vez MUST ser reescritos.

Racional: código não usado é custo de manutenção sem retorno. Complexidade acidental envenena a
evolução do produto, e o MVP do Palavra Viva é pequeno por definição.

### II. Responsabilidade Única e Coesão

Cada módulo, arquivo, função e componente tem uma única razão para mudar, e todo o código dentro
dele serve a essa razão. Código com duas responsabilidades MUST ser dividido antes de crescer.

- Funções fazem uma coisa e nomeiam essa coisa; o nome usa verbo e objeto claro.
- Componentes de UI contêm apresentação e composição local. Eles NÃO contêm acesso a rede,
  transformação de dados de domínio nem decisão de negócio.
- Hooks encapsulam um único recurso de dados ou de estado reutilizável e expõem uma API mínima.

Racional: coesão alta mantém o raio de mudança pequeno, o que reduz risco de regressão em um app
mobile com usuário final em produção.

### III. Fronteiras Explícitas e Dependências Unidirecionais

A arquitetura segue a cadeia de dependências
`app/` (rotas) -> `screens/` e componentes -> `hooks/` -> `services/` (API, storage) -> `types/`.
Nenhuma camada importa de uma camada superior.

- Formatação de dados acontece em `services/` (ex.: `verse-mapper.ts`); componentes consomem o
  modelo final, nunca o payload cru.
- Tipos compartilhados vivem em `src/types/` e são a única fonte de verdade para contratos de
  domínio.
- Configuração e chaves ficam centralizadas (`src/config/`, `src/query/keys.ts`); valor mágico
  repetido não existe no código.
- Efeitos colaterais ficam fora da árvore de renderização: nenhum componente de tela dispara
  escrita em storage ou mutação remota durante o render.

Racional: a direção única impede que a UI vire ponto de dependência do domínio e mantém o código
substituível (API, storage, banco).

### IV. Nomenclatura e Código Autodocumentado

Nomes comunicam intenção e domínio, em português quando refletem o domínio do produto (versículo,
decorado, dominado) e em inglês quando seguem convenção técnica.

- Nomes evitam abreviação, letra única e sufixo numérico sem significado.
- Comentários explicam o porquê, nunca o que já está evidente no código.
- Código morto não permanece. Workaround temporário é marcado com `TODO` contendo o motivo e a
  condição de remoção; `TODO` sem essas informações não passa na revisão.
- Função ou bloco longo é quebrado quando o nome deixa de descrever a operação.

Racional: o domínio do produto é em português; traduzir a noção de negócio para inglês degrada a
legibilidade de quem cuida do produto sem ganho técnico.

### V. Contratos Tipados e Tratamento de Erro Explícito

Todo limite de sistema tem contrato tipado e tratamento de erro explícito.

- `strict: true` permanece ativo. `any`, `@ts-ignore` e coerção silenciosa não são introduzidos
  sem justificativa escrita.
- Função assíncrona trata os três estados: carregando, sucesso e erro. Não existe caminho em que o
  usuário veja estado vazio sem feedback.
- Erro é traduzido para mensagem compreensível na fronteira de UI, preservando o erro técnico
  original para diagnóstico.

Racional: falha silenciosa ou erro cru destroem confiança do usuário mais rápido que qualquer
detalhe de interface.

### VI. Mudanças Pequenas e Código Sem Resíduo

Toda alteração é pequena, coesa e reversível, com o comportamento anterior preservado fora do
escopo declarado.

- Refatoração e mudança de comportamento não dividem o mesmo commit.
- Ao alterar uma função, o chamador é atualizado ou removido; não sobra chamador órfão de
  renomeação parcial.
- Feature flag, branch experimental e arquivo temporário não permanecem no repositório após a
  conclusão do trabalho.

Racional: mudanças pequenas são revisáveis e localizáveis; resíduo esquecido custa mais que o
recurso que o introduziu.

### VII. Segredos Fora do Controle de Versão

Nenhum segredo, credencial ou arquivo de ambiente real entra no git, em nenhuma hipótese. O
histórico do repositório é público e permanente: um valor commitado continua exposto mesmo depois
de apagado no HEAD.

- `.env` e toda variante de ambiente local MUST estar no `.gitignore`. A regra MUST usar negação
  ampla primeiro (`.env*`) e reabrir só o exemplo (`.env.example`), para que variantes futuras
  (`env.local`, `.env.production.local`) nasçam já cobertas.
- Arquivo de ambiente MUST ser lido por variável, nunca por valor embutido no código. Valor fixo
  no fonte é segredo versionado, mesmo quando a variável é `EXPO_PUBLIC_`.
- `.env.example` MUST permanecer versionado e MUST conter apenas o contrato: nome das variáveis,
  comentário do que é, e valor de marcador não funcional.
- Chave de serviço MUST NOT existir no cliente. No Expo, o bundle é distribuível, então `service_role`
  ou equivalente no código é exposição, não configuração.
- Segredo que já foi commitado MUST ser rotacionado. Remover o arquivo do HEAD não desfaz a
  exposição: o valor segue no histórico até ser rotacionado na origem.
- Credencial usada em teste MUST ser valor falso e obviamente fictício, nunca uma credencial que
  funcione em algum ambiente real.

Racional: `.env` versionado é a falha mais comum e mais irreversível de higiene de repositório. O
anon key do Supabase é público por projeto, mas o padrão de versionar `.env` é o que permite um
`service_role` ser commitado por engano depois, e exposição já ocorrida não se desfaz com um
`git rm`.

## Technical Constraints

- Runtime: Expo SDK 57 com expo-router e React Native 0.86; entry point permanece
  `expo-router/entry`.
- Linguagem: TypeScript com `strict: true`; o alias `@/*` aponta para `src/*`.
- Estado remoto: TanStack Query com chaves centralizadas; não existe cache manual fora de
  `src/query/client.ts`.
- Autenticação e persistência: Supabase via `src/auth/services/supabase.ts`, com credenciais em
  `expo-secure-store`.
- Estilo: segue o padrão já estabelecido (CSS modules onde já existe, `src/constants/theme.ts` para
  tokens). Segunda biblioteca de estilo só com aprovação registrada.
- Plataforma: divergência de comportamento é explícita por variante `.web.tsx` ou por guarda de
  plataforma; divergência implícita não existe.
- Ambiente: variável é lida de `process.env` no módulo que a consome, com falha explícita quando
  ausente. O cliente Supabase MUST NOT nascer com string vazia por fallback silencioso.
- Segredos: `.gitignore` cobre `.env*` com exceção explícita de `.env.example`, e nenhum valor real
  está no código-fonte.

## Quality Gates

- `npm run lint` passa sem erro antes de qualquer PR.
- `npx tsc --noEmit` passa sem erro; erro de tipo não é silenciado.
- Todo comportamento novo ou corrigido tem teste automatizado, ou verificação manual registrada na
  revisão quando não for automatizável sem equipamento real.
- Toda revisão checa conformidade com os Princípios I a VII e registra desvio como dívida técnica
  com plano de remoção.
- `git ls-files` não lista `.env` nem variante de ambiente que não seja `.env.example`. A revisão
  roda esse comando antes de aprovar; arquivo de ambiente versionado bloqueia o PR.
- Complexidade adicionada é justificada por requisito, no código ou na revisão, não apenas em
  conversa.

## Governance

Esta constituição prevalece sobre práticas informais, preferências de ferramenta e convenção
implícita do repositório. `AGENTS.md` e `CLAUDE.md` são guias de runtime: devem permanecer
alinhados a esta constituição, mas não a substituem.

Procedimento de emenda:

1. Alterações são propostas como patch em `.specify/memory/constitution.md`, junto da mudança de
   código ou de processo que a motiva.
2. A emenda só é aceita com justificativa registrada: o que muda, por que, e o que fica em dívida.
3. Remoção ou redefinição de princípio exige plano de migração dos trechos existentes antes da
   aprovação.

Política de versionamento (semver):

- MAJOR: remoção ou redefinição incompatível de um princípio.
- MINOR: princípio ou seção nova, ou expansão material de orientação existente.
- PATCH: esclarecimento, correção de redação, refino não semântico.

Revisão de conformidade: a cada PR, a revisão verifica os Princípios I a VII. Violação recorrente
gera plano de remediação com prazo, em vez de ser aceita como estado permanente. Arquivo de
ambiente versionado não é dívida: bloqueia o merge até ser removido do índice e a credencial
rotacionada.

**Version**: 1.1.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-09-30
