import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DonorReports } from "@/app/admin/_actions/donor-report-actions";

const { getDonorReports } = vi.hoisted(() => ({ getDonorReports: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-report-actions", () => ({ getDonorReports }));
vi.mock("recharts", () => {
  const Tag = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Bar: Tag, BarChart: Tag, CartesianGrid: Tag, Cell: Tag, ResponsiveContainer: Tag, Tooltip: Tag, XAxis: Tag, YAxis: Tag };
});

import { DonorReportsClient } from "@/app/admin/relatorios/reports-client";

const initial: DonorReports = {
  filters: {}, total: 3,
  residenceByState: [
    { key: "SP", label: "São Paulo", count: 2 },
    { key: "__unknown__", label: "Local não identificado", count: 1 },
  ],
  prioryOrChapel: [
    { key: "nenhuma", label: "Nenhuma", count: 1 },
    { key: "capela-a", label: "Capela A", count: 1 },
    { key: "__unreported__", label: "Não informado", count: 1 },
  ],
};

afterEach(cleanup);

describe("DonorReportsClient", () => {
  it("shows all-time defaults, accessible filters, charts, and equivalent count tables", () => {
    render(<DonorReportsClient initialReports={initial} />);
    expect(screen.getByLabelText("Data inicial")).toHaveValue("");
    expect(screen.getByLabelText("Data final")).toHaveValue("");
    expect(screen.getByLabelText("Frequência")).toHaveValue("");
    expect(screen.getByText("População selecionada:").parentElement).toHaveTextContent("3 cadastros");
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getByRole("table", { name: /Estado de residência/ })).toHaveTextContent("São Paulo2Local não identificado1");
    expect(screen.getByRole("table", { name: /Priorado ou capela/ })).toHaveTextContent("Capela A1Não informado1Nenhuma1");
    expect(screen.getByRole("img", { name: /Gráfico de barras: Estado de residência/ })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Gráfico de barras: Priorado ou capela/ })).not.toBeInTheDocument();
  });

  it("submits filters by keyboard and updates the displayed population", async () => {
    getDonorReports.mockResolvedValue({ ...initial, filters: { from: "2026-01-01", frequency: "mensal" }, total: 2 });
    render(<DonorReportsClient initialReports={initial} />);
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Frequência"), { target: { value: "mensal" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(screen.getByText("População selecionada:").parentElement).toHaveTextContent("2 cadastros"));
    expect(getDonorReports).toHaveBeenCalledWith({ from: "2026-01-01", to: undefined, frequency: "mensal" });
  });
});
