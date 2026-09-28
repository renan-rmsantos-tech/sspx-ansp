import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/admin/_actions/admin-actions", () => ({ deleteDonorPledge: vi.fn() }));

import { BenfeitoresClient, SecretariatDonorsClient } from "@/app/admin/benfeitores/client";
import type { DonorPledge } from "@/app/admin/_components/donor-card";

afterEach(cleanup);

describe("SecretariatDonorsClient", () => {
  it("filters the operational donor projection without rendering sensitive identifiers", () => {
    render(<SecretariatDonorsClient initialDonors={[{ id: "d1", nome: "Ana", email: "ana@example.com", telefone: "(11) 9", frequencia: "mensal", duracao: "um_ano", valor: 100, meio_pagamento: "pix", data_pagamento: "10", lembrete_canal: "email", priorado_capela: null, observacoes: null, created_at: "2026-01-01" }]} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
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
});
