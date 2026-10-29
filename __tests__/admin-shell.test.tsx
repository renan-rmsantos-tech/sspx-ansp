import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";

let mockPathname = "/admin/solicitacoes";
const mockLogout = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/login/_actions/auth-actions", () => ({
  logout: () => mockLogout(),
}));

vi.mock("@/components/ui/seal-logo", () => ({
  SealLogo: ({ size }: { size?: number }) => <svg data-testid="shell-seal" data-size={size} />,
}));

import { AdminShell } from "@/app/admin/_components/admin-shell";

const admin = { email: "admin@admin.com", role: "admin" as const };
const secretaria = { email: "sec@escola.org", role: "secretaria" as const };

function renderShell(props: Partial<React.ComponentProps<typeof AdminShell>> = {}) {
  return render(
    <AdminShell staff={admin} counts={null} {...props}>
      <p>conteúdo</p>
    </AdminShell>
  );
}

function linkNames() {
  const nav = screen.getByRole("navigation", { name: "Menu administrativo" });
  return within(nav).getAllByRole("link").map((link) => link.textContent?.trim());
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockPathname = "/admin/solicitacoes";
});

describe("AdminShell — menu e contadores", () => {
  // UT-004
  it("mostra os contadores de Solicitações e Benfeitores para admin", () => {
    renderShell({ counts: { pendingApplications: 3, pendingWelcome: 2 } });
    expect(screen.getByRole("link", { name: "Solicitações 3" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Benfeitores 2" })).toBeInTheDocument();
  });

  // UT-005
  it("não mostra badge quando a contagem é zero", () => {
    renderShell({ counts: { pendingApplications: 0, pendingWelcome: 0 } });
    expect(screen.getByRole("link", { name: "Solicitações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Benfeitores" })).toBeInTheDocument();
  });

  // UT-006
  it("não mostra o contador de boas-vindas para secretaria", () => {
    renderShell({ staff: secretaria, counts: { pendingApplications: 1, pendingWelcome: 2 } });
    expect(screen.getByRole("link", { name: "Solicitações 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Benfeitores" })).toBeInTheDocument();
    expect(linkNames()).toEqual(["Início", "Solicitações 1", "Benfeitores"]);
    expect(screen.queryByText("Configurações")).not.toBeInTheDocument();
  });

  // UT-007
  it("renderiza sem badges quando os contadores estão indisponíveis", () => {
    renderShell({ counts: null });
    expect(linkNames()).toEqual([
      "Início",
      "Solicitações",
      "Ano letivo",
      "Benfeitores",
      "Pagamentos",
      "E-mails",
      "Relatórios",
      "Modelos de documentos",
      "Cabeçalho e rodapé",
      "Usuários",
    ]);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  // UT-011
  it("marca o item da rota atual com aria-current", () => {
    mockPathname = "/admin/solicitacoes/abc";
    renderShell();
    const active = screen.getByRole("link", { name: "Solicitações" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.className).toContain("bg-accent");
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current");
  });

  it("ativa só Início em /admin", () => {
    mockPathname = "/admin";
    renderShell();
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Solicitações" })).not.toHaveAttribute("aria-current");
  });

  // UT-012
  it("não inclui Padrões visuais para nenhum papel", () => {
    const { unmount } = renderShell();
    expect(screen.queryByText("Padrões visuais")).not.toBeInTheDocument();
    unmount();
    renderShell({ staff: secretaria });
    expect(screen.queryByText("Padrões visuais")).not.toBeInTheDocument();
  });
});

describe("AdminShell — barra superior e menu mobile", () => {
  // UT-008
  it("alterna o botão de menu entre Abrir e Fechar", () => {
    renderShell();
    const button = screen.getByRole("button", { name: "Abrir menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-label", "Fechar menu");
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-label", "Abrir menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  // UT-009
  it("fecha com Escape e devolve o foco ao botão", () => {
    renderShell();
    const button = screen.getByRole("button", { name: "Abrir menu" });
    fireEvent.click(button);
    expect(screen.getByRole("link", { name: "Início" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("fecha ao clicar no fundo escurecido e ao clicar em um item", () => {
    const { container } = renderShell();
    const button = screen.getByRole("button", { name: "Abrir menu" });
    fireEvent.click(button);
    fireEvent.click(container.querySelector(".fixed.inset-0")!);
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("link", { name: "Benfeitores" }));
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  // UT-010
  it("mostra e-mail e papel do usuário e chama logout em Sair", async () => {
    mockLogout.mockResolvedValue(undefined);
    const { unmount } = renderShell();
    expect(screen.getByTestId("shell-seal")).toHaveAttribute("data-size", "30");
    expect(screen.getByText("Arca N. S. da Providência")).toBeInTheDocument();
    const user = within(screen.getByTestId("shell-user"));
    expect(user.getByText("admin@admin.com")).toBeInTheDocument();
    expect(user.getByText("Administração")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    unmount();

    renderShell({ staff: secretaria });
    const sec = within(screen.getByTestId("shell-user"));
    expect(sec.getByText("sec@escola.org")).toBeInTheDocument();
    expect(sec.getByText("Secretaria")).toBeInTheDocument();
  });

  // US-002 EC-1
  it("mostra Saindo… e desabilita o botão enquanto o logout está pendente", async () => {
    mockLogout.mockReturnValue(new Promise(() => {}));
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    const pending = await screen.findByRole("button", { name: "Saindo…" });
    expect(pending).toBeDisabled();
  });
});
