import nodemailer from "nodemailer";
import { desc, eq } from "drizzle-orm";
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

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const port = Number(process.env.SMTP_PORT || "587");
  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP não configurado.");
  }
  return { host, from, port };
}

export async function sendDonorWelcomeEmail(donor: {
  id: string;
  email: string;
}): Promise<void> {
  const config = smtpConfig();
  const [template, savedHeader] = await Promise.all([
    db.query.donorWelcomeTemplates.findFirst({
      orderBy: desc(donorWelcomeTemplates.updated_at),
    }),
    db.query.documentHeader.findFirst({
      orderBy: desc(documentHeader.updated_at),
    }),
  ]);
  const header = resolveDocumentHeader(savedHeader);
  const { html, text } = renderDonorWelcomeEmail(template?.corpo ?? DONOR_WELCOME_BODY, header);
  const secure = process.env.SMTP_SECURE === "true" || config.port === 465;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    await transport.sendMail({
      from: config.from,
      to: donor.email,
      subject: template?.assunto ?? DONOR_WELCOME_SUBJECT,
      text,
      html,
      attachments: header.mostrar_selo ? [{
        filename: "selo-ansp.png",
        content: Buffer.from(SEAL_DATA_URI.slice(SEAL_DATA_URI.indexOf(",") + 1), "base64"),
        cid: DOCUMENT_HEADER_SEAL_CID,
        contentType: "image/png",
        contentDisposition: "inline" as const,
      }] : undefined,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } finally {
    transport.close();
  }

  await db
    .update(donorPledges)
    .set({ welcome_email_sent_at: new Date().toISOString() })
    .where(eq(donorPledges.id, donor.id));
}
