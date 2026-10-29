import { beforeEach, describe, expect, it, vi } from "vitest";
import { saoPauloDate } from "@/lib/donor-recurrence";

const { requireAdmin, getMonthlyPayments } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getMonthlyPayments: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/app/admin/_actions/donor-payment-actions", () => ({ getMonthlyPayments }));
vi.mock("@/app/admin/_actions/admin-actions", () => ({ getDocumentUrl: vi.fn() }));

import PagamentosPage from "@/app/admin/pagamentos/page";
import { PagamentosClient } from "@/app/admin/pagamentos/client";

const current = saoPauloDate(new Date()).slice(0, 7);

async function renderPage(mes?: string | string[]) {
  const element = await PagamentosPage({ searchParams: Promise.resolve({ mes }) });
  expect(element.type).toBe(PagamentosClient);
  return element.props as React.ComponentProps<typeof PagamentosClient>;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin", ativo: true });
  getMonthlyPayments.mockResolvedValue({ data: { competencia: "x", rows: [] } });
});

describe("PagamentosPage", () => {
  it("usa o mês da URL quando válido", async () => {
    const props = await renderPage("2026-03");
    expect(props).toMatchObject({ competencia: "2026-03", rows: [], invalidMonth: false, error: undefined });
    expect(getMonthlyPayments).toHaveBeenCalledWith("2026-03");
  });

  it("usa o mês corrente sem aviso quando ?mes= está ausente ou vazio", async () => {
    expect(await renderPage(undefined)).toMatchObject({ competencia: current, invalidMonth: false });
    expect(await renderPage("")).toMatchObject({ competencia: current, invalidMonth: false });
  });

  it("usa o mês corrente com aviso quando ?mes= é inválido", async () => {
    const props = await renderPage("2026-13");
    expect(props).toMatchObject({ competencia: current, invalidMonth: true });
    expect(getMonthlyPayments).toHaveBeenCalledWith(current);
  });

  it("repassa o erro da action e as linhas carregadas", async () => {
    getMonthlyPayments.mockResolvedValue({ data: null, error: "Não foi possível carregar os pagamentos do mês." });
    expect(await renderPage(["2026-10", "2026-11"])).toMatchObject({
      competencia: "2026-10",
      rows: [],
      error: "Não foi possível carregar os pagamentos do mês.",
    });
  });

  it("exige administração antes de ler o livro", async () => {
    requireAdmin.mockRejectedValue(new Error("Acesso restrito à administração."));
    await expect(PagamentosPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Acesso restrito");
    expect(getMonthlyPayments).not.toHaveBeenCalled();
  });
});
