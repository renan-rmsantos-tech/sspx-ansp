import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

const {
  mockGetApplicationDetail,
  mockApproveApplication,
  mockRejectApplication,
  mockExportDecision,
  mockExportContract,
  mockGetDocumentUrl,
  mockGetCurrentIssuedDocuments,
  mockGetIssuedDocumentHistory,
  mockGetIssuedDocumentUrl,
  mockGetApplicationObservations,
  mockAddApplicationObservation,
} = vi.hoisted(() => ({
  mockGetApplicationDetail: vi.fn(),
  mockApproveApplication: vi.fn(),
  mockRejectApplication: vi.fn(),
  mockExportDecision: vi.fn(),
  mockExportContract: vi.fn(),
  mockGetDocumentUrl: vi.fn(),
  mockGetCurrentIssuedDocuments: vi.fn(),
  mockGetIssuedDocumentHistory: vi.fn(),
  mockGetIssuedDocumentUrl: vi.fn(),
  mockGetApplicationObservations: vi.fn(),
  mockAddApplicationObservation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/solicitacoes",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/app/admin/_actions/admin-actions", () => ({
  getApplications: vi.fn(),
  getApplicationDetail: mockGetApplicationDetail,
  approveApplication: mockApproveApplication,
  rejectApplication: mockRejectApplication,
  exportDecision: mockExportDecision,
  exportContract: mockExportContract,
  getDocumentUrl: mockGetDocumentUrl,
  getCurrentIssuedDocuments: mockGetCurrentIssuedDocuments,
  getIssuedDocumentHistory: mockGetIssuedDocumentHistory,
  getIssuedDocumentUrl: mockGetIssuedDocumentUrl,
}));

vi.mock("@/app/admin/_actions/observation-actions", () => ({
  getApplicationObservations: mockGetApplicationObservations,
  addApplicationObservation: mockAddApplicationObservation,
}));

vi.mock("@/app/admin/_components/application-observations", () => ({
  ApplicationObservations: () => null,
}));

import { SecretariatApplicationsClient, SolicitacoesClient } from "@/app/admin/solicitacoes/client";
import type { ApplicationSummary } from "@/app/admin/_components/application-card";

function makeApp(overrides: Partial<ApplicationSummary> = {}): ApplicationSummary {
  return {
    id: "app-1",
    status: "pendente",
    escola: "Colégio São José",
    pai_nome: "João Silva",
    mae_nome: "Maria Silva",
    data_envio: "2026-03-01T10:00:00Z",
    desconto_solicitado: 50,
    desconto_concedido: null,
    motivo: null,
    data_decisao: null,
    students: [
      { id: "s1", nome: "Pedro Silva", serie: "5º ano", mensalidade: 1200 },
    ],
    ...overrides,
  };
}

async function expandCard() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("card-toggle"));
  });
}

async function openDetailTab(tab: "resumo" | "documentos" | "financeiro" | "decisao") {
  await expandCard();
  await act(async () => {
    fireEvent.click(screen.getByTestId(`detail-tab-${tab}`));
  });
}

describe("SolicitacoesClient", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentIssuedDocuments.mockResolvedValue([]);
    mockGetIssuedDocumentHistory.mockResolvedValue([]);
    mockGetApplicationDetail.mockResolvedValue({
      data: {
        id: "app-1",
        pai_nome: "João Silva",
        pai_rg: "12.345.678-9",
        pai_cpf: "123.456.789-00",
        pai_profissao: "Engenheiro",
        mae_nome: "Maria Silva",
        mae_cpf: "987.654.321-00",
        mae_profissao: "Professora",
        escola: "Colégio São José",
        endereco: "Rua A, 123",
        cep: "13250-000",
        telefone: "(11) 99999-0000",
        email: "joao@email.com",
        renda_pai: 3000,
        renda_mae: 2500,
        renda_outros: 0,
        pessoas_domicilio: 4,
        despesa_aluguel: 1200,
        despesa_servicos: 300,
        despesa_tv: 100,
        despesa_celular_plano: 80,
        despesa_celular_parcelas: 0,
        despesa_internet: 120,
        desconto_solicitado: 50,
        students: [
          { id: "s1", nome: "Pedro Silva", cpf: null, serie: "5º ano", mensalidade: 1200 },
        ],
        other_children: [],
        vehicles: [{ id: "v1", marca: "Fiat", modelo: "Uno", ano: "2015" }],
        collaboration: {
          limpeza: true,
          limpeza_vezes_semana: 2,
          mutirao: false,
          mutirao_sabados: 0,
          arrecadacao: false,
          buscar_benfeitores: true,
          outros: null,
        },
        benefactors: [{ id: "b1", nome: "Ana Costa", email: "ana@email.com" }],
        documents: [
          {
            id: "d0",
            application_id: "app-1",
            categoria: "declaracao_vaga",
            nome_arquivo: "declaracao.pdf",
            storage_path: "pending/declaracao.pdf",
            mime_type: "application/pdf",
          },
          {
            id: "d1",
            application_id: "app-1",
            categoria: "rg_pai",
            nome_arquivo: "rg.pdf",
            storage_path: "pending/rg.pdf",
            mime_type: "application/pdf",
          },
        ],
      },
    });
  });

  it("renders stats dashboard with correct counts", () => {
    const apps = [
      makeApp({ id: "a1", status: "pendente" }),
      makeApp({ id: "a2", status: "aprovada" }),
      makeApp({ id: "a3", status: "rejeitada" }),
      makeApp({ id: "a4", status: "pendente" }),
    ];
    render(<SolicitacoesClient initialApplications={apps} />);

    expect(screen.getByTestId("stat-total")).toHaveTextContent("4");
    expect(screen.getByTestId("stat-pendentes")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-aprovadas")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-rejeitadas")).toHaveTextContent("1");
  });

  it("renders application card with family names, status badge, escola, date, student count, discount", () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Maria Silva/)).toBeInTheDocument();
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Pendente");
    expect(screen.getByText("Colégio São José")).toBeInTheDocument();
    expect(screen.getByTestId("student-count")).toHaveTextContent("1 aluno");
    expect(screen.getByText("Desconto: 50%")).toBeInTheDocument();
  });

  it("status filter shows only matching applications", () => {
    const apps = [
      makeApp({ id: "a1", status: "pendente", pai_nome: "João" }),
      makeApp({ id: "a2", status: "aprovada", pai_nome: "Carlos" }),
    ];
    render(<SolicitacoesClient initialApplications={apps} />);

    expect(screen.getAllByTestId(/^application-card-/)).toHaveLength(2);

    fireEvent.click(screen.getByTestId("filter-pendente"));
    expect(screen.getAllByTestId(/^application-card-/)).toHaveLength(1);
    expect(screen.getByText(/João/)).toBeInTheDocument();
  });

  it("expand/collapse toggles detail visibility", async () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    expect(screen.queryByTestId("card-detail")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("card-toggle"));
    });

    expect(screen.getByTestId("card-detail")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("card-toggle"));
    });

    expect(screen.queryByTestId("card-detail")).not.toBeInTheDocument();
  });

  it("detail view renders tabbed sections", async () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await expandCard();

    expect(screen.getByTestId("application-detail")).toBeInTheDocument();
    expect(screen.getByTestId("detail-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("documents-section")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("detail-tab-resumo"));
    });
    expect(screen.getByText("Dados do Solicitante")).toBeInTheDocument();
    expect(screen.getByText("Alunos")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("detail-tab-financeiro"));
    });
    expect(screen.getByText("Renda e Despesas")).toBeInTheDocument();
    expect(screen.getByText("Veículos")).toBeInTheDocument();
    expect(screen.getByText("Colaboração Voluntária")).toBeInTheDocument();
    expect(screen.getByText("Indicação de Benfeitores")).toBeInTheDocument();

    expect(screen.getByTestId("detail-tab-documentos")).toBeInTheDocument();
  });

  it("approve form pre-fills requested discount and allows editing", async () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await openDetailTab("decisao");

    fireEvent.click(screen.getByTestId("approve-trigger"));

    const input = screen.getByTestId("discount-input") as HTMLInputElement;
    expect(input.value).toBe("50");

    fireEvent.change(input, { target: { value: "30" } });
    expect(input.value).toBe("30");
  });

  it("approve form validates discount 0-100", async () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await openDetailTab("decisao");

    fireEvent.click(screen.getByTestId("approve-trigger"));

    const input = screen.getByTestId("discount-input");
    fireEvent.change(input, { target: { value: "150" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-decision"));
    });

    expect(screen.getByTestId("decision-error")).toHaveTextContent(
      "Desconto deve estar entre 0 e 100"
    );
  });

  it("reject form allows empty reason", async () => {
    mockRejectApplication.mockResolvedValue({ success: true });

    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await openDetailTab("decisao");

    fireEvent.click(screen.getByTestId("reject-trigger"));
    const reasonInput = screen.getByTestId("reason-input") as HTMLTextAreaElement;
    expect(reasonInput.value).toBe("");

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-decision"));
    });

    expect(mockRejectApplication).toHaveBeenCalledWith("app-1", undefined);
  });

  it("decided applications show decision info and export button", () => {
    const app = makeApp({
      status: "aprovada",
      desconto_solicitado: 50,
      desconto_concedido: 40,
      motivo: "Bom histórico",
      data_decisao: "2026-03-15T10:00:00Z",
    });

    render(<SolicitacoesClient initialApplications={[app]} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Aprovada");
    expect(screen.getByText("Desconto: 40%")).toBeInTheDocument();
    expect(screen.queryByText("Desconto: 50%")).not.toBeInTheDocument();
  });

  it("decided application expanded shows decision info and export button instead of actions", async () => {
    const app = makeApp({
      status: "aprovada",
      desconto_concedido: 40,
      motivo: "Bom histórico",
      data_decisao: "2026-03-15T10:00:00Z",
    });
    mockGetApplicationDetail.mockResolvedValue({
      data: {
        ...mockGetApplicationDetail.mock.results[0]?.value?.data,
        status: "aprovada",
        desconto_concedido: 40,
        motivo: "Bom histórico",
        data_decisao: "2026-03-15T10:00:00Z",
        students: [{ id: "s1", nome: "Pedro", cpf: null, serie: "5º ano", mensalidade: 1200 }],
        other_children: [],
        vehicles: [],
        collaboration: null,
        benefactors: [],
        documents: [],
      },
    });

    render(<SolicitacoesClient initialApplications={[app]} />);

    await expandCard();
    await act(async () => {
      fireEvent.click(screen.getByTestId("detail-tab-decisao"));
    });

    expect(screen.getByTestId("decision-info")).toBeInTheDocument();
    expect(screen.getByText(/Bom histórico/)).toBeInTheDocument();
    expect(screen.getByTestId("export-button")).toBeInTheDocument();
    expect(screen.queryByTestId("decision-actions")).not.toBeInTheDocument();
  });

  it("shows export and contract buttons in card header for decided applications", () => {
    const app = makeApp({
      status: "aprovada",
      desconto_concedido: 40,
      data_decisao: "2026-03-15T10:00:00Z",
    });

    render(<SolicitacoesClient initialApplications={[app]} />);

    expect(screen.getByTestId("card-header-actions")).toBeInTheDocument();
    expect(screen.getByTestId("export-button")).toBeInTheDocument();
    expect(screen.getByTestId("contract-button")).toBeInTheDocument();
  });

  it("approving updates status badge and stats without page reload", async () => {
    mockApproveApplication.mockResolvedValue({ success: true });
    const apps = [makeApp({ id: "a1", status: "pendente" })];
    render(<SolicitacoesClient initialApplications={apps} />);

    expect(screen.getByTestId("stat-pendentes")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-aprovadas")).toHaveTextContent("0");

    await openDetailTab("decisao");

    fireEvent.click(screen.getByTestId("approve-trigger"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-decision"));
    });

    expect(screen.getByTestId("stat-pendentes")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-aprovadas")).toHaveTextContent("1");
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Aprovada");
  });

  it("rejecting updates status badge and stats without page reload", async () => {
    mockRejectApplication.mockResolvedValue({ success: true });
    const apps = [makeApp({ id: "a1", status: "pendente" })];
    render(<SolicitacoesClient initialApplications={apps} />);

    await openDetailTab("decisao");

    fireEvent.click(screen.getByTestId("reject-trigger"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-decision"));
    });

    expect(screen.getByTestId("stat-pendentes")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-rejeitadas")).toHaveTextContent("1");
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Rejeitada");
  });

  it("document preview button exists for PDF documents", async () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("card-toggle"));
    });

    expect(screen.getByTestId("preview-d1")).toBeInTheDocument();
    expect(screen.getByTestId("preview-d1")).toHaveTextContent("Visualizar");
  });

  it("shows the school vacancy declaration label in the document list", async () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await expandCard();

    expect(screen.getByText("Declaração de Vaga do Colégio:")).toBeInTheDocument();
  });

  it("document preview opens PDF in modal", async () => {
    mockGetDocumentUrl.mockResolvedValue({ url: "https://example.com/signed-url" });

    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("card-toggle"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("preview-d1"));
    });

    expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
    const iframe = screen.getByTitle("rg.pdf");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "https://example.com/signed-url");
  });

  it("shows empty state when no applications match filter", () => {
    const apps = [makeApp({ id: "a1", status: "pendente" })];
    render(<SolicitacoesClient initialApplications={apps} />);

    fireEvent.click(screen.getByTestId("filter-aprovada"));
    expect(screen.getByText(/Nenhuma solicitação aprovada/)).toBeInTheDocument();
  });

  it("download button triggers getDocumentUrl", async () => {
    mockGetDocumentUrl.mockResolvedValue({ url: "https://example.com/download" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
    });
    global.URL.createObjectURL = vi.fn(() => "blob:test");
    global.URL.revokeObjectURL = vi.fn();

    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("card-toggle"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("download-d1"));
    });

    expect(mockGetDocumentUrl).toHaveBeenCalledWith("pending/rg.pdf", "app-1");
  });

  it("export decision calls exportDecision action", async () => {
    mockExportDecision.mockResolvedValue({
      content: "Decision text",
      filename: "decisao.txt",
    });

    global.URL.createObjectURL = vi.fn(() => "blob:test");
    global.URL.revokeObjectURL = vi.fn();

    const app = makeApp({
      status: "aprovada",
      desconto_concedido: 40,
      data_decisao: "2026-03-15T10:00:00Z",
    });
    mockGetApplicationDetail.mockResolvedValue({
      data: {
        id: "app-1",
        pai_nome: "João Silva",
        mae_nome: "Maria Silva",
        students: [],
        other_children: [],
        vehicles: [],
        collaboration: null,
        benefactors: [],
        documents: [],
      },
    });

    render(<SolicitacoesClient initialApplications={[app]} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("export-button"));
    });

    expect(mockExportDecision).toHaveBeenCalledWith("app-1");
  });

  it("shows contract button only for approved applications and generates PDF", async () => {
    mockExportContract.mockResolvedValue({
      pdfBase64: btoa("PDF"),
      filename: "contrato_Joao_Silva.pdf",
    });

    global.URL.createObjectURL = vi.fn(() => "blob:test");
    global.URL.revokeObjectURL = vi.fn();

    const app = makeApp({
      status: "aprovada",
      desconto_concedido: 40,
      data_decisao: "2026-03-15T10:00:00Z",
    });
    mockGetApplicationDetail.mockResolvedValue({
      data: {
        id: "app-1",
        pai_nome: "João Silva",
        mae_nome: "Maria Silva",
        students: [],
        other_children: [],
        vehicles: [],
        collaboration: null,
        benefactors: [],
        documents: [],
      },
    });

    render(<SolicitacoesClient initialApplications={[app]} />);

    expect(screen.getByTestId("contract-button")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("contract-button"));
    });

    expect(mockExportContract).toHaveBeenCalledWith("app-1");
    expect(screen.getByTestId("pdf-preview-modal")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-preview-frame")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-print-button")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-download-button")).toBeInTheDocument();
    expect(screen.getByText("Contrato")).toBeInTheDocument();
  });

  it("does not show contract button for rejected applications", async () => {
    const app = makeApp({
      status: "rejeitada",
      data_decisao: "2026-03-15T10:00:00Z",
    });
    mockGetApplicationDetail.mockResolvedValue({
      data: {
        id: "app-1",
        pai_nome: "João Silva",
        mae_nome: "Maria Silva",
        students: [],
        other_children: [],
        vehicles: [],
        collaboration: null,
        benefactors: [],
        documents: [],
      },
    });

    render(<SolicitacoesClient initialApplications={[app]} />);

    expect(screen.getByTestId("export-button")).toBeInTheDocument();
    expect(screen.queryByTestId("contract-button")).not.toBeInTheDocument();
  });

  it("cancel button on approve form returns to idle", async () => {
    render(<SolicitacoesClient initialApplications={[makeApp()]} />);

    await openDetailTab("decisao");

    fireEvent.click(screen.getByTestId("approve-trigger"));
    expect(screen.getByTestId("approve-form")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("cancel-decision"));
    expect(screen.queryByTestId("approve-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("decision-actions")).toBeInTheDocument();
  });

  it("plural alunos for multiple students", () => {
    const app = makeApp({
      students: [
        { id: "s1", nome: "Pedro", serie: "5º", mensalidade: 1200 },
        { id: "s2", nome: "Ana", serie: "3º", mensalidade: 1000 },
      ],
    });
    render(<SolicitacoesClient initialApplications={[app]} />);
    expect(screen.getByTestId("student-count")).toHaveTextContent("2 alunos");
  });
});

describe("SecretariatApplicationsClient", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApplicationObservations.mockResolvedValue([]);
    mockGetCurrentIssuedDocuments.mockResolvedValue([{ id: "decision-1", kind: "decision", version: 1 }]);
    mockGetIssuedDocumentUrl.mockResolvedValue({ url: "https://example.test/document" });
    mockAddApplicationObservation.mockResolvedValue({ success: true });
  });

  it("permite acompanhamento e observações sem expor controles de decisão", async () => {
    render(
      <SecretariatApplicationsClient
        initialApplications={[{
          id: "app-1",
          status: "pendente",
          escola: "Colégio São José",
          pai_nome: "João Silva",
          mae_nome: "Maria Silva",
          telefone: "(11) 99999-0000",
          email: "joao@email.com",
          data_decisao: null,
          students: [{ id: "s1", nome: "Pedro Silva" }],
        }]}
      />
    );

    expect(screen.getByText("Aguardando decisão")).toBeInTheDocument();
    expect(screen.queryByText("Aprovar solicitação")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acompanhar" }));
    expect(await screen.findByText("Documentos finais")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetApplicationObservations).toHaveBeenCalledWith("app-1");
      expect(mockGetCurrentIssuedDocuments).toHaveBeenCalledWith("app-1");
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    fireEvent.click(await screen.findByRole("button", { name: "Baixar decisão" }));
    await vi.waitFor(() => expect(mockGetIssuedDocumentUrl).toHaveBeenCalledWith("decision-1"));
    open.mockRestore();

    fireEvent.change(screen.getByPlaceholderText("Registrar observação interna"), {
      target: { value: "Ligar para a família." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar observação" }));

    await vi.waitFor(() => {
      expect(mockAddApplicationObservation).toHaveBeenCalledWith("app-1", "Ligar para a família.");
    });
  });
});
