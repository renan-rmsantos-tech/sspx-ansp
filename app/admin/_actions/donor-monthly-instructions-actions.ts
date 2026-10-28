"use server";

import { z } from "zod";
import { and, desc, eq, isNotNull, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { donorMonthlyInstructionSends, donorPledges } from "@/lib/db/schema";
import { loadDocumentHeader } from "@/lib/documents/document-header-store";
import {
  DonorMonthlyInstructionsTemplateError,
  renderDonorMonthlyInstructionsPreview,
  validateDonorMonthlyInstructionsTemplate,
  type DonorMonthlyInstructionsTemplate,
} from "@/lib/email/donor-monthly-instructions-template";
import {
  getDonorMonthlyInstructionsTemplate,
  saveDonorMonthlyInstructionsTemplate as persistTemplate,
} from "@/lib/email/donor-monthly-instructions-template-store";
import {
  sendDonorMonthlyInstructionsTestEmail,
  sendManualDonorMonthlyInstructions,
} from "@/lib/email/send-donor-monthly-instructions";

const PAGE = "/admin/instrucoes-benfeitores";

function safeTemplateError(error: unknown) {
  return error instanceof DonorMonthlyInstructionsTemplateError
    ? error.message
    : "Não foi possível processar o modelo. Tente novamente.";
}

async function currentHeader() {
  return await loadDocumentHeader();
}

export async function getDonorMonthlyInstructionsSettings() {
  await requireAdmin();
  const [template, header] = await Promise.all([
    getDonorMonthlyInstructionsTemplate(), currentHeader(),
  ]);
  return { template: { assunto: template.assunto, corpo: template.corpo }, header };
}

export async function previewDonorMonthlyInstructionsTemplate(input: DonorMonthlyInstructionsTemplate) {
  await requireAdmin();
  try {
    const header = await currentHeader();
    const rendered = renderDonorMonthlyInstructionsPreview(
      validateDonorMonthlyInstructionsTemplate(input), header
    );
    return { success: true as const, preview: {
      assunto: rendered.assunto, bodyHtml: rendered.bodyHtml, header,
    } };
  } catch (error) {
    return { success: false as const, error: safeTemplateError(error) };
  }
}

export async function saveDonorMonthlyInstructionsTemplate(input: DonorMonthlyInstructionsTemplate) {
  await requireAdmin();
  try {
    const template = await persistTemplate(validateDonorMonthlyInstructionsTemplate(input));
    revalidatePath(PAGE);
    return { success: true as const, template };
  } catch (error) {
    return { success: false as const, error: safeTemplateError(error) };
  }
}

export async function sendDonorMonthlyInstructionsTest(input: DonorMonthlyInstructionsTemplate & { email: string }) {
  await requireAdmin();
  const recipient = z.email().max(254).safeParse(input?.email?.trim());
  if (!recipient.success || /[,;\r\n]/.test(recipient.data)) {
    return { success: false as const, error: "Informe um endereço de e-mail válido para o teste." };
  }
  let template: DonorMonthlyInstructionsTemplate;
  try {
    template = validateDonorMonthlyInstructionsTemplate(input);
  } catch (error) {
    return { success: false as const, error: safeTemplateError(error) };
  }
  try {
    const result = await sendDonorMonthlyInstructionsTestEmail(recipient.data, template);
    return result.status === "sent"
      ? { success: true as const }
      : { success: false as const, error: result.status === "uncertain"
        ? "O resultado do teste é incerto. Confira o Resend antes de tentar novamente."
        : "Não foi possível enviar o teste. Verifique a configuração do Resend." };
  } catch {
    return { success: false as const, error: "Não foi possível enviar o teste. Tente novamente." };
  }
}

const manualSendInput = z.object({
  pledgeId: z.string().uuid(),
  competence: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  explicitResend: z.boolean().optional(),
});

async function latestAttempt(pledgeId: string) {
  const row = await db.query.donorMonthlyInstructionSends.findFirst({
    columns: {
      generation: true, receipt_competencia: true, status: true,
      sent_at: true, error_code: true,
    },
    where: eq(donorMonthlyInstructionSends.pledge_id, pledgeId),
    orderBy: desc(donorMonthlyInstructionSends.generation),
  });
  return row ?? null;
}

async function monthlyPledgeExists(pledgeId: string) {
  return Boolean(await db.query.donorPledges.findFirst({
    columns: { id: true },
    where: and(eq(donorPledges.id, pledgeId), eq(donorPledges.frequencia, "mensal")),
  }));
}

/** The donor-list controls in task 23 call this authenticated action. */
export async function sendManualDonorMonthlyInstructionsAction(input: unknown) {
  await requireAdmin();
  const parsed = manualSendInput.safeParse(input);
  if (!parsed.success) return { status: "unavailable", message: "Dados de envio inválidos." } as const;
  try {
    if (!await monthlyPledgeExists(parsed.data.pledgeId)) {
      return { status: "unavailable", message: "Contribuição mensal não encontrada." } as const;
    }
    const result = await sendManualDonorMonthlyInstructions(parsed.data.pledgeId, {
      competence: parsed.data.competence,
      explicitResend: parsed.data.explicitResend,
    });
    revalidatePath("/admin/benfeitores");
    return { ...result, latest: await latestAttempt(parsed.data.pledgeId) };
  } catch {
    return { status: "failed", error_code: "database" } as const;
  }
}

const uncertainResolutionInput = z.object({
  pledgeId: z.string().uuid(),
  resolution: z.enum(["accepted", "failed"]),
});

/** Only an administrator who checked Resend can resolve an uncertain provider call. */
export async function resolveUncertainDonorMonthlyInstructionsAction(input: unknown) {
  await requireAdmin();
  const parsed = uncertainResolutionInput.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Dados de envio inválidos." };
  try {
    const { pledgeId, resolution } = parsed.data;
    if (!await monthlyPledgeExists(pledgeId)) {
      return { success: false as const, error: "Contribuição mensal não encontrada." };
    }
    const latest = await db.query.donorMonthlyInstructionSends.findFirst({
      where: eq(donorMonthlyInstructionSends.pledge_id, pledgeId),
      orderBy: desc(donorMonthlyInstructionSends.generation),
    });
    if (!latest) return { success: false as const, error: "Envio não encontrado." };
    const now = new Date().toISOString();
    const rows = await db.update(donorMonthlyInstructionSends).set({
      status: resolution === "accepted" ? "sent" : "failed",
      sent_at: resolution === "accepted" ? now : null,
      error_code: resolution === "accepted" ? null : "unknown",
      reservation_token: null,
      reservation_expires_at: null,
      updated_at: now,
    }).where(and(
      eq(donorMonthlyInstructionSends.id, latest.id),
      or(
        eq(donorMonthlyInstructionSends.status, "uncertain"),
        and(
          eq(donorMonthlyInstructionSends.status, "sending"),
          lte(donorMonthlyInstructionSends.reservation_expires_at, now),
          isNotNull(donorMonthlyInstructionSends.provider_call_started_at)
        )
      )
    )).returning({ id: donorMonthlyInstructionSends.id });
    if (!rows.length) {
      return { success: false as const, error: "O estado do envio mudou. Atualize a lista." };
    }
    revalidatePath("/admin/benfeitores");
    return { success: true as const, latest: await latestAttempt(pledgeId) };
  } catch {
    return { success: false as const, error: "Não foi possível registrar a revisão. Tente novamente." };
  }
}
