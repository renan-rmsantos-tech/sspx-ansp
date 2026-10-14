"use server";

import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { documentHeader, donorPledges, donorWelcomeTemplates } from "@/lib/db/schema";
import { resolveDocumentHeader } from "@/lib/documents/document-header";
import {
  sendDonorWelcomeEmail,
  sendDonorWelcomeTestEmail,
  type DonorWelcomeSendResult,
} from "@/lib/email/send-donor-welcome";
import {
  DONOR_WELCOME_BODY,
  DONOR_WELCOME_SUBJECT,
} from "@/lib/email/donor-welcome-template";

export async function getDonorEmailSettings() {
  await requireAdmin();
  const [template, pending, savedHeader] = await Promise.all([
    db.query.donorWelcomeTemplates.findFirst(),
    db.query.donorPledges.findMany({
      columns: { id: true, nome: true, email: true, created_at: true },
      where: isNull(donorPledges.welcome_email_sent_at),
      orderBy: desc(donorPledges.created_at),
      limit: 50,
    }),
    db.query.documentHeader.findFirst({
      orderBy: desc(documentHeader.updated_at),
    }),
  ]);
  return {
    template: {
      assunto: template?.assunto ?? DONOR_WELCOME_SUBJECT,
      corpo: template?.corpo ?? DONOR_WELCOME_BODY,
    },
    pending,
    header: resolveDocumentHeader(savedHeader),
  };
}

interface EmailContent {
  assunto: string;
  corpo: string;
}

function validateEmailContent(input: EmailContent): EmailContent | { error: string } {
  const assunto = input?.assunto?.trim();
  const corpo = input?.corpo?.trim();
  if (!assunto || assunto.length > 160 || /[\r\n]/.test(assunto)) {
    return { error: "Informe um assunto de até 160 caracteres, em uma linha." };
  }
  if (!corpo || corpo.length > 10000) {
    return { error: "Informe uma mensagem de até 10.000 caracteres." };
  }
  return { assunto, corpo };
}

export async function saveDonorEmailTemplate(input: EmailContent): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const content = validateEmailContent(input);
  if ("error" in content) return { success: false, error: content.error };
  const { assunto, corpo } = content;

  try {
    const existing = await db.query.donorWelcomeTemplates.findFirst({
      columns: { id: true },
    });
    if (existing) {
      await db.update(donorWelcomeTemplates)
        .set({ assunto, corpo, updated_at: new Date().toISOString() })
        .where(eq(donorWelcomeTemplates.id, existing.id));
    } else {
      await db.insert(donorWelcomeTemplates).values({ assunto, corpo });
    }
    revalidatePath("/admin/email-benfeitores");
    return { success: true };
  } catch {
    return { success: false, error: "Não foi possível salvar o modelo. Tente novamente." };
  }
}

export async function sendDonorTestEmail(input: EmailContent & { email: string }): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const recipient = z.string().trim().email().max(254).safeParse(input?.email);
  if (!recipient.success || /[,;\r\n]/.test(recipient.data)) {
    return { success: false, error: "Informe um endereço de e-mail válido para o teste." };
  }
  const content = validateEmailContent(input);
  if ("error" in content) return { success: false, error: content.error };

  try {
    await sendDonorWelcomeTestEmail({ email: recipient.data, ...content });
    return { success: true };
  } catch {
    return { success: false, error: "Não foi possível enviar o teste. Verifique a configuração do Resend e tente novamente." };
  }
}

export async function retryDonorWelcomeEmail(
  id: string
): Promise<{
  status: DonorWelcomeSendResult["status"];
  success: boolean;
  error?: string;
  sent_at?: string;
  expires_at?: string;
}> {
  await requireAdmin();
  const donor = await db.query.donorPledges.findFirst({
    columns: { id: true, email: true, welcome_email_sent_at: true },
    where: eq(donorPledges.id, id),
  });
  if (!donor) return { status: "failed", success: false, error: "Benfeitor não encontrado." };
  if (donor.welcome_email_sent_at) {
    return {
      status: "already_sent",
      success: false,
      sent_at: donor.welcome_email_sent_at,
      error: "Este e-mail já foi enviado.",
    };
  }

  try {
    const result = await sendDonorWelcomeEmail(donor);
    if (result.status === "sent" || result.status === "already_sent") {
      revalidatePath("/admin/email-benfeitores");
    }
    return {
      ...result,
      success: result.status === "sent",
      ...(result.status === "already_sent"
        ? { error: "Este e-mail já foi enviado." }
        : result.status === "in_progress"
          ? { error: "O envio deste e-mail já está em andamento." }
          : {}),
    };
  } catch {
    return {
      status: "failed",
      success: false,
      error: "Não foi possível enviar. Verifique a configuração do Resend e tente novamente.",
    };
  }
}

export async function markDonorWelcomeEmailSent(id: string): Promise<{ success: boolean; sent_at?: string; error?: string }> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "Benfeitor inválido." };
  const now = new Date().toISOString();
  try {
    const rows = await db.update(donorPledges).set({
      welcome_email_sent_at: now,
      welcome_email_reservation_token: null,
      welcome_email_reservation_expires_at: null,
    }).where(and(
      eq(donorPledges.id, id),
      isNull(donorPledges.welcome_email_sent_at),
      or(isNull(donorPledges.welcome_email_reservation_token), lte(donorPledges.welcome_email_reservation_expires_at, now))
    )).returning({ sent_at: donorPledges.welcome_email_sent_at });
    if (!rows.length) {
      const current = await db.query.donorPledges.findFirst({ where: eq(donorPledges.id, id) });
      if (!current) return { success: false, error: "Benfeitor não encontrado." };
      if (!current.welcome_email_sent_at) return { success: false, error: "O envio deste e-mail está em andamento. Aguarde antes de marcar." };
      return { success: true, sent_at: current.welcome_email_sent_at };
    }
    revalidatePath("/admin/benfeitores");
    revalidatePath("/admin/email-benfeitores");
    return { success: true, sent_at: rows[0].sent_at! };
  } catch {
    return { success: false, error: "Não foi possível registrar o envio. Tente novamente." };
  }
}
