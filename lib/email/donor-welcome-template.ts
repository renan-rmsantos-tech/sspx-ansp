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

function escapeHtml(value: string): string {
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
  const resolvedHeader = resolveDocumentHeader(header);
  const headerLines = [
    resolvedHeader.linha1,
    resolvedHeader.linha2,
    resolvedHeader.linha3,
  ].filter((line) => line.trim() !== "");
  const htmlHeader = `
    <div style="text-align:center;padding:24px 32px 14px;border-bottom:1px solid #c9a84c">
      ${resolvedHeader.mostrar_selo ? `<img src="cid:${DOCUMENT_HEADER_SEAL_CID}" width="92" height="92" alt="Selo da Arca Nossa Senhora da Providência" style="display:block;width:92px;height:92px;margin:0 auto 10px">` : ""}
      <div style="font-family:'Times New Roman',Times,serif;font-size:19px;font-weight:bold;color:#1a1a1a">${escapeHtml(resolvedHeader.linha1)}</div>
      ${headerLines.slice(1).map((line) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#444444">${escapeHtml(line)}</div>`).join("")}
    </div>`;
  const paragraphs = corpo.trim().split(/\n\s*\n/);
  const htmlBody = paragraphs
    .map((paragraph) =>
      `<p style="margin:0 0 20px;line-height:1.65">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  return {
    text: `${headerLines.join("\n")}\n\n${corpo.trim()}\n\n${DONOR_EMAIL_FOOTER}`,
    html: `<div style="margin:0;padding:32px 16px;background:#f5f6f7;font-family:Arial,Helvetica,sans-serif;color:#243247"><div style="max-width:600px;margin:0 auto;background:#ffffff">${htmlHeader}<div style="padding:32px;font-size:15px">${htmlBody}</div><div style="padding:20px 32px;border-top:1px solid #e3e5e8;color:#526174;font-size:12px;line-height:1.6">${DONOR_EMAIL_FOOTER.replace("\n", "<br>")}</div></div></div>`,
  };
}
