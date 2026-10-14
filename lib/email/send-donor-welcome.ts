import { randomUUID } from "crypto";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { documentHeader, donorPledges, donorWelcomeTemplates } from "@/lib/db/schema";
import { resolveDocumentHeader } from "@/lib/documents/document-header";
import { SEAL_DATA_URI } from "@/lib/pdf/seal-image";
import {
  DOCUMENT_HEADER_SEAL_CID,
  DONOR_WELCOME_BODY,
  DONOR_WELCOME_SUBJECT,
  renderDonorWelcomeEmail,
} from "./donor-welcome-template";

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("Resend não configurado.");
  }
  return { apiKey, from };
}

async function sendWelcomeMessage(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const config = resendConfig();
  const savedHeader = await db.query.documentHeader.findFirst({
    orderBy: desc(documentHeader.updated_at),
  });
  const header = resolveDocumentHeader(savedHeader);
  const { html, text } = renderDonorWelcomeEmail(input.body, header);
  const resend = new Resend(config.apiKey);
  const { data, error } = await resend.emails.send({
    from: config.from,
    to: [input.to],
    subject: input.subject,
    text,
    html,
    attachments: header.mostrar_selo
      ? [{
          filename: "selo-ansp.png",
          content: Buffer.from(SEAL_DATA_URI.slice(SEAL_DATA_URI.indexOf(",") + 1), "base64"),
          contentId: DOCUMENT_HEADER_SEAL_CID,
          contentType: "image/png",
        }]
      : undefined,
  }, {
    signal: AbortSignal.timeout(15_000),
  });

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("O Resend não confirmou o recebimento da mensagem.");
}

export async function sendDonorWelcomeEmail(donor: {
  id: string;
  email: string;
}): Promise<DonorWelcomeSendResult> {
  const reservationToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60_000).toISOString();
  let reserved = false;

  try {
    const acquired = await db
      .update(donorPledges)
      .set({
        welcome_email_reservation_token: reservationToken,
        welcome_email_reservation_expires_at: expiresAt,
      })
      .where(
        and(
          eq(donorPledges.id, donor.id),
          isNull(donorPledges.welcome_email_sent_at),
          or(
            isNull(donorPledges.welcome_email_reservation_token),
            lte(donorPledges.welcome_email_reservation_expires_at, now.toISOString())
          )
        )
      )
      .returning({ id: donorPledges.id });

    if (acquired.length === 0) {
      const current = await db.query.donorPledges.findFirst({
        columns: {
          welcome_email_sent_at: true,
          welcome_email_reservation_token: true,
          welcome_email_reservation_expires_at: true,
        },
        where: eq(donorPledges.id, donor.id),
      });
      if (current?.welcome_email_sent_at) {
        return { status: "already_sent", sent_at: current.welcome_email_sent_at };
      }
      if (
        current?.welcome_email_reservation_token &&
        current.welcome_email_reservation_expires_at &&
        new Date(current.welcome_email_reservation_expires_at).getTime() > Date.now()
      ) {
        return {
          status: "in_progress",
          expires_at: current.welcome_email_reservation_expires_at,
        };
      }
      return { status: "failed", error: "Benfeitor não encontrado." };
    }

    reserved = true;
    const template = await db.query.donorWelcomeTemplates.findFirst({
      orderBy: desc(donorWelcomeTemplates.updated_at),
    });
    await sendWelcomeMessage({
      to: donor.email,
      subject: template?.assunto ?? DONOR_WELCOME_SUBJECT,
      body: template?.corpo ?? DONOR_WELCOME_BODY,
    });

    const sentAt = new Date().toISOString();
    const accepted = await db
      .update(donorPledges)
      .set({
        welcome_email_sent_at: sentAt,
        welcome_email_reservation_token: null,
        welcome_email_reservation_expires_at: null,
      })
      .where(
        and(
          eq(donorPledges.id, donor.id),
          eq(donorPledges.welcome_email_reservation_token, reservationToken)
        )
      )
      .returning({ id: donorPledges.id });

    reserved = false;
    return accepted.length
      ? { status: "sent", sent_at: sentAt }
      : { status: "failed", error: "O Resend aceitou o e-mail, mas não foi possível registrar o envio." };
  } catch {
    if (reserved) {
      try {
        await db
          .update(donorPledges)
          .set({
            welcome_email_reservation_token: null,
            welcome_email_reservation_expires_at: null,
          })
          .where(
            and(
              eq(donorPledges.id, donor.id),
              eq(donorPledges.welcome_email_reservation_token, reservationToken)
            )
          );
      } catch {
        // A expiração da reserva permite recuperação se o banco estiver indisponível.
      }
    }
    return { status: "failed", error: "Não foi possível enviar. Verifique a configuração do Resend e tente novamente." };
  }
}

export type DonorWelcomeSendResult =
  | { status: "sent"; sent_at: string }
  | { status: "already_sent"; sent_at: string }
  | { status: "in_progress"; expires_at: string }
  | { status: "failed"; error: string };

export async function sendDonorWelcomeTestEmail(input: {
  email: string;
  assunto: string;
  corpo: string;
}): Promise<void> {
  await sendWelcomeMessage({
    to: input.email,
    subject: `[TESTE] ${input.assunto}`,
    body: input.corpo,
  });
}
