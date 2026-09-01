import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
const { requireAdmin, requireCapability } = vi.hoisted(() => ({ requireAdmin: vi.fn(), requireCapability: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin, requireCapability }));

import { adminUsers, applicationObservations } from "@/lib/db/schema";
import { addApplicationObservation } from "@/app/admin/_actions/observation-actions";
import { createSecretariatUser, listSecretariatUsers, resetSecretariatPassword, setSecretariatUserActive } from "@/app/admin/_actions/staff-actions";
import { inserted, queryFor, resetFakeDb, setReturning, updated } from "./helpers/fake-db";

beforeEach(() => { vi.clearAllMocks(); resetFakeDb(); requireAdmin.mockResolvedValue({ id: "admin", role: "admin" }); requireCapability.mockResolvedValue({ id: "secretaria", role: "secretaria" }); });

describe("Secretariat account lifecycle", () => {
  it("creates an active Secretaria account with normalized email and server role", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue(undefined);
    setReturning(adminUsers, [{ id: "s1", email: "secretaria@example.com", ativo: true, created_at: "2026-01-01" }]);
    const result = await createSecretariatUser(" Secretaria@Example.com ", "password123");
    expect(result.success).toBe(true);
    expect(inserted[0].values).toMatchObject({ email: "secretaria@example.com", role: "secretaria", ativo: true });
  });
  it("does not expose password hashes when listing accounts", async () => {
    queryFor("adminUsers").findMany.mockResolvedValue([]);
    await listSecretariatUsers();
    expect(queryFor("adminUsers").findMany).toHaveBeenCalledWith(expect.objectContaining({ columns: expect.not.objectContaining({ password_hash: true }) }));
  });
  it("does not modify an Administrator through active-state or reset operations", async () => {
    queryFor("adminUsers").findFirst.mockResolvedValue(undefined);
    await expect(setSecretariatUserActive("admin", false)).resolves.toMatchObject({ success: false });
    await expect(resetSecretariatPassword("admin", "password123")).resolves.toMatchObject({ success: false });
    expect(updated).toHaveLength(0);
  });
});

describe("append-only observations", () => {
  it("trims and attributes a valid Secretariat observation", async () => {
    setReturning(applicationObservations, [{ id: "o1", body: "Contato feito", created_at: "2026-01-01" }]);
    const result = await addApplicationObservation("app-1", "  Contato feito  ");
    expect(result.success).toBe(true);
    expect(inserted[0].values).toMatchObject({ application_id: "app-1", author_user_id: "secretaria", body: "Contato feito" });
  });
  it("rejects blank and oversized notes before writing", async () => {
    await expect(addApplicationObservation("app-1", " ")).resolves.toMatchObject({ success: false });
    await expect(addApplicationObservation("app-1", "x".repeat(2001))).resolves.toMatchObject({ success: false });
    expect(inserted).toHaveLength(0);
  });
});
