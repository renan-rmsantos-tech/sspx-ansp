import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Step1Applicant } from "@/app/form/_components/step-1-applicant";
import { INITIAL_FORM_DATA } from "@/app/form/_components/form-types";
import type { FormData } from "@/app/form/_components/form-types";

vi.mock("@/lib/form/scholarship-uploads", () => ({
  SCHOLARSHIP_UPLOADS_ENABLED: true,
  SCHOLARSHIP_UPLOADS_DISABLED_MESSAGE:
    "O envio de documentos está temporariamente desativado nesta fase de testes.",
}));

vi.mock("@/app/form/_actions/form-actions", () => ({
  createUploadUrl: vi.fn().mockResolvedValue({
    url: "https://example.com/upload",
    path: "pending/abc/rg_pai/file.pdf",
  }),
}));

function renderStep1(overrides: Partial<FormData> = {}, errors: Record<string, string> = {}) {
  const data = { ...INITIAL_FORM_DATA, ...overrides };
  const onChange = vi.fn();
  render(<Step1Applicant data={data} onChange={onChange} errors={errors} />);
  return { onChange };
}

describe("Step1Applicant", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all required parent fields", () => {
    renderStep1();
    expect(screen.getByTestId("pai-nome")).toBeInTheDocument();
    expect(screen.getByTestId("pai-rg")).toBeInTheDocument();
    expect(screen.getByTestId("pai-cpf")).toBeInTheDocument();
    expect(screen.getByTestId("mae-nome")).toBeInTheDocument();
    expect(screen.getByTestId("mae-cpf")).toBeInTheDocument();
    expect(screen.getByTestId("endereco")).toBeInTheDocument();
    expect(screen.getByTestId("telefone")).toBeInTheDocument();
  });

  it("renders section titles", () => {
    renderStep1();
    expect(screen.getByText("Dados dos Solicitantes")).toBeInTheDocument();
    expect(screen.getByText("Outros Filhos")).toBeInTheDocument();
  });

  it("shows escola fixed to Colégio São José and not editable", () => {
    renderStep1();
    const select = screen.getByTestId("escola-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toBeDisabled();
    expect(select.value).toBe("Colégio São José");
    expect(INITIAL_FORM_DATA.escola).toBe("Colégio São José");
  });

  it("updates pai_nome on change", () => {
    const { onChange } = renderStep1();
    fireEvent.change(screen.getByTestId("pai-nome"), {
      target: { value: "João" },
    });
    expect(onChange).toHaveBeenCalledWith({ pai_nome: "João" });
  });

  it("adds a child entry", () => {
    const { onChange } = renderStep1();
    fireEvent.click(screen.getByTestId("add-child"));
    expect(onChange).toHaveBeenCalledWith({
      outros_filhos: [{ nome: "", cpf: "", nascimento: "" }],
    });
  });

  it("removes a child entry", () => {
    const { onChange } = renderStep1({
      outros_filhos: [
        { nome: "Ana", cpf: "", nascimento: "2010-01-01" },
        { nome: "Bruno", cpf: "", nascimento: "2012-05-05" },
      ],
    });
    const removeButtons = screen.getAllByTestId("remove-child");
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith({
      outros_filhos: [{ nome: "Bruno", cpf: "", nascimento: "2012-05-05" }],
    });
  });

  it("updates child nome field", () => {
    const { onChange } = renderStep1({
      outros_filhos: [{ nome: "", cpf: "", nascimento: "" }],
    });
    fireEvent.change(screen.getByTestId("filho-nome-0"), {
      target: { value: "Ana" },
    });
    expect(onChange).toHaveBeenCalledWith({
      outros_filhos: [{ nome: "Ana", cpf: "", nascimento: "" }],
    });
  });

  it("shows error messages for invalid fields", () => {
    renderStep1({}, { pai_nome: "Campo obrigatório", endereco: "Endereço é obrigatório" });
    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument();
    expect(screen.getByText("Endereço é obrigatório")).toBeInTheDocument();
  });

  it("renders upload areas for parent documents", () => {
    renderStep1();
    expect(screen.getByText("Declaração de vaga do colégio")).toBeInTheDocument();
    expect(screen.getByText(/RG ou CPF do pai/)).toBeInTheDocument();
    expect(screen.getByText(/RG ou CPF da mãe/)).toBeInTheDocument();
    expect(screen.getByText(/comprovante de endereço/)).toBeInTheDocument();
  });

  it("places the school vacancy declaration as the first upload option", () => {
    renderStep1();
    const uploadAreas = screen.getAllByTestId("upload-area");
    expect(uploadAreas[0]).toHaveTextContent(
      "para enviar a declaração de vaga do colégio"
    );
  });

  it("updates mae_cpf on change", () => {
    const { onChange } = renderStep1();
    fireEvent.change(screen.getByTestId("mae-cpf"), {
      target: { value: "123.456.789-00" },
    });
    expect(onChange).toHaveBeenCalledWith({ mae_cpf: "123.456.789-00" });
  });
});
