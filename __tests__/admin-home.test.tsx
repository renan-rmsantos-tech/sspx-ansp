import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { AdminHome, competenciaLabel } from "@/app/admin/_components/admin-home";
import type { AdminHomeSummary } from "@/app/admin/_actions/admin-home-actions";

function makeSummary(overrides: Partial<AdminHomeSummary> = {}): AdminHomeSummary {
  return {
    schoolYear: { nome: "2026" },
    applications: { total: 6, pendente: 2, aprovada: 3, rejeitada: 1 },
    donors: { total: 5, mensal: 3, unica: 2, monthlyAmount: 1230, pendingWelcome: 1 },
    payments: { competencia: "2026-10", expectedAmount: 450, count: 3, confirmedAmount: 150, withReceipt: 1 },
    ...overrides,
  };
}

afterEach(cleanup);

describe("AdminHome", () => {
  // UT-020
  it("lista os três cartões com contagem e plural para admin", () => {
    render(<AdminHome summary={makeSummary()} role="admin" />);
    expect(screen.getByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(screen.getByText("Ano letivo 2026 em andamento. Veja o que precisa de atenção e siga para a tarefa.")).toBeInTheDocument();
    expect(screen.getByTestId("home-task-solicitacoes")).toHaveTextContent("2 solicitações aguardando decisão");
    expect(screen.getByTestId("home-task-benfeitores")).toHaveTextContent("1 benfeitor sem e-mail de boas-vindas");
    expect(screen.getByTestId("home-task-pagamentos")).toHaveTextContent("3 pagamentos aguardando conferência");
    expect(screen.getByText("Confira os créditos de outubro de 2026 no extrato bancário.")).toBeInTheDocument();
  });

  // UT-021
  it("usa o singular com uma solicitação", () => {
    render(<AdminHome summary={makeSummary({ applications: { total: 1, pendente: 1, aprovada: 0, rejeitada: 0 } })} role="admin" />);
    expect(screen.getByTestId("home-task-solicitacoes")).toHaveTextContent("1 solicitação aguardando decisão");
  });

  // UT-022
  it("liga cada cartão à lista já filtrada", () => {
    render(<AdminHome summary={makeSummary()} role="admin" />);
    expect(screen.getByRole("link", { name: "Ver solicitações" })).toHaveAttribute("href", "/admin/solicitacoes?situacao=pendente");
    expect(screen.getByRole("link", { name: "Ver benfeitores" })).toHaveAttribute("href", "/admin/benfeitores?boas-vindas=pendentes");
    expect(screen.getByRole("link", { name: "Conferir pagamentos" })).toHaveAttribute("href", "/admin/pagamentos");
  });

  // UT-023
  it("mostra só o cartão de solicitações e sem Resumo para secretaria", () => {
    render(<AdminHome summary={makeSummary()} role="secretaria" />);
    expect(screen.getByRole("link", { name: "Ver solicitações" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver benfeitores" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Conferir pagamentos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Resumo" })).not.toBeInTheDocument();
  });

  // US-003 EC-1
  it("mantém os cartões com zero e botão habilitado", () => {
    render(
      <AdminHome
        summary={makeSummary({
          applications: { total: 0, pendente: 0, aprovada: 0, rejeitada: 0 },
          donors: { total: 0, mensal: 0, unica: 0, monthlyAmount: 0, pendingWelcome: 0 },
          payments: { competencia: "2026-10", expectedAmount: 0, count: 0, confirmedAmount: 0, withReceipt: 0 },
        })}
        role="admin"
      />
    );
    expect(screen.getByTestId("home-task-solicitacoes")).toHaveTextContent("0 solicitações aguardando decisão");
    expect(screen.getByTestId("home-task-benfeitores")).toHaveTextContent("0 benfeitores sem e-mail de boas-vindas");
    expect(screen.getByTestId("home-task-pagamentos")).toHaveTextContent("0 pagamentos aguardando conferência");
    expect(screen.getByRole("link", { name: "Ver solicitações" })).toBeInTheDocument();
  });

  // UT-024
  it("avisa quando não há ano letivo ativo", () => {
    render(<AdminHome summary={makeSummary({ schoolYear: null })} role="admin" />);
    expect(screen.getByText(/^Nenhum ano letivo ativo/)).toBeInTheDocument();
  });

  // UT-025
  it("mostra um alerta quando o resumo não pôde ser carregado", () => {
    render(<AdminHome summary={null} role="admin" error="Não foi possível carregar o resumo." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar o resumo");
    expect(screen.getByRole("heading", { level: 1, name: "Início" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver solicitações" })).not.toBeInTheDocument();
  });

  // UT-026
  it("mostra o Resumo com os quatro números formatados", () => {
    render(<AdminHome summary={makeSummary()} role="admin" />);
    const resumo = screen.getByRole("heading", { name: "Resumo" }).closest("section")!;
    expect(within(resumo).getByText("Solicitações no ano")).toBeInTheDocument();
    expect(within(resumo).getByText("6")).toBeInTheDocument();
    expect(within(resumo).getByText("3 aprovadas · 1 rejeitadas")).toBeInTheDocument();
    expect(within(resumo).getByText("Benfeitores")).toBeInTheDocument();
    expect(within(resumo).getByText("3 mensais · 2 doações únicas")).toBeInTheDocument();
    expect(within(resumo).getByText("Contribuição mensal")).toBeInTheDocument();
    expect(within(resumo).getByText("R$ 1.230,00")).toBeInTheDocument();
    expect(within(resumo).getByText("Esperado em outubro de 2026")).toBeInTheDocument();
    expect(within(resumo).getByText("R$ 450,00")).toBeInTheDocument();
    expect(within(resumo).getByText("R$ 150,00 confirmados no extrato · 1 com comprovante")).toBeInTheDocument();
  });

  it("formata a competência em pt-BR", () => {
    expect(competenciaLabel("2026-01")).toBe("janeiro de 2026");
    expect(competenciaLabel("2026-12")).toBe("dezembro de 2026");
  });
});
