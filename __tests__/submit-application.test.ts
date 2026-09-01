import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SESSION_SECRET", "z".repeat(48));

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

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
  failWrites,
  inserted,
  queryFor,
  resetFakeDb,
  setReturning,
  updated,
} from "./helpers/fake-db";

function validInput() {
  return {
    escola: "Colégio São José",
    declaracao_vaga: ["pending/uuid/declaracao_vaga/declaracao.pdf"],
    pai: {
      nome: "João da Silva",
      rg: "12.345.678-9",
      cpf: "529.982.247-25",
      documentos: ["pending/uuid/rg_pai/rg.pdf"],
    },
    mae: {
      nome: "Maria da Silva",
      cpf: "111.444.777-35",
      documentos: ["pending/uuid/rg_mae/rg.pdf"],
    },
    certidao_casamento: ["pending/uuid/certidao/certidao.pdf"],
    endereco: "Rua das Flores, 123",
    telefone: "(11) 99999-9999",
    comprovante_endereco: ["pending/uuid/comprovante_endereco/comp.pdf"],
    outros_filhos: [],
    alunos: [
      {
        nome: "Ana Silva",
        serie: "5º ano",
        mensalidade: 1200,
        documento_identidade: ["pending/uuid/rg_aluno_0/rg.pdf"],
        certidao_nascimento: ["pending/uuid/certidao_nascimento_0/certidao.pdf"],
      },
    ],
    desconto_solicitado: 50,
    renda: { pai: 3000, mae: 2500, pessoas: 4 },
    extrato_ir: ["pending/uuid/extrato_ir/ir.pdf"],
    despesas: { aluguel: 1200 },
    extratos_bancarios: ["pending/uuid/extrato_bancario/ext.pdf"],
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

  it("moves uploaded files from pending/ into the application folder", async () => {
    await submitApplication(validInput());

    expect(mockMove).toHaveBeenCalledWith(
      "pending/uuid/rg_pai/rg.pdf",
      "applications/app-1/uuid/rg_pai/rg.pdf"
    );

    // O insert acontece antes do move (dentro da transação), com o caminho
    // pending/; depois do commit cada linha é atualizada para o caminho final.
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

  it("keeps the pending path when the file cannot be moved", async () => {
    mockMove.mockRejectedValue(new Error("ENOENT"));

    const result = await submitApplication(validInput());

    // A submissão continua bem-sucedida e nenhuma linha é atualizada para um
    // caminho que não existe.
    expect(result.success).toBe(true);
    expect(updated.filter((row) => row.table === documents)).toHaveLength(0);

    const rows = insertedFor(documents) as Array<{ storage_path: string }>;
    expect(rows.every((row) => row.storage_path.startsWith("pending/"))).toBe(
      true
    );
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

  it("rejects document paths outside pending/", async () => {
    const data = validInput();
    data.pai.documentos = ["applications/other-app/rg_pai/rg.pdf"];

    const result = await submitApplication(data);

    expect(result.success).toBe(false);
    expect(inserted).toHaveLength(0);
  });

  it.each([
    ["uses another required category", (data: ReturnType<typeof validInput>) => { data.pai.documentos = ["pending/uuid/rg_mae/rg.pdf"]; }],
    ["reuses one path in two required groups", (data: ReturnType<typeof validInput>) => { data.mae.documentos = [...data.pai.documentos]; }],
    ["uses a wrong student category", (data: ReturnType<typeof validInput>) => { data.alunos[0].certidao_nascimento = ["pending/uuid/certidao_nascimento_1/certidao.pdf"]; }],
  ])("rejects a submission that %s", async (_label, mutate) => {
    const data = validInput();
    mutate(data);
    await expect(submitApplication(data)).resolves.toMatchObject({ success: false });
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
