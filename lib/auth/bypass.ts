export const BYPASS_EMAIL = "admin@admin.com";
export const BYPASS_PASSWORD = "admin123";

export const BYPASS_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: BYPASS_EMAIL,
};

/**
 * Credenciais fixas para desenvolvimento/demonstração. Com AUTH_BYPASS=true a
 * autenticação não consulta a tabela `admin_users`, mas a sessão criada é a
 * mesma de produção — o restante da aplicação não distingue os dois modos.
 */
export function isAuthBypass() {
  return process.env.AUTH_BYPASS === "true";
}
