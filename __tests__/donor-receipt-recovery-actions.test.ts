// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));

import { issueDonorReceiptRecoveryLink } from "@/app/admin/_actions/donor-receipt-actions";
import { verifyDonorReceiptTicket } from "@/lib/donor-receipts/tickets";
import { queryFor, resetFakeDb } from "./helpers/fake-db";

const pledgeId = "11111111-1111-4111-8111-111111111111";
const competence = "2026-01";

beforeEach(() => {
  resetFakeDb();
  requireAdmin.mockReset().mockResolvedValue({ id: "administrator" });
  process.env.SESSION_SECRET = "test-secret-at-least-thirty-two-characters-long";
  process.env.APP_HOST = "example.test";
  queryFor("donorPledges").findFirst.mockResolvedValue({ id: pledgeId, frequencia: "mensal" });
  queryFor("donorPaymentLedger").findFirst.mockResolvedValue({
    due_date: "2026-01-05", receipt_path: null, receipt_name: null, receipt_uploaded_at: null,
  });
});

describe("administrator receipt recovery", () => {
  it("requires authorization before reading a pledge or issuing a bearer link", async () => {
    requireAdmin.mockRejectedValue(new Error("Você não tem permissão"));
    await expect(issueDonorReceiptRecoveryLink(pledgeId, competence)).rejects.toThrow("permissão");
    expect(queryFor("donorPledges").findFirst).not.toHaveBeenCalled();
  });

  it("issues a fresh 14-day capability only for an overdue, pending monthly row", async () => {
    const before = Date.now();
    const result = await issueDonorReceiptRecoveryLink(pledgeId, competence);
    expect(result.status).toBe("issued");
    if (result.status !== "issued") throw new Error("Expected recovery link");
    const url = new URL(result.link);
    expect(url.host).toBe("example.test");
    const payload = verifyDonorReceiptTicket(url.searchParams.get("ticket"));
    expect(payload).toMatchObject({ pledge_id: pledgeId, competencia: competence, scope: "donor_receipt" });
    expect(payload!.exp).toBeGreaterThanOrEqual(Math.floor(before / 1000) + 14 * 86400);
    expect(payload!.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 14 * 86400);
    expect(url.searchParams.has("expiry")).toBe(false);
  });

  it("declines another target, a receipt already present, or an unexpired standard link", async () => {
    expect(await issueDonorReceiptRecoveryLink("bad-id", competence)).toEqual({ status: "unavailable" });
    queryFor("donorPledges").findFirst.mockResolvedValueOnce({ id: pledgeId, frequencia: "unica" });
    expect(await issueDonorReceiptRecoveryLink(pledgeId, competence)).toEqual({ status: "unavailable" });
    queryFor("donorPaymentLedger").findFirst.mockResolvedValueOnce(undefined);
    expect(await issueDonorReceiptRecoveryLink(pledgeId, competence)).toEqual({ status: "unavailable" });
    queryFor("donorPaymentLedger").findFirst.mockResolvedValueOnce({
      due_date: "2026-01-05", receipt_path: "private/file", receipt_name: "file",
      receipt_uploaded_at: "2026-01-07T12:00:00Z",
    });
    expect(await issueDonorReceiptRecoveryLink(pledgeId, competence)).toEqual({ status: "unavailable" });
    queryFor("donorPaymentLedger").findFirst.mockResolvedValueOnce({
      due_date: "2099-01-05", receipt_path: null, receipt_name: null, receipt_uploaded_at: null,
    });
    expect(await issueDonorReceiptRecoveryLink(pledgeId, competence)).toEqual({ status: "not_expired" });
  });
});
