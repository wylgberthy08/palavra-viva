# Quickstart: Recuperar Senha

Guia de verificação manual. Cada cenário aponta o requisito que comprova.

## Prév-requisitos

- [ ] **Onda 3 da spec 002 concluída.** Esta spec foi escrita para rodar depois dela.
- [ ] Acesso ao painel do Supabase do projeto `rltwtgdhojxkdkbdenbj`.
- [ ] Um e-mail real que você controle, para receber o link.
- [ ] **Development build, não Expo Go.** O GoTrue redireciona para `palavraviva://auth-callback`.
      O Expo Go registra `exp://`, e o link de recovery **não abre a tela de recuperação** nele.
      Ver `research.md` R-009.

      ```
      npx expo run:android          # ou: eas build --profile development --platform android
      ```

      Nota: `app.json` não tem `ios.bundleIdentifier`. Um build iOS precisa dele configurado antes.

- [ ] Gates de qualidade verdes:
      ```
      npm run typecheck
      npm run lint
      npm test
      ```

---

## Fase 0 — Gate bloqueante (fazer antes de escrever qualquer código)

Esta fase responde uma pergunta que a documentação oficial **não** responde: o projeto tem
`security_update_password_require_current_password` igual a `True`, e não está documentado se
`updateUser({ password })` funciona numa sessão vinda de link de recuperação.

Se exigir `current_password`, a funcionalidade não existe — o usuário precisa da senha que esqueceu.

### Cenário 0.1 — O gate (SC-007)

> **Estado**: ⏳ **não executado**. Esta fase é o caminho crítico. Nada da Fase 3 pode ser validada
> sem ela.

A pergunta que precisa de resposta: **o GoTrue aceita `updateUser({ password })` numa sessão vinda
de link de recuperação, sem `current_password`?**

Motivo de a resposta não ser óbvia: o projeto tem
`security_update_password_require_current_password` igual a `True`, e a documentação do Supabase
descreve `updateUser({ password })` apenas para usuário **logado**. Não há cobertura do caso
recovery.

**Preparo** — 20 min, uma vez:

```bash
git switch 003-recuperar-senha
npx expo run:android          # development build; Expo Go não serve (research.md R-009)
```

**Execução**:

1. Painel → Authentication → Sign In / Providers → anote o estado da opção de senha atual.
2. No app, abra `/(auth)/forgot-password` **quando a Fase 3 existir**. **Enquanto ela não existir**,
   use um caminho manual:
   - Peça a recuperação pelo próprio painel: Authentication → Users → seu usuário → ⋮ → *Send
     recovery email*. Isso não depende do app.
   - Abra o e-mail e toque no link.
   - Confirme que o app abre. Sem a rota `/(auth)/auth-callback`, ele vai abrir e cair numa tela
     inexistente ou no 404 do expo-router. **Isso ainda confirma que o deep link funciona**, que é o
     que este passo precisa medir.
3. Para medir o `updateUser` sem a tela, cole no console do Metro com o app aberto pelo link:

```js
const { data, error } = await supabase.auth.updateUser({ password: 'SenhaNovaDeTeste123' });
console.log('error:', error);
```

`supabase` precisa estar exposto. Se não estiver no bundle, o passo mais simples é criar uma conta
nova no app, pedir a recuperação para ela e usar o e-mail de teste durante os testes — o objetivo é
medir o comportamento do GoTrue, não testar a tela.

4. Tente entrar com a senha antiga. Deve falhar.

**Resultado esperado**: `error` é `null` e o login antigo falha.

### Registro do resultado

Preencher antes da Fase 3. Registrado como pendente em `plan.md`, seção "Estado da execução".

| Campo | Valor |
|---|---|
| Data | ⏳ pendente |
| `security_update_password_require_current_password` antes | ⏳ pendente |
| O deep link `palavraviva://auth-callback` abriu o app? | ⏳ pendente |
| `updateUser` retornou erro? | ⏳ pendente |
| Se sim, qual `error.message`? | ⏳ pendente |
| Login com a senha antiga falhou? | ⏳ pendente |
| **Veredito** | ⏳ **não concluído** |

### Se o veredito for ❌

Desativar `security_update_password_require_current_password` no painel e repetir o Cenário 0.1.
**Nenhum código muda.** Anotar a decisão, porque desativar a flag é uma mudança de segurança que
precisa ser consciente.

### Cenário 0.2 — O e-mail chega e o link abre o app

1. Peça a recuperação de novo e abra o link.
2. O app abre na rota de recuperação.

Se o app não abrir e o navegador reclamar de esquema desconhecido, o link foi aberto num dispositivo
sem o app instalado. Registrar como limitação conhecida, não como falha.

### Cenário 0.3 — O painel e o cliente concordam sobre o tamanho da senha (FR-015)

1. Painel → Authentication → Sign In / Providers → confirme `password_min_length` igual a `8`.
2. No cadastro, tente criar conta com senha de 6 caracteres.

O resultado esperado depende da ordem de execução:

- **Se a Fase 1 do plano já rodou**: o cliente rejeita antes de chamar a rede, e a mensagem diz 8.
- **Se ainda não rodou**: o painel rejeita, e a mensagem em tela é a do GoTrue, em inglês. É o estado
  intermediário aceitável, mas não é o estado final.

Registrar qual dos dois happened.

---

## Cenário 1 — Recuperação completa (SC-001, SC-002)

Cobre US1, FR-001 a FR-010.

1. Faça logout no app.
2. Abra `/(auth)/login` e toque em "Esqueci minha senha".
3. Informe o e-mail da conta e confirme.
4. Verifique a mensagem exibida. Ela deve ser **genérica**.
5. Abra o e-mail e toque no link. O app deve abrir na tela de nova senha.
6. Informe uma senha nova com 8 ou mais caracteres, duas vezes.
7. Confirme. O app deve voltar à tela de entrada.
8. Entre com a senha nova. Deve entrar.
9. Tente entrar com a senha antiga. Deve falhar com mensagem genérica de credenciais.

**Interrompa aqui se o passo 9 falhar.** A senha antiga continuar válida significa que a mudança
não foi persistida.

---

## Cenário 2 — A resposta não revela quem tem conta (SC-003, SC-004)

Cobre US2, FR-003, FR-004.

1. Na tela de solicitação, informe um e-mail que **não** existe.
2. Anote o texto exato da mensagem.
3. Repita com um e-mail que **existe**.
4. Compare. Os dois textos devem ser **idênticos**, palavra por palavra.
5. Repita rápido várias vezes com o mesmo e-mail, até estourar o limite de envio.
6. A mensagem deve continuar a mesma, sem mencionar limite.

Se o texto variar entre os passos 2 e 4, a US2 está violada.

---

## Cenário 3 — Link inválido, expirado e duplo toque (SC-005)

Cobre US3, FR-007.

### 3.1 — Link sem tokens

Abra o app e acesse `palavraviva://auth-callback` sem fragmento. Para simular pela rota web local, use
a barra de endereço do dev server com o fragmento vazio.

Esperado: mensagem de link inválido, com opção de pedir um novo. **Não** uma tela carregando.

### 3.2 — Link expirado

1. Peça a recuperação.
2. **Não** abra o link. `mailer_otp_exp` é 3600 s.
3. Após mais de 1 hora, abra o link.

Esperado: mensagem de expirado, com opção de reenvio. Confirme que **não** aparece
`error_description` em inglês.

### 3.3 — Duplo toque no link

Abra o mesmo link duas vezes seguidas, rapidamente.

Esperado: o mesmo destino final, sem erro e sem tela em branco.

### 3.4 — App fechado durante a sessão de recuperação

1. Abra o link e pare na tela de nova senha.
2. Feche o app completamente.
3. Abra o app de novo, sem clicar no link outra vez.

Esperado: volta para a tela de nova senha, usando a sessão salva.

Se voltar para o login, o requisito US3 cenário 12 não está atendido.

---

## Cenário 4 — Validação da senha nova (US1, FR-009)

Cobre FR-009 e a regra de confirmação.

1. Na tela de nova senha, confirme com senhas diferentes.
2. Esperado: mensagem de que não conferem, **sem** alteração de senha.
3. Confirme com menos de 8 caracteres.
4. Esperado: mensagem de tamanho mínimo, **sem** alteração de senha.
5. Confirme com a **mesma senha antiga**, com 8 ou mais caracteres.
6. Esperado: o GoTrue rejeita, e a mensagem é a traduzida, não a original em inglês.

O passo 6 comprova a tradução de erro do FR-011.

---

## Cenário 5 — Erros sem vazamento técnico (SC-004)

Cobre FR-011.

Em qualquer tela do fluxo, nenhum destes pode aparecer:

- `error_description` do GoTrue
- `AuthApiError`
- `WeakPasswordError`
- `Error: {` de JSON
- Stack trace

Verificar especificamente no Cenário 3.2, que é onde o GoTrue devolve `error_description` com texto
técnico.

---

## Cenário 6 — Cobertura automatizada (SC-006)

```
npm run typecheck
npm run lint
npm test
npm run check:dead
npm run check:styles
```

`check:dead` importa: entram três telas, um serviço e uma constante. Se algum ficar órfão, o gate
acusa.

Confirmar que os casos abaixo existem em `__tests__/auth/password-recovery.test.ts`:

- [ ] fragmento com os dois tokens
- [ ] fragmento sem `access_token`
- [ ] fragmento ausente
- [ ] `error_code=otp_expired`
- [ ] `error_code=access_denied`
- [ ] e-mail existente e inexistente com respostas idênticas
- [ ] senha abaixo do mínimo rejeitada sem chamada de rede

---

## Cenário 7 — Configuração do projeto

Cobre FR-015, FR-016, FR-017. Cada item é verificado **por leitura da Management API** depois de
aplicado, não por confiança.

| Item | Valor esperado | Aplicado | Verificado |
|---|---|---|---|
| `password_min_length` | `8` | [ ] | [ ] |
| `mailer_templates_recovery_content` | português, com `{{ .ConfirmationURL }}` | [ ] | [ ] |
| `smtp_host` | preenchido | [ ] | [ ] |
| `rate_limit_email_sent` | acima de 2 | [ ] | [ ] |
| `uri_allow_list` | contém `palavraviva://auth-callback` | [ ] | [ ] |
| `site_url` | **não mexer** | — | [ ] |

Com SMTP próprio, o envio deixa de ter o teto de 2/hora. Isso é o que permite repetir os Cenários 1
e 2 várias vezes durante o desenvolvimento.

**Nada de credencial de SMTP entra no repositório.** Elas vivem só no painel.

---

## Diagnóstico

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Link abre o navegador, não o app | App não instalado, ou aberto no Expo Go | Usar development build. `research.md` R-009. |
| App abre e vai direto para as tabs | A sessão de recovery disparou `SIGNED_IN` e algo redirecionou | Verificar se o guard saiu de `(tabs)/_layout.tsx`. `research.md` R-005. |
| `Redirect URL is not allowed` | A `uri_allow_list` do painel mudou | Readicionar `palavraviva://auth-callback`. |
| `Invalid Refresh Token: Refresh Token Not Found` | Link já consumido, ou sessão encerrada | Pedir novo link. |
| E-mail não chega | Limite de envio estourado, ou SMTP mal configurado | Conferir `rate_limit_email_sent` e `smtp_host` no painel. |
| `useLocalSearchParams().access_token` é `undefined` | **Comportamento esperado, não bug** | O fragmento vem na chave `'#'`. `research.md` R-007. |
| `updateUser` pede `current_password` | O gate da Fase 0 falhou | Desativar a flag no painel. `research.md` R-004. |
| `Alert.alert` aparece no fluxo | Tela nova violou FR-012 | Converter para mensagem em tela. |
| Tela de recuperação some ao voltar | Guard movido para `_layout.tsx` raiz | Reavaliar a spec. |