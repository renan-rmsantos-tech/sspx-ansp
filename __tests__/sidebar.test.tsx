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

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders all three navigation links", () => {
    render(<Sidebar />);
    expect(screen.getByText("Solicitações")).toBeInTheDocument();
    expect(screen.getByText("Ano Letivo")).toBeInTheDocument();
    expect(screen.getByText("Textos de Decisão")).toBeInTheDocument();
  });

  it("renders correct hrefs", () => {
    render(<Sidebar />);
    expect(screen.getByText("Solicitações").closest("a")).toHaveAttribute(
      "href",
      "/admin/solicitacoes"
    );
    expect(screen.getByText("Ano Letivo").closest("a")).toHaveAttribute(
      "href",
      "/admin/ano-letivo"
    );
    expect(screen.getByText("Textos de Decisão").closest("a")).toHaveAttribute(
      "href",
      "/admin/textos"
    );
  });

  it("highlights the correct active link based on pathname", () => {
    mockPathname = "/admin/solicitacoes";
    const { unmount } = render(<Sidebar />);

    const solLink = screen.getByText("Solicitações").closest("a");
    expect(solLink).toHaveAttribute("aria-current", "page");
    expect(solLink?.className).toContain("text-accent");

    const anoLink = screen.getByText("Ano Letivo").closest("a");
    expect(anoLink).not.toHaveAttribute("aria-current");

    unmount();

    mockPathname = "/admin/ano-letivo";
    render(<Sidebar />);

    const anoLinkActive = screen.getByText("Ano Letivo").closest("a");
    expect(anoLinkActive).toHaveAttribute("aria-current", "page");
    expect(anoLinkActive?.className).toContain("text-accent");

    const solLinkInactive = screen.getByText("Solicitações").closest("a");
    expect(solLinkInactive).not.toHaveAttribute("aria-current");
  });

  it("renders the Dados and Configurações section labels", () => {
    render(<Sidebar />);
    expect(screen.getByText("Dados")).toBeInTheDocument();
    expect(screen.getByText("Configurações")).toBeInTheDocument();
    expect(screen.getByText("Modelos")).toBeInTheDocument();
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

it("agrupa os modelos e mantém configurações separadas", () => {
  render(<Sidebar />);
  const models = screen.getByText("Modelos").parentElement!;
  expect(models).toHaveTextContent("Cabeçalho");
  expect(models).toHaveTextContent("Textos de Decisão");
  expect(models).toHaveTextContent("Modelo de Contrato");
  expect(models).toHaveTextContent("E-mail para Benfeitores");
  expect(models).not.toHaveTextContent("Ano Letivo");
  cleanup();
});
it("oculta modelos para a secretaria", () => {
  render(<Sidebar role="secretaria" />);
  expect(screen.queryByText("Modelos")).not.toBeInTheDocument();
  expect(screen.queryByText("E-mail para Benfeitores")).not.toBeInTheDocument();
  cleanup();
});
