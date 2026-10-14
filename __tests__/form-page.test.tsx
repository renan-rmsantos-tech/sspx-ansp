import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/app/form/_actions/form-actions", () => ({
  getActiveSchoolYear: vi.fn(),
  createUploadUrl: vi.fn(),
  submitApplication: vi.fn(),
}));

vi.mock("@/app/form/_components/scholarship-form", () => ({
  ScholarshipForm: () => <div data-testid="scholarship-form">Form</div>,
}));

import { getActiveSchoolYear } from "@/app/form/_actions/form-actions";
import FormPage from "@/app/solicitar-bolsa/page";

const mockGetActiveSchoolYear = vi.mocked(getActiveSchoolYear);

describe("SolicitarBolsaPage (enrollment check)", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows closed message when no active school year", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: false });
    const page = await FormPage();
    render(page);
    expect(screen.getByText("Formulário indisponível")).toBeInTheDocument();
    expect(screen.queryByTestId("scholarship-form")).not.toBeInTheDocument();
  });

  it("shows form when enrollment is open", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({
      open: true,
      year: {
        id: "1",
        nome: "2026",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
        ativo: true,
      },
    });
    const page = await FormPage();
    render(page);
    expect(screen.getByTestId("scholarship-form")).toBeInTheDocument();
    expect(
      screen.queryByText("Formulário indisponível")
    ).not.toBeInTheDocument();
  });
  it.each([
    ["2027", "2027-02-01", "2027-03-15", "01/02/2027", "15/03/2027"],
    ["2025", "2025-01-01", "2025-12-31", "01/01/2025", "31/12/2025"],
  ])("shows the configured dates for the closed school year %s", async (nome, start, end, startLabel, endLabel) => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: false, year: {
      id: "year-1", nome, data_inicio: start, data_fim: end, ativo: true,
    } });
    render(await FormPage());
    expect(screen.getByText(new RegExp(`Período de inscrição para o ano letivo ${nome}`))).toBeInTheDocument();
    expect(screen.getByText(startLabel)).toHaveAttribute("dateTime", start);
    expect(screen.getByText(endLabel)).toHaveAttribute("dateTime", end);
    expect(screen.queryByTestId("scholarship-form")).not.toBeInTheDocument();
  });
});
