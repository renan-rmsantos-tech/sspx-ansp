import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { mockSessionUser } = vi.hoisted(() => ({
  mockSessionUser: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mockSessionUser,
}));

import {
  requireAdmin,
  requireCapability,
  requireStaff,
} from "@/lib/auth/authorization";
import { queryFor, resetFakeDb } from "./helpers/fake-db";

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  vi.stubEnv("AUTH_BYPASS", "");
  vi.stubEnv("NODE_ENV", "test");
  mockSessionUser.mockResolvedValue({ id: "staff-1", email: "stale@test.com" });
});

describe("staff authorization", () => {
  it("loads current identity, email, role and activity from the database", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue({
      id: "staff-1",
      email: "current@test.com",
      role: "admin",
      ativo: true,
    });

    await expect(requireStaff()).resolves.toEqual({
      id: "staff-1",
      email: "current@test.com",
      role: "admin",
      ativo: true,
    });
  });

  it("denies a session without identity before querying staff", async () => {
    mockSessionUser.mockResolvedValue(null);

    await expect(requireStaff()).rejects.toThrow("Não autorizado");
    expect(queryFor("adminUsers").findFirst).not.toHaveBeenCalled();
  });

  it("revokes missing and inactive accounts on the next protected operation", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValueOnce(undefined);
    await expect(requireStaff()).rejects.toThrow("Não autorizado");

    queryFor("adminUsers").findFirst.mockResolvedValueOnce({
      id: "staff-1",
      email: "staff@test.com",
      role: "secretaria",
      ativo: false,
    });
    await expect(requireStaff()).rejects.toThrow("Não autorizado");
  });

  it("grants Secretariat only explicit capabilities and rejects admin access", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue({
      id: "staff-1",
      email: "staff@test.com",
      role: "secretaria",
      ativo: true,
    });

    await expect(requireCapability("observations:create")).resolves.toMatchObject({
      role: "secretaria",
    });
    await expect(requireCapability("applications:decide")).rejects.toThrow(
      "permissão"
    );
    await expect(requireAdmin()).rejects.toThrow("permissão");
  });

  it("grants every declared capability to an Administrator", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "admin",
      ativo: true,
    });

    await expect(requireCapability("staff:manage")).resolves.toMatchObject({
      role: "admin",
    });
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });

  it("uses the active Administrator bypass outside production without a database row", async () => {
    vi.stubEnv("AUTH_BYPASS", "true");
    mockSessionUser.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000000",
      email: "admin@admin.com",
    });

    await expect(requireCapability("settings:manage")).resolves.toMatchObject({
      role: "admin",
      ativo: true,
    });
    expect(queryFor("adminUsers").findFirst).not.toHaveBeenCalled();
  });

  it("does not bypass authorization in production", async () => {
    vi.stubEnv("AUTH_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "production");
    mockSessionUser.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000000",
      email: "admin@admin.com",
    });
    queryFor("adminUsers").findFirst.mockResolvedValue(undefined);

    await expect(requireStaff()).rejects.toThrow("Não autorizado");
    expect(queryFor("adminUsers").findFirst).toHaveBeenCalled();
  });
});
