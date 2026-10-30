import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEFAULT_DOCUMENT_HEADER, FOOTER_HELP } from "@/lib/documents/document-header";

const save = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/_actions/admin-actions", () => ({ saveDocumentHeader: save }));

import { CabecalhoClient } from "@/app/admin/cabecalho/client";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CabecalhoClient", () => {
  it("renders the page header, the labelled fields and the preview column", () => {
    render(<CabecalhoClient initialHeader={DEFAULT_DOCUMENT_HEADER} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cabeçalho e rodapé");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Como fica no documento");
    expect(screen.getByRole("checkbox", { name: "Exibir o selo da ANSP no cabeçalho" })).toBeChecked();
    expect(screen.getByLabelText("Linha 1 (instituição)")).toHaveValue(DEFAULT_DOCUMENT_HEADER.linha1);
    expect(screen.getByLabelText("Linha 2 (opcional)")).toHaveValue(DEFAULT_DOCUMENT_HEADER.linha2);
    expect(screen.getByLabelText("Linha 3 (opcional)")).toHaveValue(DEFAULT_DOCUMENT_HEADER.linha3);
    expect(screen.getByLabelText("Rodapé institucional")).toHaveAccessibleDescription(FOOTER_HELP);
    expect(screen.getByTestId("header-linha1")).toHaveAttribute("id", "header-linha1");
    expect(screen.getByRole("button", { name: "Restaurar rodapé padrão" })).toBeInTheDocument();
    expect(screen.queryByTestId("header-saved")).toBeNull();
    expect(screen.queryByTestId("header-error")).toBeNull();
  });

  it("saves the edited header and announces success, clearing it on the next edit", async () => {
    save.mockResolvedValueOnce({ success: true });
    render(<CabecalhoClient initialHeader={DEFAULT_DOCUMENT_HEADER} />);

    fireEvent.click(screen.getByTestId("header-mostrar-selo"));
    expect(screen.getByRole("checkbox", { name: "Exibir o selo da ANSP no cabeçalho" })).not.toBeChecked();
    fireEvent.change(screen.getByTestId("header-linha1"), { target: { value: "Instituição X" } });
    fireEvent.change(screen.getByTestId("header-linha2"), { target: { value: "Linha dois" } });
    fireEvent.change(screen.getByTestId("header-linha3"), { target: { value: "Linha três" } });

    fireEvent.click(screen.getByTestId("header-save"));
    await waitFor(() => expect(screen.getByTestId("header-saved")).toHaveTextContent("Cabeçalho e rodapé salvos."));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ mostrar_selo: false, linha1: "Instituição X", linha2: "Linha dois", linha3: "Linha três" })
    );
    expect(screen.getByTestId("header-saved")).toHaveAttribute("role", "status");

    fireEvent.change(screen.getByTestId("header-linha1"), { target: { value: "Outra" } });
    expect(screen.queryByTestId("header-saved")).toBeNull();
  });

  it("blocks saving an invalid footer locally and shows the action error otherwise", async () => {
    render(<CabecalhoClient initialHeader={DEFAULT_DOCUMENT_HEADER} />);

    fireEvent.change(screen.getByLabelText("Rodapé institucional"), { target: { value: "a\nb\nc\nd\ne" } });
    fireEvent.click(screen.getByTestId("header-save"));
    await waitFor(() => expect(screen.getByTestId("header-error")).toHaveTextContent("Use até 4 linhas"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId("header-error")).toHaveAttribute("role", "alert");

    fireEvent.click(screen.getByRole("button", { name: "Restaurar rodapé padrão" }));
    save.mockResolvedValueOnce({ success: false, error: "Sem permissão." });
    fireEvent.click(screen.getByTestId("header-save"));
    await waitFor(() => expect(screen.getByTestId("header-error")).toHaveTextContent("Sem permissão."));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
