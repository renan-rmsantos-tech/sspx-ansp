"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  sendAccountExistsEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/applicant/account-emails";
import { allowAccountEmail } from "@/lib/applicant/email-rate-limit";
import { linkLegacyApplications } from "@/lib/applicant/link-legacy-applications";
import { consumeToken, issueToken } from "@/lib/applicant/tokens";
import { getApplicantSession, startApplicantSession } from "@/lib/auth/applicant-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearFailures, lockedFor, recordFailure } from "@/lib/auth/throttle";
import { db } from "@/lib/db";
import { applicantAccounts } from "@/lib/db/schema";

export interface AccountFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  /** E-mail para o qual um link foi (ou seria) enviado. */
  sentTo?: string;
  /** Login correto de uma conta ainda sem e-mail confirmado. */
  unverifiedEmail?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const AFTER_LOGIN = "/solicitar-bolsa";
const INVALID_LOGIN = "E-mail ou senha incorretos.";
const LOCKED = "Muitas tentativas de entrada. Aguarde alguns minutos e tente novamente.";
const SEND_FAILED = "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.";
const INVALID_LINK =
  "Este link é inválido, já foi usado ou expirou. Entre com seu e-mail e senha para receber um novo link de confirmação.";
const INVALID_RESET_LINK =
  "Este link é inválido, já foi usado ou expirou. Peça uma nova redefinição de senha.";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function passwordErrors(password: string, confirmation: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  }
  if (!errors.password && password !== confirmation) {
    errors.confirmation = "As senhas não são iguais.";
  }
  return errors;
}

function logSendFailure(context: string, error: unknown) {
  console.error(`[applicant] falha ao enviar e-mail (${context}):`, error instanceof Error ? error.message : error);
}

/**
 * Cria a conta e envia o link de confirmação. A resposta é a mesma para um
 * e-mail novo ou já cadastrado, para a página não revelar quem tem conta; quem
 * já tem conta recebe por e-mail o aviso para entrar ou redefinir a senha.
 */
export async function signUpApplicant(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "Informe seu e-mail.";
  else if (!EMAIL_RE.test(email) || email.length > 254) fieldErrors.email = "E-mail inválido.";
  Object.assign(fieldErrors, passwordErrors(password, confirmation));
  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors };

  try {
    let account = await db.query.applicantAccounts.findFirst({
      columns: { id: true, email_verified_at: true },
      where: eq(applicantAccounts.email, email),
    });

    if (!account) {
      const [created] = await db
        .insert(applicantAccounts)
        .values({ email, password_hash: await hashPassword(password) })
        .onConflictDoNothing()
        .returning({ id: applicantAccounts.id, email_verified_at: applicantAccounts.email_verified_at });
      if (created) {
        const token = await issueToken(created.id, "verify_email");
        allowAccountEmail(email, "verify_email");
        await sendVerificationEmail(email, token);
        return { error: null, sentTo: email };
      }
      // Outro envio criou a conta ao mesmo tempo: segue como conta existente.
      account = await db.query.applicantAccounts.findFirst({
        columns: { id: true, email_verified_at: true },
        where: eq(applicantAccounts.email, email),
      });
      if (!account) throw new Error("Conta não encontrada após conflito.");
    }

    // Conta existente: a senha informada é descartada. Só o dono do e-mail,
    // pelo link de redefinição, pode trocar a senha de uma conta.
    if (account.email_verified_at) {
      if (allowAccountEmail(email, "account_exists")) await sendAccountExistsEmail(email);
    } else if (allowAccountEmail(email, "verify_email")) {
      await sendVerificationEmail(email, await issueToken(account.id, "verify_email"));
    }
    return { error: null, sentTo: email };
  } catch (error) {
    logSendFailure("cadastro", error);
    return { error: SEND_FAILED };
  }
}

export async function loginApplicant(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const throttleKey = `applicant:${email}`;

  if (!email || !password) return { error: "Informe seu e-mail e sua senha." };
  if (lockedFor(throttleKey) > 0) return { error: LOCKED };

  const account = await db.query.applicantAccounts.findFirst({
    columns: { id: true, password_hash: true, email_verified_at: true, session_version: true },
    where: eq(applicantAccounts.email, email),
  });

  if (!account || !(await verifyPassword(password, account.password_hash))) {
    recordFailure(throttleKey);
    return { error: INVALID_LOGIN };
  }
  clearFailures(throttleKey);

  if (!account.email_verified_at) {
    return {
      error: "Confirme seu e-mail antes de entrar. Procure a mensagem que enviamos, inclusive na caixa de spam.",
      unverifiedEmail: email,
    };
  }

  // Contas confirmadas antes deste vínculo existir também encontram a solicitação antiga.
  await linkLegacyApplications(account.id, email);
  await startApplicantSession(account);
  redirect(AFTER_LOGIN);
}

/** Reenvia o link de confirmação; responde igual exista a conta ou não. */
export async function resendVerificationEmail(emailInput: string): Promise<AccountFormState> {
  const email = normalizeEmail(emailInput);
  if (!EMAIL_RE.test(email)) return { error: "E-mail inválido." };
  try {
    const account = await db.query.applicantAccounts.findFirst({
      columns: { id: true, email_verified_at: true },
      where: eq(applicantAccounts.email, email),
    });
    if (account && !account.email_verified_at && allowAccountEmail(email, "verify_email")) {
      await sendVerificationEmail(email, await issueToken(account.id, "verify_email"));
    }
    return { error: null, sentTo: email };
  } catch (error) {
    logSendFailure("reenvio de confirmação", error);
    return { error: SEND_FAILED };
  }
}

export async function confirmApplicantEmail(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const accountId = await consumeToken(String(formData.get("token") ?? ""), "verify_email");
  if (!accountId) return { error: INVALID_LINK };

  const now = new Date().toISOString();
  const [account] = await db
    .update(applicantAccounts)
    .set({ email_verified_at: sql`coalesce(${applicantAccounts.email_verified_at}, ${now})`, updated_at: now })
    .where(eq(applicantAccounts.id, accountId))
    .returning({ id: applicantAccounts.id, email: applicantAccounts.email, session_version: applicantAccounts.session_version });
  if (!account) return { error: INVALID_LINK };

  await linkLegacyApplications(account.id, account.email);
  await startApplicantSession(account);
  redirect(AFTER_LOGIN);
}

/** Envia o link de nova senha; responde igual exista a conta ou não. */
export async function requestPasswordReset(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { error: null, fieldErrors: { email: "Informe seu e-mail." } };
  if (!EMAIL_RE.test(email)) return { error: null, fieldErrors: { email: "E-mail inválido." } };

  try {
    const account = await db.query.applicantAccounts.findFirst({
      columns: { id: true },
      where: eq(applicantAccounts.email, email),
    });
    if (account && allowAccountEmail(email, "reset_password")) {
      await sendPasswordResetEmail(email, await issueToken(account.id, "reset_password"));
    }
    return { error: null, sentTo: email };
  } catch (error) {
    logSendFailure("redefinição de senha", error);
    return { error: SEND_FAILED };
  }
}

/**
 * Troca a senha pelo link recebido por e-mail. Também confirma o e-mail (o
 * link prova a posse) e encerra as outras sessões abertas da conta.
 */
export async function resetApplicantPassword(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const password = String(formData.get("password") ?? "");
  const fieldErrors = passwordErrors(password, String(formData.get("confirmation") ?? ""));
  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors };

  const accountId = await consumeToken(String(formData.get("token") ?? ""), "reset_password");
  if (!accountId) return { error: INVALID_RESET_LINK };

  const now = new Date().toISOString();
  const [account] = await db
    .update(applicantAccounts)
    .set({
      password_hash: await hashPassword(password),
      session_version: sql`${applicantAccounts.session_version} + 1`,
      email_verified_at: sql`coalesce(${applicantAccounts.email_verified_at}, ${now})`,
      updated_at: now,
    })
    .where(eq(applicantAccounts.id, accountId))
    .returning({ id: applicantAccounts.id, email: applicantAccounts.email, session_version: applicantAccounts.session_version });
  if (!account) return { error: INVALID_RESET_LINK };

  await linkLegacyApplications(account.id, account.email);
  await startApplicantSession(account);
  redirect(AFTER_LOGIN);
}

export async function logoutApplicant() {
  const session = await getApplicantSession();
  session.destroy();
  redirect("/solicitar-bolsa/entrar");
}
