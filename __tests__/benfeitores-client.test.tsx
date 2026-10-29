import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const { updateDonorDueDay, deleteDonorPledge, exportDonorPledge, getDocumentUrl } = vi.hoisted(() => ({
  updateDonorDueDay: vi.fn(),
  deleteDonorPledge: vi.fn(),
  exportDonorPledge: vi.fn(),
  getDocumentUrl: vi.fn(),
}));
vi.mock("@/app/admin/_actions/admin-actions", () => ({ deleteDonorPledge, updateDonorDueDay, exportDonorPledge, getDocumentUrl }));
const { retryDonorWelcomeEmail, markDonorWelcomeEmailSent, unmarkDonorWelcomeEmailSent } = vi.hoisted(() => ({ retryDonorWelcomeEmail: vi.fn(), markDonorWelcomeEmailSent: vi.fn(), unmarkDonorWelcomeEmailSent: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-email-actions", () => ({ retryDonorWelcomeEmail, markDonorWelcomeEmailSent, unmarkDonorWelcomeEmailSent }));
vi.mock("@/app/admin/_actions/donor-monthly-instructions-actions", () => ({
  sendManualDonorMonthlyInstructionsAction: vi.fn(),
  resolveUncertainDonorMonthlyInstructionsAction: vi.fn(),
}));

import { BenfeitoresClient, SecretariatDonorsClient, type SecretariatDonorPledge } from "@/app/admin/benfeitores/client";
import type { DonorPledge } from "@/app/admin/_components/donor-card";

afterEach(cleanup);
beforeEach(() => {
  updateDonorDueDay.mockReset();
  deleteDonorPledge.mockReset();
  exportDonorPledge.mockReset();
  getDocumentUrl.mockReset();
  retryDonorWelcomeEmail.mockReset();
  markDonorWelcomeEmailSent.mockReset();
  unmarkDonorWelcomeEmailSent.mockReset();
});

/** Abre o detalhe de uma linha (`RecordRow` começa fechada) e devolve o card. */
function openRow(id: string) {
  const card = screen.getByTestId(`donor-card-${id}`);
  const toggle = card.querySelector("button[aria-expanded]") as HTMLButtonElement;
  if (toggle.getAttribute("aria-expanded") === "false") fireEvent.click(toggle);
  return card;
}

const cardIds = () =>
  Array.from(screen.getByTestId("donor-list").querySelectorAll("[data-testid^='donor-card-']")).map((el) =>
    el.getAttribute("data-testid")!.replace("donor-card-", "")
  );

describe("SecretariatDonorsClient", () => {
  const base: SecretariatDonorPledge = {
    id: "d1",
    nome: "Ana",
    email: "ana@example.com",
    telefone: "(11) 9",
    frequencia: "mensal",
    duracao: "um_ano",
    valor: 100,
    meio_pagamento: "pix",
    data_pagamento: null,
    lembrete_canal: "email",
    priorado_capela: null,
    observacoes: null,
    created_at: "2026-01-01",
  };

  it("UT-063: shows search, priorado select and only Contato/Contribuição without admin controls", () => {
    render(<SecretariatDonorsClient initialDonors={[base]} />);
    expect(screen.getByRole("searchbox", { name: "Buscar benfeitores" })).toBeInTheDocument();
    expect(screen.getByLabelText("Priorado ou capela")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-welcome-pending-only")).not.toBeInTheDocument();

    const card = openRow("d1");
    expect(within(card).getByRole("heading", { level: 3, name: "Contato" })).toBeInTheDocument();
    expect(within(card).getByRole("heading", { level: 3, name: "Contribuição" })).toBeInTheDocument();
    expect(within(card).queryByRole("heading", { level: 3, name: "E-mails e comprovantes" })).not.toBeInTheDocument();
    expect(within(card).getByTestId("frequencia-badge")).toHaveTextContent("Mensal");
    expect(within(card).queryByText("Boas-vindas pendente")).not.toBeInTheDocument();
    expect(within(card).getByText("Mensal, por um ano")).toBeInTheDocument();
    expect(within(card).getByText("Pix")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-welcome-send")).not.toBeInTheDocument();
    expect(screen.queryByTestId("donor-reminder-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("donor-delete-button")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhum benfeitor com esses filtros")).toBeInTheDocument();
  });

  it("combines the priorado filter with the search", () => {
    render(
      <SecretariatDonorsClient
        initialDonors={[
          { ...base, id: "d1", nome: "Ana", priorado_capela: "sp-indaiatuba-imaculada-conceicao" },
          { ...base, id: "d2", nome: "Bruna", email: "bruna@example.com", priorado_capela: "pr-curitiba-sagrada-familia" },
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText("Priorado ou capela"), {
      target: { value: "pr-curitiba-sagrada-familia" },
    });
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
    expect(screen.getByText("Bruna")).toBeInTheDocument();
    openRow("d2");
    expect(screen.getAllByText("Capela Sagrada Família (Curitiba)").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
    expect(screen.getByText("Nenhum benfeitor com esses filtros")).toBeInTheDocument();
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
  const base: DonorPledge = {
    id: "d1",
    nome: "Ana",
    cpf: "111.111.111-11",
    email: "ana@example.com",
    frequencia: "mensal",
    valor: 100,
    created_at: "2026-09-28 17:51:39.639965+00",
  };
  const trio = [
    { ...base, telefone: "(11) 91111-1111", priorado_capela: "sp-indaiatuba-imaculada-conceicao", created_at: "2026-09-28T10:00:00Z" },
    { ...base, id: "d2", nome: "Bruna", cpf: "222.222.222-22", email: "bruna@example.com", frequencia: "unica" as const, valor: 300, priorado_capela: "pr-curitiba-sagrada-familia", created_at: "2026-09-29T10:00:00Z" },
    { ...base, id: "d3", nome: "Clara", cpf: "333.333.333-33", email: "clara@example.com", valor: 200, priorado_capela: null, created_at: "2026-09-30T10:00:00Z" },
  ];

  it("UT-050: filters by frequency with the segmented control and counts results", () => {
    render(<BenfeitoresClient initialDonors={trio} />);
    const group = screen.getByRole("group", { name: "Filtrar por frequência" });
    expect(within(group).getByRole("button", { name: "Todos 3" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Mensais 2" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Doação única 1" })).toBeInTheDocument();
    expect(screen.queryByTestId("donor-welcome-filters")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("donor-filter-unica"));
    expect(screen.getByTestId("donor-filter-unica")).toHaveAttribute("aria-pressed", "true");
    expect(cardIds()).toEqual(["d2"]);
    expect(screen.getByTestId("donor-results-count")).toHaveTextContent("1 benfeitor");

    fireEvent.click(screen.getByTestId("donor-filter-mensal"));
    expect(cardIds()).toEqual(["d3", "d1"]);
    expect(screen.getByTestId("donor-results-count")).toHaveTextContent("2 benfeitores");
  });

  it("UT-051: searches by name, CPF, e-mail and phone", () => {
    render(<BenfeitoresClient initialDonors={trio} />);
    const input = screen.getByRole("searchbox", { name: "Buscar benfeitores" });
    expect(input).toBe(screen.getByTestId("donor-search-input"));

    fireEvent.change(input, { target: { value: "bruna" } });
    expect(cardIds()).toEqual(["d2"]);
    fireEvent.change(input, { target: { value: "33333333333" } });
    expect(cardIds()).toEqual(["d3"]);
    fireEvent.change(input, { target: { value: "ana@example" } });
    expect(cardIds()).toEqual(["d1"]);
    fireEvent.change(input, { target: { value: "91111" } });
    expect(cardIds()).toEqual(["d1"]);
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("Nenhum benfeitor com esses filtros")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(cardIds()).toHaveLength(3);
  });

  it("UT-052: filters by priorado (including not informed) and sorts by amount", () => {
    render(<BenfeitoresClient initialDonors={trio} />);
    const select = screen.getByLabelText("Priorado ou capela");
    expect(select).toBe(screen.getByTestId("donor-priorado-filter"));

    fireEvent.change(select, { target: { value: "pr-curitiba-sagrada-familia" } });
    expect(cardIds()).toEqual(["d2"]);
    fireEvent.change(select, { target: { value: "__nao_informado__" } });
    expect(cardIds()).toEqual(["d3"]);
    fireEvent.change(select, { target: { value: "__todos__" } });

    fireEvent.change(screen.getByTestId("donor-sort-select"), { target: { value: "valor_desc" } });
    expect(cardIds()).toEqual(["d2", "d3", "d1"]);
    fireEvent.change(screen.getByLabelText("Ordenar"), { target: { value: "nome" } });
    expect(cardIds()).toEqual(["d1", "d2", "d3"]);
    fireEvent.change(screen.getByLabelText("Ordenar"), { target: { value: "data_asc" } });
    expect(cardIds()).toEqual(["d1", "d2", "d3"]);
  });

  it("UT-053: shows the pending-welcome checkbox only when someone is pending and filters by it", () => {
    const donors = Array.from({ length: 51 }, (_, index) => ({
      ...base,
      id: `d${index + 1}`,
      nome: `Benfeitor ${index + 1}`,
      welcome_email_sent_at: index < 50 ? "2026-10-01T10:00:00.000Z" : null,
    }));
    render(<BenfeitoresClient initialDonors={donors} />);

    const checkbox = screen.getByRole("checkbox", { name: "Mostrar só quem ainda não recebeu boas-vindas (1)" });
    expect(checkbox).toBe(screen.getByTestId("donor-welcome-pending-only"));
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(cardIds()).toEqual(["d51"]);
    openRow("d51");
    expect(screen.getByTestId("donor-welcome-send")).toBeInTheDocument();

    cleanup();
    render(<BenfeitoresClient initialDonors={[{ ...base, welcome_email_sent_at: "2026-10-01T10:00:00.000Z" }]} />);
    expect(screen.queryByTestId("donor-welcome-pending-only")).not.toBeInTheDocument();
  });

  it("UT-054: starts with the checkbox marked when coming from ?boas-vindas=pendentes", () => {
    render(
      <BenfeitoresClient
        initialDonors={[{ ...base, welcome_email_sent_at: "2026-10-01T10:00:00.000Z" }, { ...base, id: "d2", nome: "Bia", welcome_email_sent_at: null }]}
        initialWelcomePendingOnly
      />
    );
    expect(screen.getByTestId("donor-welcome-pending-only")).toBeChecked();
    expect(cardIds()).toEqual(["d2"]);
  });

  it("UT-055: shows the admin pills on the row", () => {
    render(
      <BenfeitoresClient
        initialDonors={[
          { ...monthlyDonor, welcome_email_sent_at: null, current_receipt: { competencia: "2026-10", status: "Comprovante pendente" } },
          { ...monthlyDonor, id: "sent", nome: "Bia", welcome_email_sent_at: "2026-10-01T10:00:00Z", current_receipt: { competencia: "2026-10", status: "Comprovante enviado – aguardando conferência" } },
          { ...monthlyDonor, id: "one-time", nome: "Caio", frequencia: "unica", duracao: null, dia_vencimento: null, welcome_email_sent_at: "2026-10-01T10:00:00Z" },
        ]}
      />
    );
    const pending = screen.getByTestId(`donor-card-${monthlyDonor.id}`);
    expect(within(pending).getByText("Boas-vindas pendente")).toBeInTheDocument();
    expect(within(pending).getByText("Sem comprovante do mês")).toBeInTheDocument();
    expect(within(pending).getByTestId("frequencia-badge")).toHaveTextContent("Mensal");
    expect(within(pending).getByText("R$ 100,00 por mês")).toBeInTheDocument();
    expect(within(pending).getByText("Vence dia 5")).toBeInTheDocument();

    const sent = screen.getByTestId("donor-card-sent");
    expect(within(sent).queryByText("Boas-vindas pendente")).not.toBeInTheDocument();
    expect(within(sent).queryByText("Sem comprovante do mês")).not.toBeInTheDocument();

    const oneTime = screen.getByTestId("donor-card-one-time");
    expect(within(oneTime).getByTestId("frequencia-badge")).toHaveTextContent("Doação única");
    expect(within(oneTime).getByText("R$ 100,00")).toBeInTheDocument();
    expect(within(oneTime).queryByText(/Vence dia/)).not.toBeInTheDocument();
  });

  it("UT-056: preserves the due-day texts and the registration date", () => {
    render(<BenfeitoresClient initialDonors={[{ ...monthlyDonor, created_at: "2026-09-28 17:51:39.639965+00" }]} />);
    expect(screen.getByText("Cadastro em 28/09/2026")).toBeInTheDocument();
    openRow(monthlyDonor.id);
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 5 de cada mês");
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Próximo vencimento: 05/11/2026");
    expect(screen.getByRole("link", { name: "ana@example.com" })).toHaveAttribute("href", "mailto:ana@example.com");
    expect(screen.getByText("Mensal, por tempo indeterminado")).toBeInTheDocument();

    cleanup();
    render(<BenfeitoresClient initialDonors={[{ ...monthlyDonor, duracao: "um_ano", next_due_date: null, lembrete_canal: "email" }]} />);
    openRow(monthlyDonor.id);
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Próximo vencimento: Encerrado");
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("Nenhum envio registrado.");
  });

  it("UT-057: edits a monthly day from 5 to 12 and refreshes the displayed next due date", async () => {
    updateDonorDueDay.mockResolvedValue({ success: true, dia_vencimento: 12, next_due_date: "2026-11-12" });
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    openRow(monthlyDonor.id);

    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    const input = screen.getByRole("spinbutton", { name: "Novo dia de vencimento" });
    expect(input).toHaveAttribute("max", "31");
    expect(screen.getByText("De 1 a 31. Em meses mais curtos, vale o último dia.")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(updateDonorDueDay).toHaveBeenCalledWith(monthlyDonor.id, 12));
    expect(await within(screen.getByTestId("donor-due-day")).findByRole("status")).toHaveTextContent("Dia de vencimento atualizado.");
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 12 de cada mês");
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Próximo vencimento: 12/11/2026");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("UT-057: prevents duplicate submits while a day update is pending and cancels cleanly", async () => {
    let finish!: (result: { success: true; dia_vencimento: number; next_due_date: string }) => void;
    updateDonorDueDay.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    openRow(monthlyDonor.id);
    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" }), { target: { value: "31" } });
    const form = screen.getByRole("button", { name: "Salvar" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(updateDonorDueDay).toHaveBeenCalledTimes(1);
    expect(updateDonorDueDay).toHaveBeenCalledWith(monthlyDonor.id, 31);
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    await act(async () => {
      finish({ success: true, dia_vencimento: 31, next_due_date: "2026-10-31" });
    });
    expect(within(screen.getByTestId("donor-due-day")).getByRole("status")).toHaveTextContent("Dia de vencimento atualizado.");
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 31 de cada mês");
  });

  it("UT-058: shows a validation error for day 45 and server errors, leaving the edit available", async () => {
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    openRow(monthlyDonor.id);
    fireEvent.click(screen.getByRole("button", { name: "Alterar dia de vencimento" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" }), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe um dia inteiro entre 1 e 31.");
    expect(updateDonorDueDay).not.toHaveBeenCalled();

    updateDonorDueDay.mockResolvedValue({ success: false, error: "Contribuição mensal não encontrada." });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Novo dia de vencimento" }), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Contribuição mensal não encontrada.");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    expect(screen.getByTestId("donor-due-day")).toHaveTextContent("Dia de vencimento: 5 de cada mês");
  });

  it("does not show the due-day editor for one-time pledges", () => {
    render(<BenfeitoresClient initialDonors={[{ ...monthlyDonor, frequencia: "unica", dia_vencimento: null, data_pagamento: "2026-10-25" }]} />);
    openRow(monthlyDonor.id);
    expect(screen.queryByTestId("donor-due-day")).not.toBeInTheDocument();
    expect(screen.getByText("25/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Doação única", { selector: "p" })).toBeInTheDocument();
  });

  it("UT-059: sends the welcome e-mail from the warn notice and shows the accepted date", async () => {
    retryDonorWelcomeEmail.mockResolvedValue({ status: "sent", success: true, sent_at: "2026-10-13T12:00:00.000Z" });
    render(<BenfeitoresClient initialDonors={[{ ...base, welcome_email_sent_at: null }]} />);
    openRow("d1");

    const status = screen.getByTestId("donor-welcome-status");
    expect(status).toHaveTextContent("Boas-vindas ainda não enviado");
    expect(within(status).getByTestId("donor-welcome-send")).toHaveTextContent("Enviar agora");
    expect(within(status).getByTestId("donor-welcome-mark-sent")).toHaveTextContent("Marcar como enviado");

    fireEvent.click(screen.getByTestId("donor-welcome-send"));
    await waitFor(() => expect(retryDonorWelcomeEmail).toHaveBeenCalledWith("d1"));
    expect(await screen.findByText(/Boas-vindas enviado em 13\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByTestId("donor-welcome-unmark-sent")).toHaveTextContent("Desmarcar envio");
    expect(screen.queryByTestId("donor-welcome-send")).not.toBeInTheDocument();
    expect(screen.queryByText("Boas-vindas pendente")).not.toBeInTheDocument();
  });

  it("UT-059: reports a failed welcome send as an alert", async () => {
    retryDonorWelcomeEmail.mockResolvedValue({ status: "failed", success: false, error: "Tente novamente." });
    render(<BenfeitoresClient initialDonors={[{ ...base, welcome_email_sent_at: null }]} />);
    openRow("d1");
    fireEvent.click(screen.getByTestId("donor-welcome-send"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Tente novamente.");
    expect(alert).toBe(screen.getByTestId("donor-welcome-error"));
    expect(screen.getByTestId("donor-welcome-send")).toBeInTheDocument();
  });

  it("UT-060: shows reminder outcomes distinctly from provider acceptance", () => {
    const cases: Array<[NonNullable<DonorPledge["latest_reminder"]>, string]> = [
      [{ kind: "10d", competencia: "2026-11", status: "sending", sent_at: null, error_code: null }, "10 dias antes · competência 11/2026 · Envio em andamento; aceitação ainda não registrada."],
      [{ kind: "5d", competencia: "2026-11", status: "sent", sent_at: "2026-10-26T15:30:00Z", error_code: null }, "5 dias antes · competência 11/2026 · Aceito pelo Resend em 26/10/2026, 12:30. Entrega na caixa de entrada não confirmada."],
      [{ kind: "10d", competencia: "2026-11", status: "failed", sent_at: null, error_code: "provider_rejected" }, "Falha no envio: envio recusado pelo Resend."],
      [{ kind: "5d", competencia: "2026-11", status: "uncertain", sent_at: null, error_code: "unknown" }, "Resultado incerto; verificar no Resend antes de reenviar."],
      [{ kind: "10d", competencia: "2026-11", status: "failed", sent_at: null, error_code: "private provider response" }, "Falha no envio: motivo não informado."],
    ];
    for (const [latest_reminder, expected] of cases) {
      render(<BenfeitoresClient initialDonors={[{ ...monthlyDonor, latest_reminder }]} />);
      openRow(monthlyDonor.id);
      expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent(expected);
      expect(screen.getByTestId("donor-reminder-status")).not.toHaveTextContent("private provider response");
      cleanup();
    }
    render(<BenfeitoresClient initialDonors={[monthlyDonor]} />);
    openRow(monthlyDonor.id);
    expect(screen.getByTestId("donor-reminder-status")).toHaveTextContent("Lembretes por e-mail desativados.");
  });

  it("UT-060: shows monthly instructions only for monthly donors", () => {
    render(<BenfeitoresClient initialDonors={[
      monthlyDonor,
      { ...monthlyDonor, id: "one-time", nome: "Bruna", frequencia: "unica", duracao: null, dia_vencimento: null },
    ]} />);
    openRow(monthlyDonor.id);
    openRow("one-time");
    expect(screen.getByTestId(`donor-card-${monthlyDonor.id}`)).toHaveTextContent("não enviado");
    expect(screen.getByTestId("donor-card-one-time")).not.toHaveTextContent("Instruções do pagamento mensal");
    expect(screen.getAllByTestId("donor-instructions-send")).toHaveLength(1);
  });

  it("UT-061: asks for inline confirmation and 'Não' returns to the initial state", () => {
    render(<BenfeitoresClient initialDonors={[base]} />);
    const card = openRow("d1");
    fireEvent.click(within(card).getByTestId("donor-delete-button"));
    expect(within(card).getByRole("group", { name: "Excluir este cadastro?" })).toBeInTheDocument();
    expect(within(card).getByTestId("donor-delete-confirm")).toHaveTextContent("Sim, excluir");
    expect(within(card).queryByTestId("donor-delete-button")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Não" }));
    expect(within(card).queryByText("Excluir este cadastro?")).not.toBeInTheDocument();
    expect(within(card).getByTestId("donor-delete-button")).toHaveTextContent("Excluir");
    expect(deleteDonorPledge).not.toHaveBeenCalled();
  });

  it("UT-062: 'Sim, excluir' calls the action and removes the row; errors stay inline", async () => {
    deleteDonorPledge.mockResolvedValue({ success: true });
    render(<BenfeitoresClient initialDonors={[base, { ...base, id: "d2", nome: "Bia" }]} />);
    openRow("d1");
    fireEvent.click(screen.getByTestId("donor-delete-button"));
    fireEvent.click(screen.getByTestId("donor-delete-confirm"));
    await waitFor(() => expect(screen.queryByTestId("donor-card-d1")).not.toBeInTheDocument());
    expect(deleteDonorPledge).toHaveBeenCalledWith("d1");
    expect(screen.getByTestId("donor-results-count")).toHaveTextContent("1 benfeitor");

    deleteDonorPledge.mockResolvedValue({ success: false, error: "Não foi possível excluir." });
    openRow("d2");
    fireEvent.click(screen.getByTestId("donor-delete-button"));
    fireEvent.click(screen.getByTestId("donor-delete-confirm"));
    const alert = await screen.findByTestId("donor-delete-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent("Não foi possível excluir.");
    expect(screen.getByTestId("donor-card-d2")).toBeInTheDocument();
    expect(screen.getByTestId("donor-delete-button")).toBeInTheDocument();
  });

  it("opens the PDF preview from 'Imprimir ficha' and reports export and receipt errors inline", async () => {
    exportDonorPledge.mockResolvedValueOnce({ error: "Falha ao gerar o PDF." });
    getDocumentUrl.mockResolvedValueOnce({ error: "Recibo indisponível." });
    render(<BenfeitoresClient initialDonors={[{ ...base, recibo_path: "donors/d1/recibo.pdf", recibo_nome: "recibo.pdf" }]} />);
    openRow("d1");

    fireEvent.click(screen.getByTestId("donor-export-button"));
    expect(await screen.findByTestId("donor-export-error")).toHaveTextContent("Falha ao gerar o PDF.");
    fireEvent.click(screen.getByTestId("donor-recibo-button"));
    expect(await screen.findByTestId("donor-recibo-error")).toHaveTextContent("Recibo indisponível.");
    expect(getDocumentUrl).toHaveBeenCalledWith("donors/d1/recibo.pdf");

    exportDonorPledge.mockResolvedValueOnce({ pdfBase64: Buffer.from("PDF").toString("base64"), filename: "ficha.pdf" });
    fireEvent.click(screen.getByTestId("donor-export-button"));
    expect(await screen.findByTestId("pdf-preview-modal")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-export-error")).not.toBeInTheDocument();

    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    getDocumentUrl.mockResolvedValueOnce({ url: "https://example.com/recibo" });
    fireEvent.click(screen.getByTestId("donor-recibo-button"));
    await waitFor(() => expect(open).toHaveBeenCalledWith("https://example.com/recibo", "_blank", "noopener,noreferrer"));
    open.mockRestore();
  });
});

it("retira o benfeitor dos pendentes após marcar envio manual", async () => {
  markDonorWelcomeEmailSent.mockResolvedValue({ success: true, sent_at: "2026-10-14T12:00:00.000Z" });
  const donor: DonorPledge = { id: "d1", nome: "Ana", cpf: "111.111.111-11", email: "ana@example.com", frequencia: "mensal", valor: 100, created_at: "2026-10-01", welcome_email_sent_at: null };
  const sent: DonorPledge = { ...donor, id: "d2", nome: "Bia", welcome_email_sent_at: "2026-10-01T12:00:00.000Z" };
  render(<BenfeitoresClient initialDonors={[donor, sent]} initialWelcomePendingOnly />);
  expect(cardIds()).toEqual(["d1"]);
  openRow("d1");
  fireEvent.click(screen.getByTestId("donor-welcome-mark-sent"));
  await waitFor(() => expect(markDonorWelcomeEmailSent).toHaveBeenCalledWith("d1"));
  expect(await screen.findByText(/Boas-vindas enviado em 14\/10\/2026/)).toBeInTheDocument();
  // Ninguém mais pendente: o checkbox some e o filtro deixa de esconder os registros.
  expect(screen.queryByTestId("donor-welcome-pending-only")).not.toBeInTheDocument();
  expect(cardIds()).toEqual(["d1", "d2"]);
  expect(screen.queryByText("Boas-vindas pendente")).not.toBeInTheDocument();
});

it("devolve o benfeitor aos pendentes ao desmarcar envio", async () => {
  unmarkDonorWelcomeEmailSent.mockResolvedValue({ success: true });
  const donor: DonorPledge = { id: "d1", nome: "Ana", cpf: "111.111.111-11", email: "ana@example.com", frequencia: "mensal", valor: 100, created_at: "2026-10-01", welcome_email_sent_at: "2026-10-14T12:00:00.000Z" };
  render(<BenfeitoresClient initialDonors={[donor]} />);
  expect(screen.queryByTestId("donor-welcome-pending-only")).not.toBeInTheDocument();
  openRow("d1");
  fireEvent.click(screen.getByTestId("donor-welcome-unmark-sent"));
  await waitFor(() => expect(unmarkDonorWelcomeEmailSent).toHaveBeenCalledWith("d1"));
  expect(await screen.findByTestId("donor-welcome-send")).toBeInTheDocument();
  expect(screen.getByTestId("donor-welcome-mark-sent")).toBeInTheDocument();
  expect(screen.getByText("Boas-vindas pendente")).toBeInTheDocument();
  expect(screen.getByTestId("donor-welcome-pending-only")).toBeInTheDocument();
});

it("mantém o status enviado quando desmarcar falha", async () => {
  unmarkDonorWelcomeEmailSent.mockResolvedValue({ success: false, error: "Tente novamente." });
  const donor: DonorPledge = { id: "d1", nome: "Ana", cpf: "111.111.111-11", email: "ana@example.com", frequencia: "mensal", valor: 100, created_at: "2026-10-01", welcome_email_sent_at: "2026-10-14T12:00:00.000Z" };
  render(<BenfeitoresClient initialDonors={[donor]} />);
  openRow("d1");
  fireEvent.click(screen.getByTestId("donor-welcome-unmark-sent"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente.");
  expect(screen.getByText(/Boas-vindas enviado em/)).toBeInTheDocument();
});
