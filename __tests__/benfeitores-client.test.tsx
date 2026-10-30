import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { updateDonorDueDay } = vi.hoisted(() => ({ updateDonorDueDay: vi.fn() }));
vi.mock("@/app/admin/_actions/admin-actions", () => ({ deleteDonorPledge: vi.fn(), updateDonorDueDay }));
const { retryDonorWelcomeEmail, markDonorWelcomeEmailSent, unmarkDonorWelcomeEmailSent } = vi.hoisted(() => ({ retryDonorWelcomeEmail: vi.fn(), markDonorWelcomeEmailSent: vi.fn(), unmarkDonorWelcomeEmailSent: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-email-actions", () => ({ retryDonorWelcomeEmail, markDonorWelcomeEmailSent, unmarkDonorWelcomeEmailSent }));
vi.mock("@/app/admin/_actions/donor-receipt-actions", () => ({ issueDonorReceiptRecoveryLink: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-monthly-instructions-actions", () => ({
  sendManualDonorMonthlyInstructionsAction: vi.fn(),
  resolveUncertainDonorMonthlyInstructionsAction: vi.fn(),
}));

import { BenfeitoresClient, SecretariatDonorsClient } from "@/app/admin/benfeitores/client";
import type { DonorPledge } from "@/app/admin/_components/donor-card";

afterEach(cleanup);
beforeEach(() => updateDonorDueDay.mockReset());

describe("SecretariatDonorsClient", () => {
  it("filters the operational donor projection without rendering sensitive identifiers", () => {
    render(<SecretariatDonorsClient initialDonors={[{ id: "d1", nome: "Ana", email: "ana@example.com", telefone: "(11) 9", frequencia: "mensal", duracao: "um_ano", valor: 100, meio_pagamento: "pix", data_pagamento: "10", lembrete_canal: "email", priorado_capela: null, observacoes: null, created_at: "2026-01-01" }]} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-welcome-send")).not.toBeInTheDocument();
    expect(screen.queryByTestId("donor-reminder-status")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhum benfeitor corresponde aos filtros.")).toBeInTheDocument();
  });

  it("combines the priorado filter with the search", () => {
    const base = {
      telefone: null,
      frequencia: "mensal" as const,
      duracao: "um_ano" as const,
      valor: 100,
      meio_pagamento: "pix" as const,
      data_pagamento: null,
      lembrete_canal: "email" as const,
      observacoes: null,
      created_at: "2026-01-01",
    };
    render(
      <SecretariatDonorsClient
        initialDonors={[
          { ...base, id: "d1", nome: "Ana", email: "ana@example.com", priorado_capela: "sp-indaiatuba-imaculada-conceicao" },
          { ...base, id: "d2", nome: "Bruna", email: "bruna@example.com", priorado_capela: "pr-curitiba-sagrada-familia" },
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText("Priorado/Capela"), {
      target: { value: "pr-curitiba-sagrada-familia" },
    });
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
    expect(screen.getByText("Bruna")).toBeInTheDocument();
    expect(
      screen.getByText("Priorado/Capela: Capela Sagrada Família (Curitiba)")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Ana" },
    });
    expect(screen.getByText("Nenhum benfeitor corresponde aos filtros.")).toBeInTheDocument();
  });
});

describe("BenfeitoresClient", () => {
  const monthlyDonor: DonorPledge = {
    id: "48a283a7-4869-48ca-ac75-dc48bd30c9e8",
    nome: "Ana",
    cpf: "111.111.111-11",
    email: "ana@example.com",
    frequencia: "mensal",
    duracao: "indeterminado",
    valor: 100,
    dia_vencimento: 5,
    next_due_date: "2026-11-05",
    created_at: "2026-10-26T12:00:00Z",
  };

  it("shows link generation only when the current monthly receipt is pending", () => {
    render(<BenfeitoresClient initialDonors={[{ ...monthlyDonor, current_receipt: { competencia: "2026-10", status: "Comprovante pendente" } }, { ...monthlyDonor, id: "sent", nome: "Bruna", current_receipt: { competencia: "2026-10", status: "Comprovante enviado – aguardando conferência" } }]} />);
    expect(screen.getAllByRole("button", { name: "Gerar link de comprovante" })).toHaveLength(1);
  });
  it("shows monthly instructions only for monthly donors", () => {
    render(<BenfeitoresClient initialDonors={[
      monthlyDonor,
      { ...monthlyDonor, id: "one-time", nome: "Bruna", frequencia: "unica", duracao: null, dia_vencimento: null },
    ]} />);
    expect(screen.getByTestId(`donor-card-${monthlyDonor.id}`)).toHaveTextContent("não enviado");
    expect(screen.getByTestId("donor-card-one-time")).not.toHaveTextContent("Instruções do pagamento mensal");
    expect(screen.getAllByTestId("donor-instructions-send")).toHaveLength(1);
  });

  it("shows the due date and pending reminder distinctly from provider acceptance", () => {
    render(<BenfeitoresClient initialDonors={[{
      ...monthlyDonor,
      latest_reminder: { kind: "10d", competencia: "2026-11", status: "sending", sent_at: null, error_code: null },
    }]} />);
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Próximo vencimento: 05/11/2026");
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("10 dias antes · competência 11/2026 · Envio em andamento; aceitação ainda não registrada.");
    expect(screen.getByTestId("donor-reminder-status")).not.toHaveTextContent("Aceito pelo Resend");
  });

  it("shows the last accepted 5-day reminder time without claiming delivery", () => {
    render(<BenfeitoresClient initialDonors={[{
      ...monthlyDonor,
      latest_reminder: { kind: "5d", competencia: "2026-11", status: "sent", sent_at: "2026-10-26T15:30:00Z", error_code: null },
    }]} />);
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("5 dias antes · competência 11/2026 · Aceito pelo Resend em 26/10/2026, 12:30. Entrega na caixa de entrada não confirmada.");
  });

  it("shows a failed outcome and a safe uncertain label", () => {
    render(<BenfeitoresClient initialDonors={[{
      ...monthlyDonor,
      latest_reminder: { kind: "10d", competencia: "2026-11", status: "failed", sent_at: null, error_code: "provider_rejected" },
    }]} />);
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("Falha no envio: envio recusado pelo Resend.");
    cleanup();
    render(<BenfeitoresClient initialDonors={[{
      ...monthlyDonor,
      latest_reminder: { kind: "5d", competencia: "2026-11", status: "uncertain", sent_at: null, error_code: "unknown" },
    }]} />);
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("Resultado incerto; verificar no Resend antes de reenviar.");
  });

  it("does not render an unrecognized failure value from the server", () => {
    render(<BenfeitoresClient initialDonors={[{
      ...monthlyDonor,
      latest_reminder: { kind: "10d", competencia: "2026-11", status: "failed", sent_at: null, error_code: "private provider response" },
    }]} />);
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("Falha no envio: motivo não informado.");
    expect(screen.getByTestId("donor-reminder-status")).not.toHaveTextContent("private provider response");
  });

  it("labels an expired one-year plan as ended and shows no send when email is opted in", () => {
    render(<BenfeitoresClient initialDonors={[{
      ...monthlyDonor, duracao: "um_ano", next_due_date: null, lembrete_canal: "email",
    }]} />);
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Próximo vencimento: Encerrado");
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("Nenhum envio registrado.");
  });

  it("edits a monthly day from 5 to 12 and refreshes the displayed next due date", async () => {
    updateDonorDueDay.mockResolvedValue({ success: true, dia_vencimento: 12, next_due_date: "2026-11-12" });
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 5 de cada mês");
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Próximo vencimento: 05/11/2026");

    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" }), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dia" }));

    await waitFor(() => expect(updateDonorDueDay).toHaveBeenCalledWith(monthlyDonor.id, 12));
    expect(await screen.findByRole("status")).toHaveTextContent("Dia de vencimento atualizado.");
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 12 de cada mês");
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Próximo vencimento: 12/11/2026");
  });

  it("allows an administrator to choose day 31 and explains short months", async () => {
    updateDonorDueDay.mockResolvedValue({ success: true, dia_vencimento: 31, next_due_date: "2026-10-31" });
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    expect(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" })).toHaveAttribute("max", "31");
    expect(screen.getByText("De 1 a 31. Em meses mais curtos, vale o último dia.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" }), { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dia" }));
    await waitFor(() => expect(updateDonorDueDay).toHaveBeenCalledWith(monthlyDonor.id, 31));
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 31 de cada mês");
  });

  it("shows a validation error for an invalid day without submitting", async () => {
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" }), { target: { value: "32" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe um dia inteiro entre 1 e 31.");
    expect(updateDonorDueDay).not.toHaveBeenCalled();
  });

  it("prevents duplicate submits while a day update is pending", async () => {
    let finish!: (result: { success: true; dia_vencimento: number; next_due_date: string }) => void;
    updateDonorDueDay.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" }), { target: { value: "12" } });
    const form = screen.getByRole("button", { name: "Salvar dia" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(updateDonorDueDay).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    await act(async () => {
      finish({ success: true, dia_vencimento: 12, next_due_date: "2026-11-12" });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Dia de vencimento atualizado.");
  });

  it("shows server errors and leaves the edit available for retry", async () => {
    updateDonorDueDay.mockResolvedValue({ success: false, error: "Contribuição mensal não encontrada." });
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar dia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Contribuição mensal não encontrada.");
    expect(screen.getByRole("button", { name: "Salvar dia" })).toBeEnabled();
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 5 de cada mês");
  });

  it("does not show the due-day editor for one-time pledges", () => {
    render(<BenfeitoresClient initialDonors={[{ ...monthlyDonor, frequencia: "unica", dia_vencimento: null, data_pagamento: "2026-10-25" }]} />);
    expect(screen.queryByTestId("donor-due-day")).not.toBeInTheDocument();
    expect(screen.getByText("25/10/2026")).toBeInTheDocument();
  });

  it("combines priorado, search, and frequency filters, including missing priorado", () => {
    const base: DonorPledge = {
      id: "d1",
      nome: "Ana",
      cpf: "111.111.111-11",
      email: "ana@example.com",
      frequencia: "mensal",
      valor: 100,
      created_at: "2026-09-28 17:51:39.639965+00",
    };
    render(
      <BenfeitoresClient
        initialDonors={[
          { ...base, priorado_capela: "sp-indaiatuba-imaculada-conceicao" },
          { ...base, id: "d2", nome: "Bruna", frequencia: "unica", priorado_capela: "pr-curitiba-sagrada-familia" },
          { ...base, id: "d3", nome: "Clara", priorado_capela: null },
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText("Priorado/Capela"), {
      target: { value: "pr-curitiba-sagrada-familia" },
    });
    expect(screen.getByTestId("donor-card-d2")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-card-d1")).not.toBeInTheDocument();
    expect(screen.getByText("Cadastro: 28/09/2026")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("donor-filter-mensal"));
    expect(screen.getByText("Nenhum benfeitor corresponde aos filtros.")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("donor-filter-todos"));
    fireEvent.change(screen.getByTestId("donor-search-input"), {
      target: { value: "Bruna" },
    });
    expect(screen.getByTestId("donor-results-count")).toHaveTextContent("1 benfeitor");

    fireEvent.change(screen.getByTestId("donor-search-input"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Priorado/Capela"), {
      target: { value: "__nao_informado__" },
    });
    expect(screen.getByTestId("donor-card-d3")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-card-d2")).not.toBeInTheDocument();
  });

  it("finds pending registration 51 and exposes per-record admin sending", () => {
    const base: DonorPledge = {
      id: "d1",
      nome: "Benfeitor",
      cpf: "111.111.111-11",
      email: "ana@example.com",
      frequencia: "mensal",
      valor: 100,
      created_at: "2026-09-28 17:51:39.639965+00",
    };
    const donors = Array.from({ length: 51 }, (_, index) => ({
      ...base,
      id: `d${index + 1}`,
      nome: `Benfeitor ${index + 1}`,
      welcome_email_sent_at: index < 50 ? "2026-10-01T10:00:00.000Z" : null,
    }));

    render(<BenfeitoresClient initialDonors={donors} />);
    fireEvent.click(screen.getByTestId("donor-welcome-filter-pendentes"));
    expect(screen.getByTestId("donor-card-d51")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-card-d1")).not.toBeInTheDocument();
    expect(screen.getByTestId("donor-welcome-send")).toBeInTheDocument();
  });

  it("shows the accepted send date after an administrator sends a pending welcome email", async () => {
    retryDonorWelcomeEmail.mockResolvedValue({
      status: "sent",
      success: true,
      sent_at: "2026-10-13T12:00:00.000Z",
    });
    const donor: DonorPledge = {
      id: "d1",
      nome: "Ana",
      cpf: "111.111.111-11",
      email: "ana@example.com",
      frequencia: "mensal",
      valor: 100,
      created_at: "2026-09-28 17:51:39.639965+00",
      welcome_email_sent_at: null,
    };
    render(<BenfeitoresClient initialDonors={[donor]} />);

    fireEvent.click(screen.getByTestId("donor-welcome-send"));
    await waitFor(() => expect(retryDonorWelcomeEmail).toHaveBeenCalledWith("d1"));
    expect(await screen.findByText(/Envio de boas-vindas registrado em 13\/10\/2026/)).toBeInTheDocument();
    expect(screen.queryByTestId("donor-welcome-send")).not.toBeInTheDocument();
  });
});

it("retira o benfeitor dos pendentes após marcar envio manual", async () => {
  markDonorWelcomeEmailSent.mockResolvedValue({ success: true, sent_at: "2026-10-14T12:00:00.000Z" });
  const donor: DonorPledge = { id: "d1", nome: "Ana", cpf: "111.111.111-11", email: "ana@example.com", frequencia: "mensal", valor: 100, created_at: "2026-10-01", welcome_email_sent_at: null };
  render(<BenfeitoresClient initialDonors={[donor]} />);
  fireEvent.click(screen.getByTestId("donor-welcome-filter-pendentes"));
  fireEvent.click(screen.getByTestId("donor-welcome-mark-sent"));
  await waitFor(() => expect(screen.queryByTestId("donor-card-d1")).not.toBeInTheDocument());
  expect(markDonorWelcomeEmailSent).toHaveBeenCalledWith("d1");
  fireEvent.click(screen.getByTestId("donor-welcome-filter-enviados"));
  expect(screen.getByText(/Envio de boas-vindas registrado em/)).toBeInTheDocument();
});

it("devolve o benfeitor aos pendentes ao desmarcar envio", async () => {
  unmarkDonorWelcomeEmailSent.mockResolvedValue({ success: true });
  const donor: DonorPledge = { id: "d1", nome: "Ana", cpf: "111.111.111-11", email: "ana@example.com", frequencia: "mensal", valor: 100, created_at: "2026-10-01", welcome_email_sent_at: "2026-10-14T12:00:00.000Z" };
  render(<BenfeitoresClient initialDonors={[donor]} />);
  fireEvent.click(screen.getByTestId("donor-welcome-filter-enviados"));
  fireEvent.click(screen.getByTestId("donor-welcome-unmark-sent"));
  await waitFor(() => expect(screen.queryByTestId("donor-card-d1")).not.toBeInTheDocument());
  expect(unmarkDonorWelcomeEmailSent).toHaveBeenCalledWith("d1");
  fireEvent.click(screen.getByTestId("donor-welcome-filter-pendentes"));
  expect(screen.getByTestId("donor-welcome-send")).toBeInTheDocument();
  expect(screen.getByTestId("donor-welcome-mark-sent")).toBeInTheDocument();
});
it("mantém o status enviado quando desmarcar falha", async () => {
  unmarkDonorWelcomeEmailSent.mockResolvedValue({ success: false, error: "Tente novamente." });
  const donor: DonorPledge = { id: "d1", nome: "Ana", cpf: "111.111.111-11", email: "ana@example.com", frequencia: "mensal", valor: 100, created_at: "2026-10-01", welcome_email_sent_at: "2026-10-14T12:00:00.000Z" };
  render(<BenfeitoresClient initialDonors={[donor]} />);
  fireEvent.click(screen.getByTestId("donor-welcome-unmark-sent"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente.");
  expect(screen.getByText(/Envio de boas-vindas registrado em/)).toBeInTheDocument();
});
