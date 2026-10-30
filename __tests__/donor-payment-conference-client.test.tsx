import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

const actions = vi.hoisted(() => ({
  getDonorPaymentConference: vi.fn(),
  confirmDonorPayment: vi.fn(),
  getDonorPaymentReceiptUrl: vi.fn(),
  markDonorPaymentNotIdentified: vi.fn(),
  resetDonorPayment: vi.fn(),
}));
vi.mock("@/app/admin/_actions/donor-payment-conference-actions", () => actions);
vi.mock("@/app/admin/_actions/donor-receipt-actions", () => ({ issueDonorReceiptRecoveryLink: vi.fn() }));
vi.mock("recharts", () => {
  const Tag = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Bar: Tag, BarChart: Tag, CartesianGrid: Tag, ResponsiveContainer: Tag, Tooltip: Tag, XAxis: Tag, YAxis: Tag };
});

import { PagamentosClient } from "@/app/admin/pagamentos/client";

type Data = NonNullable<ComponentProps<typeof PagamentosClient>["initialData"]>;
type Row = Data["rows"][number];

const base = {
  id: "12345678-1234-4123-8123-123456789abc",
  pledge_id: "12345678-1234-4123-8123-123456789abc",
  donor_name: "Maria",
  frequency: "mensal",
  competencia: "2026-08",
  due_date: "2026-08-01",
  expected_value: "100.00",
  received_value: "0.00",
  outstanding: "100.00",
  credit_date: null,
  note: null,
  confirmed_at: null,
  confirmed_by: null,
  receipt_state: "pendente",
  has_receipt: false,
  missing_monthly_receipt: false,
  legacy_one_time: false,
  status: "pendente",
} as unknown as Row;

const data = (rows: Row[], overrides: Partial<Data> = {}): Data => ({
  coverage_start: "2026-07",
  series: [],
  rows,
  overdue: rows.filter((row) => row.missing_monthly_receipt),
  totals: { expected: "100.00", received: "0.00", outstanding: "100.00" },
  ...overrides,
});

function show(rows: Row[], overrides: Partial<Data> = {}, props: Partial<ComponentProps<typeof PagamentosClient>> = {}) {
  return render(
    <PagamentosClient initialMonth="2026-08" currentMonth="2026-10" initialData={data(rows, overrides)} {...props} />
  );
}

/** Abre o detalhe de um pagamento (só o primeiro da lista começa aberto). */
function openRow(id: string) {
  const article = screen.getByTestId(`payment-${id}`);
  const toggle = article.querySelector("button[aria-expanded]") as HTMLButtonElement;
  if (toggle.getAttribute("aria-expanded") === "false") fireEvent.click(toggle);
  return article;
}

const listIds = (testId: string, prefix = "payment-") =>
  Array.from(screen.getByTestId(testId).querySelectorAll(`article[data-testid^='${prefix}']`)).map((el) =>
    el.getAttribute("data-testid")!.replace(prefix, "")
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("payment conference UI", () => {
  it("shows the month totals and the pending hint", () => {
    show([base, { ...base, id: "done", status: "confirmado", received_value: "100.00", outstanding: "0.00" }], {
      totals: { expected: "200.00", received: "100.00", outstanding: "100.00" },
    });
    expect(screen.getByRole("heading", { level: 1, name: "Pagamentos" })).toBeInTheDocument();
    expect(screen.getByTestId("stat-esperado")).toHaveTextContent("Esperado em agosto de 2026");
    expect(screen.getByTestId("stat-esperado")).toHaveTextContent("R$ 200,00");
    expect(screen.getByTestId("stat-recebido")).toHaveTextContent("Recebido no extrato");
    expect(screen.getByTestId("stat-recebido")).toHaveTextContent("R$ 100,00");
    expect(screen.getByTestId("stat-em-aberto")).toHaveTextContent("R$ 100,00");
    expect(screen.getByTestId("stat-em-aberto")).toHaveTextContent("1 pagamento aguardando conferência");
  });

  it("sorts rows awaiting conference first and labels the bank and receipt states separately", () => {
    show([
      { ...base, id: "done", donor_name: "Ana", status: "confirmado", received_value: "100.00", outstanding: "0.00", receipt_state: "enviado", has_receipt: true },
      { ...base, id: "late", donor_name: "Bia", due_date: "2026-08-10", missing_monthly_receipt: true },
      { ...base, id: "single", donor_name: "Caio", frequency: "unica", has_receipt: true },
      { ...base, id: "lost", donor_name: "Davi", status: "nao_identificado", note: "Sem crédito" },
      { ...base, id: "diff", donor_name: "Eva", status: "divergente", received_value: "80.00", outstanding: "20.00" },
    ]);

    expect(listIds("pagamentos-lista")).toEqual(["single", "late", "done", "lost", "diff"]);
    expect(within(screen.getByTestId("payment-late")).getByText("Comprovante pendente")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-late")).getByText("Aguardando conferência")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-done")).getByText("Comprovante enviado – aguardando conferência")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-done")).getByText("Confirmado no extrato")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-single")).getByText("Doação única")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-single")).getByText("Comprovante anexado")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-lost")).getByText("Não identificado")).toBeInTheDocument();
    expect(within(screen.getByTestId("payment-diff")).getByText("Divergente")).toBeInTheDocument();

    // A pendência antiga também aparece na seção própria, com o aviso do comprovante em atraso.
    expect(listIds("pagamentos-pendencias", "overdue-payment-")).toEqual(["late"]);
    const overdue = within(screen.getByTestId("pagamentos-pendencias"));
    const toggle = overdue.getByRole("button", { expanded: false });
    fireEvent.click(toggle);
    expect(overdue.getByText("Comprovante mensal em atraso")).toBeInTheDocument();
  });

  it("shows generation only on receipt-pending monthly rows", () => {
    show([base, { ...base, id: "sent", has_receipt: true }, { ...base, id: "single", frequency: "unica" }]);
    openRow(base.id);
    openRow("sent");
    openRow("single");
    expect(screen.getAllByRole("button", { name: "Gerar link de comprovante" })).toHaveLength(1);
    expect(within(screen.getByTestId("payment-single")).getByText("Comprovante não disponível")).toBeInTheDocument();
  });

  it("offers a download for the selected month and never selects a future month", async () => {
    actions.getDonorPaymentConference.mockResolvedValue(data([]));
    show([]);
    const month = screen.getByLabelText("Mês de referência") as HTMLInputElement;
    expect(month).toHaveAttribute("max", "2026-10");
    expect(screen.getByRole("link", { name: "Baixar CSV" })).toHaveAttribute("href", "/admin/pagamentos/export?month=2026-08");
    fireEvent.change(month, { target: { value: "2026-07" } });
    await waitFor(() => expect(screen.getByRole("link", { name: "Baixar CSV" })).toHaveAttribute("href", "/admin/pagamentos/export?month=2026-07"));
    expect(actions.getDonorPaymentConference).toHaveBeenCalledWith("2026-07");
    fireEvent.change(month, { target: { value: "2027-01" } });
    expect(screen.getByRole("link", { name: "Baixar CSV" })).toHaveAttribute("href", "/admin/pagamentos/export?month=2026-07");
    expect(actions.getDonorPaymentConference).not.toHaveBeenCalledWith("2027-01");
  });

  it("shows empty states, the invalid-month warning and load errors", () => {
    show([], {}, { invalidMonth: true });
    expect(screen.getByTestId("pagamentos-invalid-month")).toHaveTextContent("Mês inválido; mostrando agosto de 2026.");
    expect(screen.getByText("Nenhum pagamento neste mês.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma pendência com mais de um mês.")).toBeInTheDocument();
    cleanup();

    render(<PagamentosClient initialMonth="2026-08" currentMonth="2026-10" initialData={null} error="Mês excede o limite de conferência." />);
    expect(screen.getByTestId("pagamentos-error")).toHaveTextContent("Mês excede o limite de conferência.");
    expect(screen.queryByTestId("pagamentos-totais")).not.toBeInTheDocument();
  });

  it("shows pending one-time receipt without counting a credit", () => {
    show([{ ...base, frequency: "unica", has_receipt: true }]);
    expect(screen.getByText("Aguardando conferência")).toBeInTheDocument();
    expect(screen.getByTestId("payment-received")).toHaveTextContent("R$ 0,00");
    expect(screen.getByRole("button", { name: "Ver comprovante" })).toBeInTheDocument();
  });

  it("confirms a credit and marks a payment as not found with the note", async () => {
    actions.getDonorPaymentConference.mockResolvedValue(data([base]));
    actions.confirmDonorPayment.mockResolvedValue({ status: "confirmado" });
    actions.markDonorPaymentNotIdentified.mockResolvedValue({ status: "nao_identificado" });

    show([base]);
    fireEvent.change(screen.getByLabelText("Valor encontrado no extrato"), { target: { value: "100,00" } });
    fireEvent.change(screen.getByLabelText("Data do crédito"), { target: { value: "2026-08-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar crédito" }));
    await waitFor(() => expect(actions.confirmDonorPayment).toHaveBeenCalledWith(base.id, "100.00", "2026-08-02", ""));
    await waitFor(() => expect(actions.getDonorPaymentConference).toHaveBeenCalledWith("2026-08"));

    await waitFor(() => expect(screen.getByRole("button", { name: "Não encontrei no extrato" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Observação"), { target: { value: "Sem crédito" } });
    fireEvent.click(screen.getByRole("button", { name: "Não encontrei no extrato" }));
    await waitFor(() => expect(actions.markDonorPaymentNotIdentified).toHaveBeenCalledWith(base.id, "Sem crédito"));
  });

  it("shows the conferred state with its details and clears the conference", async () => {
    const conferred = { ...base, status: "confirmado", received_value: "100.00", outstanding: "0.00", credit_date: "2026-08-02", note: "Pix", confirmed_at: "2026-08-03T12:00:00Z" } as Row;
    actions.getDonorPaymentConference.mockResolvedValue(data([base]));
    actions.resetDonorPayment.mockResolvedValue({ status: "pendente" });

    show([conferred]);
    expect(screen.getByText("Crédito de R$ 100,00 confirmado no extrato")).toBeInTheDocument();
    expect(screen.getByText(/Crédito em 02\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Observação: Pix/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar crédito" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar conferência" }));
    await waitFor(() => expect(actions.resetDonorPayment).toHaveBeenCalledWith(base.id));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar crédito" })).toBeInTheDocument());
  });

  it("announces a receipt lookup error and keeps the evidence control", async () => {
    actions.getDonorPaymentReceiptUrl.mockResolvedValue({ error: "Comprovante não encontrado." });
    show([{ ...base, has_receipt: true, receipt_state: "enviado" }]);
    fireEvent.click(screen.getByRole("button", { name: "Ver comprovante" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Comprovante não encontrado."));
    expect(screen.getByRole("button", { name: "Ver comprovante" })).toBeInTheDocument();
  });

  it.each(["image/png", "application/pdf", "application/octet-stream"])("previews %s inline and restores focus after Escape", async (type) => {
    actions.getDonorPaymentReceiptUrl.mockResolvedValue({ url: "/api/documents?ticket=abc", type });
    show([{ ...base, has_receipt: true }]);
    const trigger = screen.getByRole("button", { name: "Ver comprovante" });
    fireEvent.click(trigger);
    const panel = await screen.findByRole("region", { name: "Prévia do comprovante" });
    expect(screen.getByRole("button", { name: "Fechar prévia" })).toHaveFocus();
    if (type.startsWith("image/")) expect(panel.querySelector("img")).toBeTruthy();
    else if (type === "application/pdf") expect(screen.getByTitle("Comprovante de Maria")).toBeInTheDocument();
    else expect(screen.getByRole("link", { name: "Abrir em nova aba" })).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(panel).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("changes month and preserves entered values after a failed save", async () => {
    actions.getDonorPaymentConference.mockResolvedValue(data([]));
    actions.confirmDonorPayment.mockRejectedValue(new Error("Falha ao salvar"));
    show([base]);
    fireEvent.change(screen.getByLabelText("Valor encontrado no extrato"), { target: { value: "80,00" } });
    fireEvent.change(screen.getByLabelText("Data do crédito"), { target: { value: "2026-08-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar crédito" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Falha ao salvar"));
    expect(screen.getByLabelText("Valor encontrado no extrato")).toHaveValue("80,00");
    expect(screen.getByLabelText("Valor encontrado no extrato")).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(screen.getByLabelText("Mês de referência"), { target: { value: "2026-07" } });
    await waitFor(() => expect(screen.getByText("Nenhum pagamento neste mês.")).toBeInTheDocument());
  });

  it("reports a month load failure without dropping the page", async () => {
    actions.getDonorPaymentConference.mockRejectedValue(new Error("Mês futuro inválido."));
    show([base]);
    fireEvent.change(screen.getByLabelText("Mês de referência"), { target: { value: "2026-06" } });
    await waitFor(() => expect(screen.getByTestId("pagamentos-error")).toHaveTextContent("Mês futuro inválido."));
    expect(screen.getByTestId("stat-esperado")).toBeInTheDocument();
  });
});
