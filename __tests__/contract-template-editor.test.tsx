import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { screen, fireEvent, cleanup, act } from "@testing-library/react";

const { mockSaveContractTemplate } = vi.hoisted(() => ({
  mockSaveContractTemplate: vi.fn(),
}));

vi.mock("@/app/admin/_actions/admin-actions", () => ({
  saveContractTemplate: mockSaveContractTemplate,
}));

import { ContractTemplateEditor } from "@/app/admin/_components/contract-template-editor";
import type { ContractTemplate } from "@/app/admin/_actions/admin-actions";
import * as adminActions from "@/app/admin/_actions/admin-actions";
import { withServerActions } from "./helpers/server-actions";

const render = withServerActions(adminActions);

function makeTemplate(overrides: Partial<ContractTemplate> = {}): ContractTemplate {
  return {
    id: "tpl-1",
    titulo: "CONTRATO DE BOLSA",
    cabecalho: "BENEFICIÁRIO: {aluno}, CPF {cpf_responsavel}.",
    clausulas: [
      { titulo: "CLÁUSULA PRIMEIRA", corpo: "Bolsa de {desconto}% para {ano_letivo}." },
    ],
    rodape: "{data_extenso}",
    ...overrides,
  };
}

describe("ContractTemplateEditor", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("renders the token reference", () => {
    render(<ContractTemplateEditor initialTemplate={makeTemplate()} />);
    const tokens = screen.getAllByTestId("contract-token-item");
    expect(tokens.length).toBeGreaterThan(0);
    expect(screen.getByText("{aluno}")).toBeInTheDocument();
  });

  it("loads initial section values", () => {
    render(<ContractTemplateEditor initialTemplate={makeTemplate()} />);
    expect(screen.getByTestId("field-titulo")).toHaveValue("CONTRATO DE BOLSA");
    expect(screen.getByTestId("clause-titulo-0")).toHaveValue("CLÁUSULA PRIMEIRA");
  });

  it("preview replaces tokens with sample data", () => {
    render(<ContractTemplateEditor initialTemplate={makeTemplate()} />);
    const preview = screen.getByTestId("contract-preview");
    // sample desconto is 50, ano_letivo 2026
    expect(preview).toHaveTextContent("Bolsa de 50% para 2026.");
    expect(preview.textContent).not.toMatch(/\{[a-z_]+\}/);
  });

  it("adds and removes clauses", () => {
    render(<ContractTemplateEditor initialTemplate={makeTemplate()} />);
    expect(screen.getAllByTestId(/^clause-\d+$/)).toHaveLength(1);

    fireEvent.click(screen.getByTestId("add-clause"));
    expect(screen.getAllByTestId(/^clause-\d+$/)).toHaveLength(2);

    fireEvent.click(screen.getByTestId("remove-clause-1"));
    expect(screen.getAllByTestId(/^clause-\d+$/)).toHaveLength(1);
  });

  it("saves the template via the action", async () => {
    mockSaveContractTemplate.mockResolvedValue({ success: true });
    render(<ContractTemplateEditor initialTemplate={makeTemplate()} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("save-contract-button"));
    });

    expect(mockSaveContractTemplate).toHaveBeenCalledWith({
      titulo: "CONTRATO DE BOLSA",
      cabecalho: "BENEFICIÁRIO: {aluno}, CPF {cpf_responsavel}.",
      clausulas: [
        { titulo: "CLÁUSULA PRIMEIRA", corpo: "Bolsa de {desconto}% para {ano_letivo}." },
      ],
      rodape: "{data_extenso}",
    });
    expect(screen.getByTestId("contract-save-message")).toHaveTextContent(
      "salvo com sucesso"
    );
  });

  it("shows an error message when saving fails", async () => {
    mockSaveContractTemplate.mockResolvedValue({ success: false, error: "Falhou" });
    render(<ContractTemplateEditor initialTemplate={makeTemplate()} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("save-contract-button"));
    });

    expect(screen.getByTestId("contract-save-message")).toHaveTextContent("Falhou");
  });

  it("starts with empty defaults when no template exists", () => {
    render(<ContractTemplateEditor initialTemplate={null} />);
    expect(screen.getByText("Nenhuma cláusula adicionada.")).toBeInTheDocument();
  });
});
