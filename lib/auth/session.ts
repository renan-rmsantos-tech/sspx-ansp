import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
}

export const SESSION_COOKIE = "ansp-session";

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;

  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET não configurado ou muito curto (mínimo 32 caracteres)."
    );
  }

  return {
    password,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  };
}

/** Sessão a partir dos cookies de uma Server Action / Server Component. */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions());
}

/**
 * Dados do admin logado, ou null quando não há sessão.
 *
 * Sem try/catch de propósito: `cookies()` sinaliza renderização dinâmica
 * lançando, e engolir esse erro faria o Next tentar pré-renderizar as páginas
 * do /admin. Um cookie inválido não lança — o iron-session devolve uma sessão
 * vazia, que cai no `return null` abaixo.
 */
export async function getSessionUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const session = await getSession();

  if (!session.userId || !session.email) return null;

  return { id: session.userId, email: session.email };
}
