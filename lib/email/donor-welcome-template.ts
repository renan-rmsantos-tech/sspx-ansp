import { COMMUNICATION_FONTS } from "@/lib/documents/communication-fonts";
import {
  resolveDocumentHeader,
  DEFAULT_INSTITUTIONAL_FOOTER,
  type DocumentHeaderData,
} from "@/lib/documents/document-header";

export const DONOR_WELCOME_SUBJECT =
  "Recebemos seu cadastro de benfeitor — Arca Nossa Senhora da Providência";

export const DONOR_WELCOME_BODY = `Prezado(a) Benfeitor(a),

Recebemos com muita alegria e gratidão sua contribuição para o Projeto Arca Nossa Senhora da Providência!

Seu gesto de generosidade e confiança nos ajuda a ampliar nossa missão de proporcionar às crianças uma formação educacional verdadeiramente católica, fundada na fé e nos valores cristãos.

Queremos também mantê-lo(a) próximo(a) desta obra, compartilhando periodicamente seus frutos e avanços.

Lembramos ainda que, mensalmente, será celebrada uma Santa Missa na intenção de nossos benfeitores, colocando você e sua família sob a proteção de Nossa Senhora.

Que Nossa Senhora da Providência abençoe você e toda a sua família!`;

export const DONOR_EMAIL_FOOTER = DEFAULT_INSTITUTIONAL_FOOTER;
export const DOCUMENT_HEADER_SEAL_CID = "ansp-document-seal";

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

export function renderDonorWelcomeEmail(
  corpo: string,
  header?: Partial<DocumentHeaderData> | null
) {
  const paragraphs = corpo.trim().split(/\n\s*\n/);
  const htmlBody = paragraphs
    .map((paragraph) =>
      `<p style="margin:0 0 20px;line-height:1.65">${escapeEmailHtml(paragraph).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
  return { bodyHtml: htmlBody, ...renderInstitutionalEmail(corpo, htmlBody, header) };
}

export function renderInstitutionalEmail(
  bodyText: string,
  bodyHtml: string,
  header?: Partial<DocumentHeaderData> | null
) {
  const resolvedHeader = resolveDocumentHeader(header);
  const headerLines = [
    resolvedHeader.linha1,
    resolvedHeader.linha2,
    resolvedHeader.linha3,
  ].filter((line) => line.trim() !== "");
  // Native table alignment survives clients that discard CSS auto margins.
  const htmlHeader = `<table data-email-header role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-spacing:0;border-top:3px solid #c9a84c;border-bottom:1px solid #e4e0d7"><tbody>${resolvedHeader.mostrar_selo ? `<tr><td align="center" style="text-align:center;padding:28px 20px 16px"><img src="cid:${DOCUMENT_HEADER_SEAL_CID}" width="80" height="80" alt="Selo da Arca Nossa Senhora da Providência" style="display:inline-block;width:80px;height:80px"></td></tr>` : ""}<tr><td align="center" style="text-align:center;padding:${resolvedHeader.mostrar_selo ? "0" : "28px"} 20px 24px">${headerLines.map((line, index) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center" style="text-align:center;padding-top:${index === 0 ? "0" : "6px"};font-family:${COMMUNICATION_FONTS.html.heading};font-size:${index === 0 ? "23px" : "13px"};line-height:${index === 0 ? "1.3" : "1.5"};${index === 0 ? "font-weight:bold;color:#1a2744" : "font-weight:bold;color:#526174"}">${escapeEmailHtml(line)}</td></tr></tbody></table>`).join("")}</td></tr></tbody></table>`;

  const footer = resolvedHeader.rodape_institucional ?? "";
  const htmlFooter = footer.trim() ? `<table data-email-footer role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-spacing:0;border-top:1px solid #e4e0d7;background:#faf9f6"><tbody><tr><td align="center" style="padding:24px 20px;text-align:center;font-family:${COMMUNICATION_FONTS.html.body}">${footer.split("\n").map((line, index) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center" style="text-align:center;white-space:pre-wrap;font-family:${COMMUNICATION_FONTS.html.body};${index === 0 ? "font-size:16px;line-height:1.5;color:#1a2744" : "padding-top:6px;color:#526174;font-size:12px;line-height:1.6"}">${escapeEmailHtml(line) || "<br>"}</td></tr></tbody></table>`).join("")}</td></tr></tbody></table>` : "";
  return {
    text: `${headerLines.join("\n")}\n\n${bodyText.trim()}${footer.trim() ? `\n\n${footer}` : ""}`,
    html: `<div lang="pt-BR" style="margin:0;padding:24px 8px;background:#f5f3ee;font-family:${COMMUNICATION_FONTS.html.body};color:#243247;overflow-wrap:anywhere;word-wrap:break-word"><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;table-layout:fixed;margin:0 auto;border-spacing:0;background:#ffffff"><tbody><tr><td style="padding:0">${htmlHeader}<div data-email-body style="padding:28px 20px 12px;font-size:16px;line-height:1.65">${bodyHtml}</div>${htmlFooter}</td></tr></tbody></table></div>`,
  };
}
