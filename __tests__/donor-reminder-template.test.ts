import { describe, expect, it } from "vitest";
import {
  DONOR_REMINDER_BODY,
  LEGACY_DONOR_REMINDER_BODY,
  DONOR_REMINDER_SAMPLE_LINK,
  DONOR_REMINDER_SUBJECT,
  DonorReminderTemplateError,
  reminderProviderKey,
  normalizeLegacyDonorReminderTemplate,
  renderDonorReminder,
  renderDonorReminderPreview,
  validateDonorReminderTemplate,
} from "@/lib/email/donor-reminder-template";
import { PIX_DETAILS } from "@/lib/data/pix-details";

const template = { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };
const values = {
  template,
  nome: "Ana <Silva> & família",
  valor: "1234.50",
  data_vencimento: "2026-11-15",
  mes_referencia: "2026-11",
  link_comprovante: "https://example.test/benfeitor/comprovante?ticket=abc&mes=11",
  header: { linha1: "Arca <ANSP>", linha2: "Mantenedora", linha3: "", mostrar_selo: false },
};

describe("donor reminder template", () => {
  it("escapes inserted and edited HTML while formatting currency and dates in pt-BR", () => {
    const rendered = renderDonorReminder(values);
    expect(rendered.assunto).toContain("novembro de 2026 vence em 15/11/2026");
    expect(rendered.text).toContain("Ana <Silva> & família");
    expect(rendered.text).toContain("R$ 1.234,50");
    expect(rendered.text).toContain(PIX_DETAILS.key);
    expect(rendered.html).toContain("Ana &lt;Silva&gt; &amp; família");
    expect(rendered.html).not.toContain("Ana <Silva>");
    expect(rendered.html).toContain("Arca &lt;ANSP&gt;");
    expect(rendered.html).not.toContain("cid:ansp-document-seal");
  });

  it("includes exactly one escaped HTTPS anchor and one readable text URL", () => {
    const rendered = renderDonorReminder({
      ...values,
      template: { assunto: "Lembrete {valor}", corpo: "Olá <{nome}>\n\n{link_comprovante}" },
    });
    expect(rendered.html.match(/<a /g)).toHaveLength(1);
    expect(rendered.html).toContain('href="https://example.test/benfeitor/comprovante?ticket=abc&amp;mes=11"');
    expect(rendered.html).toContain("Olá &lt;Ana &lt;Silva&gt; &amp; família&gt;");
    expect(rendered.text).toContain(values.link_comprovante);
    expect(rendered.text).toContain("Olá <Ana <Silva> & família>");
    expect(rendered.assunto).toContain("R$ 1.234,50");
    expect(rendered.text).toContain("O comprovante deste pagamento mensal é obrigatório");
    expect(rendered.text).toContain("não confirma o crédito");
  });

  it("normalizes the legacy default and only the obsolete sentence in saved custom copy", () => {
    expect(normalizeLegacyDonorReminderTemplate({ ...template, corpo: LEGACY_DONOR_REMINDER_BODY }).corpo)
      .toBe(DONOR_REMINDER_BODY);
    const custom = "Texto próprio. O comprovante é opcional. Outra orientação: {link_comprovante}";
    expect(normalizeLegacyDonorReminderTemplate({ ...template, corpo: custom }).corpo)
      .toBe("Texto próprio. Outra orientação: {link_comprovante}");
    const rendered = renderDonorReminder({ ...values, template: { ...template, corpo: custom } });
    expect(rendered.text).toContain("Texto próprio.");
    expect(rendered.text).not.toContain("opcional");
    expect(rendered.text).toContain("obrigatório");
  });

  it("rejects new claims that the monthly receipt or its upload is optional", () => {
    for (const body of [
      "O comprovante é opcional. {link_comprovante}",
      "É opcional enviar o comprovante. {link_comprovante}",
      "O envio do comprovante é opcional. {link_comprovante}",
    ]) {
      expect(() => validateDonorReminderTemplate({ ...template, corpo: body })).toThrow("obrigatório");
    }
  });

  it("rejects unsafe links before rendering", () => {
    for (const link of ["javascript:alert(1)", "http://example.test/", "https://user:pass@example.test/", "broken"]) {
      expect(() => renderDonorReminder({ ...values, link_comprovante: link })).toThrow("Link de comprovante inválido");
    }
  });

  it("rejects unknown tokens, malformed braces, empty and multiline subjects", () => {
    for (const assunto of ["", "   ", "Assunto\nBcc: attacker", "Assunto\routro", "a".repeat(161), "Olá {desconhecido}", "Olá {nome", "{link_comprovante}"]) {
      expect(() => validateDonorReminderTemplate({ ...template, assunto })).toThrow(DonorReminderTemplateError);
    }
    for (const corpo of ["", "x".repeat(10_001), "Olá {desconhecido} {link_comprovante}", "Olá {nome {link_comprovante}"]) {
      expect(() => validateDonorReminderTemplate({ ...template, corpo })).toThrow(DonorReminderTemplateError);
    }
  });

  it("requires the receipt token exactly once in the body", () => {
    expect(() => validateDonorReminderTemplate({ ...template, corpo: "Olá {nome}" })).toThrow("exatamente uma vez");
    expect(() => validateDonorReminderTemplate({ ...template, corpo: "{link_comprovante} {link_comprovante}" })).toThrow("exatamente uma vez");
    expect(() => validateDonorReminderTemplate({ ...template, assunto: "{link_comprovante}" })).toThrow(DonorReminderTemplateError);
  });

  it("normalizes valid edits and rejects invalid numeric and calendar data", () => {
    expect(validateDonorReminderTemplate({ assunto: "  Oi  ", corpo: "  Link: {link_comprovante}  " })).toEqual({
      assunto: "Oi", corpo: "Link: {link_comprovante}",
    });
    expect(() => renderDonorReminder({ ...values, valor: Number.NaN })).toThrow("Valor inválido");
    expect(() => renderDonorReminder({ ...values, valor: -1 })).toThrow("Valor inválido");
    expect(() => renderDonorReminder({ ...values, data_vencimento: "2026-02-30" })).toThrow("Data de vencimento inválida");
    expect(() => renderDonorReminder({ ...values, data_vencimento: "tomorrow" })).toThrow("Data de vencimento inválida");
    expect(() => renderDonorReminder({ ...values, mes_referencia: "2026-13" })).toThrow("Mês de referência inválido");
  });

  it("keeps line breaks in donor values out of the resolved subject", () => {
    const rendered = renderDonorReminder({
      ...values,
      nome: "Ana\r\nBcc: outra@example.test",
      template: { assunto: "Olá {nome}", corpo: "{link_comprovante}" },
    });
    expect(rendered.assunto).toBe("Olá Ana Bcc: outra@example.test");
    expect(rendered.assunto).not.toMatch(/[\r\n]/);
  });

  it("uses an obviously nonfunctional receipt URL for previews", () => {
    const preview = renderDonorReminderPreview(template, { mostrar_selo: true });
    expect(preview.text).toContain(DONOR_REMINDER_SAMPLE_LINK);
    expect(preview.html).toContain("cid:ansp-document-seal");
    expect(preview.html.match(/<a /g)).toHaveLength(1);
    expect(preview.assunto).toContain("novembro de 2026");
  });

  it("derives a stable provider key from the unique send tuple", () => {
    const one = reminderProviderKey("pledge", "2026-11", "10d");
    expect(one).toBe(reminderProviderKey("pledge", "2026-11", "10d"));
    expect(one).not.toBe(reminderProviderKey("pledge", "2026-11", "5d"));
  });
});
