import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicantTokens } from "@/lib/db/schema";

export type ApplicantTokenKind = "verify_email" | "reset_password";

/** Validade de cada link enviado por e-mail. */
export const TOKEN_TTL_MS: Record<ApplicantTokenKind, number> = {
  verify_email: 48 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cria um link de uso único e devolve o token em claro (só vai no e-mail). */
export async function issueToken(accountId: string, kind: ApplicantTokenKind): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(applicantTokens).values({
    account_id: accountId,
    kind,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS[kind]).toISOString(),
  });
  return token;
}

/**
 * Consome o token numa única escrita condicional: dois cliques simultâneos não
 * conseguem usar o mesmo link. Devolve a conta dona do link, ou null.
 */
export async function consumeToken(token: string, kind: ApplicantTokenKind): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const now = new Date().toISOString();
  const [row] = await db
    .update(applicantTokens)
    .set({ used_at: now })
    .where(
      and(
        eq(applicantTokens.token_hash, hashToken(token)),
        eq(applicantTokens.kind, kind),
        isNull(applicantTokens.used_at),
        gt(applicantTokens.expires_at, now)
      )
    )
    .returning({ account_id: applicantTokens.account_id });
  return row?.account_id ?? null;
}
