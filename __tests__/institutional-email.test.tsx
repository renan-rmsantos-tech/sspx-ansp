import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { InstitutionalEmailPreview } from "@/app/admin/_components/institutional-email-preview";
import { PIX_DETAILS } from "@/lib/data/pix-details";
import { DONOR_WELCOME_BODY, renderDonorWelcomeEmail } from "@/lib/email/donor-welcome-template";
import { DONOR_MONTHLY_INSTRUCTIONS_BODY, DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, renderDonorMonthlyInstructionsPreview } from "@/lib/email/donor-monthly-instructions-template";
import { DONOR_REMINDER_BODY, DONOR_REMINDER_SUBJECT, renderDonorReminderPreview } from "@/lib/email/donor-reminder-template";
import { institutionalEmailAttachments } from "@/lib/email/institutional-email-attachments";
import { DONOR_PIX_QR_CID } from "@/lib/email/donor-payment-details";

const header = { linha1: "Arca <institucional>", linha2: "", linha3: "Itatiba/SP", mostrar_selo: true };
const monthly = { assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY };
const reminder = { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };

afterEach(cleanup);

describe("shared institutional email", () => {
  it.each([true, false])("uses identical header/footer across all email types and browser previews (seal %s)", (seal) => {
    const settings = { ...header, mostrar_selo: seal };
    const messages = [renderDonorWelcomeEmail(DONOR_WELCOME_BODY, settings),
      renderDonorMonthlyInstructionsPreview(monthly, settings), renderDonorReminderPreview(reminder, settings)];
    const chrome = messages.map((message) => {
      const { container, unmount } = render(<InstitutionalEmailPreview bodyHtml={message.bodyHtml} header={settings} />);
      expect(container.querySelectorAll("[data-email-header]")).toHaveLength(1);
      expect(container.querySelectorAll("[data-email-footer]")).toHaveLength(1);
      expect(container.querySelector("[data-email-header]")).toHaveTextContent("Itatiba/SP");
      const markup = document.createElement("div");
      markup.innerHTML = message.html;
      expect(container.textContent).toBe(markup.textContent);
      expect(container.querySelector("[data-email-header] img") !== null).toBe(seal);
      expect(container.innerHTML).not.toContain('src="cid:');
      const result = [markup.querySelector("[data-email-header]")!.outerHTML, markup.querySelector("[data-email-footer]")!.outerHTML];
      unmount();
      return result;
    });
    expect(chrome[0]).toEqual(chrome[1]);
    expect(chrome[1]).toEqual(chrome[2]);
  });

  it.each(["instructions", "reminder"])("adds complete details to %s even with custom saved text", (kind) => {
    const custom = kind === "instructions"
      ? { ...monthly, corpo: `Orientação personalizada.\n\n${monthly.corpo}\n\nAgradecemos a colaboração.` }
      : { ...reminder, corpo: "Orientação personalizada.\n\nEnvie pelo link {link_comprovante}." };
    const message = kind === "instructions"
      ? renderDonorMonthlyInstructionsPreview(custom, header) : renderDonorReminderPreview(custom, header);
    expect(message.text).toContain("Orientação personalizada.");
    for (const value of [PIX_DETAILS.key, PIX_DETAILS.beneficiary, PIX_DETAILS.cnpj, PIX_DETAILS.bank, "Agência: 0197", "Conta: 13.008.003-2"]) {
      expect(message.text).toContain(value);
    }
    const { container } = render(<InstitutionalEmailPreview bodyHtml={message.bodyHtml} header={header} />);
    expect(container.querySelectorAll("[data-email-payment-details]")).toHaveLength(1);
    const qr = container.querySelector("[data-email-payment-details] img")!;
    expect(qr).toHaveAttribute("src", PIX_DETAILS.qrCode);
    expect(qr).toHaveAttribute("alt", "QR Code Pix da ACIPEC para pagamento da contribuição");
    expect(message.text).toContain("Link ilustrativo sem validade");
    expect(message.text).toContain("EXEMPLO-SEM-VALIDADE");
    expect(custom.corpo).toContain("Orientação personalizada.");
  });

  it.each([true, false])("attaches the actual QR only to referencing HTML, independently of seal (%s)", (seal) => {
    const message = renderDonorReminderPreview(reminder, { ...header, mostrar_selo: seal });
    const attachments = institutionalEmailAttachments(message.html, seal)!;
    expect(attachments.map((entry) => entry.contentId).sort()).toEqual([
      ...(seal ? ["ansp-document-seal"] : []), DONOR_PIX_QR_CID,
    ].sort());
    expect(attachments.find((entry) => entry.contentId === DONOR_PIX_QR_CID)?.content)
      .toEqual(readFileSync("public/pix-acipec.png"));
    const legacy = institutionalEmailAttachments("<p>Frozen old content</p>", seal);
    expect(legacy?.map((entry) => entry.contentId)).toEqual(seal ? ["ansp-document-seal"] : undefined);
  });

  it("consolidates bank details in the default bodies", () => {
    for (const message of [renderDonorMonthlyInstructionsPreview(monthly), renderDonorReminderPreview(reminder)]) {
      expect(message.text.split(PIX_DETAILS.key)).toHaveLength(2);
    }
  });
});
