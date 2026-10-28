"use server";

import { desc, eq, inArray, and, isNotNull, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { documentHeader, donorPledges, donorReminderSends } from "@/lib/db/schema";
import { occurrenceForMonth } from "@/lib/donor-recurrence";
import { resolveDocumentHeader } from "@/lib/documents/document-header";
import { canRetryDonorReminder } from "@/lib/email/donor-reminder-policy";
import {
  DonorReminderTemplateError,
  renderDonorReminderPreview,
  validateDonorReminderTemplate,
  type DonorReminderTemplate,
} from "@/lib/email/donor-reminder-template";
import {
  getDonorReminderTemplate,
  saveDonorReminderTemplate as persistDonorReminderTemplate,
} from "@/lib/email/donor-reminder-template-store";
import {
  retryFailedDonorReminderSend,
  sendDonorReminderTestEmail,
} from "@/lib/email/send-donor-reminder";

const PAGE = "/admin/lembretes-benfeitores";
const uuid = z.string().uuid();

function templateError(error: unknown) {
  return error instanceof DonorReminderTemplateError
    ? error.message
    : "Não foi possível processar o modelo. Tente novamente.";
}

async function currentHeader() {
  return resolveDocumentHeader(await db.query.documentHeader.findFirst({
    orderBy: desc(documentHeader.updated_at),
  }));
}

export async function getDonorReminderDashboard() {
  await requireAdmin();
  const nowIso = new Date().toISOString();
  // A missed daily run must not leave an expired provider call hidden as
  // "sending" indefinitely. Only an explicit review may release it for retry.
  await db.update(donorReminderSends).set({
    status: "uncertain", error_code: "unknown", reservation_token: null,
    reservation_expires_at: null, updated_at: nowIso,
  }).where(and(
    eq(donorReminderSends.status, "sending"),
    lte(donorReminderSends.reservation_expires_at, nowIso),
    isNotNull(donorReminderSends.provider_call_started_at)
  ));
  await db.update(donorReminderSends).set({
    status: "failed", error_code: "unknown", reservation_token: null,
    reservation_expires_at: null, updated_at: nowIso,
  }).where(and(
    eq(donorReminderSends.status, "sending"),
    lte(donorReminderSends.reservation_expires_at, nowIso),
    isNull(donorReminderSends.provider_call_started_at)
  ));
  const [template, header, rows] = await Promise.all([
    getDonorReminderTemplate(),
    currentHeader(),
    db.query.donorReminderSends.findMany({
      columns: {
        id: true, pledge_id: true, competencia: true, kind: true,
        due_date: true, status: true, sent_at: true, error_code: true,
        attempt_count: true, reservation_expires_at: true, provider_message_id: true,
        provider_call_started_at: true, frozen_recipient: true,
      },
      where: inArray(donorReminderSends.status, ["failed", "uncertain", "sending"]),
      orderBy: desc(donorReminderSends.updated_at),
      limit: 50,
    }),
  ]);
  const pledgeIds = [...new Set(rows.map((row) => row.pledge_id))];
  const pledges = pledgeIds.length ? await db.query.donorPledges.findMany({
    columns: {
      id: true, nome: true, created_at: true, frequencia: true,
      duracao: true, dia_vencimento: true, lembrete_canal: true,
    },
    where: inArray(donorPledges.id, pledgeIds),
  }) : [];
  const byId = new Map(pledges.map((pledge) => [pledge.id, pledge]));
  const now = new Date();
  return {
    template: { assunto: template.assunto, corpo: template.corpo },
    header,
    sends: rows.map((row) => {
      const pledge = byId.get(row.pledge_id);
      const occurrence = pledge ? occurrenceForMonth(pledge, row.competencia) : null;
      return {
        id: row.id,
        nome: pledge?.nome ?? "Benfeitor indisponível",
        competencia: row.competencia,
        kind: row.kind,
        due_date: row.due_date,
        status: row.status,
        sent_at: row.sent_at,
        error_code: row.error_code,
        attempt_count: row.attempt_count,
        reservation_expires_at: row.reservation_expires_at,
        provider_message_id: row.provider_message_id,
        provider_call_started_at: row.provider_call_started_at,
        frozen_recipient: row.frozen_recipient,
        can_retry: row.status === "failed" && pledge?.lembrete_canal === "email" &&
          occurrence?.dueDate === row.due_date && canRetryDonorReminder(occurrence, row.kind, now),
      };
    }),
  };
}

export async function previewDonorReminderTemplate(input: DonorReminderTemplate) {
  await requireAdmin();
  try {
    const header = await currentHeader();
    const rendered = renderDonorReminderPreview(validateDonorReminderTemplate(input), header);
    return { success: true as const, preview: { assunto: rendered.assunto, bodyHtml: rendered.bodyHtml, header } };
  } catch (error) {
    return { success: false as const, error: templateError(error) };
  }
}

export async function saveDonorReminderTemplate(input: DonorReminderTemplate) {
  await requireAdmin();
  try {
    const template = validateDonorReminderTemplate(input);
    await persistDonorReminderTemplate(template);
    revalidatePath(PAGE);
    return { success: true as const, template };
  } catch (error) {
    return { success: false as const, error: templateError(error) };
  }
}

export async function sendDonorReminderTest(input: DonorReminderTemplate & { email: string }) {
  await requireAdmin();
  const recipient = z.email().max(254).safeParse(input?.email?.trim());
  if (!recipient.success || /[,;\r\n]/.test(recipient.data)) {
    return { success: false as const, error: "Informe um endereço de e-mail válido para o teste." };
  }
  let template: DonorReminderTemplate;
  try {
    template = validateDonorReminderTemplate(input);
  } catch (error) {
    return { success: false as const, error: templateError(error) };
  }
  try {
    const result = await sendDonorReminderTestEmail(recipient.data, template);
    return result.status === "sent"
      ? { success: true as const }
      : { success: false as const, error: result.status === "uncertain"
        ? "O resultado do teste é incerto. Confira o Resend antes de tentar novamente."
        : "Não foi possível enviar o teste. Verifique a configuração do Resend." };
  } catch {
    return { success: false as const, error: "Não foi possível enviar o teste. Tente novamente." };
  }
}

export async function retryFailedDonorReminder(id: string) {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return { status: "expired" as const };
  try {
    const result = await retryFailedDonorReminderSend(id);
    revalidatePath(PAGE);
    return result;
  } catch {
    return { status: "failed" as const, error_code: "database" };
  }
}

export async function resolveUncertainDonorReminder(
  id: string,
  resolution: "accepted" | "failed"
) {
  await requireAdmin();
  if (!uuid.safeParse(id).success || (resolution !== "accepted" && resolution !== "failed")) {
    return { success: false as const, error: "Revisão inválida." };
  }
  const now = new Date().toISOString();
  try {
    const rows = await db.update(donorReminderSends).set({
      status: resolution === "accepted" ? "sent" : "failed",
      sent_at: resolution === "accepted" ? now : null,
      error_code: resolution === "accepted" ? null : "unknown",
      reservation_token: null,
      reservation_expires_at: null,
      updated_at: now,
    }).where(and(
      eq(donorReminderSends.id, id),
      eq(donorReminderSends.status, "uncertain")
    )).returning({ id: donorReminderSends.id });
    if (!rows.length) return { success: false as const, error: "Este envio já mudou de estado. Atualize a página." };
    revalidatePath(PAGE);
    return { success: true as const, status: resolution === "accepted" ? "sent" as const : "failed" as const };
  } catch {
    return { success: false as const, error: "Não foi possível registrar a revisão. Tente novamente." };
  }
}
