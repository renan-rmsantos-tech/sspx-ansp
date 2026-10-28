import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { DonorMonthlyInstructionsClient } from "@/app/admin/instrucoes-benfeitores/client";
import { DEFAULT_DOCUMENT_HEADER } from "@/lib/documents/document-header";
import {
  DONOR_MONTHLY_INSTRUCTIONS_BODY,
  DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
  renderDonorMonthlyInstructionsPreview,
} from "@/lib/email/donor-monthly-instructions-template";

vi.mock("@/app/admin/_actions/donor-monthly-instructions-actions", () => ({
  previewDonorMonthlyInstructionsTemplate: vi.fn(),
  saveDonorMonthlyInstructionsTemplate: vi.fn(),
  sendDonorMonthlyInstructionsTest: vi.fn(),
}));

afterEach(cleanup);

describe("monthly instructions preview", () => {
  it("explains the first required receipt link and shows a nonfunctional example", () => {
    const template = { assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY };
    const preview = renderDonorMonthlyInstructionsPreview(template, DEFAULT_DOCUMENT_HEADER);
    render(<DonorMonthlyInstructionsClient initialTemplate={template}
      initialPreview={{ assunto: preview.assunto, bodyHtml: preview.bodyHtml }}
      header={DEFAULT_DOCUMENT_HEADER} resendConfigured />);

    const tokens = screen.getByLabelText("Tokens permitidos");
    expect(tokens).toHaveTextContent("link obrigatório do comprovante do primeiro pagamento");
    expect(tokens).toHaveTextContent("Cada pagamento mensal exige seu próprio comprovante");
    const region = screen.getByRole("region", { name: "Pré-visualização" });
    expect(region).toHaveTextContent("não permite enviar comprovantes");
    expect(region).toHaveTextContent("comprovante é obrigatório para cada pagamento mensal");
    expect(within(region).queryByRole("link")).not.toBeInTheDocument();
  });
});
