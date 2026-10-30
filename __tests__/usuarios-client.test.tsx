import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { createSecretariatUser, resetSecretariatPassword, setSecretariatUserActive } = vi.hoisted(() => ({
  createSecretariatUser: vi.fn(),
  resetSecretariatPassword: vi.fn(),
  setSecretariatUserActive: vi.fn(),
}));

vi.mock("@/app/admin/_actions/staff-actions", () => ({
  createSecretariatUser,
  resetSecretariatPassword,
  setSecretariatUserActive,
  listSecretariatUsers: vi.fn(),
}));

import { UsuariosClient } from "@/app/admin/usuarios/client";

const users = [
  { id: "u-1", email: "ana@exemplo.com", ativo: true, created_at: "2026-03-10T12:00:00.000Z" },
  { id: "u-2", email: "bia@exemplo.com", ativo: false, created_at: "2026-04-02T12:00:00.000Z" },
];

describe("UsuariosClient", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("renders the page header, both sections, status pills and per-user actions", () => {
    render(<UsuariosClient initialUsers={users} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Usuários");
    expect(screen.getByRole("region", { name: "Novo acesso" })).toBeInTheDocument();
    const list = screen.getByRole("region", { name: "Acessos existentes" });

    const ana = within(list).getByTestId("user-row-u-1");
    expect(ana).toHaveTextContent("ana@exemplo.com");
    expect(ana).toHaveTextContent("Criado em 10/03/2026");
    expect(within(ana).getByText("Ativo")).toBeInTheDocument();
    expect(within(ana).getByRole("button", { name: "Redefinir senha" })).toBeInTheDocument();
    expect(within(ana).getByRole("button", { name: "Desativar" })).toBeInTheDocument();

    const bia = within(list).getByTestId("user-row-u-2");
    expect(within(bia).getByText("Inativo")).toBeInTheDocument();
    expect(within(bia).getByRole("button", { name: "Reativar" })).toBeInTheDocument();

    expect(within(list).getByRole("status")).toHaveTextContent("Quem está inativo não consegue entrar");
  });

  it("shows the empty state when there are no users", () => {
    render(<UsuariosClient initialUsers={[]} />);
    expect(screen.getByText("Nenhum acesso da Secretaria cadastrado.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("creates an access with the typed e-mail and password and appends it to the list", async () => {
    createSecretariatUser.mockResolvedValueOnce({
      success: true,
      data: { id: "u-3", email: "carla@exemplo.com", ativo: true, created_at: "2026-05-01T12:00:00.000Z" },
    });
    render(<UsuariosClient initialUsers={[]} />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "carla@exemplo.com" } });
    const password = screen.getByLabelText("Senha inicial");
    expect(password).toHaveAccessibleDescription("Mínimo de 8 caracteres. Peça para trocar no primeiro acesso.");
    fireEvent.change(password, { target: { value: "segredo123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar acesso" }));
    });

    expect(createSecretariatUser).toHaveBeenCalledWith("carla@exemplo.com", "segredo123");
    expect(screen.getByTestId("user-row-u-3")).toHaveTextContent("carla@exemplo.com");
    expect(screen.queryByText("Nenhum acesso da Secretaria cadastrado.")).toBeNull();
    expect(screen.getByLabelText("E-mail")).toHaveValue("");
    expect(screen.getByLabelText("Senha inicial")).toHaveValue("");
  });

  it("shows the action error inside the form when creation fails", async () => {
    createSecretariatUser.mockResolvedValueOnce({ success: false, error: "E-mail ou senha inválidos." });
    render(<UsuariosClient initialUsers={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Criar acesso" }));
    });

    const form = screen.getByRole("region", { name: "Novo acesso" });
    expect(within(form).getByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
  });

  it("deactivates and reactivates an access, surfacing failures next to the list", async () => {
    setSecretariatUserActive.mockResolvedValueOnce({ success: true });
    render(<UsuariosClient initialUsers={users} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    });
    expect(setSecretariatUserActive).toHaveBeenCalledWith("u-1", false);
    expect(within(screen.getByTestId("user-row-u-1")).getByText("Inativo")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reativar" })).toHaveLength(2);

    setSecretariatUserActive.mockResolvedValueOnce({ success: false, error: "Acesso não encontrado." });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Reativar" })[1]);
    });
    expect(setSecretariatUserActive).toHaveBeenLastCalledWith("u-2", true);
    const list = screen.getByRole("region", { name: "Acessos existentes" });
    expect(within(list).getByRole("alert")).toHaveTextContent("Acesso não encontrado.");
    expect(within(screen.getByTestId("user-row-u-2")).getByText("Inativo")).toBeInTheDocument();
  });

  it("resets a password through window.prompt and skips the action when cancelled", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValueOnce("novaSenha123").mockReturnValueOnce(null);
    resetSecretariatPassword.mockResolvedValueOnce({ success: true });
    render(<UsuariosClient initialUsers={users} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Redefinir senha" })[0]);
    });
    expect(prompt).toHaveBeenCalledWith("Nova senha para ana@exemplo.com (mínimo 8 caracteres):");
    expect(resetSecretariatPassword).toHaveBeenCalledWith("u-1", "novaSenha123");

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Redefinir senha" })[1]);
    });
    expect(resetSecretariatPassword).toHaveBeenCalledTimes(1);
    prompt.mockRestore();
  });

  it("reports a failed password reset", async () => {
    vi.spyOn(window, "prompt").mockReturnValueOnce("curta");
    resetSecretariatPassword.mockResolvedValueOnce({ success: false, error: "Senha inválida." });
    render(<UsuariosClient initialUsers={users} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Redefinir senha" })[0]);
    });
    const list = screen.getByRole("region", { name: "Acessos existentes" });
    expect(within(list).getByRole("alert")).toHaveTextContent("Senha inválida.");
    vi.restoreAllMocks();
  });
});
