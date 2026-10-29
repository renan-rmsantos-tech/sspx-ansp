import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));

import { getMonthlyPayments } from "@/app/admin/_actions/donor-payment-actions";
import { queryFor, resetFakeDb } from "./helpers/fake-db";

const ledgerRow = (overrides: Record<string, unknown>) => ({
  id: "l1",
  pledge_id: "p1",
  competencia: "2026-10",
  due_date: "2026-10-10",
  expected_value: 150,
  receipt_path: null,
  receipt_name: null,
  receipt_uploaded_at: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  requireAdmin.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin", ativo: true });
});

describe("getMonthlyPayments", () => {
  // UT-070
  it("devolve as linhas da competência com o nome do benfeitor, ordenadas por vencimento", async () => {
    queryFor("donorPaymentLedger").findMany.mockResolvedValue([
      ledgerRow({ id: "l2", pledge_id: "p2", due_date: "2026-10-20", expected_value: "300.00" }),
      ledgerRow({
        id: "l1",
        pledge_id: "p1",
        due_date: "2026-10-05",
        receipt_path: "donors/p1/2026-10.pdf",
        receipt_name: "comprovante.pdf",
        receipt_uploaded_at: "2026-10-06T12:00:00Z",
      }),
    ]);
    queryFor("donorPledges").findMany.mockResolvedValue([
      { id: "p2", nome: "Bruno" },
      { id: "p1", nome: "Ana" },
    ]);

    await expect(getMonthlyPayments("2026-10")).resolves.toEqual({
      data: {
        competencia: "2026-10",
        rows: [
          {
            id: "l1",
            pledge_id: "p1",
            nome: "Ana",
            competencia: "2026-10",
            due_date: "2026-10-05",
            expected_value: 150,
            receipt_path: "donors/p1/2026-10.pdf",
            receipt_name: "comprovante.pdf",
            receipt_uploaded_at: "2026-10-06T12:00:00Z",
          },
          {
            id: "l2",
            pledge_id: "p2",
            nome: "Bruno",
            competencia: "2026-10",
            due_date: "2026-10-20",
            expected_value: 300,
            receipt_path: null,
            receipt_name: null,
            receipt_uploaded_at: null,
          },
        ],
      },
    });
    expect(requireAdmin).toHaveBeenCalled();
    expect(queryFor("donorPaymentLedger").findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything(), orderBy: expect.anything() })
    );
    expect(queryFor("donorPledges").findMany).toHaveBeenCalledWith(
      expect.objectContaining({ columns: { id: true, nome: true }, where: expect.anything() })
    );
  });

  // UT-071
  it("rejeita mês inválido sem consultar o banco", async () => {
    for (const month of ["2026-13", "2026-00", "26-10", "2026/10", "", "outubro"]) {
      await expect(getMonthlyPayments(month)).resolves.toEqual({ data: null, error: "Mês inválido." });
    }
    expect(queryFor("donorPaymentLedger").findMany).not.toHaveBeenCalled();
    expect(queryFor("donorPledges").findMany).not.toHaveBeenCalled();
  });

  // UT-072
  it("propaga a falta de autorização", async () => {
    requireAdmin.mockRejectedValue(new Error("Acesso restrito à administração."));
    await expect(getMonthlyPayments("2026-10")).rejects.toThrow("Acesso restrito");
    expect(queryFor("donorPaymentLedger").findMany).not.toHaveBeenCalled();
  });

  // IT-002
  it("omite linhas sem cadastro e converte o valor esperado em número", async () => {
    queryFor("donorPaymentLedger").findMany.mockResolvedValue([
      ledgerRow({ id: "l1", pledge_id: "p1", expected_value: "150.00" }),
      ledgerRow({ id: "l9", pledge_id: "p-apagado", due_date: "2026-10-01", expected_value: "99.00" }),
    ]);
    queryFor("donorPledges").findMany.mockResolvedValue([{ id: "p1", nome: "Ana" }]);

    const result = await getMonthlyPayments("2026-10");
    expect(result.data?.rows).toHaveLength(1);
    expect(result.data?.rows[0]).toMatchObject({ id: "l1", nome: "Ana", expected_value: 150 });
    expect(typeof result.data?.rows[0].expected_value).toBe("number");
  });

  it("devolve lista vazia sem consultar cadastros quando o livro está vazio", async () => {
    await expect(getMonthlyPayments("2026-10")).resolves.toEqual({
      data: { competencia: "2026-10", rows: [] },
    });
    expect(queryFor("donorPledges").findMany).not.toHaveBeenCalled();
  });

  it("captura falhas de leitura em { data: null, error }", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    queryFor("donorPaymentLedger").findMany.mockRejectedValue(new Error("db down"));

    await expect(getMonthlyPayments("2026-10")).resolves.toEqual({
      data: null,
      error: "Não foi possível carregar os pagamentos do mês.",
    });
    consoleError.mockRestore();
  });
});
