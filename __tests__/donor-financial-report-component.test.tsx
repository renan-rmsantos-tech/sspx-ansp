import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const { getReport } = vi.hoisted(() => ({ getReport: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-financial-report-actions", () => ({ getDonorFinancialReport: getReport }));
vi.mock("recharts", () => {
  const Tag = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Bar: Tag, BarChart: Tag, CartesianGrid: Tag, ResponsiveContainer: Tag, Tooltip: Tag, XAxis: Tag, YAxis: Tag };
});
import { FinancialReport } from "@/app/admin/relatorios/financial-report";
const zero = { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 };
const data = { filters: { from: "2026-10", to: "2026-11", frequency: "mensal" as const }, summary: { previsto: 10001, recebido: 5000, emAberto: 5001, naoIdentificadoDivergente: 0 }, byFrequency: { mensal: { previsto: 10001, recebido: 5000, emAberto: 5001, naoIdentificadoDivergente: 0 }, unica: zero }, months: [{ month: "2026-10", previsto: 10001, recebido: 5000, emAberto: 5001, naoIdentificadoDivergente: 0 }], donors: [{ donorId: "1", donorName: "Ana", frequency: "mensal", pago: 5000, devido: 5001, parcelasEmAtraso: 1 }] };
afterEach(() => { cleanup(); getReport.mockReset(); });
describe("financial report component", () => {
  it("renders BRL totals, frequency, monthly and donor tables and filtered CSV link", () => {
    render(<FinancialReport initialReport={data} />);
    expect(screen.getAllByText(/100,01/).length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: "Valores por mês" })).toHaveTextContent("2026-10");
    expect(screen.getByRole("table", { name: "Valores por benfeitor e frequência" })).toHaveTextContent("Ana");
    expect(screen.getByRole("table", { name: "Valores por frequência" })).toHaveTextContent("Uma vez");
    expect(screen.getByRole("link", { name: "Baixar CSV" })).toHaveAttribute("href", "/admin/relatorios/financeiro/export?from=2026-10&to=2026-11&frequency=mensal");
    expect(screen.getByRole("link", { name: "Baixar PDF" })).toHaveAttribute("href", "/admin/relatorios/financeiro/pdf?from=2026-10&to=2026-11&frequency=mensal");
  });
  it("loads empty results and shows query errors", async () => {
    getReport.mockResolvedValueOnce({ ...data, summary: zero, months: [], donors: [] }).mockRejectedValueOnce(new Error("Falha"));
    render(<FinancialReport initialReport={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(screen.getByRole("table", { name: "Valores por mês" })).not.toHaveTextContent("2026-10"));
    expect(screen.getByRole("table", { name: "Valores por benfeitor e frequência" })).not.toHaveTextContent("Ana");
    // Aguarda a transição terminar: o botão volta a "Filtrar" antes do novo clique.
    fireEvent.click(await screen.findByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Falha"));
  });
  it("exports an all-frequency range and uses a generic error for non-Error failures", async () => {
    getReport.mockRejectedValueOnce("network");
    render(<FinancialReport initialReport={{ ...data, filters: { from: "2026-10", to: "2026-10" } }} />);
    expect(screen.getByRole("link", { name: "Baixar CSV" })).toHaveAttribute("href", "/admin/relatorios/financeiro/export?from=2026-10&to=2026-10");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o relatório."));
  });
});
