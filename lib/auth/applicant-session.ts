import { getIronSession, type SessionOptions } from "iron-session";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { applicantAccounts } from "@/lib/db/schema";

/**
 * Sessão do solicitante de bolsa. Usa um cookie próprio, separado do cookie do
 * admin: ter uma não dá acesso à outra, e o `proxy.ts` só olha o do admin.
 */
export interface ApplicantSessionData {
  applicantId?: string;
  sessionVersion?: number;
}

export const APPLICANT_SESSION_COOKIE = "ansp-solicitante";

function applicantSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET não configurado ou muito curto (mínimo 32 caracteres).");
  }
  return {
    password,
    cookieName: APPLICANT_SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    },
  };
}

export async function getApplicantSession() {
  return getIronSession<ApplicantSessionData>(await cookies(), applicantSessionOptions());
}

export async function startApplicantSession(account: { id: string; session_version: number }) {
  const session = await getApplicantSession();
  session.applicantId = account.id;
  session.sessionVersion = account.session_version;
  await session.save();
}

export interface Applicant {
  id: string;
  email: string;
}

/**
 * Solicitante logado e com e-mail confirmado, ou null. Confere a conta no
 * banco a cada chamada: trocar a senha encerra as sessões abertas antes.
 *
 * Sem try/catch de propósito — ver `getSessionUser` em `session.ts`.
 */
export async function getApplicant(): Promise<Applicant | null> {
  const session = await getApplicantSession();
  if (!session.applicantId) return null;

  const account = await db.query.applicantAccounts.findFirst({
    columns: { id: true, email: true, email_verified_at: true, session_version: true },
    where: eq(applicantAccounts.id, session.applicantId),
  });
  if (!account || !account.email_verified_at) return null;
  if (account.session_version !== (session.sessionVersion ?? 0)) return null;

  return { id: account.id, email: account.email };
}
