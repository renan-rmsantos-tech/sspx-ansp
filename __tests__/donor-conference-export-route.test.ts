// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { conference } = vi.hoisted(() => ({ conference: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-payment-conference-actions", () => ({ getDonorPaymentConference: conference }));
import { GET } from "@/app/admin/pagamentos/export/route";
const request = (month: string) => new NextRequest(`http://localhost/admin/pagamentos/export?month=${month}`);
describe("conference CSV route", () => {
  it("denies unauthenticated and Secretariat requests", async () => {
    for (const error of ["Não autorizado", "Você não tem permissão"]) {
      conference.mockRejectedValueOnce(new Error(error));
      await expect(GET(request("2026-10"))).rejects.toThrow(error);
    }
  });
  it("rejects an invalid month through the guarded conference query", async () => {
    conference.mockRejectedValueOnce(new Error("Mês inválido."));
    await expect(GET(request("2026-13"))).rejects.toThrow("Mês inválido.");
    expect(conference).toHaveBeenCalledWith("2026-13");
  });
  it("serves BOM CSV with private no-store headers and selected filename", async () => {
    conference.mockResolvedValueOnce({ rows: [], totals: { expected: "0.00", received: "0.00", outstanding: "0.00" } });
    const response = await GET(request("2026-10"));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toContain("conferencia-pagamentos-2026-10.csv");
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect([...new Uint8Array(await response.arrayBuffer()).slice(0, 3)]).toEqual([239, 187, 191]);
  });
});
