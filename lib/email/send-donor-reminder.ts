import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import {
  documentHeader,
  donorPaymentLedger,
  donorPledges,
  donorReminderSends,
} from "@/lib/db/schema";
import { hasMonthlyReceipt, materializeCurrentAndNextMonthlyPayments } from "@/lib/donor-payment-ledger";
import { occurrenceForMonth, saoPauloDate, scheduledReminder, type ReminderKind } from "@/lib/donor-recurrence";
import { createDonorReceiptLink } from "@/lib/donor-receipts/tickets";
import { resolveDocumentHeader } from "@/lib/documents/document-header";
import { getDonorReminderTemplate } from "./donor-reminder-template-store";
import { reminderProviderKey, renderDonorReminder, renderDonorReminderPreview, type DonorReminderTemplate } from "./donor-reminder-template";
import { DOCUMENT_HEADER_SEAL_CID } from "./donor-welcome-template";
import {
  canRetryDonorReminder,
  classifyReminderProviderOutcome,
  selectScheduledDonorReminders,
} from "./donor-reminder-policy";
import { SEAL_DATA_URI } from "@/lib/pdf/seal-image";

const LEASE_MS = 60_000;

type FrozenPayload = {
  recipient: string;
  sender: string;
  subject: string;
  text: string;
  html: string;
  includeSeal: boolean;
};

export type DonorReminderSendResult =
  | { status: "sent" | "already_sent"; sent_at: string }
  | { status: "in_progress"; expires_at: string | null }
  | { status: "failed" | "uncertain"; error_code: string }
  | { status: "expired" | "skipped_paid" | "skipped_receipt" };

function config() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.RESEND_FROM?.trim();
  const host = process.env.APP_HOST?.trim();
  if (!apiKey || !sender || !host || /[/:?#@\s]/.test(host)) {
    throw new Error("Reminder configuration is incomplete");
  }
  return { apiKey, sender, origin: `https://${host}` };
}

async function context(
  pledgeId: string,
  competence: string,
  kind: ReminderKind,
  now: Date,
  mode: "daily" | "retry",
  database: typeof db
) {
  const pledge = await database.query.donorPledges.findFirst({
    columns: {
      id: true, nome: true, email: true, valor: true, created_at: true,
      frequencia: true, duracao: true, dia_vencimento: true, lembrete_canal: true,
    },
    where: eq(donorPledges.id, pledgeId),
  });
  if (!pledge || pledge.frequencia !== "mensal" || pledge.lembrete_canal !== "email") return null;
  const occurrence = occurrenceForMonth(pledge, competence);
  if (!occurrence) return null;
  const schedule = scheduledReminder(occurrence, kind);
  const ledger = await database.query.donorPaymentLedger.findFirst({
    columns: {
      id: true, due_date: true, expected_value: true,
      receipt_path: true, receipt_name: true, receipt_uploaded_at: true,
    },
    where: and(
      eq(donorPaymentLedger.pledge_id, pledgeId),
      eq(donorPaymentLedger.competencia, competence)
    ),
  });
  if (!ledger || ledger.due_date !== occurrence.dueDate) return null;
  return {
    pledge, occurrence, ledger,
    receiptUploaded: hasMonthlyReceipt(ledger),
    scheduleEligible: Boolean(schedule && (mode === "daily"
      ? schedule.scheduledDate === saoPauloDate(now)
      : canRetryDonorReminder(occurrence, kind, now))),
  };
}

/** A reservation abandoned before a provider call is not a delivery failure. */
async function releaseForReceipt(
  database: typeof db,
  reserved: typeof donorReminderSends.$inferSelect,
  previous: typeof donorReminderSends.$inferSelect,
  token: string
) {
  const owned = and(
    eq(donorReminderSends.id, reserved.id),
    eq(donorReminderSends.status, "sending"),
    eq(donorReminderSends.reservation_token, token),
    isNull(donorReminderSends.provider_call_started_at)
  );
  if (previous.attempt_count === 0 && !previous.error_code && !previous.frozen_recipient) {
    await database.delete(donorReminderSends).where(owned);
  } else {
    await database.update(donorReminderSends).set({
      status: "failed", error_code: previous.error_code,
      attempt_count: previous.attempt_count,
      reservation_token: null, reservation_expires_at: null,
      updated_at: new Date().toISOString(),
    }).where(owned);
  }
}

async function frozenPayload(
  current: typeof donorReminderSends.$inferSelect | undefined,
  eligible: NonNullable<Awaited<ReturnType<typeof context>>>,
  database: typeof db
): Promise<FrozenPayload> {
  if (current?.frozen_recipient !== null && current?.frozen_recipient !== undefined) {
    return {
      recipient: current.frozen_recipient,
      sender: current.frozen_sender!,
      subject: current.frozen_subject!,
      text: current.frozen_text!,
      html: current.frozen_html!,
      includeSeal: current.frozen_include_seal!,
    };
  }
  const settings = config();
  const link = createDonorReceiptLink(
    settings.origin, eligible.pledge.id, eligible.occurrence.competence,
    eligible.ledger.due_date
  );
  const header = resolveDocumentHeader(await database.query.documentHeader.findFirst({
    orderBy: desc(documentHeader.updated_at),
  }));
  const rendered = renderDonorReminder({
    template: await getDonorReminderTemplate(database),
    nome: eligible.pledge.nome,
    valor: eligible.ledger.expected_value,
    data_vencimento: eligible.ledger.due_date,
    mes_referencia: eligible.occurrence.competence,
    link_comprovante: link,
    header,
  });
  return {
    recipient: eligible.pledge.email,
    sender: settings.sender,
    subject: rendered.assunto,
    text: rendered.text,
    html: rendered.html,
    includeSeal: header.mostrar_selo,
  };
}

function knownResult(row: typeof donorReminderSends.$inferSelect | undefined): DonorReminderSendResult {
  if (row?.status === "sent" && row.sent_at) return { status: "already_sent", sent_at: row.sent_at };
  if (row?.status === "uncertain") return { status: "uncertain", error_code: row.error_code ?? "unknown" };
  if (row?.status === "sending") return { status: "in_progress", expires_at: row.reservation_expires_at };
  return { status: "failed", error_code: row?.error_code ?? "database" };
}

/** Reserves the unique send row, then calls Resend with no open DB transaction. */
export async function sendDonorReminder(
  pledgeId: string,
  competence: string,
  kind: ReminderKind,
  options: { now?: Date; mode?: "daily" | "retry"; database?: typeof db } = {}
): Promise<DonorReminderSendResult> {
  const database = options.database ?? db;
  const now = options.now ?? new Date();
  const mode = options.mode ?? "daily";
  const key = and(
    eq(donorReminderSends.pledge_id, pledgeId),
    eq(donorReminderSends.competencia, competence),
    eq(donorReminderSends.kind, kind)
  );
  const eligible = await context(pledgeId, competence, kind, now, mode, database);
  if (!eligible) return { status: "expired" };
  let current = await database.query.donorReminderSends.findFirst({ where: key });
  if (current?.status === "sent") return knownResult(current);
  if (eligible.receiptUploaded) return { status: "skipped_receipt" };
  if (!eligible.scheduleEligible) return { status: "expired" };
  if (current?.status === "uncertain") return knownResult(current);
  if (mode === "retry" && current?.status !== "failed") return { status: "expired" };
  if (!current) {
    await database.insert(donorReminderSends).values({
      pledge_id: pledgeId, competencia: competence, kind,
      due_date: eligible.ledger.due_date, status: "failed",
      provider_idempotency_key: reminderProviderKey(pledgeId, competence, kind),
    }).onConflictDoNothing();
    current = await database.query.donorReminderSends.findFirst({ where: key });
  }
  if (!current) throw new Error("Reminder reservation was not created");

  const token = randomUUID();
  const leaseNow = new Date();
  const nowIso = leaseNow.toISOString();
  if (current.status === "sending" && current.reservation_expires_at &&
      current.reservation_expires_at > nowIso) return knownResult(current);
  const staleStarted = await database.update(donorReminderSends).set({
    status: "uncertain", error_code: "unknown", reservation_token: null,
    reservation_expires_at: null, updated_at: nowIso,
  }).where(and(
    key, eq(donorReminderSends.status, "sending"),
    lte(donorReminderSends.reservation_expires_at, nowIso),
    isNotNull(donorReminderSends.provider_call_started_at)
  )).returning({ id: donorReminderSends.id });
  if (staleStarted.length) return { status: "uncertain", error_code: "unknown" };

  // The ledger row was checked before insertion. Keep configuration/rendering
  // failures visible on that row, without freezing a partial payload.
  let settings: ReturnType<typeof config>;
  try {
    settings = config();
  } catch {
    await database.update(donorReminderSends).set({
      status: "failed", error_code: "configuration", reservation_token: null,
      reservation_expires_at: null, updated_at: nowIso,
    }).where(and(key, or(
      eq(donorReminderSends.status, "failed"),
      and(eq(donorReminderSends.status, "sending"),
        lte(donorReminderSends.reservation_expires_at, nowIso),
        isNull(donorReminderSends.provider_call_started_at))
    )));
    return { status: "failed", error_code: "configuration" };
  }
  let payload: FrozenPayload;
  try {
    payload = await frozenPayload(current, eligible, database);
  } catch {
    await database.update(donorReminderSends).set({
      status: "failed", error_code: "unknown", reservation_token: null,
      reservation_expires_at: null, updated_at: nowIso,
    }).where(and(key, or(
      eq(donorReminderSends.status, "failed"),
      and(eq(donorReminderSends.status, "sending"),
        lte(donorReminderSends.reservation_expires_at, nowIso),
        isNull(donorReminderSends.provider_call_started_at))
    )));
    return { status: "failed", error_code: "unknown" };
  }

  const claimed = await database.update(donorReminderSends).set({
    status: "sending", error_code: null, reservation_token: token,
    reservation_expires_at: new Date(leaseNow.getTime() + LEASE_MS).toISOString(),
    provider_call_started_at: null,
    attempt_count: sql`${donorReminderSends.attempt_count} + 1`,
    frozen_recipient: sql`coalesce(${donorReminderSends.frozen_recipient}, ${payload.recipient})`,
    frozen_sender: sql`coalesce(${donorReminderSends.frozen_sender}, ${payload.sender})`,
    frozen_subject: sql`coalesce(${donorReminderSends.frozen_subject}, ${payload.subject})`,
    frozen_text: sql`coalesce(${donorReminderSends.frozen_text}, ${payload.text})`,
    frozen_html: sql`coalesce(${donorReminderSends.frozen_html}, ${payload.html})`,
    frozen_include_seal: sql`coalesce(${donorReminderSends.frozen_include_seal}, ${payload.includeSeal})`,
    updated_at: nowIso,
  }).where(and(
    key,
    or(
      eq(donorReminderSends.status, "failed"),
      and(
        eq(donorReminderSends.status, "sending"),
        lte(donorReminderSends.reservation_expires_at, nowIso),
        isNull(donorReminderSends.provider_call_started_at)
      )
    )
  )).returning();
  if (!claimed.length) return knownResult(await database.query.donorReminderSends.findFirst({ where: key }));
  const reserved = claimed[0];

  // A consent/day edit or ledger change between selection and claim stops the send.
  const latest = await context(pledgeId, competence, kind, now, mode, database);
  if (latest?.receiptUploaded) {
    await releaseForReceipt(database, reserved, current, token);
    return { status: "skipped_receipt" };
  }
  if (!latest) {
    await database.update(donorReminderSends).set({
      status: "failed", error_code: "unknown", reservation_token: null,
      reservation_expires_at: null, updated_at: new Date().toISOString(),
    }).where(and(eq(donorReminderSends.id, reserved.id), eq(donorReminderSends.reservation_token, token)));
    return { status: "expired" };
  }

  const started = await database.update(donorReminderSends).set({
    provider_call_started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).where(and(
    eq(donorReminderSends.id, reserved.id), eq(donorReminderSends.status, "sending"),
    eq(donorReminderSends.reservation_token, token),
    sql`exists (
      select 1 from donor_payment_ledger l
      where l.pledge_id = ${pledgeId}::uuid and l.competencia = ${competence}
        and l.due_date = ${eligible.ledger.due_date}::date
        and l.receipt_path is null and l.receipt_name is null
        and l.receipt_uploaded_at is null
    )`
  )).returning({ id: donorReminderSends.id });
  if (!started.length) {
    const latestAfterClaim = await context(pledgeId, competence, kind, now, mode, database);
    if (latestAfterClaim?.receiptUploaded) {
      await releaseForReceipt(database, reserved, current, token);
      return { status: "skipped_receipt" };
    }
    return { status: "uncertain", error_code: "unknown" };
  }

  let outcome: ReturnType<typeof classifyReminderProviderOutcome>;
  try {
    const response = await new Resend(settings.apiKey).emails.send({
      from: reserved.frozen_sender!, to: [reserved.frozen_recipient!],
      subject: reserved.frozen_subject!, text: reserved.frozen_text!,
      html: reserved.frozen_html!,
      attachments: reserved.frozen_include_seal ? [{
        filename: "selo-ansp.png",
        content: Buffer.from(SEAL_DATA_URI.slice(SEAL_DATA_URI.indexOf(",") + 1), "base64"),
        contentId: DOCUMENT_HEADER_SEAL_CID,
        contentType: "image/png",
      }] : undefined,
    }, { signal: AbortSignal.timeout(15_000), idempotencyKey: reserved.provider_idempotency_key });
    outcome = classifyReminderProviderOutcome({
      type: "response", id: response.data?.id, error: response.error,
    });
  } catch (error) {
    outcome = classifyReminderProviderOutcome({
      type: "exception", name: error instanceof Error ? error.name : undefined,
    });
  }

  const sentAt = new Date().toISOString();
  const recorded = await database.update(donorReminderSends).set({
    status: outcome.status,
    sent_at: outcome.status === "sent" ? sentAt : null,
    provider_message_id: outcome.status === "sent" ? outcome.messageId : null,
    error_code: outcome.status === "sent" ? null : outcome.code,
    reservation_token: null, reservation_expires_at: null, updated_at: sentAt,
  }).where(and(
    eq(donorReminderSends.id, reserved.id), eq(donorReminderSends.status, "sending"),
    eq(donorReminderSends.reservation_token, token)
  )).returning({ id: donorReminderSends.id });
  if (!recorded.length) return { status: "uncertain", error_code: "database" };
  return outcome.status === "sent"
    ? { status: "sent", sent_at: sentAt }
    : { status: outcome.status, error_code: outcome.code };
}

/** Internal service for the next task's authenticated administrator action. */
export async function retryFailedDonorReminderSend(id: string, database: typeof db = db) {
  const row = await database.query.donorReminderSends.findFirst({
    where: eq(donorReminderSends.id, id),
  });
  if (!row) return { status: "expired" } as const;
  if (row.status === "sending" && row.reservation_expires_at &&
      row.reservation_expires_at <= new Date().toISOString()) {
    const started = row.provider_call_started_at !== null;
    const changed = await database.update(donorReminderSends).set({
      status: started ? "uncertain" : "failed",
      error_code: "unknown", reservation_token: null,
      reservation_expires_at: null, updated_at: new Date().toISOString(),
    }).where(and(
      eq(donorReminderSends.id, id),
      eq(donorReminderSends.status, "sending"),
      lte(donorReminderSends.reservation_expires_at, new Date().toISOString())
    )).returning({ id: donorReminderSends.id });
    if (changed.length) return started
      ? { status: "uncertain", error_code: "unknown" } as const
      : { status: "failed", error_code: "unknown" } as const;
    return knownResult(await database.query.donorReminderSends.findFirst({
      where: eq(donorReminderSends.id, id),
    }));
  }
  if (row.status !== "failed") return knownResult(row);
  return sendDonorReminder(row.pledge_id, row.competencia, row.kind, {
    mode: "retry", database,
  });
}

/** A sample message is sent to an explicit test address, without a reminder reservation. */
export async function sendDonorReminderTestEmail(
  recipient: string,
  template: DonorReminderTemplate,
  database: typeof db = db
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.RESEND_FROM?.trim();
  if (!apiKey || !sender) return { status: "failed", error_code: "configuration" } as const;
  const header = resolveDocumentHeader(await database.query.documentHeader.findFirst({
    orderBy: desc(documentHeader.updated_at),
  }));
  const rendered = renderDonorReminderPreview(template, header);
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

export async function runDailyDonorReminders(now = new Date(), database: typeof db = db) {
  await materializeCurrentAndNextMonthlyPayments(now, database);
  const pledges = await database.query.donorPledges.findMany({
    columns: {
      id: true, created_at: true, frequencia: true, duracao: true,
      dia_vencimento: true, lembrete_canal: true,
    },
    where: and(eq(donorPledges.frequencia, "mensal"), eq(donorPledges.lembrete_canal, "email")),
  });
  const counts = {
    date: saoPauloDate(now), candidates: 0, sent: 0, already_sent: 0,
    failed: 0, uncertain: 0, in_progress: 0, expired: 0, skipped_paid: 0,
    skipped_receipt: 0,
  };
  const scheduled = pledges.flatMap((pledge) =>
    selectScheduledDonorReminders(pledge, now).map((schedule) => ({ pledge, schedule }))
  );
  const uploaded = new Set<string>();
  if (scheduled.length) {
    const ledgers = await database.query.donorPaymentLedger.findMany({
      columns: {
        pledge_id: true, competencia: true,
        receipt_path: true, receipt_name: true, receipt_uploaded_at: true,
      },
      where: and(
        inArray(donorPaymentLedger.pledge_id, [...new Set(scheduled.map(({ pledge }) => pledge.id))]),
        inArray(donorPaymentLedger.competencia,
          [...new Set(scheduled.map(({ schedule }) => schedule.occurrence.competence))])
      ),
    });
    for (const row of ledgers) {
      if (hasMonthlyReceipt(row)) uploaded.add(`${row.pledge_id}:${row.competencia}`);
    }
  }
  for (const pledge of pledges) {
    const all = selectScheduledDonorReminders(pledge, now);
    const eligible = selectScheduledDonorReminders(pledge, now,
      (competence) => uploaded.has(`${pledge.id}:${competence}`));
    counts.skipped_receipt += all.length - eligible.length;
    for (const schedule of eligible) {
      counts.candidates++;
      try {
        const result = await sendDonorReminder(
          pledge.id, schedule.occurrence.competence, schedule.kind,
          { now, database }
        );
        counts[result.status]++;
      } catch {
        counts.failed++;
      }
    }
  }
  return counts;
}
