import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));

import { fakeDb, resetFakeDb } from "./helpers/fake-db";
import { getDonorReports } from "@/app/admin/_actions/donor-report-actions";

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  requireAdmin.mockResolvedValue({ id: "admin", role: "admin" });
});

describe("getDonorReports", () => {
  it("aggregates only category counts and represents missing categories explicitly", async () => {
    fakeDb.execute.mockResolvedValue([
      { report: "total", category: null, count: 3 },
      { report: "residence", category: "SP", count: 2 },
      { report: "residence", category: "__unknown__", count: 1 },
      { report: "chapel", category: "nenhuma", count: 1 },
      { report: "chapel", category: "__unreported__", count: 2 },
    ]);
    const result = await getDonorReports();
    expect(result.total).toBe(3);
    expect(result.residenceByState).toEqual(expect.arrayContaining([
      { key: "SP", label: "São Paulo", count: 2 },
      { key: "__unknown__", label: "Local não identificado", count: 1 },
    ]));
    expect(result.prioryOrChapel).toEqual(expect.arrayContaining([
      { key: "nenhuma", label: "Nenhuma", count: 1 },
      { key: "__unreported__", label: "Não informado", count: 2 },
    ]));
    expect(result.residenceByState.reduce((sum, item) => sum + item.count, 0)).toBe(3);
    expect(result.prioryOrChapel.reduce((sum, item) => sum + item.count, 0)).toBe(3);
    expect(JSON.stringify(result)).not.toMatch(/cpf|email|endereco/i);
    expect(fakeDb.execute).toHaveBeenCalledOnce();
  });

  it("returns zero totals and stable unknown/none categories for an empty population", async () => {
    fakeDb.execute.mockResolvedValue([{ report: "total", category: null, count: 0 }]);
    const result = await getDonorReports();
    expect(result.total).toBe(0);
    expect(result.residenceByState).toContainEqual({ key: "__unknown__", label: "Local não identificado", count: 0 });
    expect(result.prioryOrChapel).toContainEqual({ key: "nenhuma", label: "Nenhuma", count: 0 });
    expect(result.prioryOrChapel).toContainEqual({ key: "__unreported__", label: "Não informado", count: 0 });
  });

  it("rejects invalid dates, reversed periods, and unsupported frequency before querying", async () => {
    await expect(getDonorReports({ from: "2026-02-30" })).rejects.toThrow("inválidos");
    await expect(getDonorReports({ from: "2026-02-03", to: "2026-02-02" })).rejects.toThrow("data inicial");
    await expect(getDonorReports({ frequency: "annual" as "mensal" })).rejects.toThrow("inválidos");
    expect(fakeDb.execute).not.toHaveBeenCalled();
  });

  it("applies inclusive date bounds and frequency to one shared SQL population", async () => {
    fakeDb.execute.mockResolvedValue([]);
    await getDonorReports({ from: "2026-01-31", to: "2026-02-01", frequency: "mensal" });
    const query = fakeDb.execute.mock.calls[0][0];
    expect(query.queryChunks.map((chunk: { value?: string[] }) => chunk.value?.join("") ?? "").join(" ")).toContain("WITH selected");
    expect(query.queryChunks.map((chunk: { value?: string[] }) => chunk.value?.join("") ?? "").join(" ")).toContain("residence_state");
  });

  it("denies non-administrator reads before querying", async () => {
    requireAdmin.mockRejectedValue(new Error("Você não tem permissão"));
    await expect(getDonorReports()).rejects.toThrow("permissão");
    expect(fakeDb.execute).not.toHaveBeenCalled();
  });
});
