import { beforeEach, describe, expect, it, vi } from "vitest";
const { requireAdmin, getDonorPaymentConference } = vi.hoisted(() => ({ requireAdmin: vi.fn(), getDonorPaymentConference: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/app/admin/_actions/donor-payment-conference-actions", () => ({ getDonorPaymentConference }));
vi.mock("@/app/admin/conferencia-pagamentos/conference-client", () => ({ ConferenceClient: () => null }));
import ConferencePage from "@/app/admin/conferencia-pagamentos/page";
beforeEach(() => { vi.clearAllMocks(); });
describe("conference route", () => {
 it("rejects Secretaria before reading payment data", async () => { requireAdmin.mockRejectedValue(new Error("Proibido")); await expect(ConferencePage()).rejects.toThrow("Proibido"); expect(getDonorPaymentConference).not.toHaveBeenCalled(); });
 it("loads the current month for Administrador", async () => { requireAdmin.mockResolvedValue({ role: "admin" }); getDonorPaymentConference.mockResolvedValue({ rows: [], overdue: [], totals: { expected: "0.00", received: "0.00", outstanding: "0.00" } }); const page = await ConferencePage(); expect(page).toBeTruthy(); expect(getDonorPaymentConference).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-(0[1-9]|1[0-2])$/)); });
});
