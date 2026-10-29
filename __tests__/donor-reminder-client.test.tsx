import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  getDonorReminderDashboard: vi.fn(), previewDonorReminderTemplate: vi.fn(),
  resolveUncertainDonorReminder: vi.fn(), retryFailedDonorReminder: vi.fn(),
  saveDonorReminderTemplate: vi.fn(), sendDonorReminderTest: vi.fn(),
}));
vi.mock("@/app/admin/_actions/donor-reminder-actions", () => actions);

import { DonorReminderClient } from "@/app/admin/emails/_clients/reminders";
import { DONOR_REMINDER_BODY, DONOR_REMINDER_SUBJECT } from "@/lib/email/donor-reminder-template";

const template = { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };
const header = { linha1: "Arca Atual", linha2: "Colégio São José", linha3: "Itatiba/SP", mostrar_selo: false };
const id = "6bc02966-e9d4-4987-8af2-1d724bdc8aac";
type Props = React.ComponentProps<typeof DonorReminderClient>;
const row = (overrides: Partial<Props["initialSends"][number]> = {}): Props["initialSends"][number] => ({
  id, nome: "Ana", competencia: "2026-11", kind: "10d", due_date: "2026-11-20",
  status: "failed", sent_at: null, error_code: "provider_rejected", attempt_count: 1,
  reservation_expires_at: null, provider_message_id: null, can_retry: true,
  provider_call_started_at: null, frozen_recipient: null,
  ...overrides,
});

function show(sends: Props["initialSends"] = []) {
  render(<DonorReminderClient initialTemplate={template}
    initialPreview={{ assunto: "Exemplo 15/11/2026", bodyHtml: "<p>R$ 100,00 <a href='https://exemplo.invalid'>Enviar comprovante</a></p>" }}
    initialSends={sends} header={header} resendConfigured />);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("reminder administration screen", () => {
  it("shows tokens, current header, invalid example link, rendered preview, and explicit draft state", async () => {
    show();
    const preview = screen.getByRole("region", { name: "Pré-visualização" });
    expect(within(preview).getByText("Colégio São José")).toBeInTheDocument();
    expect(within(preview).getByText("R$ 100,00", { exact: false })).toBeInTheDocument();
    expect(within(preview).getByText(/EXEMPLO-SEM-VALIDADE/)).toBeInTheDocument();
    expect(screen.getByLabelText("Tokens permitidos")).toHaveTextContent("{link_comprovante}");
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Texto novo {link_comprovante}" } });
    expect(screen.getByText(/Atualize a prévia/)).toBeInTheDocument();
    actions.previewDonorReminderTemplate.mockResolvedValue({ success: true, preview: { assunto: "Novo assunto", bodyHtml: "<p>Texto novo</p>", header: { ...header, linha1: "Arca Atualizada" } } });
    fireEvent.click(screen.getByRole("button", { name: "Atualizar prévia" }));
    await waitFor(() => expect(within(preview).getByText("Texto novo")).toBeInTheDocument());
    expect(within(preview).getByText("Arca Atualizada")).toBeInTheDocument();
    expect(actions.previewDonorReminderTemplate).toHaveBeenCalledWith({ ...template, corpo: "Texto novo {link_comprovante}" });
  });

  it("sends the draft to an explicit test recipient and announces progress and failure", async () => {
    actions.sendDonorReminderTest.mockResolvedValue({ success: false, error: "Resultado incerto." });
    show();
    fireEvent.change(screen.getByLabelText("E-mail de destino do teste"), { target: { value: "qa@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar teste" }));
    await waitFor(() => expect(actions.sendDonorReminderTest).toHaveBeenCalledWith({ ...template, email: "qa@example.test" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Resultado incerto.");
  });

  it("keeps an invalid draft unsaved, then confirms a saved model and successful test", async () => {
    actions.saveDonorReminderTemplate.mockResolvedValueOnce({ success: false, error: "O texto deve conter {link_comprovante} exatamente uma vez." })
      .mockResolvedValueOnce({ success: true, template: { ...template, corpo: "Olá {link_comprovante}" } });
    actions.sendDonorReminderTest.mockResolvedValue({ success: true });
    show();
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Olá {link_comprovante}" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("{link_comprovante}");
    expect(screen.getByRole("button", { name: "Salvar modelo" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }));
    expect(await screen.findByText(/Modelo salvo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar modelo" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("E-mail de destino do teste"), { target: { value: "qa@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar teste" }));
    expect(await screen.findByText(/Teste aceito pelo Resend/)).toBeInTheDocument();
  });

  it("keeps the prior preview when token validation fails", async () => {
    actions.previewDonorReminderTemplate.mockResolvedValue({ success: false, error: "Token não permitido: {outro}." });
    show();
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "{outro}" } });
    fireEvent.click(screen.getByRole("button", { name: "Atualizar prévia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Token não permitido");
    expect(within(screen.getByRole("region", { name: "Pré-visualização" })).getByText("R$ 100,00", { exact: false })).toBeInTheDocument();
  });

  it("shows retry only for eligible failures and requires review before resolving uncertainty", async () => {
    actions.getDonorReminderDashboard.mockResolvedValue({ sends: [row({ status: "sent", can_retry: false })] });
    actions.resolveUncertainDonorReminder.mockResolvedValue({ success: true, status: "sent" });
    show([
      row({ id: "sent", status: "sent", can_retry: false }),
      row({ id: "failed", status: "failed", can_retry: true }),
      row({ id: "late", status: "failed", can_retry: false }),
      row({ id: "uncertain", status: "uncertain", can_retry: false }),
      row({ id: "sending", status: "sending", can_retry: false }),
    ]);
    expect(screen.getAllByRole("button", { name: "Reenviar falha" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Registrar aceito" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Registrar falha" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Consultei o resultado no Resend"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar aceito" }));
    await waitFor(() => expect(actions.resolveUncertainDonorReminder).toHaveBeenCalledWith("uncertain", "accepted"));
    expect(actions.retryFailedDonorReminder).not.toHaveBeenCalled();
  });

  it("retries a failure and refreshes the visible status", async () => {
    actions.retryFailedDonorReminder.mockResolvedValue({ status: "sent" });
    actions.getDonorReminderDashboard.mockResolvedValue({ sends: [] });
    show([row()]);
    fireEvent.click(screen.getByRole("button", { name: "Reenviar falha" }));
    await waitFor(() => expect(actions.retryFailedDonorReminder).toHaveBeenCalledWith(id));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Reenviar falha" })).not.toBeInTheDocument());
    expect(screen.getByText(/Envio aceito pelo Resend\./)).toBeInTheDocument();
  });

  it("reports an in-progress retry and lets a reviewed uncertain result become a retryable failure", async () => {
    actions.retryFailedDonorReminder.mockResolvedValue({ status: "in_progress" });
    actions.resolveUncertainDonorReminder.mockResolvedValue({ success: true, status: "failed" });
    actions.getDonorReminderDashboard
      .mockResolvedValueOnce({ sends: [row({ id: "failed" }), row({ id: "uncertain", status: "uncertain", can_retry: false })] })
      .mockResolvedValueOnce({ sends: [row({ id: "uncertain", status: "failed", can_retry: true })] });
    show([row({ id: "failed" }), row({ id: "uncertain", status: "uncertain", can_retry: false })]);
    fireEvent.click(screen.getByRole("button", { name: "Reenviar falha" }));
    expect(await screen.findByText(/O envio está em andamento/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Consultei o resultado no Resend"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar falha" }));
    await waitFor(() => expect(actions.resolveUncertainDonorReminder).toHaveBeenCalledWith("uncertain", "failed"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reenviar falha" })).toBeInTheDocument());
  });
});
