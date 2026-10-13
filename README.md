# Palavra Viva

Aplicativo mobile para encontrar, estudar e memorizar versículos bíblicos. Busque uma passagem, tente lembrar o texto usando um flashcard e guarde os versículos para revisar depois.

## Capturas de tela

| Busca de versículos | Frente do flashcard |
|:--:|:--:|
| <img src="assets/screenshots/01-busca.png" alt="Tela inicial com campo de busca de versículos" width="220"> | <img src="assets/screenshots/02-frente-do-flashcard.png" alt="Flashcard com a referência antes de revelar o versículo" width="220"> |

| Versículo revelado | Coleção de versículos salvos |
|:--:|:--:|
| <img src="assets/screenshots/03-versiculo-revelado.png" alt="Flashcard mostrando o texto do versículo" width="220"> | <img src="assets/screenshots/04-versiculos-salvos.png" alt="Lista de versículos salvos com filtros de progresso" width="220"> |

## Funcionalidades

- Busca de versículos por referência, como `João 3:16`.
- Exploração de livros, capítulos e versículos da Bíblia.
- Flashcards para revelar o texto e praticar a memorização.
- Coleção pessoal de versículos com filtros **Todos**, **Decorando** e **Dominados**.
- Salvamento dos versículos no dispositivo.
- Cadastro, login, recuperação de senha e gerenciamento de conta com Supabase Auth.
- Tema claro/escuro de acordo com as preferências do dispositivo.

O conteúdo bíblico está configurado para **NVI (português do Brasil)** e é carregado pela API pública [midvash/bible-api](https://github.com/midvash/bible-api).

## Tecnologias

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- React Native e TypeScript
- Expo Router
- Supabase Auth
- TanStack Query
- AsyncStorage para os versículos salvos localmente
- Jest e React Native Testing Library

## Requisitos

- Node.js e npm
- Um projeto Supabase para autenticação
- Expo Go ou um emulador/simulador para executar o app

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um projeto no [Supabase](https://supabase.com/) e obtenha a URL do projeto e a chave pública (anon/publishable) em **Project Settings → API**.

3. Copie `.env.example` para `.env` e preencha as variáveis:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
   ```

   `EXPO_PUBLIC_BIBLE_BASE_URL` é opcional. Se não for definida, o app usa `https://api.midvash.com`.

4. No painel Supabase, configure as opções de autenticação por e-mail e os redirecionamentos necessários para o ambiente em que o app será executado.

Não publique valores privados no repositório. O `.env` é ignorado pelo Git; mantenha as chaves públicas nos parâmetros `EXPO_PUBLIC_*` e não coloque chaves administrativas no aplicativo.

## Executar

Inicie o servidor de desenvolvimento:

```bash
npx expo start
```

Use o QR code com o Expo Go ou selecione uma plataforma no terminal. Para iniciar diretamente:

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

Os comandos de simulador Android/iOS dependem do ambiente nativo correspondente. No iOS, é necessário macOS com Xcode.

## Testes e qualidade

```bash
npm test
npm run typecheck
npm run lint
```

Para executar todas as verificações em sequência:

```bash
npm run verify
```

## Estrutura do projeto

```text
src/
├── app/             # Rotas e telas Expo Router
├── auth/            # Autenticação e serviços de conta
├── components/      # Componentes compartilhados e flashcards
├── config/          # Configuração da API bíblica
├── hooks/           # Hooks de busca, leitura e versículos salvos
├── services/        # API bíblica e persistência local
└── types/           # Tipos de domínio
assets/
└── screenshots/     # Capturas exibidas neste README
supabase/
└── functions/       # Edge Functions do projeto
```

## Exclusão de conta

A exclusão de conta usa a Edge Function `delete-account`. Para disponibilizar essa ação no projeto Supabase, faça o deploy da função com a [Supabase CLI](https://supabase.com/docs/guides/functions):

```bash
supabase functions deploy delete-account
```

## Licença

Consulte o arquivo [LICENSE](LICENSE) para os termos de uso.
