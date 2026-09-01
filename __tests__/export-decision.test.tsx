import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

const {
  mockGetApplicationDetail,
  mockExportDecision,
  mockExportContract,
} = vi.hoisted(() => ({
  mockGetApplicationDetail: vi.fn(),
  mockExportDecision: vi.fn(),
  mockExportContract: vi.fn(),
}));

vi.mock("@/app/admin/_actions/admin-actions", () => ({
  getApplicationDetail: mockGetApplicationDetail,
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  exportDecision: mockExportDecision,
  exportContract: mockExportContract,
  getDocumentUrl: vi.fn(),
}));

vi.mock("@/app/admin/_components/application-observations", () => ({
  ApplicationObservations: () => null,
}));

import { ApplicationCard, type ApplicationSummary } from "@/app/admin/_components/application-card";

// base64 de "PDF"
const PDF_BASE64 = Buffer.from("PDF").toString("base64");

function makeDecidedApp(): ApplicationSummary {
  return {
    id: "app-1",
    status: "aprovada",
    escola: "Colégio São José",
    pai_nome: "João Silva",
    mae_nome: "Maria Silva",
    data_envio: "2026-03-01T10:00:00Z",
    desconto_solicitado: 50,
    desconto_concedido: 40,
    motivo: "Renda insuficiente",
    data_decisao: "2026-03-15T14:00:00Z",
    students: [
      { id: "s1", nome: "Pedro Silva", serie: "5º ano", mensalidade: 1200 },
    ],
  };
}

async function openExportPreview() {
  const app = makeDecidedApp();
  const detail = {
    ...app,
    other_children: [],
    vehicles: [],
    collaboration: null,
    benefactors: [],
    documents: [],
  };
  mockGetApplicationDetail.mockResolvedValueOnce({ data: detail });
  mockExportDecision.mockResolvedValueOnce({
    pdfBase64: PDF_BASE64,
    filename: "decisao_aprovacao_João_Silva.pdf",
  });

  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();

  render(<ApplicationCard application={app} onDecision={vi.fn()} />);

  await act(async () => {
    fireEvent.click(screen.getByTestId("export-button"));
  });
}

describe("Export Decision", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  beforeEach(() => vi.clearAllMocks());

  it("clicking export opens a PDF preview with print and download options", async () => {
    await openExportPreview();

    expect(mockExportDecision).toHaveBeenCalledWith("app-1");
    expect(screen.getByTestId("pdf-preview-modal")).toBeDefined();
    expect(screen.getByTestId("pdf-preview-frame")).toBeDefined();
    expect(screen.getByTestId("pdf-print-button")).toBeDefined();
    expect(screen.getByTestId("pdf-download-button")).toBeDefined();
    // A pré-visualização aponta para o blob do PDF gerado.
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it("download button triggers a download with the .pdf filename", async () => {
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = mockClick;
      return el;
    });

    await openExportPreview();

    const downloadButton = screen.getByTestId("pdf-download-button");
    await act(async () => {
      fireEvent.click(downloadButton);
    });

    expect(mockClick).toHaveBeenCalled();
  });

  it("print button asks the preview frame to print", async () => {
    await openExportPreview();

    const frame = screen.getByTestId("pdf-preview-frame") as HTMLIFrameElement;
    const mockPrint = vi.fn();
    Object.defineProperty(frame, "contentWindow", {
      configurable: true,
      value: { focus: vi.fn(), print: mockPrint },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("pdf-print-button"));
    });

    expect(mockPrint).toHaveBeenCalled();
  });

  it("preview can be closed", async () => {
    await openExportPreview();

    expect(screen.queryByTestId("pdf-preview-modal")).not.toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId("pdf-close-button"));
    });
    expect(screen.queryByTestId("pdf-preview-modal")).toBeNull();
  });

  it("clicking generate contract opens a PDF preview with print and download options", async () => {
    const app = makeDecidedApp();
    mockExportContract.mockResolvedValueOnce({
      pdfBase64: PDF_BASE64,
      filename: "contrato_Joao_Silva.pdf",
    });

    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();

    render(<ApplicationCard application={app} onDecision={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("contract-button"));
    });

    expect(mockExportContract).toHaveBeenCalledWith("app-1");
    expect(screen.getByTestId("pdf-preview-modal")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-print-button")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-download-button")).toBeInTheDocument();
    expect(screen.getByText("Contrato")).toBeInTheDocument();
  });
});
