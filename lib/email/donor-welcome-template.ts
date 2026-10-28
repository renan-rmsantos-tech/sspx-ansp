import {
  resolveDocumentHeader,
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

export const DONOR_EMAIL_FOOTER =
  "Arca Nossa Senhora da Providência\nObra de Assistência Educacional Católica";
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
  const htmlHeader = `
    <div data-email-header style="text-align:center;padding:28px 20px 24px;border-top:3px solid #c9a84c;border-bottom:1px solid #e4e0d7">
      ${resolvedHeader.mostrar_selo ? `<img src="cid:${DOCUMENT_HEADER_SEAL_CID}" width="80" height="80" alt="Selo da Arca Nossa Senhora da Providência" style="display:block;width:80px;height:80px;margin:0 auto 16px">` : ""}
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.3;font-weight:bold;color:#1a2744">${escapeEmailHtml(resolvedHeader.linha1)}</div>
      ${headerLines.slice(1).map((line) => `<div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#526174">${escapeEmailHtml(line)}</div>`).join("")}
    </div>`;

  return {
    text: `${headerLines.join("\n")}\n\n${bodyText.trim()}\n\n${DONOR_EMAIL_FOOTER}`,
    html: `<div lang="pt-BR" style="margin:0;padding:24px 8px;background:#f5f3ee;font-family:Arial,Helvetica,sans-serif;color:#243247;overflow-wrap:anywhere;word-wrap:break-word"><table role="presentation" style="width:100%;max-width:600px;table-layout:fixed;margin:0 auto;border-spacing:0;background:#ffffff"><tbody><tr><td style="padding:0">${htmlHeader}<div data-email-body style="padding:28px 20px 12px;font-size:16px;line-height:1.65">${bodyHtml}</div><div data-email-footer style="padding:24px 20px;text-align:center;border-top:1px solid #e4e0d7;background:#faf9f6"><div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:#1a2744">${escapeEmailHtml(DONOR_EMAIL_FOOTER.split("\n")[0])}</div><div style="margin-top:6px;color:#526174;font-size:12px;line-height:1.6">${escapeEmailHtml(DONOR_EMAIL_FOOTER.split("\n")[1])}</div></div></td></tr></tbody></table></div>`,
  };
}
