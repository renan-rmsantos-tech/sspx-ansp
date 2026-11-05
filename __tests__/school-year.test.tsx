import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SchoolYearList } from "@/app/admin/_components/school-year-list";
import { AnoLetivoClient } from "@/app/admin/ano-letivo/client";

vi.mock("@/app/admin/_actions/admin-actions", () => ({ deleteSchoolYear: vi.fn() }));

const year = (id: string, start: string, end: string, ativo = false) => ({
  id, nome: id, data_inicio: start, data_fim: end, ativo,
});

describe("SchoolYearList", () => {
  afterEach(cleanup);

  it("derives statuses from the registration dates, regardless of the stored flag", () => {
    vi.setSystemTime(new Date("2026-10-30T15:00:00Z"));
    try {
      render(<SchoolYearList years={[
        year("futuro", "2026-11-15", "2026-12-21"),
        year("atual", "2026-10-01", "2026-11-01"),
        year("passado", "2025-01-01", "2025-12-31", true),
      ]} onYearsChange={vi.fn()} />);
      expect(screen.getAllByTestId("status-badge").map((badge) => badge.textContent)).toEqual([
        "Não iniciado", "Ativo", "Encerrado",
      ]);
      expect(screen.queryByTestId("toggle-button")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the given reference date and opens the requested delete confirmation", () => {
    render(<SchoolYearList years={[
      year("futuro", "2027-01-11", "2027-02-05"),
      year("atual", "2026-10-01", "2026-12-18"),
    ]} onYearsChange={vi.fn()} today="2026-11-04" defaultConfirmDeleteId="futuro" />);
    expect(screen.getAllByTestId("status-badge").map((badge) => badge.textContent)).toEqual(["Não iniciado", "Ativo"]);
    expect(screen.getByTestId("confirm-dialog")).toHaveTextContent("Excluir este ano letivo?");
  });
});

describe("AnoLetivoClient", () => {
  afterEach(cleanup);

  it("shows a notice instead of the list when loading fails", () => {
    render(<AnoLetivoClient initialYears={[]} error="Erro ao buscar anos letivos." />);
    expect(screen.getByTestId("school-years-error")).toHaveTextContent("Erro ao buscar anos letivos.");
    expect(screen.queryByTestId("school-year-list")).toBeNull();
  });

  it("can start with the new school year form open", () => {
    render(<AnoLetivoClient initialYears={[]} initialCreating />);
    expect(screen.getByTestId("school-year-form")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo ano letivo/ })).toBeNull();
  });
});
