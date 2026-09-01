import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/admin/_actions/admin-actions", () => ({ deleteDonorPledge: vi.fn() }));

import { SecretariatDonorsClient } from "@/app/admin/benfeitores/client";

describe("SecretariatDonorsClient", () => {
  it("filters the operational donor projection without rendering sensitive identifiers", () => {
    render(<SecretariatDonorsClient initialDonors={[{ id: "d1", nome: "Ana", email: "ana@example.com", telefone: "(11) 9", frequencia: "mensal", duracao: "um_ano", valor: 100, meio_pagamento: "pix", data_pagamento: "10", lembrete_canal: "email", priorado_capela: null, observacoes: null, created_at: "2026-01-01" }]} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhum benfeitor encontrado.")).toBeInTheDocument();
  });
});
