import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { sendAction, resolveAction } = vi.hoisted(() => ({
  sendAction: vi.fn(), resolveAction: vi.fn(),
}));
vi.mock("@/app/admin/_actions/donor-monthly-instructions-actions", () => ({
  sendManualDonorMonthlyInstructionsAction: sendAction,
  resolveUncertainDonorMonthlyInstructionsAction: resolveAction,
}));

import { DonorMonthlyInstructions, type MonthlyInstructionsAttempt } from "@/app/admin/_components/donor-monthly-instructions";

const pledgeId = "b8fae3ab-fd64-4fb3-bacc-a9c12408d209";
const occurrences = [
  { competencia: "2099-11", due_date: "2099-11-10" },
  { competencia: "2099-12", due_date: "2099-12-10" },
];
const sent: MonthlyInstructionsAttempt = {
  generation: 1, receipt_competencia: "2099-11", status: "sent",
  sent_at: "2026-10-27T15:30:00Z", error_code: null,
};
const renderControls = (latest: MonthlyInstructionsAttempt | null = null, options = occurrences, receiptStatus: "Comprovante pendente" | "Comprovante enviado – aguardando conferência" = "Comprovante pendente") => {
  const onUpdated = vi.fn();
  render(<DonorMonthlyInstructions pledgeId={pledgeId} latest={latest}
    currentReceipt={{ competencia: "2099-11", status: receiptStatus }}
    pendingOccurrences={options} onUpdated={onUpdated} />);
  return onUpdated;
};

beforeEach(() => {
  sendAction.mockReset();
  resolveAction.mockReset();
});
afterEach(cleanup);

describe("monthly instructions donor-list controls", () => {
  it("shows a historical donor as not sent, a separate receipt obligation, and the send action", async () => {
    sendAction.mockResolvedValue({ status: "sent", latest: sent, sent_at: sent.sent_at });
    renderControls();
    expect(screen.getByTestId("donor-instructions-status")).toHaveTextContent("não enviado");
    expect(screen.getByTestId("donor-current-receipt")).toHaveTextContent("Comprovante pendente");
    fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));
    await waitFor(() => expect(sendAction).toHaveBeenCalledWith({
      pledgeId, competence: "2099-11", explicitResend: false,
    }));
  });

  it("reports provider acceptance time without claiming inbox delivery", () => {
    renderControls(sent);
    expect(screen.getByTestId("donor-instructions-status"))
      .toHaveTextContent("Aceite pelo Resend registrado em 27/10/2026, 12:30. Entrega na caixa de entrada não confirmada.");
    expect(screen.getByTestId("donor-instructions-status")).toHaveTextContent("geração 1");
  });

  it("requires explicit confirmation to create a new generation for a selected pending month", async () => {
    const next = { ...sent, generation: 2, receipt_competencia: "2099-12" };
    sendAction.mockResolvedValue({ status: "sent", latest: next, sent_at: next.sent_at });
    const onUpdated = renderControls(sent);
    fireEvent.change(screen.getByLabelText("Comprovante pendente de"), { target: { value: "2099-12" } });
    expect(screen.getByRole("button", { name: "Reenviar instruções" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo o novo envio para 12\/2099/));
    fireEvent.click(screen.getByRole("button", { name: "Reenviar instruções" }));
    await waitFor(() => expect(sendAction).toHaveBeenCalledWith({
      pledgeId, competence: "2099-12", explicitResend: true,
    }));
    expect(onUpdated).toHaveBeenCalledWith(next);
    expect(screen.getByTestId("donor-instructions-status")).toHaveTextContent("geração 2");
  });

  it("shows a safe failure label and retries the same generation", async () => {
    const failed: MonthlyInstructionsAttempt = { ...sent, status: "failed", sent_at: null, error_code: "private provider text" };
    sendAction.mockResolvedValue({ status: "failed", error_code: "provider_rejected", latest: { ...failed, error_code: "provider_rejected" } });
    renderControls(failed);
    expect(screen.getByTestId("donor-instructions-status")).toHaveTextContent("motivo não informado");
    expect(screen.getByTestId("donor-instructions-status")).not.toHaveTextContent("private provider text");
    fireEvent.click(screen.getByRole("button", { name: "Tentar envio novamente" }));
    await waitFor(() => expect(sendAction).toHaveBeenCalledWith({
      pledgeId, competence: "2099-11", explicitResend: false,
    }));
    expect(screen.getByTestId("donor-instructions-status")).toHaveTextContent("envio recusado pelo Resend");
  });

  it("resolves an uncertain result only after Resend review, then permits a retry", async () => {
    const uncertain: MonthlyInstructionsAttempt = { ...sent, status: "uncertain", sent_at: null, error_code: "unknown" };
    const failed = { ...uncertain, status: "failed" as const };
    resolveAction.mockResolvedValue({ success: true, latest: failed });
    renderControls(uncertain);
    expect(screen.getByTestId("donor-instructions-status")).toHaveTextContent("Resultado incerto");
    expect(screen.queryByRole("button", { name: "Tentar envio novamente" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar falha" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Conferi o resultado deste envio no painel do Resend."));
    fireEvent.click(screen.getByRole("button", { name: "Registrar falha" }));
    await waitFor(() => expect(resolveAction).toHaveBeenCalledWith({ pledgeId, resolution: "failed" }));
    expect(screen.getByRole("button", { name: "Tentar envio novamente" })).toBeEnabled();
  });

  it("blocks duplicate submissions while the first request is pending", async () => {
    let finish!: (value: { status: "sent"; latest: MonthlyInstructionsAttempt; sent_at: string }) => void;
    sendAction.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderControls();
    const button = screen.getByRole("button", { name: "Enviar instruções" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(sendAction).toHaveBeenCalledTimes(1);
    await act(async () => finish({ status: "sent", latest: sent, sent_at: sent.sent_at! }));
    expect(screen.getByTestId("donor-instructions-feedback")).toHaveTextContent("Envio aceito pelo Resend");
  });

  it("shows no available send when every receipt has been uploaded", () => {
    renderControls(sent, [], "Comprovante enviado – aguardando conferência");
    expect(screen.getByTestId("donor-current-receipt")).toHaveTextContent("Comprovante enviado – aguardando conferência");
    expect(screen.getByText("Sem ocorrência ativa com comprovante pendente.")).toBeInTheDocument();
    expect(screen.getByTestId("donor-instructions-send")).toBeDisabled();
  });
});
