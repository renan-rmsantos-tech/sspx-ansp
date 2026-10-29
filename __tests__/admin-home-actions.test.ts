import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

const { requireStaff } = vi.hoisted(() => ({ requireStaff: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireStaff }));

import { getAdminHomeSummary } from "@/app/admin/_actions/admin-home-actions";
import { saoPauloDate } from "@/lib/donor-recurrence";
import { queryFor, resetFakeDb } from "./helpers/fake-db";

const competencia = saoPauloDate(new Date()).slice(0, 7);

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  requireStaff.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin", ativo: true });
});

describe("getAdminHomeSummary", () => {
  // IT-001
  it("agrega solicitações, benfeitores e o livro do mês corrente", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue({ nome: "2026" });
    queryFor("applications").findMany.mockResolvedValue([
      { status: "pendente" },
      { status: "pendente" },
      { status: "aprovada" },
      { status: "rejeitada" },
    ]);
    queryFor("donorPledges").findMany.mockResolvedValue([
      { frequencia: "mensal", valor: 150, welcome_email_sent_at: "2026-10-01T12:00:00Z" },
      { frequencia: "mensal", valor: 300, welcome_email_sent_at: "2026-10-02T12:00:00Z" },
      { frequencia: "unica", valor: 500, welcome_email_sent_at: null },
    ]);
    queryFor("donorPaymentLedger").findMany.mockResolvedValue([
      { expected_value: 150, receipt_path: "donors/a.pdf", receipt_name: "a.pdf", receipt_uploaded_at: "2026-10-05T12:00:00Z" },
      { expected_value: "300.00", receipt_path: null, receipt_name: null, receipt_uploaded_at: null },
    ]);

    await expect(getAdminHomeSummary()).resolves.toEqual({
      data: {
        schoolYear: { nome: "2026" },
        applications: { total: 4, pendente: 2, aprovada: 1, rejeitada: 1 },
        donors: { total: 3, mensal: 2, unica: 1, monthlyAmount: 450, pendingWelcome: 1 },
        payments: { competencia, expectedAmount: 450, count: 2, withReceipt: 1 },
      },
    });
    expect(requireStaff).toHaveBeenCalled();
    expect(queryFor("donorPaymentLedger").findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  it("devolve ano letivo nulo e zeros sem dados", async () => {
    await expect(getAdminHomeSummary()).resolves.toEqual({
      data: {
        schoolYear: null,
        applications: { total: 0, pendente: 0, aprovada: 0, rejeitada: 0 },
        donors: { total: 0, mensal: 0, unica: 0, monthlyAmount: 0, pendingWelcome: 0 },
        payments: { competencia, expectedAmount: 0, count: 0, withReceipt: 0 },
      },
    });
  });

  it("captura falhas de leitura em { data: null, error }", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    queryFor("applications").findMany.mockRejectedValue(new Error("db down"));

    await expect(getAdminHomeSummary()).resolves.toEqual({
      data: null,
      error: "Não foi possível carregar o resumo.",
    });
    consoleError.mockRestore();
  });

  it("propaga a falta de autorização", async () => {
    requireStaff.mockRejectedValue(new Error("Não autorizado. Faça login para continuar."));
    await expect(getAdminHomeSummary()).rejects.toThrow("Não autorizado");
    expect(queryFor("applications").findMany).not.toHaveBeenCalled();
  });
});
