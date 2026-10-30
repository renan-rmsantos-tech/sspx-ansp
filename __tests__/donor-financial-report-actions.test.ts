import { describe, expect, it, vi } from "vitest";
const { requireAdmin, select } = vi.hoisted(() => ({ requireAdmin: vi.fn(), select: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/lib/db", () => ({ db: { select } }));
import { getDonorFinancialReport } from "@/app/admin/_actions/donor-financial-report-actions";

describe("financial report action", () => {
  it("rejects invalid periods and frequencies", async () => {
    requireAdmin.mockResolvedValue({ id: "admin", role: "admin" });
    for (const input of [
      { from: "2026-13", to: "2026-12" }, { from: "2026-12", to: "2026-11" },
      { from: "2024-01", to: "2026-01" }, { from: "2026-01", to: "2026-02", frequency: "weekly" },
    ]) await expect(getDonorFinancialReport(input as Parameters<typeof getDonorFinancialReport>[0])).rejects.toThrow();
  });
  it("requires administrator before querying", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("Proibido"));
    await expect(getDonorFinancialReport({ from: "2026-10", to: "2026-10" })).rejects.toThrow("Proibido");
    expect(select).not.toHaveBeenCalled();
  });
  it("queries a bounded month range and aggregates confirmed and divergent credits", async () => {
    requireAdmin.mockResolvedValue({ id: "admin", role: "admin" });
    const rows = [
      { donorId: "1", donorName: "Ana", frequency: "mensal", month: "2026-10", dueDate: "2020-01-01", due: 10.01, received: 10.01, status: "confirmado" },
      { donorId: "2", donorName: "Bia", frequency: "unica", month: "2026-10", dueDate: "2020-01-01", due: 20, received: 5, status: "divergente" },
    ];
    const chain = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), orderBy: vi.fn() };
    chain.from.mockReturnValue(chain); chain.innerJoin.mockReturnValue(chain); chain.where.mockReturnValue(chain);
    chain.orderBy.mockResolvedValue(rows); select.mockReturnValue(chain);
    const result = await getDonorFinancialReport({ from: "2026-10", to: "2026-11", frequency: "mensal" });
    expect(result.summary).toEqual({ previsto: 3001, recebido: 1501, emAberto: 1500, naoIdentificadoDivergente: 500 });
    expect(result.months).toHaveLength(2);
    expect(result.months[1].previsto).toBe(0);
    expect(result.donors[1].parcelasEmAtraso).toBe(1);
    expect(chain.where).toHaveBeenCalledOnce();
  });
});
