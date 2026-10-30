import { beforeEach, describe, expect, it, vi } from "vitest";
const { requireAdmin, materialize } = vi.hoisted(() => ({ requireAdmin: vi.fn(), materialize: vi.fn().mockResolvedValue(0) }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("@/lib/donor-payment-ledger", () => ({ materializeMonthlyPaymentsForMonth: materialize }));
const { createTicket, size } = vi.hoisted(() => ({ createTicket: vi.fn(() => "ticket"), size: vi.fn(async () => 42) }));
vi.mock("@/lib/storage/tickets", () => ({ createTicket }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ size }), guessMimeType: () => "application/pdf" }));
import { queryFor, resetFakeDb, updated } from "./helpers/fake-db";
import { confirmDonorPayment, getDonorPaymentConference, getDonorPaymentReceiptUrl, markDonorPaymentNotIdentified, resetDonorPayment } from "@/app/admin/_actions/donor-payment-conference-actions";
const id = "12345678-1234-4123-8123-123456789abc";
const row = (amount: number, status = "pendente", received = 0, due = "2026-08-01", receipt: string | null = null) => ({ id, pledge_id: id, competencia: "2026-08", due_date: due, expected_value: amount, received_value: received, status, receipt_path: receipt });
beforeEach(() => { vi.clearAllMocks(); resetFakeDb(); requireAdmin.mockResolvedValue({ id, role: "admin" }); });
describe("bank conference", () => {
 it("marks equal credits confirmed and unequal credits divergent with administrator metadata", async () => {
  queryFor("donorPaymentLedger").findFirst.mockResolvedValue(row(100));
  expect((await confirmDonorPayment(id, "100.00", "2026-08-02")).status).toBe("confirmado");
  expect((await confirmDonorPayment(id, "80.00", "2026-08-02")).status).toBe("divergente");
  expect(updated[1].values).toMatchObject({ received_value: 80, confirmed_by: id, status: "divergente" });
 });
 it("rejects invalid amount, date, and month", async () => {
  for (const value of ["-1", "1.001", "0"]) await expect(confirmDonorPayment(id, value, "2026-08-02")).rejects.toThrow();
  await expect(confirmDonorPayment(id, "1", "2026-02-30")).rejects.toThrow();
  await expect(getDonorPaymentConference("2026-13")).rejects.toThrow();
  expect(updated).toHaveLength(0);
 });
 it("requires a note and resets all bank metadata", async () => {
  await expect(markDonorPaymentNotIdentified(id, " ")).rejects.toThrow();
  await markDonorPaymentNotIdentified(id, "Sem crédito correspondente");
  expect(updated[0].values).toMatchObject({ status: "nao_identificado", received_value: 0, confirmed_by: id });
  await resetDonorPayment(id);
  expect(updated[1].values).toMatchObject({ status: "pendente", credit_date: null, confirmed_by: null, confirmed_at: null });
 });
 it("sums positive per-row balances and keeps missing receipts separate from credits", async () => {
  queryFor("donorPaymentLedger").findMany.mockResolvedValueOnce([row(100,"divergente",80), row(100,"divergente",120)]).mockResolvedValueOnce([row(100,"divergente",120)]);
  queryFor("donorPledges").findMany.mockResolvedValue([{ id, frequencia: "mensal" }]);
  const result = await getDonorPaymentConference("2026-08", new Date("2026-10-29T12:00:00Z"));
  expect(result.totals).toEqual({ expected: "200.00", received: "200.00", outstanding: "20.00" });
  expect(result.overdue[0].missing_monthly_receipt).toBe(true);
  expect(result.overdue[0].outstanding).toBe("0.00");
 });
 it("denies every direct action before a read or write", async () => {
  requireAdmin.mockRejectedValue(new Error("Proibido"));
  for (const call of [() => getDonorPaymentConference("2026-08"), () => confirmDonorPayment(id,"1","2026-08-02"), () => markDonorPaymentNotIdentified(id,"nota"), () => resetDonorPayment(id), () => getDonorPaymentReceiptUrl(id)]) await expect(call()).rejects.toThrow("Proibido");
  expect(updated).toHaveLength(0);
 });
 it("keeps fully credited missing evidence separate from balances", async () => {
  queryFor("donorPaymentLedger").findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
   row(100, "confirmado", 100, "2026-08-01"),
  ]);
  queryFor("donorPledges").findMany.mockResolvedValue([{ id, frequencia: "mensal" }]);
  const result = await getDonorPaymentConference("2026-08", new Date("2026-10-29T12:00:00Z"));
  expect(result.overdue[0]).toMatchObject({ outstanding: "0.00", missing_monthly_receipt: true });
  expect(result.overdue[0]).not.toHaveProperty("receipt_path");
  expect(result.overdue).toHaveLength(1);
 });
 it("issues a private ticket only after admin row and pledge lookup", async () => {
  queryFor("donorPaymentLedger").findFirst.mockResolvedValue({ ...row(100), receipt_path: `donors/${id}/payments/2026-08/file.pdf` });
  queryFor("donorPledges").findFirst.mockResolvedValue({ id, frequencia: "mensal" });
  expect(await getDonorPaymentReceiptUrl(id)).toEqual({ url: "/api/documents?ticket=ticket", type: "application/pdf" });
  expect(createTicket).toHaveBeenCalledWith(`donors/${id}/payments/2026-08/file.pdf`, "download", 300);
  queryFor("donorPaymentLedger").findFirst.mockResolvedValue({ ...row(100), receipt_path: "other/private.pdf" });
  expect(await getDonorPaymentReceiptUrl(id)).toEqual({ error: "Comprovante não encontrado." });
 });
 it("labels a one-time row created before monthly coverage", async () => {
  queryFor("donorPaymentLedger").findMany.mockResolvedValueOnce([row(100)]).mockResolvedValueOnce([]);
  queryFor("donorPledges").findMany.mockResolvedValue([{ id, nome: "Maria", frequencia: "unica", created_at: "2026-01-01T00:00:00Z", recibo_path: `donors/${id}/recibo/file.pdf` }]);
  queryFor("donorLedgerSettings").findFirst.mockResolvedValue({ launch_competencia: "2026-07" });
  const result = await getDonorPaymentConference("2026-08", new Date("2026-10-29T12:00:00Z"));
  expect(result.rows[0]).toMatchObject({ donor_name: "Maria", frequency: "unica", has_receipt: true, legacy_one_time: true });
  expect(result.coverage_start).toBe("2026-07");
 });
 it("rejects oversized month results before aggregating", async () => {
  queryFor("donorPaymentLedger").findMany.mockResolvedValueOnce(Array.from({ length: 5001 }, () => row(1)));
  await expect(getDonorPaymentConference("2026-08", new Date("2026-10-29T12:00:00Z"))).rejects.toThrow("limite");
 });
 it("builds twelve months with exact divergent credits and independent receipt counts", async () => {
  queryFor("donorPaymentLedger").findMany.mockResolvedValueOnce([row(100.01, "divergente", 80.02, "2026-08-01")]).mockResolvedValueOnce([]);
  queryFor("donorPledges").findMany.mockResolvedValue([{ id, frequencia: "mensal" }]);
  const result = await getDonorPaymentConference("2026-08", new Date("2026-10-29T12:00:00Z"));
  expect(result.series).toHaveLength(12);
  expect(result.series[0]).toMatchObject({ month: "2025-09", expected: "0.00", received: "0.00" });
  expect(result.series[11]).toMatchObject({ month: "2026-08", expected: "100.01", received: "80.02", receipt_pending: 1, receipt_sent: 0 });
  expect(result.series[11]).not.toHaveProperty("donor_name");
 });
 it("clips the monthly window at ledger launch", async () => {
  queryFor("donorLedgerSettings").findFirst.mockResolvedValue({ launch_competencia: "2026-01" });
  const result = await getDonorPaymentConference("2026-12", new Date("2026-12-29T12:00:00Z"));
  expect(result.series.map(value => value.month)).toEqual(Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, "0")}`));
 });

});
