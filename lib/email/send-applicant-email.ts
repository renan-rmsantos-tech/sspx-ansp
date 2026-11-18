import { Resend } from "resend";
import { loadDocumentHeader } from "@/lib/documents/document-header-store";
import { escapeEmailHtml, renderInstitutionalEmail } from "./donor-welcome-template";
import { institutionalEmailAttachments } from "./institutional-email-attachments";

/** Origem pública dos links enviados por e-mail (`https://APP_HOST`). */
export function applicantLinkOrigin(): string {
  const host = process.env.APP_HOST?.trim();
  if (host && !/[/:?#@\s]/.test(host)) return `https://${host}`;
  if (process.env.NODE_ENV !== "production") return process.env.DEV_APP_ORIGIN?.trim() || "http://localhost:3000";
  throw new Error("APP_HOST não configurado.");
}

export interface ApplicantEmail {
  to: string;
  subject: string;
  /** Parágrafos separados por linha em branco. */
  body: string;
  action?: { label: string; url: string };
}

export function renderApplicantEmail(email: ApplicantEmail, header?: Parameters<typeof renderInstitutionalEmail>[2]) {
  const paragraphs = email.body.trim().split(/\n\s*\n/);
  let bodyHtml = paragraphs
    .map((p) => `<p style="margin:0 0 20px;line-height:1.65">${escapeEmailHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  let bodyText = email.body.trim();
  if (email.action) {
    const url = escapeEmailHtml(email.action.url);
    bodyHtml += `<p style="margin:8px 0 28px;text-align:center"><a href="${url}" style="display:inline-block;padding:12px 24px;background:#1a2744;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">${escapeEmailHtml(email.action.label)}</a></p><p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#526174">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="word-break:break-all">${url}</span></p>`;
    bodyText += `\n\n${email.action.label}: ${email.action.url}`;
  }
  return renderInstitutionalEmail(bodyText, bodyHtml, header);
}

/**
 * Envia um e-mail transacional ao solicitante pelo Resend. Fora de produção,
 * sem Resend configurado, só registra o assunto e o link no console para que
 * o fluxo possa ser testado localmente.
 */
export async function sendApplicantEmail(email: ApplicantEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("Resend não configurado.");
    console.info(`[applicant-email] ${email.subject} → ${email.action?.url ?? "(sem link)"}`);
    return;
  }

  const header = await loadDocumentHeader();
  const { html, text } = renderApplicantEmail(email, header);
  const { data, error } = await new Resend(apiKey).emails.send(
    {
      from,
      to: [email.to],
      subject: email.subject,
      text,
      html,
      attachments: institutionalEmailAttachments(html, header.mostrar_selo),
    },
    { signal: AbortSignal.timeout(15_000) }
  );
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("O Resend não confirmou o recebimento da mensagem.");
}
