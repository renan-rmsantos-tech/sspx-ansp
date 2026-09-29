export const DONOR_WELCOME_SUBJECT =
  "Recebemos seu cadastro de benfeitor — Arca Nossa Senhora da Providência";

export const DONOR_WELCOME_BODY = `Prezado(a) Benfeitor(a),

Recebemos com muita alegria e gratidão sua contribuição para o Projeto Arca Nossa Senhora da Providência!

Seu gesto de generosidade e confiança nos ajuda a ampliar nossa missão de proporcionar às crianças uma formação educacional verdadeiramente católica, fundada na fé e nos valores cristãos.

Queremos também mantê-lo(a) próximo(a) desta obra, compartilhando periodicamente seus frutos e avanços.

Lembramos ainda que, mensalmente, será celebrada uma Santa Missa na intenção de nossos benfeitores, colocando você e sua família sob a proteção de Nossa Senhora.

Que Nossa Senhora da Providência abençoe você e toda a sua família!`;

export const DONOR_EMAIL_HEADER = "Arca Nossa Senhora da Providência";
export const DONOR_EMAIL_FOOTER =
  "Arca Nossa Senhora da Providência\nObra de Assistência Educacional Católica";

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

export function renderDonorWelcomeEmail(corpo: string) {
  const paragraphs = corpo.trim().split(/\n\s*\n/);
  const htmlBody = paragraphs
    .map((paragraph) =>
      `<p style="margin:0 0 20px;line-height:1.65">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  return {
    text: `${DONOR_EMAIL_HEADER}\n\n${corpo.trim()}\n\n${DONOR_EMAIL_FOOTER}`,
    html: `<div style="margin:0;padding:32px 16px;background:#f5f6f7;font-family:Arial,Helvetica,sans-serif;color:#243247"><div style="max-width:600px;margin:0 auto;background:#ffffff"><div style="padding:24px 32px;background:#1b2d49;color:#ffffff;font-family:Georgia,serif;font-size:20px;font-weight:bold;line-height:1.3">${DONOR_EMAIL_HEADER}</div><div style="padding:32px;font-size:15px">${htmlBody}</div><div style="padding:20px 32px;border-top:1px solid #e3e5e8;color:#526174;font-size:12px;line-height:1.6">${DONOR_EMAIL_FOOTER.replace("\n", "<br>")}</div></div></div>`,
  };
}
