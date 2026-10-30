import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let mockSearch = "";
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/relatorios",
}));
vi.mock("@/app/admin/_actions/donor-report-actions", () => ({ getDonorReports: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-financial-report-actions", () => ({ getDonorFinancialReport: vi.fn() }));
vi.mock("recharts", () => {
  const Tag = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Bar: Tag, BarChart: Tag, CartesianGrid: Tag, Cell: Tag, ResponsiveContainer: Tag, Tooltip: Tag, XAxis: Tag, YAxis: Tag };
});

import { RelatoriosTabs } from "@/app/admin/relatorios/relatorios-tabs";

const reports = {
  filters: {},
  total: 2,
  residenceByState: [{ key: "SP", label: "São Paulo", count: 2 }],
  prioryOrChapel: [{ key: "capela-a", label: "Capela A", count: 2 }],
};
const zero = { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 };
const financial = {
  filters: { from: "2026-10", to: "2026-10" },
  summary: { previsto: 10001, recebido: 5000, emAberto: 5001, naoIdentificadoDivergente: 0 },
  byFrequency: { mensal: { previsto: 10001, recebido: 5000, emAberto: 5001, naoIdentificadoDivergente: 0 }, unica: zero },
  months: [{ month: "2026-10", previsto: 10001, recebido: 5000, emAberto: 5001, naoIdentificadoDivergente: 0 }],
  donors: [{ donorId: "1", donorName: "Ana", frequency: "mensal", pago: 5000, devido: 5001, parcelasEmAtraso: 1 }],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockSearch = "";
});

describe("RelatoriosTabs", () => {
  it("abre em Cadastros e troca para Financeiro gravando ?aba= na URL", () => {
    render(<RelatoriosTabs reports={reports} financial={financial} />);
    expect(screen.getByRole("tab", { name: "Cadastros de benfeitores" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("table", { name: /Estado de residência/ })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Valores por mês" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tab-financeiro"));
    expect(mockReplace).toHaveBeenCalledWith("/admin/relatorios?aba=financeiro", { scroll: false });
    expect(screen.getByRole("table", { name: "Valores por mês" })).toHaveTextContent("2026-10");
    expect(screen.getByRole("link", { name: "Baixar PDF" })).toHaveAttribute("href", "/admin/relatorios/financeiro/pdf?from=2026-10&to=2026-10");
    expect(screen.queryByRole("table", { name: /Estado de residência/ })).not.toBeInTheDocument();
  });

  it("segue ?aba=financeiro da URL", () => {
    mockSearch = "aba=financeiro";
    render(<RelatoriosTabs reports={reports} financial={financial} />);
    expect(screen.getByRole("tab", { name: "Financeiro" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("table", { name: "Valores por benfeitor e frequência" })).toHaveTextContent("Ana");
  });

  it("ignora um valor desconhecido em ?aba=", () => {
    mockSearch = "aba=xyz";
    render(<RelatoriosTabs reports={reports} financial={financial} />);
    expect(screen.getByRole("tab", { name: "Cadastros de benfeitores" })).toHaveAttribute("aria-selected", "true");
  });
});
