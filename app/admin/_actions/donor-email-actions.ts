"use server";

import { desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { documentHeader, donorPledges, donorWelcomeTemplates } from "@/lib/db/schema";
import { resolveDocumentHeader } from "@/lib/documents/document-header";
import { sendDonorWelcomeEmail } from "@/lib/email/send-donor-welcome";
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

export async function saveDonorEmailTemplate(input: {
  assunto: string;
  corpo: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const assunto = input.assunto?.trim();
  const corpo = input.corpo?.trim();
  if (!assunto || assunto.length > 160 || /[\r\n]/.test(assunto)) {
    return { success: false, error: "Informe um assunto de até 160 caracteres, em uma linha." };
  }
  if (!corpo || corpo.length > 10000) {
    return { success: false, error: "Informe uma mensagem de até 10.000 caracteres." };
  }

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

export async function retryDonorWelcomeEmail(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const donor = await db.query.donorPledges.findFirst({
    columns: { id: true, email: true, welcome_email_sent_at: true },
    where: eq(donorPledges.id, id),
  });
  if (!donor) return { success: false, error: "Benfeitor não encontrado." };
  if (donor.welcome_email_sent_at) {
    return { success: false, error: "Este e-mail já foi enviado." };
  }

  try {
    await sendDonorWelcomeEmail(donor);
    revalidatePath("/admin/email-benfeitores");
    return { success: true };
  } catch {
    return { success: false, error: "Não foi possível enviar. Verifique o SMTP e tente novamente." };
  }
}
