// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { report } = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-financial-report-actions", () => ({ getDonorFinancialReport: report }));
import { GET } from "@/app/admin/relatorios/financeiro/export/route";

describe("financial CSV export", () => {
  const request = new NextRequest("http://localhost/admin/relatorios/financeiro/export?from=2026-10&to=2026-10");
  it("denies unauthorized users", async () => {
    report.mockRejectedValueOnce(new Error("Não autorizado"));
    expect((await GET(request)).status).toBe(403);
  });
  it("serves escaped BOM CSV without caching", async () => {
    report.mockResolvedValueOnce({ filters: { from: "2026-10", to: "2026-10" }, summary: { previsto: 100, recebido: 0, emAberto: 100, naoIdentificadoDivergente: 0 }, byFrequency: { mensal: { previsto: 100, recebido: 0, emAberto: 100, naoIdentificadoDivergente: 0 }, unica: { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 } }, months: [], donors: [{ donorId: "1", donorName: "=Ana", frequency: "mensal", pago: 0, devido: 100, parcelasEmAtraso: 1 }] });
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([239, 187, 191]);
    expect(new TextDecoder().decode(bytes)).toContain("'=Ana");
  });
});
