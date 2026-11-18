import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SESSION_SECRET", "w".repeat(48));

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { mockRequireAdmin, mockSendRequestEmail, mockGetApplicant, mockMove, mockSize } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockSendRequestEmail: vi.fn(),
  mockGetApplicant: vi.fn(),
  mockMove: vi.fn(),
  mockSize: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({ requireCapability: mockRequireAdmin }));
vi.mock("@/lib/applicant/account-emails", () => ({ sendDocumentRequestEmail: mockSendRequestEmail }));
vi.mock("@/lib/auth/applicant-session", () => ({ getApplicant: mockGetApplicant }));
vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return { ...actual, getStorage: () => ({ move: mockMove, size: mockSize }) };
});

import {
  cancelDocumentRequest,
  createDocumentRequest,
  resendDocumentRequestNotice,
  resolveDocumentRequest,
} from "@/app/admin/_actions/document-request-actions";
import { submitRequestedDocument } from "@/app/form/_actions/form-actions";
import { documentRequests, documents } from "@/lib/db/schema";
import { inserted, queryFor, resetFakeDb, setReturning, updated } from "./helpers/fake-db";

const APP = { id: "app-1", applicant_account_id: "acc-1", students: [{ id: "st-1", nome: "Ana" }] };
const OPEN_REQUEST = {
  id: "req-1",
  categoria: "rg_pai",
  student_id: null,
  student: null,
  motivo: "RG ilegível",
  status: "aberta",
  created_at: "2026-11-17T12:00:00Z",
  notified_at: null,
  resubmitted_at: null,
  resolved_at: null,
  documents: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  mockRequireAdmin.mockResolvedValue({ id: "admin-1", email: "a@x.com", role: "admin", ativo: true });
  mockSendRequestEmail.mockResolvedValue(undefined);
  queryFor("applications").findFirst.mockResolvedValue(APP);
  queryFor("applicantAccounts").findFirst.mockResolvedValue({ email: "familia@example.com" });
  queryFor("documentRequests").findMany.mockResolvedValue([OPEN_REQUEST]);
});

describe("createDocumentRequest", () => {
  it("records the request with its author and e-mails the family every open request", async () => {
    const result = await createDocumentRequest("app-1", { categoria: "rg_pai", motivo: "  RG ilegível  " });

    expect(result).toMatchObject({ success: true, emailSent: true });
    expect(inserted[0]).toMatchObject({
      table: documentRequests,
      values: { application_id: "app-1", categoria: "rg_pai", student_id: null, motivo: "RG ilegível", created_by: "admin-1" },
    });
    expect(mockSendRequestEmail).toHaveBeenCalledWith("familia@example.com", [{ label: "RG do Pai", motivo: "RG ilegível" }]);
    expect(updated[0]).toMatchObject({ table: documentRequests, values: { notified_at: expect.any(String) } });
  });

  it("requires a student of this application for student documents", async () => {
    const missing = await createDocumentRequest("app-1", { categoria: "rg_aluno", motivo: "Foto cortada" });
    const foreign = await createDocumentRequest("app-1", { categoria: "rg_aluno", student_id: "st-other", motivo: "Foto cortada" });
    expect(missing).toEqual({ success: false, error: "Escolha o aluno deste documento." });
    expect(foreign).toEqual(missing);

    await createDocumentRequest("app-1", { categoria: "rg_aluno", student_id: "st-1", motivo: "Foto cortada" });
    expect(inserted[0].values).toMatchObject({ categoria: "rg_aluno", student_id: "st-1" });
  });

  it("validates the category and the reason before writing", async () => {
    expect(await createDocumentRequest("app-1", { categoria: "qualquer", motivo: "x" })).toMatchObject({ success: false });
    expect(await createDocumentRequest("app-1", { categoria: "rg_pai", motivo: "   " })).toMatchObject({ success: false });
    expect(await createDocumentRequest("app-1", { categoria: "rg_pai", motivo: "x".repeat(501) })).toMatchObject({ success: false });
    expect(inserted).toHaveLength(0);
  });

  it("refuses applications sent before applicant accounts", async () => {
    queryFor("applications").findFirst.mockResolvedValue({ ...APP, applicant_account_id: null });
    const result = await createDocumentRequest("app-1", { categoria: "rg_pai", motivo: "RG ilegível" });
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("antes das contas") });
    expect(inserted).toHaveLength(0);
  });

  it("keeps the request when the e-mail fails and reports it", async () => {
    mockSendRequestEmail.mockRejectedValueOnce(new Error("provider down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createDocumentRequest("app-1", { categoria: "rg_pai", motivo: "RG ilegível" });
    expect(result).toMatchObject({ success: true, emailSent: false });
    expect(inserted).toHaveLength(1);
    expect(updated).toHaveLength(0);
    log.mockRestore();
  });

  it("requires the documents capability, which the Secretariat also has", async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error("Você não tem permissão para realizar esta ação."));
    await expect(createDocumentRequest("app-1", { categoria: "rg_pai", motivo: "x" })).rejects.toThrow("permissão");
    expect(mockRequireAdmin).toHaveBeenCalledWith("applications:documents");
    expect(inserted).toHaveLength(0);

    mockRequireAdmin.mockResolvedValue({ id: "sec-1", email: "s@x.com", role: "secretaria", ativo: true });
    await createDocumentRequest("app-1", { categoria: "rg_pai", motivo: "RG ilegível" });
    expect(inserted[0].values).toMatchObject({ created_by: "sec-1" });
  });
});

describe("request lifecycle", () => {
  it("resends the notice and fails clearly when nothing could be sent", async () => {
    expect(await resendDocumentRequestNotice("app-1")).toMatchObject({ success: true, emailSent: true });
    mockSendRequestEmail.mockRejectedValueOnce(new Error("down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await resendDocumentRequestNotice("app-1")).toMatchObject({ success: false });
    log.mockRestore();
  });

  it("resolves and cancels only through a conditional update", async () => {
    setReturning(documentRequests, [{ id: "req-1" }]);
    expect(await resolveDocumentRequest("app-1", "req-1")).toMatchObject({ success: true });
    expect(updated[0]).toMatchObject({ table: documentRequests, values: { status: "resolvida", resolved_by: "admin-1" } });

    setReturning(documentRequests, []);
    expect(await cancelDocumentRequest("app-1", "req-1")).toMatchObject({ success: false, error: expect.stringContaining("já foi atualizada") });
  });
});

describe("submitRequestedDocument", () => {
  const PATH = "drafts/acc-1/up-1/pendencia/rg-novo.pdf";

  beforeEach(() => {
    mockGetApplicant.mockResolvedValue({ id: "acc-1", email: "familia@example.com" });
    queryFor("documentRequests").findFirst.mockResolvedValue({
      id: "req-1",
      status: "aberta",
      categoria: "rg_pai",
      student_id: null,
      application_id: "app-1",
      application: { id: "app-1", applicant_account_id: "acc-1" },
    });
    mockSize.mockResolvedValue(2048);
    mockMove.mockResolvedValue(undefined);
    setReturning(documentRequests, [{ id: "req-1" }]);
  });

  it("stores the new file linked to the request, marks it resubmitted and moves it to the application", async () => {
    expect(await submitRequestedDocument("req-1", [PATH])).toEqual({ success: true });

    expect(updated[0]).toMatchObject({ table: documentRequests, values: { status: "reenviada", resubmitted_at: expect.any(String) } });
    expect(inserted[0]).toMatchObject({
      table: documents,
      values: [{ application_id: "app-1", categoria: "rg_pai", document_request_id: "req-1", tamanho_bytes: 2048 }],
    });
    expect(mockMove).toHaveBeenCalledWith(PATH, "applications/app-1/up-1/pendencia/rg-novo.pdf");
  });

  it("refuses another account's request, files outside the account folder and closed requests", async () => {
    mockGetApplicant.mockResolvedValue({ id: "acc-2", email: "outra@example.com" });
    expect(await submitRequestedDocument("req-1", ["drafts/acc-2/up-1/pendencia/x.pdf"])).toEqual({
      success: false,
      error: "Pendência não encontrada.",
    });

    mockGetApplicant.mockResolvedValue({ id: "acc-1", email: "familia@example.com" });
    expect(await submitRequestedDocument("req-1", ["drafts/acc-2/up-1/pendencia/x.pdf"])).toMatchObject({ success: false });
    expect(await submitRequestedDocument("req-1", ["drafts/acc-1/up-1/rg_pai/x.pdf"])).toMatchObject({ success: false });
    expect(await submitRequestedDocument("req-1", [])).toMatchObject({ success: false });

    queryFor("documentRequests").findFirst.mockResolvedValue({
      id: "req-1",
      status: "reenviada",
      categoria: "rg_pai",
      student_id: null,
      application_id: "app-1",
      application: { id: "app-1", applicant_account_id: "acc-1" },
    });
    expect(await submitRequestedDocument("req-1", [PATH])).toEqual({ success: false, error: "Este documento já foi reenviado." });
    expect(inserted).toHaveLength(0);
  });

  it("requires a logged-in applicant", async () => {
    mockGetApplicant.mockResolvedValue(null);
    expect(await submitRequestedDocument("req-1", [PATH])).toMatchObject({ success: false, error: expect.stringContaining("sessão") });
  });
});
