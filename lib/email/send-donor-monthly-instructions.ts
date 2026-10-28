import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import {
  documentHeader, donorMonthlyInstructionSends, donorPaymentLedger, donorPledges,
} from "@/lib/db/schema";
import { firstMonthlyOccurrence, hasMonthlyReceipt } from "@/lib/donor-payment-ledger";
import { createDonorReceiptLink, createDonorReceiptRecoveryLink, receiptExpiry } from "@/lib/donor-receipts/tickets";
import { occurrenceForMonth, saoPauloDate } from "@/lib/donor-recurrence";
import { resolveDocumentHeader } from "@/lib/documents/document-header";
import { SEAL_DATA_URI } from "@/lib/pdf/seal-image";
import { DOCUMENT_HEADER_SEAL_CID } from "./donor-welcome-template";
import { getDonorMonthlyInstructionsTemplate } from "./donor-monthly-instructions-template-store";
import {
  monthlyInstructionsProviderKey, renderDonorMonthlyInstructions,
  renderDonorMonthlyInstructionsPreview, type DonorMonthlyInstructionsTemplate,
} from "./donor-monthly-instructions-template";
import { classifyReminderProviderOutcome } from "./donor-reminder-policy";

const LEASE_MS = 60_000;
type SendRow = typeof donorMonthlyInstructionSends.$inferSelect;
type ErrorCode = NonNullable<SendRow["error_code"]>;

export type MonthlyInstructionsResult =
  | { status: "sent" | "already_sent"; sent_at: string }
  | { status: "in_progress"; expires_at: string | null }
  | { status: "failed" | "uncertain"; error_code: ErrorCode }
  | { status: "unavailable"; message: "Sem ocorrência ativa com comprovante pendente." };

function unavailable(): MonthlyInstructionsResult {
  return { status: "unavailable", message: "Sem ocorrência ativa com comprovante pendente." };
}

function settings() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.RESEND_FROM?.trim();
  const host = process.env.APP_HOST?.trim();
  if (!apiKey || !sender || !host || /[/:?#@\s]/.test(host)) throw new Error("Incomplete instructions configuration");
  return { apiKey, sender, origin: `https://${host}` };
}

function known(row: SendRow | undefined): MonthlyInstructionsResult {
  if (row?.status === "sent" && row.sent_at) return { status: "already_sent", sent_at: row.sent_at };
  if (row?.status === "uncertain") return { status: "uncertain", error_code: row.error_code ?? "unknown" };
  if (row?.status === "sending") return { status: "in_progress", expires_at: row.reservation_expires_at };
  return { status: "failed", error_code: row?.error_code ?? "database" };
}

async function preCallFailure(database: typeof db, id: string, code: ErrorCode) {
  await database.update(donorMonthlyInstructionSends).set({
    status: "failed", error_code: code,
    reservation_token: null, reservation_expires_at: null,
    updated_at: new Date().toISOString(),
  }).where(and(
    eq(donorMonthlyInstructionSends.id, id),
    or(eq(donorMonthlyInstructionSends.status, "pending"),
      eq(donorMonthlyInstructionSends.status, "failed"),
      and(eq(donorMonthlyInstructionSends.status, "sending"),
        lte(donorMonthlyInstructionSends.reservation_expires_at, new Date().toISOString()),
        isNull(donorMonthlyInstructionSends.provider_call_started_at)))
  ));
  return { status: "failed", error_code: code } as const;
}

async function payload(row: SendRow, database: typeof db, now: Date) {
  if (row.frozen_recipient !== null) {
    return {
      recipient: row.frozen_recipient,
      sender: row.frozen_sender!, subject: row.frozen_subject!,
      text: row.frozen_text!, html: row.frozen_html!,
      includeSeal: row.frozen_include_seal!,
    };
  }
  const pledge = await database.query.donorPledges.findFirst({
    where: eq(donorPledges.id, row.pledge_id),
  });
  if (!pledge || pledge.frequencia !== "mensal" || !pledge.dia_vencimento || !pledge.duracao || !row.receipt_competencia) {
    throw new Error("Invalid monthly instructions context");
  }
  const ledger = await database.query.donorPaymentLedger.findFirst({
    where: and(eq(donorPaymentLedger.pledge_id, pledge.id),
      eq(donorPaymentLedger.competencia, row.receipt_competencia)),
  });
  if (!ledger || hasMonthlyReceipt(ledger)) throw new Error("No receipt-pending occurrence");
  const first = firstMonthlyOccurrence(pledge);
  if (!first) throw new Error("Invalid first due date");
  const config = settings();
  const link = receiptExpiry(ledger.due_date) < Math.floor(now.getTime() / 1000)
    ? createDonorReceiptRecoveryLink(config.origin, pledge.id, ledger.competencia, now)
    : createDonorReceiptLink(config.origin, pledge.id, ledger.competencia, ledger.due_date);
  const header = resolveDocumentHeader(await database.query.documentHeader.findFirst({
    orderBy: desc(documentHeader.updated_at),
  }));
  const rendered = renderDonorMonthlyInstructions({
    template: await getDonorMonthlyInstructionsTemplate(database),
    nome: pledge.nome, valor: ledger.expected_value,
    dia_vencimento: pledge.dia_vencimento,
    data_primeiro_vencimento: first.dueDate,
    duracao: pledge.duracao,
    receipt_competencia: ledger.competencia,
    link_comprovante: link, header,
  });
  return {
    recipient: pledge.email, sender: config.sender,
    subject: rendered.assunto, text: rendered.text, html: rendered.html,
    includeSeal: header.mostrar_selo,
  };
}

/** Only a persisted generation is sent; registration creates generation one before commit. */
export async function sendDonorMonthlyInstructions(
  pledgeId: string,
  options: { database?: typeof db; generation?: number; retryFailed?: boolean; now?: Date } = {}
): Promise<MonthlyInstructionsResult> {
  const database = options.database ?? db;
  const generation = options.generation ?? 1;
  const row = await database.query.donorMonthlyInstructionSends.findFirst({
    where: and(eq(donorMonthlyInstructionSends.pledge_id, pledgeId),
      eq(donorMonthlyInstructionSends.generation, generation)),
  });
  if (!row) return unavailable();
  if (row.status === "sent" || row.status === "uncertain") return known(row);
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  if (row.status === "sending" && row.reservation_expires_at && row.reservation_expires_at > nowIso) return known(row);
  if (row.status === "sending" && row.provider_call_started_at) {
    await database.update(donorMonthlyInstructionSends).set({
      status: "uncertain", error_code: "unknown", reservation_token: null,
      reservation_expires_at: null, updated_at: nowIso,
    }).where(and(eq(donorMonthlyInstructionSends.id, row.id),
      eq(donorMonthlyInstructionSends.status, "sending"),
      lte(donorMonthlyInstructionSends.reservation_expires_at, nowIso),
      isNotNull(donorMonthlyInstructionSends.provider_call_started_at)));
    return known(await database.query.donorMonthlyInstructionSends.findFirst({ where: eq(donorMonthlyInstructionSends.id, row.id) }));
  }
  if (row.status === "failed" && !options.retryFailed) return known(row);

  let config: ReturnType<typeof settings>;
  try { config = settings(); } catch { return preCallFailure(database, row.id, "configuration"); }
  let frozen: Awaited<ReturnType<typeof payload>>;
  try { frozen = await payload(row, database, now); }
  catch { return preCallFailure(database, row.id, "unknown"); }

  const token = randomUUID();
  const claimed = await database.update(donorMonthlyInstructionSends).set({
    status: "sending", error_code: null,
    reservation_token: token,
    reservation_expires_at: new Date(now.getTime() + LEASE_MS).toISOString(),
    provider_call_started_at: null,
    attempt_count: sql`${donorMonthlyInstructionSends.attempt_count} + 1`,
    frozen_recipient: sql`coalesce(${donorMonthlyInstructionSends.frozen_recipient}, ${frozen.recipient})`,
    frozen_sender: sql`coalesce(${donorMonthlyInstructionSends.frozen_sender}, ${frozen.sender})`,
    frozen_subject: sql`coalesce(${donorMonthlyInstructionSends.frozen_subject}, ${frozen.subject})`,
    frozen_text: sql`coalesce(${donorMonthlyInstructionSends.frozen_text}, ${frozen.text})`,
    frozen_html: sql`coalesce(${donorMonthlyInstructionSends.frozen_html}, ${frozen.html})`,
    frozen_include_seal: sql`coalesce(${donorMonthlyInstructionSends.frozen_include_seal}, ${frozen.includeSeal})`,
    updated_at: nowIso,
  }).where(and(eq(donorMonthlyInstructionSends.id, row.id), or(
    eq(donorMonthlyInstructionSends.status, "pending"),
    options.retryFailed ? eq(donorMonthlyInstructionSends.status, "failed") : sql`false`,
    and(eq(donorMonthlyInstructionSends.status, "sending"),
      lte(donorMonthlyInstructionSends.reservation_expires_at, nowIso),
      isNull(donorMonthlyInstructionSends.provider_call_started_at))
  ))).returning();
  if (!claimed.length) return known(await database.query.donorMonthlyInstructionSends.findFirst({ where: eq(donorMonthlyInstructionSends.id, row.id) }));
  const reserved = claimed[0];

  // The receipt can arrive after rendering. Check the target again before the provider call.
  const startedAt = new Date().toISOString();
  const started = await database.update(donorMonthlyInstructionSends).set({
    provider_call_started_at: startedAt, updated_at: startedAt,
  }).where(and(
    eq(donorMonthlyInstructionSends.id, reserved.id),
    eq(donorMonthlyInstructionSends.status, "sending"),
    eq(donorMonthlyInstructionSends.reservation_token, token),
    sql`exists (select 1 from donor_payment_ledger l
      where l.pledge_id = ${pledgeId}::uuid
        and l.competencia = ${reserved.receipt_competencia}
        and l.receipt_path is null and l.receipt_name is null and l.receipt_uploaded_at is null)`
  )).returning({ id: donorMonthlyInstructionSends.id });
  if (!started.length) {
    await database.update(donorMonthlyInstructionSends).set({
      status: "failed", error_code: "unknown", reservation_token: null,
      reservation_expires_at: null, updated_at: new Date().toISOString(),
    }).where(and(eq(donorMonthlyInstructionSends.id, reserved.id),
      eq(donorMonthlyInstructionSends.reservation_token, token),
      isNull(donorMonthlyInstructionSends.provider_call_started_at)));
    return unavailable();
  }

  let outcome: ReturnType<typeof classifyReminderProviderOutcome>;
  try {
    const response = await new Resend(config.apiKey).emails.send({
      from: reserved.frozen_sender!, to: [reserved.frozen_recipient!],
      subject: reserved.frozen_subject!, text: reserved.frozen_text!, html: reserved.frozen_html!,
      attachments: reserved.frozen_include_seal ? [{
        filename: "selo-ansp.png",
        content: Buffer.from(SEAL_DATA_URI.slice(SEAL_DATA_URI.indexOf(",") + 1), "base64"),
        contentId: DOCUMENT_HEADER_SEAL_CID, contentType: "image/png",
      }] : undefined,
    }, { signal: AbortSignal.timeout(15_000), idempotencyKey: reserved.provider_idempotency_key });
    outcome = classifyReminderProviderOutcome({ type: "response", id: response.data?.id, error: response.error });
  } catch (error) {
    outcome = classifyReminderProviderOutcome({ type: "exception", name: error instanceof Error ? error.name : undefined });
  }
  const sentAt = new Date().toISOString();
  const recorded = await database.update(donorMonthlyInstructionSends).set({
    status: outcome.status,
    sent_at: outcome.status === "sent" ? sentAt : null,
    provider_message_id: outcome.status === "sent" ? outcome.messageId : null,
    error_code: outcome.status === "sent" ? null : outcome.code,
    reservation_token: null, reservation_expires_at: null, updated_at: sentAt,
  }).where(and(eq(donorMonthlyInstructionSends.id, reserved.id),
    eq(donorMonthlyInstructionSends.status, "sending"),
    eq(donorMonthlyInstructionSends.reservation_token, token))).returning({ id: donorMonthlyInstructionSends.id });
  if (!recorded.length) return { status: "uncertain", error_code: "database" };
  return outcome.status === "sent"
    ? { status: "sent", sent_at: sentAt }
    : { status: outcome.status, error_code: outcome.code };
}

/** Called only after administrator authorization; the UI and action are task 23. */
export async function sendManualDonorMonthlyInstructions(
  pledgeId: string,
  options: { competence?: string; explicitResend?: boolean; database?: typeof db; now?: Date } = {}
): Promise<MonthlyInstructionsResult> {
  const database = options.database ?? db;
  const now = options.now ?? new Date();
  const month = saoPauloDate(now).slice(0, 7);
  const selection = await database.transaction(async (tx) => {
    await tx.execute(sql`select id from donor_pledges where id = ${pledgeId}::uuid for update`);
    const pledge = await tx.query.donorPledges.findFirst({ where: eq(donorPledges.id, pledgeId) });
    if (!pledge || pledge.frequencia !== "mensal") return null;
    const latest = await tx.query.donorMonthlyInstructionSends.findFirst({
      where: eq(donorMonthlyInstructionSends.pledge_id, pledgeId),
      orderBy: desc(donorMonthlyInstructionSends.generation),
    });
    const requestedCompetence = options.competence ??
      (latest && latest.status !== "sent" ? latest.receipt_competencia : null);
    if (requestedCompetence) {
      if (!occurrenceForMonth(pledge, requestedCompetence)) return null;
      const pendingTarget = await tx.query.donorPaymentLedger.findFirst({
        where: and(
          eq(donorPaymentLedger.pledge_id, pledgeId),
          eq(donorPaymentLedger.competencia, requestedCompetence),
          isNull(donorPaymentLedger.receipt_path),
          isNull(donorPaymentLedger.receipt_name),
          isNull(donorPaymentLedger.receipt_uploaded_at)
        ),
      });
      if (!pendingTarget) return null;
    }
    if (latest?.status === "uncertain") {
      if (options.competence && options.competence !== latest.receipt_competencia) return null;
      return { generation: latest.generation, retryFailed: false };
    }
    if (latest?.status === "sending") {
      if (!options.competence || options.competence === latest.receipt_competencia) {
        return { generation: latest.generation, retryFailed: false };
      }
      if (!options.explicitResend || !latest.reservation_expires_at ||
          latest.reservation_expires_at > now.toISOString() || latest.provider_call_started_at) return null;
      const abandoned = await tx.update(donorMonthlyInstructionSends).set({
        status: "failed", error_code: "unknown", reservation_token: null,
        reservation_expires_at: null, updated_at: now.toISOString(),
      }).where(and(
        eq(donorMonthlyInstructionSends.id, latest.id),
        eq(donorMonthlyInstructionSends.status, "sending"),
        lte(donorMonthlyInstructionSends.reservation_expires_at, now.toISOString()),
        isNull(donorMonthlyInstructionSends.provider_call_started_at)
      )).returning({ id: donorMonthlyInstructionSends.id });
      if (!abandoned.length) return null;
    }
    if (latest?.status === "failed") {
      if (!options.explicitResend && (!options.competence || options.competence === latest.receipt_competencia)) {
        return { generation: latest.generation, retryFailed: true };
      }
      if (!options.explicitResend || !options.competence || options.competence === latest.receipt_competencia) return null;
    }
    if (latest?.status === "pending") {
      if (!options.explicitResend && (!options.competence || options.competence === latest.receipt_competencia)) {
        return { generation: latest.generation, retryFailed: false };
      }
      if (!options.explicitResend || !options.competence || options.competence === latest.receipt_competencia) return null;
    }
    if (latest && !options.explicitResend) return { generation: latest.generation, retryFailed: false };
    if (!latest && options.explicitResend) return null;
    const target = await tx.query.donorPaymentLedger.findFirst({
      where: and(eq(donorPaymentLedger.pledge_id, pledgeId),
        options.competence
          ? eq(donorPaymentLedger.competencia, options.competence)
          : gte(donorPaymentLedger.competencia, month),
        isNull(donorPaymentLedger.receipt_path),
        isNull(donorPaymentLedger.receipt_name),
        isNull(donorPaymentLedger.receipt_uploaded_at)),
      orderBy: asc(donorPaymentLedger.competencia),
    });
    if (!target || !occurrenceForMonth(pledge, target.competencia)) return null;
    const generation = (latest?.generation ?? 0) + 1;
    await tx.insert(donorMonthlyInstructionSends).values({
      pledge_id: pledgeId, generation, receipt_competencia: target.competencia,
      provider_idempotency_key: monthlyInstructionsProviderKey(pledgeId, generation),
    });
    return { generation, retryFailed: false };
  });
  return selection
    ? sendDonorMonthlyInstructions(pledgeId, { ...selection, database, now })
    : unavailable();
}

/** An explicit-address sample never reserves or writes a donor send attempt. */
export async function sendDonorMonthlyInstructionsTestEmail(
  recipient: string,
  template: DonorMonthlyInstructionsTemplate,
  database: typeof db = db
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.RESEND_FROM?.trim();
  if (!apiKey || !sender) return { status: "failed", code: "configuration" } as const;
  const header = resolveDocumentHeader(await database.query.documentHeader.findFirst({
    orderBy: desc(documentHeader.updated_at),
  }));
  const rendered = renderDonorMonthlyInstructionsPreview(template, header);
  try {
    const response = await new Resend(apiKey).emails.send({
      from: sender,
      to: [recipient],
      subject: `[TESTE] ${rendered.assunto}`,
      text: rendered.text,
      html: rendered.html,
      attachments: header.mostrar_selo ? [{
        filename: "selo-ansp.png",
        content: Buffer.from(SEAL_DATA_URI.slice(SEAL_DATA_URI.indexOf(",") + 1), "base64"),
        contentId: DOCUMENT_HEADER_SEAL_CID,
        contentType: "image/png",
      }] : undefined,
    }, { signal: AbortSignal.timeout(15_000) });
    return classifyReminderProviderOutcome({
      type: "response", id: response.data?.id, error: response.error,
    });
  } catch (error) {
    return classifyReminderProviderOutcome({
      type: "exception", name: error instanceof Error ? error.name : undefined,
    });
  }
}
