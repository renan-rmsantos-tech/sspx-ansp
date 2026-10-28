import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PIX_DETAILS } from "@/lib/data/pix-details";
import {
  DONOR_MONTHLY_INSTRUCTIONS_BODY,
  DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK,
  DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
  DONOR_MONTHLY_INSTRUCTIONS_TOKENS,
  DonorMonthlyInstructionsTemplateError,
  monthlyInstructionsProviderKey,
  renderDonorMonthlyInstructions,
  renderDonorMonthlyInstructionsPreview,
  validateDonorMonthlyInstructionsTemplate,
} from "@/lib/email/donor-monthly-instructions-template";

const template = {
  assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
  corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY,
};
const values = {
  template,
  nome: "Ana <Silva> & família",
  valor: "1234.50",
  dia_vencimento: 30,
  data_primeiro_vencimento: "2027-02-28",
  duracao: "um_ano" as const,
  receipt_competencia: "2027-02",
  link_comprovante: "https://example.test/benfeitor/comprovante?ticket=abc&mes=02",
  header: { linha1: "Arca <ANSP>", linha2: "Mantenedora", mostrar_selo: false },
};

describe("monthly instructions template", () => {
  it("contains every mandatory fact in the default copy and one receipt token", () => {
    const checked = validateDonorMonthlyInstructionsTemplate(template);
    for (const token of DONOR_MONTHLY_INSTRUCTIONS_TOKENS.filter((item) => item.requiredInBody)) {
      expect(checked.corpo).toContain(`{${token.name}}`);
    }
    expect(checked.corpo.match(/\{link_comprovante\}/g)).toHaveLength(1);
    const rendered = renderDonorMonthlyInstructions(values);
    expect(rendered.assunto).toContain("Instruções do pagamento mensal");
    for (const fact of [PIX_DETAILS.key, PIX_DETAILS.beneficiary, PIX_DETAILS.cnpj, "1.234,50", "30", "28/02/2027", "12 pagamentos mensais", values.link_comprovante]) {
      expect(rendered.text).toContain(fact);
    }
    expect(rendered.text).toContain("fevereiro de 2027");
    expect(rendered.text).toContain("28 ou 29");
    expect(rendered.text).toContain("10 e 5 dias");
    expect(rendered.text).toContain("comprovante é obrigatório para cada pagamento mensal");
    expect(rendered.text).toContain("não confirma o crédito");
    expect(rendered.text).toContain("optou por recebê-los");
    const leapYear = renderDonorMonthlyInstructions({
      ...values,
      data_primeiro_vencimento: "2028-02-29",
      receipt_competencia: "2028-02",
    });
    expect(leapYear.text).toContain("29/02/2028");
    expect(leapYear.text).toContain("28 ou 29");
  });

  it("escapes edited HTML and inserted values, keeps text readable and the receipt link unique", () => {
    const rendered = renderDonorMonthlyInstructions({
      ...values,
      template: {
        assunto: "Olá {nome} — {valor}",
        corpo: "Olá <{nome}> & {valor}\n\nPix: {chave_pix}; {beneficiario_pix}; {cnpj_pix}. Dia {dia_vencimento}; {data_primeiro_vencimento}; {duracao}.\n\n{link_comprovante}",
      },
    });
    expect(rendered.assunto).toContain("Olá Ana <Silva> & família");
    expect(rendered.html).toContain("Olá &lt;Ana &lt;Silva&gt; &amp; família&gt; &amp;");
    expect(rendered.html).toContain("Arca &lt;ANSP&gt;");
    expect(rendered.html).not.toContain("cid:ansp-document-seal");
    expect(rendered.html.match(/<a /g)).toHaveLength(1);
    expect(rendered.html).toContain('href="https://example.test/benfeitor/comprovante?ticket=abc&amp;mes=02"');
    expect(rendered.text).toContain(values.link_comprovante);
  });

  it("retains fixed policy after an administrator edits the body", () => {
    const rendered = renderDonorMonthlyInstructions({
      ...values,
      duracao: "indeterminado",
      template: { ...template, corpo: "{valor} {dia_vencimento} {data_primeiro_vencimento} {duracao} {chave_pix} {beneficiario_pix} {cnpj_pix} {link_comprovante}" },
    });
    expect(rendered.text).toContain("prazo indeterminado");
    expect(rendered.text).toContain("comprovante é obrigatório");
    expect(rendered.text).toContain("conferência no extrato bancário");
    expect(rendered.text).toContain("último dia daquele mês");
    expect(rendered.text).toContain("enviados somente a quem optou");
    const day15 = renderDonorMonthlyInstructions({ ...values, dia_vencimento: 15 });
    expect(day15.text).not.toContain("último dia daquele mês");
  });

  it("rejects unknown, misplaced, malformed, and missing required tokens", () => {
    for (const assunto of ["", "  ", "Olá\nBcc: x", "a".repeat(161), "{link_comprovante}", "{inexistente}", "{nome"]) {
      expect(() => validateDonorMonthlyInstructionsTemplate({ ...template, assunto })).toThrow(DonorMonthlyInstructionsTemplateError);
    }
    for (const corpo of ["", "x".repeat(10_001), `${template.corpo} {inexistente}`, `${template.corpo} {nome`]) {
      expect(() => validateDonorMonthlyInstructionsTemplate({ ...template, corpo })).toThrow(DonorMonthlyInstructionsTemplateError);
    }
    for (const token of DONOR_MONTHLY_INSTRUCTIONS_TOKENS.filter((item) => item.requiredInBody)) {
      expect(() => validateDonorMonthlyInstructionsTemplate({
        ...template, corpo: template.corpo.replace(`{${token.name}}`, "removido"),
      })).toThrow(`{${token.name}}`);
    }
    expect(() => validateDonorMonthlyInstructionsTemplate({
      ...template, corpo: `${template.corpo} {link_comprovante}`,
    })).toThrow("exatamente uma vez");
    expect(validateDonorMonthlyInstructionsTemplate({
      assunto: `  ${template.assunto}  `, corpo: `  ${template.corpo}  `,
    })).toEqual(template);
  });

  it("rejects invalid payment data and unsafe receipt URLs", () => {
    for (const link_comprovante of ["broken", "http://example.test/", "javascript:alert(1)", "https://user:pass@example.test/"]) {
      expect(() => renderDonorMonthlyInstructions({ ...values, link_comprovante })).toThrow("Link de comprovante inválido");
    }
    for (const valor of [0, -1, Number.NaN]) {
      expect(() => renderDonorMonthlyInstructions({ ...values, valor })).toThrow("Valor inválido");
    }
    for (const dia_vencimento of [0, 32, 2.5]) {
      expect(() => renderDonorMonthlyInstructions({ ...values, dia_vencimento })).toThrow("Dia de vencimento inválido");
    }
    expect(() => renderDonorMonthlyInstructions({ ...values, data_primeiro_vencimento: "2027-02-29" })).toThrow("Data do primeiro vencimento inválida");
    expect(() => renderDonorMonthlyInstructions({ ...values, receipt_competencia: "2027-13" })).toThrow("Mês do comprovante inválido");
    expect(() => renderDonorMonthlyInstructions({ ...values, duracao: "invalido" as "um_ano" })).toThrow("Duração inválida");
  });

  it("uses an unmistakably nonfunctional URL for preview and test sends", () => {
    const preview = renderDonorMonthlyInstructionsPreview(template, { mostrar_selo: true });
    expect(preview.text).toContain(DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK);
    expect(preview.text).toContain("Link ilustrativo sem validade");
    expect(preview.text).toContain("comprovante é obrigatório para cada pagamento mensal");
    expect(preview.html).not.toContain(`<a href="${DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK}"`);
    expect(preview.html).toContain("cid:ansp-document-seal");
    expect(preview.html).not.toContain("<a ");
    expect(new URL(DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK).hostname).toBe("exemplo.invalid");
  });

  it("uses stable, generation-specific provider keys and one-line subjects", () => {
    const pledgeId = randomUUID();
    expect(monthlyInstructionsProviderKey(pledgeId, 1)).toBe(monthlyInstructionsProviderKey(pledgeId, 1));
    expect(monthlyInstructionsProviderKey(pledgeId, 1)).not.toBe(monthlyInstructionsProviderKey(pledgeId, 2));
    expect(() => monthlyInstructionsProviderKey("bad", 1)).toThrow("Geração de envio inválida");
    expect(() => monthlyInstructionsProviderKey(pledgeId, 0)).toThrow("Geração de envio inválida");
    const rendered = renderDonorMonthlyInstructions({
      ...values,
      nome: "Ana\r\nBcc: teste@example.test",
      template: { ...template, assunto: "Olá {nome}" },
    });
    expect(rendered.assunto).toBe("Olá Ana Bcc: teste@example.test");
  });
});
