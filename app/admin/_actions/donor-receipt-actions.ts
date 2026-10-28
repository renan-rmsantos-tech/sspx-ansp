"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { donorPaymentLedger, donorPledges } from "@/lib/db/schema";
import { hasMonthlyReceipt } from "@/lib/donor-payment-ledger";
import { createDonorReceiptRecoveryLink, receiptExpiry } from "@/lib/donor-receipts/tickets";

const target = z.object({
  pledgeId: z.uuid(),
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

/** An explicit admin issue for one overdue, receipt-pending monthly occurrence. */
export async function issueDonorReceiptRecoveryLink(pledgeId: string, competencia: string) {
  await requireAdmin();
  const parsed = target.safeParse({ pledgeId, competencia });
  if (!parsed.success) return { status: "unavailable" as const };
  const pledge = await db.query.donorPledges.findFirst({
    columns: { id: true, frequencia: true },
    where: eq(donorPledges.id, parsed.data.pledgeId),
  });
  if (pledge?.frequencia !== "mensal") return { status: "unavailable" as const };
  const row = await db.query.donorPaymentLedger.findFirst({
    columns: {
      due_date: true, receipt_path: true, receipt_name: true, receipt_uploaded_at: true,
    },
    where: and(
      eq(donorPaymentLedger.pledge_id, parsed.data.pledgeId),
      eq(donorPaymentLedger.competencia, parsed.data.competencia)
    ),
  });
  if (!row || hasMonthlyReceipt(row)) return { status: "unavailable" as const };
  const now = new Date();
  if (receiptExpiry(row.due_date) >= Math.floor(now.getTime() / 1000)) {
    return { status: "not_expired" as const };
  }
  const host = process.env.APP_HOST?.trim();
  if (!host || /[/:?#@\s]/.test(host)) return { status: "configuration" as const };
  return {
    status: "issued" as const,
    link: createDonorReceiptRecoveryLink(
      `https://${host}`, parsed.data.pledgeId, parsed.data.competencia, now
    ),
  };
}
