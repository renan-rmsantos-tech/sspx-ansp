import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const { saveDonorEmailTemplate, retryDonorWelcomeEmail, sendDonorTestEmail } = vi.hoisted(() => ({
  saveDonorEmailTemplate: vi.fn(),
  retryDonorWelcomeEmail: vi.fn(),
  sendDonorTestEmail: vi.fn(),
}));

vi.mock("@/app/admin/_actions/donor-email-actions", () => ({
  saveDonorEmailTemplate,
  retryDonorWelcomeEmail,
  sendDonorTestEmail,
}));

import { DonorEmailClient } from "@/app/admin/emails/_clients/welcome";

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
      header={{ linha1: "Arca Nossa Senhora da Providência", linha2: "Mantenedora do Colégio São José", linha3: "Itatiba/SP", mostrar_selo: true }}
      resendConfigured
    />);

    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Novo texto" } });
    const preview = screen.getByRole("region", { name: "Pré-visualização" });
    expect(within(preview).getByText("Novo texto")).toBeInTheDocument();
    expect(within(preview).getByText("Mantenedora do Colégio São José")).toBeInTheDocument();
    expect(within(preview).getByText("Itatiba/SP")).toBeInTheDocument();
    expect(within(preview).getByAltText("Selo da Arca Nossa Senhora da Providência")).toBeInTheDocument();
    expect(within(preview).getByText(/Obra de Assistência Educacional Católica/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }));
    await waitFor(() => expect(saveDonorEmailTemplate).toHaveBeenCalledWith({
      assunto: "Boas-vindas", corpo: "Novo texto",
    }));
    expect(await screen.findByText(/Modelo salvo/)).toBeInTheDocument();
  });

  it("shows pending deliveries and removes one after a successful retry", async () => {
    retryDonorWelcomeEmail.mockResolvedValue({ success: true });
    render(<DonorEmailClient
      initialTemplate={{ assunto: "Boas-vindas", corpo: "Mensagem" }}
      initialPending={[{ id: "d1", nome: "Ana Silva", email: "ana@example.com", created_at: "2026-09-28" }]}
      header={{ linha1: "Arca Nossa Senhora da Providência", linha2: "", linha3: "", mostrar_selo: false }}
      resendConfigured
    />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar e-mail para Ana Silva" }));
    await waitFor(() => expect(screen.getByText("Nenhum e-mail pendente.")).toBeInTheDocument());
    expect(retryDonorWelcomeEmail).toHaveBeenCalledWith("d1");
  });

  it("requires a destination and sends the current draft without saving it", async () => {
    sendDonorTestEmail.mockResolvedValue({ success: true });
    render(<DonorEmailClient
      initialTemplate={{ assunto: "Boas-vindas", corpo: "Mensagem inicial" }}
      initialPending={[]}
      header={{ linha1: "Arca", linha2: "", linha3: "", mostrar_selo: false }}
      resendConfigured
    />);

    const button = screen.getByRole("button", { name: "Enviar teste" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Rascunho de teste" } });
    fireEvent.change(screen.getByLabelText("E-mail de destino"), { target: { value: "ana@example.com" } });
    fireEvent.click(button);

    await waitFor(() => expect(sendDonorTestEmail).toHaveBeenCalledWith({
      email: "ana@example.com", assunto: "Boas-vindas", corpo: "Rascunho de teste",
    }));
    expect(saveDonorEmailTemplate).not.toHaveBeenCalled();
    expect(screen.getByText("E-mail de teste enviado para ana@example.com.")).toBeInTheDocument();
  });
});
