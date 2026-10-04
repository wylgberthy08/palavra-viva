# Research: Recuperar Senha

Cada item registra a pergunta, o que foi verificado, onde, e a conclusão. Quando a fonte é
inferência e não documentação, isso está dito.

---

## R-001. O evento `PASSWORD_RECOVERY` funciona no React Native?

**Pergunta**: posso esperar `onAuthStateChange` disparar `PASSWORD_RECOVERY` quando o usuário
clica no link de recuperação, como mostra o exemplo da documentação?

**Resposta**: **não, no React Native.**

**Verificação**: leitura do código de `@supabase/auth-js` 2.117.1 instalado em
`node_modules/@supabase/auth-js/dist/module/GoTrueClient.js`. O método `isBrowser()` é:

```js
isBrowser() {
  return isBrowser;
}
```

com `const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'`. O
`PASSWORD_RECOVERY` só é emitido dentro de `_initialize()`, no bloco protegido por
`isBrowser() && this.detectSessionInUrl`. Em React Native não existe `document`, então
`_initialize()` nunca faz o parse da URL.

**Duplo agravante neste projeto**: mesmo na web, `detectSessionInUrl` está `false` em
`src/auth/services/supabase.ts`, o que faria a condição ser falsa nos dois casos.

**Conclusão**: o fluxo **não pode** depender de `PASSWORD_RECOVERY`. O deep link precisa ser lido
pelo app. Isso é refletido no FR-006.

**Nota sobre a doc**: o exemplo de recuperação de senha da documentação oficial é
`forgot-password.html` com `prompt()` e `onAuthStateChange` — é um exemplo de browser. A página de
deep linking nativo não cobre recuperação de senha; cobre OAuth e magic link, e usa
`setSession`. Não há conflito entre a doc e este achado, apenas um buraco de cobertura.

---

## R-002. Qual é o caminho documentado para tratar o link no nativo?

**Verificação**: pesquisa na doc "Native Mobile Deep Linking", painel `react-native`.

O único tratamento concreto é genérico:

```tsx
const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token) return;
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
};
```

E o tratamento do link entrando no app:

```tsx
const url = Linking.useLinkingURL();
if (url) createSessionFromUrl(url);
```

**Conclusão**: a doc oficial manda usar `setSession` com os tokens lidos da URL. É exatamente o
desenho adotado (FR-005). `exchangeCodeForSession` e `verifyOtp` **não aparecem** na doc de nativo.

---

## R-003. Por que não trocar para PKCE?

**Pergunta**: o fluxo implícito põe `access_token` na URL. Não seria melhor PKCE?

**Conclusão**: não, neste escopo.

Três razões, em ordem de peso:

1. **Blast radius**. `flowType` é opção do **cliente**, não por operação. Trocá-lo para `pkce`
   altera `signIn`, `signUp` e toda a sessão, não só a recuperação. Uma feature de recuperação não
   pode redefinir o fluxo de autenticação do app inteiro.
2. **A doc oficial de React Native não documenta PKCE.** `flowType`, `PKCE`, `implicit` e
   `code_challenge` têm **zero ocorrências** na página. Seria construir sem referência.
3. **PKCE quebra recuperação entre dispositivos.** O code verifier fica no armazenamento do app que
   **solicitou** o link. Se o usuário pedir a recuperação no celular e abrir o e-mail no notebook, o
   `exchangeCodeForSession` falha. No fluxo implícito os tokens são autocontidos e funcionam em
   qualquer dispositivo que abra o link.

**Trade-off aceito**: o token trafega no fragmento da URL. Como o deep link é nativo e o destino é
`palavraviva://auth-callback`, não há histórico de navegador nem `Referer` envolvido. Em Go/Unix
tokens aparecem em logs de processo, o que não se aplica a um app mobile.

Se, no futuro, o requisito virar "recuperação na web também", aí sim é hora de reavaliar PKCE, e
aí a limpeza de fragmento no histórico entra na spec.

---

## R-004. `security_update_password_require_current_password` trava a recuperação?

**Pergunta**: com a opção ligada no painel, `updateUser({ password })` funciona numa sessão vinda de
recovery?

**Resposta**: **desconhecida. Este é o gate da Fase 0.**

**Verificação**: a configuração no projeto `rltwtgdhojxkdkbdenbj` está `True`. O `.d.ts` instalado
declara, sobre `UserAttributes.current_password`:

> This is only ever present when the user is resetting their password and
> `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD` is true.

A documentação de password reset descreve `updateUser({ password })` apenas no cenário de
**usuário logado**. Não cobre sessão de recovery. O código do GoTrue não está disponível para
conferência.

**Por que não dá para contornar**: se a exigência valer, o usuário precisa informar `current_password`
— que é exatamente a senha que ele esqueceu. Não há caminho no cliente.

**Por que é plausível que funcione**: a flag existe para impedir que um atacante com sessão roubada
troque a senha. Uma sessão de recovery foi criada provando posse do e-mail, o que é uma prova mais
forte que a senha atual. É razoável que o GoTrue isente esse caso. **Isso é hipótese, não fato.**

**Consequência para o plano**: a Fase 0 existe para medir. Se falhar, a correção é desativar a flag
no painel, não alterar código.

---

## R-005. Onde está o guard de sessão?

**Verificação**: leitura de `src/app/_layout.tsx`, `src/app/(auth)/_layout.tsx` e
`src/app/(tabs)/_layout.tsx`.

`src/app/_layout.tsx` **não** redireciona nada — só monta `QueryClientProvider`, `AuthProvider`,
`SavedVersesProvider`, `ThemeProvider` e o `Stack`.

O guard está em `src/app/(tabs)/_layout.tsx:11-19`:

```tsx
useEffect(() => {
  if (!loading && !user) {
    router.replace('/(auth)/login');
  }
}, [user, loading, router]);
if (loading || !user) return null;
return <AppTabs />;
```

**Conclusão**: só o grupo `(tabs)` é protegido. Rotas em `(auth)` **não** são redirecionadas por uma
sessão ativa. Depois que `setSession` roda, o `AuthProvider` recebe `SIGNED_IN` e passa a ter
`user`, mas nada manda o usuário para as tabs — a rota atual continua.

**Isso é o que faz o desenho funcionar**: as telas de recuperação ficam em `(auth)` e a sessão de
recovery coexiste com a tela sem conflito. Daí o FR-013.

**Risco a registrar**: a Onda 3 da spec 002 reescreve `src/auth/index.tsx`. Se essa reescrita mover o
guard para `_layout.tsx` raiz, o desenho quebra e a spec precisa ser reavaliada.

---

## R-006. `palavraviva://auth-callback` resolve para a rota `/auth-callback`?

**Verificação**: `expo-linking` 57.0.10, `createURL.d.ts`:

> - Development and production builds: `<scheme>://path`

E o `expo-router` 57.0.21, em `build/fork/getStateFromPath-forks.js`, aplica
`stripGroupSegmentsFromPath` ao caminho resolvido, removendo o nome do grupo.

**Conclusão**: `palavraviva://auth-callback` resolve para o caminho `auth-callback`, e como o grupo
`(auth)` é removido do caminho, o arquivo `src/app/(auth)/auth-callback.tsx` serve a URL
`/auth-callback`. Confirmado.

---

## R-007. Onde os tokens do link ficam dentro do app? *(achado que define a implementação)*

**Pergunta**: `useLocalSearchParams()` entrega `access_token` pronto, ou o fragmento precisa ser
parseado à mão?

**Resposta**: **precisa ser parseado à mão**, e o fragmento chega inteiro na chave `'#'`.

**Verificação**: `node_modules/expo-router/build/fork/getStateFromPath-forks.js`, função
`parseQueryParams`:

```js
function parseQueryParams(path, route, parseConfig, hash) {
    const searchParams = parseUrlUsingCustomBase(path).searchParams;
    const params = Object.create(null);
    if (hash) {
        params['#'] = hash.slice(1);
    }
    for (const name of searchParams.keys()) {
        // ... params[name] = ...
    }
    return Object.keys(params).length ? params : undefined;
}
```

O hash é lido em `getUrlWithReactNavigationConcessions` (`parsed.hash`) e repassado como argumento.
O resultado é que **o fragmento inteiro vira uma única chave chamada `#`**, com o `#` removido. Os
pares do fragmento **não** viram chaves separadas.

**Consequência direta**: `useLocalSearchParams().access_token` é `undefined`. O fragmento
`access_token=X&refresh_token=Y` chega como a string `'access_token=X&refresh_token=Y'`, sob a chave
`'#'`.

**Por que isso é bom**: transforma o parsing em uma função pura de string para união discriminada,
trivialmente testável, sem mock de Linking. É exatamente a forma de `extrairCredenciaisDoLink` que o FR-007
descreve.

**Cuidado registrado**: `useLocalSearchParams` aplica `decodeURIComponent` em cada valor, com
`try/catch` que preserva o bruto em caso de erro. Ou seja, o fragmento chega **já decodificado** e
só depois será dividido por `&` e `=`. Isso é seguro para tokens JWT do GoTrue, que usam apenas
caracteres base64url (`.`, `-`, `_`) e não contêm `&` nem `=` codificado. Ainda assim, o serviço deve
fazer o parse defensivo, sem assumir formato.

---

## R-008. Por que não usar `expo-linking` para pegar a URL?

**Verificação**: `ParsedURL` em `node_modules/expo-linking/build/Linking.types.d.ts` tem exatamente
quatro campos: `scheme`, `hostname`, `path`, `queryParams`. **Não existe campo de hash ou fragmento.**
`parse()` e `parseInitialURLAsync()` portanto **não** devolvem os tokens.

**Conclusão**: usar `expo-linking` exigiria `getInitialURL()` para o caso de app frio mais
`addEventListener('url', ...)` para o caso de app quente, e parse manual do fragmento de qualquer
forma.

**Decisão**: usar `useLocalSearchParams()['#']`, que cobre app frio e app quente com uma linha, sem
import, sem listener e sem subscription. `expo-router` já faz o roteamento e a extração.

**Nota de dependência**: `expo-linking` 57.0.10 está instalado, mas como dependência **transitiva**
do `expo-router`, não declarada no `package.json`. Se alguma decisão futura exigir importá-lo
diretamente, ele precisa ser adicionado como dependência direta, sob o Princípio IX. Com a decisão
acima, não é preciso.

---

## R-009. O link funciona em Expo Go?

**Resposta**: **não**.

**Verificação**: `expo-linking` `createURL.d.ts`, sobre Expo Go:

> Development and production builds: `<scheme>://path`
> Expo Go (dev): `exp://128.0.0.1:8081/--/path`

O GoTrue redireciona para `palavraviva://auth-callback`, que é o scheme do app instalado. O Expo Go
registra `exp://`, não `palavraviva://`. Um link de recovery aberto durante o desenvolvimento no Expo
Go **não abre a tela de recuperação**.

**Consequência**: a validação manual da Fase 0 e dos cenários do `quickstart.md` exige
**development build** (`npx expo run:android` ou `EAS Build --profile development`), não Expo Go. Isso
vale para iOS também: sem `ios.bundleIdentifier` em `app.json`, o build tem de ser gerado. Registrado
no `quickstart.md` como pré-requisito.

---

## R-010. O e-mail de recuperação entrega link utilizável?

**Verificação**: Management API, `mailer_templates_recovery_content` do projeto. O template atual,
customizado e **em inglês**:

```html
<h2>Reset your password</h2>

<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>

<p>If you didn't request this, you can safely ignore this email.</p>
```

**Conclusão**: o placeholder `{{ .ConfirmationURL }}` está correto e produz o link que o GoTrue
redireciona para `palavraviva://auth-callback`. A mecânica funciona. O que falta é o idioma (FR-016).

`mailer_otp_exp` é 3600 s, então o link expira em 1 hora — é a origem do cenário 11 da US3.

---

## R-011. O limite de envio inviabiliza a validação?

**Verificação**: `rate_limit_email_sent` é `2`. `smtp_host`, `smtp_port`, `smtp_user` e
`smtp_sender_name` estão vazios, ou seja, SMTP embutido do Supabase.

**Conclusão**: 2 e-mails por hora, no total, para todo o projeto. Um cenário de recuperação gasta 1
deles. Com US1, US2 e US3, cada rodada de validação estoura o limite.

**Decisão**: SMTP próprio (FR-017). Não há alternativa: validar a funcionalidade repetidamente é
obrigatório, e o limite embutido não permite.

**Nota de segurança**: com SMTP próprio e `security_captcha_enabled` em `False`, o endpoint de
recuperação fica mais exposto a abuso por e-mail bombing. Considerar `rate_limit_email_sent` mais
estrito que 2 **depois** do SMTP estar configurado, para não travar o desenvolvimento. Registrado
como item de backlog, não como escopo.

---

## R-012. Por que as telas novas não podem usar `Alert.alert`?

**Verificação**: `002-refatoracao/plan.md`, itens 3.12 e 3.13:

> 3.12 | `src/components/ui/confirm-dialog.tsx` | Novo: substituto de `Alert.alert` para confirmação
> 3.13 | `src/auth/screens/*.tsx`, `src/app/(tabs)/meus.tsx` | Trocar os 6 `Alert.alert` por mensagem em tela

`RegisterScreen.tsx:43,50,51` e `LoginScreen.tsx:38` usam `Alert.alert` hoje.

**Conclusão**: a Onda 3 elimina `Alert.alert` das telas de auth. Telas de recuperação criadas depois
não devem introduzi-lo, sob pena de a 003 gerar a dívida que a 002 está removendo. Daí o FR-012.

**Detalhe de cor**: `Alert.alert` é modal e bloqueante; mensagem em tela é visível junto com o campo
que contém o erro, o que é melhor para o usuário. Este é o motivo do padrão, não só estilo.

---

## R-013. Onde está o `6` da senha, e por que precisa sair do lugar?

**Verificação**: `src/auth/screens/RegisterScreen.tsx`:

- linha 50-51: `if (password.length < 6) { Alert.alert('Senha curta', 'A senha deve ter pelo menos 6 caracteres.'); }`
- linha 128: `placeholder="Mínimo 6 caracteres"`

`LoginScreen.tsx` não valida tamanho, corretamente: no login a senha é a que está sendo testada.

**Conclusão**: subir `password_min_length` para 8 exige tocar **dois** lugares de um arquivo que a
Onda 3 da 002 vai reescrever, e o valor é conhecimento de configuração do backend repetido no
frontend. Extrair para constante compartilhada é o Princípio III aplicado a um valor que hoje está
duplicado (FR-015).

**Contrapartida**: quebrar a senha de quem já tem conta com menos de 8 caracteres **não** acontece —
a flag só vale para senha nova. Mas quem recover a senha e escolher 6 caracteres vai receber erro do
backend. A validação do cliente precisa bater com o painel, daí a constante.

---

## R-014. Por que encerrar a sessão depois de trocar a senha?

**Pergunta**: depois de `updateUser`, o app deve manter o usuário logado ou voltar ao login?

**Decisão**: `signOut()` e voltar ao login (FR-010).

**Motivos**:

1. **Fecha o escopo do token de recovery.** A sessão que o GoTrue criou para permitir a troca
   Shackle-free é uma sessão com privilégio elevado. Deixá-la viva depois da troca significa que um
   app em foreground continua com aquela sessão, em vez de uma sessão normal criada por login.
2. **`refresh_token_rotation_enabled` está `True`.** Cada renovação gera token novo. Uma sessão
   deixada viva continua renovando tokens com base no que foi emitido durante o recovery.
3. **Confirma a senha nova.** Voltar ao login e exigir a senha nova é a única prova de que ela
   realmente foi gravada, e é o que o usuário espera.

**Contrapartida**: é uma navegação extra. Aceitável, porque é a única forma de o usuário confirmar
que a nova senha funciona.

---

## R-015. `Sign in failed` como mensagem de link inválido?

**Pergunta**: o GoTrue devolve os tokens com `error_code` e `error_description` no fragmento quando
o link é inválido ou expirado?

**Resposta**: **sim**, é o comportamento documentado da doc de redirect URLs: erros voltam como query
fragment na URL de redirect.

**Conclusão**: `extrairCredenciaisDoLink` precisa inspecionar `error_code`/`error_description` antes de
procurar `access_token`, e traduzir os códigos conhecidos para português em vez de exibir
`error_description` cru. Códigos a tratar: `otp_expired`, `access_denied`, e o caso genérico de
fragmento ausente. Mapeados em `data-model.md`.

---

## R-016. O projeto precisa de tabela nova?

**Resposta**: **não.**

Levantamento: o projeto não tem nenhuma tabela no Supabase. Não há chamada a `.from()`, `.rpc()` ou
Storage. Versículos decorados vivem em `AsyncStorage` sob `@palavra-viva/saved-verses/v1`.

A recuperação de senha é inteiramente gerenciada pelo GoTrue. Não há migration, nenhuma tabela, e
portanto nenhum contrato de dados com o backend. Registrado para que a ausência de
`contracts/` nesta spec seja deliberada e não um esquecimento.

---

## Itens de backlog (fora do escopo, registrados para não se perderem)

| Item | Motivo |
|---|---|
| Recuperação na web | Exige URL HTTPS pública e `site_url` de produção. Com `output: "static"` não há servidor para o callback. |
| Limpeza do fragmento no histórico da web | Só faz sentido no fluxo implícito em web. Fora de escopo. |
| PKCE | Ver R-003. Vale se e quando houver recuperação web. |
| `security_captcha_enabled` | Com SMTP próprio, habilita CAPTCHA para conter abuso no endpoint de recuperação. |
| `mailer_notifications_password_changed_enabled` | Notificar a senha alterada é boa prática de segurança. Está `False`. |
| Limite estrito de envio | Hoje `rate_limit_email_sent` é 2, o que é baixo demais para produção. Definir **depois** do SMTP próprio. |
| Universal Links / AASA | `app.json` não tem `ios.bundleIdentifier`. Universal Links exige hospedar o AASA em infraestrutura própria; o Supabase não hospeda. |
| `ios.bundleIdentifier` | Ausente. Não bloqueia o deep link por scheme, mas é pré-requisito para distribuição iOS. |
| `password_hibp_enabled` | `False`. Verificar contra listas de senhas vazadas é melhoria de segurança à parte. |