import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SESSION_SECRET", "y".repeat(48));

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { mockGetApplicant } = vi.hoisted(() => ({ mockGetApplicant: vi.fn() }));
vi.mock("@/lib/auth/applicant-session", () => ({ getApplicant: mockGetApplicant }));

import { verifyTicket } from "@/lib/storage/tickets";
import {
  createApplicantUploadUrl,
  createUploadUrl,
  getActiveSchoolYear,
  saveApplicationDraft,
} from "@/app/form/_actions/form-actions";
import { applicationDrafts } from "@/lib/db/schema";
import { inserted, queryFor, resetFakeDb } from "./helpers/fake-db";

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
});

describe("getActiveSchoolYear", () => {
  it("returns { open: false } when no school year is active", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue(undefined);

    expect(await getActiveSchoolYear()).toEqual({ open: false });
  });

  it("returns { open: false } when today falls outside the active window", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValueOnce({
      id: "year-1",
      nome: "2025",
      data_inicio: "2025-01-01",
      data_fim: "2025-12-31",
      ativo: true,
    });

    expect(await getActiveSchoolYear()).toEqual({ open: false, year: { id: "year-1", nome: "2025", data_inicio: "2025-01-01", data_fim: "2025-12-31", ativo: true } });
  });

  it("returns { open: true, year } while the window is open", async () => {
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    const year = {
      id: "year-1",
      nome: "2026",
      data_inicio: start.toISOString().split("T")[0],
      data_fim: end.toISOString().split("T")[0],
      ativo: true,
    };
    queryFor("schoolYears").findFirst.mockResolvedValue(year);

    const result = await getActiveSchoolYear();

    expect(result.open).toBe(true);
    expect(result.year).toEqual(year);
  });
  it("announces the nearest future year even when inactive, without opening the form", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    try {
      const upcomingYear = { id: "next", nome: "2027", data_inicio: "2026-11-01", data_fim: "2026-12-15", ativo: false };
      const query = queryFor("schoolYears").findFirst;
      query.mockResolvedValueOnce(undefined).mockResolvedValueOnce(upcomingYear);
      expect(await getActiveSchoolYear()).toEqual({ open: false, upcomingYear });
      const { gt, asc } = await import("drizzle-orm");
      const { schoolYears } = await import("@/lib/db/schema");
      expect(query.mock.calls[1][0]).toEqual({ where: gt(schoolYears.data_inicio, "2026-10-14"), orderBy: [asc(schoolYears.data_inicio), asc(schoolYears.id)] });
    } finally {
      vi.useRealTimers();
    }
  });
  it("does not query upcoming years while the active form is open", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValueOnce({ id: "current", nome: "2026", data_inicio: "2020-01-01", data_fim: "2099-12-31", ativo: true });
    expect((await getActiveSchoolYear()).open).toBe(true);
    expect(queryFor("schoolYears").findFirst).toHaveBeenCalledTimes(1);
  });

});

describe("createUploadUrl (anonymous, donor receipt only)", () => {
  it("generates a path under pending/{uuid}/recibo_pagamento/", async () => {
    const result = await createUploadUrl("comprovante.pdf", "recibo_pagamento");

    expect("url" in result).toBe(true);
    if (!("url" in result)) return;

    expect(result.path).toMatch(/^pending\/[0-9a-f-]+\/recibo_pagamento\/comprovante\.pdf$/);
    expect(result.url).toMatch(/^\/api\/uploads\?ticket=/);
  });

  it("signs the destination path into the ticket", async () => {
    const result = await createUploadUrl("doc.pdf", "recibo_pagamento");
    if (!("url" in result)) throw new Error("expected a url");

    const ticket = new URL(result.url, "http://x").searchParams.get("ticket");

    expect(verifyTicket(ticket, "upload")).toBe(result.path);
    // Um ticket de upload não serve para baixar documentos.
    expect(verifyTicket(ticket, "download")).toBeNull();
  });

  it.each(["rg_pai", "extrato_ir", "rg_aluno_0", "../recibo_pagamento", "unknown"])(
    "refuses scholarship and unknown categories anonymously (%s)",
    async (category) => {
      await expect(createUploadUrl("doc.pdf", category)).resolves.toEqual({ error: "Categoria de documento inválida." });
    }
  );

  it("returns an error when the signing secret is missing", async () => {
    vi.stubEnv("SESSION_SECRET", "");

    const result = await createUploadUrl("doc.pdf", "recibo_pagamento");
    expect("error" in result).toBe(true);

    vi.stubEnv("SESSION_SECRET", "y".repeat(48));
  });
});

describe("createApplicantUploadUrl", () => {
  const ACCOUNT = "11111111-1111-4111-8111-111111111111";

  it("requires a logged-in applicant", async () => {
    mockGetApplicant.mockResolvedValue(null);
    await expect(createApplicantUploadUrl("doc.pdf", "rg_pai")).resolves.toEqual({
      error: "Sua sessão expirou. Entre novamente para continuar.",
    });
  });

  it("writes under the account's draft folder and sanitizes the filename", async () => {
    mockGetApplicant.mockResolvedValue({ id: ACCOUNT, email: "maria@example.com" });
    const result = await createApplicantUploadUrl("my file (1).pdf", "rg_pai");
    if (!("path" in result)) throw new Error("expected a path");

    expect(result.path).toMatch(new RegExp(`^drafts/${ACCOUNT}/[0-9a-f-]+/rg_pai/my_file__1_\\.pdf$`));
    const ticket = new URL(result.url, "http://x").searchParams.get("ticket");
    expect(verifyTicket(ticket, "upload")).toBe(result.path);
  });

  it("gives each upload its own directory", async () => {
    mockGetApplicant.mockResolvedValue({ id: ACCOUNT, email: "maria@example.com" });
    const first = await createApplicantUploadUrl("doc.pdf", "rg_pai");
    const second = await createApplicantUploadUrl("doc.pdf", "rg_pai");
    if (!("path" in first) || !("path" in second)) throw new Error("expected paths");
    expect(first.path).not.toBe(second.path);
  });

  it.each([
    "declaracao_vaga", "carta_recomendacao", "rg_pai", "rg_mae", "certidao", "comprovante_endereco",
    "extrato_ir", "extrato_bancario", "rg_aluno_0", "certidao_nascimento_12",
  ])("accepts the scholarship category %s", async (category) => {
    mockGetApplicant.mockResolvedValue({ id: ACCOUNT, email: "maria@example.com" });
    await expect(createApplicantUploadUrl("doc.pdf", category)).resolves.toMatchObject({ path: expect.stringContaining(`/${category}/`) });
  });

  it.each(["recibo_pagamento", "doc_pai", "../rg_pai", "rg_aluno_x", "rg_aluno_1/x", "unknown"])(
    "rejects an unsupported category %s",
    async (category) => {
      mockGetApplicant.mockResolvedValue({ id: ACCOUNT, email: "maria@example.com" });
      await expect(createApplicantUploadUrl("doc.pdf", category)).resolves.toEqual({ error: "Categoria de documento inválida." });
    }
  );
});

describe("saveApplicationDraft", () => {
  const OPEN = { id: "year-1", data_inicio: "2000-01-01", data_fim: "2999-12-31" };

  it("requires a logged-in applicant", async () => {
    mockGetApplicant.mockResolvedValue(null);
    await expect(saveApplicationDraft({ pai_nome: "José" }, 2)).resolves.toMatchObject({ success: false });
    expect(inserted).toHaveLength(0);
  });

  it("upserts the draft for the account and the open school year, clamping the step", async () => {
    mockGetApplicant.mockResolvedValue({ id: "acc-1", email: "maria@example.com" });
    queryFor("schoolYears").findFirst.mockResolvedValue(OPEN);

    const result = await saveApplicationDraft({ pai_nome: "José" }, 42);

    expect(result).toMatchObject({ success: true, savedAt: expect.any(String) });
    expect(inserted[0]).toMatchObject({
      table: applicationDrafts,
      values: { account_id: "acc-1", school_year_id: "year-1", data: { pai_nome: "José" }, current_step: 6 },
    });
  });

  it("refuses drafts once the application was submitted, outside the window, or when too large", async () => {
    mockGetApplicant.mockResolvedValue({ id: "acc-1", email: "maria@example.com" });
    queryFor("schoolYears").findFirst.mockResolvedValue(OPEN);
    queryFor("applications").findFirst.mockResolvedValueOnce({ id: "app-1" });
    await expect(saveApplicationDraft({}, 1)).resolves.toEqual({ success: false, error: "Sua solicitação já foi enviada." });

    queryFor("schoolYears").findFirst.mockResolvedValue(undefined);
    await expect(saveApplicationDraft({}, 1)).resolves.toMatchObject({ success: false });

    await expect(saveApplicationDraft({ big: "x".repeat(300 * 1024) }, 1)).resolves.toMatchObject({ success: false });
    await expect(saveApplicationDraft(["not", "an", "object"], 1)).resolves.toMatchObject({ success: false });
    expect(inserted).toHaveLength(0);
  });
});
