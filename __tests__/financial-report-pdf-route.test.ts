import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/admin/relatorios/financeiro/pdf/route";
import { getDonorFinancialReport } from "@/app/admin/_actions/donor-financial-report-actions";
vi.mock("@/app/admin/_actions/donor-financial-report-actions", () => ({ getDonorFinancialReport: vi.fn() }));
vi.mock("@/lib/documents/document-header-store", () => ({ loadDocumentHeader: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/pdf/financial-report-pdf", () => ({ renderFinancialReportPdf: vi.fn().mockResolvedValue(Buffer.from("%PDF")) }));
const request = () => new NextRequest("http://localhost/admin/relatorios/financeiro/pdf?from=2026-01&to=2026-02");
describe("financial PDF route", () => {
  it("denies unauthenticated requests", async () => { vi.mocked(getDonorFinancialReport).mockRejectedValueOnce(new Error("Unauthorized")); expect((await GET(request())).status).toBe(403); });
  it("rejects invalid filters", async () => { vi.mocked(getDonorFinancialReport).mockRejectedValueOnce(new Error("Período inválido")); expect((await GET(request())).status).toBe(400); });
  it("returns guarded PDF headers", async () => { vi.mocked(getDonorFinancialReport).mockResolvedValueOnce({ filters: { from: "2026-01", to: "2026-02" } } as never); const response = await GET(request()); expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("application/pdf"); expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("content-disposition")).toContain("relatorio-financeiro-2026-01_2026-02.pdf"); });
});
