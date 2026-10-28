import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SESSION_SECRET", "x".repeat(48));

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

// vi.hoisted: as factories de vi.mock sobem para o topo do arquivo, então os
// mocks que elas referenciam precisam existir antes de qualquer outro código.
const {
  mockGetSessionUser,
  mockRequireAdmin,
  mockRequireCapability,
  mockSize,
  mockPut,
  mockRemove,
  mockRenderContractPdf,
  mockRenderDecisionPdf,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockRequireCapability: vi.fn(),
  mockSize: vi.fn(),
  mockPut: vi.fn(),
  mockRemove: vi.fn(),
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

vi.mock("@/lib/auth/authorization", () => ({
  requireAdmin: mockRequireAdmin,
  requireCapability: mockRequireCapability,
}));

vi.mock("@/lib/storage", () => ({
  getStorage: () => ({ size: mockSize, put: mockPut, remove: mockRemove }),
}));

vi.mock("@/lib/pdf/contract-pdf", () => ({
  renderContractPdf: mockRenderContractPdf,
}));

vi.mock("@/lib/pdf/decision-pdf", () => ({
  renderDecisionPdf: mockRenderDecisionPdf,
}));

const extraPdfs = vi.hoisted(() => ({
  application: vi.fn(async (_data: unknown) => Buffer.from("PDF")),
  donor: vi.fn(async (_data: unknown) => Buffer.from("PDF")),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/pdf/application-pdf", () => ({ renderApplicationPdf: extraPdfs.application }));
vi.mock("@/lib/pdf/donor-pdf", () => ({ renderDonorPdf: extraPdfs.donor }));
vi.mock("next/cache", () => ({ revalidatePath: extraPdfs.revalidate }));

import {
  applications,
  contractTemplates,
  decisionTemplates,
  donorPledges,
  issuedDocuments,
  schoolYears,
} from "@/lib/db/schema";
import { verifyTicket } from "@/lib/storage/tickets";
import {
  approveApplication,
  createSchoolYear,
  deleteDonorPledge,
  deleteSchoolYear,
  exportApplication,
  exportDonorPledge,
  getDocumentHeader,
  saveDocumentHeader,
  exportContract,
  exportDecision,
  getApplicationDetail,
  getApplications,
  getContractTemplate,
  getCurrentIssuedDocuments,
  getDonorPledges,
  getIssuedDocumentHistory,
  getIssuedDocumentUrl,
  getDocumentUrl,
  getSchoolYears,
  getTemplates,
  rejectApplication,
  saveContractTemplate,
  saveTemplate,
  toggleSchoolYear,
  updateDonorDueDay,
} from "@/app/admin/_actions/admin-actions";
import {
  deleted,
  failWrites,
  inserted,
  queryFor,
  resetFakeDb,
  setReturning,
  updated,
} from "./helpers/fake-db";

const MOCK_USER = { id: "user-123", email: "admin@test.com", role: "admin" as const, ativo: true };

function authAs(user: { id: string; email: string; role: "admin" | "secretaria"; ativo: boolean } | null = MOCK_USER) {
  mockGetSessionUser.mockResolvedValue(user);
  if (user) {
    mockRequireAdmin.mockResolvedValue(user);
    mockRequireCapability.mockResolvedValue(user);
  } else {
    const error = new Error("Não autorizado. Faça login para continuar.");
    mockRequireAdmin.mockRejectedValue(error);
    mockRequireCapability.mockRejectedValue(error);
  }
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

describe("issued document role boundaries", () => {
  const secretaria = { id: "secretaria-1", email: "sec@test.com", role: "secretaria" as const, ativo: true };

  it("returns only the eligible current decision to Secretaria", async () => {
    authAs(secretaria);
    queryFor("applications").findFirst.mockResolvedValue({ status: "rejeitada" });
    queryFor("issuedDocuments").findMany.mockResolvedValue([
      { id: "decision-current", kind: "decision", version: 2 },
      { id: "decision-old", kind: "decision", version: 1 },
      { id: "contract-current", kind: "contract", version: 1 },
    ]);
    await expect(getCurrentIssuedDocuments("app-1")).resolves.toEqual([{ id: "decision-current", kind: "decision", version: 2 }]);
  });

  it("keeps issued history Administrator-only", async () => {
    authAs(secretaria);
    mockRequireAdmin.mockRejectedValueOnce(new Error("Você não tem permissão para realizar esta ação."));
    await expect(getIssuedDocumentHistory("app-1")).rejects.toThrow("permissão");
  });

  it("denies a superseded final-document ID to Secretaria", async () => {
    authAs(secretaria);
    queryFor("issuedDocuments").findFirst.mockResolvedValue({ id: "old", application_id: "app-1", storage_path: "applications/app-1/issued/decision/old.pdf" });
    queryFor("applications").findFirst.mockResolvedValue({ status: "aprovada" });
    queryFor("issuedDocuments").findMany.mockResolvedValue([{ id: "current", kind: "decision", version: 2 }]);
    await expect(getIssuedDocumentUrl("old")).resolves.toEqual({ error: "Documento final não encontrado." });
    expect(mockSize).not.toHaveBeenCalled();
  });
});

describe("Secretaria projection boundaries", () => {
  const secretaria = { id: "secretaria-1", email: "sec@test.com", role: "secretaria" as const, ativo: true };

  it("uses an explicit restricted application projection", async () => {
    authAs(secretaria);
    queryFor("applications").findMany.mockResolvedValue([]);
    await getApplications();
    const options = queryFor("applications").findMany.mock.calls[0][0];
    expect(options.columns).toEqual({ id: true, status: true, escola: true, pai_nome: true, mae_nome: true, telefone: true, email: true, data_decisao: true });
    expect(options.with.students.columns).toEqual({ id: true, nome: true });
  });

  it("does not call restricted actions when Administrator authorization rejects Secretaria", async () => {
    authAs(secretaria);
    mockRequireAdmin.mockRejectedValueOnce(new Error("Você não tem permissão para realizar esta ação."));
    await expect(getApplicationDetail("app-1")).rejects.toThrow("permissão");
    expect(queryFor("applications").findFirst).not.toHaveBeenCalled();
  });

  it("uses the operational donor allowlist for Secretaria", async () => {
    authAs(secretaria);
    queryFor("donorPledges").findMany.mockResolvedValue([]);
    await getDonorPledges();
    const options = queryFor("donorPledges").findMany.mock.calls[0][0];
    expect(options.columns).toMatchObject({ id: true, nome: true, email: true, telefone: true, valor: true });
    expect(options.columns.cpf).toBeUndefined();
    expect(options.columns.endereco).toBeUndefined();
  });
});

describe("administrator donor email projection", () => {
  it("adds welcome state without exposing the reservation token", async () => {
    queryFor("donorPledges").findMany.mockResolvedValue([{
      id: "d1",
      welcome_email_sent_at: null,
      welcome_email_reservation_token: "secret-reservation-token",
      welcome_email_reservation_expires_at: new Date(Date.now() + 30_000).toISOString(),
    }]);

    const result = await getDonorPledges();

    expect(result.data?.[0]).toMatchObject({
      id: "d1",
      welcome_email_in_progress: true,
    });
    expect(result.data?.[0]).not.toHaveProperty("welcome_email_reservation_token");
    expect(result.data?.[0]).not.toHaveProperty("welcome_email_reservation_expires_at");
  });
});

describe("administrator donor reminder projection", () => {
  it("returns only the latest reminder metadata and computes the next monthly due date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
    queryFor("donorPledges").findMany.mockResolvedValue([{
      id: "d1", frequencia: "mensal", duracao: "indeterminado",
      dia_vencimento: 5, created_at: "2026-10-01T12:00:00Z",
    }]);
    queryFor("donorReminderSends").findMany.mockResolvedValue([
      { pledge_id: "d1", kind: "5d", competencia: "2026-11", status: "sent", sent_at: "2026-10-31T12:00:00Z", error_code: null, frozen_recipient: "private@example.test", frozen_html: "private body" },
      { pledge_id: "d1", kind: "10d", competencia: "2026-11", status: "failed", sent_at: null, error_code: "provider_rejected" },
    ]);

    try {
      const result = await getDonorPledges();
      expect(result.data?.[0]).toMatchObject({
        next_due_date: "2026-11-05",
        latest_reminder: { kind: "5d", competencia: "2026-11", status: "sent", sent_at: "2026-10-31T12:00:00Z" },
      });
      const donor = result.data?.[0];
      if (!donor || !("latest_reminder" in donor)) throw new Error("Administrator projection missing");
      expect(donor.latest_reminder).not.toHaveProperty("frozen_html");
      expect(donor.latest_reminder).not.toHaveProperty("frozen_recipient");
      expect(donor.latest_reminder).not.toHaveProperty("pledge_id");
      const options = queryFor("donorReminderSends").findMany.mock.calls[0][0];
      expect(options.columns).toEqual({ pledge_id: true, kind: true, competencia: true, status: true, sent_at: true, error_code: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("projects the latest instructions generation and current receipt without frozen content", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
    queryFor("donorPledges").findMany.mockResolvedValue([{
      id: "d1", frequencia: "mensal", duracao: "indeterminado", dia_vencimento: 30,
      created_at: "2026-01-01T12:00:00Z",
    }]);
    queryFor("donorMonthlyInstructionSends").findMany.mockResolvedValue([
      { pledge_id: "d1", generation: 2, receipt_competencia: "2026-11", status: "sent",
        sent_at: "2026-10-26T15:00:00Z", error_code: null, frozen_html: "private body" },
      { pledge_id: "d1", generation: 1, receipt_competencia: "2026-10", status: "failed",
        sent_at: null, error_code: "provider_rejected" },
    ]);
    queryFor("donorPaymentLedger").findMany.mockResolvedValue([
      { pledge_id: "d1", competencia: "2026-10", due_date: "2026-10-30",
        receipt_path: "private/path.pdf", receipt_name: "receipt.pdf", receipt_uploaded_at: "2026-10-20T12:00:00Z" },
      { pledge_id: "d1", competencia: "2026-11", due_date: "2026-11-30",
        receipt_path: null, receipt_name: null, receipt_uploaded_at: null },
    ]);
    try {
      const result = await getDonorPledges();
      expect(result.data?.[0]).toMatchObject({
        latest_instructions: { generation: 2, status: "sent", receipt_competencia: "2026-11" },
        current_receipt: { competencia: "2026-10", status: "Comprovante enviado – aguardando conferência" },
        pending_occurrences: [{ competencia: "2026-11", due_date: "2026-11-30" }],
      });
      expect(JSON.stringify(result.data)).not.toContain("private/path.pdf");
      expect(JSON.stringify(result.data)).not.toContain("private body");
      expect(queryFor("donorMonthlyInstructionSends").findMany.mock.calls[0][0].columns)
        .not.toHaveProperty("frozen_html");
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports no instructions attempt for a historical monthly donor", async () => {
    queryFor("donorPledges").findMany.mockResolvedValue([{
      id: "d1", frequencia: "mensal", duracao: "indeterminado", dia_vencimento: 10,
      created_at: "2025-01-01T12:00:00Z",
    }]);
    const result = await getDonorPledges();
    expect(result.data?.[0]).toMatchObject({ latest_instructions: null });
  });

  it.each([
    [null, "pending"],
    ["2026-10-25T12:00:00Z", "uncertain"],
  ])("projects an expired reservation with provider start %s as %s", async (startedAt, status) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
    queryFor("donorPledges").findMany.mockResolvedValue([{
      id: "d1", frequencia: "mensal", duracao: "indeterminado", dia_vencimento: 30,
      created_at: "2026-01-01T12:00:00Z",
    }]);
    queryFor("donorMonthlyInstructionSends").findMany.mockResolvedValue([{
      pledge_id: "d1", generation: 1, receipt_competencia: "2026-10",
      status: "sending", sent_at: null, error_code: null,
      reservation_expires_at: "2026-10-25T15:00:00Z",
      provider_call_started_at: startedAt,
    }]);
    try {
      const result = await getDonorPledges();
      expect(result.data?.[0]).toMatchObject({ latest_instructions: { status } });
    } finally { vi.useRealTimers(); }
  });

  it("does not query reminder records for Secretaria", async () => {
    authAs({ id: "sec", email: "sec@test.com", role: "secretaria", ativo: true });
    queryFor("donorPledges").findMany.mockResolvedValue([]);
    await getDonorPledges();
    expect(queryFor("donorReminderSends").findMany).not.toHaveBeenCalled();
    expect(queryFor("donorMonthlyInstructionSends").findMany).not.toHaveBeenCalled();
    expect(queryFor("donorPaymentLedger").findMany).not.toHaveBeenCalled();
  });
});

describe("updateDonorDueDay", () => {
  const id = "48a283a7-4869-48ca-ac75-dc48bd30c9e8";

  it("updates a monthly day and returns the recomputed next due date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
    setReturning(donorPledges, [{
      id,
      frequencia: "mensal",
      duracao: "indeterminado",
      dia_vencimento: 12,
      created_at: "2026-10-26T12:00:00Z",
    }]);

    try {
      expect(await updateDonorDueDay(id, 12)).toEqual({
        success: true,
        dia_vencimento: 12,
        next_due_date: "2026-11-12",
      });
      expect(updated).toEqual([{ table: donorPledges, values: { dia_vencimento: 12 } }]);
      expect(mockRequireAdmin).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([0, 32, 1.5, NaN])("rejects invalid day %s before writing", async (day) => {
    expect(await updateDonorDueDay(id, day)).toMatchObject({ success: false });
    expect(updated).toHaveLength(0);
  });

  it("rejects an invalid pledge ID before writing", async () => {
    expect(await updateDonorDueDay("not-a-uuid", 12)).toMatchObject({ success: false });
    expect(updated).toHaveLength(0);
  });

  it("reports a one-time or missing pledge without changing its payment date", async () => {
    expect(await updateDonorDueDay(id, 12)).toMatchObject({ success: false });
    expect(updated).toEqual([{ table: donorPledges, values: { dia_vencimento: 12 } }]);
  });

  it("reports a database failure without exposing internals", async () => {
    failWrites();
    expect(await updateDonorDueDay(id, 12)).toEqual({
      success: false,
      error: "Não foi possível atualizar o dia. Tente novamente.",
    });
  });

  it("denies a direct Secretaria call before querying or writing", async () => {
    authAs({ id: "secretaria", email: "sec@example.test", role: "secretaria", ativo: true });
    mockRequireAdmin.mockRejectedValue(new Error("Você não tem permissão para realizar esta ação."));
    await expect(updateDonorDueDay(id, 12)).rejects.toThrow("permissão");
    expect(updated).toHaveLength(0);
  });

  it("keeps the due-day fields out of the Secretaria projection", async () => {
    authAs({ id: "secretaria", email: "sec@example.test", role: "secretaria", ativo: true });
    queryFor("donorPledges").findMany.mockResolvedValue([]);
    await getDonorPledges();
    const options = queryFor("donorPledges").findMany.mock.calls[0][0];
    expect(options.columns).not.toHaveProperty("dia_vencimento");
    expect(options.columns).not.toHaveProperty("next_due_date");
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
    setReturning(applications, [{ id: "app-1" }]);

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

  it("fails when the application does not exist or was already decided", async () => {
    // Nenhum setReturning: o update condicional não afeta linha alguma.
    const result = await approveApplication("app-1", 75);

    expect(result.success).toBe(false);
    expect(result.error).toContain("já decidida");
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
    setReturning(applications, [{ id: "app-1" }]);

    const result = await rejectApplication("app-1", "Renda incompatível");

    expect(result.success).toBe(true);
    expect(updated[0].values).toMatchObject({
      status: "rejeitada",
      motivo: "Renda incompatível",
      decided_by: "user-123",
    });
  });

  it("fails when the application was already decided", async () => {
    const result = await rejectApplication("app-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("já decidida");
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
    const created = {
      id: "year-9",
      nome: "2026",
      data_inicio: "2026-02-01",
      data_fim: "2026-12-15",
      ativo: false,
    };
    setReturning(schoolYears, [created]);

    const result = await createSchoolYear({
      nome: "2026",
      data_inicio: "2026-02-01",
      data_fim: "2026-12-15",
    });

    expect(result.success).toBe(true);
    // Devolve a linha persistida: o cliente usa o ID real na lista.
    expect(result.data).toEqual(created);
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
  it("upserts the template over the tipo uniqueness", async () => {
    const result = await saveTemplate({
      tipo: "aprovacao",
      cabecalho: "Header",
      corpo: "Body {aluno}",
      rodape: "Footer",
    });

    expect(result.success).toBe(true);
    expect(inserted[0].table).toBe(decisionTemplates);
    expect(inserted[0].values).toMatchObject({
      tipo: "aprovacao",
      corpo: "Body {aluno}",
    });
  });

  it("reports an error when the write fails", async () => {
    failWrites();

    const result = await saveTemplate({
      tipo: "rejeicao",
      cabecalho: "H",
      corpo: "B",
      rodape: "R",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Erro ao salvar");
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
    expect(mockPut).toHaveBeenCalledOnce();
    expect(inserted.some((write) => write.table === issuedDocuments)).toBe(true);

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

  it("does not return a decision PDF when its audit record cannot be persisted", async () => {
    queryFor("applications").findFirst.mockResolvedValue(approvedApp);
    queryFor("decisionTemplates").findFirst.mockResolvedValue(template);
    failWrites();
    await expect(exportDecision("app-1")).resolves.toEqual({ error: "Não foi possível registrar a emissão da decisão." });
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
    expect(mockPut).toHaveBeenCalledOnce();
    expect(inserted.some((write) => write.table === issuedDocuments)).toBe(true);

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

  it("does not return a contract PDF when its audit record cannot be persisted", async () => {
    queryFor("applications").findFirst.mockResolvedValue(approvedApp);
    queryFor("contractTemplates").findFirst.mockResolvedValue(template);
    failWrites();
    await expect(exportContract("app-1")).resolves.toEqual({ error: "Não foi possível registrar a emissão do contrato." });
  });
});


describe("institutional header at all PDF export boundaries", () => {
  const header = { linha1: 'Fundação São Tomé & <Filhos>', linha2: 'Educação "Católica"', linha3: "Itatiba • São Paulo", mostrar_selo: false };
  const exports = [
    [exportApplication, () => extraPdfs.application],
    [exportDonorPledge, () => extraPdfs.donor],
    [exportDecision, () => mockRenderDecisionPdf],
    [exportContract, () => mockRenderContractPdf],
  ] as const;

  beforeEach(() => {
    queryFor("applications").findFirst.mockResolvedValue({
      id: "app-1", status: "aprovada", pai_nome: "Responsável", mae_nome: "Mãe",
      escola: "Escola", students: [], school_years: null,
    });
    queryFor("donorPledges").findFirst.mockResolvedValue({ nome: "Benfeitor" });
    queryFor("decisionTemplates").findFirst.mockResolvedValue({ cabecalho: "", corpo: "", rodape: "" });
    queryFor("contractTemplates").findFirst.mockResolvedValue({ titulo: "", cabecalho: "", clausulas: [], rodape: "" });
  });

  it.each(exports)("passes current fields and seal to export %s, then observes an update", async (action, renderer) => {
    queryFor("documentHeader").findFirst.mockResolvedValue({ id: "header-1", ...header });
    expect(await action("app-1")).toHaveProperty("pdfBase64");
    expect(renderer()).toHaveBeenLastCalledWith(expect.objectContaining({ header }));
    const changed = { ...header, linha2: "", linha3: "", mostrar_selo: true };
    await saveDocumentHeader(changed);
    expect(extraPdfs.revalidate).toHaveBeenCalledWith("/admin", "layout");
    queryFor("documentHeader").findFirst.mockResolvedValue(changed);
    expect(await action("app-1")).toHaveProperty("pdfBase64");
    expect(renderer()).toHaveBeenLastCalledWith(expect.objectContaining({ header: changed }));
  });

  it.each(exports)("blocks export %s on header DB failure before rendering or issuance", async (action, renderer) => {
    queryFor("documentHeader").findFirst.mockRejectedValue(new Error("sensitive connection details"));
    expect(await action("app-1")).toEqual({ error: "Não foi possível carregar o cabeçalho institucional. Tente novamente." });
    expect(renderer()).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
    expect(inserted).toHaveLength(0);
  });

  it("distinguishes a missing settings row from a failed read", async () => {
    expect(await getDocumentHeader()).toEqual({ data: { linha1: "Arca Nossa Senhora da Providência", linha2: "", linha3: "", mostrar_selo: true }, error: null });
    queryFor("documentHeader").findFirst.mockRejectedValue(new Error("private"));
    expect(await getDocumentHeader()).toMatchObject({ data: null, error: expect.any(String) });
    expect(await saveDocumentHeader(header)).toEqual({ success: false, error: "Não foi possível salvar o cabeçalho. Tente novamente." });
  });
});
