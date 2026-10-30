import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, within } from "@testing-library/react";

const {
  mockGetApplicationDetail,
  mockApproveApplication,
  mockRejectApplication,
  mockExportDecision,
  mockExportContract,
  mockExportApplication,
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
  mockExportApplication: vi.fn(),
  mockGetDocumentUrl: vi.fn(),
  mockGetCurrentIssuedDocuments: vi.fn(),
  mockGetIssuedDocumentHistory: vi.fn(),
  mockGetIssuedDocumentUrl: vi.fn(),
  mockGetApplicationObservations: vi.fn(),
  mockAddApplicationObservation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/solicitacoes",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/admin/_actions/admin-actions", () => ({
  getApplications: vi.fn(),
  getApplicationDetail: mockGetApplicationDetail,
  approveApplication: mockApproveApplication,
  rejectApplication: mockRejectApplication,
  exportDecision: mockExportDecision,
  exportContract: mockExportContract,
  exportApplication: mockExportApplication,
  getDocumentUrl: mockGetDocumentUrl,
  getCurrentIssuedDocuments: mockGetCurrentIssuedDocuments,
  getIssuedDocumentHistory: mockGetIssuedDocumentHistory,
  getIssuedDocumentUrl: mockGetIssuedDocumentUrl,
}));

vi.mock("@/app/admin/_actions/observation-actions", () => ({
  getApplicationObservations: mockGetApplicationObservations,
  addApplicationObservation: mockAddApplicationObservation,
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
    students: [{ id: "s1", nome: "Pedro Silva", serie: "5º ano", mensalidade: 1200 }],
    ...overrides,
  };
}

function makeDetail(overrides: Record<string, unknown> = {}) {
  return {
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
    students: [{ id: "s1", nome: "Pedro Silva", cpf: null, serie: "5º ano", mensalidade: 1200 }],
    other_children: [{ id: "c1", nome: "Lucas Silva", nascimento: "2020-01-01", cpf: null }],
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
    ...overrides,
  };
}

/** Deixa efeitos e promessas pendentes (busca do detalhe) terminarem. */
async function settle() {
  await act(async () => {});
}

async function renderClient(apps: ApplicationSummary[], initialStatus?: "pendente" | "aprovada" | "rejeitada") {
  render(<SolicitacoesClient initialApplications={apps} initialStatus={initialStatus} />);
  await settle();
}

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

function fourApps() {
  return [
    makeApp({ id: "a1", status: "pendente", pai_nome: "João Silva", data_envio: "2026-03-01T10:00:00Z" }),
    makeApp({
      id: "a2",
      status: "aprovada",
      pai_nome: "Carlos Souza",
      escola: "Escola Santa Maria",
      data_envio: "2026-03-05T10:00:00Z",
      desconto_concedido: 40,
      data_decisao: "2026-03-15T10:00:00Z",
    }),
    makeApp({
      id: "a3",
      status: "rejeitada",
      pai_nome: "Bruno Lima",
      data_envio: "2026-02-20T10:00:00Z",
      data_decisao: "2026-03-10T10:00:00Z",
      students: [{ id: "s3", nome: "Alice Lima", serie: "1º ano", mensalidade: 900 }],
    }),
    makeApp({ id: "a4", status: "pendente", pai_nome: "Ana Pereira", data_envio: "2026-03-08T10:00:00Z" }),
  ];
}

describe("SolicitacoesClient", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentIssuedDocuments.mockResolvedValue([]);
    mockGetIssuedDocumentHistory.mockResolvedValue([]);
    mockGetApplicationObservations.mockResolvedValue([]);
    mockGetApplicationDetail.mockResolvedValue({ data: makeDetail() });
  });

  describe("filtro, busca e ordenação (US-005)", () => {
    it("UT-030: segmento de situação com contagens filtra a lista", async () => {
      await renderClient(fourApps());

      const group = screen.getByRole("group", { name: "Filtrar por situação" });
      expect(within(group).getByRole("button", { name: "Todas 4" })).toHaveAttribute("aria-pressed", "true");
      expect(within(group).getByRole("button", { name: "Aguardando decisão 2" })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: "Aprovadas 1" })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: "Rejeitadas 1" })).toBeInTheDocument();
      expect(screen.queryByTestId("stats-dashboard")).not.toBeInTheDocument();

      await click(screen.getByTestId("filter-pendente"));
      expect(screen.getByTestId("filter-pendente")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByTestId(/^application-card-/)).toHaveLength(2);
    });

    it("UT-031: a linha mostra título, meta e situação 'Aguardando decisão'", async () => {
      await renderClient([makeApp()]);

      expect(screen.getByText("João Silva e Maria Silva")).toBeInTheDocument();
      expect(screen.getByTestId("status-badge")).toHaveTextContent("Aguardando decisão");
      expect(screen.getByTestId("status-badge")).not.toHaveTextContent("Pendente");
      expect(screen.getByText("Colégio São José")).toBeInTheDocument();
      expect(screen.getByTestId("student-count")).toHaveTextContent("1 aluno");
      expect(screen.getByText("Enviada em 01/03/2026")).toBeInTheDocument();
    });

    it("UT-032: busca por escola e por nome do aluno", async () => {
      await renderClient(fourApps());

      const input = screen.getByLabelText("Buscar solicitações");
      fireEvent.change(input, { target: { value: "santa maria" } });
      expect(screen.getAllByTestId(/^application-card-/)).toHaveLength(1);
      expect(screen.getByTestId("application-card-a2")).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "Alice" } });
      expect(screen.getAllByTestId(/^application-card-/)).toHaveLength(1);
      expect(screen.getByTestId("application-card-a3")).toBeInTheDocument();
    });

    it("UT-033: ordenação por nome da família e por mais antigas", async () => {
      await renderClient(fourApps());
      const ids = () => screen.getAllByTestId(/^application-card-/).map((card) => card.getAttribute("data-testid"));

      expect(ids()).toEqual(["application-card-a4", "application-card-a2", "application-card-a1", "application-card-a3"]);

      fireEvent.change(screen.getByLabelText("Ordenar"), { target: { value: "familia" } });
      expect(ids()).toEqual(["application-card-a4", "application-card-a3", "application-card-a2", "application-card-a1"]);

      fireEvent.change(screen.getByTestId("sort-select"), { target: { value: "antigas" } });
      expect(ids()).toEqual(["application-card-a3", "application-card-a1", "application-card-a2", "application-card-a4"]);
    });

    it("UT-034: contagem anuncia situação e busca", async () => {
      await renderClient(fourApps());

      const count = screen.getByTestId("results-count");
      expect(count).toHaveAttribute("aria-live", "polite");
      expect(count).toHaveTextContent("4 solicitações");

      await click(screen.getByTestId("filter-pendente"));
      expect(count).toHaveTextContent("2 solicitações · aguardando decisão");

      fireEvent.change(screen.getByLabelText("Buscar solicitações"), { target: { value: "Ana" } });
      expect(count).toHaveTextContent("1 solicitação · aguardando decisão · busca por “Ana”");
    });

    it("UT-035: initialStatus vindo de ?situacao= pré-seleciona o segmento", async () => {
      await renderClient(fourApps(), "aprovada");

      expect(screen.getByTestId("filter-aprovada")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByTestId(/^application-card-/)).toHaveLength(1);
    });

    it("UT-036: vazio filtrado oferece 'Limpar filtros'; vazio total não", async () => {
      await renderClient([makeApp({ id: "a1", status: "pendente" })]);

      await click(screen.getByTestId("filter-aprovada"));
      fireEvent.change(screen.getByLabelText("Buscar solicitações"), { target: { value: "xyz" } });
      expect(screen.getByText("Nenhuma solicitação aqui")).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "Limpar filtros" }));
      expect(screen.getByTestId("filter-todas")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByLabelText("Buscar solicitações")).toHaveValue("");
      expect(screen.getByTestId("application-card-a1")).toBeInTheDocument();

      cleanup();
      await renderClient([]);
      expect(screen.getByText("Nenhuma solicitação recebida")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
    });
  });

  describe("linha e detalhe em abas (US-006)", () => {
    it("UT-037: a linha expande com aria-expanded e mostra as quatro abas", async () => {
      const app = makeApp({ status: "aprovada", desconto_concedido: 40, data_decisao: "2026-03-15T10:00:00Z" });
      await renderClient([app]);

      const toggle = screen.getByTestId("card-toggle");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("card-detail")).not.toBeInTheDocument();

      await click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByTestId("card-detail")).toBeInTheDocument();
      expect(screen.getByTestId("detail-tab-resumo")).toHaveTextContent("Resumo");
      expect(screen.getByTestId("detail-tab-documentos")).toHaveTextContent("Documentos (2)");
      expect(screen.getByTestId("detail-tab-financeiro")).toHaveTextContent("Renda e despesas");
      expect(screen.getByTestId("detail-tab-decisao")).toHaveTextContent("Decisão");
      expect(screen.getByRole("tablist", { name: "Seções da solicitação" })).toBeInTheDocument();

      await click(toggle);
      expect(screen.queryByTestId("card-detail")).not.toBeInTheDocument();
    });

    it("UT-038: pendente com documentos abre por padrão na aba Documentos; decidida abre em Resumo", async () => {
      await renderClient([makeApp()]);

      // A primeira pendente vem aberta por padrão (US-006 AC-5).
      expect(screen.getByTestId("card-toggle")).toHaveAttribute("aria-expanded", "true");
      expect(mockGetApplicationDetail).toHaveBeenCalledWith("app-1");
      expect(screen.getByTestId("detail-tab-documentos")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("documents-section")).toBeInTheDocument();
      expect(screen.getByText("Declaração de Vaga do Colégio")).toBeInTheDocument();

      cleanup();
      mockGetApplicationDetail.mockResolvedValue({ data: makeDetail({ documents: [] }) });
      await renderClient([makeApp({ status: "rejeitada", data_decisao: "2026-03-15T10:00:00Z" })]);
      await click(screen.getByTestId("card-toggle"));
      expect(screen.getByTestId("detail-tab-resumo")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("detail-tab-documentos")).toHaveTextContent("Documentos (0)");
      await click(screen.getByTestId("detail-tab-documentos"));
      expect(screen.getByText("Nenhum documento enviado")).toBeInTheDocument();
    });

    it("abas Resumo e Renda e despesas mostram os dados do detalhe", async () => {
      await renderClient([makeApp()]);

      await click(screen.getByTestId("detail-tab-resumo"));
      expect(screen.getByText("Responsáveis e contato")).toBeInTheDocument();
      expect(screen.getByText("Engenheiro")).toBeInTheDocument();
      expect(screen.getByTestId("students-table")).toHaveTextContent("Pedro Silva");
      expect(screen.getByText("Outros filhos")).toBeInTheDocument();
      expect(screen.getByText("Observações internas")).toBeInTheDocument();

      await click(screen.getByTestId("detail-tab-financeiro"));
      expect(screen.getByText("Renda do pai")).toBeInTheDocument();
      expect(screen.getByTestId("expenses-section")).toHaveTextContent("Aluguel");
      expect(screen.getByTestId("vehicles-section")).toHaveTextContent("Fiat Uno (2015)");
      expect(screen.getByTestId("volunteer-section")).toHaveTextContent("Limpeza: 2x por semana");
      expect(screen.getByTestId("benefactors-section")).toHaveTextContent("Ana Costa (ana@email.com)");
    });

    it("UT-039: a barra de ações varia com a situação", async () => {
      await renderClient([makeApp()]);
      expect(screen.getByTestId("export-data-button")).toHaveTextContent("Imprimir dados da solicitação");
      expect(screen.queryByTestId("export-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("contract-button")).not.toBeInTheDocument();
      expect(screen.getByText("Os PDFs são gerados com o cabeçalho e os modelos configurados.")).toBeInTheDocument();

      cleanup();
      await renderClient([makeApp({ status: "aprovada", desconto_concedido: 40, data_decisao: "2026-03-15T10:00:00Z" })]);
      await click(screen.getByTestId("card-toggle"));
      expect(screen.getByTestId("export-button")).toHaveTextContent("Carta de decisão");
      expect(screen.getByTestId("contract-button")).toHaveTextContent("Contrato");

      cleanup();
      await renderClient([makeApp({ status: "rejeitada", data_decisao: "2026-03-15T10:00:00Z" })]);
      await click(screen.getByTestId("card-toggle"));
      expect(screen.getByTestId("export-button")).toBeInTheDocument();
      expect(screen.queryByTestId("contract-button")).not.toBeInTheDocument();
    });

    it("UT-040: imprimir dados abre o PDF; erro aparece em aviso", async () => {
      global.URL.createObjectURL = vi.fn(() => "blob:test");
      global.URL.revokeObjectURL = vi.fn();
      mockExportApplication.mockResolvedValueOnce({ pdfBase64: btoa("PDF"), filename: "dados.pdf" });
      await renderClient([makeApp()]);

      await click(screen.getByTestId("export-data-button"));
      expect(mockExportApplication).toHaveBeenCalledWith("app-1");
      expect(screen.getByTestId("pdf-preview-modal")).toBeInTheDocument();
      await click(screen.getByTestId("pdf-close-button"));

      mockExportApplication.mockResolvedValueOnce({ error: "Cabeçalho não configurado." });
      await click(screen.getByTestId("export-data-button"));
      expect(screen.getByTestId("export-data-error")).toHaveTextContent("Cabeçalho não configurado.");
      expect(screen.getByTestId("export-data-error")).toHaveAttribute("role", "alert");
    });

    it("UT-041: abrir e baixar documento usam getDocumentUrl", async () => {
      mockGetDocumentUrl.mockResolvedValue({ url: "https://example.com/signed-url" });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
      });
      global.URL.createObjectURL = vi.fn(() => "blob:test");
      global.URL.revokeObjectURL = vi.fn();
      await renderClient([makeApp()]);

      expect(screen.getByTestId("preview-d1")).toHaveTextContent("Abrir");
      await click(screen.getByTestId("preview-d1"));
      expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
      expect(screen.getByTitle("rg.pdf")).toHaveAttribute("src", "https://example.com/signed-url");

      await click(screen.getByTestId("download-d1"));
      expect(mockGetDocumentUrl).toHaveBeenCalledWith("pending/rg.pdf", "app-1");

      mockGetDocumentUrl.mockResolvedValueOnce({ error: "Documento indisponível." });
      await click(screen.getByTestId("download-d0"));
      expect(screen.getByTestId("document-error")).toHaveTextContent("Documento indisponível.");
    });

    it("mostra aviso quando o detalhe não carrega", async () => {
      mockGetApplicationDetail.mockResolvedValue({ data: null, error: "Solicitação não encontrada." });
      await renderClient([makeApp()]);

      expect(screen.getByRole("alert")).toHaveTextContent("Erro ao carregar detalhes.");
    });
  });

  describe("decisão inline (US-007)", () => {
    async function openDecision(app = makeApp()) {
      await renderClient([app]);
      await click(screen.getByTestId("detail-tab-decisao"));
    }

    it("UT-042: aba Decisão mostra resumo e abre o formulário de aprovação preenchido", async () => {
      await openDecision();

      expect(screen.getByText("Desconto solicitado")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("Renda familiar")).toBeInTheDocument();
      expect(screen.getByTestId("approve-trigger")).toHaveTextContent("Aprovar solicitação");
      expect(screen.getByTestId("reject-trigger")).toHaveTextContent("Rejeitar");

      await click(screen.getByTestId("approve-trigger"));
      expect(screen.getByTestId("approve-form")).toBeInTheDocument();
      expect(screen.getByLabelText("Desconto concedido (%)")).toHaveValue(50);
      expect(screen.getByTestId("discount-input")).toHaveValue(50);
      expect(screen.getByTestId("confirm-decision")).toHaveTextContent("Confirmar aprovação");
      expect(screen.getByTestId("cancel-decision")).toHaveTextContent("Voltar");

      await click(screen.getByTestId("cancel-decision"));
      expect(screen.queryByTestId("approve-form")).not.toBeInTheDocument();
      expect(screen.getByTestId("decision-actions")).toBeInTheDocument();
    });

    it("UT-043: desconto fora de 0–100 bloqueia a aprovação", async () => {
      await openDecision();
      await click(screen.getByTestId("approve-trigger"));

      fireEvent.change(screen.getByTestId("discount-input"), { target: { value: "150" } });
      await click(screen.getByTestId("confirm-decision"));

      expect(screen.getByTestId("decision-error")).toHaveTextContent("Desconto deve estar entre 0 e 100.");
      expect(mockApproveApplication).not.toHaveBeenCalled();
    });

    it("UT-044: aprovar atualiza a linha, a aba Decisão e as contagens", async () => {
      mockApproveApplication.mockResolvedValue({ success: true });
      await openDecision();
      await click(screen.getByTestId("approve-trigger"));

      fireEvent.change(screen.getByTestId("discount-input"), { target: { value: "40" } });
      await click(screen.getByTestId("confirm-decision"));

      expect(mockApproveApplication).toHaveBeenCalledWith("app-1", 40, undefined);
      expect(screen.getByTestId("status-badge")).toHaveTextContent("Aprovada");
      expect(screen.getByTestId("decision-info")).toHaveTextContent("Aprovada com 40% de desconto");
      expect(screen.queryByTestId("decision-actions")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Aprovadas 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Aguardando decisão 0" })).toBeInTheDocument();
      expect(screen.getByTestId("export-button")).toBeInTheDocument();
      expect(screen.getByTestId("contract-button")).toBeInTheDocument();
    });

    it("UT-045: rejeitar com motivo registra e mostra o motivo", async () => {
      mockRejectApplication.mockResolvedValue({ success: true });
      await openDecision();

      await click(screen.getByTestId("reject-trigger"));
      expect(screen.getByTestId("reject-form")).toHaveTextContent("Esta ação é definitiva e a família será informada.");
      expect(screen.getByTestId("confirm-decision")).toHaveTextContent("Confirmar rejeição");

      fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "Bom histórico" } });
      await click(screen.getByTestId("confirm-decision"));

      expect(mockRejectApplication).toHaveBeenCalledWith("app-1", "Bom histórico");
      expect(screen.getByTestId("status-badge")).toHaveTextContent("Rejeitada");
      expect(screen.getByTestId("decision-info")).toHaveTextContent("Rejeitada");
      expect(screen.getByTestId("decision-info")).toHaveTextContent("Bom histórico");
      expect(screen.getByRole("button", { name: "Rejeitadas 1" })).toBeInTheDocument();
    });

    it("erro da action mantém o formulário e mostra o aviso; botão fica desabilitado enquanto roda", async () => {
      let resolve: (value: { success: boolean; error?: string }) => void = () => {};
      mockApproveApplication.mockReturnValue(new Promise((r) => (resolve = r)));
      await openDecision();
      await click(screen.getByTestId("approve-trigger"));

      await click(screen.getByTestId("confirm-decision"));
      expect(screen.getByTestId("confirm-decision")).toBeDisabled();

      await act(async () => resolve({ success: false, error: "Solicitação já decidida." }));
      expect(screen.getByTestId("confirm-decision")).not.toBeDisabled();
      expect(screen.getByTestId("decision-error")).toHaveTextContent("Solicitação já decidida.");
      expect(screen.getByTestId("approve-form")).toBeInTheDocument();
      expect(screen.getByTestId("status-badge")).toHaveTextContent("Aguardando decisão");
    });

    it("decidida mostra decision-info com data, motivo e documentos finais", async () => {
      mockGetCurrentIssuedDocuments.mockResolvedValue([
        { id: "issued-1", kind: "decision", version: 2, filename: "decisao.pdf", issued_at: "2026-03-15T10:00:00Z" },
      ]);
      mockGetIssuedDocumentHistory.mockResolvedValue([
        { id: "issued-0", kind: "decision", version: 1, filename: "decisao.pdf", issued_at: "2026-03-14T10:00:00Z" },
      ]);
      mockGetIssuedDocumentUrl.mockResolvedValue({ url: "https://example.test/issued" });
      const open = vi.spyOn(window, "open").mockImplementation(() => null);
      await renderClient([
        makeApp({ status: "aprovada", desconto_concedido: 40, motivo: "Bom histórico", data_decisao: "2026-03-15T10:00:00Z" }),
      ]);
      await click(screen.getByTestId("card-toggle"));
      await click(screen.getByTestId("detail-tab-decisao"));

      const info = screen.getByTestId("decision-info");
      expect(info).toHaveTextContent("Aprovada com 40% de desconto");
      expect(info).toHaveTextContent("Registrada em 15/03/2026. Bom histórico");
      expect(info).toHaveTextContent("Carta de decisão · versão 2");
      expect(info).toHaveTextContent("Histórico administrativo (1)");
      await click(within(info).getAllByRole("button", { name: "Baixar" })[0]);
      expect(mockGetIssuedDocumentUrl).toHaveBeenCalledWith("issued-1");
      open.mockRestore();
    });
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

  const secretariatApp = {
    id: "app-1",
    status: "pendente" as const,
    escola: "Colégio São José",
    pai_nome: "João Silva",
    mae_nome: "Maria Silva",
    telefone: "(11) 99999-0000",
    email: "joao@email.com",
    data_decisao: null,
    students: [{ id: "s1", nome: "Pedro Silva" }],
  };

  it("UT-046: acompanha com abas Resumo / Documentos finais / Observações, sem decidir", async () => {
    render(<SecretariatApplicationsClient initialApplications={[secretariatApp]} />);

    expect(screen.getByRole("group", { name: "Filtrar por situação" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar solicitações")).toBeInTheDocument();
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Aguardando decisão");
    expect(screen.queryByText("Aprovar solicitação")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("card-toggle"));
    });
    expect(screen.getByRole("tab", { name: "Resumo" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Documentos finais" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Observações" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Decisão/ })).not.toBeInTheDocument();
    expect(within(screen.getByTestId("card-detail")).getByText("(11) 99999-0000")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(mockGetApplicationObservations).toHaveBeenCalledWith("app-1");
      expect(mockGetCurrentIssuedDocuments).toHaveBeenCalledWith("app-1");
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Documentos finais" }));
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    fireEvent.click(await screen.findByRole("button", { name: "Baixar decisão" }));
    await vi.waitFor(() => expect(mockGetIssuedDocumentUrl).toHaveBeenCalledWith("decision-1"));
    open.mockRestore();

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Observações" }));
    });
    expect(screen.getByText("Nenhuma observação registrada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar observação" })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Registrar observação interna"), {
      target: { value: "Ligar para a família." },
    });
    mockGetApplicationObservations.mockResolvedValue([
      { id: "o1", body: "Ligar para a família.", created_at: "2026-03-20T10:00:00Z", author_user: { email: "sec@ansp.org" } },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Registrar observação" }));

    await vi.waitFor(() => {
      expect(mockAddApplicationObservation).toHaveBeenCalledWith("app-1", "Ligar para a família.");
    });
    expect(await screen.findByText("Ligar para a família.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Registrar observação interna")).toHaveValue("");
  });

  it("filtra, pré-seleciona ?situacao= e mostra vazio", () => {
    render(<SecretariatApplicationsClient initialApplications={[secretariatApp]} initialStatus="rejeitada" />);

    expect(screen.getByTestId("filter-rejeitada")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Nenhuma solicitação aqui")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByTestId("application-card-app-1")).toBeInTheDocument();
  });
});
