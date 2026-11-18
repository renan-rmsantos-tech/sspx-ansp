import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SESSION_SECRET", "z".repeat(48));

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { mockGetApplicant } = vi.hoisted(() => ({ mockGetApplicant: vi.fn() }));
vi.mock("@/lib/auth/applicant-session", () => ({ getApplicant: mockGetApplicant }));

const { mockMove, mockSize } = vi.hoisted(() => ({
  mockMove: vi.fn(),
  mockSize: vi.fn(),
}));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>(
    "@/lib/storage"
  );
  return {
    ...actual,
    getStorage: () => ({ move: mockMove, size: mockSize }),
  };
});

import {
  applicationDrafts,
  applications,
  benefactors,
  collaboration,
  documents,
  otherChildren,
  students,
  vehicles,
} from "@/lib/db/schema";
import { submitApplication } from "@/app/form/_actions/form-actions";
import {
  deleted,
  failWrites,
  inserted,
  queryFor,
  resetFakeDb,
  setReturning,
  updated,
} from "./helpers/fake-db";

function validInput() {
  return {
    compromisso_contribuicao: true as const,
    ciencia_confidencialidade: true as const,
    escola: "Colégio São José",
    declaracao_vaga: ["drafts/acc-1/uuid/declaracao_vaga/declaracao.pdf"],
    carta_recomendacao: ["drafts/acc-1/uuid/carta_recomendacao/carta.pdf"],
    pai: {
      nome: "João da Silva",
      rg: "12.345.678-9",
      cpf: "529.982.247-25",
      documentos: ["drafts/acc-1/uuid/rg_pai/rg.pdf"],
    },
    mae: {
      nome: "Maria da Silva",
      cpf: "111.444.777-35",
      documentos: ["drafts/acc-1/uuid/rg_mae/rg.pdf"],
    },
    certidao_casamento: ["drafts/acc-1/uuid/certidao/certidao.pdf"],
    endereco: "Rua das Flores, 123",
    telefone: "(11) 99999-9999",
    comprovante_endereco: ["drafts/acc-1/uuid/comprovante_endereco/comp.pdf"],
    outros_filhos: [],
    alunos: [
      {
        nome: "Ana Silva",
        serie: "5º ano",
        mensalidade: 1200,
        documento_identidade: ["drafts/acc-1/uuid/rg_aluno_0/rg.pdf"],
        certidao_nascimento: ["drafts/acc-1/uuid/certidao_nascimento_0/certidao.pdf"],
      },
    ],
    desconto_solicitado: 50,
    renda: { pai: 3000, mae: 2500, pessoas: 4 },
    extrato_ir: ["drafts/acc-1/uuid/extrato_ir/ir.pdf"],
    despesas: { aluguel: 1200 },
    extratos_bancarios: ["drafts/acc-1/uuid/extrato_bancario/ext.pdf"],
    veiculos: [{ marca: "Fiat", modelo: "Uno", ano: "2015" }],
    colaboracao: {
      limpeza: { ativo: true, vezes_semana: 2 },
      arrecadacao: true,
      benfeitores: false,
    },
    indicacao_benfeitores: [{ nome: "Carlos", email: "carlos@email.com" }],
  };
}

function insertedFor(table: unknown) {
  return inserted.find((row) => row.table === table)?.values;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();

  queryFor("schoolYears").findFirst.mockResolvedValue({
    id: "year-1",
    data_inicio: "2000-01-01",
    data_fim: "2999-12-31",
  });
  setReturning(applications, [{ id: "app-1" }]);
  setReturning(students, [{ id: "student-1", nome: "Ana Silva" }]);
  mockMove.mockResolvedValue(undefined);
  mockSize.mockResolvedValue(2048);
  mockGetApplicant.mockResolvedValue({ id: "acc-1", email: "maria@example.com" });
});

describe("submitApplication", () => {
  it("creates records in every related table", async () => {
    const result = await submitApplication(validInput());

    expect(result.success).toBe(true);
    expect(result.id).toBe("app-1");

    const tables = inserted.map((row) => row.table);
    expect(tables).toContain(applications);
    expect(tables).toContain(students);
    expect(tables).toContain(collaboration);
    expect(tables).toContain(documents);
    expect(tables).toContain(vehicles);
    expect(tables).toContain(benefactors);
  });

  it("strips punctuation from the CPFs it stores", async () => {
    await submitApplication(validInput());

    expect(insertedFor(applications)).toMatchObject({
      pai_cpf: "52998224725",
      mae_cpf: "11144477735",
    });
  });

  it("skips tables with nothing to insert", async () => {
    await submitApplication(validInput());

    // outros_filhos está vazio na entrada válida.
    expect(inserted.map((row) => row.table)).not.toContain(otherChildren);
  });

  it("links student documents to the inserted student", async () => {
    await submitApplication(validInput());

    const rows = insertedFor(documents) as Array<{
      categoria: string;
      student_id: string | null;
    }>;
    const studentDoc = rows.find((row) => row.categoria === "rg_aluno");

    expect(studentDoc?.student_id).toBe("student-1");
  });

  it("stores the school vacancy declaration with its own category", async () => {
    await submitApplication(validInput());

    const rows = insertedFor(documents) as Array<{
      categoria: string;
      storage_path: string;
    }>;
    expect(rows).toContainEqual(
      expect.objectContaining({
        categoria: "declaracao_vaga",
        storage_path: "applications/app-1/uuid/declaracao_vaga/declaracao.pdf",
      })
    );
  });

  it("stores the priest's recommendation letter with its own category", async () => {
    await submitApplication(validInput());

    const rows = insertedFor(documents) as Array<{
      categoria: string;
      storage_path: string;
    }>;
    expect(rows).toContainEqual(
      expect.objectContaining({
        categoria: "carta_recomendacao",
        storage_path: "applications/app-1/uuid/carta_recomendacao/carta.pdf",
      })
    );
  });

  it("rejects a submission without the priest's recommendation letter", async () => {
    const result = await submitApplication({ ...validInput(), carta_recomendacao: [] });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty("carta_recomendacao");
    expect(inserted).toHaveLength(0);
  });

  it("rejects a recommendation letter uploaded under another category", async () => {
    const result = await submitApplication({
      ...validInput(),
      carta_recomendacao: ["drafts/acc-1/uuid/rg_pai/carta.pdf"],
    });

    expect(result).toEqual({
      success: false,
      errors: { _form: ["Os documentos enviados não correspondem às categorias exigidas."] },
    });
    expect(inserted).toHaveLength(0);
  });

  it("moves uploaded files from the draft folder into the application folder", async () => {
    await submitApplication(validInput());

    expect(mockMove).toHaveBeenCalledWith(
      "drafts/acc-1/uuid/rg_pai/rg.pdf",
      "applications/app-1/uuid/rg_pai/rg.pdf"
    );

    // O insert acontece antes do move (dentro da transação), com o caminho
    // de rascunho; depois do commit cada linha é atualizada para o caminho final.
    const updates = updated
      .filter((row) => row.table === documents)
      .map((row) => (row.values as { storage_path: string }).storage_path);

    expect(updates.length).toBeGreaterThan(0);
    expect(
      updates.every((path) => path.startsWith("applications/app-1/"))
    ).toBe(true);
  });

  it("records the real file size", async () => {
    await submitApplication(validInput());

    const rows = insertedFor(documents) as Array<{ tamanho_bytes: number }>;
    expect(rows.every((row) => row.tamanho_bytes === 2048)).toBe(true);
  });

  it("keeps the draft path when the file cannot be moved", async () => {
    mockMove.mockRejectedValue(new Error("ENOENT"));

    const result = await submitApplication(validInput());

    // A submissão continua bem-sucedida e nenhuma linha é atualizada para um
    // caminho que não existe.
    expect(result.success).toBe(true);
    expect(updated.filter((row) => row.table === documents)).toHaveLength(0);

    const rows = insertedFor(documents) as Array<{ storage_path: string }>;
    expect(rows.every((row) => row.storage_path.startsWith("drafts/acc-1/"))).toBe(true);
  });

  it("returns an error when the active school year window is closed", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue({
      id: "year-1",
      data_inicio: "2000-01-01",
      data_fim: "2000-12-31",
    });

    const result = await submitApplication(validInput());

    expect(result.success).toBe(false);
    expect(result.errors?._form).toBeDefined();
    expect(inserted).toHaveLength(0);
  });

  it("rejects document paths outside the draft folder", async () => {
    const data = validInput();
    data.pai.documentos = ["applications/other-app/rg_pai/rg.pdf"];

    const result = await submitApplication(data);

    expect(result.success).toBe(false);
    expect(inserted).toHaveLength(0);
  });

  it.each([
    ["uses another required category", (data: ReturnType<typeof validInput>) => { data.pai.documentos = ["drafts/acc-1/uuid/rg_mae/rg.pdf"]; }],
    ["reuses one path in two required groups", (data: ReturnType<typeof validInput>) => { data.mae.documentos = [...data.pai.documentos]; }],
    ["uses a wrong student category", (data: ReturnType<typeof validInput>) => { data.alunos[0].certidao_nascimento = ["drafts/acc-1/uuid/certidao_nascimento_1/certidao.pdf"]; }],
  ])("rejects a submission that %s", async (_label, mutate) => {
    const data = validInput();
    mutate(data);
    await expect(submitApplication(data)).resolves.toMatchObject({ success: false });
    expect(inserted).toHaveLength(0);
  });

  it("rejects files from another account's draft folder", async () => {
    const data = validInput();
    data.pai.documentos = ["drafts/acc-2/uuid/rg_pai/rg.pdf"];

    await expect(submitApplication(data)).resolves.toEqual({
      success: false,
      errors: { _form: ["Os documentos enviados não correspondem às categorias exigidas."] },
    });
    expect(inserted).toHaveLength(0);
  });

  it("requires a logged-in applicant", async () => {
    mockGetApplicant.mockResolvedValue(null);

    const result = await submitApplication(validInput());

    expect(result.errors?._form?.[0]).toMatch(/sessão expirou/);
    expect(inserted).toHaveLength(0);
  });

  it("links the application to the account and deletes the draft in the same transaction", async () => {
    await submitApplication(validInput());

    expect(insertedFor(applications)).toMatchObject({ applicant_account_id: "acc-1", school_year_id: "year-1" });
    expect(deleted.map((row) => row.table)).toContain(applicationDrafts);
  });

  it("refuses a second application from the same account in the same school year", async () => {
    queryFor("applications").findFirst.mockResolvedValue({ id: "app-0" });

    const result = await submitApplication(validInput());

    expect(result.errors?._form?.[0]).toMatch(/já foi enviada/);
    expect(inserted).toHaveLength(0);
  });

  it("returns Zod errors without touching the database", async () => {
    const data = validInput();
    data.pai.nome = "";
    data.pai.cpf = "invalid";
    data.alunos = [];

    const result = await submitApplication(data);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(inserted).toHaveLength(0);
  });

  it("returns an error when no school year is active", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue(undefined);

    const result = await submitApplication(validInput());

    expect(result.success).toBe(false);
    expect(result.errors?._form).toBeDefined();
    expect(inserted).toHaveLength(0);
  });

  it("returns an error when a write inside the transaction fails", async () => {
    failWrites();

    const result = await submitApplication(validInput());

    expect(result.success).toBe(false);
    expect(result.errors?._form).toBeDefined();
  });
});
