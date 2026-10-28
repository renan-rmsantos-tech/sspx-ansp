import type { DocumentHeaderData } from "@/lib/documents/document-header";
import { PIX_DETAILS } from "@/lib/data/pix-details";
import { escapeEmailHtml, renderInstitutionalEmail } from "./donor-welcome-template";

export const DONOR_MONTHLY_INSTRUCTIONS_SUBJECT =
  "Instruções do pagamento mensal — Arca Nossa Senhora da Providência";

export const DONOR_MONTHLY_INSTRUCTIONS_BODY = `Prezado(a) {nome},

Para sua contribuição mensal de {valor}, faça o pagamento por Pix com os dados abaixo:
Chave Pix: {chave_pix}
Beneficiário: {beneficiario_pix}
CNPJ: {cnpj_pix}

Dia escolhido para o vencimento: {dia_vencimento}. Primeiro vencimento: {data_primeiro_vencimento}. Duração: {duracao}.

Após o pagamento, envie o comprovante obrigatório da parcela indicada neste link: {link_comprovante}`;

export const DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK =
  "https://exemplo.invalid/benfeitor/comprovante?ticket=EXEMPLO-SEM-VALIDADE";

/** Também alimenta a lista de tokens e regras do futuro editor administrativo. */
export const DONOR_MONTHLY_INSTRUCTIONS_TOKENS = [
  { name: "nome", description: "Nome do benfeitor", requiredInBody: false, subjectAllowed: true },
  { name: "valor", description: "Valor da contribuição", requiredInBody: true, subjectAllowed: true },
  { name: "dia_vencimento", description: "Dia mensal escolhido", requiredInBody: true, subjectAllowed: true },
  { name: "data_primeiro_vencimento", description: "Data do primeiro vencimento", requiredInBody: true, subjectAllowed: true },
  { name: "duracao", description: "Um ano (12 parcelas) ou prazo indeterminado", requiredInBody: true, subjectAllowed: true },
  { name: "chave_pix", description: "Chave Pix institucional", requiredInBody: true, subjectAllowed: true },
  { name: "beneficiario_pix", description: "Beneficiário Pix institucional", requiredInBody: true, subjectAllowed: true },
  { name: "cnpj_pix", description: "CNPJ do beneficiário", requiredInBody: true, subjectAllowed: true },
  { name: "link_comprovante", description: "Link obrigatório para o comprovante da parcela indicada; exatamente uma vez no corpo", requiredInBody: true, subjectAllowed: false },
] as const;

const TOKEN = /\{([^{}]+)\}/g;
const BODY_TOKENS = new Set<string>(DONOR_MONTHLY_INSTRUCTIONS_TOKENS.map(({ name }) => name));
const SUBJECT_TOKENS = new Set<string>(DONOR_MONTHLY_INSTRUCTIONS_TOKENS
  .filter(({ subjectAllowed }) => subjectAllowed)
  .map(({ name }) => name));

export type DonorMonthlyInstructionsTemplate = { assunto: string; corpo: string };

export class DonorMonthlyInstructionsTemplateError extends Error {
  constructor(public readonly field: "assunto" | "corpo", message: string) {
    super(message);
    this.name = "DonorMonthlyInstructionsTemplateError";
  }
}

function validateTokens(value: string, allowed: Set<string>, field: "assunto" | "corpo") {
  const tokens = [...value.matchAll(TOKEN)].map((match) => match[1]);
  for (const token of tokens) {
    if (!allowed.has(token)) {
      throw new DonorMonthlyInstructionsTemplateError(field, `Token não permitido: {${token}}.`);
    }
  }
  if (/[{}]/.test(value.replace(TOKEN, ""))) {
    throw new DonorMonthlyInstructionsTemplateError(field, "Chaves devem conter um token permitido.");
  }
  return tokens;
}

export function validateDonorMonthlyInstructionsTemplate(
  input: DonorMonthlyInstructionsTemplate
): DonorMonthlyInstructionsTemplate {
  const assunto = input.assunto?.trim();
  const corpo = input.corpo?.trim();
  if (!assunto || assunto.length > 160 || /[\r\n\u2028\u2029]/.test(assunto)) {
    throw new DonorMonthlyInstructionsTemplateError("assunto", "Informe um assunto de até 160 caracteres, em uma linha.");
  }
  validateTokens(assunto, SUBJECT_TOKENS, "assunto");
  if (!corpo || corpo.length > 10_000) {
    throw new DonorMonthlyInstructionsTemplateError("corpo", "Informe um texto de até 10.000 caracteres.");
  }
  const tokens = validateTokens(corpo, BODY_TOKENS, "corpo");
  for (const { name, requiredInBody } of DONOR_MONTHLY_INSTRUCTIONS_TOKENS) {
    if (!requiredInBody) continue;
    const count = tokens.filter((token) => token === name).length;
    if (count === 0 || (name === "link_comprovante" && count !== 1)) {
      const rule = name === "link_comprovante" ? "exatamente uma vez" : "ao menos uma vez";
      throw new DonorMonthlyInstructionsTemplateError("corpo", `O texto deve conter {${name}} ${rule}.`);
    }
  }
  return { assunto, corpo };
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Data do primeiro vencimento inválida.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) {
    throw new Error("Data do primeiro vencimento inválida.");
  }
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function formatMonth(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error("Mês do comprovante inválido.");
  }
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}-01T12:00:00Z`));
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

export function monthlyInstructionsProviderKey(pledgeId: string, generation: number): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pledgeId) ||
      !Number.isSafeInteger(generation) || generation < 1) {
    throw new Error("Geração de envio inválida.");
  }
  return `donor-monthly-instructions-v1:${pledgeId}:${generation}`;
}

export function renderDonorMonthlyInstructions(input: {
  template: DonorMonthlyInstructionsTemplate;
  nome: string;
  valor: number | string;
  dia_vencimento: number;
  data_primeiro_vencimento: string;
  duracao: "um_ano" | "indeterminado";
  receipt_competencia: string;
  link_comprovante: string;
  header?: Partial<DocumentHeaderData> | null;
}) {
  const template = validateDonorMonthlyInstructionsTemplate(input.template);
  const amount = Number(input.valor);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor inválido.");
  if (!Number.isInteger(input.dia_vencimento) || input.dia_vencimento < 1 || input.dia_vencimento > 31) {
    throw new Error("Dia de vencimento inválido.");
  }
  if (input.duracao !== "um_ano" && input.duracao !== "indeterminado") {
    throw new Error("Duração inválida.");
  }
  const month = formatMonth(input.receipt_competencia);
  const values = {
    nome: input.nome,
    valor: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount),
    dia_vencimento: String(input.dia_vencimento),
    data_primeiro_vencimento: formatDate(input.data_primeiro_vencimento),
    duracao: input.duracao === "um_ano" ? "um ano (12 pagamentos mensais)" : "prazo indeterminado",
    chave_pix: PIX_DETAILS.key,
    beneficiario_pix: PIX_DETAILS.beneficiary,
    cnpj_pix: PIX_DETAILS.cnpj,
    link_comprovante: receiptUrl(input.link_comprovante),
  };
  const policy = [
    `O link acima é para o comprovante do pagamento de ${month}. O comprovante é obrigatório para cada pagamento mensal. Enviá-lo não confirma o crédito; a confirmação depende da conferência no extrato bancário.`,
    input.dia_vencimento >= 30
      ? `Quando o mês não tiver o dia ${input.dia_vencimento}, o vencimento será no último dia daquele mês (em fevereiro, passa para 28 ou 29).`
      : "",
    "Os lembretes por e-mail são enviados somente a quem optou por recebê-los, 10 e 5 dias antes do vencimento real, enquanto o comprovante da parcela estiver pendente e apenas se as datas previstas não forem anteriores ao cadastro.",
    input.link_comprovante === DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK
      ? "Link ilustrativo sem validade: não permite enviar comprovantes."
      : "",
  ].filter(Boolean).join("\n\n");
  const replaceText = (value: string) => value.replace(TOKEN, (_, key: string) => values[key as keyof typeof values]);
  const assunto = template.assunto.replace(TOKEN, (_, key: string) =>
    values[key as keyof typeof values].replace(/[\r\n\u2028\u2029]+/g, " ")
  );
  const bodyText = `${replaceText(template.corpo)}\n\n${policy}`;
  const htmlBody = template.corpo.split(/\n\s*\n/).map((paragraph) => {
    let html = "";
    let last = 0;
    for (const match of paragraph.matchAll(TOKEN)) {
      html += escapeEmailHtml(paragraph.slice(last, match.index)).replace(/\n/g, "<br>");
      const key = match[1] as keyof typeof values;
      if (key === "link_comprovante") {
        html += values.link_comprovante === DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK
          ? `${escapeEmailHtml(values.link_comprovante)} (link ilustrativo sem validade)`
          : `<a href="${escapeEmailHtml(values.link_comprovante)}" rel="noopener noreferrer">Enviar comprovante de ${escapeEmailHtml(month)}</a>`;
      } else {
        html += escapeEmailHtml(values[key]);
      }
      last = match.index + match[0].length;
    }
    html += escapeEmailHtml(paragraph.slice(last)).replace(/\n/g, "<br>");
    return `<p style="margin:0 0 20px;line-height:1.65">${html}</p>`;
  }).join("") + policy.split(/\n\s*\n/).map((paragraph) =>
    `<p style="margin:0 0 20px;line-height:1.65">${escapeEmailHtml(paragraph)}</p>`
  ).join("");
  return { assunto, bodyHtml: htmlBody, ...renderInstitutionalEmail(bodyText, htmlBody, input.header) };
}

export function renderDonorMonthlyInstructionsPreview(
  template: DonorMonthlyInstructionsTemplate,
  header?: Partial<DocumentHeaderData> | null
) {
  return renderDonorMonthlyInstructions({
    template,
    nome: "Benfeitor de exemplo",
    valor: 100,
    dia_vencimento: 30,
    data_primeiro_vencimento: "2027-02-28",
    duracao: "um_ano",
    receipt_competencia: "2027-02",
    link_comprovante: DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK,
    header,
  });
}
