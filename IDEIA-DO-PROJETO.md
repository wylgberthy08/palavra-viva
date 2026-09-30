# Palavra Viva

## Visão do projeto

Palavra Viva é um aplicativo mobile para ajudar pessoas a ler, memorizar e revisitar versículos bíblicos de forma simples, leve e interativa.

A proposta é transformar o contato diário com a Bíblia em uma experiência curta e consistente. No MVP, o usuário encontra um versículo na Home, interage com o flashcard e marca o conteúdo como decorado para encontrá-lo depois na sua lista pessoal.

## Problema

Muitas pessoas desejam memorizar versículos, mas não conseguem manter uma rotina. A leitura pode parecer dispersa, e o conteúdo salvo acaba esquecido depois de alguns dias.

O Palavra Viva resolve isso com uma experiência direta:

- um versículo por vez;
- poucos passos para começar;
- prática baseada em flashcards;
- acompanhamento visual do progresso;
- coleção pessoal para revisar os versículos salvos.

## Público

O aplicativo é voltado principalmente para:

- pessoas que querem criar o hábito de ler a Bíblia diariamente;
- cristãos que desejam memorizar versículos;
- grupos de estudo, células e discipulados;
- usuários que preferem uma experiência mobile simples e sem excesso de informações.

## Experiência principal

### 1. Home

Na tela inicial, o usuário pode buscar uma referência ou usar a seleção guiada de livro, capítulo e versículo. O resultado aparece no flashcard principal da tela.

### 2. Flashcard de memorização

O versículo é apresentado como um desafio de memória:

- a frente mostra a referência;
- o usuário tenta lembrar o conteúdo;
- o toque ou botão revela o verso;
- o usuário pode marcar o versículo para continuar decorando.

Essa interação torna a leitura mais ativa do que simplesmente exibir um texto na tela.

### 3. Versículos decorados

Os versículos marcados ficam reunidos em uma lista pessoal. Cada item pode ser aberto para:

- revisar o conteúdo no flashcard;
- continuar como “Decorando”;
- marcar como “Dominado”;
- remover da coleção.

## Gamificação leve

A gamificação do Palavra Viva deve apoiar o hábito, sem transformar a leitura em uma competição exagerada.

Elementos presentes na experiência:

- missão diária;
- contador de versículos em progresso;
- barra visual de coleção;
- estados “Decorando” e “Dominado”;
- flashcards com interação de virar;
- sensação de avanço por pequenas conquistas.

O foco é criar constância e motivação, não premiar apenas a quantidade de conteúdo consumido.

## Princípios de produto

1. **Simplicidade:** cada tela deve ter uma ação principal clara.
2. **Foco:** quando o usuário estiver estudando um versículo, elementos secundários devem sair do caminho.
3. **Ritmo curto:** uma sessão precisa funcionar mesmo quando o usuário tem apenas alguns minutos.
4. **Revisão:** salvar um versículo deve levar naturalmente a uma próxima revisão.
5. **Acolhimento:** a interface deve parecer convidativa, clara e sem pressão.
6. **Privacidade:** os versículos salvos são mantidos localmente no aparelho, sem exigir login nesta primeira versão.

## Estrutura do MVP

O aplicativo é construído com Expo, React Native, TypeScript e Expo Router. As principais áreas são:

- **Início:** busca, versículo do dia e flashcard principal;
- **Decorados:** coleção e acompanhamento dos itens salvos;
- **Flashcard:** componente reutilizável para a prática de memorização;
- **Armazenamento local:** persistência dos versículos salvos no aparelho;
- **API bíblica:** carregamento de livros, capítulos, versículos e versículo do dia.

## Fora do escopo inicial

- tela de sessão separada;
- tab de busca independente;
- autenticação;
- lembretes;
- áudio;
- estatísticas avançadas.

## Próximos passos possíveis

- adicionar uma sequência de dias estudados;
- permitir lembretes de revisão;
- criar níveis de domínio baseados na frequência de revisão;
- adicionar categorias ou temas de estudo;
- permitir compartilhar um versículo como imagem;
- criar uma tela de estatísticas simples;
- oferecer diferentes versões bíblicas quando houver suporte adequado;
- incluir um modo de revisão com vários flashcards em sequência.

## Resultado esperado

Ao abrir o Palavra Viva, o usuário deve entender rapidamente o que fazer: buscar ou receber um versículo, interagir com o flashcard, marcá-lo como decorado e encontrá-lo depois na lista dedicada.

O sucesso do projeto não é medido pela quantidade de telas, mas pela capacidade de ajudar o usuário a guardar uma palavra bíblica e transformá-la em um hábito diário.
