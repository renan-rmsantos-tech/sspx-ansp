/**
 * Flag provisória: uploads de documentos no formulário de bolsa
 * ficam desativados durante a fase de testes no droplet.
 * Reative para `true` quando o armazenamento estiver pronto em produção.
 */
export const SCHOLARSHIP_UPLOADS_ENABLED = false;

export const SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE =
  "O envio de documentos está temporariamente desativado nesta fase de testes. Os demais campos do formulário continuam ativos.";
