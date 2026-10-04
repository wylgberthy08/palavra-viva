import { supabase } from './supabase';

/**
 * Destino do link de recuperação. Tem que ser idêntico ao que está na
 * `uri_allow_list` do painel: um destino fora da lista faz o GoTrue recusar o
 * redirecionamento e devolver `error=access_denied` no link. Ver `spec.md` FR-002.
 */
export const REDIRECT_URL_RECUPERACAO = 'palavraviva://auth-callback';

/** Pares do fragmento que o GoTrue devolve no link de recuperação. */
const PARAMETRO_ACCESS_TOKEN = 'access_token';
const PARAMETRO_REFRESH_TOKEN = 'refresh_token';
const PARAMETRO_ERROR_CODE = 'error_code';

/**
 * Como o GoTrue nomeia a causa da recusa, e o que dizemos ao usuário.
 *
 * Um código fora desta lista vira `malformado`, e o `error_description` é
 * descartado: ele traz texto interno do GoTrue, que muda entre versões e não
 * deve chegar à tela (FR-011).
 *
 * TODO(003): exportar `MENSAGEM_POR_MOTIVO` quando `AuthCallbackScreen`
 * existir. Motivo: a Fase 3 da spec `003-recuperar-senha` está bloqueada pela
 * Onda 3 da `002-refatoracao`, e exportar agora deixaria `check:dead` vermelho.
 * Condição de remoção: o export volta junto com a tela, na tarefa T022.
 */
const MOTIVO_POR_ERROR_CODE: Record<string, MotivoLinkInvalido> = {
  otp_expired: 'expirado',
  access_denied: 'negado',
};

const MENSAGEM_POR_MOTIVO: Record<MotivoLinkInvalido, string> = {
  expirado: 'Este link expirou. Peça um novo para continuar.',
  negado: 'Este link não é válido. Peça um novo para continuar.',
  malformado: 'Não conseguimos ler este link. Peça um novo para continuar.',
};

/** Mensagem para uma falha de `updateUser` que não sabemos interpretar. */
const MENSAGEM_FALHA_GENERICA =
  'Não foi possível atualizar sua senha. Tente novamente.';

const MENSAGEM_SOLICITACAO =
  'Não foi possível enviar o e-mail. Verifique sua conexão e tente de novo.';
const MENSAGEM_LINK_EXPIRADO = MENSAGEM_POR_MOTIVO.expirado;

/**
 * Tradução de `error.message` do GoTrue para português.
 *
 * A comparação é por substring e não por igualdade porque o GoTrue varia a
 * pontuação e a ordem das palavras entre versões.
 */
const TRADUCAO_DE_FALHA: readonly { marca: string; mensagem: string }[] = [
  {
    marca: 'should be different from the old password',
    mensagem: 'A nova senha precisa ser diferente da atual.',
  },
  {
    marca: 'Password should be at least',
    mensagem: 'A nova senha precisa ter pelo menos 8 caracteres.',
  },
  { marca: 'Auth session missing', mensagem: MENSAGEM_LINK_EXPIRADO },
];

/** Credenciais que o link de recuperação carrega no fragmento. */
export type CredenciaisDoLink = {
  accessToken: string;
  refreshToken: string;
};

/** Por que o link não pode ser usado. Todos levam à mesma ação: pedir outro. */
export type MotivoLinkInvalido = 'expirado' | 'negado' | 'malformado';

export type ResultadoLink =
  | { status: 'valido'; credenciais: CredenciaisDoLink }
  | { status: 'invalido'; motivo: MotivoLinkInvalido };

/**
 * Resultado de pedir a recuperação.
 *
 * O caso `falha_de_rede` cobre apenas a impossibilidade de falar com o
 * servidor. E-mail inexistente, limite de envio e e-mail malformado chegam
 * todos como `confirmado`, porque distinguir os quatro seria revelar quem tem
 * conta (FR-003).
 */
export type ResultadoSolicitacao =
  | { status: 'confirmado' }
  | { status: 'falha_de_rede'; mensagem: string };

export type ResultadoAtualizacao =
  | { status: 'atualizada' }
  | { status: 'falha'; mensagem: string };

/**
 * Lê um valor do fragmento.
 *
 * `URLSearchParams` não é usado de propósito: ele não está garantido no runtime
 * do React Native, e a gramática de que precisamos é pequena o bastante para
 * ficar explícita. O `decodeURIComponent` é tolerante a falha porque um `%`
 * isolado não deve custar o link inteiro.
 */
function lerParametro(fragmento: string, nome: string): string | undefined {
  for (const par of fragmento.split('&')) {
    const separador = par.indexOf('=');
    if (separador === -1) continue;
    if (par.slice(0, separador) !== nome) continue;

    const bruto = par.slice(separador + 1);
    try {
      return decodeURIComponent(bruto);
    } catch {
      return bruto;
    }
  }
  return undefined;
}

/**
 * Extrai as credenciais do fragmento do deep link.
 *
 * Função pura de propósito: é o único lugar onde mora a decisão de link
 * inválido, e testá-la não exige mock de Linking, de expo-router nem de rede.
 *
 * O `error_code` é consultado antes dos tokens porque o GoTrue pode mandar os
 * dois juntos quando o link é usado depois de expirado, e o token não
 * ressuscita o link.
 */
export function extrairCredenciaisDoLink(fragmento: string | undefined): ResultadoLink {
  if (!fragmento) {
    return { status: 'invalido', motivo: 'malformado' };
  }

  const errorCode = lerParametro(fragmento, PARAMETRO_ERROR_CODE);
  if (errorCode !== undefined) {
    return { status: 'invalido', motivo: MOTIVO_POR_ERROR_CODE[errorCode] ?? 'malformado' };
  }

  const accessToken = lerParametro(fragmento, PARAMETRO_ACCESS_TOKEN);
  const refreshToken = lerParametro(fragmento, PARAMETRO_REFRESH_TOKEN);

  if (!accessToken || !refreshToken) {
    return { status: 'invalido', motivo: 'malformado' };
  }

  return { status: 'valido', credenciais: { accessToken, refreshToken } };
}

/**
 * Pede o e-mail de recuperação.
 *
 * Nunca lança. O único `{ status: 'falha_de_rede' }` é a impossibilidade de
 * falar com o servidor, que é algo o usuário pode corrigir. Qualquer erro
 * devolvido pelo GoTrue vira `confirmado`, para que o e-mail exista, não exista
 * ou tenha estourado limite produzam a mesma tela.
 */
export async function solicitarRecuperacaoDeSenha(email: string): Promise<ResultadoSolicitacao> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: REDIRECT_URL_RECUPERACAO,
    });

    if (error) {
      return { status: 'confirmado' };
    }

    return { status: 'confirmado' };
  } catch {
    return { status: 'falha_de_rede', mensagem: MENSAGEM_SOLICITACAO };
  }
}

/** Traduz a falha de `updateUser`, sem deixar `error.message` crua escapar. */
function traduzirFalha(mensagemOriginal: string): string {
  const normalizada = mensagemOriginal.toLowerCase();
  const achada = TRADUCAO_DE_FALHA.find((item) => normalizada.includes(item.marca.toLowerCase()));
  return achada?.mensagem ?? MENSAGEM_FALHA_GENERICA;
}

/**
 * Troca a senha do usuário da sessão corrente.
 *
 * Espera que a sessão de recovery já esteja estabelecida por `setSession`, e é
 * por isso que uma falha de sessão vira a orientação de pedir um novo link, em
 * vez de uma mensagem genérica.
 *
 * Não encerra a sessão: quem chama decide, porque o app precisa voltar ao
 * login depois de trocar a senha (FR-010).
 */
export async function atualizarSenha(password: string): Promise<ResultadoAtualizacao> {
  try {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { status: 'falha', mensagem: traduzirFalha(error.message) };
    }

    return { status: 'atualizada' };
  } catch {
    return { status: 'falha', mensagem: MENSAGEM_FALHA_GENERICA };
  }
}