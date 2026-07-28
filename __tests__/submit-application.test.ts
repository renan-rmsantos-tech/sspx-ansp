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
} from "./helpers/fake-db";

function validInput() {
  return {
    escola: "Colégio São José",
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
    endereco: "Rua das Flores, 123",
    telefone: "(11) 99999-9999",
    comprovante_endereco: ["pending/uuid/comprovante/comp.pdf"],
    outros_filhos: [],
    alunos: [
      {
        nome: "Ana Silva",
        serie: "5º ano",
        mensalidade: 1200,
        documentos: ["pending/uuid/rg_aluno/rg.pdf"],
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

  queryFor("schoolYears").findFirst.mockResolvedValue({ id: "year-1" });
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

  it("moves uploaded files from pending/ into the application folder", async () => {
    await submitApplication(validInput());

    expect(mockMove).toHaveBeenCalledWith(
      "pending/uuid/rg_pai/rg.pdf",
      "applications/app-1/rg_pai/rg.pdf"
    );

    const rows = insertedFor(documents) as Array<{ storage_path: string }>;
    expect(
      rows.every((row) => row.storage_path.startsWith("applications/app-1/"))
    ).toBe(true);
  });

  it("records the real file size", async () => {
    await submitApplication(validInput());

    const rows = insertedFor(documents) as Array<{ tamanho_bytes: number }>;
    expect(rows.every((row) => row.tamanho_bytes === 2048)).toBe(true);
  });

  it("keeps the pending path when the file cannot be moved", async () => {
    mockMove.mockRejectedValue(new Error("ENOENT"));

    await submitApplication(validInput());

    const rows = insertedFor(documents) as Array<{ storage_path: string }>;
    expect(rows.every((row) => row.storage_path.startsWith("pending/"))).toBe(
      true
    );
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
