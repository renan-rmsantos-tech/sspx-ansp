import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

let mockPathname = "/admin/solicitacoes";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    onClick,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { Sidebar } from "@/app/admin/_components/sidebar";

function menuSections() {
  const nav = screen.getByRole("navigation", { name: "Menu administrativo" });
  return Array.from(nav.children).map((group) => ({
    title: group.firstElementChild?.textContent,
    links: Array.from(group.querySelectorAll("a")).map((link) => ({
      label: link.textContent?.trim(),
      href: link.getAttribute("href"),
    })),
  }));
}

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
    mockPathname = "/admin/solicitacoes";
  });

  it("shows every administrator link in the requested group and item order", () => {
    render(<Sidebar role="admin" />);

    expect(menuSections()).toEqual([
      {
        title: "Bolsas",
        links: [
          { label: "Solicitações", href: "/admin/solicitacoes" },
          { label: "Ano letivo", href: "/admin/ano-letivo" },
          { label: "Textos de decisão", href: "/admin/textos" },
          { label: "Modelo de contrato", href: "/admin/contrato" },
        ],
      },
      {
        title: "Benfeitores",
        links: [
          { label: "Cadastros", href: "/admin/benfeitores" },
          { label: "Relatórios", href: "/admin/relatorios" },
        ],
      },
      {
        title: "E-mails aos benfeitores",
        links: [
          { label: "Boas-vindas", href: "/admin/email-benfeitores" },
          { label: "Instruções do pagamento mensal", href: "/admin/instrucoes-benfeitores" },
          { label: "Lembretes de pagamento", href: "/admin/lembretes-benfeitores" },
        ],
      },
      {
        title: "Sistema",
        links: [
          { label: "Usuários", href: "/admin/usuarios" },
          { label: "Cabeçalho e rodapé", href: "/admin/cabecalho" },
        ],
      },
    ]);
    expect(screen.queryByRole("link", { name: "Conferência de pagamentos" })).not.toBeInTheDocument();
  });

  it("keeps only the existing Secretaria destinations and omits empty groups", () => {
    render(<Sidebar role="secretaria" />);

    expect(menuSections()).toEqual([
      {
        title: "Bolsas",
        links: [{ label: "Solicitações", href: "/admin/solicitacoes" }],
      },
      {
        title: "Benfeitores",
        links: [{ label: "Cadastros", href: "/admin/benfeitores" }],
      },
    ]);
    expect(screen.queryByText("E-mails aos benfeitores")).not.toBeInTheDocument();
    expect(screen.queryByText("Sistema")).not.toBeInTheDocument();
    expect(menuSections().every((section) => section.links.length > 0)).toBe(true);
  });

  it("highlights the correct active link based on pathname", () => {
    mockPathname = "/admin/solicitacoes";
    const { unmount } = render(<Sidebar />);

    const solLink = screen.getByText("Solicitações").closest("a");
    expect(solLink).toHaveAttribute("aria-current", "page");
    expect(solLink?.className).toContain("text-accent");

    const anoLink = screen.getByText("Ano letivo").closest("a");
    expect(anoLink).not.toHaveAttribute("aria-current");

    unmount();

    mockPathname = "/admin/ano-letivo";
    render(<Sidebar />);

    const anoLinkActive = screen.getByText("Ano letivo").closest("a");
    expect(anoLinkActive).toHaveAttribute("aria-current", "page");
    expect(anoLinkActive?.className).toContain("text-accent");

    const solLinkInactive = screen.getByText("Solicitações").closest("a");
    expect(solLinkInactive).not.toHaveAttribute("aria-current");
  });

  it("renders hamburger button for mobile", () => {
    render(<Sidebar />);
    expect(screen.getByLabelText("Abrir menu")).toBeInTheDocument();
  });

  it("toggles mobile menu on hamburger click", () => {
    render(<Sidebar />);
    const btn = screen.getByLabelText("Abrir menu");

    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });
});
