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
  it("shows opening date of the upcoming inactive year", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: false, upcomingYear: {
      id: "next-year", nome: "2027", data_inicio: "2026-11-01", data_fim: "2026-12-15", ativo: false,
    } });
    render(await FormPage());
    expect(screen.getByText("Abertura das inscrições")).toBeInTheDocument();
    expect(screen.getByText(/O formulário de solicitação de bolsa para o ano letivo 2027 estará disponível de/)).toBeInTheDocument();
    expect(screen.getByText("01/11/2026")).toHaveAttribute("dateTime", "2026-11-01");
    expect(screen.getByText("15/12/2026")).toHaveAttribute("dateTime", "2026-12-15");
    expect(screen.queryByText("Formulário indisponível")).not.toBeInTheDocument();
    expect(screen.queryByText(/Entre em contato com a secretaria/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("scholarship-form")).not.toBeInTheDocument();
  });
  it("does not announce a past opening date when no future period exists", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: false, year: {
      id: "past-year", nome: "2025", data_inicio: "2025-01-01", data_fim: "2025-12-31", ativo: true,
    } });
    render(await FormPage());
    expect(screen.getByText(/A data de abertura das próximas inscrições ainda não foi cadastrada/)).toBeInTheDocument();
    expect(screen.queryByText("01/01/2025")).not.toBeInTheDocument();
  });
});
