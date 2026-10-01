/**
 * Resultado de uma tentativa de exclusão de conta.
 *
 * União discriminada em vez de `boolean` ou exceção porque a diferença entre os
 * casos é o que garante a consistência: nos três casos de falha a conta
 * continua existindo e a coleção de versículos continua intacta, e só o caso de
 * sucesso remove os dois. Uma falha que devolveu o mesmo valor de sucesso
 * apagaria a coleção local com a conta ainda viva.
 */
export type ResultadoExclusao =
  | { status: 'sucesso' }
  | { status: 'falha_de_rede' }
  | { status: 'falha_de_autorizacao' }
  | { status: 'usuario_com_objetos_no_storage' };

/** Mensagem ao usuário para cada resultado. Só o sucesso não tem aviso. */
export const MENSAGEM_EXCLUSAO: Record<Exclude<ResultadoExclusao['status'], 'sucesso'>, string> = {
  falha_de_rede:
    'Não conseguimos excluir sua conta. Verifique sua conexão e tente de novo.',
  falha_de_autorizacao: 'Sua sessão expirou. Entre novamente para excluir a conta.',
  usuario_com_objetos_no_storage:
    'Há arquivos vinculados à sua conta no armazenamento. Remova-os antes de excluir a conta.',
};
