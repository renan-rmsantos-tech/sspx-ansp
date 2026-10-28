import { beforeEach, describe, expect, it, vi } from "vitest";
import { donorMonthlyInstructionSends } from "@/lib/db/schema";
import { queryFor, resetFakeDb, setReturning, updated } from "./helpers/fake-db";

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { requireAdmin, sendManual } = vi.hoisted(() => ({
  requireAdmin: vi.fn(), sendManual: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/lib/email/send-donor-monthly-instructions", () => ({
  sendManualDonorMonthlyInstructions: sendManual,
}));

import { resolveUncertainDonorMonthlyInstructionsAction, sendManualDonorMonthlyInstructionsAction } from "@/app/admin/_actions/donor-monthly-instructions-actions";

const pledgeId = "b8fae3ab-fd64-4fb3-bacc-a9c12408d209";

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin" });
  queryFor("donorPledges").findFirst.mockResolvedValue({ id: pledgeId });
  queryFor("donorMonthlyInstructionSends").findFirst.mockResolvedValue({
    id: "95d156a4-5044-4ae2-b1c9-73bf8ae6e99f",
    generation: 1, receipt_competencia: "2026-10", status: "sent",
    sent_at: "2026-10-27T12:00:00Z", error_code: null,
  });
  sendManual.mockResolvedValue({ status: "sent", sent_at: "2026-10-27T12:00:00Z" });
});

describe("manual monthly instructions action", () => {
  it("requires administrator access before validating or sending", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("forbidden"));
    await expect(sendManualDonorMonthlyInstructionsAction({ pledgeId })).rejects.toThrow("forbidden");
    expect(sendManual).not.toHaveBeenCalled();
  });

  it("passes only a valid selected competence and deliberate resend flag", async () => {
    expect(await sendManualDonorMonthlyInstructionsAction({
      pledgeId, competence: "2026-10", explicitResend: true,
    })).toMatchObject({ status: "sent" });
    expect(sendManual).toHaveBeenCalledWith(pledgeId, {
      competence: "2026-10", explicitResend: true,
    });
    expect(await sendManualDonorMonthlyInstructionsAction({ pledgeId, competence: "2026-13" }))
      .toMatchObject({ status: "unavailable" });
    expect(sendManual).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-monthly or missing pledge before calling the sender", async () => {
    queryFor("donorPledges").findFirst.mockResolvedValueOnce(undefined);
    expect(await sendManualDonorMonthlyInstructionsAction({ pledgeId, competence: "2026-10" }))
      .toEqual({ status: "unavailable", message: "Contribuição mensal não encontrada." });
    expect(sendManual).not.toHaveBeenCalled();
  });

  it("returns a safe category when persistence fails", async () => {
    sendManual.mockRejectedValueOnce(new Error("private database detail"));
    expect(await sendManualDonorMonthlyInstructionsAction({ pledgeId }))
      .toEqual({ status: "failed", error_code: "database" });
  });
});

describe("uncertain instructions resolution", () => {
  it("denies unauthenticated and Secretaria callers before reads", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("Não autorizado"));
    await expect(resolveUncertainDonorMonthlyInstructionsAction({ pledgeId, resolution: "failed" }))
      .rejects.toThrow("Não autorizado");
    expect(queryFor("donorPledges").findFirst).not.toHaveBeenCalled();
    requireAdmin.mockRejectedValueOnce(new Error("permissão"));
    await expect(resolveUncertainDonorMonthlyInstructionsAction({ pledgeId, resolution: "accepted" }))
      .rejects.toThrow("permissão");
  });

  it("rejects malformed resolution and unrelated pledge", async () => {
    expect(await resolveUncertainDonorMonthlyInstructionsAction({ pledgeId: "bad", resolution: "failed" }))
      .toMatchObject({ success: false });
    queryFor("donorPledges").findFirst.mockResolvedValueOnce(undefined);
    expect(await resolveUncertainDonorMonthlyInstructionsAction({ pledgeId, resolution: "failed" }))
      .toMatchObject({ success: false });
    expect(updated).toHaveLength(0);
  });

  it("marks a reviewed uncertain outcome accepted without claiming inbox delivery", async () => {
    queryFor("donorMonthlyInstructionSends").findFirst
      .mockResolvedValueOnce({ id: "95d156a4-5044-4ae2-b1c9-73bf8ae6e99f", status: "uncertain" })
      .mockResolvedValueOnce({ generation: 1, receipt_competencia: "2026-10", status: "sent", sent_at: "2026-10-27T12:00:00Z", error_code: null });
    setReturning(donorMonthlyInstructionSends, [{ id: "95d156a4-5044-4ae2-b1c9-73bf8ae6e99f" }]);
    expect(await resolveUncertainDonorMonthlyInstructionsAction({ pledgeId, resolution: "accepted" }))
      .toMatchObject({ success: true, latest: { status: "sent" } });
    expect(updated.at(-1)?.values).toMatchObject({ status: "sent", error_code: null });
  });

  it("marks uncertainty as a definite failure for a deliberate retry", async () => {
    queryFor("donorMonthlyInstructionSends").findFirst
      .mockResolvedValueOnce({ id: "95d156a4-5044-4ae2-b1c9-73bf8ae6e99f", status: "uncertain" })
      .mockResolvedValueOnce({ generation: 1, receipt_competencia: "2026-10", status: "failed", sent_at: null, error_code: "unknown" });
    setReturning(donorMonthlyInstructionSends, [{ id: "95d156a4-5044-4ae2-b1c9-73bf8ae6e99f" }]);
    expect(await resolveUncertainDonorMonthlyInstructionsAction({ pledgeId, resolution: "failed" }))
      .toMatchObject({ success: true, latest: { status: "failed" } });
    expect(updated.at(-1)?.values).toMatchObject({ status: "failed", error_code: "unknown", sent_at: null });
  });

  it("refuses a resolution when the attempt changed concurrently", async () => {
    expect(await resolveUncertainDonorMonthlyInstructionsAction({ pledgeId, resolution: "failed" }))
      .toMatchObject({ success: false, error: "O estado do envio mudou. Atualize a lista." });
  });
});
