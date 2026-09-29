import nodemailer from "nodemailer";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { donorPledges, donorWelcomeTemplates } from "@/lib/db/schema";
import {
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
  const template = await db.query.donorWelcomeTemplates.findFirst({
    orderBy: desc(donorWelcomeTemplates.updated_at),
  });
  const { html, text } = renderDonorWelcomeEmail(template?.corpo ?? DONOR_WELCOME_BODY);
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
