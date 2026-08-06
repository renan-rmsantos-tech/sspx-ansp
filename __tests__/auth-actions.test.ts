import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    userId: undefined as string | undefined,
    email: undefined as string | undefined,
    save: vi.fn(),
    destroy: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { hashPassword } from "@/lib/auth/password";
import { resetThrottle } from "@/lib/auth/throttle";
import { login, logout } from "@/app/login/_actions/auth-actions";
import { queryFor, resetFakeDb } from "./helpers/fake-db";

const INVALID = "Credenciais inválidas. Verifique seu email e senha.";

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  resetThrottle();
  vi.stubEnv("AUTH_BYPASS", "");
  mockSession.userId = undefined;
  mockSession.email = undefined;
});

describe("login", () => {
  it("starts a session and redirects on valid credentials", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      password_hash: await hashPassword("password123"),
    });

    // Precisa ser a página final, não /admin: aquela rota redireciona de novo,
    // e um redirect encadeado dentro de uma Server Action devolve HTML onde o
    // roteador do Next espera RSC, quebrando a navegação pós-login.
    await expect(login("admin@test.com", "password123")).rejects.toThrow(
      "REDIRECT:/admin/solicitacoes"
    );

    expect(mockSession.userId).toBe("admin-1");
    expect(mockSession.email).toBe("admin@test.com");
    expect(mockSession.save).toHaveBeenCalled();
  });

  it("rejects a wrong password without starting a session", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      password_hash: await hashPassword("password123"),
    });

    expect(await login("admin@test.com", "wrong")).toEqual({ error: INVALID });
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("rejects an unknown email with the same message", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue(undefined);

    expect(await login("nobody@test.com", "whatever")).toEqual({
      error: INVALID,
    });
  });

  it("looks the user up by lowercased, trimmed email", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue(undefined);

    await login("  ADMIN@Test.com  ", "x");

    expect(queryFor("adminUsers").findFirst).toHaveBeenCalled();
  });
});

describe("login with AUTH_BYPASS", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_BYPASS", "true");
  });

  it("accepts the fixed credentials without querying the database", async () => {
    await expect(login("admin@admin.com", "admin123")).rejects.toThrow(
      "REDIRECT:/admin/solicitacoes"
    );

    expect(mockSession.save).toHaveBeenCalled();
    expect(queryFor("adminUsers").findFirst).not.toHaveBeenCalled();
  });

  it("still rejects anything else", async () => {
    expect(await login("admin@admin.com", "wrong")).toEqual({ error: INVALID });
  });

  it("is ignored in production even when the variable is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    queryFor("adminUsers").findFirst.mockResolvedValue(undefined);

    // Com o bypass ignorado, as credenciais fixas caem na consulta normal
    // ao banco — e falham, porque o usuário não existe.
    expect(await login("admin@admin.com", "admin123")).toEqual({
      error: INVALID,
    });
    expect(queryFor("adminUsers").findFirst).toHaveBeenCalled();
    expect(mockSession.save).not.toHaveBeenCalled();
  });
});

describe("login throttling", () => {
  it("locks the account after repeated failures", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue(undefined);

    for (let i = 0; i < 8; i++) {
      await login("brute@force.com", "wrong");
    }

    const result = await login("brute@force.com", "wrong");
    expect(result.error).toContain("Muitas tentativas");
    // Bloqueado, nem consulta o banco.
    expect(queryFor("adminUsers").findFirst).toHaveBeenCalledTimes(8);
  });
});

describe("logout", () => {
  it("destroys the session and redirects to /login", async () => {
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(mockSession.destroy).toHaveBeenCalled();
  });
});
