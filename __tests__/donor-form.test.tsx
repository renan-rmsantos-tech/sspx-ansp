import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DonorForm } from "@/app/benfeitor/_components/donor-form";
import { registerDonorPledge } from "@/app/benfeitor/_actions/donor-actions";
import { createUploadUrl } from "@/app/form/_actions/form-actions";

const { lookupCep } = vi.hoisted(() => ({ lookupCep: vi.fn() }));

vi.mock("@/app/benfeitor/_actions/donor-actions", () => ({
  registerDonorPledge: vi.fn(),
}));

vi.mock("@/app/form/_actions/form-actions", () => ({
  createUploadUrl: vi.fn(),
}));

vi.mock("@/lib/cep/viacep", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cep/viacep")>()),
  lookupCep,
}));

describe("DonorForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  beforeEach(() => vi.clearAllMocks());

  function fillDonorDetails() {
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Ana Silva" } });
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "529.982.247-25" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "11999999999" } });
    fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "13250000" } });
    fireEvent.change(screen.getByLabelText("Cidade de residência"), { target: { value: "Campinas" } });
    fireEvent.change(screen.getByLabelText("Estado (UF)"), { target: { value: "SP" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Confirmo que a cidade/ }));
    fireEvent.change(screen.getByLabelText("Endereço completo"), { target: { value: "Rua das Flores, 1" } });
    fireEvent.change(screen.getByLabelText("Priorado / Capela que frequenta"), { target: { value: "nenhuma" } });
  }

  it("suggests city and UF from ViaCEP and allows the donor to correct them", async () => {
    lookupCep.mockResolvedValueOnce({
      ok: true,
      address: { cep: "01001-000", logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" },
    });
    render(<DonorForm />);

    fireEvent.change(screen.getByTestId("donor-cep"), { target: { value: "01001000" } });
    fireEvent.blur(screen.getByTestId("donor-cep"));

    const city = await screen.findByLabelText("Cidade de residência");
    expect(city).toHaveValue("São Paulo");
    const state = screen.getByLabelText("Estado (UF)");
    expect(state).toHaveValue("SP");

    fireEvent.change(city, { target: { value: "Campinas" } });
    fireEvent.change(state, { target: { value: "RJ" } });
    expect(city).toHaveValue("Campinas");
    expect(state).toHaveValue("RJ");
    expect(screen.getByRole("checkbox", { name: /Confirmo que a cidade/ })).not.toBeChecked();
  });

  it("does not overwrite a residence correction made while ViaCEP is loading", async () => {
    let resolveLookup!: (value: {
      ok: true;
      address: { cep: string; logradouro: string; bairro: string; localidade: string; uf: string };
    }) => void;
    lookupCep.mockReturnValueOnce(new Promise((resolve) => { resolveLookup = resolve; }));
    render(<DonorForm />);

    fireEvent.change(screen.getByTestId("donor-cep"), { target: { value: "01001000" } });
    fireEvent.blur(screen.getByTestId("donor-cep"));
    fireEvent.change(screen.getByLabelText("Cidade de residência"), { target: { value: "Campinas" } });
    fireEvent.change(screen.getByLabelText("Estado (UF)"), { target: { value: "SP" } });
    resolveLookup({
      ok: true,
      address: { cep: "01001-000", logradouro: "", bairro: "", localidade: "São Paulo", uf: "SP" },
    });

    expect(await screen.findByLabelText("Cidade de residência")).toHaveValue("Campinas");
    expect(screen.getByLabelText("Estado (UF)")).toHaveValue("SP");
  });

  it("keeps residence fields editable when ViaCEP fails", async () => {
    lookupCep.mockResolvedValueOnce({ ok: false, error: "Não foi possível consultar o CEP. Tente novamente." });
    render(<DonorForm />);
    fireEvent.change(screen.getByTestId("donor-cep"), { target: { value: "01001000" } });
    fireEvent.blur(screen.getByTestId("donor-cep"));

    expect(await screen.findByText("Não foi possível consultar o CEP. Tente novamente.")).toBeInTheDocument();
    expect(screen.getByLabelText("Cidade de residência")).toBeEnabled();
    expect(screen.getByLabelText("Estado (UF)")).toBeEnabled();
  });

  it("shows the correct donation presets for each payment frequency", () => {
    render(<DonorForm />);

    expect(screen.getByRole("button", { name: "R$ 80" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 200" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "R$ 1.200 (1 bolsa)" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Uma vez" }));

    expect(screen.getByRole("button", { name: "R$ 500" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R$ 800" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "R$ 1.200 (1 bolsa mensal)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "R$ 14.400 (12 bolsas / 1 ano)" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "R$ 80" })).not.toBeInTheDocument();
  });

  it("shows Pix before one-time date and receipt and displays both missing-field errors", () => {
    render(<DonorForm />);
    fireEvent.click(screen.getByRole("button", { name: "Uma vez" }));
    const pix = screen.getByRole("heading", { name: "Faça sua contribuição por Pix" });
    const date = screen.getByLabelText(/Data do pagamento/);
    const receipt = screen.getByTestId("upload-area");
    expect(pix.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(date.compareDocumentPosition(receipt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(date).toBeRequired();
    expect(date).toHaveAccessibleName("Data do pagamento (obrigatório)");
    expect(document.querySelector('label[for="donor-data"] [aria-hidden="true"]')).toHaveTextContent("*");
    const uploadInput = screen.getByTestId("upload-input");
    expect(uploadInput).toHaveAccessibleName("Comprovante de pagamento (obrigatório)");
    expect(document.getElementById("donor-receipt-label")?.querySelector('[aria-hidden="true"]')).toHaveTextContent("*");
    expect(uploadInput).toBeRequired();
    expect(uploadInput).toHaveAttribute("aria-required", "true");
    expect(uploadInput).toHaveAccessibleDescription("Obrigatório para doação única. Após fazer o Pix, anexe o comprovante (imagem ou PDF, até 10 MB).");
    fireEvent.click(screen.getByTestId("donor-submit"));
    expect(screen.getByText("Informe a data do pagamento.")).toBeInTheDocument();
    expect(screen.getByText("Envie o recibo de pagamento.")).toBeInTheDocument();
    expect(date).toHaveAccessibleDescription("Informe a data do pagamento.");
    expect(uploadInput).toHaveAccessibleDescription("Obrigatório para doação única. Após fazer o Pix, anexe o comprovante (imagem ou PDF, até 10 MB). Envie o recibo de pagamento.");
    expect(screen.queryByRole("group", { name: "Dia do pagamento mensal" })).not.toBeInTheDocument();
  });

  it("requires an explicit choice from five keyboard-focusable days", () => {
    render(<DonorForm />);
    fillDonorDetails();
    const group = screen.getByRole("group", { name: "Dia do pagamento mensal" });
    const days = [1, 10, 15, 20, 30];
    const radios = days.map((day) => screen.getByRole("radio", { name: `Dia ${day}` }));
    expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(5);
    for (const radio of radios) {
      expect(radio).not.toBeChecked();
      expect(radio).toBeRequired();
      expect(radio).toHaveAttribute("name", "dia_vencimento");
    }
    radios[0].focus();
    expect(radios[0]).toHaveFocus();
    fireEvent.click(screen.getByTestId("donor-submit"));
    expect(screen.getByText("Selecione um dia de pagamento: 1, 10, 15, 20 ou 30.")).toBeInTheDocument();
    expect(registerDonorPledge).not.toHaveBeenCalled();
    fireEvent.click(radios[4]);
    expect(radios[4]).toBeChecked();
    expect(screen.queryByText("Selecione um dia de pagamento: 1, 10, 15, 20 ou 30.")).not.toBeInTheDocument();
  });

  it("explains the monthly email, receipt obligation, day 30, and opt-in reminders without on-screen Pix", () => {
    render(<DonorForm />);
    expect(screen.queryByRole("heading", { name: "Faça sua contribuição por Pix" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("upload-area")).not.toBeInTheDocument();
    expect(screen.getByText("Você receberá por e-mail as instruções para pagar por Pix. Não é preciso pagar agora. Cada pagamento mensal exige o envio do comprovante pelo link que enviaremos.")).toBeInTheDocument();
    expect(screen.getByText("Se escolher o dia 30, em fevereiro o vencimento será no último dia do mês.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Dia do pagamento mensal" })).toHaveAccessibleDescription("Se escolher o dia 30, em fevereiro o vencimento será no último dia do mês.");
    expect(screen.getByText("Avisaremos 10 e 5 dias antes de cada vencimento, com o link para enviar o comprovante.")).toBeInTheDocument();
    const reminder = screen.getByRole("checkbox", { name: "Receber lembrete por e-mail" });
    expect(reminder).toHaveAccessibleDescription("Avisaremos 10 e 5 dias antes de cada vencimento, com o link para enviar o comprovante.");
    expect(reminder).not.toBeChecked();
  });

  it.each([1, 10, 15, 20, 30])("submits monthly day %i without a receipt", async (day) => {
    vi.mocked(registerDonorPledge).mockResolvedValueOnce({ success: true });
    render(<DonorForm />);
    fillDonorDetails();
    fireEvent.click(screen.getByRole("radio", { name: `Dia ${day}` }));
    fireEvent.click(screen.getByTestId("donor-lembrete-email"));
    expect(screen.queryByTestId("upload-area")).not.toBeInTheDocument();
    expect(screen.getByText(/Não é preciso pagar agora/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("donor-submit"));
    await waitFor(() => expect(registerDonorPledge).toHaveBeenCalledWith(expect.objectContaining({
      frequencia: "mensal", dia_vencimento: day, duracao: "um_ano", lembrete_canal: "email",
      recibo_path: undefined, recibo_nome: undefined,
    })));
    expect(await screen.findByTestId("donor-success")).toHaveTextContent("confira seu e-mail para as instruções de pagamento por Pix e o link para enviar o comprovante");
    expect(screen.getByTestId("donor-success")).toHaveTextContent("Você já está incluído na missa mensal rezada por nossos benfeitores.");
  });

  it("keeps the monthly choice available when switching back from one-time", () => {
    render(<DonorForm />);
    fireEvent.click(screen.getByRole("radio", { name: "Dia 10" }));
    fireEvent.click(screen.getByRole("button", { name: "Uma vez" }));
    expect(screen.getByRole("heading", { name: "Faça sua contribuição por Pix" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mensal" }));
    expect(screen.getByRole("radio", { name: "Dia 10" })).toBeChecked();
  });

  it("keeps one-time success free of monthly email instructions", async () => {
    vi.mocked(registerDonorPledge).mockResolvedValueOnce({ success: true });
    vi.mocked(createUploadUrl).mockResolvedValueOnce({
      url: "/api/uploads?ticket=test",
      path: "pending/receipt.pdf",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<DonorForm />);
    fireEvent.click(screen.getByRole("radio", { name: "Dia 20" }));
    fireEvent.click(screen.getByRole("button", { name: "Uma vez" }));
    fillDonorDetails();
    fireEvent.change(screen.getByLabelText(/Data do pagamento/), { target: { value: "2026-10-26" } });
    fireEvent.change(screen.getByTestId("upload-input"), {
      target: { files: [new File(["receipt"], "receipt.pdf", { type: "application/pdf" })] },
    });
    await screen.findByText("receipt.pdf");
    await waitFor(() => expect(screen.queryByText("Enviando...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId("donor-submit"));
    expect(await screen.findByTestId("donor-success")).toBeInTheDocument();
    expect(registerDonorPledge).toHaveBeenCalledWith(expect.objectContaining({
      frequencia: "unica", dia_vencimento: undefined, recibo_path: "pending/receipt.pdf",
    }));
    expect(screen.queryByText(/confira seu e-mail para as instruções de pagamento por Pix/)).not.toBeInTheDocument();
  });
});
