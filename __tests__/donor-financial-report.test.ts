import { describe, expect, it } from "vitest";
import { aggregateFinancialReport, type FinancialLedgerRow } from "@/lib/donor-financial-report";
import { serializeFinancialReportCsv } from "@/lib/donor-financial-report-csv";

const base: FinancialLedgerRow = { donorId: "1", donorName: "=Ana", frequency: "mensal", month: "2026-10", dueCents: 10001, receivedCents: 0, status: "pendente", overdue: true };
describe("financial report", () => {
  it("returns empty totals", () => {
    const empty = aggregateFinancialReport([]);
    expect(empty.summary).toEqual({ previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 });
    expect(empty.months).toEqual([]);
    expect(empty.donors).toEqual([]);
  });
  it("reconciles cents and bank states", () => {
    const data = aggregateFinancialReport([base, { ...base, month: "2026-11", status: "confirmado", receivedCents: 10001, overdue: false }, { ...base, donorId: "2", status: "divergente", receivedCents: 5000 }, { ...base, donorId: "3", status: "nao_identificado" }]);
    expect(data.summary).toEqual({ previsto: 40004, recebido: 15001, emAberto: 25003, naoIdentificadoDivergente: 5000 });
    expect(data.donors[0].parcelasEmAtraso).toBe(1);
    expect(data.months.reduce((sum, row) => sum + row.recebido, 0)).toBe(data.summary.recebido);
    expect(data.byFrequency.mensal.previsto).toBe(40004);
    expect(data.byFrequency.unica.previsto).toBe(0);
    const csv = serializeFinancialReportCsv({ filters: { from: "2026-10", to: "2026-11" }, ...data });
    expect(csv).toMatch(/^\uFEFF/);
    expect(csv).toContain("'=Ana");
    expect(csv).toContain('"mensal","400.04"');
  });
});
