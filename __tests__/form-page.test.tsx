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
import FormPage from "@/app/form/page";

const mockGetActiveSchoolYear = vi.mocked(getActiveSchoolYear);

describe("FormPage (enrollment check)", () => {
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
});
