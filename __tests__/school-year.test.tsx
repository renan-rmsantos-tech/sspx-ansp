import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";

const {
  mockToggleSchoolYear,
  mockDeleteSchoolYear,
  mockCreateSchoolYear,
} = vi.hoisted(() => ({
  mockToggleSchoolYear: vi.fn(),
  mockDeleteSchoolYear: vi.fn(),
  mockCreateSchoolYear: vi.fn(),
}));

vi.mock("@/app/admin/_actions/admin-actions", () => ({
  toggleSchoolYear: mockToggleSchoolYear,
  deleteSchoolYear: mockDeleteSchoolYear,
  createSchoolYear: mockCreateSchoolYear,
  getSchoolYears: vi.fn(),
}));

import { SchoolYearList, type SchoolYear } from "@/app/admin/_components/school-year-list";
import { SchoolYearForm } from "@/app/admin/_components/school-year-form";
import { AnoLetivoClient } from "@/app/admin/ano-letivo/client";

function makeYear(overrides: Partial<SchoolYear> = {}): SchoolYear {
  return {
    id: "y-1",
    nome: "2026",
    data_inicio: "2026-02-01",
    data_fim: "2026-12-15",
    ativo: false,
    ...overrides,
  };
}

describe("SchoolYearList", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("renders all years with correct status badges", () => {
    const years = [
      makeYear({ id: "y-1", nome: "2026", ativo: true }),
      makeYear({ id: "y-2", nome: "2025", ativo: false }),
    ];
    const onChange = vi.fn();
    render(<SchoolYearList years={years} onYearsChange={onChange} />);

    const badges = screen.getAllByTestId("status-badge");
    expect(badges[0].textContent).toBe("Ativo");
    expect(badges[1].textContent).toBe("Inativo");
    expect(screen.getByText("2026")).toBeDefined();
    expect(screen.getByText("2025")).toBeDefined();
  });

  it("shows empty message when no years", () => {
    render(<SchoolYearList years={[]} onYearsChange={vi.fn()} />);
    expect(screen.getByText(/Nenhum ano letivo cadastrado/)).toBeDefined();
  });

  it("shows confirmation dialog before deactivating active year", async () => {
    const years = [makeYear({ ativo: true })];
    const onChange = vi.fn();
    render(<SchoolYearList years={years} onYearsChange={onChange} />);

    fireEvent.click(screen.getByTestId("toggle-button"));
    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
    expect(screen.getByText(/Desativar ano letivo/)).toBeDefined();
  });

  it("activates inactive year without confirmation", async () => {
    const years = [makeYear({ ativo: false })];
    const onChange = vi.fn();
    mockToggleSchoolYear.mockResolvedValueOnce({ success: true });

    render(<SchoolYearList years={years} onYearsChange={onChange} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("toggle-button"));
    });

    expect(mockToggleSchoolYear).toHaveBeenCalledWith("y-1");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows confirmation dialog before deletion", () => {
    const years = [makeYear()];
    render(<SchoolYearList years={years} onYearsChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId("delete-button"));
    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
    expect(screen.getByText(/Excluir ano letivo/)).toBeDefined();
  });

  it("deletes year after confirmation", async () => {
    const years = [makeYear()];
    const onChange = vi.fn();
    mockDeleteSchoolYear.mockResolvedValueOnce({ success: true });

    render(<SchoolYearList years={years} onYearsChange={onChange} />);
    fireEvent.click(screen.getByTestId("delete-button"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-ok"));
    });

    expect(mockDeleteSchoolYear).toHaveBeenCalledWith("y-1");
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("cancels confirmation dialog", () => {
    const years = [makeYear()];
    render(<SchoolYearList years={years} onYearsChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId("delete-button"));
    expect(screen.getByTestId("confirm-dialog")).toBeDefined();

    fireEvent.click(screen.getByTestId("confirm-cancel"));
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });
});

describe("SchoolYearForm", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("validates that end date is after start date", async () => {
    const onCreated = vi.fn();
    render(<SchoolYearForm onCreated={onCreated} />);

    fireEvent.change(screen.getByTestId("input-nome"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByTestId("input-inicio"), {
      target: { value: "2026-12-15" },
    });
    fireEvent.change(screen.getByTestId("input-fim"), {
      target: { value: "2026-02-01" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId("school-year-form"));
    });

    expect(screen.getByTestId("form-error").textContent).toBe(
      "Data de fim deve ser posterior à data de início."
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("rejects empty name", async () => {
    const onCreated = vi.fn();
    render(<SchoolYearForm onCreated={onCreated} />);

    fireEvent.change(screen.getByTestId("input-inicio"), {
      target: { value: "2026-02-01" },
    });
    fireEvent.change(screen.getByTestId("input-fim"), {
      target: { value: "2026-12-15" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId("school-year-form"));
    });

    expect(screen.getByTestId("form-error").textContent).toBe(
      "Nome é obrigatório."
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("submits valid form and calls onCreated", async () => {
    const onCreated = vi.fn();
    mockCreateSchoolYear.mockResolvedValueOnce({
      success: true,
      data: {
        id: "year-9",
        nome: "2026",
        data_inicio: "2026-02-01",
        data_fim: "2026-12-15",
        ativo: false,
      },
    });

    render(<SchoolYearForm onCreated={onCreated} />);

    fireEvent.change(screen.getByTestId("input-nome"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByTestId("input-inicio"), {
      target: { value: "2026-02-01" },
    });
    fireEvent.change(screen.getByTestId("input-fim"), {
      target: { value: "2026-12-15" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId("school-year-form"));
    });

    expect(mockCreateSchoolYear).toHaveBeenCalledWith({
      nome: "2026",
      data_inicio: "2026-02-01",
      data_fim: "2026-12-15",
    });
    expect(onCreated).toHaveBeenCalled();
  });
});

describe("AnoLetivoClient integration", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("creating a school year adds it to the list", async () => {
    mockCreateSchoolYear.mockResolvedValueOnce({
      success: true,
      data: {
        id: "year-27",
        nome: "2027",
        data_inicio: "2027-02-01",
        data_fim: "2027-12-15",
        ativo: false,
      },
    });

    render(<AnoLetivoClient initialYears={[]} />);

    expect(screen.getByText(/Nenhum ano letivo cadastrado/)).toBeDefined();

    fireEvent.change(screen.getByTestId("input-nome"), {
      target: { value: "2027" },
    });
    fireEvent.change(screen.getByTestId("input-inicio"), {
      target: { value: "2027-02-01" },
    });
    fireEvent.change(screen.getByTestId("input-fim"), {
      target: { value: "2027-12-15" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId("school-year-form"));
    });

    expect(screen.getByText("2027")).toBeDefined();
    expect(screen.queryByText(/Nenhum ano letivo cadastrado/)).toBeNull();
  });

  it("activating a year deactivates the previously active year", async () => {
    mockToggleSchoolYear.mockResolvedValueOnce({ success: true });

    const years = [
      makeYear({ id: "y-1", nome: "2025", ativo: true }),
      makeYear({ id: "y-2", nome: "2026", ativo: false }),
    ];

    render(<AnoLetivoClient initialYears={years} />);

    const toggleButtons = screen.getAllByTestId("toggle-button");
    await act(async () => {
      fireEvent.click(toggleButtons[1]); // Activate 2026
    });

    const badges = screen.getAllByTestId("status-badge");
    expect(badges[0].textContent).toBe("Inativo");
    expect(badges[1].textContent).toBe("Ativo");
  });

  it("deleting a year removes it from the list", async () => {
    mockDeleteSchoolYear.mockResolvedValueOnce({ success: true });

    const years = [makeYear({ id: "y-1", nome: "2026" })];
    render(<AnoLetivoClient initialYears={years} />);

    expect(screen.getByText("2026")).toBeDefined();

    fireEvent.click(screen.getByTestId("delete-button"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-ok"));
    });

    expect(screen.queryByText("2026")).toBeNull();
    expect(screen.getByText(/Nenhum ano letivo cadastrado/)).toBeDefined();
  });
});
