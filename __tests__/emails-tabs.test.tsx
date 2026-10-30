import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let mockSearch = "";
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/emails",
}));

vi.mock("@/app/admin/_actions/donor-email-actions", () => ({
  saveDonorEmailTemplate: vi.fn(), retryDonorWelcomeEmail: vi.fn(), sendDonorTestEmail: vi.fn(),
}));
vi.mock("@/app/admin/_actions/donor-monthly-instructions-actions", () => ({
  previewDonorMonthlyInstructionsTemplate: vi.fn(), saveDonorMonthlyInstructionsTemplate: vi.fn(),
  sendDonorMonthlyInstructionsTest: vi.fn(),
}));
vi.mock("@/app/admin/_actions/donor-reminder-actions", () => ({
  getDonorReminderDashboard: vi.fn(), previewDonorReminderTemplate: vi.fn(),
  resolveUncertainDonorReminder: vi.fn(), retryFailedDonorReminder: vi.fn(),
  saveDonorReminderTemplate: vi.fn(), sendDonorReminderTest: vi.fn(),
}));

import { EmailsTabs } from "@/app/admin/emails/emails-tabs";
import { DEFAULT_DOCUMENT_HEADER } from "@/lib/documents/document-header";

const header = DEFAULT_DOCUMENT_HEADER;

function show() {
  return render(
    <EmailsTabs
      welcome={{ initialTemplate: { assunto: "Bem-vindo", corpo: "Olá benfeitor" }, initialPending: [], header, resendConfigured: true }}
      monthly={{
        initialTemplate: { assunto: "Instruções {nome}", corpo: "Pague {link_comprovante}" },
        initialPreview: { assunto: "Instruções Maria", bodyHtml: "<p>Instruções mensais</p>" },
        header,
        resendConfigured: true,
      }}
      reminders={{
        initialTemplate: { assunto: "Lembrete", corpo: "Vence {data_vencimento} {link_comprovante}" },
        initialPreview: { assunto: "Lembrete 10/11", bodyHtml: "<p>Lembrete de vencimento</p>" },
        initialSends: [],
        header,
        resendConfigured: true,
      }}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockSearch = "";
});

describe("EmailsTabs", () => {
  // UT-080
  it("abre a aba indicada em ?aba=instrucoes", () => {
    mockSearch = "aba=instrucoes";
    show();
    expect(screen.getByRole("tablist", { name: "Tipo de e-mail" })).toBeInTheDocument();
    expect(screen.getByTestId("tab-instrucoes")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("tab-boas-vindas")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByLabelText("Tokens permitidos")).toHaveTextContent("comprovante do primeiro pagamento");
    expect(screen.getByRole("region", { name: "Pré-visualização" })).toHaveTextContent("Instruções mensais");
    expect(screen.queryByText("Envios pendentes")).not.toBeInTheDocument();
  });

  // UT-081
  it("começa em Boas-vindas e grava a aba escolhida na URL sem rolar", () => {
    show();
    expect(screen.getByTestId("tab-boas-vindas")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Envios pendentes" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Boas-vindas",
      "Instruções de pagamento",
      "Lembretes de vencimento",
    ]);

    fireEvent.click(screen.getByTestId("tab-lembretes"));
    expect(mockReplace).toHaveBeenCalledWith("/admin/emails?aba=lembretes", { scroll: false });
    expect(screen.getByTestId("tab-lembretes")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Lembretes que exigem atenção" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cabeçalho e rodapé" })).toHaveAttribute("href", "/admin/cabecalho");
  });

  it("ignora um valor de aba desconhecido", () => {
    mockSearch = "aba=qualquer";
    show();
    expect(screen.getByTestId("tab-boas-vindas")).toHaveAttribute("aria-selected", "true");
  });
});
