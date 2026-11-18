import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/app/form/_actions/form-actions", () => ({
  getActiveSchoolYear: vi.fn(),
  createApplicantUploadUrl: vi.fn(),
  saveApplicationDraft: vi.fn(),
  submitApplication: vi.fn(),
}));

vi.mock("@/app/solicitar-bolsa/_actions/applicant-actions", () => ({
  logoutApplicant: vi.fn(),
}));

vi.mock("@/lib/auth/applicant-session", () => ({ getApplicant: vi.fn() }));

vi.mock("@/lib/applicant/scholarship-state", () => ({
  findApplicantApplication: vi.fn(),
  findApplicationDraft: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/app/form/_components/scholarship-form", () => ({
  ScholarshipForm: (props: { initialStep?: number; initialData?: { email: string; pai_nome: string }; autosave?: boolean }) => (
    <div data-testid="scholarship-form" data-step={props.initialStep} data-autosave={String(props.autosave)}>
      {props.initialData?.email}|{props.initialData?.pai_nome}
    </div>
  ),
}));

import { getActiveSchoolYear } from "@/app/form/_actions/form-actions";
import { getApplicant } from "@/lib/auth/applicant-session";
import { findApplicantApplication, findApplicationDraft } from "@/lib/applicant/scholarship-state";
import FormPage from "@/app/solicitar-bolsa/(apresentacao)/page";

const mockGetActiveSchoolYear = vi.mocked(getActiveSchoolYear);
const mockGetApplicant = vi.mocked(getApplicant);
const mockFindApplication = vi.mocked(findApplicantApplication);
const mockFindDraft = vi.mocked(findApplicationDraft);

const OPEN_YEAR = { id: "1", nome: "2026", data_inicio: "2026-01-01", data_fim: "2026-12-31", ativo: true };
const APPLICANT = { id: "acc-1", email: "maria@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetApplicant.mockResolvedValue(APPLICANT);
  mockFindApplication.mockResolvedValue(undefined);
  mockFindDraft.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("SolicitarBolsaPage (enrollment check)", () => {
  it("shows closed message when no active school year", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: false });
    render(await FormPage());
    expect(screen.getByText("Formulário indisponível")).toBeInTheDocument();
    expect(screen.queryByTestId("scholarship-form")).not.toBeInTheDocument();
  });

  it("shows the form with the account e-mail when enrollment is open", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: true, year: OPEN_YEAR });
    render(await FormPage());
    expect(screen.getByTestId("scholarship-form")).toHaveTextContent("maria@example.com|");
    expect(screen.getByTestId("scholarship-form")).toHaveAttribute("data-autosave", "true");
    expect(screen.getByTestId("applicant-bar")).toHaveTextContent("maria@example.com");
    expect(screen.queryByText("Formulário indisponível")).not.toBeInTheDocument();
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

describe("SolicitarBolsaPage (applicant account)", () => {
  it("sends a visitor without a session to the login page while enrollment is open", async () => {
    mockGetApplicant.mockResolvedValue(null);
    mockGetActiveSchoolYear.mockResolvedValue({ open: true, year: OPEN_YEAR });
    await expect(FormPage()).rejects.toThrow("REDIRECT:/solicitar-bolsa/entrar");
  });

  it("shows the closed message and a login link to a visitor while enrollment is closed", async () => {
    mockGetApplicant.mockResolvedValue(null);
    mockGetActiveSchoolYear.mockResolvedValue({ open: false });
    render(await FormPage());
    expect(screen.getByText("Formulário indisponível")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entre para acompanhar" })).toHaveAttribute("href", "/solicitar-bolsa/entrar");
  });

  it("sends an applicant who already submitted to the tracking page", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: true, year: OPEN_YEAR });
    mockFindApplication.mockResolvedValue({ id: "app-1" } as never);
    await expect(FormPage()).rejects.toThrow("REDIRECT:/solicitar-bolsa/minha-solicitacao");
    expect(mockFindApplication).toHaveBeenCalledWith("acc-1", "1");
  });

  it("restores the saved draft and its step", async () => {
    mockGetActiveSchoolYear.mockResolvedValue({ open: true, year: OPEN_YEAR });
    mockFindDraft.mockResolvedValue({
      data: { pai_nome: "José de Almeida", email: "familia@example.com" },
      current_step: 3,
      updated_at: "2026-11-17T12:00:00Z",
    });
    render(await FormPage());
    expect(screen.getByTestId("scholarship-form")).toHaveTextContent("familia@example.com|José de Almeida");
    expect(screen.getByTestId("scholarship-form")).toHaveAttribute("data-step", "3");
  });
});
