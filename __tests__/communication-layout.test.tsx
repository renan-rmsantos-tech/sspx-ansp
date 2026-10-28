import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { COMMUNICATION_FONTS } from "@/lib/documents/communication-fonts";
import { DEFAULT_DOCUMENT_HEADER } from "@/lib/documents/document-header";
import { DocumentHeaderPreview } from "@/app/admin/_components/document-header-preview";
import { DocumentFooterPreview } from "@/app/admin/_components/document-footer-preview";
import { renderDonorWelcomeEmail } from "@/lib/email/donor-welcome-template";
import { renderDonorMonthlyInstructionsPreview, DONOR_MONTHLY_INSTRUCTIONS_BODY, DONOR_MONTHLY_INSTRUCTIONS_SUBJECT } from "@/lib/email/donor-monthly-instructions-template";
import { renderDonorReminderPreview, DONOR_REMINDER_BODY, DONOR_REMINDER_SUBJECT } from "@/lib/email/donor-reminder-template";

afterEach(cleanup);

function expectedFont(family: string) {
  const element = document.createElement("span");
  element.style.fontFamily = family;
  return element.style.fontFamily;
}

it.each([true, false])("keeps every image and chrome line natively centered when CSS alignment is removed (seal %s)", (seal) => {
  const settings = { linha1: "Arca & <instituição>", linha2: "", linha3: "", mostrar_selo: seal, rodape_institucional: "Rodapé <personalizado>\nItatiba".replace(/\\n/g, "\n") };
  const messages = [
    renderDonorWelcomeEmail("Obrigado.", settings),
    renderDonorMonthlyInstructionsPreview({ assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY }, settings),
    renderDonorReminderPreview({ assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY }, settings),
  ];
  for (const message of messages) {
    const root = document.createElement("div");
    root.innerHTML = message.html;
    // Model mail sanitizers without depending on a browser's CSS centering.
    root.querySelectorAll<HTMLElement>("[style]").forEach(element => {
      element.style.removeProperty("text-align");
      element.style.removeProperty("margin");
    });
    expect(root.querySelector("[data-email-header]")?.tagName).toBe("TABLE");
    expect(root.querySelector("[data-email-header]")?.textContent).toContain(settings.linha1);
    expect(root.querySelectorAll("[data-email-header] img")).toHaveLength(seal ? 1 : 0);
    for (const cell of root.querySelectorAll("[data-email-header] td, [data-email-footer] td, [data-email-payment-qr] td")) {
      expect(cell.getAttribute("align")).toBe("center");
    }
    for (const image of root.querySelectorAll("img")) expect(image.parentElement?.getAttribute("align")).toBe("center");
    expect(root.querySelector("[data-email-header] td[style*='font-family']")?.getAttribute("style")).toContain(expectedFont(COMMUNICATION_FONTS.html.heading));
    expect(root.querySelector("[data-email-footer] td")?.getAttribute("style")).toContain(expectedFont(COMMUNICATION_FONTS.html.body));
    expect(root.querySelector("script")).toBeNull();
  }
});

it("uses the communication policy for both administrative previews and omits a cleared footer", () => {
  const { container, rerender } = render(<><DocumentHeaderPreview header={DEFAULT_DOCUMENT_HEADER} /><DocumentFooterPreview header={DEFAULT_DOCUMENT_HEADER} /></>);
  expect(container.firstElementChild?.getAttribute("style")).toContain(expectedFont(COMMUNICATION_FONTS.html.heading));
  expect(container.querySelector("[data-testid='footer-preview']")?.getAttribute("style")).toContain(expectedFont(COMMUNICATION_FONTS.html.body));
  expect(container.querySelector(".font-heading")).toBeNull();
  rerender(<DocumentFooterPreview header={{ ...DEFAULT_DOCUMENT_HEADER, rodape_institucional: "" }} />);
  expect(container.querySelector("[data-testid='footer-preview']")).toBeNull();
  expect(renderDonorWelcomeEmail("Obrigado", { rodape_institucional: "" }).html).not.toContain("data-email-footer");
});
