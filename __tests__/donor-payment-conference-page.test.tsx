import { beforeEach, describe, expect, it, vi } from "vitest";
import { saoPauloDate } from "@/lib/donor-recurrence";

const { requireAdmin, getDonorPaymentConference } = vi.hoisted(() => ({ requireAdmin: vi.fn(), getDonorPaymentConference: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/app/admin/_actions/donor-payment-conference-actions", () => ({ getDonorPaymentConference }));
vi.mock("@/app/admin/_actions/donor-receipt-actions", () => ({ issueDonorReceiptRecoveryLink: vi.fn() }));

import PagamentosPage from "@/app/admin/pagamentos/page";
import { PagamentosClient } from "@/app/admin/pagamentos/client";

const current = saoPauloDate(new Date()).slice(0, 7);
const empty = { coverage_start: null, series: [], rows: [], overdue: [], totals: { expected: "0.00", received: "0.00", outstanding: "0.00" } };

async function renderPage(mes?: string | string[]) {
  const element = await PagamentosPage({ searchParams: Promise.resolve({ mes }) });
  expect(element.type).toBe(PagamentosClient);
  return element.props as React.ComponentProps<typeof PagamentosClient>;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin", ativo: true });
  getDonorPaymentConference.mockResolvedValue(empty);
});

describe("PagamentosPage", () => {
  it("rejects Secretaria before reading payment data", async () => {
    requireAdmin.mockRejectedValue(new Error("Proibido"));
    await expect(PagamentosPage({})).rejects.toThrow("Proibido");
    expect(getDonorPaymentConference).not.toHaveBeenCalled();
  });

  it("loads the current month for Administrador without search params", async () => {
    const props = await renderPage(undefined);
    expect(props).toMatchObject({ initialMonth: current, currentMonth: current, initialData: empty, invalidMonth: false });
    expect(getDonorPaymentConference).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-(0[1-9]|1[0-2])$/));
    expect(await PagamentosPage({})).toBeTruthy();
  });

  it("uses a valid past month from the URL", async () => {
    const props = await renderPage("2026-03");
    expect(props).toMatchObject({ initialMonth: "2026-03", invalidMonth: false });
    expect(getDonorPaymentConference).toHaveBeenCalledWith("2026-03");
  });

  it("falls back to the current month with a warning for invalid or future months", async () => {
    expect(await renderPage("2026-13")).toMatchObject({ initialMonth: current, invalidMonth: true });
    expect(await renderPage("2999-01")).toMatchObject({ initialMonth: current, invalidMonth: true });
    expect(await renderPage("")).toMatchObject({ initialMonth: current, invalidMonth: false });
    expect(getDonorPaymentConference).not.toHaveBeenCalledWith("2026-13");
    expect(getDonorPaymentConference).not.toHaveBeenCalledWith("2999-01");
  });

  it("uses the first value of a repeated parameter", async () => {
    expect(await renderPage(["2026-02", "2026-04"])).toMatchObject({ initialMonth: "2026-02" });
  });

  it("passes conference failures to the client instead of crashing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getDonorPaymentConference.mockRejectedValue(new Error("Mês excede o limite de conferência."));
    expect(await renderPage("2026-03")).toMatchObject({ initialData: null, error: "Mês excede o limite de conferência." });
    consoleError.mockRestore();
  });
});
