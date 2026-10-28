import type { DocumentHeaderData } from "@/lib/documents/document-header";
import { PIX_DETAILS } from "@/lib/data/pix-details";
import {
  escapeEmailHtml,
  renderInstitutionalEmail,
} from "@/lib/email/donor-welcome-template";

export const DONOR_REMINDER_SUBJECT =
  "Sua contribuição de {mes_referencia} vence em {data_vencimento}";

export const LEGACY_DONOR_REMINDER_BODY = `Prezado(a) {nome},

Sua contribuição de {valor}, referente a {mes_referencia}, vence em {data_vencimento}.

Chave Pix: {chave_pix}

Se já fez o pagamento, você pode enviar o comprovante deste mês pelo link: {link_comprovante}

O comprovante é opcional. A confirmação do pagamento depende da conferência bancária.`;

export const DONOR_REMINDER_BODY = `Prezado(a) {nome},

Sua contribuição de {valor}, referente a {mes_referencia}, vence em {data_vencimento}.

Chave Pix: {chave_pix}

Depois de pagar, envie o comprovante obrigatório desta competência pelo link: {link_comprovante}

O envio do comprovante não confirma o crédito. A confirmação depende da conferência bancária.`;

const REQUIRED_RECEIPT_NOTE =
  "O comprovante deste pagamento mensal é obrigatório. Enviá-lo não confirma o crédito; a Arca verificará o extrato bancário.";
const LEGACY_OPTIONAL_SENTENCE = /O comprovante é opcional\.[ \t]*/gi;

export const DONOR_REMINDER_SAMPLE_LINK =
  "https://exemplo.invalid/benfeitor/comprovante?ticket=EXEMPLO-SEM-VALIDADE";

const SUBJECT_TOKENS = new Set([
  "nome", "valor", "data_vencimento", "mes_referencia", "chave_pix",
]);
const BODY_TOKENS = new Set([...SUBJECT_TOKENS, "link_comprovante"]);
const TOKEN = /\{([^{}]+)\}/g;

export type DonorReminderTemplate = { assunto: string; corpo: string };

export class DonorReminderTemplateError extends Error {
  constructor(public readonly field: "assunto" | "corpo", message: string) {
    super(message);
    this.name = "DonorReminderTemplateError";
  }
}

/** Apply only the known obsolete sentence; keep the administrator's other edits. */
export function normalizeLegacyDonorReminderTemplate(input: DonorReminderTemplate): DonorReminderTemplate {
  if (input.corpo === LEGACY_DONOR_REMINDER_BODY) {
    return { ...input, corpo: DONOR_REMINDER_BODY };
  }
  return { ...input, corpo: input.corpo.replace(LEGACY_OPTIONAL_SENTENCE, "") };
}

function checkTokens(value: string, allowed: Set<string>, field: "assunto" | "corpo") {
  const tokens = [...value.matchAll(TOKEN)];
  for (const match of tokens) {
    if (!allowed.has(match[1])) {
      throw new DonorReminderTemplateError(field, `Token não permitido: {${match[1]}}.`);
    }
  }
  if (value.replace(TOKEN, "").includes("{") || value.replace(TOKEN, "").includes("}")) {
    throw new DonorReminderTemplateError(field, "Chaves devem conter um token permitido.");
  }
  return tokens;
}

export function validateDonorReminderTemplate(input: DonorReminderTemplate): DonorReminderTemplate {
  const assunto = input.assunto?.trim();
  const corpo = input.corpo?.trim();
  if (!assunto || assunto.length > 160 || /[\r\n\u2028\u2029]/.test(assunto)) {
    throw new DonorReminderTemplateError("assunto", "Informe um assunto de até 160 caracteres, em uma linha.");
  }
  checkTokens(assunto, SUBJECT_TOKENS, "assunto");
  if (!corpo || corpo.length > 10_000) {
    throw new DonorReminderTemplateError("corpo", "Informe um texto de até 10.000 caracteres.");
  }
  if (/(?:comprovante|envio)[^.!?\n]{0,100}\bopcional\b|\bopcional\b[^.!?\n]{0,100}(?:comprovante|envio)/i.test(corpo)) {
    throw new DonorReminderTemplateError("corpo", "O comprovante mensal é obrigatório; remova a indicação de que é opcional.");
  }
  const tokens = checkTokens(corpo, BODY_TOKENS, "corpo");
  if (tokens.filter((match) => match[1] === "link_comprovante").length !== 1) {
    throw new DonorReminderTemplateError(
      "corpo",
      "O texto deve conter {link_comprovante} exatamente uma vez."
    );
  }
  return { assunto, corpo };
}

function formatDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Data de vencimento inválida.");
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (value.toISOString().slice(0, 10) !== date) {
    throw new Error("Data de vencimento inválida.");
  }
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value);
}

function formatMonth(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Mês de referência inválido.");
  }
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

function receiptUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Link de comprovante inválido.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Link de comprovante inválido.");
  }
  return url.toString();
}

export function reminderProviderKey(pledgeId: string, competencia: string, kind: "10d" | "5d") {
  return `donor-reminder-v1:${pledgeId}:${competencia}:${kind}`;
}

export function renderDonorReminder(input: {
  template: DonorReminderTemplate;
  nome: string;
  valor: number | string;
  data_vencimento: string;
  mes_referencia: string;
  link_comprovante: string;
  header?: Partial<DocumentHeaderData> | null;
}) {
  const template = validateDonorReminderTemplate(normalizeLegacyDonorReminderTemplate(input.template));
  const amount = Number(input.valor);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Valor inválido.");
  const values = {
    nome: input.nome,
    valor: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount),
    data_vencimento: formatDate(input.data_vencimento),
    mes_referencia: formatMonth(input.mes_referencia),
    chave_pix: PIX_DETAILS.key,
    link_comprovante: receiptUrl(input.link_comprovante),
  };
  const replaceText = (text: string) =>
    text.replace(TOKEN, (_, key: string) => values[key as keyof typeof values]);
  const assunto = template.assunto.replace(TOKEN, (_, key: string) =>
    values[key as keyof typeof values].replace(/[\r\n\u2028\u2029]+/g, " ")
  );
  const bodyText = `${replaceText(template.corpo)}\n\n${REQUIRED_RECEIPT_NOTE}`;
  const htmlBody = template.corpo.split(/\n\s*\n/).map((paragraph) => {
    let html = "";
    let last = 0;
    for (const match of paragraph.matchAll(TOKEN)) {
      html += escapeEmailHtml(paragraph.slice(last, match.index)).replace(/\n/g, "<br>");
      const key = match[1] as keyof typeof values;
      if (key === "link_comprovante") {
        const url = escapeEmailHtml(values.link_comprovante);
        html += `<a href="${url}" rel="noopener noreferrer">Enviar comprovante</a>`;
      } else {
        html += escapeEmailHtml(values[key]);
      }
      last = match.index + match[0].length;
    }
    html += escapeEmailHtml(paragraph.slice(last)).replace(/\n/g, "<br>");
    return `<p style="margin:0 0 20px;line-height:1.65">${html}</p>`;
  }).join("") + `<p style="margin:0 0 20px;line-height:1.65">${escapeEmailHtml(REQUIRED_RECEIPT_NOTE)}</p>`;
  return { assunto, bodyHtml: htmlBody, ...renderInstitutionalEmail(bodyText, htmlBody, input.header) };
}

export function renderDonorReminderPreview(
  template: DonorReminderTemplate,
  header?: Partial<DocumentHeaderData> | null
) {
  return renderDonorReminder({
    template,
    nome: "Benfeitor de exemplo",
    valor: 100,
    data_vencimento: "2026-11-15",
    mes_referencia: "2026-11",
    link_comprovante: DONOR_REMINDER_SAMPLE_LINK,
    header,
  });
}
