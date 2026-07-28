import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetIronSession } = vi.hoisted(() => ({
  mockGetIronSession: vi.fn(),
}));

vi.mock("iron-session", () => ({
  getIronSession: mockGetIronSession,
}));

import { proxy } from "@/proxy";

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function sessionOf(userId?: string) {
  mockGetIronSession.mockResolvedValue({ userId });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SESSION_SECRET", "s".repeat(48));
});

describe("proxy", () => {
  it("redirects unauthenticated requests to /admin/solicitacoes → /login", async () => {
    sessionOf(undefined);

    const response = await proxy(makeRequest("/admin/solicitacoes"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated requests to /admin → /login", async () => {
    sessionOf(undefined);

    const response = await proxy(makeRequest("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows authenticated requests to /admin/solicitacoes", async () => {
    sessionOf("admin-1");

    const response = await proxy(makeRequest("/admin/solicitacoes"));

    expect(response.status).toBe(200);
  });

  it("redirects when the session cannot be read", async () => {
    mockGetIronSession.mockRejectedValue(new Error("bad cookie"));

    const response = await proxy(makeRequest("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects when SESSION_SECRET is missing instead of letting the request through", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    sessionOf("admin-1");

    const response = await proxy(makeRequest("/admin"));

    expect(response.status).toBe(307);
  });

  it("leaves non-admin routes alone", async () => {
    const response = await proxy(makeRequest("/form"));

    expect(response.status).toBe(200);
    expect(mockGetIronSession).not.toHaveBeenCalled();
  });
});
