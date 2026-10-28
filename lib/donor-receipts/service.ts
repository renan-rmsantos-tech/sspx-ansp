import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { getStorage, type StorageDriver } from "@/lib/storage";
import { verifyDonorReceiptTicket } from "./tickets";
import { checkReceiptThrottle, invalidReceiptBlockedFor } from "./throttle";
import { validateReceiptFile } from "./validation";

type Database = typeof defaultDb;
type ReceiptRow = {
  id: string;
  pledge_id: string;
  competencia: string;
  due_date: string;
  expected_value: string;
  first_name: string;
  receipt_path: string | null;
  has_receipt: boolean;
  bank_status: string | null;
};

export type ReceiptContext =
  | { state: "invalid" }
  | { state: "valid"; firstName: string; competencia: string; expectedValue: string; hasReceipt: boolean };

async function loadOccurrence(pledgeId: string, competencia: string, database: Database): Promise<ReceiptRow | null> {
  const rows = await database.execute(sql`
    SELECT l.id, l.pledge_id, l.competencia, l.due_date::text AS due_date,
           l.expected_value::text AS expected_value, p.nome AS first_name,
           l.receipt_path,
           (l.receipt_path IS NOT NULL OR l.receipt_name IS NOT NULL OR l.receipt_uploaded_at IS NOT NULL) AS has_receipt,
           to_jsonb(l)->>'status' AS bank_status
    FROM donor_payment_ledger l
    JOIN donor_pledges p ON p.id = l.pledge_id
    WHERE l.pledge_id = ${pledgeId}::uuid AND l.competencia = ${competencia}
      AND p.frequencia = 'mensal'
    LIMIT 1
  `);
  return (rows as unknown as ReceiptRow[])[0] ?? null;
}

async function readDonorReceiptContext(ticket: string | null, database: Database): Promise<ReceiptContext> {
  const payload = verifyDonorReceiptTicket(ticket);
  if (!payload) return { state: "invalid" };
  const row = await loadOccurrence(payload.pledge_id, payload.competencia, database);
  if (!row) return { state: "invalid" };
  return {
    state: "valid",
    firstName: row.first_name.trim().split(/\s+/)[0] || "Benfeitor",
    competencia: row.competencia,
    expectedValue: row.expected_value,
    hasReceipt: row.has_receipt,
  };
}

/** Task 17's page calls this for GETs; invalid probes share the POST IP budget. */
export async function getPublicDonorReceiptContext(
  ticket: string | null, sourceIp: string, database: Database = defaultDb
): Promise<ReceiptContext | { state: "rate_limited"; retryAfter: number }> {
  const blockedFor = invalidReceiptBlockedFor(sourceIp);
  if (blockedFor) return { state: "rate_limited", retryAfter: blockedFor };
  if (!verifyDonorReceiptTicket(ticket)) {
    const retryAfter = checkReceiptThrottle("invalid", sourceIp);
    return retryAfter ? { state: "rate_limited", retryAfter } : { state: "invalid" };
  }
  const context = await readDonorReceiptContext(ticket, database);
  if (context.state !== "invalid") return context;
  const retryAfter = checkReceiptThrottle("invalid", sourceIp);
  return retryAfter ? { state: "rate_limited", retryAfter } : context;
}

export type AttachReceiptResult =
  | { status: "saved" }
  | { status: "invalid" | "file" | "too_large" | "conflict" | "error" };

/** Every path is generated here. A CAS on the previous path serializes competing replacements. */
export async function attachDonorReceipt(
  ticket: string | null,
  file: { body: Buffer; mime: string; name: string },
  database: Database = defaultDb,
  storage: StorageDriver = getStorage()
): Promise<AttachReceiptResult> {
  const payload = verifyDonorReceiptTicket(ticket);
  if (!payload) return { status: "invalid" };
  const validated = validateReceiptFile(file.body, file.mime, file.name);
  if (!validated.ok) return { status: validated.reason === "too_large" ? "too_large" : "file" };
  const initial = await loadOccurrence(payload.pledge_id, payload.competencia, database);
  if (!initial) return { status: "invalid" };

  const version = randomUUID();
  const pending = `pending/${version}/recibo_mensal/${validated.name}`;
  const final = `donors/${payload.pledge_id}/payments/${payload.competencia}/${version}/${validated.name}`;
  let moveAttempted = false;
  try {
    await storage.put(pending, file.body);
    moveAttempted = true;
    await storage.move(pending, final);

    for (let attempt = 0; attempt < 5; attempt++) {
      // Revalidate at the write boundary, including expiry and deletion since staging.
      if (!verifyDonorReceiptTicket(ticket)) return { status: "invalid" };
      const current = await loadOccurrence(payload.pledge_id, payload.competencia, database);
      if (!current) return { status: "invalid" };

      // Phase 3 adds these columns. Until then the same SQL touches only phase-2 fields.
      const bankReset = current.bank_status === null ? sql`` : sql`,
        status = CASE WHEN status = 'nao_identificado' THEN 'pendente' ELSE status END,
        credit_date = CASE WHEN status = 'nao_identificado' THEN NULL ELSE credit_date END,
        confirmed_by = CASE WHEN status = 'nao_identificado' THEN NULL ELSE confirmed_by END,
        confirmed_at = CASE WHEN status = 'nao_identificado' THEN NULL ELSE confirmed_at END`;
      const updated = await database.execute(sql`
        UPDATE donor_payment_ledger AS l
        SET receipt_path = ${final}, receipt_name = ${validated.name},
            receipt_uploaded_at = now(), updated_at = now() ${bankReset}
        WHERE l.id = ${current.id}::uuid
          AND l.receipt_path IS NOT DISTINCT FROM ${current.receipt_path}
          AND EXISTS (SELECT 1 FROM donor_pledges p WHERE p.id = l.pledge_id AND p.frequencia = 'mensal')
        RETURNING l.id
      `);
      if ((updated as unknown as { id: string }[]).length === 0) continue;

      // A failed cleanup leaves an orphan, never a missing active receipt.
      if (current.receipt_path) {
        try { await storage.remove(current.receipt_path); } catch { /* preserve committed metadata */ }
      }
      return { status: "saved" };
    }
    return { status: "conflict" };
  } catch {
    return { status: "error" };
  } finally {
    try { await storage.remove(pending); } catch { /* cleanup retry by pending-file job */ }
    if (moveAttempted) {
      // Never delete the file if this write committed. A read is safer than inferring from control flow.
      try {
        const current = await loadOccurrence(payload.pledge_id, payload.competencia, database);
        if (current?.receipt_path !== final) await storage.remove(final);
      } catch { /* stale orphan is safer than deleting active evidence */ }
    }
  }
}
