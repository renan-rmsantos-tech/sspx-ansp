import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const { getDocumentUrl } = vi.hoisted(() => ({ getDocumentUrl: vi.fn() }));
vi.mock("@/app/admin/_actions/admin-actions", () => ({ getDocumentUrl }));

import { PagamentosClient } from "@/app/admin/pagamentos/client";
import type { MonthlyPaymentRow } from "@/app/admin/_actions/donor-payment-actions";

function row(overrides: Partial<MonthlyPaymentRow> & { id: string }): MonthlyPaymentRow {
  return {
    pledge_id: `pledge-${overrides.id}`,
    nome: "Benfeitor",
    competencia: "2026-10",
    due_date: "2026-10-10",
    expected_value: 100,
    receipt_path: null,
    receipt_name: null,
    receipt_uploaded_at: null,
    ...overrides,
  };
}

const ROWS: MonthlyPaymentRow[] = [
  row({
    id: "a",
    nome: "Ana Souza",
    due_date: "2026-10-05",
    expected_value: 150,
    receipt_path: "donors/pledge-a/2026-10.pdf",
    receipt_name: "comprovante-ana.pdf",
    receipt_uploaded_at: "2026-10-06T15:00:00Z",
  }),
  row({ id: "b", nome: "Bruno Lima", due_date: "2026-10-10", expected_value: 300 }),
  row({ id: "c", nome: "Carla Dias", due_date: "2026-10-20", expected_value: 50 }),
];

/** Abre o detalhe da linha (só a primeira começa aberta) e devolve o article. */
function openRow(id: string) {
  const article = screen.getByTestId(`payment-row-${id}`);
  const toggle = article.querySelector("button[aria-expanded]") as HTMLButtonElement;
  if (toggle.getAttribute("aria-expanded") === "false") fireEvent.click(toggle);
  return article;
}

const rowIds = () =>
  Array.from(screen.getByTestId("pagamentos-lista").querySelectorAll("[data-testid^='payment-row-']")).map((el) =>
    el.getAttribute("data-testid")!.replace("payment-row-", "")
  );

afterEach(cleanup);
beforeEach(() => {
  getDocumentUrl.mockReset();
});

describe("PagamentosClient", () => {
  // UT-073
  it("mostra os três totais do mês com a dica de pagamentos sem comprovante", () => {
    render(<PagamentosClient competencia="2026-10" rows={ROWS} />);

    expect(screen.getByRole("heading", { level: 1, name: "Pagamentos" })).toBeInTheDocument();
    const esperado = screen.getByTestId("stat-esperado");
    expect(esperado).toHaveTextContent("Esperado em outubro de 2026");
    expect(esperado).toHaveTextContent("R$ 500,00");

    const com = screen.getByTestId("stat-com-comprovante");
    expect(com).toHaveTextContent("Com comprovante");
    expect(com).toHaveTextContent("R$ 150,00");

    const sem = screen.getByTestId("stat-sem-comprovante");
    expect(sem).toHaveTextContent("Sem comprovante");
    expect(sem).toHaveTextContent("R$ 350,00");
    expect(sem).toHaveTextContent("2 pagamentos");
  });

  it("usa o singular na dica quando há um só pagamento sem comprovante", () => {
    render(<PagamentosClient competencia="2026-10" rows={[ROWS[1]]} />);
    expect(screen.getByTestId("stat-sem-comprovante")).toHaveTextContent("1 pagamento");
  });

  // UT-074
  it("ordena sem comprovante primeiro e só oferece Ver comprovante quando há arquivo", async () => {
    getDocumentUrl.mockResolvedValue({ url: "/api/documents?ticket=abc" });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<PagamentosClient competencia="2026-10" rows={ROWS} />);

    expect(rowIds()).toEqual(["b", "c", "a"]);
    expect(screen.getAllByText("Aguardando conferência")).toHaveLength(3);

    const bruno = screen.getByTestId("payment-row-b");
    expect(within(bruno).getByText("Bruno Lima")).toBeInTheDocument();
    expect(within(bruno).getByText("R$ 300,00", { selector: "span" })).toBeInTheDocument();
    expect(within(bruno).getByText("Mensal")).toBeInTheDocument();
    expect(within(bruno).getByText("Vencimento 10/10/2026")).toBeInTheDocument();
    expect(within(bruno).getByText("Sem comprovante")).toBeInTheDocument();
    expect(within(bruno).queryByTestId("payment-receipt-button")).not.toBeInTheDocument();
    expect(within(bruno).getByText("A confirmação do crédito no extrato ainda não está disponível neste painel.")).toBeInTheDocument();

    const ana = openRow("a");
    expect(within(ana).getByText("Comprovante disponível")).toBeInTheDocument();
    const detail = within(ana).getByTestId("payment-detail-a");
    expect(within(detail).getByText("Valor esperado")).toBeInTheDocument();
    expect(within(detail).getByText("Comprovante enviado em")).toBeInTheDocument();
    expect(within(detail).getByText("06/10/2026")).toBeInTheDocument();
    expect(within(detail).getByText("comprovante-ana.pdf")).toBeInTheDocument();

    fireEvent.click(within(ana).getByTestId("payment-receipt-button"));
    await waitFor(() => expect(getDocumentUrl).toHaveBeenCalledWith("donors/pledge-a/2026-10.pdf"));
    await waitFor(() => expect(open).toHaveBeenCalledWith("/api/documents?ticket=abc", "_blank", "noopener,noreferrer"));
    open.mockRestore();
  });

  it("mostra o erro quando o comprovante não pode ser aberto", async () => {
    getDocumentUrl.mockResolvedValue({ error: "Documento não encontrado." });
    render(<PagamentosClient competencia="2026-10" rows={[ROWS[0]]} />);

    fireEvent.click(screen.getByTestId("payment-receipt-button"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Documento não encontrado."));
  });

  // UT-075
  it("avisa quando o mês da URL é inválido", () => {
    render(<PagamentosClient competencia="2026-10" rows={[]} invalidMonth />);
    expect(screen.getByTestId("pagamentos-invalid-month")).toHaveTextContent("Mês inválido; mostrando outubro de 2026");
    expect((screen.getByLabelText("Mês") as HTMLInputElement).value).toBe("2026-10");
  });

  // UT-076
  it("mostra o estado vazio sem pagamentos no mês", () => {
    render(<PagamentosClient competencia="2026-10" rows={[]} />);
    expect(screen.getByText("Nenhum pagamento mensal esperado em outubro de 2026")).toBeInTheDocument();
    expect(screen.queryByTestId("pagamentos-lista")).not.toBeInTheDocument();
    expect(screen.getByTestId("stat-esperado")).toHaveTextContent("R$ 0,00");
  });

  it("mostra o erro de leitura", () => {
    render(<PagamentosClient competencia="2026-10" rows={[]} error="Não foi possível carregar os pagamentos do mês." />);
    expect(screen.getByTestId("pagamentos-error")).toHaveTextContent("Não foi possível carregar os pagamentos do mês.");
  });

  // UT-077
  it("não renderiza os controles de conferência bancária nem CSV", () => {
    render(<PagamentosClient competencia="2026-10" rows={ROWS} />);
    openRow("a");
    openRow("c");
    for (const text of ["Confirmar crédito", "Não encontrei no extrato", "Baixar CSV", "Recebido", "Em aberto"]) {
      expect(screen.queryByText(text, { exact: false })).not.toBeInTheDocument();
    }
    const form = screen.getByLabelText("Mês").closest("form") as HTMLFormElement;
    expect(form.getAttribute("method")).toBe("get");
    expect((screen.getByLabelText("Mês") as HTMLInputElement).name).toBe("mes");
    expect(screen.getByRole("button", { name: "Ver mês" })).toBeInTheDocument();
  });
});
