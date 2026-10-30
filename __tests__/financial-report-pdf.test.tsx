import { describe, it, expect } from "vitest";
import { renderFinancialReportPdf } from "@/lib/pdf/financial-report-pdf";
import { DEFAULT_DOCUMENT_HEADER } from "@/lib/documents/document-header";
import type { getDonorFinancialReport } from "@/app/admin/_actions/donor-financial-report-actions";

const zero = { previsto: 10000, recebido: 5000, emAberto: 5000, naoIdentificadoDivergente: 0 };
const report = { filters: { from: "2026-01", to: "2026-02" }, summary: zero, byFrequency: { mensal: zero, unica: zero }, months: [{ month: "2026-01", ...zero }], donors: [{ donorId: "1", donorName: "Benfeitor Exemplo", frequency: "mensal", pago: 5000, devido: 5000, parcelasEmAtraso: 1 }] } as Awaited<ReturnType<typeof getDonorFinancialReport>>;

describe("financial PDF", () => {
  it("renders a PDF buffer", async () => {
    const pdf = await renderFinancialReportPdf(report, DEFAULT_DOCUMENT_HEADER);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
  it("renders both frequency filters and paginates long donor lists", async () => {
    for (const frequency of ["mensal", "unica"] as const) {
      const longReport = { ...report, filters: { ...report.filters, frequency }, donors: Array.from({ length: 75 }, (_, index) => ({ ...report.donors[0], donorId: String(index), frequency })) };
      const pdf = await renderFinancialReportPdf(longReport, DEFAULT_DOCUMENT_HEADER);
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
      expect((pdf.toString().match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
    }
  });
});
