import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Step5Vehicles } from "@/app/form/_components/step-5-vehicles";
import { INITIAL_FORM_DATA } from "@/app/form/_components/form-types";
import type { FormData } from "@/app/form/_components/form-types";

vi.mock("@/app/form/_actions/form-actions", () => ({
  createUploadUrl: vi.fn(),
}));

function renderStep5(overrides: Partial<FormData> = {}) {
  const data = { ...INITIAL_FORM_DATA, ...overrides };
  const onChange = vi.fn();
  render(<Step5Vehicles data={data} onChange={onChange} errors={{}} />);
  return { onChange, data };
}

describe("Step5Vehicles", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders vehicle section", () => {
    renderStep5();
    expect(screen.getByText("Veículos da Família")).toBeInTheDocument();
  });

  it("adds a vehicle", () => {
    const { onChange } = renderStep5();
    fireEvent.click(screen.getByTestId("add-vehicle"));
    expect(onChange).toHaveBeenCalledWith({
      veiculos: [{ marca: "", modelo: "", ano: "" }],
    });
  });

  it("removes a vehicle", () => {
    const { onChange } = renderStep5({
      veiculos: [
        { marca: "Fiat", modelo: "Uno", ano: "2020" },
        { marca: "VW", modelo: "Gol", ano: "2019" },
      ],
    });
    const removeButtons = screen.getAllByTestId("remove-vehicle");
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith({
      veiculos: [{ marca: "VW", modelo: "Gol", ano: "2019" }],
    });
  });

  it("updates a vehicle field", () => {
    const { onChange } = renderStep5({
      veiculos: [{ marca: "", modelo: "", ano: "" }],
    });
    fireEvent.change(screen.getByTestId("veiculo-marca-0"), {
      target: { value: "Toyota" },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows vehicle validation errors when provided", () => {
    render(
      <Step5Vehicles
        data={{ ...INITIAL_FORM_DATA, veiculos: [{ marca: "", modelo: "", ano: "" }] }}
        onChange={vi.fn()}
        errors={{ veiculo_0_marca: "Marca obrigatória" }}
      />
    );
    expect(screen.getByText("Marca obrigatória")).toBeInTheDocument();
    expect(screen.getByTestId("veiculo-marca-0")).toHaveClass("border-danger");
  });

  it("does not render the Colaboração Voluntária section", () => {
    renderStep5();
    expect(screen.queryByText("Colaboração Voluntária")).not.toBeInTheDocument();
    expect(screen.queryByTestId("colaboracao")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Limpeza")).not.toBeInTheDocument();
  });

  it("renders 10 benefactor rows", () => {
    renderStep5();
    expect(screen.getByTestId("benfeitores-list")).toBeInTheDocument();
    const nameInputs = screen.getAllByPlaceholderText("Nome");
    expect(nameInputs.length).toBeGreaterThanOrEqual(10);
  });

  it("updates benefactor name", () => {
    const { onChange } = renderStep5();
    const nameInputs = screen.getAllByPlaceholderText("Nome");
    fireEvent.change(nameInputs[0], { target: { value: "Carlos" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("updates benefactor email", () => {
    const { onChange } = renderStep5();
    const emailInputs = screen.getAllByPlaceholderText("email@exemplo.com");
    fireEvent.change(emailInputs[0], {
      target: { value: "carlos@test.com" },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows benefactor validation errors when provided", () => {
    const data = { ...INITIAL_FORM_DATA };
    render(
      <Step5Vehicles
        data={data}
        onChange={vi.fn()}
        errors={{
          benfeitor_0_nome: "Nome obrigatório",
          benfeitor_0_email: "E-mail inválido",
        }}
      />
    );
    expect(screen.getByText("Nome obrigatório")).toBeInTheDocument();
    expect(screen.getByText("E-mail inválido")).toBeInTheDocument();
  });

});
