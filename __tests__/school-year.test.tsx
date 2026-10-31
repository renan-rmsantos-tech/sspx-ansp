import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchoolYearList } from "@/app/admin/_components/school-year-list";

vi.mock("@/app/admin/_actions/admin-actions", () => ({ deleteSchoolYear: vi.fn() }));

const year = (id: string, start: string, end: string, ativo = false) => ({
  id, nome: id, data_inicio: start, data_fim: end, ativo,
});

describe("SchoolYearList", () => {
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
});
