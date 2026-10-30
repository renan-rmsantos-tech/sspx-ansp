// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));

import { donorPaymentLedger } from "@/lib/db/schema";
import {
  dueSnapshotDecision,
  firstMonthlyOccurrence,
  hasMonthlyReceipt,
  materializeCurrentAndNextMonthlyPayments,
  materializeMonthlyPaymentsForMonth,
  monthlyReceiptState,
  nextMonth,
} from "@/lib/donor-payment-ledger";
import { occurrenceForMonth } from "@/lib/donor-recurrence";
import { inserted, queryFor, resetFakeDb, setReturning } from "./helpers/fake-db";

const pledge = {
  id: "f496c86e-ff54-4e43-90ab-c3f781d31db1",
  created_at: "2026-10-26T12:00:00Z",
  frequencia: "mensal" as const,
  duracao: "um_ano" as const,
  dia_vencimento: 5,
  valor: 80,
};

beforeEach(() => {
  resetFakeDb();
  queryFor("donorLedgerSettings").findFirst.mockResolvedValue({ launch_competencia: "2026-10" });
});

describe("monthly payment materialization", () => {
  it("starts a one-year plan next month and never creates a thirteenth occurrence", () => {
    expect(firstMonthlyOccurrence(pledge)).toMatchObject({
      competence: "2026-11", dueDate: "2026-11-05", index: 0,
    });
    expect(occurrenceForMonth(pledge, "2027-10")?.index).toBe(11);
    expect(occurrenceForMonth(pledge, "2027-11")).toBeNull();
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("materializes the first adjusted occurrence on registration in short February", () => {
    expect(firstMonthlyOccurrence({ ...pledge, created_at: "2027-02-27T12:00:00Z", dia_vencimento: 30 }))
      .toMatchObject({ competence: "2027-02", dueDate: "2027-02-28", index: 0 });
    expect(firstMonthlyOccurrence({ ...pledge, created_at: "2026-10-31T12:00:00Z", dia_vencimento: 30 }))
      .toMatchObject({ competence: "2026-11", dueDate: "2026-11-30", index: 0 });
  });

  it("materializes an active monthly pledge without opt-in, preserving the first value on retry", async () => {
    queryFor("donorPledges").findMany.mockResolvedValue([
      { ...pledge, duracao: "indeterminado", lembrete_canal: null },
      { ...pledge, id: "one-time", frequencia: "unica", dia_vencimento: null },
      { ...pledge, id: "expired", created_at: "2024-01-01T12:00:00Z" },
    ]);
    setReturning(donorPaymentLedger, [{ id: "row" }]);

    expect(await materializeMonthlyPaymentsForMonth("2026-11")).toBe(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      table: donorPaymentLedger,
      values: [{ pledge_id: pledge.id, competencia: "2026-11", due_date: "2026-11-05", expected_value: 80 }],
    });
    expect(await materializeMonthlyPaymentsForMonth("2026-09")).toBe(0);
    expect(inserted).toHaveLength(1);
  });

  it("materializes current and next local months, but only eligible plans", async () => {
    queryFor("donorPledges").findMany.mockResolvedValue([{ ...pledge, duracao: "indeterminado" }]);
    await materializeCurrentAndNextMonthlyPayments(new Date("2026-10-31T02:30:00Z"));
    expect(inserted).toHaveLength(1);
    expect(inserted[0].values).toMatchObject([{ competencia: "2026-11" }]);
  });

  it("rejects invalid months and a missing coverage marker", async () => {
    expect(() => nextMonth("2026-13")).toThrow(RangeError);
    await expect(materializeMonthlyPaymentsForMonth("invalid")).rejects.toThrow(RangeError);
    queryFor("donorLedgerSettings").findFirst.mockResolvedValue(undefined);
    await expect(materializeMonthlyPaymentsForMonth("2026-11")).rejects.toThrow("marker");
  });
});

describe("future due-day reconciliation", () => {
  const snapshot = {
    competencia: "2026-11", due_date: "2026-11-05",
    receipt_path: null, receipt_name: null, receipt_uploaded_at: null,
  };
  const edited = { ...pledge, dia_vencimento: 12 };

  it("derives required evidence from the occurrence without a bank-credit claim", () => {
    expect(monthlyReceiptState(snapshot)).toBe("Comprovante pendente");
    const uploaded = { ...snapshot, receipt_path: "private/proof.pdf", receipt_name: "proof.pdf",
      receipt_uploaded_at: "2026-10-27T12:00:00Z" };
    expect(hasMonthlyReceipt(uploaded)).toBe(true);
    expect(monthlyReceiptState(uploaded)).toBe("Comprovante enviado – aguardando conferência");
    expect(hasMonthlyReceipt({ ...snapshot, receipt_name: "partial" })).toBe(true);
  });

  it("updates only future open snapshots", () => {
    expect(dueSnapshotDecision(edited, snapshot, "2026-10-26"))
      .toEqual({ kind: "update", dueDate: "2026-11-12" });
    expect(dueSnapshotDecision(edited, snapshot, "2026-11-06"))
      .toEqual({ kind: "keep" });
    expect(dueSnapshotDecision(edited, snapshot, "2026-11-05"))
      .toEqual({ kind: "keep" });
    expect(dueSnapshotDecision(edited, { ...snapshot, receipt_path: "private/file" }, "2026-10-26"))
      .toEqual({ kind: "keep" });
    expect(dueSnapshotDecision(edited, { ...snapshot, receipt_uploaded_at: "2026-10-27T12:00:00Z" }, "2026-10-26"))
      .toEqual({ kind: "keep" });
  });

  it("removes an empty future row that is no longer eligible, without moving receipt evidence", () => {
    expect(dueSnapshotDecision(pledge,
      { ...snapshot, competencia: "2026-10", due_date: "2026-10-28" }, "2026-10-26"))
      .toEqual({ kind: "remove" });
    expect(dueSnapshotDecision(edited, { ...snapshot, receipt_name: "proof.pdf" }, "2026-10-26"))
      .toEqual({ kind: "keep" });
  });

  it("updates a future open April snapshot to the adjusted day 31, protecting evidence and past dates", () => {
    const april = { ...snapshot, competencia: "2028-04", due_date: "2028-04-05" };
    const dayThirtyOne = { ...pledge, duracao: "indeterminado" as const, dia_vencimento: 31 };
    expect(dueSnapshotDecision(dayThirtyOne, april, "2028-03-01"))
      .toEqual({ kind: "update", dueDate: "2028-04-30" });
    expect(dueSnapshotDecision(dayThirtyOne, { ...april, receipt_path: "private/file" }, "2028-03-01"))
      .toEqual({ kind: "keep" });
    expect(dueSnapshotDecision(dayThirtyOne, april, "2028-05-01"))
      .toEqual({ kind: "keep" });
  });
  it("protects bank-reviewed and confirmed snapshots even without receipt evidence", () => {
    expect(dueSnapshotDecision(edited, { ...snapshot, status: "nao_identificado" }, "2026-10-26"))
      .toEqual({ kind: "keep" });
    expect(dueSnapshotDecision(edited, { ...snapshot, status: "confirmado" }, "2026-10-26"))
      .toEqual({ kind: "keep" });
    expect(dueSnapshotDecision(edited, { ...snapshot, confirmed_by: "admin" }, "2026-10-26"))
      .toEqual({ kind: "keep" });
  });
});
