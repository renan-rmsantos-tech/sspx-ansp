import type { LoginState } from "./_actions/auth-actions";

/** Mensagem que `loginAction` devolve para e-mail ou senha incorretos. */
export const invalidCredentialsError = "Credenciais inválidas. Verifique seu email e senha.";

export const invalidCredentialsState: LoginState = { error: invalidCredentialsError };

/** As credenciais do `AUTH_BYPASS` de desenvolvimento (`lib/auth/bypass.ts`). */
export const devCredentials = { email: "admin@admin.com", password: "admin123" };
