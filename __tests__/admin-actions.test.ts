import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SESSION_SECRET", "x".repeat(48));

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

// vi.hoisted: as factories de vi.mock sobem para o topo do arquivo, então os
// mocks que elas referenciam precisam existir antes de qualquer outro código.
const {
  mockGetSessionUser,
  mockSize,
  mockRenderContractPdf,
  mockRenderDecisionPdf,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockSize: vi.fn(),
  mockRenderContractPdf: vi.fn((_d: unknown) =>
    Promise.resolve(Buffer.from("PDF"))
  ),
  mockRenderDecisionPdf: vi.fn((_d: unknown) =>
    Promise.resolve(Buffer.from("PDF"))
  ),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock("@/lib/storage", () => ({
  getStorage: () => ({ size: mockSize }),
}));

vi.mock("@/lib/pdf/contract-pdf", () => ({
  renderContractPdf: mockRenderContractPdf,
}));

vi.mock("@/lib/pdf/decision-pdf", () => ({
  renderDecisionPdf: mockRenderDecisionPdf,
}));

import {
  applications,
  contractTemplates,
  decisionTemplates,
  donorPledges,
  schoolYears,
} from "@/lib/db/schema";
import { verifyTicket } from "@/lib/storage/tickets";
import {
  approveApplication,
  createSchoolYear,
  deleteDonorPledge,
  deleteSchoolYear,
  exportContract,
  exportDecision,
  getApplicationDetail,
  getApplications,
  getContractTemplate,
  getDocumentUrl,
  getSchoolYears,
  getTemplates,
  rejectApplication,
  saveContractTemplate,
  saveTemplate,
  toggleSchoolYear,
} from "@/app/admin/_actions/admin-actions";
import {
  deleted,
  failWrites,
  inserted,
  queryFor,
  resetFakeDb,
  updated,
} from "./helpers/fake-db";

const MOCK_USER = { id: "user-123", email: "admin@test.com" };

function authAs(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetSessionUser.mockResolvedValue(user);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  authAs();
});

// --- Auth Guard ---

describe("auth guard", () => {
  it("all admin actions reject unauthenticated requests", async () => {
    authAs(null);

    await expect(getApplications()).rejects.toThrow("Não autorizado");
    await expect(getApplicationDetail("id")).rejects.toThrow("Não autorizado");
    await expect(getDocumentUrl("path")).rejects.toThrow("Não autorizado");
    await expect(approveApplication("id", 50)).rejects.toThrow("Não autorizado");
    await expect(rejectApplication("id")).rejects.toThrow("Não autorizado");
    await expect(getSchoolYears()).rejects.toThrow("Não autorizado");
    await expect(
      createSchoolYear({
        nome: "2026",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
      })
    ).rejects.toThrow("Não autorizado");
    await expect(toggleSchoolYear("id")).rejects.toThrow("Não autorizado");
    await expect(deleteSchoolYear("id")).rejects.toThrow("Não autorizado");
    await expect(deleteDonorPledge("id")).rejects.toThrow("Não autorizado");
    await expect(getTemplates()).rejects.toThrow("Não autorizado");
    await expect(
      saveTemplate({ tipo: "aprovacao", cabecalho: "", corpo: "", rodape: "" })
    ).rejects.toThrow("Não autorizado");
    await expect(exportDecision("id")).rejects.toThrow("Não autorizado");
    await expect(exportContract("id")).rejects.toThrow("Não autorizado");
  });

  it("does not touch the database when unauthenticated", async () => {
    authAs(null);

    await expect(approveApplication("app-1", 50)).rejects.toThrow();
    expect(updated).toHaveLength(0);
  });
});

// --- getApplications ---

describe("getApplications", () => {
  it("returns applications filtered by status", async () => {
    const apps = [{ id: "1", status: "pendente", students: [] }];
    queryFor("applications").findMany.mockResolvedValue(apps);

    const result = await getApplications("pendente");

    expect(result.data).toEqual(apps);
    expect(result.error).toBeNull();
    expect(queryFor("applications").findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  it("returns all applications when no filter is given", async () => {
    const apps = [{ id: "1" }, { id: "2" }];
    queryFor("applications").findMany.mockResolvedValue(apps);

    const result = await getApplications();

    expect(result.data).toEqual(apps);
    expect(queryFor("applications").findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });

  it("reports an error when the query fails", async () => {
    queryFor("applications").findMany.mockRejectedValue(new Error("down"));

    const result = await getApplications();

    expect(result.data).toBeNull();
    expect(result.error).toContain("Erro ao buscar solicitações");
  });
});

// --- getApplicationDetail ---

describe("getApplicationDetail", () => {
  it("returns the application with all nested records", async () => {
    const detail = {
      id: "app-1",
      pai_nome: "João",
      status: "pendente",
      students: [{ id: "s1", nome: "Pedro" }],
      other_children: [{ id: "c1", nome: "Ana" }],
      vehicles: [{ id: "v1", marca: "Fiat" }],
      collaboration: { id: "col1", limpeza: true },
      benefactors: [{ id: "b1", nome: "Carlos" }],
      documents: [{ id: "d1", categoria: "rg_pai" }],
    };
    queryFor("applications").findFirst.mockResolvedValue(detail);

    const result = await getApplicationDetail("app-1");

    expect(result.data).toMatchObject(detail);
    expect(result.error).toBeNull();
  });

  it("normalizes a missing collaboration record to null", async () => {
    queryFor("applications").findFirst.mockResolvedValue({
      id: "app-1",
      students: [],
      collaboration: undefined,
    });

    const result = await getApplicationDetail("app-1");

    expect(result.data?.collaboration).toBeNull();
  });

  it("reports an error when the application does not exist", async () => {
    queryFor("applications").findFirst.mockResolvedValue(undefined);

    const result = await getApplicationDetail("missing");

    expect(result.data).toBeNull();
    expect(result.error).toContain("não encontrada");
  });
});

// --- Decisions ---

describe("approveApplication", () => {
  it("rejects a discount outside the 0-100 range", async () => {
    const below = await approveApplication("id", -1);
    expect(below.success).toBe(false);
    expect(below.error).toContain("0 e 100");

    const above = await approveApplication("id", 101);
    expect(above.success).toBe(false);
    expect(above.error).toContain("0 e 100");

    expect(updated).toHaveLength(0);
  });

  it("updates status, discount, reason and decided_by", async () => {
    const result = await approveApplication("app-1", 75, "Bom candidato");

    expect(result.success).toBe(true);
    expect(updated[0].table).toBe(applications);
    expect(updated[0].values).toMatchObject({
      status: "aprovada",
      desconto_concedido: 75,
      motivo: "Bom candidato",
      decided_by: "user-123",
    });
  });

  it("reports an error when the update fails", async () => {
    failWrites();

    const result = await approveApplication("app-1", 50);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Erro ao aprovar");
  });
});

describe("rejectApplication", () => {
  it("updates status, reason and decided_by", async () => {
    const result = await rejectApplication("app-1", "Renda incompatível");

    expect(result.success).toBe(true);
    expect(updated[0].values).toMatchObject({
      status: "rejeitada",
      motivo: "Renda incompatível",
      decided_by: "user-123",
    });
  });
});

// --- School Years ---

describe("createSchoolYear", () => {
  it("rejects an end date before the start date", async () => {
    const result = await createSchoolYear({
      nome: "2026",
      data_inicio: "2026-12-31",
      data_fim: "2026-01-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Data de fim");
    expect(inserted).toHaveLength(0);
  });

  it("creates an inactive school year with valid dates", async () => {
    const result = await createSchoolYear({
      nome: "2026",
      data_inicio: "2026-02-01",
      data_fim: "2026-12-15",
    });

    expect(result.success).toBe(true);
    expect(inserted[0].table).toBe(schoolYears);
    expect(inserted[0].values).toMatchObject({ nome: "2026", ativo: false });
  });
});

describe("toggleSchoolYear", () => {
  it("activates a year that was inactive", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue({ ativo: false });

    const result = await toggleSchoolYear("year-2");

    expect(result.success).toBe(true);
    expect(updated[0].values).toEqual({ ativo: true });
  });

  it("deactivates a year that was active", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue({ ativo: true });

    await toggleSchoolYear("year-1");

    expect(updated[0].values).toEqual({ ativo: false });
  });

  it("reports an error for an unknown year", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue(undefined);

    const result = await toggleSchoolYear("nope");

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });
});

describe("deleteSchoolYear", () => {
  it("removes the record", async () => {
    const result = await deleteSchoolYear("year-1");

    expect(result.success).toBe(true);
    expect(deleted[0].table).toBe(schoolYears);
  });
});

describe("deleteDonorPledge", () => {
  it("removes the record", async () => {
    const result = await deleteDonorPledge("donor-1");

    expect(result.success).toBe(true);
    expect(deleted[0].table).toBe(donorPledges);
  });
});

// --- Decision Templates ---

describe("saveTemplate and getTemplates", () => {
  it("updates the template when one already exists", async () => {
    queryFor("decisionTemplates").findFirst.mockResolvedValue({ id: "tmpl-1" });

    const result = await saveTemplate({
      tipo: "aprovacao",
      cabecalho: "Header",
      corpo: "Body {aluno}",
      rodape: "Footer",
    });

    expect(result.success).toBe(true);
    expect(updated[0].table).toBe(decisionTemplates);
    expect(inserted).toHaveLength(0);
  });

  it("creates the template when none exists", async () => {
    queryFor("decisionTemplates").findFirst.mockResolvedValue(undefined);

    const result = await saveTemplate({
      tipo: "rejeicao",
      cabecalho: "H",
      corpo: "B",
      rodape: "R",
    });

    expect(result.success).toBe(true);
    expect(inserted[0].values).toMatchObject({ tipo: "rejeicao" });
  });

  it("returns the templates ordered by type", async () => {
    const templates = [
      { id: "t1", tipo: "aprovacao" },
      { id: "t2", tipo: "rejeicao" },
    ];
    queryFor("decisionTemplates").findMany.mockResolvedValue(templates);

    const result = await getTemplates();

    expect(result.data).toEqual(templates);
  });
});

// --- Document URL ---

describe("getDocumentUrl", () => {
  it("issues a signed download ticket for an existing document", async () => {
    mockSize.mockResolvedValue(1024);

    const result = await getDocumentUrl("applications/app-1/rg.pdf");

    expect("url" in result).toBe(true);
    if (!("url" in result)) return;

    const ticket = new URL(result.url, "http://x").searchParams.get("ticket");
    expect(verifyTicket(ticket, "download")).toBe("applications/app-1/rg.pdf");
  });

  it("falls back to the applications path when the pending file is gone", async () => {
    mockSize.mockResolvedValueOnce(null).mockResolvedValueOnce(2048);

    const result = await getDocumentUrl("pending/uuid/rg_pai/rg.pdf", "app-1");

    expect(mockSize).toHaveBeenNthCalledWith(1, "pending/uuid/rg_pai/rg.pdf");
    expect(mockSize).toHaveBeenNthCalledWith(
      2,
      "applications/app-1/rg_pai/rg.pdf"
    );

    expect("url" in result).toBe(true);
    if (!("url" in result)) return;

    const ticket = new URL(result.url, "http://x").searchParams.get("ticket");
    expect(verifyTicket(ticket, "download")).toBe(
      "applications/app-1/rg_pai/rg.pdf"
    );
  });

  it("returns an error when no candidate path exists", async () => {
    mockSize.mockResolvedValue(null);

    const result = await getDocumentUrl("applications/app-1/missing.pdf");

    expect("error" in result).toBe(true);
  });

  it("does not issue a ticket usable for upload", async () => {
    mockSize.mockResolvedValue(10);

    const result = await getDocumentUrl("applications/app-1/rg.pdf");
    if (!("url" in result)) throw new Error("expected a url");

    const ticket = new URL(result.url, "http://x").searchParams.get("ticket");
    expect(verifyTicket(ticket, "upload")).toBeNull();
  });
});

// --- Export Decision ---

describe("exportDecision", () => {
  const approvedApp = {
    id: "app-1",
    status: "aprovada",
    pai_nome: "João Silva",
    mae_nome: "Maria Silva",
    escola: "Colégio São José",
    desconto_concedido: 50,
    motivo: "Renda compatível",
    data_decisao: "2026-06-15T12:00:00Z",
    students: [{ nome: "Pedro" }, { nome: "Ana" }],
    school_years: { nome: "2026" },
  };

  const template = {
    id: "tmpl-1",
    tipo: "aprovacao",
    cabecalho: "DECISÃO - {escola}",
    corpo:
      "Comunicamos que a solicitação de {nome_pai} e {nome_mae} para o(s) aluno(s) {aluno} foi aprovada com desconto de {desconto}%. Motivo: {motivo}.",
    rodape: "Data: {data} - Ano Letivo: {ano_letivo}",
  };

  it("returns a PDF with every token replaced", async () => {
    queryFor("applications").findFirst.mockResolvedValue(approvedApp);
    queryFor("decisionTemplates").findFirst.mockResolvedValue(template);

    const result = await exportDecision("app-1");

    expect("pdfBase64" in result).toBe(true);
    if (!("pdfBase64" in result)) return;

    expect(result.pdfBase64).toBe(Buffer.from("PDF").toString("base64"));
    expect(result.filename).toMatch(/^decisao_aprovacao_.*\.pdf$/);

    const resolved = mockRenderDecisionPdf.mock.calls[0][0] as {
      cabecalho: string;
      corpo: string;
      rodape: string;
    };
    const fullText = [
      resolved.cabecalho,
      resolved.corpo,
      resolved.rodape,
    ].join("\n");

    expect(fullText).toContain("João Silva");
    expect(fullText).toContain("Maria Silva");
    expect(fullText).toContain("Colégio São José");
    expect(fullText).toContain("Pedro, Ana");
    expect(fullText).toContain("50");
    expect(fullText).toContain("Renda compatível");
    expect(fullText).toContain("2026");
  });

  it("refuses to export a pending application", async () => {
    queryFor("applications").findFirst.mockResolvedValue({
      id: "app-1",
      status: "pendente",
    });

    const result = await exportDecision("app-1");

    expect("error" in result).toBe(true);
    expect(mockRenderDecisionPdf).not.toHaveBeenCalled();
  });

  it("reports a missing decision template", async () => {
    queryFor("applications").findFirst.mockResolvedValue(approvedApp);
    queryFor("decisionTemplates").findFirst.mockResolvedValue(undefined);

    const result = await exportDecision("app-1");

    expect(result).toEqual({ error: "Modelo de decisão não encontrado." });
  });
});

// --- Contract Template ---

describe("getContractTemplate and saveContractTemplate", () => {
  it("returns the stored contract template", async () => {
    queryFor("contractTemplates").findFirst.mockResolvedValue({
      id: "ct-1",
      titulo: "CONTRATO",
      cabecalho: "{aluno}",
      clausulas: [{ titulo: "C1", corpo: "x" }],
      rodape: "{data_extenso}",
    });

    const result = await getContractTemplate();

    expect(result.error).toBeNull();
    expect(result.data?.titulo).toBe("CONTRATO");
    expect(result.data?.clausulas).toHaveLength(1);
  });

  it("updates the existing template", async () => {
    queryFor("contractTemplates").findFirst.mockResolvedValue({ id: "ct-1" });

    const result = await saveContractTemplate({
      titulo: "T",
      cabecalho: "C",
      clausulas: [],
      rodape: "R",
    });

    expect(result.success).toBe(true);
    expect(updated[0].table).toBe(contractTemplates);
    expect(inserted).toHaveLength(0);
  });

  it("inserts when no template exists yet", async () => {
    queryFor("contractTemplates").findFirst.mockResolvedValue(undefined);

    const result = await saveContractTemplate({
      titulo: "T",
      cabecalho: "C",
      clausulas: [],
      rodape: "R",
    });

    expect(result.success).toBe(true);
    expect(inserted[0].table).toBe(contractTemplates);
  });
});

// --- Export Contract ---

describe("exportContract", () => {
  const approvedApp = {
    id: "app-1",
    status: "aprovada",
    pai_nome: "João Silva",
    pai_rg: "12.345.678-9",
    pai_cpf: "123.456.789-00",
    endereco: "Rua A, 123",
    cep: "13250-000",
    desconto_concedido: 50,
    students: [{ nome: "Pedro" }, { nome: "Ana" }],
    school_years: {
      nome: "2026",
      data_inicio: "2026-02-01",
      data_fim: "2026-11-30",
    },
  };

  const template = {
    id: "ct-1",
    titulo: "CONTRATO",
    cabecalho: "Aluno: {aluno}, CPF {cpf_responsavel}, end {endereco}",
    clausulas: [
      {
        titulo: "C1",
        corpo: "Bolsa {desconto}% de {data_inicio} a {data_termino}",
      },
    ],
    rodape: "{data_extenso}",
  };

  it("generates a PDF with resolved tokens for an approved application", async () => {
    queryFor("applications").findFirst.mockResolvedValue(approvedApp);
    queryFor("contractTemplates").findFirst.mockResolvedValue(template);

    const result = await exportContract("app-1");

    expect("pdfBase64" in result).toBe(true);
    if (!("pdfBase64" in result)) return;

    expect(result.filename).toMatch(/^contrato_.*\.pdf$/);
    expect(result.pdfBase64).toBe(Buffer.from("PDF").toString("base64"));

    const resolved = mockRenderContractPdf.mock.calls[0][0] as {
      cabecalho: string;
      clausulas: { corpo: string }[];
    };

    expect(resolved.cabecalho).toContain("Pedro, Ana");
    expect(resolved.cabecalho).toContain("123.456.789-00");
    expect(resolved.cabecalho).toContain("CEP 13250-000");
    expect(resolved.clausulas[0].corpo).toContain("50%");
    expect(resolved.clausulas[0].corpo).toContain("01/02/2026");
    expect(resolved.clausulas[0].corpo).toContain("30/11/2026");
  });

  it("refuses to generate a contract for an application that was not approved", async () => {
    queryFor("applications").findFirst.mockResolvedValue({
      ...approvedApp,
      status: "pendente",
    });

    const result = await exportContract("app-1");

    expect("error" in result).toBe(true);
    expect(mockRenderContractPdf).not.toHaveBeenCalled();
  });
});
