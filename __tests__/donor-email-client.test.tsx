import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const { saveDonorEmailTemplate, retryDonorWelcomeEmail } = vi.hoisted(() => ({
  saveDonorEmailTemplate: vi.fn(),
  retryDonorWelcomeEmail: vi.fn(),
}));

vi.mock("@/app/admin/_actions/donor-email-actions", () => ({
  saveDonorEmailTemplate,
  retryDonorWelcomeEmail,
}));

import { DonorEmailClient } from "@/app/admin/email-benfeitores/client";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DonorEmailClient", () => {
  it("previews edits within the standard header and footer and saves them", async () => {
    saveDonorEmailTemplate.mockResolvedValue({ success: true });
    render(<DonorEmailClient
      initialTemplate={{ assunto: "Boas-vindas", corpo: "Mensagem inicial" }}
      initialPending={[]}
      smtpConfigured
    />);

    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Novo texto" } });
    const preview = screen.getByRole("region", { name: "Pré-visualização" });
    expect(within(preview).getByText("Novo texto")).toBeInTheDocument();
    expect(within(preview).getByText(/Obra de Assistência Educacional Católica/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }));
    await waitFor(() => expect(saveDonorEmailTemplate).toHaveBeenCalledWith({
      assunto: "Boas-vindas", corpo: "Novo texto",
    }));
    expect(screen.getByText(/Modelo salvo/)).toBeInTheDocument();
  });

  it("shows pending deliveries and removes one after a successful retry", async () => {
    retryDonorWelcomeEmail.mockResolvedValue({ success: true });
    render(<DonorEmailClient
      initialTemplate={{ assunto: "Boas-vindas", corpo: "Mensagem" }}
      initialPending={[{ id: "d1", nome: "Ana Silva", email: "ana@example.com", created_at: "2026-09-28" }]}
      smtpConfigured
    />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar e-mail para Ana Silva" }));
    await waitFor(() => expect(screen.getByText("Nenhum e-mail pendente.")).toBeInTheDocument());
    expect(retryDonorWelcomeEmail).toHaveBeenCalledWith("d1");
  });
});
