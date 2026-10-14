import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/app/admin/_actions/admin-actions", () => ({ deleteDonorPledge: vi.fn() }));
const { retryDonorWelcomeEmail, markDonorWelcomeEmailSent } = vi.hoisted(() => ({ retryDonorWelcomeEmail: vi.fn(), markDonorWelcomeEmailSent: vi.fn() }));
vi.mock("@/app/admin/_actions/donor-email-actions", () => ({ retryDonorWelcomeEmail, markDonorWelcomeEmailSent }));

import { BenfeitoresClient, SecretariatDonorsClient } from "@/app/admin/benfeitores/client";
import type { DonorPledge } from "@/app/admin/_components/donor-card";

afterEach(cleanup);

describe("SecretariatDonorsClient", () => {
  it("filters the operational donor projection without rendering sensitive identifiers", () => {
    render(<SecretariatDonorsClient initialDonors={[{ id: "d1", nome: "Ana", email: "ana@example.com", telefone: "(11) 9", frequencia: "mensal", duracao: "um_ano", valor: 100, meio_pagamento: "pix", data_pagamento: "10", lembrete_canal: "email", priorado_capela: null, observacoes: null, created_at: "2026-01-01" }]} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByTestId("donor-welcome-send")).not.toBeInTheDocument();
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
