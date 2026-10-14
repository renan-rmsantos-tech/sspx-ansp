import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/page";

describe("public project explanation", () => {
  afterEach(cleanup);

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })),
    });
  });

  it("exposes the explanation in the main navigation and links to benefactor signup", () => {
    render(<LandingPage />);

    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(navigation).getByRole("link", { name: "Como funciona" })).toHaveAttribute(
      "href",
      "#como-funciona"
    );

    const explanation = screen.getByRole("region", { name: "Uma estrutura comum para dar estabilidade às bolsas" });
    expect(within(explanation).getByRole("link", { name: "Seja um benfeitor" })).toHaveAttribute(
      "href",
      "/seja-um-benfeitor"
    );
    expect(within(explanation).getByRole("heading", { name: "Benfeitores" })).toBeInTheDocument();
    expect(within(explanation).getByRole("heading", { name: "Associação" })).toBeInTheDocument();
    expect(within(explanation).getByRole("heading", { name: "Escolas, alunos e famílias" })).toBeInTheDocument();

    // Source review: purpose (slides 2, 17), stability (4, 7–8), participant flow (10–11),
    // and responsibilities (12–14). Eligibility and affiliation claims are excluded.
    expect(explanation.textContent).not.toMatch(/renda|percentual|FSSPX|obrigatóri|garantia de bolsa/i);
  });

  it("keeps the main navigation available on narrow screens", () => {
    render(<LandingPage />);
    const styles = document.querySelector(".ansp-landing style")?.textContent ?? "";
    expect(styles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.nav-links\s*\{[^}]*display:\s*flex/);
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });
});
