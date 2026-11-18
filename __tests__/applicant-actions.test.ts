import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { mockSession, emails } = vi.hoisted(() => ({
  mockSession: {
    applicantId: undefined as string | undefined,
    sessionVersion: undefined as number | undefined,
    save: vi.fn(),
    destroy: vi.fn(),
  },
  emails: {
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendAccountExistsEmail: vi.fn(),
  },
}));

vi.mock("@/lib/auth/applicant-session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/applicant-session")>("@/lib/auth/applicant-session");
  return {
    ...actual,
    getApplicantSession: vi.fn(() => Promise.resolve(mockSession)),
    startApplicantSession: vi.fn(async (account: { id: string; session_version: number }) => {
      mockSession.applicantId = account.id;
      mockSession.sessionVersion = account.session_version;
      await mockSession.save();
    }),
  };
});

vi.mock("@/lib/applicant/account-emails", () => emails);

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import {
  confirmApplicantEmail,
  loginApplicant,
  logoutApplicant,
  requestPasswordReset,
  resendVerificationEmail,
  resetApplicantPassword,
  signUpApplicant,
} from "@/app/solicitar-bolsa/_actions/applicant-actions";
import { resetAccountEmailLimit } from "@/lib/applicant/email-rate-limit";
import { hashToken } from "@/lib/applicant/tokens";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { resetThrottle } from "@/lib/auth/throttle";
import { applicantAccounts, applicantTokens } from "@/lib/db/schema";
import { inserted, queryFor, resetFakeDb, setReturning, updated } from "./helpers/fake-db";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const EMPTY = { error: null };

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  resetThrottle();
  resetAccountEmailLimit();
  mockSession.applicantId = undefined;
  mockSession.sessionVersion = undefined;
});

describe("signUpApplicant", () => {
  it("creates an unverified account with a hashed password and emails a confirmation link", async () => {
    setReturning(applicantAccounts, [{ id: "acc-1", email_verified_at: null }]);

    const result = await signUpApplicant(EMPTY, form({ email: "  Maria@Example.com ", password: "senha-segura", confirmation: "senha-segura" }));

    expect(result).toEqual({ error: null, sentTo: "maria@example.com" });
    const account = inserted.find((row) => row.table === applicantAccounts)?.values as { email: string; password_hash: string };
    expect(account.email).toBe("maria@example.com");
    expect(account.password_hash).not.toContain("senha-segura");
    expect(await verifyPassword("senha-segura", account.password_hash)).toBe(true);

    const token = inserted.find((row) => row.table === applicantTokens)?.values as { kind: string; token_hash: string; account_id: string };
    expect(token).toMatchObject({ kind: "verify_email", account_id: "acc-1" });
    const sentToken = emails.sendVerificationEmail.mock.calls[0][1] as string;
    expect(emails.sendVerificationEmail).toHaveBeenCalledWith("maria@example.com", sentToken);
    expect(token.token_hash).toBe(hashToken(sentToken));
    expect(token.token_hash).not.toBe(sentToken);
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("validates e-mail, password length and confirmation before touching the database", async () => {
    const result = await signUpApplicant(EMPTY, form({ email: "invalido", password: "curta", confirmation: "curta" }));
    expect(result.fieldErrors).toMatchObject({ email: "E-mail inválido.", password: expect.stringContaining("8 caracteres") });

    const mismatch = await signUpApplicant(EMPTY, form({ email: "a@b.com", password: "senha-segura", confirmation: "outra-senha" }));
    expect(mismatch.fieldErrors).toEqual({ confirmation: "As senhas não são iguais." });
    expect(inserted).toHaveLength(0);
  });

  it("answers the same for an existing verified account, keeps its password and only sends a notice", async () => {
    queryFor("applicantAccounts").findFirst.mockResolvedValue({ id: "acc-1", email_verified_at: "2026-11-01T00:00:00Z" });

    const result = await signUpApplicant(EMPTY, form({ email: "maria@example.com", password: "nova-senha-1", confirmation: "nova-senha-1" }));

    expect(result).toEqual({ error: null, sentTo: "maria@example.com" });
    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(emails.sendAccountExistsEmail).toHaveBeenCalledWith("maria@example.com");
    expect(emails.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("resends the confirmation link for an existing unverified account, at most once a minute", async () => {
    queryFor("applicantAccounts").findFirst.mockResolvedValue({ id: "acc-1", email_verified_at: null });
    const input = { email: "maria@example.com", password: "senha-segura", confirmation: "senha-segura" };

    await signUpApplicant(EMPTY, form(input));
    await signUpApplicant(EMPTY, form(input));

    expect(emails.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(updated).toHaveLength(0);
  });

  it("reports a send failure without leaking provider details", async () => {
    setReturning(applicantAccounts, [{ id: "acc-1", email_verified_at: null }]);
    emails.sendVerificationEmail.mockRejectedValueOnce(new Error("provider secret detail"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await signUpApplicant(EMPTY, form({ email: "maria@example.com", password: "senha-segura", confirmation: "senha-segura" }));

    expect(result.error).toMatch(/Não foi possível enviar o e-mail/);
    expect(JSON.stringify(result)).not.toContain("provider secret detail");
    log.mockRestore();
  });
});

describe("loginApplicant", () => {
  async function account(overrides: Record<string, unknown> = {}) {
    return {
      id: "acc-1",
      password_hash: await hashPassword("senha-segura"),
      email_verified_at: "2026-11-01T00:00:00Z",
      session_version: 2,
      ...overrides,
    };
  }

  it("starts the applicant session with the account's session version and redirects to the form", async () => {
    queryFor("applicantAccounts").findFirst.mockResolvedValue(await account());

    await expect(loginApplicant(EMPTY, form({ email: "MARIA@example.com", password: "senha-segura" }))).rejects.toThrow(
      "REDIRECT:/solicitar-bolsa"
    );
    expect(mockSession).toMatchObject({ applicantId: "acc-1", sessionVersion: 2 });
  });

  it("rejects a wrong password and an unknown e-mail with the same message", async () => {
    queryFor("applicantAccounts").findFirst.mockResolvedValueOnce(await account()).mockResolvedValueOnce(undefined);

    const wrong = await loginApplicant(EMPTY, form({ email: "maria@example.com", password: "errada-123" }));
    const unknown = await loginApplicant(EMPTY, form({ email: "ninguem@example.com", password: "senha-segura" }));

    expect(wrong).toEqual({ error: "E-mail ou senha incorretos." });
    expect(unknown).toEqual(wrong);
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("does not let an unverified account in and offers a new confirmation link", async () => {
    queryFor("applicantAccounts").findFirst.mockResolvedValue(await account({ email_verified_at: null }));

    const result = await loginApplicant(EMPTY, form({ email: "maria@example.com", password: "senha-segura" }));

    expect(result.unverifiedEmail).toBe("maria@example.com");
    expect(result.error).toMatch(/Confirme seu e-mail/);
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("locks the e-mail after repeated failures", async () => {
    queryFor("applicantAccounts").findFirst.mockResolvedValue(await account());
    for (let i = 0; i < 8; i++) await loginApplicant(EMPTY, form({ email: "maria@example.com", password: "errada-123" }));

    const result = await loginApplicant(EMPTY, form({ email: "maria@example.com", password: "senha-segura" }));
    expect(result.error).toMatch(/Muitas tentativas/);
  });
});

describe("e-mail confirmation and password reset", () => {
  it("confirms the e-mail with a valid link and logs the applicant in", async () => {
    setReturning(applicantTokens, [{ account_id: "acc-1" }]);
    setReturning(applicantAccounts, [{ id: "acc-1", session_version: 0 }]);

    await expect(confirmApplicantEmail(EMPTY, form({ token: "token-claro" }))).rejects.toThrow("REDIRECT:/solicitar-bolsa");
    expect(updated[0]).toMatchObject({ table: applicantTokens, values: { used_at: expect.any(String) } });
    expect(updated[1].table).toBe(applicantAccounts);
    expect(mockSession.applicantId).toBe("acc-1");
  });

  it("rejects an invalid, used or expired confirmation link", async () => {
    const result = await confirmApplicantEmail(EMPTY, form({ token: "nao-existe" }));
    expect(result.error).toMatch(/inválido, já foi usado ou expirou/);
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("answers the same to a reset request whether or not the account exists", async () => {
    const unknown = await requestPasswordReset(EMPTY, form({ email: "ninguem@example.com" }));
    queryFor("applicantAccounts").findFirst.mockResolvedValue({ id: "acc-1" });
    const known = await requestPasswordReset(EMPTY, form({ email: "maria@example.com" }));

    expect(unknown).toEqual({ error: null, sentTo: "ninguem@example.com" });
    expect(known).toEqual({ error: null, sentTo: "maria@example.com" });
    expect(emails.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(emails.sendPasswordResetEmail).toHaveBeenCalledWith("maria@example.com", expect.any(String));
  });

  it("sets the new password, bumps the session version and logs in", async () => {
    setReturning(applicantTokens, [{ account_id: "acc-1" }]);
    setReturning(applicantAccounts, [{ id: "acc-1", session_version: 3 }]);

    await expect(
      resetApplicantPassword(EMPTY, form({ token: "token-claro", password: "nova-senha-1", confirmation: "nova-senha-1" }))
    ).rejects.toThrow("REDIRECT:/solicitar-bolsa");

    const change = updated.find((row) => row.table === applicantAccounts)?.values as { password_hash: string };
    expect(await verifyPassword("nova-senha-1", change.password_hash)).toBe(true);
    expect(mockSession.sessionVersion).toBe(3);
  });

  it("validates the new password before consuming the link", async () => {
    const result = await resetApplicantPassword(EMPTY, form({ token: "token-claro", password: "curta", confirmation: "curta" }));
    expect(result.fieldErrors?.password).toBeDefined();
    expect(updated).toHaveLength(0);
  });

  it("resends confirmation only to unverified accounts and always answers the same", async () => {
    queryFor("applicantAccounts").findFirst.mockResolvedValueOnce({ id: "acc-1", email_verified_at: "2026-11-01" });
    expect(await resendVerificationEmail("maria@example.com")).toEqual({ error: null, sentTo: "maria@example.com" });
    expect(emails.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("logs out by destroying the applicant session", async () => {
    await expect(logoutApplicant()).rejects.toThrow("REDIRECT:/solicitar-bolsa/entrar");
    expect(mockSession.destroy).toHaveBeenCalled();
  });
});
