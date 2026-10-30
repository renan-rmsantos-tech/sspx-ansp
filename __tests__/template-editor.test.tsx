import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

const { mockSaveTemplate } = vi.hoisted(() => ({
  mockSaveTemplate: vi.fn(),
}));

vi.mock("@/app/admin/_actions/admin-actions", () => ({
  saveTemplate: mockSaveTemplate,
  getTemplates: vi.fn(),
}));

import { TemplateEditor, type TemplateData } from "@/app/admin/_components/template-editor";
import { TemplatePreview, SAMPLE_DATA } from "@/app/admin/_components/template-preview";
import { replaceTokens } from "@/lib/templates/token-replacer";

function makeTemplate(overrides: Partial<TemplateData> = {}): TemplateData {
  return {
    id: "t-1",
    tipo: "aprovacao",
    cabecalho: "Cabeçalho {nome_pai}",
    corpo: "Corpo {aluno} {desconto}%",
    rodape: "Rodapé {data}",
    ...overrides,
  };
}

describe("TemplateEditor", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  // As abas Aprovação/Rejeição vivem em ModelosTabs (modelos-tabs.test.tsx);
  // o editor recebe um único `tipo`.
  it("displays all three sections (cabeçalho, corpo, rodapé) per template", () => {
    const templates = [makeTemplate()];
    render(<TemplateEditor initialTemplates={templates} tipo="aprovacao" />);

    expect(screen.getByTestId("field-cabecalho")).toBeDefined();
    expect(screen.getByTestId("field-corpo")).toBeDefined();
    expect(screen.getByTestId("field-rodape")).toBeDefined();
  });

  it("loads initial template data into fields", () => {
    const templates = [
      makeTemplate({
        tipo: "aprovacao",
        cabecalho: "Header A",
        corpo: "Body A",
        rodape: "Footer A",
      }),
    ];
    render(<TemplateEditor initialTemplates={templates} tipo="aprovacao" />);

    expect((screen.getByTestId("field-cabecalho") as HTMLTextAreaElement).value).toBe("Header A");
    expect((screen.getByTestId("field-corpo") as HTMLTextAreaElement).value).toBe("Body A");
    expect((screen.getByTestId("field-rodape") as HTMLTextAreaElement).value).toBe("Footer A");
  });

  it("edits only the template of the requested tipo", async () => {
    mockSaveTemplate.mockResolvedValueOnce({ success: true });
    const templates = [
      makeTemplate({ tipo: "aprovacao", cabecalho: "Aprovação Header" }),
      makeTemplate({ id: "t-2", tipo: "rejeicao", cabecalho: "Rejeição Header" }),
    ];
    render(<TemplateEditor initialTemplates={templates} tipo="rejeicao" />);

    expect((screen.getByTestId("field-cabecalho") as HTMLTextAreaElement).value).toBe("Rejeição Header");

    await act(async () => {
      fireEvent.click(screen.getByTestId("save-button"));
    });
    expect(mockSaveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "rejeicao", cabecalho: "Rejeição Header" })
    );
  });

  it("displays all 8 available tokens", () => {
    render(<TemplateEditor initialTemplates={[]} tipo="aprovacao" />);

    const tokens = screen.getAllByTestId("token-item");
    expect(tokens).toHaveLength(8);

    const tokenTexts = tokens.map((t) => t.textContent ?? "");
    expect(tokenTexts.some((t) => t.includes("{nome_pai}"))).toBe(true);
    expect(tokenTexts.some((t) => t.includes("{nome_mae}"))).toBe(true);
    expect(tokenTexts.some((t) => t.includes("{escola}"))).toBe(true);
    expect(tokenTexts.some((t) => t.includes("{aluno}"))).toBe(true);
    expect(tokenTexts.some((t) => t.includes("{desconto}"))).toBe(true);
    expect(tokenTexts.some((t) => t.includes("{data}"))).toBe(true);
    expect(tokenTexts.some((t) => t.includes("{motivo}"))).toBe(true);
    expect(tokenTexts.some((t) => t.includes("{ano_letivo}"))).toBe(true);
  });

  it("saves template and shows success message", async () => {
    mockSaveTemplate.mockResolvedValueOnce({ success: true });
    const templates = [makeTemplate()];

    render(<TemplateEditor initialTemplates={templates} tipo="aprovacao" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("save-button"));
    });

    expect(mockSaveTemplate).toHaveBeenCalledWith({
      tipo: "aprovacao",
      cabecalho: "Cabeçalho {nome_pai}",
      corpo: "Corpo {aluno} {desconto}%",
      rodape: "Rodapé {data}",
    });
    expect(screen.getByTestId("save-message").textContent).toBe(
      "Modelo salvo com sucesso."
    );
  });

  it("shows error message on save failure", async () => {
    mockSaveTemplate.mockResolvedValueOnce({
      success: false,
      error: "Erro ao salvar modelo.",
    });

    render(<TemplateEditor initialTemplates={[makeTemplate()]} tipo="aprovacao" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("save-button"));
    });

    expect(screen.getByTestId("save-message").textContent).toBe(
      "Erro ao salvar modelo."
    );
  });

  it("saving template persists changes and re-renders preview", async () => {
    mockSaveTemplate.mockResolvedValueOnce({ success: true });
    const templates = [makeTemplate({ cabecalho: "Olá {nome_pai}" })];

    render(<TemplateEditor initialTemplates={templates} tipo="aprovacao" />);

    fireEvent.change(screen.getByTestId("field-cabecalho"), {
      target: { value: "Prezado {nome_pai}" },
    });

    const preview = screen.getByTestId("template-preview");
    expect(preview.textContent).toContain("Prezado João da Silva");

    await act(async () => {
      fireEvent.click(screen.getByTestId("save-button"));
    });

    expect(mockSaveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ cabecalho: "Prezado {nome_pai}" })
    );
  });
});

describe("TemplatePreview", () => {
  afterEach(cleanup);

  it("replaces tokens with sample data correctly", () => {
    render(
      <TemplatePreview
        cabecalho="Para: {nome_pai} e {nome_mae}"
        corpo="Aluno(s): {aluno} — Desconto: {desconto}% — Ano: {ano_letivo}"
        rodape="Data: {data} — Motivo: {motivo}"
      />
    );

    const preview = screen.getByTestId("template-preview");
    expect(preview.textContent).toContain("João da Silva");
    expect(preview.textContent).toContain("Maria da Silva");
    expect(preview.textContent).toContain("Pedro da Silva, Ana da Silva");
    expect(preview.textContent).toContain("50%");
    expect(preview.textContent).toContain("2026");
    expect(preview.textContent).toContain("Renda familiar insuficiente");
  });

  it("handles empty template gracefully", () => {
    render(<TemplatePreview cabecalho="" corpo="" rodape="" />);
    const preview = screen.getByTestId("template-preview");
    expect(preview).toBeDefined();
  });
});
